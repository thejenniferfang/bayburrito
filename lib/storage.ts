/**
 * Ratings + comments are community data backed by Supabase (see lib/supabase).
 * If Supabase is not configured, everything falls back to localStorage so the
 * app still works on-device. Spot requests stay local-only.
 */
import { supabase } from "./supabase";

export interface UserComment {
  id: string;
  burritoId: string;
  text: string;
  at: number; // epoch ms
}

export interface CommunityRating {
  avg: number | null; // community average, 0-10
  count: number; // number of ratings
  mine: number | null; // this browser's rating
}

export interface SpotRequest {
  id: string;
  name: string;
  neighborhood: string;
  note: string;
  lat: number;
  lng: number;
  at: number;
  mine: boolean; // created by this browser (only these can be removed)
}

const COMMENTS_KEY = "bbc-comments";
const RATINGS_KEY = "bbc-ratings";
const REQUESTS_KEY = "bbc-requests";
const CLIENT_KEY = "bbc-client";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked
  }
}

/** Stable anonymous id so a browser gets one rating per place. */
function clientId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/* ----------------------------- ratings ----------------------------- */

export async function getCommunityRating(
  burritoId: string
): Promise<CommunityRating> {
  if (!supabase) {
    const mine = read<Record<string, number>>(RATINGS_KEY, {})[burritoId] ?? null;
    return { avg: mine, count: mine == null ? 0 : 1, mine };
  }
  const { data } = await supabase
    .from("ratings")
    .select("score, client_id")
    .eq("burrito_id", burritoId);
  const rows = data ?? [];
  const count = rows.length;
  const avg = count
    ? rows.reduce((s, r) => s + Number(r.score), 0) / count
    : null;
  const mineRow = rows.find((r) => r.client_id === clientId());
  return { avg, count, mine: mineRow ? Number(mineRow.score) : null };
}

export async function setMyRating(
  burritoId: string,
  score: number
): Promise<void> {
  const s = Math.max(0, Math.min(10, score));
  if (!supabase) {
    const ratings = read<Record<string, number>>(RATINGS_KEY, {});
    ratings[burritoId] = s;
    write(RATINGS_KEY, ratings);
    return;
  }
  await supabase
    .from("ratings")
    .upsert(
      { burrito_id: burritoId, client_id: clientId(), score: s },
      { onConflict: "burrito_id,client_id" }
    );
}

/** Remove this browser's rating for a place. */
export async function clearMyRating(burritoId: string): Promise<void> {
  if (!supabase) {
    const ratings = read<Record<string, number>>(RATINGS_KEY, {});
    delete ratings[burritoId];
    write(RATINGS_KEY, ratings);
    return;
  }
  await supabase
    .from("ratings")
    .delete()
    .eq("burrito_id", burritoId)
    .eq("client_id", clientId());
}

/* ----------------------------- comments ----------------------------- */

export async function getComments(burritoId: string): Promise<UserComment[]> {
  if (!supabase) {
    return read<UserComment[]>(COMMENTS_KEY, []).filter(
      (c) => c.burritoId === burritoId
    );
  }
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at")
    .eq("burrito_id", burritoId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    burritoId,
    text: r.body as string,
    at: new Date(r.created_at as string).getTime(),
  }));
}

export async function addComment(
  burritoId: string,
  text: string
): Promise<UserComment | null> {
  const body = text.trim();
  if (!body) return null;
  if (!supabase) {
    const all = read<UserComment[]>(COMMENTS_KEY, []);
    const c: UserComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      burritoId,
      text: body,
      at: Date.now(),
    };
    all.push(c);
    write(COMMENTS_KEY, all);
    return c;
  }
  const { data } = await supabase
    .from("comments")
    .insert({ burrito_id: burritoId, body })
    .select("id, created_at")
    .single();
  return data
    ? {
        id: data.id as string,
        burritoId,
        text: body,
        at: new Date(data.created_at as string).getTime(),
      }
    : null;
}

/* --------------------- spot requests (shared, Supabase) --------------------- */

type NewRequest = Omit<SpotRequest, "id" | "at" | "mine">;

export async function getRequests(): Promise<SpotRequest[]> {
  if (!supabase) {
    return read<SpotRequest[]>(REQUESTS_KEY, []).map((r) => ({
      ...r,
      mine: true,
    }));
  }
  const { data } = await supabase
    .from("requests")
    .select("id, name, neighborhood, note, lat, lng, client_id, created_at")
    .order("created_at", { ascending: true });
  const me = clientId();
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    neighborhood: (r.neighborhood as string) ?? "",
    note: (r.note as string) ?? "",
    lat: Number(r.lat),
    lng: Number(r.lng),
    at: new Date(r.created_at as string).getTime(),
    mine: r.client_id === me,
  }));
}

export async function addRequest(r: NewRequest): Promise<SpotRequest | null> {
  if (!supabase) {
    const all = read<SpotRequest[]>(REQUESTS_KEY, []);
    const req: SpotRequest = {
      ...r,
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      mine: true,
    };
    all.push(req);
    write(REQUESTS_KEY, all);
    return req;
  }
  const { data } = await supabase
    .from("requests")
    .insert({
      name: r.name,
      neighborhood: r.neighborhood,
      note: r.note,
      lat: r.lat,
      lng: r.lng,
      client_id: clientId(),
    })
    .select("id, created_at")
    .single();
  return data
    ? {
        ...r,
        id: data.id as string,
        at: new Date(data.created_at as string).getTime(),
        mine: true,
      }
    : null;
}

export async function removeRequest(id: string): Promise<void> {
  if (!supabase) {
    write(
      REQUESTS_KEY,
      read<SpotRequest[]>(REQUESTS_KEY, []).filter((r) => r.id !== id)
    );
    return;
  }
  await supabase.from("requests").delete().eq("id", id);
}
