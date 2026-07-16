import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./generated/iamgroup-admin-service/iamgroup-admin-service', () => ({
  iAMGroupAdminServiceCreateGroup: vi.fn(),
  iAMGroupAdminServiceUpdateGroup: vi.fn(),
  iAMGroupAdminServiceDeleteGroup: vi.fn(),
  iAMGroupAdminServiceAssignUserToGroup: vi.fn(),
  iAMGroupAdminServiceRemoveUserFromGroup: vi.fn(),
}));

import {
  iAMGroupAdminServiceAssignUserToGroup,
  iAMGroupAdminServiceCreateGroup,
  iAMGroupAdminServiceDeleteGroup,
  iAMGroupAdminServiceRemoveUserFromGroup,
  iAMGroupAdminServiceUpdateGroup,
} from './generated/iamgroup-admin-service/iamgroup-admin-service';
import { iamDirectoryApi } from './index';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(iAMGroupAdminServiceCreateGroup).mockResolvedValue({ id: 'g1', name: 'dev' });
  vi.mocked(iAMGroupAdminServiceUpdateGroup).mockResolvedValue({ id: 'g1', name: 'dev' });
  vi.mocked(iAMGroupAdminServiceDeleteGroup).mockResolvedValue({});
  vi.mocked(iAMGroupAdminServiceAssignUserToGroup).mockResolvedValue({});
  vi.mocked(iAMGroupAdminServiceRemoveUserFromGroup).mockResolvedValue({});
});

describe('iamDirectoryApi generated Group tracer', () => {
  it('delegates Group create to the generated request body contract', async () => {
    await iamDirectoryApi.createGroup('org/a', {
      name: 'dev',
      displayName: 'Developers',
      parentId: 'parent',
    });

    expect(iAMGroupAdminServiceCreateGroup).toHaveBeenCalledWith('org/a', {
      group: {
        name: 'dev',
        displayName: 'Developers',
        parentId: 'parent',
      },
    });
  });

  it('sends parent_id as snake_case inside group object for protobuf JSON compatibility', async () => {
    await iamDirectoryApi.updateGroup('org/a', 'group/1', {
      name: 'dev',
      parentId: '',
    });

    expect(iAMGroupAdminServiceUpdateGroup).toHaveBeenCalledWith('org/a', 'group/1', {
      group: { name: 'dev', parent_id: '' },
    });
  });

  it('passes recursive deletion through the generated query contract', async () => {
    await iamDirectoryApi.deleteGroup('org/a', 'group/1', true);

    expect(iAMGroupAdminServiceDeleteGroup).toHaveBeenCalledWith('org/a', 'group/1', { recursive: true });
  });

  it('passes all membership path parameters to generated operations', async () => {
    await iamDirectoryApi.assignUserToGroup('org/a', 'group/1', 'user/1');
    await iamDirectoryApi.removeUserFromGroup('org/a', 'group/1', 'user/1');

    expect(iAMGroupAdminServiceAssignUserToGroup).toHaveBeenCalledWith('org/a', 'group/1', 'user/1');
    expect(iAMGroupAdminServiceRemoveUserFromGroup).toHaveBeenCalledWith('org/a', 'group/1', 'user/1');
  });
});
