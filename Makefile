APP_NAME ?= aisphere-iam-frontend
REGISTRY ?= registry.cn-beijing.aliyuncs.com
REGISTRY_NAMESPACE ?= ainfracn
IMAGE_REPOSITORY ?= $(REGISTRY)/$(REGISTRY_NAMESPACE)/$(APP_NAME)
IMAGE_TAG ?= latest
IMAGE ?= $(IMAGE_REPOSITORY):$(IMAGE_TAG)
NAMESPACE ?= aisphere
KUBECTL ?= kubectl
NPM ?= npm
DOCKER ?= docker

NEXT_PUBLIC_IAM_URL ?=
NEXT_PUBLIC_GATEWAY_LOGIN_URL ?=
NEXT_PUBLIC_GATEWAY_LOGOUT_URL ?=

.PHONY: install build verify docker push render deploy-check deploy rollout

install:
	$(NPM) ci

build: install
	$(NPM) run build

verify: build

docker:
	$(DOCKER) build \
		--build-arg NEXT_PUBLIC_IAM_URL="$(NEXT_PUBLIC_IAM_URL)" \
		--build-arg NEXT_PUBLIC_GATEWAY_LOGIN_URL="$(NEXT_PUBLIC_GATEWAY_LOGIN_URL)" \
		--build-arg NEXT_PUBLIC_GATEWAY_LOGOUT_URL="$(NEXT_PUBLIC_GATEWAY_LOGOUT_URL)" \
		-t $(IMAGE) .

push:
	$(DOCKER) push $(IMAGE)

render:
	$(KUBECTL) kustomize deploy

deploy-check:
	$(KUBECTL) get namespace $(NAMESPACE) >/dev/null 2>&1 || true
	$(KUBECTL) get secret aliyun-registry -n $(NAMESPACE)
	$(KUBECTL) get secret casdoor-iam-web-oidc -n $(NAMESPACE)

# Apply manifests first, then pin the Deployment to the requested immutable tag.
deploy: deploy-check
	$(KUBECTL) apply -k deploy
	$(KUBECTL) set image deployment/$(APP_NAME) frontend=$(IMAGE) -n $(NAMESPACE)
	$(MAKE) rollout

rollout:
	$(KUBECTL) rollout status deployment/$(APP_NAME) -n $(NAMESPACE) --timeout=5m
