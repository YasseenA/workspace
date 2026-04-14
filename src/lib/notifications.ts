/**
 * Web Notification API wrapper.
 * Fires "due soon" reminders at two windows: ~24h and ~3h before due.
 * Supports Canvas assignments, Teams assignments, and tasks.
 */

const NOTIFIED_KEY = 'notified_ids_v2';
const ICON = '/icon-192.png';

function loadNotified(): Set<string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(NOTIFIED_KEY) : null;
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveNotified(set: Set<string>) {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch {}
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  return Notification.requestPermission();
}

export function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function fire(title: string, body: string, tag: string) {
  if (!canNotify()) return;
  try {
    new Notification(title, { body, tag, icon: ICON, silent: false });
  } catch {}
}

export interface DueSoonItem {
  id: string;
  title: string;
  dueAt: Date;
  kind: 'assignment' | 'task' | 'teams';
  courseName?: string;
}

const WINDOWS = [
  { ms: 25 * 60 * 60 * 1000, suffix: '24h' }, // ~24 hours
  { ms:  4 * 60 * 60 * 1000, suffix: '3h'  }, // ~3 hours
];

function kindLabel(kind: DueSoonItem['kind'], courseName?: string): string {
  if (kind === 'teams')      return courseName ? `Teams · ${courseName}` : 'Teams';
  if (kind === 'assignment') return courseName ? `Canvas · ${courseName}` : 'Canvas';
  return 'Task';
}

/**
 * Fire notifications for items at two windows (24h and 3h).
 * Each item fires at most once per window per day (de-duped by id+suffix).
 */
export function notifyDueSoon(items: DueSoonItem[]) {
  if (!canNotify()) return;

  const now     = Date.now();
  const notified = loadNotified();
  let   changed  = false;

  for (const item of items) {
    const diff = item.dueAt.getTime() - now;
    if (diff <= 0) continue; // already past due

    for (const { ms, suffix } of WINDOWS) {
      if (diff > ms) continue;              // not yet in this window
      const key = `${item.id}-${suffix}`;
      if (notified.has(key)) continue;      // already fired for this window

      const hours = Math.round(diff / (60 * 60 * 1000));
      const mins  = Math.round(diff / 60000);
      const when  = hours === 0 ? `Due in ${mins}m`
                  : hours === 1 ? 'Due in 1 hour'
                  : `Due in ${hours} hours`;

      fire(
        `📅 ${item.title}`,
        `${when} — ${kindLabel(item.kind, item.courseName)}`,
        `ws-${key}`,
      );

      notified.add(key);
      changed = true;
    }
  }

  if (changed) saveNotified(notified);
}

/** Notify about overdue items (fires once per item per day) */
export function notifyOverdue(items: DueSoonItem[]) {
  if (!canNotify()) return;

  const now      = Date.now();
  const today    = new Date().toDateString();
  const notified = loadNotified();
  let   changed  = false;

  for (const item of items) {
    if (item.dueAt.getTime() >= now) continue; // not overdue
    const key = `overdue-${item.id}-${today}`;
    if (notified.has(key)) continue;

    fire(
      `⚠️ Overdue: ${item.title}`,
      `Was due ${item.dueAt.toLocaleDateString()} — ${kindLabel(item.kind, item.courseName)}`,
      `ws-${key}`,
    );

    notified.add(key);
    changed = true;
  }

  if (changed) saveNotified(notified);
}

export function clearNotifiedLog() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(NOTIFIED_KEY);
  } catch {}
}

/** Fire a single test notification */
export function fireTestNotification() {
  fire('🔔 Workspace Notifications', 'Due-soon reminders are working!', 'ws-test');
}
