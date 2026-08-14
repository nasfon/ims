"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useUsers } from "@/hooks/use-users";
import { AUDIT_ACTIONS } from "@/lib/audit";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  user_created: "User created",
  user_updated: "User updated",
  user_deactivated: "User deactivated",
  user_deleted: "User deleted",
  shop_created: "Shop created",
  shop_updated: "Shop updated",
  shop_deleted: "Shop deleted",
  product_created: "Product created",
  product_updated: "Product updated",
  product_deleted: "Product deleted",
  customer_created: "Customer created",
  customer_updated: "Customer updated",
  customer_deleted: "Customer deleted",
  sale_created: "Sale created",
  sale_corrected: "Sale corrected",
  sale_reversed: "Sale reversed",
  credit_payment_recorded: "Credit payment recorded",
  expense_created: "Expense created",
  expense_updated: "Expense updated",
  expense_deleted: "Expense deleted",
  settings_updated: "Settings updated",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogsTable() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isPending, error, refetch } = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    action,
    userId,
    dateFrom,
    dateTo,
  });

  // Static user list for the actor filter.
  const { data: usersData } = useUsers({ page: 1, limit: 100, search: "", role: "" });

  const logs = data?.items ?? [];
  const pagination = data?.pagination;

  function reset() {
    setAction("");
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="audit-from">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-8 w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="audit-to">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-8 w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Action</span>
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-40">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {Object.values(AUDIT_ACTIONS).map((value) => (
                <SelectItem key={value} value={value}>
                  {actionLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">User</span>
          <Select
            value={userId}
            onValueChange={(v) => {
              setUserId(v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-40">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All users</SelectItem>
              {(usersData?.items ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">IP address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading audit logs…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.user?.full_name ?? "System"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.role?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.shop?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {actionLabel(log.action)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground" title={log.entity}>
                    {log.entity}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground" title={log.reason ?? undefined}>
                    {log.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {log.ip_address ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing page {pagination.page} of {Math.max(1, pagination.pages)} ·{" "}
            {pagination.total} entries
          </span>
          <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => refetch()}
              aria-label="Refresh"
            >
              <Loader2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}