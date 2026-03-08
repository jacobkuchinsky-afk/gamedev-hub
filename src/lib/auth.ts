import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "./firebase";

export interface User {
  id: string;
  username: string;
  email: string;
  gameType: string;
  avatar_url: string | null;
  created_at: string;
}

const SESSION_KEY = "gameforge_session";
const PROFILE_KEY = "gameforge_profile";

function saveProfile(uid: string, data: { username: string; gameType: string }) {
  const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  profiles[uid] = data;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function getProfile(uid: string): { username: string; gameType: string } | null {
  const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  return profiles[uid] || null;
}

function firebaseUserToUser(fbUser: { uid: string; email: string | null; displayName: string | null }): User {
  const profile = getProfile(fbUser.uid);
  return {
    id: fbUser.uid,
    username: profile?.username || fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    email: fbUser.email || "",
    gameType: profile?.gameType || "2D",
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
}

export async function signup(
  username: string,
  email: string,
  password: string,
  gameType: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    saveProfile(cred.user.uid, { username, gameType });
    const user = firebaseUserToUser(cred.user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signup failed";
    if (msg.includes("auth/email-already-in-use")) {
      return { success: false, error: "An account with this email already exists." };
    }
    if (msg.includes("auth/weak-password")) {
      return { success: false, error: "Password must be at least 6 characters." };
    }
    if (msg.includes("auth/configuration-not-found") || msg.includes("auth/invalid-api-key")) {
      return fallbackSignup(username, email, password, gameType);
    }
    return { success: false, error: msg };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = firebaseUserToUser(cred.user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Login failed";
    if (msg.includes("auth/invalid-credential") || msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password")) {
      return { success: false, error: "Invalid email or password." };
    }
    if (msg.includes("auth/configuration-not-found") || msg.includes("auth/invalid-api-key")) {
      return fallbackLogin(email, password);
    }
    return { success: false, error: msg };
  }
}

export async function logout() {
  try {
    await firebaseSignOut(auth);
  } catch {
    // ignore
  }
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// --- localStorage fallback for when Firebase Auth is not configured ---
const USERS_KEY = "gameforge_users";
const SEED_USERS: (User & { password: string })[] = [
  {
    id: "user_001",
    username: "JacobK",
    email: "jacob.kuchinsky@alpha.scool",
    gameType: "2D",
    avatar_url: null,
    created_at: "2026-01-15T08:00:00Z",
    password: "constellar2026",
  },
];

function getStoredUsers(): (User & { password: string })[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return [...SEED_USERS];
  }
  return JSON.parse(raw);
}

function fallbackSignup(
  username: string,
  email: string,
  password: string,
  gameType: string
): { success: boolean; error?: string; user?: User } {
  console.log("[auth] Firebase unavailable, using localStorage fallback");
  const users = getStoredUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: "An account with this email already exists." };
  }
  const newUser: User & { password: string } = {
    id: `user_${Date.now()}`,
    username,
    email,
    gameType,
    avatar_url: null,
    created_at: new Date().toISOString(),
    password,
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const { password: _, ...u } = newUser;
  localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  return { success: true, user: u };
}

function fallbackLogin(
  email: string,
  password: string
): { success: boolean; error?: string; user?: User } {
  console.log("[auth] Firebase unavailable, using localStorage fallback");
  const users = getStoredUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!found) return { success: false, error: "Invalid email or password." };
  const { password: _, ...u } = found;
  localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  return { success: true, user: u };
}
