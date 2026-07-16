import {
  iAMIdentityAdminServiceCreateUser,
  iAMIdentityAdminServiceDeleteUser,
  iAMIdentityAdminServiceDisableUser,
  iAMIdentityAdminServiceUpdateUser,
} from '../generated/iamidentity-admin-service/iamidentity-admin-service';

/**
 * IAM Identity Admin Service
 *
 * Replaces the old /v1/users local-user endpoint.
 * All user CRUD operations are now scoped under /v1/iam/orgs/{orgId}/users.
 *
 * Note: The old localUserApi is dead code (no consumers). This adapter
 * is provided for future use when user CRUD is needed.
 */
export const iamIdentityAdminApi = {
  createUser: (orgId: string, user: {
    username?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    enabled?: boolean;
  }) =>
    iAMIdentityAdminServiceCreateUser(orgId, {
      user: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        enabled: user.enabled,
      },
    }),

  updateUser: (orgId: string, userId: string, user: {
    displayName?: string;
    email?: string;
    phone?: string;
    enabled?: boolean;
  }) =>
    iAMIdentityAdminServiceUpdateUser(orgId, userId, {
      user: {
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        enabled: user.enabled,
      },
    }),

  disableUser: (orgId: string, userId: string) =>
    iAMIdentityAdminServiceDisableUser(orgId, userId, {}),

  deleteUser: (orgId: string, userId: string, hard?: boolean) =>
    iAMIdentityAdminServiceDeleteUser(orgId, userId, { hard }),
};