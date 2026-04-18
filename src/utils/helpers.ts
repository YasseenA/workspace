import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { Platform, Alert } from 'react-native';

type AlertButton = { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void };

// ─── Web toast / confirm ───────────────────────────────────────────────────

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('ws-alert-styles')) return;
  const s = document.createElement('style');
  s.id = 'ws-alert-styles';
  s.textContent = `
    @keyframes ws-slide-in  { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes ws-slide-out { from { opacity: 1; } to { opacity: 0; } }
    .ws-toast {
      position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%);
      background: #1e1b4b; color: #fff; border-radius: 14px;
      padding: 12px 20px; font-size: 14px; font-weight: 600;
      box-shadow: 0 8px 32px rgba(0,0,0,0.28); z-index: 99999;
      max-width: 360px; text-align: center; pointer-events: none;
      animation: ws-slide-in 0.22s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    .ws-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: ws-slide-in 0.18s ease;
    }
    .ws-dialog {
      background: #1e1e2e; border-radius: 20px; padding: 24px;
      max-width: 340px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .ws-dialog-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .ws-dialog-msg   { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.5; margin-bottom: 20px; }
    .ws-dialog-btns  { display: flex; gap: 8px; }
    .ws-btn {
      flex: 1; padding: 11px; border-radius: 12px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .ws-btn-cancel      { background: rgba(255,255,255,0.1); color: #fff; }
    .ws-btn-destructive { background: #ef4444; color: #fff; }
    .ws-btn-default     { background: #7c3aed; color: #fff; }
  `;
  document.head.appendChild(s);
}

function showWebToast(title: string, message?: string) {
  if (typeof document === 'undefined') return;
  injectStyles();
  const el = document.createElement('div');
  el.className = 'ws-toast';
  el.textContent = message ? `${title} — ${message}` : title;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'ws-slide-out 0.2s ease forwards';
    setTimeout(() => el.remove(), 200);
  }, 2800);
}

function showWebConfirm(title: string, message: string | undefined, buttons: AlertButton[]) {
  if (typeof document === 'undefined') return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'ws-overlay';

  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b.style !== 'cancel') ?? buttons[0];

  overlay.innerHTML = `
    <div class="ws-dialog">
      <div class="ws-dialog-title">${title}</div>
      ${message ? `<div class="ws-dialog-msg">${message}</div>` : ''}
      <div class="ws-dialog-btns">
        ${cancelBtn ? `<button class="ws-btn ws-btn-cancel" data-role="cancel">${cancelBtn.text}</button>` : ''}
        ${actionBtn ? `<button class="ws-btn ws-btn-${actionBtn.style === 'destructive' ? 'destructive' : 'default'}" data-role="action">${actionBtn.text}</button>` : ''}
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const role = target.getAttribute('data-role');
    if (role === 'cancel') { cancelBtn?.onPress?.(); close(); }
    else if (role === 'action') { actionBtn?.onPress?.(); close(); }
    else if (target === overlay) { cancelBtn?.onPress?.(); close(); }
  });

  document.body.appendChild(overlay);
}

// ─── Cross-platform showAlert ──────────────────────────────────────────────

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }
  const hasActions = (buttons || []).filter(b => b.style !== 'cancel').length > 0;
  const hasCancel  = (buttons || []).some(b => b.style === 'cancel');

  if (!hasActions && !hasCancel) {
    // Simple info toast — no buttons needed
    showWebToast(title, message);
    return;
  }
  if (hasActions && !hasCancel) {
    // Single action — toast + auto-trigger
    showWebToast(title, message);
    const btn = (buttons || []).find(b => b.style !== 'cancel');
    btn?.onPress?.();
    return;
  }
  // Confirm dialog
  showWebConfirm(title, message, buttons || []);
}

// ─── Formatting helpers ────────────────────────────────────────────────────

export const fmt = {
  date: (d: string | Date) => format(new Date(d), 'MMM d, yyyy'),
  time: (d: string | Date) => format(new Date(d), 'h:mm a'),
  relative: (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true }),
  dueDate: (d: string | Date | null) => {
    if (!d) return null;
    const date = new Date(typeof d === 'string' && !d.includes('T') ? d + 'T00:00:00' : d);
    if (isToday(date))    return { label: 'Due today',    color: '#f59e0b' };
    if (isTomorrow(date)) return { label: 'Due tomorrow', color: '#f97316' };
    if (isPast(date))     return { label: 'Overdue',      color: '#ef4444' };
    return { label: `Due ${fmt.date(date)}`, color: '#475569' };
  },
};

export const truncate     = (str: string, n: number) => str.length > n ? str.slice(0, n) + '...' : str;
export const wordCount    = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const initials     = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const priorityColor = (p: string) => ({ low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }[p] || '#94a3b8');
