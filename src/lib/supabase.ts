import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/**
 * Fetch ALL rows for a query, transparently paginating past the supabase
 * default row limit (1000). Without this, big tables (predictions across all
 * users × matches) silently truncate, breaking the leaderboard and the
 * "wie heeft ingevuld" counter.
 *
 * The builder must be a chain that supports .range() and .select() (the
 * standard PostgrestFilterBuilder from a .from(table).select(...) chain).
 *
 * Use:
 *   const rows = await fetchAll<{ user_id: string; points_total: number }>(
 *     () => db().from("predictions").select("user_id, points_total")
 *   );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RangeableQuery = { range: (from: number, to: number) => any };

export async function fetchAll<T>(
  buildQuery: () => RangeableQuery,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Hard cap at 50 pages = 50k rows as runaway-loop backstop.
  for (let i = 0; i < 50; i++) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error((error as { message: string }).message);
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < pageSize) return out;
    from += pageSize;
  }
  return out;
}
