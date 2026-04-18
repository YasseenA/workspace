import { Platform } from 'react-native';

const CLIENT_ID = process.env.EXPO_PUBLIC_CANVAS_CLIENT_ID || '';
const PROXY = process.env.EXPO_PUBLIC_PROXY_URL || 'https://workspace-production-2fb5.up.railway.app';

// Set by auth store when user profile loads — avoids reading from localStorage
let _canvasBase = '';
export function setCanvasBase(url: string) { _canvasBase = url; }

function getBase(): string {
  // On web always go through proxy; proxy uses X-Canvas-Base header to forward to correct school
  if (Platform.OS === 'web') return PROXY;
  return _canvasBase || '';
}

function schoolHeaders(extra: Record<string, string> = {}): Record<string, string> {
  if (!_canvasBase) return extra;
  return { ...extra, 'X-Canvas-Base': _canvasBase };
}

export const canvas = {
  getAuthUrl: () => {
    const base = getBase();
    return `${base}/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=workspace://canvas/callback&scope=url:GET|/api/v1/courses`;
  },

  getToken: async (code: string) => {
    const res = await fetch(`${getBase()}/login/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...schoolHeaders() },
      body: JSON.stringify({ client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: 'workspace://canvas/callback' }),
    });
    if (!res.ok) throw new Error('Canvas auth failed');
    return res.json();
  },

  getCourses: async (token: string) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses?enrollment_state=active&per_page=50&include[]=total_scores&include[]=current_grading_period_scores`,
      { headers: { Authorization: `Bearer ${token}`, ...schoolHeaders() } }
    );
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (!res.ok) throw new Error('Failed to fetch courses');
    return res.json();
  },

  getAssignments: async (token: string, courseId: string | number) => {
    const res = await fetch(`${getBase()}/api/v1/courses/${courseId}/assignments?per_page=50&order_by=due_at`, { headers: { Authorization: `Bearer ${token}`, ...schoolHeaders() } });
    if (!res.ok) throw new Error('Failed to fetch assignments');
    return res.json();
  },

  getAnnouncements: async (token: string, courseId: string | number) => {
    const res = await fetch(`${getBase()}/api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=20`, { headers: { Authorization: `Bearer ${token}`, ...schoolHeaders() } });
    if (!res.ok) throw new Error('Failed to fetch announcements');
    return res.json();
  },

  getAllAssignments: async (token: string, courseIds: (string | number)[]) => {
    const results = await Promise.all(courseIds.map(id => canvas.getAssignments(token, id).catch(() => [])));
    return results.flat();
  },

  getSubmissions: async (token: string, courseId: string | number) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100`,
      { headers: { Authorization: `Bearer ${token}`, ...schoolHeaders() } }
    );
    if (!res.ok) return [];
    return res.json();
  },

  getAllSubmissions: async (token: string, courseIds: (string | number)[]) => {
    const results = await Promise.all(courseIds.map(id => canvas.getSubmissions(token, id).catch(() => [])));
    return results.flat();
  },

  submitTextEntry: async (token: string, courseId: number, assignmentId: number, text: string) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...schoolHeaders() },
        body: JSON.stringify({ submission: { submission_type: 'online_text_entry', body: text } }),
      }
    );
    if (!res.ok) throw new Error(`Submission failed (${res.status})`);
    return res.json();
  },

  submitUrl: async (token: string, courseId: number, assignmentId: number, url: string) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...schoolHeaders() },
        body: JSON.stringify({ submission: { submission_type: 'online_url', url } }),
      }
    );
    if (!res.ok) throw new Error(`Submission failed (${res.status})`);
    return res.json();
  },

  // Step 1: request upload slot
  requestFileUpload: async (token: string, courseId: number, assignmentId: number, name: string, size: number, contentType: string) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...schoolHeaders() },
        body: JSON.stringify({ name, size, content_type: contentType }),
      }
    );
    if (!res.ok) throw new Error(`Upload request failed (${res.status})`);
    return res.json(); // { upload_url, upload_params, file_param }
  },

  // Step 2: upload file to returned URL (no auth header — Canvas handles it)
  uploadFile: async (uploadUrl: string, uploadParams: Record<string, string>, fileParam: string, file: File): Promise<number> => {
    const form = new FormData();
    Object.entries(uploadParams).forEach(([k, v]) => form.append(k, v));
    form.append(fileParam, file);
    const res = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`File upload failed (${res.status})`);
    const data = await res.json();
    return data.id as number;
  },

  // Step 3: submit with file id
  submitFile: async (token: string, courseId: number, assignmentId: number, fileId: number) => {
    const res = await fetch(
      `${getBase()}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...schoolHeaders() },
        body: JSON.stringify({ submission: { submission_type: 'online_upload', file_ids: [fileId] } }),
      }
    );
    if (!res.ok) throw new Error(`Submission failed (${res.status})`);
    return res.json();
  },
};

export interface CanvasCourseEnrollment {
  computed_current_score: number | null;
  computed_final_score:   number | null;
  computed_current_grade: string | null;
  computed_final_grade:   string | null;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  start_at: string;
  end_at: string;
  enrollments?: CanvasCourseEnrollment[];
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name: string;
  description: string;
  due_at: string | null;
  points_possible: number;
  html_url: string;
  submission_types: string[];
}

export interface CanvasSubmission {
  assignment_id: number;
  course_id: number;
  workflow_state: 'submitted' | 'unsubmitted' | 'graded' | 'pending_review';
  submitted_at: string | null;
  score: number | null;
  grade: string | null;
  late: boolean;
  missing: boolean;
}
