'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIamAuthzRelationships } from '@/hooks/use-authz';

type RelationshipDetailsProps =
  | { mode: 'resource'; resourceType: string; resourceId: string }
  | { mode: 'subject'; subjectType: string; subjectId: string }
  | { mode: 'group'; groupId: string };

export function RelationshipDetails(props: RelationshipDetailsProps) {
  const [open, setOpen] = useState(false);

  // Only compute params and fire queries when the section is expanded
  const resourceParams =
    open
      ? props.mode === 'resource'
        ? { resourceType: props.resourceType, resourceId: props.resourceId }
        : props.mode === 'group'
          ? { resourceType: 'group', resourceId: props.groupId }
          : undefined
      : undefined;

  const subjectParams =
    open
      ? props.mode === 'subject'
        ? { subjectType: props.subjectType, subjectId: props.subjectId }
        : props.mode === 'group'
          ? { subjectType: 'group', subjectId: props.groupId }
          : undefined
      : undefined;

  const { data: resourceRelationships } = useIamAuthzRelationships(
    resourceParams,
  );
  const { data: subjectRelationships } = useIamAuthzRelationships(
    subjectParams,
  );

  const allRelationships = [
    ...(resourceRelationships?.relationships || []),
    ...(subjectRelationships?.relationships || []),
  ];

  const uniqueRelationships = allRelationships.filter(
    (r, i, arr) =>
      i ===
      arr.findIndex(
        (x) =>
          x.resource.type === r.resource.type &&
          x.resource.id === r.resource.id &&
          x.relation === r.relation &&
          x.subject.type === r.subject.type &&
          x.subject.id === r.subject.id &&
          x.subject.relation === r.subject.relation,
      ),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <ChevronDown
            className={`mr-1 h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          {open ? '隐藏 SpiceDB 原始关系' : '显示 SpiceDB 原始关系'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {uniqueRelationships.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">没有找到原始关系数据。</p>
        ) : (
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3 font-mono text-[11px]">
            {uniqueRelationships.map((rel, i) => (
              <div key={i} className="break-all">
                {rel.resource.type}:{rel.resource.id}#{rel.relation}@
                {rel.subject.type}:{rel.subject.id}
                {rel.subject.relation ? `#${rel.subject.relation}` : ''}
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}