# IAM Frontend 镜像与 Kubernetes 部署

## 1. 目标架构

浏览器只访问一个公开 Origin：

```text
https://iam.weagent.cc
```

Envoy Gateway 根据路径转发：

```text
/                  -> aisphere-iam-frontend:3000
/v1/iam/*          -> aisphere-iam:18080
/oauth2/callback   -> Envoy Gateway OIDC filter
/logout            -> Envoy Gateway OIDC filter
```

前端默认使用相对路径访问 IAM API，因此生产环境通常不需要设置任何 `NEXT_PUBLIC_*` 地址。

## 2. 镜像

默认镜像：

```text
registry.cn-beijing.aliyuncs.com/ainfracn/aisphere-iam-frontend
```

Dockerfile 在镜像构建阶段执行：

```bash
npm ci
npm run build
```

最终运行镜像只包含 Next.js standalone 产物，并以非 root 用户运行。

### 本地构建

```bash
make docker IMAGE_TAG=dev
```

同源生产模式：

```bash
make docker IMAGE_TAG=dev \
  NEXT_PUBLIC_IAM_URL= \
  NEXT_PUBLIC_GATEWAY_LOGIN_URL= \
  NEXT_PUBLIC_GATEWAY_LOGOUT_URL=
```

跨域开发时才设置这些 build args。注意 `NEXT_PUBLIC_*` 会在构建阶段写入浏览器 bundle，不能依赖 Pod 运行时再修改。

## 3. GitHub Actions 镜像构建

工作流：

```text
.github/workflows/build-image.yml
```

触发条件：

- push 到 `main`
- push `v*` tag
- 对 `main` 的 Pull Request（只构建，不推送）
- 手工触发

仓库 Secrets：

```text
ALIYUN_REGISTRY_USERNAME
ALIYUN_REGISTRY_PASSWORD
```

可选 Repository Variables：

```text
NEXT_PUBLIC_IAM_URL
NEXT_PUBLIC_GATEWAY_LOGIN_URL
NEXT_PUBLIC_GATEWAY_LOGOUT_URL
```

生产同源部署建议三个 Variable 均不配置或保持空值。

生成标签：

```text
latest                  main 分支
sha-<short-sha>         每次非 PR 构建
vX.Y.Z                  tag 构建
```

## 4. Kubernetes 清单

入口文件：

```text
deploy/kustomization.yaml
```

包含：

```text
Namespace
ServiceAccount
Deployment
Service
HTTPRoute
SecurityPolicy
```

运行端口：

```text
容器：3001
Service：3000 -> targetPort http -> 3001
```

健康检查：

```text
GET /api/healthz
```

Deployment 默认使用：

```text
imagePullSecrets: aliyun-registry
```

## 5. 集群前置资源

### 阿里云镜像拉取 Secret

```bash
kubectl create secret docker-registry aliyun-registry \
  -n aisphere \
  --docker-server=registry.cn-beijing.aliyuncs.com \
  --docker-username='<username>' \
  --docker-password='<password>'
```

### Casdoor OIDC Client Secret

Envoy Gateway OIDC Secret 的 key 必须为 `client-secret`：

```bash
kubectl create secret generic casdoor-iam-web-oidc \
  -n aisphere \
  --from-literal=client-secret='<casdoor-client-secret>'
```

### Gateway

需要已经存在：

```text
namespace: aisphere-system
Gateway: aisphere-gateway
listener: https
```

Gateway 必须允许 `aisphere` namespace 中的 HTTPRoute 绑定。

### 后端路由

`deploy/security-policy.yaml` 同时绑定前端 Route 和 IAM 后端生成的 authenticated Routes。先部署后端生成清单：

```bash
# aisphere-iam repository
make deploy
make deploy-apply
```

然后再部署前端。

## 6. 手工部署

```bash
make deploy IMAGE_TAG=sha-abcdef0
```

等价操作：

```bash
kubectl apply -k deploy
kubectl set image deployment/aisphere-iam-frontend \
  frontend=registry.cn-beijing.aliyuncs.com/ainfracn/aisphere-iam-frontend:sha-abcdef0 \
  -n aisphere
kubectl rollout status deployment/aisphere-iam-frontend \
  -n aisphere \
  --timeout=5m
```

## 7. GitHub Actions 部署

工作流：

```text
.github/workflows/deploy-k8s.yml
```

该工作流仅支持手工触发，需要输入：

```text
image_tag
GitHub Environment: test 或 production
```

分别在 `test`、`production` GitHub Environment 中配置：

```text
KUBE_CONFIG_B64
```

生成方式：

```bash
base64 -w 0 ~/.kube/config
```

macOS：

```bash
base64 < ~/.kube/config | tr -d '\n'
```

部署工作流会：

```text
1. 检查 Gateway、aliyun-registry 和 casdoor-iam-web-oidc。
2. kubectl apply -k deploy。
3. 将 Deployment 固定到输入的镜像标签。
4. 等待 rollout 完成。
5. 输出 Deployment、Service、HTTPRoute 和 SecurityPolicy 状态。
```

## 8. OIDC 地址

默认配置：

```text
Issuer: https://casdoor.weagent.cc
Client ID: aisphere-iam-web
Redirect URL: https://iam.weagent.cc/oauth2/callback
Logout path: /logout
```

Casdoor Application 必须允许：

```text
https://iam.weagent.cc/oauth2/callback
```

如果浏览器直接访问 NodePort：

```text
https://iam.weagent.cc:30723
```

则必须同时修改 `deploy/security-policy.yaml` 与 Casdoor Application：

```text
https://iam.weagent.cc:30723/oauth2/callback
```

更推荐由外部负载均衡器使用标准 443，再转发到 Envoy Gateway NodePort。

## 9. 验收

```bash
kubectl get pods -n aisphere -l app=aisphere-iam-frontend
kubectl get svc aisphere-iam-frontend -n aisphere
kubectl get httproute iam-console -n aisphere
kubectl get securitypolicy iam-console-oidc -n aisphere
```

Pod 内部健康检查：

```bash
kubectl port-forward -n aisphere svc/aisphere-iam-frontend 3000:3000
curl http://127.0.0.1:3000/api/healthz
```

浏览器验收：

```text
1. 打开 https://iam.weagent.cc。
2. 未登录时自动跳转 Casdoor。
3. 登录后返回 IAM 控制台。
4. 前端请求 /v1/iam/me 成功。
5. 退出访问 /logout，由 Envoy Gateway 清理会话。
```
