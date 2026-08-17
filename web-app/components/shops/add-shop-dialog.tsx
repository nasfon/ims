"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ShopForm } from "@/components/shops/shop-form";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddShopDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus />
        Add shop
      </DialogTrigger>

      <DialogBackdrop />
      <DialogPopup className="max-w-2xl overflow-y-auto p-0">
        {open ? <ShopForm mode="create" onClose={() => setOpen(false)} /> : null}
      </DialogPopup>
    </Dialog>
  );
}
