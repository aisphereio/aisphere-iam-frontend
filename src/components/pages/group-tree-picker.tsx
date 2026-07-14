'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, CornerDownRight,
  Folder, FolderOpen, GitBranch, Check,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import type { IamGroup } from '@/lib/api/types';

// ─── Shared helpers (mirrors groups-page.tsx to keep this module self-contained) ──

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

/** Collect all descendant IDs of `groupId` with cycle protection. */
function collectDescendantIds(
  groupId: string,
  childrenMap: Map<string, IamGroup[]>,
): Set<string> {
  const out = new Set<string>();
  const stack = [groupId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      const cid = groupID(child);
      if (!cid || out.has(cid)) continue; // cycle guard
      out.add(cid);
      stack.push(cid);
    }
  }
  return out;
}

// ─── Tree rows inside the popover (non-search mode) ───────────────────

function PickerTreeRows({
  parentId,
  depth,
  childrenMap,
  expandedIds,
  onToggle,
  excludedIds,
  selectedValue,
  onSelect,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  excludedIds: Set<string>;
  selectedValue: string;
  onSelect: (id: string) => void;
}) {
  const rows = childrenMap.get(parentId) || [];
  return (
    <>
      {rows.map((group) => {
        const id = groupID(group);
        if (excludedIds.has(id)) return null;
        const childCount = (childrenMap.get(id) || []).filter(
          (c) => !excludedIds.has(groupID(c)),
        ).length;
        const isExpanded = expandedIds.has(id);
        const isSelected = selectedValue === id;
        const hasChildren = childCount > 0;

        return (
          <div key={id}>
            <CommandItem
              value={`${groupLabel(group)} ${id} ${group.path || ''}`}
              onSelect={() => onSelect(id)}
              className="gap-1.5"
              style={{ paddingLeft: 8 + depth * 18 }}
            >
              {hasChildren ? (
                <span
                  className="h-4 w-4 flex items-center justify-center shrink-0 cursor-pointer rounded hover:bg-accent"
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
              {isSelected ? <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" /> : null}
            </CommandItem>

            {hasChildren && isExpanded ? (
              <PickerTreeRows
                parentId={id}
                depth={depth + 1}
                childrenMap={childrenMap}
                expandedIds={expandedIds}
                onToggle={onToggle}
                excludedIds={excludedIds}
                selectedValue={selectedValue}
                onSelect={onSelect}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export interface GroupTreePickerProps {
  groups: IamGroup[];
  rootLabel: string;
  /** Root zone ID — groups whose parentId equals this are treated as top-level. */
  rootId: string;
  /** Currently selected parent ID (empty = top-level, no parent). */
  value: string;
  /** Called when the user picks a parent group. */
  onChange: (parentId: string) => void;
  /** ID of the group being edited (excluded + its descendants excluded to prevent cycles). */
  excludeId?: string;
  /** Optional placeholder for the trigger button. */
  placeholder?: string;
  className?: string;
}

export function GroupTreePicker({
  groups,
  rootLabel,
  rootId,
  value,
  onChange,
  excludeId,
  placeholder,
  className,
}: GroupTreePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const childrenMap = useMemo(() => buildChildrenMap(groups, rootId), [groups, rootId]);
  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);

  // Excluded set: the editing group itself + all its descendants (cycle prevention)
  const excludedIds = useMemo(() => {
    if (!excludeId) return new Set<string>();
    return new Set([excludeId, ...collectDescendantIds(excludeId, childrenMap)]);
  }, [excludeId, childrenMap]);

  const selectedGroup = value ? groupMap.get(value) : null;
  const selectedLabel = selectedGroup
    ? buildGroupPath(selectedGroup, groupMap, rootLabel).join(' › ')
    : '';

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const handleSelectRoot = () => {
    onChange('');
    setOpen(false);
    setSearch('');
  };

  const isSearching = search.trim().length > 0;
  // Searchable candidates: all groups not in excludedIds
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => !excludedIds.has(groupID(g)))
      .filter((g) => {
        const label = groupLabel(g).toLowerCase();
        const id = groupID(g).toLowerCase();
        const path = (g.path || '').toLowerCase();
        return label.includes(q) || id.includes(q) || path.includes(q);
      })
      .sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
  }, [groups, excludedIds, isSearching, search]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-8 justify-start text-xs font-normal', className)}
        >
          {value ? (
            <>
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate">{selectedLabel || groupLabel(selectedGroup)}</span>
            </>
          ) : (
            <>
              <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
              <span className="text-muted-foreground">{placeholder || '（顶级组织，无父级）'}</span>
            </>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索组织名 / 路径…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>未找到匹配的组织</CommandEmpty>

            {/* Top-level option — always visible */}
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={handleSelectRoot}
                className="gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="text-xs font-medium">（顶级组织，无父级）</span>
                {!value ? <Check className="h-3.5 w-3.5 text-violet-500 ml-auto" /> : null}
              </CommandItem>
            </CommandGroup>

            {isSearching ? (
              /* Search mode: flat list */
              searchResults.length === 0 ? null : (
                <CommandGroup heading="搜索结果">
                  {searchResults.map((group) => {
                    const id = groupID(group);
                    const path = buildGroupPath(group, groupMap, rootLabel).join(' › ');
                    return (
                      <CommandItem
                        key={id}
                        value={`${groupLabel(group)} ${id} ${group.path || ''}`}
                        onSelect={() => handleSelect(id)}
                        className="gap-1.5"
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{groupLabel(group)}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{path}</div>
                        </div>
                        {value === id ? <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )
            ) : (
              /* Tree mode */
              <CommandGroup heading="组织树">
                <PickerTreeRows
                  parentId=""
                  depth={0}
                  childrenMap={childrenMap}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  excludedIds={excludedIds}
                  selectedValue={value}
                  onSelect={handleSelect}
                />
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
