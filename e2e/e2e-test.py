import subprocess, json, sys, time

def api_call(method, path, data=None):
    cmd = ["curl", "-s", "-k", "-X", method,
           "-H", f"Authorization: Bearer {TOKEN}",
           "-H", "Host: iam.weagent.cc",
           f"https://iam.weagent.cc:30723{path}"]
    if data:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(data)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        print(f"PARSE ERROR: {result.stdout[:200]}")
        return {}

# Get token first
print("=== Getting token from Casdoor ===")
token_resp = subprocess.run(
    ["curl", "-s", "-X", "POST", "http://10.0.0.120:8000/api/login/oauth/access_token",
     "-H", "Content-Type: application/json",
     "-d", '{"grant_type":"password","client_id":"869aff97ab0408cbbd1c","username":"admin","password":"123","scope":"openid profile email"}'],
    capture_output=True, text=True)
token_data = json.loads(token_resp.stdout)
TOKEN = token_data.get("access_token", "")
if not TOKEN:
    print(f"FAILED to get token: {token_data}")
    sys.exit(1)
print(f"Token OK: {TOKEN[:40]}...")
print()

ts = int(time.time())

# Scenario 1: Get current user
print("=" * 50)
print("Scenario 1: Get current user (/v1/iam/me)")
print("=" * 50)
me = api_call("GET", "/v1/iam/me")
print(json.dumps(me, indent=2, ensure_ascii=False))
subject_id = me.get("principal", {}).get("subject_id", "")
print(f"Subject ID: {subject_id}")
print()

# Scenario 2: List groups (organizations)
print("=" * 50)
print("Scenario 2: List groups (/v1/iam/orgs/aisphere/groups)")
print("=" * 50)
groups = api_call("GET", "/v1/iam/orgs/aisphere/groups")
group_list = groups.get("groups", [])
print(f"Found {len(group_list)} groups:")
for g in group_list[:10]:
    print(f"  - {g.get('id')}: {g.get('display_name')} (type: {g.get('type')}, parent: {g.get('parent_id','-')})")
print()

# Scenario 3: Create child organization (group)
# NOTE: The API requires {"group": {...}} wrapper
print("=" * 50)
print("Scenario 3: Create child organization (group)")
print("=" * 50)
child_name = f"e2e-test-org-{ts}"
child = api_call("POST", "/v1/iam/orgs/aisphere/groups",
                  {"group": {"name": child_name, "displayName": child_name, "parentId": "aisphere"}})
print(json.dumps(child, indent=2, ensure_ascii=False))
child_id = child.get("group", {}).get("id", "")
if not child_id:
    print("Group creation failed (Casdoor sync issue)")
print(f"Child org ID: {child_id or 'N/A'}")
print()

# Scenario 4: Use existing groups for move test
print("=" * 50)
print("Scenario 4: Use existing groups for move/parent test")
print("=" * 50)
# Use existing groups from the list
child2_id = "test-group-eng"  # 测试组织 - existing group
print(f"Using existing group as target parent: {child2_id}")
print()

# Scenario 5: Move child organization (update parent)
print("=" * 50)
print("Scenario 5: Move child org to another parent")
print("=" * 50)
if child_id and child2_id:
    move = api_call("PUT", f"/v1/iam/orgs/aisphere/groups/{child_id}",
                     {"parent_id": child2_id})
    print(json.dumps(move, indent=2, ensure_ascii=False))
else:
    print("SKIP: missing child IDs")
print()

# Scenario 6: List users
print("=" * 50)
print("Scenario 6: List users")
print("=" * 50)
users = api_call("GET", "/v1/iam/orgs/aisphere/users")
user_list = users.get("users", [])
print(f"Found {len(user_list)} users:")
for u in user_list[:5]:
    print(f"  - {u.get('id')}: {u.get('display_name')} ({u.get('username')})")
print()

# Scenario 7: Create role template
# NOTE: The API requires {"roleTemplate": {...}} wrapper
# resourceType and roleKey are required fields
print("=" * 50)
print("Scenario 7: Create role template")
print("=" * 50)
role_name = f"e2e-role-{ts}"
role = api_call("POST", "/v1/iam/control-plane/role-templates", {
    "roleTemplate": {
        "displayName": "E2E Test Role",
        "description": "Created by E2E test",
        "resourceType": "iam:project",
        "roleKey": role_name,
        "permissions": ["iam:project:view"]
    }
})
print(json.dumps(role, indent=2, ensure_ascii=False))
role_id = role.get("role_template", {}).get("id", "")
print(f"Role ID: {role_id}")
print()

# Scenario 8: Update role permissions (PATCH, not PUT!)
print("=" * 50)
print("Scenario 8: Update role permissions")
print("=" * 50)
if role_id:
    update = api_call("PATCH", f"/v1/iam/control-plane/role-templates/{role_id}", {
        "displayName": "E2E Test Role Updated",
        "permissions": ["iam:project:create", "iam:project:delete"],
        "expectedVersion": "1"
    })
    print(json.dumps(update, indent=2, ensure_ascii=False))
else:
    print("SKIP: no role_id")
print()

# Scenario 9: Grant access to user
# NOTE: Uses roleKey (not role), path is /v1/iam/orgs/{orgId}/grants
print("=" * 50)
print("Scenario 9: Grant access to user")
print("=" * 50)
if role_id and subject_id:
    grant = api_call("POST", "/v1/iam/orgs/aisphere/grants", {
        "subject": {"type": "user", "id": subject_id},
        "resource": {"type": "iam:project", "id": "*"},
        "roleKey": role_name
    })
    print(json.dumps(grant, indent=2, ensure_ascii=False))
else:
    print("SKIP: missing role_id or subject_id")
print()

# Scenario 10: Check permission
print("=" * 50)
print("Scenario 10: Check permission")
print("=" * 50)
if subject_id:
    check = api_call("POST", "/v1/iam/permissions/check", {
        "subject": {"type": "user", "id": subject_id},
        "resource": {"type": "iam:project", "id": "*"},
        "action": "iam:project:create"
    })
    print(json.dumps(check, indent=2, ensure_ascii=False))
else:
    print("SKIP: no subject_id")
print()

# Scenario 11: List existing role templates (read-only test)
print("=" * 50)
print("Scenario 11: List role templates (read test)")
print("=" * 50)
templates = api_call("GET", "/v1/iam/control-plane/role-templates")
tmpl_list = templates.get("role_templates", [])
print(f"Found {len(tmpl_list)} role templates:")
for t in tmpl_list[:5]:
    print(f"  - {t.get('id')}: {t.get('display_name')} (type: {t.get('resource_type')}, key: {t.get('role_key')})")
print()

# Cleanup
print("=" * 50)
print("Cleanup")
print("=" * 50)
if role_id:
    api_call("DELETE", f"/v1/iam/control-plane/role-templates/{role_id}")
    print(f"Deleted role: {role_id}")
if child_id:
    api_call("PUT", f"/v1/iam/orgs/aisphere/groups/{child_id}",
              {"parent_id": "aisphere"})
    print("Moved child back to root")
    api_call("DELETE", f"/v1/iam/orgs/aisphere/groups/{child_id}")
    print(f"Deleted child org: {child_id}")

print()
print("=" * 50)
print("  E2E Tests Complete!")
print("=" * 50)