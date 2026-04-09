import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { Platform, Alert } from 'react-native';

type AlertButton = { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void };

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }
  const nonCancel = (buttons || []).filter(b => b.style !== 'cancel');
  if (nonCancel.length <= 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    nonCancel[0]?.onPress?.();
    return;
  }
  const ok = window.confirm(message ? `${title}\n\n${message}` : title);
  if (ok) {
    const btn = buttons!.find(b => b.style === 'destructive') ?? nonCancel[0];
    btn?.onPress?.();
  }
}

export const fmt = {
  date: (d: string | Date) => format(new Date(d), 'MMM d, yyyy'),
  time: (d: string | Date) => format(new Date(d), 'h:mm a'),
  relative: (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true }),
  dueDate: (d: string | Date | null) => {
    if (!d) return null;
    const date = new Date(d);
    if (isPast(date)) return { label: 'Overdue', color: '#ef4444' };
    if (isToday(date)) return { label: 'Due today', color: '#f59e0b' };
    if (isTomorrow(date)) return { label: 'Due tomorrow', color: '#f97316' };
    return { label: `Due ${fmt.date(date)}`, color: '#475569' };
  },
};

export const truncate = (str: string, n: number) => str.length > n ? str.slice(0, n) + '...' : str;
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const priorityColor = (p: string) => ({ low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }[p] || '#94a3b8');
