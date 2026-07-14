# IAM 角色优先访问控制设计

- 日期：2026-07-14
- 状态：待用户评审
- 涉及仓库：`aisphere-iam-front`、`aisphere-iam`

## 1. 背景与问题

当前 IAM 前端同时存在“授权与角色”和“权限控制台”两个入口，内部又分别提供角色模板、授权记录、资源授权、人员权限、权限诊断和 Schema 管理。功能虽多，但用户需要先理解 Role Template、Grant、Relationship、Relation、Permission 等实现概念，才能完成一次普通授权。

当前后端的 `RoleTemplate` 只保存 `role_key -> relation` 映射。授权时 IAM 将模板中的 `relation` 投影为 SpiceDB Relationship。因此，现有“自定义角色”只能为已有 Relation 提供别名，不能自由选择 Permission；如果填写 Schema 中不存在的 Relation，授权投影将失败。前端现有“注册角色模板”表单也没有提交后端要求的 `relation` 字段，不能作为真正的自定义角色能力继续扩展。

本设计采用以下原则：

1. 前端用 RBAC 的“角色”作为主要心智模型。
2. 底层继续使用 SpiceDB ReBAC/FGA 表达资源实例级授权。
3. 普通分享不暴露 Relation、Relationship 或 `.zed`。
4. 内置角色保持稳定，自定义角色使用数据驱动的动态角色模型。
5. 中央 IAM 负责治理，业务资源页面负责就地分享，两者使用同一套 API、审计和授权数据。

## 2. 目标与非目标

### 2.1 目标

- 用户进入访问控制后，首先看见每类资源有哪些角色及其能力。
- 支持把某个具体 Skill、Agent、项目等资源分享给个人或用户组。
- 支持按资源和按人员查看、添加、撤销授权。
- 支持从内置角色复制并创建真正可选择能力的自定义角色。
- 平台、组织和用户组管理员都只分配一个作用域角色，通过继承获得下级权限，避免初始化和授权关系爆炸。
- 保留权限检查、解释、Schema 和 Relationship 管理，但将其放入诊断或高级治理入口。
- 保持现有内置角色和授权记录兼容。
- 为其他业务前端提供稳定的资源分享 API 契约，便于后续接入就地分享入口。

### 2.2 非目标

- 不允许普通管理员在前端创建新的业务 Permission；Permission 仍由代码和 `.zed` 定义。
- 第一版自定义角色只授予用户和用户组，不扩展服务账号、工作负载和 Agent 身份。
- 不在本次工作中重做用户、组织、项目和资源目录页面。
- 不在本次交付中修改 Hub、Skill 等其他业务前端；这些页面的“分享”入口作为后续独立集成，复用本次落地的 IAM API。
- 不允许普通用户直接编辑原始 SpiceDB Schema。

## 3. 统一概念模型

| 用户概念 | IAM 控制面 | SpiceDB |
| --- | --- | --- |
| 角色 | 名称、说明、资源类型、能力列表、版本、状态 | 内置角色映射 Relation；自定义角色映射 `custom_role` 对象 |
| 分享/授权 | Grant 记录、原因、有效期、创建人 | 资源与主体或 `role_binding` 之间的 Relationships |
| 能力 | 可供角色选择的 Permission 目录 | `.zed` 中定义的 Permission |
| 最终权限 | IAM 查询和解释结果 | `CheckPermission` 计算结果 |

一个资源级授权必须同时包含“谁、哪个具体资源、什么角色”。例如：

```text
skill:skill-a#viewer@user:alice
```

这表示 Alice 只是 Skill A 的查看者，不是全局 Skill Viewer。

### 3.1 管理员作用域

管理员必须按作用域区分，不能把一个 `admin` 同时解释成平台管理员、组织管理员和每个用户组的直接管理员：

| 角色 | 直接分配位置 | 有效范围 |
| --- | --- | --- |
| 平台所有者/平台管理员 | `platform:global` | 全平台控制面和所有组织 |
| 组织所有者/组织管理员 | `zone:{organization}` | 当前组织及其用户、用户组、项目和下级资源 |
| 用户组管理员 | `group:{group}` | 当前用户组；是否覆盖子组由 `parent->manage` 明确定义 |
| 资源角色 | 具体项目、Skill、Agent 等 | 仅当前资源，并按 Schema 明确定义的父子关系继承 |

