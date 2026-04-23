import { Platform } from 'react-native';
import { getKey } from './keystore';

// On web, route through the proxy to bypass CORS.
// On native (iOS/Android), call the API directly — no CORS restriction.
const PROXY = process.env.EXPO_PUBLIC_PROXY_URL || 'https://workspace-production-2fb5.up.railway.app';
const CLAUDE_API = Platform.OS === 'web' ? `${PROXY}/claude/messages` : 'https://api.anthropic.com/v1/messages';
const OPENAI_API = Platform.OS === 'web' ? `${PROXY}/openai/chat/completions` : 'https://api.openai.com/v1/chat/completions';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const OPENAI_MODEL = 'gpt-4o';

function getProvider(): 'claude' | 'openai' {
  return (getKey('ai_provider') as 'claude' | 'openai') || 'claude';
}

function getApiKey(): string {
  const provider = getProvider();
  const userKey = getKey(provider === 'openai' ? 'user_openai_api_key' : 'user_claude_api_key');
  if (userKey) return userKey;
  return provider === 'claude' ? (process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '') : '';
}

async function call(system: string, user: string, maxTokens = 2048): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('No AI key set. Go to Settings → AI Keys to add yours.');
  const provider = getProvider();
  if (provider === 'openai') {
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenAI error ${res.status}`); }
    const d = await res.json();
    return d.choices?.[0]?.message?.content || '';
  }
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude error ${res.status}`); }
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

// Parse SSE stream — handles both Claude and OpenAI formats
async function readStream(res: Response, onChunk: (text: string) => void, provider: 'claude' | 'openai' = 'claude'): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '', buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          let text = '';
          if (provider === 'openai') {
            text = parsed.choices?.[0]?.delta?.content || '';
          } else {
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta')
              text = parsed.delta.text;
          }
          if (text) { fullText += text; onChunk(text); }
        } catch {}
      }
    }
  }
  return fullText;
}

export async function streamCall(
  system: string,
  user: string,
  onChunk: (text: string) => void,
  maxTokens = 2048
): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('No AI key set. Go to Settings → AI Keys to add yours.');
  const provider = getProvider();
  if (provider === 'openai') {
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, stream: true, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenAI error ${res.status}`); }
    return readStream(res, onChunk, 'openai');
  }
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, stream: true, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude error ${res.status}`); }
  return readStream(res, onChunk, 'claude');
}

export async function streamChat(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (text: string) => void,
  maxTokens = 2048
): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('No AI key set. Go to Settings → AI Keys to add yours.');
  const provider = getProvider();
  if (provider === 'openai') {
    const openaiMessages = [{ role: 'system' as const, content: system }, ...messages];
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, stream: true, messages: openaiMessages }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenAI error ${res.status}`); }
    return readStream(res, onChunk, 'openai');
  }
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, stream: true, system, messages }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude error ${res.status}`); }
  return readStream(res, onChunk, 'claude');
}

