import {
  projectServiceArchiveProject,
  projectServiceCreateProject,
  projectServiceDisableProjectCapability,
  projectServiceEnableProjectCapability,
  projectServiceGetProject,
  projectServiceListCapabilities,
  projectServiceListProjectCapabilities,
  projectServiceListProjects,
  projectServiceRegisterCapability,
  projectServiceUpdateProject,
} from '../generated/project-service/project-service';
import type { IamCapability, IamProject, IamProjectCapability } from '../types';

/** IAM Project Service (Control Plane) */
export const iamProjectApi = {
  createProject: (orgId: string, project: { slug: string; displayName?: string; description?: string }): Promise<IamProject> =>
    projectServiceCreateProject(orgId, project as never) as Promise<IamProject>,

  getProject: (orgId: string, projectId: string): Promise<IamProject> =>
    projectServiceGetProject(orgId, projectId) as Promise<IamProject>,

  listProjects: (orgId: string): Promise<{ projects: IamProject[] }> =>
    projectServiceListProjects(orgId, { status: 'ACTIVE' }) as Promise<{ projects: IamProject[] }>,

  updateProject: (orgId: string, projectId: string, project: Partial<IamProject>): Promise<IamProject> =>
    projectServiceUpdateProject(orgId, projectId, project as never) as Promise<IamProject>,

  archiveProject: (orgId: string, projectId: string): Promise<IamProject> =>
    projectServiceArchiveProject(orgId, projectId, {}) as Promise<IamProject>,

  listCapabilities: (): Promise<{ capabilities: IamCapability[] }> =>
    projectServiceListCapabilities() as Promise<{ capabilities: IamCapability[] }>,

  registerCapability: (capability: { name: string; displayName?: string; ownerService?: string }): Promise<IamCapability> =>
    projectServiceRegisterCapability(capability as never) as Promise<IamCapability>,

  listProjectCapabilities: (orgId: string, projectId: string): Promise<{ capabilities: IamProjectCapability[] }> =>
    projectServiceListProjectCapabilities(orgId, projectId) as Promise<{ capabilities: IamProjectCapability[] }>,

  enableProjectCapability: (orgId: string, projectId: string, capabilityId: string): Promise<IamProjectCapability> =>
    projectServiceEnableProjectCapability(orgId, projectId, capabilityId, {}) as Promise<IamProjectCapability>,

  disableProjectCapability: (orgId: string, projectId: string, capabilityId: string): Promise<IamProjectCapability> =>
    projectServiceDisableProjectCapability(orgId, projectId, capabilityId, {}) as Promise<IamProjectCapability>,
};