组织管理员不需要成为每个 Group 的直接 `manager`。应用检查 `group#manage` Permission 时，通过 `group#zone -> zone#manage_groups` 得到允许结果。只有需要管理某个特定 Group、但不是整个组织管理员的用户，才写入：

```text
group:finance#manager@user:alice
```

前端必须区分“直接管理员”和“继承的有效管理员”，不能为了列表展示而把继承结果物化成大量 Group Relationships。

### 3.2 根对象继承模型

新增平台根对象，平台管理员只分配一次：

```zed
definition platform {
  relation owner: user | group#member
  relation admin: user | group#member

  permission manage_identity = owner + admin
  permission manage_control_plane = owner + admin
  permission manage_permissions = owner + admin
}

definition zone {
  relation platform: platform
  relation owner: user | group#member
  relation admin: user | group#member

  permission manage_users = owner + admin + user_manager + platform->manage_identity
  permission manage_groups = owner + admin + group_manager + platform->manage_identity
  permission manage_permissions = owner + admin + permission_admin + platform->manage_permissions
}

definition group {
  relation zone: zone
  relation parent: group
  relation owner: user | group#member
  relation manager: user | group#member

  permission manage = owner + manager + zone->manage_groups + parent->manage
}

definition iam {
  relation platform: platform
  relation admin: user | group#member

  permission manage = admin + platform->manage_control_plane
}
```

Relationships 分成两类：

- 稳定的资源结构关系，例如 `zone:org-a#platform@platform:global`、`group:finance#zone@zone:org-a`。它们按资源数量写入一次。
- 人员角色关系，例如 `platform:global#admin@user:root` 或 `zone:org-a#admin@user:alice`。它们按管理员分配一次。

不得按“管理员 × 下级资源数量”展开授权关系。

### 3.3 初始化角色收敛

当前 bootstrap 将 `zone_owner` 展开为 `owner`、`admin`、`user_manager`、`group_manager`、`permission_admin`，并通过 `control_plane_admin` 为多个 `iam:*` 资源继续写 `admin`。目标行为改为：

- `platform_owner` 只写 `platform:global#owner`。
- `platform_admin` 只写 `platform:global#admin`。
- `zone_owner` 只写目标 Zone 的 `owner`。
- `zone_admin` 只写目标 Zone 的 `admin`。
- `user_manager`、`group_manager`、`permission_admin` 保留为职责分离角色，仅在需要最小权限委派时单独分配。
- 删除 bootstrap 的 `control_plane_admin` 展开和逐资源 `admin_resources` 写入；控制面资源通过稳定的 `platform` 关系继承。

`owner` 与 `admin` 可以拥有相近的日常管理 Permission，但只有 `owner` 可以转移所有权、管理同作用域管理员或执行其他高风险操作。

## 4. 信息架构

侧边栏将“授权与角色”和“权限控制台”合并为一个“访问控制”入口，默认进入角色库。页面拆成四项能力：

1. **角色库**：展示资源类型、内置角色、自定义角色和每个角色的能力。
2. **访问分配**：提供“按资源管理成员”和“按人员查看权限”两个入口。
3. **权限排查**：回答“谁对哪个资源能不能执行什么操作，以及为什么”。
4. **高级治理**：管理 Schema、底层 Relationships、投影修复和变更审计，仅权限平台管理员可见。

原 `grants` 导航保留兼容路由，但自动进入新的“访问控制 / 访问分配”；原 `permissions` 路由进入新页面默认角色库。稳定后删除重复页面和旧 `GrantsTab`。

## 5. 核心交互

### 5.1 角色库

- 默认按资源类型展示角色，例如项目、Skill、Agent。
- 平台、组织、用户组和业务资源角色必须显示明确的作用域，不提供含义不明的全局 `admin` 选项。
- 每个角色显示：名称、内置/自定义、能力数量、当前分配数量。
- 选择角色后显示能力矩阵和使用范围。
- 内置角色不能编辑，可“复制创建”。
- 自定义角色可以编辑、停用；编辑前展示受影响的现有授权数量。
- 技术键和底层 Relation 只放在可展开的技术详情中。

### 5.2 创建自定义角色

流程为：

