'use client';

import { useMemo, useState } from 'react';
import { Folder, Route, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIamProjects, useIamResources, useIamGrants, useIamResourceTypes, useIamRoleTemplates, useIamExternalUsers, useIamDirectoryGroups } from '@/hooks/use-iam';
import { useIamEffectivePermissions } from '@/hooks/use-authz';
import type { IamProject, IamResource } from '@/lib/api/types';
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

export function ResourcePermissions({ identityOrg, onNavigate }: ResourcePermissionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<{ type: string; id: string; displayName?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('members');

  const projectsQuery = useIamProjects();
  const resourcesQuery = useIamResources({ orgId: identityOrg || undefined });
  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();
  const grantsQuery = useIamGrants(
    selectedResource ? { resourceType: selectedResource.type, resourceId: selectedResource.id } : undefined,
  );
  const effectivePerms = useIamEffectivePermissions();

  const projects = (projectsQuery.data as { projects?: IamProject[] })?.projects || [];
  const resources = resourcesQuery.data?.resources || [];
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const roles = rolesQuery.data?.roleTemplates || [];
  const grants = grantsQuery.data?.grants || [];

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

  const handleCheckEffective = async () => {
    if (!selectedResource) return;
    // This would be called when the user wants to check effective permissions
    // For now it's a placeholder
  };

  const resourceLabel_ = selectedResource ? resourceLabel(selectedResource.type) : '';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">资源权限</h2>
        <p className="text-sm text-muted-foreground">管理资源成员、角色、继承权限和可见范围。</p>
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
                  <TabsTrigger value="visibility">可见性</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">直接授权</CardTitle>
                      <CardDescription>该资源上显式分配的权限。</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {grants.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          暂无直接授权。点击"添加成员"来分配权限。
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {grants.map((grant) => (
                            <div key={grant.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{grant.subject?.id}</span>
                                <span className="text-muted-foreground">→</span>
                                <span>{grant.roleKey || grant.relation}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {grant.subject?.relation === 'member' ? '用户组继承' : '直接分配'}
                              </Badge>
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
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        选择人员和权限后，点击"检查"查看有效权限。
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="visibility" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">可见性</CardTitle>
                      <CardDescription>管理资源的可见范围。</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        可见性管理功能即将上线。
                      </div>
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
                  从左侧资源树中选择一个项目或资源，查看和管理其权限。
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