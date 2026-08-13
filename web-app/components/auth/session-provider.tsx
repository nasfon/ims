"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthSessionUser } from "@/types/auth";

type SessionContextValue = {
  /** The authenticated profile (role + shop) or null when signed out. */
  user: AuthSessionUser | null;
  /** Signs the current user out (calls the API, then navigates to /login). */
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user: initialUser,
  children,
}: {
  user: AuthSessionUser | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthSessionUser | null>(initialUser);

  const signOut = useCallback(async () => {
    const res = await fetch("/api/v1/auth/logout", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.success === false) {
      throw new Error(json.message ?? "Unable to sign out.");
    }

    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, signOut }),
    [user, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>.");
  }
  return ctx;
}