1. 选择资源类型。
2. 从一个内置或自定义角色复制。
3. 输入角色名称和说明。
4. 勾选该资源类型已有的 Permission。
5. 查看能力摘要和潜在风险提示。
6. 保存角色。

角色键由系统生成或校验，不要求普通用户手写。第一版角色作用域为平台级资源类型模板，可在所有同类资源中复用。

### 5.3 资源级分享

本次先在中央 IAM 的“按资源管理成员”中落地完整分享流程：

1. 选择用户或用户组。
2. 选择适用于 Skill 的角色。
3. 可选填写原因和有效期。
4. 展示最终能力预览。
5. 确认授权。

后续 Skill 等业务页面使用同一 API 接入“分享”入口。无论授权从哪个业务页面创建，都必须立即出现在中央 IAM 的授权记录中。

### 5.4 人员权限

- 选择用户或用户组后，展示其直接角色、用户组来源和父级继承来源。
- 结果按资源类型和资源实例分组。
- 撤销按钮只撤销当前直接 Grant；继承权限需引导用户到来源处处理。

### 5.5 权限排查

- 输入主体、资源和 Permission。
- 首先展示允许或拒绝。
- 再用业务语言展示来源：直接角色、用户组、自定义角色或父级继承。
- 原始推导步骤只在技术详情中展示。

### 5.6 管理员分配

- 分配“组织管理员”时，前端明确提示其权限覆盖当前和未来的所有用户组、项目及继承资源。
- 在 Group 页面分配的“用户组管理员”只创建该 Group 的直接 `manager` Relationship。
- Group 成员列表分别展示“直接管理员”和“继承管理员”；继承管理员显示来源组织或父 Group，不能在当前 Group 直接撤销。
- 平台管理员角色只在平台治理入口出现，不进入普通组织或资源的角色选择器。

## 6. SpiceDB 模型

### 6.1 内置角色

现有 `owner`、`editor`、`reviewer`、`viewer` 等固定 Relation 保持不变。它们适合稳定、常用且需要兼容的角色。

### 6.2 自定义角色

新增动态角色和角色绑定定义。示意模型如下：

```zed
definition custom_role {
  relation manage: user:*
  relation edit: user:*
  relation review: user:*
  relation publish: user:*
  relation view: user:*
}

definition role_binding {
  relation role: custom_role
  relation grantee: user | group#member

  permission manage = role->manage & grantee
  permission edit = role->edit & grantee
  permission review = role->review & grantee
  permission publish = role->publish & grantee
  permission view = role->view & grantee
}

definition skill {
  relation custom_binding: role_binding

  permission manage = owner + parent->manage + custom_binding->manage
  permission edit = manage + editor + parent->edit + custom_binding->edit
  permission review = manage + reviewer + custom_binding->review
  permission publish = manage + reviewer + custom_binding->publish
  permission view = edit + viewer + parent->view + custom_binding->view
}
```

将“Skill 审计员”授予 Alice 时写入：

```text
custom_role:skill_auditor#view@user:*
role_binding:grant-123#role@custom_role:skill_auditor
role_binding:grant-123#grantee@user:alice
skill:skill-a#custom_binding@role_binding:grant-123
```

自定义角色的 `resource_type` 由 IAM 控制面强制校验；每种资源只引用自己支持的 Permission。SpiceDB 写权限只授予 IAM 服务，业务服务不能绕过 IAM 直接构造角色绑定。

### 6.3 角色修改和撤销

- 修改自定义角色能力时，更新 `custom_role` 上的能力 Relationships，所有使用该角色的授权立即获得新结果。
- 修改前必须返回并展示影响的活跃 Grant 数量，操作需要审计。
- 撤销 Grant 时删除资源到 `role_binding`、绑定到角色、绑定到主体的 Relationships。
- 停用角色后不得创建新 Grant；已有 Grant 默认继续生效，直到管理员明确迁移或撤销，避免无意大面积中断访问。

## 7. IAM 数据与 API

### 7.1 数据模型

保留 `iam_role_templates`，新增规范化表 `iam_role_template_permissions`：

- `role_template_id`
- `permission`
- 唯一键 `(role_template_id, permission)`

安全关键的能力列表不能只放在 `metadata_json` 中。

Grant 继续保存 `role_key` 和审计信息。内置角色 Grant 投影为单条资源 Relation；自定义角色 Grant 投影为上述三条绑定 Relationships。

