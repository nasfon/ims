"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteShop, useShops, type ApiError } from "@/hooks/use-shops";
import { cn } from "@/lib/utils";
import type { Shop } from "@/lib/shops";

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
  const {
    mutate: removeShop,
    isPending: deleting,
    variables: deletingId,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteShop();

  const shops = data ?? [];
  const isDeleting = (id: string) => deleting && deletingId === id;

  function handleDelete(shop: Shop) {
    if (
      window.confirm(
        `Delete "${shop.name}"? Shops with assigned staff cannot be deleted — deactivate them instead.`,
      )
    ) {
      resetDeleteError();
      removeShop(shop.id, {
        onError: (err) => {
          const message = (err as ApiError).message ?? "Unable to delete shop.";
          window.alert(message);
        },
      });
    }
  }

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

      {deleteError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(deleteError as ApiError).message}
        </div>
      ) : null}

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
                        href={`/shops/${shop.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        aria-label={`Edit ${shop.name}`}
                      >
                        <Pencil />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${shop.name}`}
                        onClick={() => handleDelete(shop)}
                        disabled={isDeleting(shop.id)}
                      >
                        <Trash2 />
                      </Button>
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
