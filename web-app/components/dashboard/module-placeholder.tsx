import { Construction } from "lucide-react";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <Construction className="size-10 text-muted-foreground" />
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This module is under construction and will be available soon.
        </p>
      </div>
    </div>
  );
}