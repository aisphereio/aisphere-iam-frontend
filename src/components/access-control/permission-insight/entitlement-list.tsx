'use client';

import { ChevronDown, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { IamEntitlement, IamEntitlementSourceType } from '@/lib/api/types';

function sourceText(entitlement: IamEntitlement): string {
  if (entitlement.sourceType === 'DIRECT_GRANT') return '直接授权';
  if (entitlement.sourceType === 'GROUP_GRANT')
    return `通过组织 ${entitlement.sourceSubject?.id || '-'}`;
  if (entitlement.sourceType === 'PARENT_INHERITANCE')
    return `继承自父资源 ${entitlement.sourceResource?.id || '-'}`;
  if (entitlement.sourceType === 'ORG_INHERITANCE')
    return `继承自身份域 ${entitlement.sourceResource?.id || '-'}`;
  if (entitlement.sourceType === 'PLATFORM_INHERITANCE')
    return `继承自平台 ${entitlement.sourceResource?.id || '-'}`;
  return '未知来源';
}

function sourceBadgeVariant(
  sourceType?: IamEntitlementSourceType,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (sourceType) {
    case 'DIRECT_GRANT':
      return 'default';
    case 'GROUP_GRANT':
      return 'secondary';
    case 'PARENT_INHERITANCE':
    case 'ORG_INHERITANCE':
    case 'PLATFORM_INHERITANCE':
      return 'outline';
    default:
      return 'secondary';
  }
}

interface EntitlementListProps {
  entitlements: IamEntitlement[];
  emptyText: string;
  showSubject?: boolean;
  onRevoke?: (entitlement: IamEntitlement) => void;
}

export function EntitlementList({
  entitlements,
  emptyText,
  showSubject = false,
  onRevoke,
}: EntitlementListProps) {
  if (entitlements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <ShieldX className="h-8 w-8" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entitlements.map((ent) => (
        <EntitlementRow
          key={ent.id}
          entitlement={ent}
          showSubject={showSubject}
          onRevoke={onRevoke}
        />
      ))}
    </div>
  );
}

function EntitlementRow({
  entitlement: ent,
  showSubject,
  onRevoke,
}: {
  entitlement: IamEntitlement;
  showSubject: boolean;
  onRevoke?: (entitlement: IamEntitlement) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border bg-card"
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`}
            />
          </Button>
        </CollapsibleTrigger>

        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {showSubject && (
            <span className="truncate font-medium">
              {ent.subject.type}:{ent.subject.id}
            </span>
          )}
          <span className="truncate font-medium">{ent.resource.id}</span>
          {ent.roleKey && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {ent.roleKey}
            </Badge>
          )}
          {ent.permissions && ent.permissions.length > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {ent.permissions.length} 个权限
            </span>
          )}
        </div>

        <Badge
          variant={sourceBadgeVariant(ent.sourceType)}
          className="shrink-0 text-[10px]"
        >
          {sourceText(ent)}
        </Badge>

        {onRevoke && ent.revocableHere && ent.grantId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive"
            onClick={() => onRevoke(ent)}
          >
            <ShieldX className="mr-1 h-3 w-3" />
            撤销
          </Button>
        )}
      </div>

      <CollapsibleContent>
        {ent.permissions && ent.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-t px-3 py-2">
            {ent.permissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="text-[10px]">
                {perm}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            该角色未配置具体权限
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}