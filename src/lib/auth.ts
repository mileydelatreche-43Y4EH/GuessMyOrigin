export type AuthProvider = "google" | "microsoft" | "email";

export interface Session {
  name: string;
  email?: string;
  provider: AuthProvider;
}

const SESSION_KEY = "guessmyorigin_session";
const USERS_KEY = "guessmyorigin_users";

type StoredUser = { email: string; password: string; name: string };

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("guessmyorigin_name", session.name);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function loginSocial(provider: AuthProvider, name: string): Session {
  const session: Session = {
    name: name.trim().slice(0, 16) || "Player",
    provider,
  };
  saveSession(session);
  return session;
}

export function signupEmail(
  email: string,
  password: string,
  name: string
): { ok: true; session: Session } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  const n = name.trim().slice(0, 16);
  if (!e || !e.includes("@")) return { ok: false, error: "Email invalide" };
  if (password.length < 4) return { ok: false, error: "Mot de passe trop court" };
  if (!n) return { ok: false, error: "Choisis un pseudo" };

  const users = readUsers();
  if (users.some((u) => u.email === e)) {
    return { ok: false, error: "Compte déjà existant — LOG IN" };
  }
  users.push({ email: e, password, name: n });
  writeUsers(users);
  const session: Session = { name: n, email: e, provider: "email" };
  saveSession(session);
  return { ok: true, session };
}

export function loginEmail(
  email: string,
  password: string
): { ok: true; session: Session } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === e && u.password === password);
  if (!user) return { ok: false, error: "Email ou mot de passe incorrect" };
  const session: Session = {
    name: user.name,
    email: user.email,
    provider: "email",
  };
  saveSession(session);
  return { ok: true, session };
}
