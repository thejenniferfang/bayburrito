import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null when unconfigured; storage.ts falls back to localStorage
export const supabase = url && key ? createClient(url, key) : null;
