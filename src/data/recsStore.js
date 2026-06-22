// Travel-recommendation store. Uses Supabase (shared, everyone sees everyone's
// pins) when keys are configured in portfolio.js; otherwise falls back to
// localStorage (each visitor only sees their own pins).
import { SUPABASE } from "./portfolio";

const LOCAL_KEY = "kb-travel-recs";
const TABLE = "travel_recs";

export const isShared = Boolean(SUPABASE.url && SUPABASE.anonKey);

function headers() {
  return {
    apikey: SUPABASE.anonKey,
    Authorization: `Bearer ${SUPABASE.anonKey}`,
    "Content-Type": "application/json",
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, 200) : [];
  } catch {
    return [];
  }
}

function saveLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

// Returns an array of { name, lat, lng }.
export async function fetchRecs() {
  if (!isShared) return loadLocal();
  try {
    const res = await fetch(
      `${SUPABASE.url}/rest/v1/${TABLE}?select=name,lat,lng&order=created_at.desc&limit=300`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn("Falling back to local recs:", err.message);
    return loadLocal();
  }
}

// Adds one pin. Returns the full updated list.
export async function addRec(rec) {
  const clean = {
    name: String(rec.name || "").slice(0, 80),
    lat: Number(rec.lat),
    lng: Number(rec.lng),
  };
  if (!clean.name || Number.isNaN(clean.lat) || Number.isNaN(clean.lng)) {
    return await fetchRecs();
  }

  if (!isShared) {
    const next = [...loadLocal(), clean].slice(0, 200);
    saveLocal(next);
    return next;
  }

  try {
    const res = await fetch(`${SUPABASE.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify(clean),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.warn("Shared add failed, saving locally:", err.message);
    const next = [...loadLocal(), clean].slice(0, 200);
    saveLocal(next);
    return next;
  }
  return await fetchRecs();
}

// Clears only the local-browser pins. (Shared pins can't be cleared by visitors.)
export function clearLocal() {
  saveLocal([]);
  return [];
}
