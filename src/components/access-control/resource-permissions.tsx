'use client';

import { useMemo, useState } from 'react';
import { Folder, Route, Search, Users, Shield, ArrowUpRight, Ban, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIamProjects, useIamResources, useIamResourceAccess, useIamResourceTypes, useIamRoleTemplates, useIamExternalUsers, useIamDirectoryGroups, useIamRevokeAccess } from '@/hooks/use-iam';
import type { IamProject, IamResource, IamEntitlement, IamEntitlementSourceType } from '@/lib/api/types';
import { resourceLabel } from '@/lib/authz/schema-summary';
import { cn } from '@/lib/utils';

interface ResourcePermissionsProps {
  identityOrg: string;
  onNavigate?: (tab: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  icon: React.ReactNode;
  children?: TreeNode[];
  resource?: IamResource;
}

/** Human-readable label for source type */
function sourceLabel(source?: IamEntitlementSourceType): string {
  switch (source) {
    case 'DIRECT_GRANT': return '直接分配';
    case 'GROUP_GRANT': return '通过用户组';
    case 'PARENT_INHERITANCE': return '父资源继承';
    case 'ORG_INHERITANCE': return '组织级权限';
    case 'PLATFORM_INHERITANCE': return '平台级权限';
    default: return '未知来源';
  }
}

/** Icon for source type */
function SourceIcon({ source }: { source?: IamEntitlementSourceType }) {
  switch (source) {
    case 'DIRECT_GRANT': return <Shield className="h-3.5 w-3.5 text-green-600" />;
    case 'GROUP_GRANT': return <Users className="h-3.5 w-3.5 text-blue-600" />;
    case 'PARENT_INHERITANCE': return <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />;
    case 'ORG_INHERITANCE': return <Route className="h-3.5 w-3.5 text-purple-600" />;
    case 'PLATFORM_INHERITANCE': return <Shield className="h-3.5 w-3.5 text-slate-600" />;
    default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function ResourcePermissions({ identityOrg, onNavigate }: ResourcePermissionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<{ type: string; id: string; displayName?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('members');

  const projectsQuery = useIamProjects(identityOrg);
  const resourcesQuery = useIamResources(identityOrg);
  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();
  const accessQuery = useIamResourceAccess(
    identityOrg,
    selectedResource ? { type: selectedResource.type, id: selectedResource.id } : null,
  );
  const revokeAccess = useIamRevokeAccess(identityOrg);

  const projects = (projectsQuery.data as { projects?: IamProject[] })?.projects || [];
  const resources = resourcesQuery.data?.resources || [];
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const roles = rolesQuery.data?.roleTemplates || [];
  const entitlements = accessQuery.data?.entitlements || [];

  // Build resource tree
  const resourceTree = useMemo(() => {
    const tree: TreeNode[] = [];

    // Group resources by project
    for (const p of projects) {
      tree.push({
        id: p.id,
        label: p.displayName || p.slug || p.id,
        type: 'project',
        icon: <Folder className="h-4 w-4 text-amber-500" />,
        children: [],
      });
    }

    // Add resources under their parent project
    for (const r of resources) {
      const parentId = r.projectId || r.orgId;
      const parent = tree.find((n) => n.id === parentId);
      const node: TreeNode = {
        id: r.ref.id,
        label: r.displayName || r.slug || r.ref.id,
        type: r.ref.type,
        icon: <Route className="h-4 w-4 text-violet-500" />,
        resource: r,
      };
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        // Orphan resource - add at root
        tree.push(node);
      }
    }

    return tree;
  }, [projects, resources]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return resourceTree;
    const q = searchQuery.toLowerCase();
    const filter = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((n) => ({
          ...n,
          children: n.children ? filter(n.children) : undefined,
        }))
        .filter((n) => n.label.toLowerCase().includes(q) || (n.children && n.children.length > 0));
    };
    return filter(resourceTree);
  }, [resourceTree, searchQuery]);

  const handleSelectResource = (type: string, id: string, displayName?: string) => {
    setSelectedResource({ type, id, displayName });
  };

  const handleRevoke = async (grantId: string) => {
    try {
      await revokeAccess.mutateAsync(grantId);
      accessQuery.refetch();
    } catch {
      // handled by the mutation
    }
  };

  // Separate direct grants from inherited
  const directEntitlements = useMemo(
    () => entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT'),
    [entitlements],
  );
  const inheritedEntitlements = useMemo(
    () => entitlements.filter((e) => e.sourceType !== 'DIRECT_GRANT'),
    [entitlements],
  );

  const resourceLabel_ = selectedResource ? resourceLabel(selectedResource.type) : '';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">资源权限</h2>
        <p className="text-sm text-muted-foreground">查看资源上的所有有效权限（含继承）。</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,1.6fr)]">
        {/* Left: Resource Tree */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="h-4 w-4 text-violet-600" />
              资源树
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索资源..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="px-3 pb-3 space-y-0.5">
                {filteredTree.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">没有找到资源。</div>
                ) : (
                  <ResourceTreeNodes
                    nodes={filteredTree}
                    selectedId={selectedResource?.id}
                    selectedType={selectedResource?.type}
                    onSelect={handleSelectResource}
                    depth={0}
                  />
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Resource Details */}
        <div className="space-y-4">
          {selectedResource ? (
            <>
              {/* Resource Header */}
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{selectedResource.displayName || selectedResource.id}</h3>
                      <Badge variant="secondary" className="text-[10px]">{resourceLabel_}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">{selectedResource.type}:{selectedResource.id}</p>
                  </div>
                  <Button size="sm" onClick={() => onNavigate?.('grants')}>
                    <Users className="mr-1.5 h-3.5 w-3.5" />添加成员
                  </Button>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="members">成员与权限</TabsTrigger>
                  <TabsTrigger value="effective">有效权限</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">直接授权</CardTitle>
                      <CardDescription>该资源上显式分配的权限。</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {accessQuery.isLoading && (
                        <div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>
                      )}
                      {accessQuery.isError && (
                        <div className="p-8 text-center text-sm text-red-500">
                          加载失败：{accessQuery.error?.message}
                        </div>
                      )}
                      {!accessQuery.isLoading && !accessQuery.isError && directEntitlements.length === 0 && (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          暂无直接授权。点击"添加成员"来分配权限。
                        </div>
                      )}
                      {directEntitlements.length > 0 && (
                        <div className="space-y-2">
                          {directEntitlements.map((ent) => (
                            <div key={ent.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-2 text-sm min-w-0">
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{ent.subject?.id}</span>
                                <span className="text-muted-foreground shrink-0">→</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {ent.roleKey}
                                </Badge>
                                {ent.permissions && ent.permissions.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground hidden md:inline">
                                    {ent.permissions.length} 个权限
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {ent.revocableHere && ent.grantId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                    onClick={() => handleRevoke(ent.grantId!)}
                                    title="撤销授权"
                                    disabled={revokeAccess.isPending}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="effective" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">有效权限</CardTitle>
                      <CardDescription>直接授权和继承后的最终权限结果。</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {accessQuery.isLoading && (
                        <div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>
                      )}
                      {accessQuery.isError && (
                        <div className="p-8 text-center text-sm text-red-500">
                          加载失败：{accessQuery.error?.message}
                        </div>
                      )}
                      {!accessQuery.isLoading && !accessQuery.isError && entitlements.length === 0 && (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          暂无有效权限。
                        </div>
                      )}
                      {entitlements.length > 0 && (
                        <div className="space-y-2">
                          {entitlements.map((ent) => (
                            <div key={ent.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-2 text-sm min-w-0">
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{ent.subject?.id}</span>
                                <span className="text-muted-foreground shrink-0">→</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {ent.roleKey}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0 flex items-center gap-1"
                                >
                                  <SourceIcon source={ent.sourceType} />
                                  {sourceLabel(ent.sourceType)}
                                </Badge>
                                {ent.sourceSubject && ent.sourceType === 'GROUP_GRANT' && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    (组: {ent.sourceSubject.id})
                                  </span>
                                )}
                                {ent.sourceResource && ent.sourceType === 'PARENT_INHERITANCE' && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    (父: {ent.sourceResource.id})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {ent.permissions && ent.permissions.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground hidden md:inline">
                                    {ent.permissions.length} 个权限
                                  </span>
                                )}
                                {ent.revocableHere && ent.grantId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                    onClick={() => handleRevoke(ent.grantId!)}
                                    title="撤销授权"
                                    disabled={revokeAccess.isPending}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Route className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-base font-medium">选择一个资源</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  从左侧资源树中选择一个项目或资源，查看其有效权限。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function ResourceTreeNodes({
  nodes,
  selectedId,
  selectedType,
  onSelect,
  depth = 0,
}: {
  nodes: TreeNode[];
  selectedId?: string;
  selectedType?: string;
  onSelect: (type: string, id: string, displayName?: string) => void;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isSelected = selectedId === node.id && selectedType === node.type;
        const hasChildren = node.children && node.children.length > 0;
        return (
          <div key={`${node.type}-${node.id}`}>
            <button
              type="button"
              onClick={() => onSelect(node.type, node.id, node.label)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                isSelected
                  ? 'bg-violet-600 text-white'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground',
              )}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
              <span className="shrink-0">{node.icon}</span>
              <span className="truncate flex-1">{node.label}</span>
              {hasChildren && (
                <span className="text-[10px] opacity-60">{node.children!.length}</span>
              )}
            </button>
            {hasChildren && (
              <ResourceTreeNodes
                nodes={node.children!}
                selectedId={selectedId}
                selectedType={selectedType}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}