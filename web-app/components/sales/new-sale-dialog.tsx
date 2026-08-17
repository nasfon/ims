"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { SaleForm } from "@/components/sales/sale-form";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  actorShopId: string;
  /** null when the actor is not a Super Admin (no shop selector). */
  shops: { id: string; name: string }[] | null;
};

export function NewSaleDialog({ actorShopId, shops }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus />
        New sale
      </DialogTrigger>

      <DialogBackdrop />
      <DialogPopup className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto p-0">
        {open ? (
          <SaleForm
            actorShopId={actorShopId}
            shops={shops}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
