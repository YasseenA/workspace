import { Platform } from 'react-native';

// On web, route through local proxy to bypass CORS.
// On native (iOS/Android), call the API directly.
const API = Platform.OS === 'web'
  ? 'http://localhost:3001/claude/messages'
  : 'https://api.anthropic.com/v1/messages';

const MODEL = 'claude-sonnet-4-20250514';

async function call(system: string, user: string, maxTokens = 2048): Promise<string> {
  const key = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!key) throw new Error('Add EXPO_PUBLIC_CLAUDE_API_KEY to your .env file');
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude error ${res.status}`); }
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); } catch { return fallback; }
}

export const claude = {
  summarize: (text: string, length: 'short'|'medium'|'long' = 'medium') =>
    call('You are an expert academic summarizer. Be clear and student-friendly.',
      `Write a ${length==='short'?'2-3 sentence':length==='medium'?'1-2 paragraph':'comprehensive'} summary:\n\n${text}`),

  explainSimply: (text: string, level: 'beginner'|'intermediate'|'advanced') =>
    call('You are an expert tutor. Explain things clearly with real-world analogies.',
      `Explain the following at a ${level} level:\n\n${text}`),

  generateFlashcards: async (text: string, count: number): Promise<{front:string;back:string}[]> => {
    const raw = await call('Return ONLY valid JSON array, no markdown.',
      `Generate exactly ${count} flashcards from this content.\nJSON: [{"front":"question","back":"answer"}]\n\n${text}`, 1500);
    return parseJSON(raw, Array.from({length:count},(_,i)=>({front:`Concept ${i+1}`,back:`Definition ${i+1}`})));
  },

  generateQuiz: async (text: string, count: number, difficulty: 'easy'|'medium'|'hard'='medium'): Promise<{question:string;options:string[];correct:number;explanation:string}[]> => {
    const raw = await call('Return ONLY valid JSON array, no markdown.',
      `Generate exactly ${count} ${difficulty} multiple choice questions.\nJSON: [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]\n\n${text}`, 2000);
    return parseJSON(raw, []);
  },

  generateStudyGuide: (text: string) =>
    call('You are an expert academic tutor.',
      `Create a comprehensive study guide with key concepts, terms, main ideas, and review questions:\n\n${text}`, 3000),

  improveWriting: (text: string, style: 'clarity'|'formal'|'concise'|'humanize') => {
    const instructions = { clarity: 'Rewrite for maximum clarity.', formal: 'Rewrite in formal academic tone.', concise: 'Rewrite to be as concise as possible.', humanize: 'Rewrite to sound natural and human.' };
    return call('You are an expert writing coach. Return ONLY the rewritten text.', `${instructions[style]}\n\nText:\n${text}`);
  },

  parseSyllabus: async (text: string): Promise<{dates:string[];exams:string[];assignments:string[];books:string[];officeHours:string;gradingPolicy:string}> => {
    const raw = await call('Return ONLY valid JSON.',
      `Extract info from this syllabus.\nJSON: {"dates":[],"exams":[],"assignments":[],"books":[],"officeHours":"","gradingPolicy":""}\n\n${text}`, 2000);
    return parseJSON(raw, {dates:[],exams:[],assignments:[],books:[],officeHours:'',gradingPolicy:''});
  },

  emailDraft: (context: string, type: 'professor'|'extension'|'internship'|'group') => {
    const p = { professor:'Draft a professional email to a professor.', extension:'Draft a polite deadline extension request.', internship:'Draft a professional internship follow-up.', group:'Draft a clear group project coordination email.' };
    return call('You are an expert at writing professional student emails. Return only the email.', `${p[type]}\n\nContext: ${context}`);
  },

  askNotes: (question: string, notes: string) =>
    call('Answer questions based only on the provided notes. Be specific.', `Notes:\n${notes}\n\nQuestion: ${question}`),

  weeklyPlanner: (tasks: string[], available: number) =>
    call('You are an expert academic planner.', `Create a weekly study plan.\nTasks: ${tasks.join(', ')}\nAvailable hours: ${available}\n\nReturn a practical day-by-day plan.`, 2000),
};
