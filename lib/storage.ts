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

const RATINGS_KEY = "bbc-ratings";
const COMMENTS_KEY = "bbc-comments";

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
