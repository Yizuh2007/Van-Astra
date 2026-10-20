import { createClient } from "@supabase/supabase-js";

const environment = import.meta.env ?? {};
const projectUrl = environment.VITE_SUPABASE_URL?.trim() ?? "";
const publicKey = environment.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
const hasPlaceholder = /your-project-id|your-publishable-or-anon-key/i.test(`${projectUrl} ${publicKey}`);
const hasValidUrl = (() => {
  try {
    const url = new URL(projectUrl);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
})();

export const supabase = projectUrl && publicKey && hasValidUrl && !hasPlaceholder
  ? createClient(projectUrl, publicKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
    },
  })
  : null;