async function callWithImage(system: string, userText: string, imageBase64: string, mediaType: string, maxTokens = 2048): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('No Claude API key set. Go to Settings → AI Keys to add yours.');
  const content: any[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
  ];
  if (userText.trim()) content.push({ type: 'text', text: userText });
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
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
    const styleDesc = { clarity: 'clear and easy to understand', formal: 'formal and academic', concise: 'concise and to-the-point', humanize: 'natural and human-sounding' };
    return call(
      `You are an expert writing assistant. If the input is a writing request or prompt, fulfill it and write the content. If the input is existing text to improve, rewrite it. Either way, return ONLY the final written content — no explanations, no preamble.`,
      `Style: ${styleDesc[style]}\n\nInput:\n${text}`
    );
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

  // ── Streaming text tools ──
  streamSummarize: (text: string, length: 'short'|'medium'|'long' = 'medium', onChunk: (t: string) => void) =>
    streamCall('You are an expert academic summarizer. Be clear and student-friendly.',
      `Write a ${length==='short'?'2-3 sentence':length==='medium'?'1-2 paragraph':'comprehensive'} summary:\n\n${text}`,
      onChunk),

  streamExplain: (text: string, level: 'beginner'|'intermediate'|'advanced', onChunk: (t: string) => void) =>
    streamCall('You are an expert tutor. Explain things clearly with real-world analogies.',
      `Explain the following at a ${level} level:\n\n${text}`,
      onChunk),

  streamStudyGuide: (text: string, onChunk: (t: string) => void) =>
    streamCall('You are an expert academic tutor.',
      `Create a comprehensive study guide with key concepts, terms, main ideas, and review questions:\n\n${text}`,
      onChunk, 3000),

  streamImproveWriting: (text: string, style: 'clarity'|'formal'|'concise'|'humanize', onChunk: (t: string) => void) => {
    const styleDesc = { clarity: 'clear and easy to understand', formal: 'formal and academic', concise: 'concise and to-the-point', humanize: 'natural and human-sounding' };
    return streamCall(
      'You are an expert writing assistant. If the input is a writing request or prompt, fulfill it and write the content. If the input is existing text to improve, rewrite it. Either way, return ONLY the final written content — no explanations, no preamble.',
      `Style: ${styleDesc[style]}\n\nInput:\n${text}`,
      onChunk
    );
  },

  // Study Buddy — multi-turn streaming chat with app context injected as system prompt
  chat: (system: string, messages: { role: 'user'|'assistant'; content: string }[], onChunk: (t: string) => void, maxTokens = 2048) =>
    streamChat(system, messages, onChunk, maxTokens),

  // Daily brief — short actionable snapshot for the home screen
  dailyBrief: (context: string, onChunk: (t: string) => void) =>
    streamCall(
      'You are a helpful student assistant. Be concise, specific, and encouraging. No lists — just 2-3 natural sentences.',
      context,
      onChunk, 256
    ),

  // Assignment auto-brief — short TL;DR when opening an assignment modal
  assignmentBrief: (name: string, description: string, points: number, dueDate: string, onChunk: (t: string) => void) =>
    streamCall(
      'You are a helpful student assistant. Give a 1-2 sentence plain-English summary of what this assignment requires.',
      `Assignment: ${name}\nPoints: ${points}\nDue: ${dueDate}\nDescription: ${description || 'No description provided.'}`,
      onChunk, 200
    ),

  // Vision — image + optional extra text
  summarizeImage: (b64: string, mime: string, length: 'short'|'medium'|'long' = 'medium') =>
    callWithImage('You are an expert academic summarizer. Be clear and student-friendly.',
      `Write a ${length==='short'?'2-3 sentence':length==='medium'?'1-2 paragraph':'comprehensive'} summary of everything you see in this image.`,
      b64, mime),

  explainImage: (b64: string, mime: string, level: 'beginner'|'intermediate'|'advanced') =>
    callWithImage('You are an expert tutor. Explain things clearly with real-world analogies.',
      `Explain the content in this image at a ${level} level.`, b64, mime),

  flashcardsFromImage: async (b64: string, mime: string, count: number): Promise<{front:string;back:string}[]> => {
    const raw = await callWithImage('Return ONLY valid JSON array, no markdown.',
      `Generate exactly ${count} flashcards from the content visible in this image.\nJSON: [{"front":"question","back":"answer"}]`,
      b64, mime, 1500);
    return parseJSON(raw, Array.from({length:count},(_,i)=>({front:`Concept ${i+1}`,back:`Definition ${i+1}`})));
  },

  quizFromImage: async (b64: string, mime: string, count: number): Promise<{question:string;options:string[];correct:number;explanation:string}[]> => {
    const raw = await callWithImage('Return ONLY valid JSON array, no markdown.',
      `Generate exactly ${count} multiple choice questions from the content in this image.\nJSON: [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]`,
      b64, mime, 2000);
    return parseJSON(raw, []);
  },

  studyGuideFromImage: (b64: string, mime: string) =>
    callWithImage('You are an expert academic tutor.',
      'Create a comprehensive study guide with key concepts, terms, main ideas, and review questions based on this image.',
      b64, mime, 3000),
};
