import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}