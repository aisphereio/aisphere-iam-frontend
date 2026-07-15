'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, CornerDownRight,
  Folder, FolderOpen, GitBranch, Check, CheckSquare, Square,
  Building2, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { IamGroup } from '@/lib/api/types';

// ─── Shared helpers (mirrors organization-workbench-model.ts patterns) ──

function groupID(group?: IamGroup | null): string {
  return group?.id || group?.externalId || group?.name || '';
}

function groupLabel(group?: IamGroup | null): string {
  if (!group) return '';
  return group.displayName || group.name || group.id || '';
}

function parentKey(group: IamGroup, rootId: string): string {
  const parent = group.parentId?.trim();
  return (!parent || parent === rootId) ? '' : parent;
}

function buildChildrenMap(groups: IamGroup[], rootId: string): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = parentKey(group, rootId);
    const bucket = map.get(parent) || [];
    bucket.push(group);
    map.set(parent, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
  }
  return map;
}

function buildGroupMap(groups: IamGroup[]): Map<string, IamGroup> {
  const map = new Map<string, IamGroup>();
  for (const group of groups) {
    const id = groupID(group);
    if (id) map.set(id, group);
  }
  return map;
}

function buildGroupPath(group: IamGroup | null, groupMap: Map<string, IamGroup>, rootLabel: string): string[] {
  if (!group) return [rootLabel];
  const path: string[] = [];
  const seen = new Set<string>();
  let current: IamGroup | undefined = group;
  while (current) {
    const id = groupID(current);
    if (!id || seen.has(id)) break;
    seen.add(id);
    path.unshift(groupLabel(current));
    current = current.parentId ? groupMap.get(current.parentId) : undefined;
  }
  return [rootLabel, ...path];
}

// ─── Tree rows (checkbox-based multi-select) ─────────────────────────

function PickerTreeRows({
  parentId,
  depth,
  childrenMap,
  expandedIds,
  onToggle,
  selectedIds,
  onToggleSelect,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const rows = childrenMap.get(parentId) || [];
  return (
    <>
      {rows.map((group) => {
        const id = groupID(group);
        if (!id) return null;
        const childCount = (childrenMap.get(id) || []).length;
        const isExpanded = expandedIds.has(id);
        const isChecked = selectedIds.has(id);
        const hasChildren = childCount > 0;

        return (
          <div key={id}>
            <div
              className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 hover:bg-accent cursor-pointer"
              style={{ paddingLeft: 8 + depth * 18 }}
              onClick={() => onToggleSelect(id)}
            >
              {hasChildren ? (
                <span
                  className="h-4 w-4 flex items-center justify-center shrink-0 cursor-pointer rounded hover:bg-accent-foreground/10"
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
                </span>
              ) : (
                <span className="w-4 shrink-0 flex items-center justify-center">
                  <CornerDownRight className="h-3 w-3 text-muted-foreground/50" />
                </span>
              )}
              {hasChildren ? (
                isExpanded
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              )}
              <span className="truncate text-xs font-medium flex-1">{groupLabel(group)}</span>
              {group.type ? (
                <Badge variant="outline" className="text-[9px] shrink-0">{group.type}</Badge>
              ) : null}
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleSelect(id)}
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {hasChildren && isExpanded ? (
              <PickerTreeRows
                parentId={id}
                depth={depth + 1}
                childrenMap={childrenMap}
                expandedIds={expandedIds}
                onToggle={onToggle}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export interface GroupMultiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: IamGroup[];
  rootLabel: string;
  rootId: string;
  /** IDs of groups the user already belongs to (shown as pre-checked). */
  currentMemberIds: Set<string>;
  /** Called with the full desired set of group IDs when the user confirms. */
  onConfirm: (desiredGroupIds: string[]) => void;
  /** Whether assign/remove mutations are in-flight (disables confirm button). */
  busy?: boolean;
}

export function GroupMultiPicker({
  open,
  onOpenChange,
  groups,
  rootLabel,
  rootId,
  currentMemberIds,
  onConfirm,
  busy,
}: GroupMultiPickerProps) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Local working copy of selected IDs — initialised from currentMemberIds.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const childrenMap = useMemo(() => buildChildrenMap(groups, rootId), [groups, rootId]);
  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);

  // Reset working state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(currentMemberIds));
      setSearch('');
      // Auto-expand top-level groups so the hierarchy is visible.
      setExpandedIds(new Set((childrenMap.get('') || []).map(groupID).filter(Boolean)));
    }
  }, [open, currentMemberIds, childrenMap]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSearching = search.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => {
        const label = groupLabel(g).toLowerCase();
        const id = groupID(g).toLowerCase();
        const path = (g.path || '').toLowerCase();
        return label.includes(q) || id.includes(q) || path.includes(q);
      })
      .sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
  }, [groups, isSearching, search]);

  // Delta: groups to add and groups to remove vs. the user's current memberships.
  const toAdd = useMemo(() => [...selectedIds].filter((id) => !currentMemberIds.has(id)), [selectedIds, currentMemberIds]);
  const toRemove = useMemo(() => [...currentMemberIds].filter((id) => !selectedIds.has(id)), [currentMemberIds, selectedIds]);
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const handleConfirm = () => {
    onConfirm([...selectedIds]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4 text-violet-500" />
            管理所属组织
          </DialogTitle>
          <DialogDescription className="text-xs">
            勾选或取消勾选组织，保存后将自动加入/移出。用户可同时属于多个组织。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索组织名 / 路径…"
            className="h-8 text-xs"
          />

          {/* Tree / search results */}
          <ScrollArea className="h-[280px] rounded-md border">
            <div className="p-2">
              {isSearching ? (
                <div className="space-y-0.5">
                  {searchResults.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">未找到匹配的组织</div>
                  ) : searchResults.map((group) => {
                    const id = groupID(group);
                    const path = buildGroupPath(group, groupMap, rootLabel).join(' › ');
                    const isChecked = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 hover:bg-accent cursor-pointer"
                        onClick={() => toggleSelect(id)}
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{groupLabel(group)}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{path}</div>
                        </div>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(id)}
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <PickerTreeRows
                  parentId=""
                  depth={0}
                  childrenMap={childrenMap}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              )}
            </div>
          </ScrollArea>

          {/* Change summary */}
          {hasChanges ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {toAdd.length > 0 ? (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  +{toAdd.length} 加入
                </Badge>
              ) : null}
              {toRemove.length > 0 ? (
                <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300">
                  −{toRemove.length} 移出
                </Badge>
              ) : null}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground/70">无变更</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!hasChanges || busy}>
            <Check className="mr-1 h-3.5 w-3.5" />
            保存变更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
