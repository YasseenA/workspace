import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';

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
