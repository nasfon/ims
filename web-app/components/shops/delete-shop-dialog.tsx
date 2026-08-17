"use client";

import { Loader2, Trash2, UserX } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogCloseIcon,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useDeleteShop,
  useShopUsers,
  useUnassignUserFromShop,
  type ApiError,
} from "@/hooks/use-shops";
import { ROLE_NAMES } from "@/lib/roles";
import type { Shop } from "@/lib/shops";

export function DeleteShopDialog({ shop }: { shop: Shop }) {
  const [open, setOpen] = useState(false);

  const { data, isPending, error } = useShopUsers(open ? shop.id : null);
  const { mutate: unassign, isPending: unassigning, variables: unassigningId } =
    useUnassignUserFromShop(shop.id);
  const {
    mutate: removeShop,
    isPending: deleting,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteShop();

  const assigned = data?.assigned ?? [];
  const isUnassigning = (id: string) =>
    unassigning && unassigningId === id;

  const canDelete = !isPending && assigned.length === 0;

  function handleUnassign(userId: string, fullName: string) {
    if (!window.confirm(`Deactivate "${fullName}" from this shop?`)) return;
    unassign(userId, {
      onError: (err) => window.alert((err as ApiError).message ?? "Unable to deactivate user."),
    });
  }

  function handleDelete() {
    resetDeleteError();
    removeShop(shop.id, {
      onSuccess: () => setOpen(false),
      onError: (err) =>
        window.alert((err as ApiError).message ?? "Unable to delete shop."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`Delete ${shop.name}`}
        onClick={() => {
          resetDeleteError();
          setOpen(true);
        }}
        className="inline-flex size-7 items-center justify-center rounded-lg text-sm font-medium transition-all outline-none hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash2 />
      </DialogTrigger>

      <DialogBackdrop />
      <DialogPopup>
        <DialogCloseIcon />
        <DialogTitle>Delete shop</DialogTitle>
        <DialogDescription>
          {isPending
            ? "Checking staff…"
            : assigned.length > 0
              ? `Deactivate all staff before deleting "${shop.name}".`
              : `Permanently delete "${shop.name}"? Its business data (products, sales, expenses, etc.) will be lost.`}
        </DialogDescription>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {assigned.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
            {assigned.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{user.full_name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{user.email ?? "no email"}</span>
                    {user.role_slug ? (
                      <Badge variant="outline">{ROLE_NAMES[user.role_slug]}</Badge>
                    ) : null}
                  </div>
                </div>
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
                  Deactivate
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {deleteError ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(deleteError as ApiError).message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" />} disabled={deleting}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 />}
            {deleting ? "Deleting…" : "Delete shop"}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  );
}