"use client";

import { Loader2, UserPlus, UserX } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  useAssignUserToShop,
  useShopUsers,
  useUnassignUserFromShop,
  type ApiError,
} from "@/hooks/use-shops";
import { ROLE_NAMES } from "@/lib/roles";

export function ShopUsers({ shopId }: { shopId: string }) {
  const { data, isPending, error } = useShopUsers(shopId);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const assign = useAssignUserToShop(shopId);
  const unassign = useUnassignUserFromShop(shopId);

  const assigned = data?.assigned ?? [];
  const available = data?.available ?? [];

  const isUnassigning = (id: string) =>
    unassign.isPending && unassign.variables === id;

  function handleAssign() {
    if (!selectedUserId) return;
    setActionError(null);
    assign.mutate(selectedUserId, {
      onSuccess: () => setSelectedUserId(""),
      onError: (err) =>
        setActionError((err as ApiError).message ?? "Unable to assign user."),
    });
  }

  function handleUnassign(userId: string, fullName: string) {
    if (!window.confirm(`Remove "${fullName}" from this shop?`)) return;
    setActionError(null);
    unassign.mutate(userId, {
      onError: (err) =>
        setActionError((err as ApiError).message ?? "Unable to unassign user."),
    });
  }

  return (
    <Card id="staff" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Staff</CardTitle>
        <CardDescription>
          Assign users to this shop or remove them. Unassigned users keep their
          account and can be reassigned later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {actionError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={available.length ? "Assign a user…" : "No unassigned users"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} · {user.email ?? "no email"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={!selectedUserId || assign.isPending}>
            {assign.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus />}
            {assign.isPending ? "Assigning…" : "Assign user"}
          </Button>
        </div>

        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Loading staff…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-destructive">
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : assigned.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No users assigned to this shop.
                  </TableCell>
                </TableRow>
              ) : (
                assigned.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {user.role_slug ? (
                        <Badge variant="outline">{ROLE_NAMES[user.role_slug]}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassign(user.id, user.full_name)}
                        disabled={isUnassigning(user.id)}
                      >
                        {isUnassigning(user.id) ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserX />
                        )}
                        Deassign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}