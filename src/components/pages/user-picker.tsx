'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import type { IamUser } from '@/lib/api/types';
import { userId as userID, userInitial, userLabel } from './organization-workbench-model';

export interface UserPickerProps {
  /** Candidates that may be picked (already excluding current members, etc.). */
  users: IamUser[];
  /** Currently selected user ID (empty = nothing selected). */
  value: string;
  /** Called when the user picks a candidate. */
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable combobox for picking a user. Mirrors the Popover + Command pattern
 * used by {@link GroupTreePicker}, but over a flat candidate list with
 * client-side filtering by label / username / email / phone / id.
 */
export function UserPicker({
  users,
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedUser = useMemo(
    () => (value ? users.find((u) => userID(u) === value) : null),
    [users, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = [
        userLabel(user), user.username, user.email, user.phone, user.id, user.externalId,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || users.length === 0}
          className={cn('h-9 justify-start text-xs font-normal', className)}
        >
          {selectedUser ? (
            <>
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="bg-sky-500/15 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                  {userInitial(selectedUser)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{userLabel(selectedUser)}</span>
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                {placeholder || (users.length === 0 ? '没有可添加的用户' : '搜索要加入的用户…')}
              </span>
            </>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索姓名 / 用户名 / 邮箱 / 手机…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>未找到匹配的用户</CommandEmpty>
            {filtered.length > 0 ? (
              <CommandGroup>
                {filtered.map((user) => {
                  const id = userID(user);
                  if (!id) return null;
                  return (
                    <CommandItem
                      key={id}
                      value={`${userLabel(user)} ${user.username || ''} ${user.email || ''} ${id}`}
                      onSelect={() => handleSelect(id)}
                      className="gap-2"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-sky-500/15 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                          {userInitial(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{userLabel(user)}</div>
                        {(user.email || user.username) ? (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {user.email || user.username}
                          </div>
                        ) : null}
                      </div>
                      {value === id ? <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
