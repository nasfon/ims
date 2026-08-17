"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteUser, useToggleUserActive, useUsers } from "@/hooks/use-users";
import type { UserItem } from "@/types/users";
import { ROLES, ROLE_NAMES, type RoleSlug } from "@/lib/roles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function roleVariant(slug: RoleSlug | null) {
  if (!slug) return "outline" as const;
  if (slug === ROLES.SUPER_ADMIN) return "default" as const;
  if (slug === ROLES.SHOP_ADMIN) return "secondary" as const;
  return "outline" as const;
}

function StatusCell({ isActive }: { isActive: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className={cn(
          "size-2 rounded-full",
          isActive ? "bg-emerald-500" : "bg-zinc-400",
        )}
      />
      <span className="text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
    </span>
  );
}

export function UsersTable({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState("");
  const search = useDebouncedValue(searchText);

  const { data, isPending, error } = useUsers({ page, limit: PAGE_SIZE, search, role });
  const {
    mutate: toggleActive,
    isPending: toggling,
    variables: togglingTarget,
  } = useToggleUserActive();
  const {
    mutate: removeUser,
    isPending: deleting,
    variables: deletingId,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteUser();

  const users = data?.items ?? [];
  const pagination = data?.pagination;
  const isToggling = (id: string) => toggling && togglingTarget?.userId === id;
  const isDeleting = (id: string) => deleting && deletingId === id;

  function handleDelete(user: UserItem) {
    if (
      window.confirm(
        `Delete "${user.full_name}"? They will lose access immediately and no longer appear in the user list.`,
      )
    ) {
      resetDeleteError();
      removeUser(user.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:max-w-md sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or email…"
              className="pl-8"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v ?? ""); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.SUPER_ADMIN}>Super Admin</SelectItem>
              <SelectItem value={ROLES.SHOP_ADMIN}>Shop Admin</SelectItem>
              <SelectItem value={ROLES.CASHIER}>Cashier</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/users/new" className={buttonVariants({ size: "sm" })}>
          <Plus />
          Add user
        </Link>
      </div>

      {deleteError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError.message}
        </div>
      ) : null}

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading users…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(user.role_slug)}>
                      {user.role_slug ? ROLE_NAMES[user.role_slug] : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.shop_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusCell isActive={user.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    {user.id === currentUserId ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : (
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link
                          href={`/users/${user.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Edit ${user.full_name}`}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleActive({ userId: user.id, is_active: !user.is_active })
                          }
                          disabled={isToggling(user.id)}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${user.full_name}`}
                          onClick={() => handleDelete(user)}
                          disabled={isDeleting(user.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing page {pagination.page} of {Math.max(1, pagination.pages)} · {pagination.total} users
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.max(1, pagination.pages) || isPending}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}