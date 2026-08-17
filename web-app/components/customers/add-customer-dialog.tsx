"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CustomerForm } from "@/components/customers/customer-form";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RoleSlug } from "@/lib/roles";
import type { ShopOption } from "@/types/users";

type Props = {
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
};

export function AddCustomerDialog({ actorRole, actorShopId, shops }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus />
        Add customer
      </DialogTrigger>

      <DialogBackdrop />
      <DialogPopup className="max-w-2xl overflow-y-auto p-0">
        {open ? (
          <CustomerForm
            actorRole={actorRole}
            actorShopId={actorShopId}
            shops={shops}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
