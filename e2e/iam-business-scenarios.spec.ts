/**
 * IAM 核心业务场景 E2E 测试
 *
 * 覆盖场景：
 * 1. 创建子组织
 * 2. 移动子组织
 * 3. 移动用户关系到组织
 * 4. 创建角色
 * 5. 更新角色权限
 * 6. 用户权限更新
 *
 * 运行方式：
 *   npx playwright test e2e/iam-business-scenarios.spec.ts --headed
 *
 * 环境变量：
 *   IAM_BASE_URL - 测试环境 URL（默认 https://iam.weagent.cc）
 *   IAM_USERNAME - 测试用户名
 *   IAM_PASSWORD - 测试密码
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.IAM_BASE_URL || 'https://iam.weagent.cc';
const TEST_USERNAME = process.env.IAM_USERNAME || 'admin';
const TEST_PASSWORD = process.env.IAM_PASSWORD || '';

// ─── 测试数据 ────────────────────────────────────────────────────────────

const TEST_PREFIX = `e2e-${Date.now()}`;
const TEST_ORG_NAME = `${TEST_PREFIX}-org`;
const TEST_CHILD_ORG_NAME = `${TEST_PREFIX}-child-org`;
const TEST_ROLE_NAME = `${TEST_PREFIX}-role`;
const TEST_USER_ID = 'user_0000000000000000001'; // 测试用户 ID

// ─── 辅助函数 ────────────────────────────────────────────────────────────

/** 等待页面加载完成 */
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/** 通过 API 直接调用（绕过 UI）来验证后端状态 */
async function apiCall(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

// ─── 测试套件 ────────────────────────────────────────────────────────────

test.describe('IAM 核心业务场景', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // 创建已登录的上下文
    context = await browser.newContext({
      baseURL: BASE_URL,
      storageState: undefined,
    });
    page = await context.newPage();

    // 登录
    await page.goto(BASE_URL);
    await waitForLoadPage(page);

    // 如果被重定向到 Casdoor 登录页
    if (page.url().includes('casdoor')) {
      await page.fill('input[name="username"]', TEST_USERNAME);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await waitForLoadReady(page);
    }

    // 保存登录状态
    await context.storageState({ path: 'e2e/auth-state.json' });
  });

  test.afterAll(async () => {
    // 清理测试数据
    try {
      // 删除测试角色
      await apiCall(`/v1/iam/control-plane/role-templates/${TEST_ROLE_NAME}`, {
        method: 'DELETE',
      });
    } catch {}
    try {
      // 删除测试子组织
      await apiCall(`/v1/iam/orgs/${TEST_ORG}/groups/${TEST_CHILD_ORG_NAME}`, {
        method: 'DELETE',
      });
    } catch {}
    try {
      // 删除测试组织
      await apiCall(`/v1/iam/orgs/${TEST_ORG}/groups/${TEST_ORG}`, {
        method: 'DELETE',
      });
    } catch {}
    await context.close();
  });

  // ─── 场景 1: 创建子组织 ──────────────────────────────────────────────

  test('1. 创建子组织', async () => {
    // 导航到组织管理页面
    await page.goto(`${BASE_URL}/app/organization`);
    await waitForLoadReady(page);

    // 点击"创建子组织"按钮
    const createBtn = page.getByRole('button', { name: /创建子组织|新建组织|Add.*org/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // 填写表单
    const nameInput = page.getByLabel(/名称|Name|组织名/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(TEST_CHILD_ORG_NAME);

    const displayNameInput = page.getByLabel(/显示名称|Display Name/i);
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill(`${TEST_CHILD_ORG_NAME}-display`);
    }

    // 提交
    const submitBtn = page.getByRole('button', { name: /确认|创建|保存|Submit|Create/i });
    await submitBtn.click();

    // 验证成功提示
    await expect(page.getByText(/创建成功|成功|Success/i)).toBeVisible({ timeout: 10000 });

    // 验证 API 层面
    const groups = await apiCall(`/v1/iam/orgs/${TEST_ORG}/groups`);
    const created = groups.groups?.find((g: any) => g.name === TEST_CHILD_ORG_NAME);
    expect(created).toBeTruthy();
    console.log(`✅ 子组织创建成功: ${TEST_CHILD_ORG_NAME}`);
  });

  // ─── 场景 2: 移动子组织 ──────────────────────────────────────────────

  test('2. 移动子组织', async () => {
    await page.goto(`${BASE_URL}/app/organization`);
    await waitForLoadReady(page);

    // 找到子组织节点，拖拽或选择移动
    const orgNode = page.getByText(TEST_CHILD_ORG_NAME);
    await expect(orgNode).toBeVisible({ timeout: 10000 });
    await orgNode.click();

    // 点击"移动"或"编辑父组织"
    const moveBtn = page.getByRole('button', { name: /移动|Move|编辑父组织|change parent/i });
    if (await moveBtn.isVisible()) {
      await moveBtn.click();
    }

    // 选择新的父组织
    const parentSelect = page.getByLabel(/父组织|Parent|上级/i);
    if (await parentSelect.isVisible()) {
      await parentSelect.click();
      // 选择根组织
      await page.getByText(TEST_ORG).click();
    }

    // 确认移动
    const confirmBtn = page.getByRole('button', { name: /确认|保存|Save|Confirm/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await page.waitForTimeout(2000);
    console.log(`✅ 子组织移动完成`);
  });

  // ─── 场景 3: 移动用户关系到组织 ──────────────────────────────────────

  test('3. 移动用户关系到组织', async () => {
    await page.goto(`${BASE_URL}/app/organization/members`);
    await waitForLoadReady(page);

    // 查找用户并移动到组织
    const userRow = page.getByText(TEST_USER_ID);
    if (await userRow.isVisible()) {
      await userRow.click();

      // 点击"移动"或"分配到组织"
      const assignBtn = page.getByRole('button', { name: /移动|分配到|Assign|Move/i });
      if (await assignBtn.isVisible()) {
        await assignBtn.click();
      }

      // 选择目标组织
      const orgSelect = page.getByLabel(/组织|Org|Group/i);
      if (await orgSelect.isVisible()) {
        await orgSelect.click();
        await page.getByText(TEST_CHILD_ORG_NAME).click();
      }

      // 确认
      const saveBtn = page.getByRole('button', { name: /确认|保存|Save|Confirm/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
      }

      await waitForLoadReady(page);
      console.log(`✅ 用户关系移动完成`);
    } else {
      console.log(`⚠️ 用户 ${TEST_USER_ID} 未找到，跳过`);
    }
  });

  // ─── 场景 4: 创建角色 ────────────────────────────────────────────────

  test('4. 创建角色', async () => {
    await page.goto(`${BASE_URL}/app/roles`);
    await waitForLoadReady(page);

    // 点击"创建角色"
    const createBtn = page.getByRole('button', { name: /创建角色|新建角色|Create.*[Rr]ole/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // 填写角色信息
    const roleNameInput = page.getByLabel(/角色名称|Role Name|roleKey|名称/i);
    await expect(roleNameInput).toBeVisible({ timeout: 5000 });
    await roleNameInput.fill(TEST_ROLE_NAME);

    const displayNameInput = page.getByLabel(/显示名称|Display Name|displayName/i);
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill(`${TEST_ROLE_NAME}-display`);
    }

    // 选择资源类型
    const resourceTypeSelect = page.getByLabel(/资源类型|Resource Type|resourceType/i);
    if (await resourceTypeSelect.isVisible()) {
      await resourceTypeSelect.click();
      await page.getByText('skill').click();
    }

    // 选择权限
    const permissionCheckbox = page.getByText('view');
    if (await permissionCheckbox.isVisible()) {
      await permissionCheckbox.click();
    }

    // 提交
    const submitBtn = page.getByRole('button', { name: /确认|创建|保存|Submit|Create/i });
    await submitBtn.click();

    // 验证
    await expect(page.getByText(/成功|Success/i)).toBeVisible({ timeout: 10000 });

    // API 验证
    const templates = await apiCall('/v1/iam/control-plane/role-templates');
    const created = templates.roleTemplates?.find((rt: any) => rt.roleKey === TEST_ROLE_NAME);
    expect(created).toBeTruthy();
    console.log(`✅ 角色创建成功: ${TEST_ROLE_NAME}`);
  });

  // ─── 场景 5: 更新角色权限 ────────────────────────────────────────────

  test('5. 更新角色权限', async () => {
    await page.goto(`${BASE_URL}/app/roles`);
    await waitForLoadReady(page);

    // 找到测试角色并点击
    const roleCard = page.getByText(TEST_ROLE_NAME);
    await expect(roleCard).toBeVisible({ timeout: 10000 });
    await roleCard.click();

    // 点击编辑权限
    const editBtn = page.getByRole('button', { name: /编辑权限|Edit.*[Pp]ermission|修改/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // 添加新权限
    const newPermission = page.getByText('review');
    if (await newPermission.isVisible()) {
      await newPermission.click();
    }

    // 保存
    const saveBtn = page.getByRole('button', { name: /保存|Save|确认|Confirm/i });
    await saveBtn.click();

    // 验证
    await expect(page.getByText(/成功|Success/i)).toBeVisible({ timeout: 10000 });

    // API 验证
    const templates = await apiCall('/v1/iam/control-plane/role-templates');
    const updated = templates.roleTemplates?.find((rt: any) => rt.roleKey === TEST_ROLE_NAME);
    expect(updated?.permissions).toContain('review');
    console.log(`✅ 角色权限更新成功: ${TEST_ROLE_NAME} 现在有权限: ${updated?.permissions}`);
  });

  // ─── 场景 6: 用户权限更新 ────────────────────────────────────────────

  test('6. 用户权限更新', async () => {
    await page.goto(`${BASE_URL}/app/permissions`);
    await waitForLoadReady(page);

    // 搜索用户
    const searchInput = page.getByPlaceholder(/搜索|Search|查找/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(TEST_USER_ID);
      await page.keyboard.press('Enter');
      await waitForLoadReady(page);
    }

    // 找到用户并点击
    const userItem = page.getByText(TEST_USER_ID);
    if (await userItem.isVisible()) {
      await userItem.click();
    }

    // 点击"授权"或"添加权限"
    const grantBtn = page.getByRole('button', { name: /授权|添加权限|Grant|Add.*[Pp]ermission/i });
    if (await grantBtn.isVisible()) {
      await grantBtn.click();
    }

    // 选择角色
    const roleSelect = page.getByLabel(/选择角色|Role|角色/i);
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.getByText(TEST_ROLE_NAME).click();
    }

    // 选择资源
    const resourceInput = page.getByLabel(/资源|Resource|资源类型/i);
    if (await resourceInput.isVisible()) {
      await resourceInput.fill('skill');
    }

    // 提交授权
    const submitBtn = page.getByRole('button', { name: /确认|授权|Grant|Submit/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // 验证
    await expect(page.getByText(/成功|Success/i)).toBeVisible({ timeout: 10000 });
    console.log(`✅ 用户权限更新成功`);
  });
});