### 7.2 Proto/API

`RoleTemplate` 新增：

- `repeated string permissions`
- `int64 active_grant_count`
- `int64 version`

增加或补全：

- `GetRoleTemplate`
- `UpdateRoleTemplate`
- `DisableRoleTemplate`
- `PreviewRoleTemplateImpact`

`RegisterRoleTemplate` 创建自定义角色时不再要求前端提供底层 Relation；后端根据 `built_in` 和 `permissions` 选择固定 Relation 或动态角色投影。现有内置角色初始化仍显式携带 Relation。

所有 Permission 必须根据资源目录和当前 Schema 校验。未知资源类型、未知 Permission、跨资源类型使用角色、修改内置角色均返回明确的业务错误。

## 8. 一致性、失败处理与审计

- 角色和 Grant 先写 IAM 数据库及 Outbox，再由现有 Projection Manager 投影到 SpiceDB。
- 投影操作必须幂等；重复请求不能产生重复绑定。
- API 返回 consistency token，前端授权成功后使用至少同等新鲜度刷新列表和权限预览。
- 部分投影失败时，前端显示“同步中/同步失败”，不能宣称授权已经生效；高级治理提供重试和修复入口。
- 创建、修改、停用角色以及授权、撤销都写审计记录，包含操作者、原因、影响对象和前后能力集合。

## 9. 兼容与迁移

实施顺序：

1. 以加法方式新增 `platform` 根对象和资源到根对象的结构关系。
2. 将 bootstrap 管理员迁移到单一作用域 Relationship；在验证继承结果后删除原有重复 Relation 和逐资源 `admin`。
3. 扩展 `.zed` 和权限清单，增加动态角色定义和测试。
4. 扩展 IAM 数据表、Proto、业务服务和投影逻辑。
5. 保留现有内置模板及其 Relation，不迁移已有业务资源 Grant。
6. 将已有非内置模板识别为 legacy alias；根据其 Relation 推导等价能力，管理员确认后转换为动态角色。
7. 发布新前端，合并导航和权限页面。
8. 观察稳定后删除旧注册表单、旧 `GrantsTab` 和重复页面。
9. 后续在 Skill 等业务前端按独立任务接入同一资源分享契约。

若线上不存在非内置模板，第 4 步只执行空检查并记录结果。

## 10. 验证策略

### 10.1 后端

- Schema/manifest 校验：所有资源的自定义角色 Permission 均可计算。
- 管理员继承测试：一个 `platform_admin` Relationship 可管理所有 Zone 和控制面；一个 `zone_admin` Relationship 可管理当前 Zone 的所有 Group；一个 Group `manager` 不能越过其作用域。
- Bootstrap 收敛测试：每个初始化管理员只产生一个人员角色 Relationship，资源结构关系与管理员数量无关。
- 业务单测：创建、更新、停用角色；未知 Permission；内置角色不可编辑。
- 投影单测：自定义角色能力、授权和撤销的 Relationships 正确且幂等。
- 集成测试：把 Skill 以 Viewer 分享给用户，只允许 `view`；自定义 Reviewer 仅允许选择的能力。
- 回归测试：现有内置角色和父级继承结果不变。

### 10.2 前端

- TypeScript 编译和 Next.js production build。
- 角色库、复制创建、影响预览、资源分享、按人员查询和权限排查的组件测试或可靠交互 smoke test。
- 验证窄屏下四项能力导航、角色列表和详情不会横向溢出。
- 验证普通管理员看不到高级治理，权限管理员可进入但发布 Schema 前必须二次确认。

## 11. 完成标准

- IAM 侧边栏只保留一个清晰的“访问控制”入口。
- 平台管理员、组织管理员和用户组管理员均只需一个直接角色分配，权限通过根对象和父子资源关系继承。
- 首屏可按资源类型理解所有内置和自定义角色及其能力。
- 能把单个 Skill 分享给单个用户或用户组，并在 IAM 中查询和撤销。
- 能创建选择 Permission 的自定义角色，并通过真实 SpiceDB 检查验证其效果。
- 用户日常操作不需要填写资源技术 ID、Relation 或 Subject tuple。
- 旧内置 Grant、继承权限和现有业务检查保持兼容。
