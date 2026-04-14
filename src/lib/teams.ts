import { Platform } from 'react-native';

const CLIENT_ID    = process.env.EXPO_PUBLIC_TEAMS_CLIENT_ID || '';
const REDIRECT_URI = 'https://workspace-edu.com/teams-callback';
const GRAPH_BASE   = 'https://graph.microsoft.com/v1.0';
const SCOPES       = 'EduAssignments.ReadBasic EduRoster.ReadBasic User.Read offline_access openid profile';

// ── PKCE helpers ────────────────────────────────────────────────────────────

function randomString(len: number) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256Base64Url(plain: string) {
  const encoded = new TextEncoder().encode(plain);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getLoginUrl(): Promise<string> {
  const verifier  = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  sessionStorage.setItem('teams_pkce_verifier', verifier);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPES,
    response_mode:         'query',
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    prompt:                'select_account',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string }> {
  const verifier = sessionStorage.getItem('teams_pkce_verifier') || '';
  sessionStorage.removeItem('teams_pkce_verifier');

  const body = new URLSearchParams({
    client_id:     CLIENT_ID,
    grant_type:    'authorization_code',
    code,
    redirect_uri:  REDIRECT_URI,
    code_verifier: verifier,
    scope:         SCOPES,
  });

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || 'Microsoft sign-in failed. Please try again.');
  }
  return res.json();
}

// ── Graph API helpers ────────────────────────────────────────────────────────

async function graphGet(token: string, path: string) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Graph API error ${res.status}`);
  }
  return res.json();
}

export interface TeamsClass {
  id: string;
  displayName: string;
  description?: string;
  courseCode?: string;
}

export interface TeamsAssignment {
  id: string;
  classId: string;
  className: string;
  displayName: string;
  dueDateTime: string | null;
  status: string;
  points: number | null;
  webUrl: string;
}

export async function getClasses(token: string): Promise<TeamsClass[]> {
  const data = await graphGet(token, '/education/me/classes?$top=50');
  return (data.value || []).map((c: any) => ({
    id:          c.id,
    displayName: c.displayName,
    description: c.description,
    courseCode:  c.courseNumber || c.externalId || '',
  }));
}

export async function getAssignmentsForClass(token: string, classId: string, className: string): Promise<TeamsAssignment[]> {
  try {
    const data = await graphGet(token, `/education/classes/${classId}/assignments?$top=100&$orderby=dueDateTime`);
    return (data.value || []).map((a: any) => ({
      id:          a.id,
      classId,
      className,
      displayName: a.displayName,
      dueDateTime: a.dueDateTime || null,
      status:      a.status || 'assigned',
      points:      a.grading?.maxPoints ?? null,
      webUrl:      a.webUrl || '',
    }));
  } catch {
    return [];
  }
}

export async function getAllAssignments(token: string, classes: TeamsClass[]): Promise<TeamsAssignment[]> {
  const results = await Promise.all(
    classes.map(c => getAssignmentsForClass(token, c.id, c.displayName))
  );
  return results.flat();
}
