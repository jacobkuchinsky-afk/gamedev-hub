import { db, doc, getDoc, setDoc } from "./firebase";
import { getCurrentUser } from "./auth";

const COLLECTIONS = [
  "gameforge_projects",
  "gameforge_tasks",
  "gameforge_bugs",
  "gameforge_devlog",
  "gameforge_assets",
  "gameforge_playtest",
  "gameforge_sessions",
  "gameforge_references",
  "gameforge_changelog",
  "gameforge_sprints",
  "gameforge_milestones",
] as const;

type CollectionName = (typeof COLLECTIONS)[number];

function getUid(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

function scopedKey(baseKey: string): string {
  const uid = getUid();
  if (!uid) return baseKey;
  return `${uid}__${baseKey}`;
}

export function scopedGet<T>(baseKey: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  const key = scopedKey(baseKey);
  const raw = localStorage.getItem(key);
  if (!raw) {
    const unscopedRaw = localStorage.getItem(baseKey);
    if (unscopedRaw && getUid()) {
      localStorage.setItem(key, unscopedRaw);
      return JSON.parse(unscopedRaw);
    }
    return fallback;
  }
  return JSON.parse(raw);
}

export function scopedSave<T>(baseKey: string, data: T[]): void {
  if (typeof window === "undefined") return;
  const key = scopedKey(baseKey);
  localStorage.setItem(key, JSON.stringify(data));
  debouncedSync(baseKey, data);
}

const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function debouncedSync<T>(baseKey: string, data: T[]) {
  if (syncTimers[baseKey]) clearTimeout(syncTimers[baseKey]);
  syncTimers[baseKey] = setTimeout(() => {
    syncToFirestore(baseKey, data).catch(() => {});
  }, 2000);
}

async function syncToFirestore<T>(baseKey: string, data: T[]) {
  const uid = getUid();
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid, "data", baseKey);
    await setDoc(ref, { items: data, updated_at: new Date().toISOString() });
  } catch (err) {
    console.warn(`[db] Firestore sync failed for ${baseKey}:`, err);
  }
}

export async function pullFromFirestore(baseKey: string): Promise<unknown[] | null> {
  const uid = getUid();
  if (!uid) return null;
  try {
    const ref = doc(db, "users", uid, "data", baseKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return data.items ?? null;
    }
  } catch (err) {
    console.warn(`[db] Firestore pull failed for ${baseKey}:`, err);
  }
  return null;
}

export async function syncAllOnLogin(): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  for (const collection of COLLECTIONS) {
    try {
      const key = `${uid}__${collection}`;
      const localRaw = localStorage.getItem(key);

      const remoteData = await pullFromFirestore(collection);

      if (remoteData && remoteData.length > 0) {
        if (!localRaw || JSON.parse(localRaw).length === 0) {
          localStorage.setItem(key, JSON.stringify(remoteData));
        }
      } else if (localRaw) {
        const localData = JSON.parse(localRaw);
        if (localData.length > 0) {
          await syncToFirestore(collection, localData);
        }
      }
    } catch (err) {
      console.warn(`[db] Sync failed for ${collection}:`, err);
    }
  }
}

export async function pushAllToFirestore(): Promise<void> {
  const uid = getUid();
  if (!uid) return;

  for (const collection of COLLECTIONS) {
    try {
      const key = `${uid}__${collection}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        await syncToFirestore(collection, data);
      }
    } catch (err) {
      console.warn(`[db] Push failed for ${collection}:`, err);
    }
  }
}
