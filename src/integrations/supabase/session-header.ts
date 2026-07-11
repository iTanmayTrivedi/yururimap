// Installs the anonymous session id as an x-session-id request header on the
// Supabase REST client. RLS policies use current_setting('request.headers')
// to bind writes (admin_session_id / created_by / session_id) to the caller.
import { supabase } from "./client";
import { getSessionId } from "@/lib/session";

let installed = false;

export function installSessionHeader() {
  if (installed || typeof window === "undefined") return;
  const id = getSessionId();
  if (!id) return;
  try {
    // supabase.rest is a PostgrestClient with a mutable default headers map.
    const rest = (supabase as unknown as { rest: { headers: Record<string, string> } }).rest;
    if (rest && rest.headers) {
      rest.headers["x-session-id"] = id;
      installed = true;
    }
  } catch {
    // no-op — best-effort header install
  }
}
