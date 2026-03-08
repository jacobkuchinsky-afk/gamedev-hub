export interface User {
  id: string;
  username: string;
  email: string;
  gameType: string;
  avatar_url: string | null;
  created_at: string;
}

const USERS_KEY = "gameforge_users";
const SESSION_KEY = "gameforge_session";

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
  {
    id: "user_002",
    username: "PixelWitch",
    email: "pixelwitch@gamedev.io",
    gameType: "2D",
    avatar_url: null,
    created_at: "2026-02-01T12:00:00Z",
    password: "sprites4ever",
  },
  {
    id: "user_003",
    username: "VoxelKing",
    email: "voxelking@gamedev.io",
    gameType: "3D",
    avatar_url: null,
    created_at: "2026-02-10T09:30:00Z",
    password: "cubecraft99",
  },
];

function getStoredUsers(): (User & { password: string })[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return [...SEED_USERS];
  }
  return JSON.parse(raw);
}

function saveUsers(users: (User & { password: string })[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signup(
  username: string,
  email: string,
  password: string,
  gameType: string
): { success: boolean; error?: string; user?: User } {
  const users = getStoredUsers();

  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: "An account with this email already exists." };
  }

  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: "This username is already taken." };
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
  saveUsers(users);

  const { password: _, ...userWithoutPassword } = newUser;
  localStorage.setItem(SESSION_KEY, JSON.stringify(userWithoutPassword));

  return { success: true, user: userWithoutPassword };
}

export function login(
  email: string,
  password: string
): { success: boolean; error?: string; user?: User } {
  const users = getStoredUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!found) {
    return { success: false, error: "Invalid email or password." };
  }

  const { password: _, ...userWithoutPassword } = found;
  localStorage.setItem(SESSION_KEY, JSON.stringify(userWithoutPassword));

  return { success: true, user: userWithoutPassword };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}
