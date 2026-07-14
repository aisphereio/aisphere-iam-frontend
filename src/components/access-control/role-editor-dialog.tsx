'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useIamPreviewRoleTemplateImpact,
  useIamRegisterRoleTemplate,
  useIamUpdateRoleTemplate,
} from '@/hooks/use-iam';
import type { IamResourceType, IamRoleImpact, IamRoleTemplate } from '@/lib/api/types';
import { capabilitiesForResourceType, invalidRoleCapabilities } from '@/lib/authz/role-capabilities';
import { resourceLabel } from '@/lib/authz/schema-summary';

interface RoleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: IamRoleTemplate | null;
  copyFrom: IamRoleTemplate | null;
  resourceTypes: IamResourceType[];
}

export function RoleEditorDialog({ open, onOpenChange, role, copyFrom, resourceTypes }: RoleEditorDialogProps) {
  const registerRole = useIamRegisterRoleTemplate();
  const updateRole = useIamUpdateRoleTemplate();
  const previewImpact = useIamPreviewRoleTemplateImpact();
  const [displayName, setDisplayName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [impact, setImpact] = useState<IamRoleImpact | null>(null);

  const source = role || copyFrom;
  const editing = Boolean(role);
  const capabilities = useMemo(
    () => capabilitiesForResourceType(resourceTypes, resourceType),
    [resourceType, resourceTypes],
  );

  useEffect(() => {
    if (!open) return;
    setDisplayName(source?.displayName ? `${source.displayName}${copyFrom ? ' 副本' : ''}` : '');
    setRoleKey(copyFrom ? `${source?.roleKey || ''}_copy` : source?.roleKey || '');
    setDescription(source?.description || '');
    setResourceType(source?.resourceType || resourceTypes.find((item) => item.grantable)?.type || '');
    setPermissions(source?.permissions || []);
    setImpact(null);
  }, [copyFrom, open, resourceTypes, source]);

  const togglePermission = (key: string, checked: boolean) => {
    setPermissions((current) => checked ? [...new Set([...current, key])] : current.filter((item) => item !== key));
    setImpact(null);
  };

  const save = async () => {
    if (!displayName.trim() || !roleKey.trim() || !resourceType || permissions.length === 0) {
      toast.error('请填写角色名称、标识、资源类型，并至少选择一个能力');
      return;
    }
    const invalid = invalidRoleCapabilities(resourceTypes, resourceType, permissions);
    if (invalid.length > 0) {
      toast.error(`这些能力不属于当前资源类型：${invalid.join('、')}`);
      return;
    }

    try {
      if (!editing || !role) {
        await registerRole.mutateAsync({
          resourceType,
          roleKey: roleKey.trim(),
          displayName: displayName.trim(),
          description: description.trim(),
          permissions,
        });
        toast.success('自定义角色已创建');
        onOpenChange(false);
        return;
      }

      const nextImpact = await previewImpact.mutateAsync({ id: role.id, permissions });
      setImpact(nextImpact);
      if (nextImpact.removedPermissions.length > 0 && !window.confirm(
        `将移除 ${nextImpact.removedPermissions.length} 个能力，影响 ${nextImpact.activeGrantCount} 个有效分配。确认保存吗？`,
      )) return;

      await updateRole.mutateAsync({
        id: role.id,
        displayName: displayName.trim(),
        description: description.trim(),
        permissions,
        expectedVersion: role.version || 1,
      });
      toast.success('角色已更新');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存角色失败';
      toast.error(/version|conflict|冲突/i.test(message) ? '角色已被其他人更新，请刷新后重试' : message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑自定义角色' : copyFrom ? '复制为自定义角色' : '创建自定义角色'}</DialogTitle>
          <DialogDescription>角色只描述“能做什么”；具体给谁、在哪个资源生效，在访问分配中处理。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">角色名称</Label>
            <Input id="role-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：Skill 审核员" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-key">角色标识</Label>
            <Input id="role-key" value={roleKey} onChange={(event) => setRoleKey(event.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())} disabled={editing} placeholder="skill_reviewer" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>适用资源</Label>
            <Select value={resourceType} onValueChange={(value) => { setResourceType(value); setPermissions([]); setImpact(null); }} disabled={editing || Boolean(copyFrom)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="选择资源类型" /></SelectTrigger>
              <SelectContent>
                {resourceTypes.filter((item) => item.grantable !== false).map((item) => (
                  <SelectItem key={item.type} value={item.type}>{item.displayName || resourceLabel(item.type)} · {item.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="role-description">用途说明</Label>
            <Textarea id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个角色适合分配给谁，承担什么职责？" />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">包含能力</div>
            <div className="text-xs text-muted-foreground">只展示所选资源类型真正支持的权限，不需要理解 SpiceDB relation。</div>
          </div>
          {capabilities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">该资源类型尚未声明可选权限。</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {capabilities.map((capability) => (
                <label key={capability.key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:border-violet-500/40">
                  <Checkbox checked={permissions.includes(capability.key)} onCheckedChange={(value) => togglePermission(capability.key, value === true)} />
                  <span>
                    <span className="block text-sm font-medium">{capability.label}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">{capability.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {impact && impact.removedPermissions.length > 0 && (
          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>将影响 {impact.activeGrantCount} 个有效分配；移除：{impact.removedPermissions.join('、')}。</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={save} disabled={registerRole.isPending || updateRole.isPending || previewImpact.isPending}>
            {editing ? '预览影响并保存' : '创建角色'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
