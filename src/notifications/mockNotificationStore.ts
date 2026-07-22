export interface Notification {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Gleiche Mock-Einschraenkung wie der Rest (localStorage, kein echtes
// Backend) - Jonas' Vorgabe 2026-07-23: alle Verkaeufer sollen bei einer
// Kunden-Neuregistrierung eine Nachricht bekommen.
const KEY = "ssk_notifications";

function load(): Notification[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Notification[];
  } catch {
    return [];
  }
}

function save(list: Notification[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function notifyUsers(userIds: string[], message: string) {
  if (userIds.length === 0) return;
  const list = load();
  const now = new Date().toISOString();
  for (const userId of userIds) {
    list.push({ id: crypto.randomUUID(), userId, message, createdAt: now, read: false });
  }
  save(list);
}

export function listNotificationsFor(userId: string): Notification[] {
  return load()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCountFor(userId: string): number {
  return load().filter((n) => n.userId === userId && !n.read).length;
}

export function markAllReadFor(userId: string) {
  const list = load();
  let changed = false;
  for (const n of list) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) save(list);
}
