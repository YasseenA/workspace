/**
 * Web Notification API wrapper.
 * Schedules "due soon" reminders for assignments and tasks.
 * Tracks already-notified IDs in localStorage so we don't spam on every page load.
 */

const NOTIFIED_KEY = 'notified_ids';
const ICON = '/icon.png'; // public asset — fine to 404, just cosmetic

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
  kind: 'assignment' | 'task';
}

/**
 * Fire notifications for items due within the next 26 hours.
 * De-duped by ID so each item only notifies once per day.
 */
export function notifyDueSoon(items: DueSoonItem[]) {
  if (!canNotify()) return;

  const now       = Date.now();
  const window_ms = 26 * 60 * 60 * 1000; // 26h window
  const notified  = loadNotified();
  let   changed   = false;

  for (const item of items) {
    const diff = item.dueAt.getTime() - now;
    if (diff <= 0 || diff > window_ms) continue;
    if (notified.has(item.id))          continue;

    const hours = Math.round(diff / (60 * 60 * 1000));
    const when  = hours === 0 ? 'Due today'
                : hours === 1 ? 'Due in 1 hour'
                : `Due in ${hours} hours`;

    fire(
      `📅 ${item.title}`,
      `${when} — ${item.kind === 'assignment' ? 'Canvas Assignment' : 'Task'}`,
      `ws-due-${item.id}`,
    );

    notified.add(item.id);
    changed = true;
  }

  if (changed) saveNotified(notified);
}

/** Clear the notified-IDs log (call daily or on manual reset) */
export function clearNotifiedLog() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(NOTIFIED_KEY);
  } catch {}
}
