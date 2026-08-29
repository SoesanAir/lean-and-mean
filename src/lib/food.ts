// Lean & Mean — food photo log (spec §19).
//
// This is the app's ONLY Supabase-backed feature: photos + entries live in the
// cloud (private `food-photos` bucket + `food_entries` table, RLS owner-only),
// NOT in the localStorage store. Auth is anonymous sign-in on first use —
// supabase-js persists the session in localStorage so the device keeps its user.

import type { FoodEntry } from "./types";
import { getSupabase } from "./supabase";

export type MealType = NonNullable<FoodEntry["mealType"]>;

/** Typed error for all food-log failures; message is human-readable. */
export class FoodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FoodError";
  }
}

const BUCKET = "food-photos";
const TABLE = "food_entries";

// ---------- row mapping (DB snake_case → domain camelCase) ----------

interface FoodRow {
  id: string;
  ts: string;
  description: string | null;
  protein_g: number | null;
  calories: number | null;
  meal_type: string | null;
  photo_path: string | null;
}

function rowToEntry(row: FoodRow): FoodEntry {
  return {
    id: row.id,
    timestamp: row.ts,
    description: row.description ?? undefined,
    proteinG: row.protein_g ?? undefined,
    calories: row.calories ?? undefined,
    mealType: (row.meal_type as MealType | null) ?? undefined,
    photoPath: row.photo_path ?? undefined,
  };
}

// ---------- session ----------

/**
 * Returns the signed-in Supabase user id. The app is gated behind
 * email/password auth (AuthGate), so a session always exists in normal use.
 * Null when Supabase is unconfigured, we're not in a browser, or signed out.
 */
export async function ensureSession(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

async function requireSession(): Promise<{ userId: string; supabase: NonNullable<ReturnType<typeof getSupabase>> }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new FoodError("Cloud connection is not configured — check .env.local.");
  }
  const userId = await ensureSession();
  if (!userId) throw new FoodError("Cloud sign-in failed — try again.");
  return { userId, supabase };
}

// ---------- photo downscaling (client-side, canvas) ----------

/**
 * Downscale to max 1280px long edge, JPEG q0.8.
 * Falls back to the original file when the image can't be decoded (e.g. HEIC
 * on an unsupported browser) or the canvas encode fails.
 */
async function downscalePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8),
      );
      return blob ?? file;
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}

// ---------- CRUD ----------

export interface AddFoodInput {
  file?: File;
  description?: string;
  proteinG?: number;
  calories?: number;
  mealType?: MealType;
  /** ISO timestamp; defaults to now */
  ts?: string;
}

export async function addFoodEntry(input: AddFoodInput): Promise<FoodEntry> {
  const { userId, supabase } = await requireSession();

  let photoPath: string | null = null;
  if (input.file) {
    const blob = await downscalePhoto(input.file);
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw new FoodError(`Photo upload failed: ${error.message}`);
    photoPath = path;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ts: input.ts ?? new Date().toISOString(),
      description: input.description?.trim() || null,
      protein_g: input.proteinG ?? null,
      calories: input.calories ?? null,
      meal_type: input.mealType ?? null,
      photo_path: photoPath,
    })
    .select()
    .single();
  if (error || !data) {
    throw new FoodError(`Saving the meal failed: ${error?.message ?? "no row returned"}`);
  }
  return rowToEntry(data as FoodRow);
}

/** Entries whose ts falls on the given LOCAL date (YYYY-MM-DD), ordered by ts. */
export async function listFoodEntries(date: string): Promise<FoodEntry[]> {
  const { supabase } = await requireSession();

  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(y, m - 1, d); // local midnight
  const end = new Date(y, m - 1, d + 1);

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .gte("ts", start.toISOString())
    .lt("ts", end.toISOString())
    .order("ts", { ascending: true });
  if (error) throw new FoodError(`Loading meals failed: ${error.message}`);
  return ((data ?? []) as FoodRow[]).map(rowToEntry);
}

/** Signed URL for a private photo (1h); null on any error. */
export async function getPhotoUrl(path: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function deleteFoodEntry(id: string, photoPath?: string): Promise<void> {
  const { supabase } = await requireSession();

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new FoodError(`Deleting the meal failed: ${error.message}`);

  if (photoPath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([photoPath]);
    if (storageError) {
      throw new FoodError(`Meal deleted, but removing its photo failed: ${storageError.message}`);
    }
  }
}
