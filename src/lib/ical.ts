import { Platform } from 'react-native';
import type { CanvasCourse, CanvasAssignment } from './canvas';

const PROXY = process.env.EXPO_PUBLIC_PROXY_URL || 'https://workspace-production-2fb5.up.railway.app';

// Unfold iCal line continuations (CRLF + space/tab = continued line)
function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function getField(event: string, key: string): string {
  const re = new RegExp(`^${key}(?:;[^:]*)?:([^\r\n]*)`, 'm');
  const m = event.match(re);
  if (!m) return '';
  return m[1].trim()
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseICalDate(raw: string): string | null {
  // Match datetime: 20240115T235900Z or 20240115T235900
  const m = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? 'Z' : ''}`;
  // Match date only: 20240115
  const d = raw.match(/(\d{4})(\d{2})(\d{2})/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}T23:59:00Z`;
  return null;
}

export function parseICal(icsText: string): { assignments: CanvasAssignment[]; courses: CanvasCourse[] } {
  const text = unfold(icsText);
  const blocks = text.split('BEGIN:VEVENT').slice(1);

  const courseMap = new Map<string, CanvasCourse>();
  let courseIdSeed = 90000;
  const assignments: CanvasAssignment[] = [];

  for (const block of blocks) {
    const summary     = getField(block, 'SUMMARY');
    const uid         = getField(block, 'UID');
    const url         = getField(block, 'URL');
    const description = getField(block, 'DESCRIPTION');

    // Only process assignment events
    const isAssignment = uid.includes('assignment') || url.includes('/assignments/');
    if (!isAssignment || !summary) continue;

    // Canvas iCal SUMMARY format: "Assignment Title [Course Code]"
    const courseMatch  = summary.match(/\[([^\]]+)\]$/);
    const courseName   = courseMatch ? courseMatch[1].trim() : 'My Course';
    const assignName   = summary.replace(/\s*\[[^\]]+\]$/, '').trim() || summary;

    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, {
        id: courseIdSeed++,
        name: courseName,
        course_code: courseName,
        start_at: '',
        end_at: '',
      });
    }
    const course = courseMap.get(courseName)!;

    // Extract numeric ID from UID or URL
    const idMatch = uid.match(/assignment-(\d+)/) || url.match(/\/assignments\/(\d+)/);
    const id = idMatch ? parseInt(idMatch[1]) : (courseIdSeed++);

    // Parse due date — try DTSTART then DTDUE
    const dtRaw = getField(block, 'DTSTART') || getField(block, 'DUE') || '';
    const due_at = parseICalDate(dtRaw);

    assignments.push({
      id,
      course_id: course.id,
      name: assignName,
      description,
      due_at,
      points_possible: 0,
      html_url: url || '',
      submission_types: [],
    });
  }

  return {
    assignments,
    courses: Array.from(courseMap.values()),
  };
}

export async function fetchAndParseICal(feedUrl: string): Promise<{ assignments: CanvasAssignment[]; courses: CanvasCourse[] }> {
  // webcal:// is identical to https:// — browsers/proxies need the swap
  const normalizedUrl = feedUrl.trim().replace(/^webcal:\/\//i, 'https://');

  const url = Platform.OS === 'web'
    ? `${PROXY}/ical?url=${encodeURIComponent(normalizedUrl)}`
    : normalizedUrl;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e: any) {
    throw new Error('Could not reach the calendar server. Check your internet connection and try again.');
  }
  if (!res.ok) throw new Error(`Could not fetch your calendar feed (${res.status}). Make sure the URL is correct.`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('That doesn\'t look like a valid Canvas calendar feed URL. Copy it directly from Canvas → Calendar → calendar feed icon.');
  return parseICal(text);
}
