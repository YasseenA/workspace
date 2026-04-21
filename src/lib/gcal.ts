import { Platform } from 'react-native';

const PROXY = process.env.EXPO_PUBLIC_PROXY_URL || 'https://workspace-production-2fb5.up.railway.app';

export interface GCalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  color: string;
}

function parseICalDate(val: string): Date {
  if (val.includes('T')) {
    const clean = val.replace(/[^0-9T]/g, '');
    const y = clean.slice(0, 4), m = clean.slice(4, 6), d = clean.slice(6, 8);
    const h = clean.slice(9, 11), mi = clean.slice(11, 13), s = clean.slice(13, 15);
    return new Date(`${y}-${m}-${d}T${h}:${mi}:${s}Z`);
  }
  const y = val.slice(0, 4), m = val.slice(4, 6), d = val.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

export async function fetchGoogleCalendar(feedUrl: string): Promise<GCalEvent[]> {
  const url = `${PROXY}/ical?url=${encodeURIComponent(feedUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch calendar');
  const text = await res.text();

  const events: GCalEvent[] = [];
  const blocks = text.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const get = (key: string): string => {
      const re = new RegExp(`^${key}[;:](.*)$`, 'im');
      const match = block.match(re);
      return match ? match[1].trim() : '';
    };

    const uid = get('UID') || `gcal-${i}`;
    const summary = get('SUMMARY');
    if (!summary) continue;

    const dtStart = get('DTSTART');
    const dtEnd = get('DTEND');
    if (!dtStart) continue;

    const start = parseICalDate(dtStart);
    const end = dtEnd ? parseICalDate(dtEnd) : start;
    const allDay = !dtStart.includes('T');

    events.push({
      id: uid,
      title: summary,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      location: get('LOCATION') || undefined,
      description: get('DESCRIPTION') || undefined,
      color: '#4285f4',
    });
  }

  return events;
}
