/**
 * Storage interface for user ratings + comments.
 * v1 backs onto localStorage; swap this file for a real backend later
 * without touching any component.
 */

export interface UserComment {
  id: string;
  burritoId: string;
  text: string;
  at: number; // epoch ms
}

export interface SpotRequest {
  id: string;
  name: string;
  neighborhood: string;
  note: string;
  lat: number;
  lng: number;
  at: number;
}

const RATINGS_KEY = "bbc-ratings";
const COMMENTS_KEY = "bbc-comments";
const REQUESTS_KEY = "bbc-requests";

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
    // storage full or blocked; ratings just won't persist
  }
}

export function getRatings(): Record<string, number> {
  return read<Record<string, number>>(RATINGS_KEY, {});
}

export function addRating(burritoId: string, rating: number) {
  const ratings = getRatings();
  ratings[burritoId] = Math.max(0, Math.min(10, rating));
  write(RATINGS_KEY, ratings);
}

export function getComments(burritoId: string): UserComment[] {
  const all = read<UserComment[]>(COMMENTS_KEY, []);
  return all.filter((c) => c.burritoId === burritoId);
}

export function addComment(burritoId: string, text: string): UserComment {
  const all = read<UserComment[]>(COMMENTS_KEY, []);
  const comment: UserComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    burritoId,
    text: text.trim(),
    at: Date.now(),
  };
  all.push(comment);
  write(COMMENTS_KEY, all);
  return comment;
}

/** Spots users want fluffie to review next. Persisted locally for v1. */
export function getRequests(): SpotRequest[] {
  return read<SpotRequest[]>(REQUESTS_KEY, []);
}

export function removeRequest(id: string) {
  write(
    REQUESTS_KEY,
    read<SpotRequest[]>(REQUESTS_KEY, []).filter((r) => r.id !== id)
  );
}

export function addRequest(
  r: Omit<SpotRequest, "id" | "at">
): SpotRequest {
  const all = read<SpotRequest[]>(REQUESTS_KEY, []);
  const request: SpotRequest = {
    ...r,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
  all.push(request);
  write(REQUESTS_KEY, all);
  return request;
}
