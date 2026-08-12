import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — IMS",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Inventory Management System
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account to continue.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}