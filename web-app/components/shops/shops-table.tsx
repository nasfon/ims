"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteShopDialog } from "@/components/shops/delete-shop-dialog";
import { useShops } from "@/hooks/use-shops";
import { cn } from "@/lib/utils";

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

export function ShopsTable() {
  const { data, isPending, error } = useShops();

  const shops = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage shop locations and their receipt details.
          </p>
        </div>
        <Link href="/shops/new" className={buttonVariants({ size: "sm" })}>
          <Plus />
          Add shop
        </Link>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading shops…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : shops.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No shops found.
                </TableCell>
              </TableRow>
            ) : (
              shops.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">{shop.name}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.address ?? "—"}</TableCell>
                  <TableCell>
                    <StatusCell isActive={shop.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Link
                        href={`/shops/${shop.id}#staff`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label={`Manage staff for ${shop.name}`}
                      >
                        <Users />
                        Staff
                      </Link>
                      <Link
                        href={`/shops/${shop.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        aria-label={`Edit ${shop.name}`}
                      >
                        <Pencil />
                      </Link>
                      <DeleteShopDialog shop={shop} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
