import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Hash, Star, Pin, Zap, Pencil, Eraser, Trash2,
  Bold, Italic, List, ListOrdered, Quote, Code, Heading1, Heading2,
  Eye, Send, Download, Share2,
} from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { Badge } from '../../components/ui';
import { useColors } from '../../lib/theme';
import { wordCount, showAlert } from '../../utils/helpers';
import { claude } from '../../lib/claude';

type EditorMode = 'write' | 'preview' | 'draw';
type AIMode = 'summarize' | 'explain' | 'studyGuide' | 'ask' | null;
type DrawTool = 'pen' | 'highlighter' | 'eraser';

// ── Templates (HTML for web, markdown for native) ────────────────────────────
const TEMPLATES = [
  {
    emoji: '📚', label: 'Lecture Notes',
    title: 'Lecture Notes',
    md: '## Key Points\n- \n- \n- \n\n## Details\n\n\n## Summary\n',
    html: '<h2>Key Points</h2><ul><li></li><li></li><li></li></ul><h2>Details</h2><p><br></p><h2>Summary</h2><p><br></p>',
  },
  {
    emoji: '🧪', label: 'Study Guide',
    title: 'Study Guide',
    md: '## Core Concepts\n1. \n2. \n3. \n\n## Key Terms\n- **Term**: Definition\n\n## Practice Questions\n1. \n',
    html: '<h2>Core Concepts</h2><ol><li></li><li></li><li></li></ol><h2>Key Terms</h2><ul><li><strong>Term</strong>: Definition</li></ul><h2>Practice Questions</h2><ol><li></li></ol>',
  },
  {
    emoji: '🧠', label: 'Cornell Notes',
    title: 'Cornell Notes',
    md: '## Cues (Key Questions)\n- \n- \n\n## Notes\n\n\n## Summary\n',
    html: '<h2>Cues (Key Questions)</h2><ul><li></li><li></li></ul><h2>Notes</h2><p><br></p><h2>Summary</h2><p><br></p>',
  },
  {
    emoji: '📋', label: 'Meeting Notes',
    title: 'Meeting Notes',
    md: '**Date:** \n**With:** \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] \n',
    html: '<p><strong>Date:</strong> </p><p><strong>With:</strong> </p><h2>Agenda</h2><ol><li></li></ol><h2>Discussion</h2><p><br></p><h2>Action Items</h2><ul><li></li></ul>',
  },
  {
    emoji: '✅', label: 'To-Do List',
    title: 'To-Do List',
    md: '## Tasks\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n',
    html: '<h2>Tasks</h2><ul><li></li><li></li><li></li></ul><h2>Notes</h2><p><br></p>',
  },
];

// ── Markdown renderer (used for native preview + legacy markdown notes) ───────
function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineFormat(raw: string): string {
  return escHtml(raw)
    .replace(/`([^`]+)`/g, '<code style="font-family:monospace;background:rgba(120,80,255,0.1);padding:1px 5px;border-radius:4px;font-size:93%">$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#7c3aed;text-decoration:underline" target="_blank">$1</a>');
}

function buildMarkdownHtml(md: string, tc: string, sc: string, border: string, primary: string): string {
  const lines = md.split('\n');
  let html = '';
  let listStack: string[] = [];

  const closeLists = () => { while (listStack.length) { html += `</${listStack.pop()}>`; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      closeLists();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code += escHtml(lines[i]) + '\n'; i++; }
      html += `<pre style="background:rgba(0,0,0,0.06);border-radius:10px;padding:12px 14px;overflow-x:auto;margin:10px 0;font-family:monospace;font-size:13px;line-height:1.6;color:${tc}"><code>${code}</code></pre>`;
      continue;
    }
    if (line.startsWith('# '))       { closeLists(); html += `<h1 style="font-size:22px;font-weight:800;margin:20px 0 8px;letter-spacing:-0.4px;color:${tc}">${inlineFormat(line.slice(2))}</h1>`; }
    else if (line.startsWith('## ')) { closeLists(); html += `<h2 style="font-size:18px;font-weight:700;margin:16px 0 6px;color:${tc}">${inlineFormat(line.slice(3))}</h2>`; }
    else if (line.startsWith('### ')){ closeLists(); html += `<h3 style="font-size:15px;font-weight:700;margin:12px 0 4px;color:${tc}">${inlineFormat(line.slice(4))}</h3>`; }
    else if (line.startsWith('> '))  { closeLists(); html += `<blockquote style="border-left:3px solid ${primary};padding:4px 0 4px 14px;margin:8px 0;color:${sc};font-style:italic">${inlineFormat(line.slice(2))}</blockquote>`; }
    else if (line.match(/^[-*] /))   {
      if (!listStack.length || listStack[listStack.length-1] !== 'ul') { if (listStack.length && listStack[listStack.length-1]==='ol') closeLists(); html += '<ul style="margin:6px 0;padding-left:20px">'; listStack.push('ul'); }
      html += `<li style="margin:2px 0;line-height:1.65;color:${tc}">${inlineFormat(line.slice(2))}</li>`;
    } else if (line.match(/^\d+\. /)) {
      if (!listStack.length || listStack[listStack.length-1] !== 'ol') { if (listStack.length && listStack[listStack.length-1]==='ul') closeLists(); html += '<ol style="margin:6px 0;padding-left:20px">'; listStack.push('ol'); }
      html += `<li style="margin:2px 0;line-height:1.65;color:${tc}">${inlineFormat(line.replace(/^\d+\. /,''))}</li>`;
    } else if (line === '---' || line === '***' || line === '___') {
      closeLists(); html += `<hr style="border:none;border-top:1px solid ${border};margin:14px 0">`;
    } else if (line.trim() === '') {
      closeLists(); html += '<div style="height:10px"></div>';
    } else {
      closeLists(); html += `<p style="margin:0 0 3px;line-height:1.7;color:${tc}">${inlineFormat(line)}</p>`;
    }
  }
  closeLists();
  return html;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function NoteEditorScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id, template: templateParam } = useLocalSearchParams<{ id?: string; template?: string }>();
  const { notes, notebooks, createNote, updateNote, togglePin, toggleFavorite } = useNotesStore();
  const existingNote = id ? notes.find(n => n.id === id) : null;

  // If a template param was passed, find it and pre-apply
  const presetTemplate = templateParam
    ? TEMPLATES.find(t => t.label === templateParam) ?? null
    : null;

  const [title,      setTitle]      = useState(presetTemplate?.title || existingNote?.title   || '');
  const [content,    setContent]    = useState(presetTemplate?.md    || existingNote?.content || '');
  const [tags,       setTags]       = useState<string[]>(existingNote?.tags  || []);
  const [tagInput,   setTagInput]   = useState('');
  const [notebookId, setNotebookId] = useState<string>(existingNote?.notebookId || '');
  const [images,     setImages]     = useState<string[]>(existingNote?.images || []);
  const [noteId,     setNoteId]     = useState(id || '');
  const [mode,       setMode]       = useState<EditorMode>('write');
  const [saveStatus, setSaveStatus] = useState<'saved'|'saving'|'unsaved'|'new'>('new');

  // AI state
  const [isAI,       setIsAI]       = useState(false);
  const [aiOutput,   setAiOutput]   = useState('');
  const [aiMode,     setAiMode]     = useState<AIMode>(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [askInput,   setAskInput]   = useState('');

  // Templates — hide picker if a template was pre-applied via param
  const [showTemplates, setShowTemplates] = useState(!id && !existingNote && !presetTemplate);

  // presetApplied ref — used after IS_WEB / contentRef are defined below
  const presetApplied = useRef(false);

  // Lightbox for drawings
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Drawing
  const [drawColor,      setDrawColor]      = useState('#7c3aed');
  const [brushSize,      setBrushSize]      = useState(3);
  const [drawTool,       setDrawTool]       = useState<DrawTool>('pen');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const canvasRef    = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const lastPos      = useRef<{ x: number; y: number } | null>(null);
  // Refs so imperative touch handlers always see current values
  const drawStateRef = useRef({ color: '#7c3aed', size: 3, tool: 'pen' as DrawTool });
  useEffect(() => { drawStateRef.current = { color: drawColor, size: brushSize, tool: drawTool }; }, [drawColor, brushSize, drawTool]);

  const autoSaveRef    = useRef<any>(null);
  // On web: points to the contenteditable div
  // On native: points to the TextInput
  const contentRef     = useRef<any>(null);
  const ceInitialized  = useRef(false);

  const DRAW_COLORS = [
    '#0a0a0a','#ffffff','#7c3aed','#3b82f6','#06b6d4',
    '#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#a78bfa',
  ];
  const IS_WEB = Platform.OS === 'web';

  // ── Apply preset template to web contenteditable ──────────────────────────
  useEffect(() => {
    if (!presetTemplate || presetApplied.current || !IS_WEB) return;
    presetApplied.current = true;
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.innerHTML = presetTemplate.html;
        setContent(presetTemplate.html);
      }
    }, 120);
  }, []);

  // ── Initialize contenteditable on web ─────────────────────────────────────
  useEffect(() => {
    if (!IS_WEB || !contentRef.current || ceInitialized.current) return;
    ceInitialized.current = true;
    const src = existingNote?.content || '';
    if (src) {
      // If content already contains HTML tags, render as-is. Otherwise parse markdown.
      const isHtml = src.includes('<') && src.includes('>') && src.includes('</');
      contentRef.current.innerHTML = isHtml
        ? src
        : buildMarkdownHtml(src, colors.text, colors.textSecondary, colors.border, colors.primary);
    }
  }, []);

  // ── Lightbox: click img in contenteditable to enlarge ─────────────────────
  useEffect(() => {
    if (!IS_WEB) return;
    const handler = (e: any) => {
      if (e.target?.tagName === 'IMG') setLightboxImg(e.target.src);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!title.trim()) { setSaveStatus('unsaved'); return; }
    setSaveStatus('unsaved');
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      setSaveStatus('saving');
      try {
        if (noteId) {
          updateNote(noteId, { title, content, tags, images, notebookId: notebookId || undefined });
        } else if (existingNote) {
          updateNote(existingNote.id, { title, content, tags, images, notebookId: notebookId || undefined });
        } else {
          const note = createNote({ title, content, tags, images, notebookId: notebookId || undefined });
          setNoteId(note.id);
        }
        setSaveStatus('saved');
      } catch { setSaveStatus('unsaved'); }
    }, 1500);
    return () => clearTimeout(autoSaveRef.current);
  }, [title, content, tags, notebookId, images]);

  // ── Drawing canvas setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'draw' || !IS_WEB || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let initialized = false;

    const initCanvas = () => {
      const w = canvas.offsetWidth || canvas.parentElement?.offsetWidth || window.innerWidth;
      const h = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 500;
      if (w > 10 && h > 10 && !initialized) {
        initialized = true;
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = colors.card;
        ctx.fillRect(0, 0, w, h);
      }
    };

    // Try immediately, then via rAF (layout may not be complete yet)
    initCanvas();
    const raf = requestAnimationFrame(initCanvas);

    // ResizeObserver for when dimensions become available after layout
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(initCanvas);
      ro.observe(canvas);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [mode, colors.card]);

  // ── iOS touch events (must be non-passive to call preventDefault) ───────────
  useEffect(() => {
    if (mode !== 'draw' || !IS_WEB || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const onTouchStart = (e: TouchEvent) => {
      isDrawingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      lastPos.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || !lastPos.current) return;
      const { color, size, tool } = drawStateRef.current;
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
      const ctx = canvas.getContext('2d');
      ctx.save();
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = size * 5;
      } else if (tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 5;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
      }
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      lastPos.current = pos;
    };

    const onTouchEnd = () => {
      isDrawingRef.current = false;
      lastPos.current = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [mode]);

  // ── WYSIWYG helpers (web) ─────────────────────────────────────────────────
  const execCmd = useCallback((cmd: string, val?: string) => {
    if (!IS_WEB) return;
    document.execCommand(cmd, false, val ?? undefined);
    contentRef.current?.focus();
  }, []);

  const handleContentInput = useCallback(() => {
    if (IS_WEB && contentRef.current) {
      setContent(contentRef.current.innerHTML);
      setShowTemplates(false);
    }
  }, []);

  // ── Native markdown helpers ───────────────────────────────────────────────
  const insertFormat = (before: string, after = '', placeholder = '') => {
    if (IS_WEB) return; // web uses execCmd
    const el = contentRef.current;
    if (!el) { setContent(c => c + before + placeholder + after); return; }
    const start: number = el.selectionStart ?? 0;
    const end: number   = el.selectionEnd   ?? 0;
    const sel = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + sel.length;
      el.focus();
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    if (IS_WEB) return;
    const el = contentRef.current;
    if (!el) return;
    const start: number = el.selectionStart ?? 0;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(next);
    setTimeout(() => {
      const newPos = start + prefix.length;
      el.selectionStart = newPos; el.selectionEnd = newPos; el.focus();
    }, 10);
  };

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setShowTemplates(false);
    if (IS_WEB && contentRef.current) {
      contentRef.current.innerHTML = t.html;
      setContent(t.html);
      setTimeout(() => {
        // Place cursor at beginning of contenteditable
        const el = contentRef.current;
        if (!el) return;
        el.focus();
        const range = document.createRange();
        const sel   = window.getSelection();
        range.setStart(el, 0); range.collapse(true);
        sel?.removeAllRanges(); sel?.addRange(range);
      }, 30);
    } else {
      setContent(t.md);
    }
  };

  // ── Drawing ────────────────────────────────────────────────────────────────
  const getPos = (e: any, canvas: any) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };
  const startDraw = (e: any) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };
  const draw = (e: any) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.save();
    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 5;
    } else if (drawTool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize * 5;
    } else {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
    }
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    lastPos.current = pos;
  };
  const endDraw  = () => { isDrawingRef.current = false; lastPos.current = null; };
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = colors.card;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };
  const insertDrawing = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (IS_WEB && contentRef.current) {
      // Insert as small clickable thumbnail — click to enlarge via lightbox
      const imgTag = `<img src="${dataUrl}" alt="Drawing" style="width:120px;height:88px;object-fit:cover;border-radius:10px;border:1px solid ${colors.border};cursor:pointer;display:inline-block;margin:0 8px 8px 0" />`;
      contentRef.current.innerHTML = imgTag + contentRef.current.innerHTML;
      setContent(contentRef.current.innerHTML);
    } else {
      setImages(prev => [...prev, dataUrl]);
    }
    setMode('write');
  };

  // ── Save on back ───────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { showAlert('Title Required', 'Please add a title before leaving.'); return; }
    clearTimeout(autoSaveRef.current);
    // Capture latest html from contenteditable before leaving
    const latestContent = (IS_WEB && contentRef.current) ? contentRef.current.innerHTML : content;
    const target = noteId || existingNote?.id;
    if (target) updateNote(target, { title, content: latestContent, tags, images, notebookId: notebookId || undefined });
    else createNote({ title, content: latestContent, tags, images, notebookId: notebookId || undefined });
    router.back();
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) { setTags([...tags, tag]); setTagInput(''); }
  };

  // ── Export / Share ─────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!IS_WEB) return;
    const html = IS_WEB && contentRef.current ? contentRef.current.innerHTML : content;
    const printWindow = (window as any).open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title || 'Note'}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
  h2 { font-size: 20px; font-weight: 700; margin-top: 20px; }
  h3 { font-size: 16px; font-weight: 700; }
  p  { margin: 6px 0; }
  ul, ol { padding-left: 22px; }
  li { margin: 3px 0; }
  blockquote { border-left: 3px solid #7c3aed; padding-left: 14px; margin: 10px 0; color: #666; font-style: italic; }
  pre  { background: #f5f5f5; border-radius: 8px; padding: 12px; font-size: 13px; }
  code { background: rgba(120,80,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 93%; }
  hr   { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
  .meta { font-size: 13px; color: #888; margin-bottom: 28px; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${title || 'Untitled'}</h1>
<div class="meta">Exported from Workspace · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
${html}
</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const shareNote = async () => {
    if (!IS_WEB) return;
    const rawText = contentRef.current ? stripHtmlTags(contentRef.current.innerHTML) : content;
    const shareData = { title: title || 'Note', text: `${title}\n\n${rawText}` };
    if ((navigator as any).share && (navigator as any).canShare?.(shareData)) {
      try { await (navigator as any).share(shareData); } catch {}
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.text);
        showAlert('Copied!', 'Note text copied to clipboard.');
      } catch {
        showAlert('Share', 'Web Share not supported in this browser.');
      }
    }
  };

  // ── AI ─────────────────────────────────────────────────────────────────────
  const runAI = async (modeKey: AIMode, question?: string) => {
    // Get current text content (strip HTML on web)
    const rawContent = IS_WEB && contentRef.current
      ? stripHtmlTags(contentRef.current.innerHTML)
      : content;
    if (!rawContent && modeKey !== 'ask') { showAlert('Add some content first!'); return; }
    if (modeKey === 'ask' && !question?.trim()) return;
    setAiMode(modeKey); setIsAI(true); setAiOutput(''); setAiLoading(true);
    try {
      if (modeKey === 'summarize')  await claude.streamSummarize(rawContent, 'medium', chunk => setAiOutput(o => o + chunk));
      if (modeKey === 'explain')    await claude.streamExplain(rawContent, 'beginner', chunk => setAiOutput(o => o + chunk));
      if (modeKey === 'studyGuide') await claude.streamStudyGuide(rawContent, chunk => setAiOutput(o => o + chunk));
      if (modeKey === 'ask')        await claude.chat(
        `Answer the student's question based on their note. Note:\n${rawContent}`,
        [{ role: 'user', content: question! }],
        chunk => setAiOutput(o => o + chunk)
      );
    } catch (e: any) {
      setAiOutput('⚠️ ' + (e.message?.includes('fetch') || e.message?.includes('Failed to fetch') ? 'AI service temporarily unavailable. Please try again.' : e.message));
    } finally { setAiLoading(false); }
  };

  const sendAsk = () => { if (!askInput.trim()) return; const q = askInput.trim(); setAskInput(''); runAI('ask', q); };

  // Word count — strip HTML on web
  const rawText   = IS_WEB ? stripHtmlTags(content) : content;
  const wc        = wordCount(rawText);
  const readMins  = Math.max(1, Math.round(wc / 200));

  // Preview HTML — content is already HTML on web; use markdown parser on native
  const previewHtml = mode === 'preview'
    ? (IS_WEB
        ? content  // already HTML
        : buildMarkdownHtml(content, colors.text, colors.textSecondary, colors.border, colors.primary))
    : '';

  // ── Toolbar button config ─────────────────────────────────────────────────
  const fmtButtons = [
    { icon: <Bold        size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('bold')                          : insertFormat('**', '**', 'bold text') },
    { icon: <Italic      size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('italic')                        : insertFormat('*', '*', 'italic text') },
    { icon: <Heading1    size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('formatBlock', 'h1')             : insertLinePrefix('# ') },
    { icon: <Heading2    size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('formatBlock', 'h2')             : insertLinePrefix('## ') },
    { icon: <List        size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('insertUnorderedList')           : insertLinePrefix('- ') },
    { icon: <ListOrdered size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('insertOrderedList')             : insertLinePrefix('1. ') },
    { icon: <Quote       size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('formatBlock', 'blockquote')     : insertLinePrefix('> ') },
    { icon: <Code        size={14} color={colors.textSecondary} />, onPress: () => IS_WEB ? execCmd('formatBlock', 'pre')            : insertFormat('`', '`', 'code') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {/* Left: back + mode tabs */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleSave} style={[styles.iconBtn, { borderColor: colors.border }]}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['write', 'preview'] as EditorMode[]).map(m => (
                <TouchableOpacity key={m} onPress={() => setMode(m)}
                  style={[styles.modeTab, {
                    backgroundColor: mode === m ? colors.primary + '18' : 'transparent',
                    borderColor: mode === m ? colors.primary + '40' : 'transparent',
                  }]}>
                  {m === 'write'
                    ? <Pencil size={13} color={mode === 'write'   ? colors.primary : colors.textTertiary} />
                    : <Eye    size={13} color={mode === 'preview' ? colors.primary : colors.textTertiary} />}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: mode === m ? colors.primary : colors.textTertiary }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              {IS_WEB && (
                <TouchableOpacity onPress={() => setMode('draw')}
                  style={[styles.modeTab, {
                    backgroundColor: mode === 'draw' ? colors.accent + '18' : 'transparent',
                    borderColor:     mode === 'draw' ? colors.accent + '40' : 'transparent',
                  }]}>
                  <Pencil size={13} color={mode === 'draw' ? colors.accent : colors.textTertiary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'draw' ? colors.accent : colors.textTertiary }}>Draw</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Right: word count + actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              {wc > 0 ? `${wc}w · ${readMins}min` : ''}
            </Text>
            {existingNote && (<>
              <TouchableOpacity onPress={() => togglePin(existingNote.id)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Pin size={15} color={existingNote.isPinned ? colors.warning : colors.textTertiary} fill={existingNote.isPinned ? colors.warning : 'none'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleFavorite(existingNote.id)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Star size={15} color={existingNote.isFavorite ? colors.warning : colors.textTertiary} fill={existingNote.isFavorite ? colors.warning : 'none'} />
              </TouchableOpacity>
            </>)}
            {IS_WEB && (<>
              <TouchableOpacity onPress={exportPDF} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Download size={15} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareNote} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Share2 size={15} color={colors.textTertiary} />
              </TouchableOpacity>
            </>)}
            <View style={[styles.saveChip, {
              backgroundColor: saveStatus === 'saved' ? colors.success + '18' : saveStatus === 'saving' ? colors.primaryLight : saveStatus === 'unsaved' ? colors.warning + '18' : colors.card,
              borderColor:     saveStatus === 'saved' ? colors.success + '40' : saveStatus === 'saving' ? colors.primary + '40' : saveStatus === 'unsaved' ? colors.warning + '40' : colors.border,
            }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: saveStatus === 'saved' ? colors.success : saveStatus === 'saving' ? colors.primary : saveStatus === 'unsaved' ? colors.warning : colors.textTertiary }}>
                {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'New'}
              </Text>
            </View>
          </View>
        </View>

        {mode === 'write' && (<>
          {/* ── AI Bar ── */}
          <View style={[styles.aiBar, { backgroundColor: colors.primaryLight, borderBottomColor: colors.border }]}>
            <Zap size={13} color={colors.primary} fill={colors.primary} />
            {[
              { key: 'summarize',  label: 'Summarize' },
              { key: 'explain',    label: 'Explain'   },
              { key: 'studyGuide', label: 'Guide'     },
            ].map(a => (
              <TouchableOpacity key={a.key} onPress={() => runAI(a.key as AIMode)}
                style={[styles.aiChip, {
                  backgroundColor: aiMode === a.key && isAI ? colors.primary : 'transparent',
                  borderColor:     aiMode === a.key && isAI ? colors.primary : colors.primary + '50',
                }]}>
                {aiLoading && aiMode === a.key
                  ? <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
                  : <Text style={{ fontSize: 11, fontWeight: '600', color: aiMode === a.key && isAI ? '#fff' : colors.primary }}>{a.label}</Text>
                }
              </TouchableOpacity>
            ))}
            <View style={[styles.askWrap, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
              {IS_WEB ? (
                <input
                  value={askInput}
                  onChange={(e: any) => setAskInput(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') sendAsk(); }}
                  placeholder="Ask about this note…"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 12, color: colors.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    flex: 1, minWidth: 0, padding: 0,
                  }}
                />
              ) : (
                <TextInput
                  value={askInput} onChangeText={setAskInput}
                  placeholder="Ask…" placeholderTextColor={colors.textTertiary}
                  style={{ flex: 1, fontSize: 12, color: colors.text }}
                  onSubmitEditing={sendAsk}
                />
              )}
              <TouchableOpacity onPress={sendAsk} disabled={!askInput.trim()}>
                <Send size={13} color={askInput.trim() ? colors.primary : colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {isAI && (
              <TouchableOpacity onPress={() => { setIsAI(false); setAiOutput(''); setAiMode(null); }}>
                <Text style={{ color: colors.error, fontSize: 13, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Format Bar ── */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={[styles.fmtBarWrap, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}
            contentContainerStyle={styles.fmtBar}
          >
            {fmtButtons.map((btn, i) => (
              <TouchableOpacity key={i} onPress={btn.onPress}
                style={[styles.fmtBtn, { borderColor: colors.border }]}>
                {btn.icon}
              </TouchableOpacity>
            ))}
            <View style={[styles.fmtDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={() => IS_WEB ? execCmd('insertHorizontalRule') : insertFormat('\n---\n')}
              style={[styles.fmtBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>—</Text>
            </TouchableOpacity>
          </ScrollView>
        </>)}

        {/* ── Write mode ── */}
        {mode === 'write' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* AI output */}
            {isAI && (
              <View style={[styles.aiOutput, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Zap size={13} color={colors.primary} fill={colors.primary} />
                  <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 12 }}>
                    Claude {aiMode === 'ask' ? '· Answer' : aiMode === 'summarize' ? '· Summary' : aiMode === 'explain' ? '· Explanation' : '· Study Guide'}
                  </Text>
                  {aiLoading && <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.75 }] }} />}
                </View>
                {aiOutput
                  ? <>
                      <Text style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}>{aiOutput}</Text>
                      <TouchableOpacity onPress={() => {
                        if (IS_WEB && contentRef.current) {
                          contentRef.current.innerHTML += `<hr><p>${aiOutput.replace(/\n/g, '<br>')}</p>`;
                          setContent(contentRef.current.innerHTML);
                        } else {
                          setContent(content + '\n\n---\n\n' + aiOutput);
                        }
                        setIsAI(false); setAiOutput('');
                      }} style={{ marginTop: 10 }}>
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Insert into note →</Text>
                      </TouchableOpacity>
                    </>
                  : <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Generating…</Text>
                }
              </View>
            )}

            {/* Templates */}
            {showTemplates && (
              <View style={[styles.templatesBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                <Text style={[styles.templatesLabel, { color: colors.textTertiary }]}>Start with a template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <TouchableOpacity
                      key={t.label}
                      onPress={() => applyTemplate(t)}
                      style={[styles.templateChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                      <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowTemplates(false)} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>Start blank ↗</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Title */}
            {IS_WEB ? (
              <input
                value={title}
                onChange={(e: any) => { setTitle(e.target.value); setShowTemplates(false); }}
                placeholder="Note title…"
                style={{
                  fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
                  color: colors.text, background: 'transparent', border: 'none',
                  outline: 'none', width: '100%', marginBottom: 12,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  padding: 0,
                } as any}
              />
            ) : (
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Note title…" placeholderTextColor={colors.textTertiary}
                value={title} onChangeText={v => { setTitle(v); setShowTemplates(false); }} multiline
              />
            )}

            {/* Tags */}
            <View style={styles.tagsRow}>
              {tags.map(tag => (
                <TouchableOpacity key={tag} onPress={() => setTags(tags.filter(t => t !== tag))}>
                  <Badge variant="primary" size="sm">#{tag} ✕</Badge>
                </TouchableOpacity>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Hash size={12} color={colors.textTertiary} />
                <TextInput
                  style={[styles.tagInput, { color: colors.text }, IS_WEB ? ({ outlineWidth: 0 } as any) : {}]}
                  placeholder="add tag…" placeholderTextColor={colors.textTertiary}
                  value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag}
                />
              </View>
            </View>

            {/* Notebook picker */}
            {notebooks.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 8 }}>
                <TouchableOpacity onPress={() => setNotebookId('')}
                  style={[styles.nbPill, !notebookId && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={{ fontSize: 12, color: !notebookId ? colors.primary : colors.textTertiary, fontWeight: '600' }}>No notebook</Text>
                </TouchableOpacity>
                {notebooks.map(nb => (
                  <TouchableOpacity key={nb.id} onPress={() => setNotebookId(nb.id)}
                    style={[styles.nbPill, notebookId === nb.id && { backgroundColor: nb.color + '20', borderColor: nb.color }]}>
                    <Text style={{ fontSize: 12 }}>{nb.icon}</Text>
                    <Text style={{ fontSize: 12, color: notebookId === nb.id ? nb.color : colors.textSecondary, fontWeight: '600' }}>{nb.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Content area ── */}
            {IS_WEB ? (
              <>
                {/* CSS for contenteditable styling */}
                <style>{`
                  .note-editor { outline: none; min-height: 300px; }
                  .note-editor:empty:before { content: attr(data-placeholder); color: ${colors.textTertiary}; pointer-events: none; display: block; }
                  .note-editor h1 { font-size: 24px; font-weight: 800; margin: 20px 0 8px; letter-spacing: -0.4px; color: ${colors.text}; }
                  .note-editor h2 { font-size: 20px; font-weight: 700; margin: 16px 0 6px; color: ${colors.text}; }
                  .note-editor h3 { font-size: 16px; font-weight: 700; margin: 12px 0 4px; color: ${colors.text}; }
                  .note-editor p  { margin: 4px 0; line-height: 1.7; color: ${colors.text}; }
                  .note-editor ul, .note-editor ol { padding-left: 22px; margin: 6px 0; }
                  .note-editor li { margin: 3px 0; line-height: 1.65; color: ${colors.text}; }
                  .note-editor blockquote { border-left: 3px solid ${colors.primary}; padding: 4px 0 4px 14px; margin: 8px 0; color: ${colors.textSecondary}; font-style: italic; }
                  .note-editor pre  { background: rgba(120,80,255,0.08); border-radius: 10px; padding: 12px 14px; margin: 10px 0; font-family: monospace; overflow-x: auto; }
                  .note-editor code { font-family: monospace; background: rgba(120,80,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 93%; }
                  .note-editor hr   { border: none; border-top: 1px solid ${colors.border}; margin: 14px 0; }
                  .note-editor strong { font-weight: 700; }
                  .note-editor em     { font-style: italic; }
                  .note-editor a  { color: ${colors.primary}; text-decoration: underline; }
                  .note-editor *  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 16px; }
                  .note-editor h1 * { font-size: 24px; }
                  .note-editor h2 * { font-size: 20px; }
                  .note-editor h3 * { font-size: 16px; }
                `}</style>
                <div
                  ref={contentRef}
                  className="note-editor"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Start writing…"
                  onInput={handleContentInput}
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 16, lineHeight: '27px', color: colors.text,
                  } as any}
                />
              </>
            ) : (
              <TextInput
                ref={contentRef}
                style={[styles.contentInput, { color: colors.text }]}
                placeholder="Start writing…" placeholderTextColor={colors.textTertiary}
                value={content} onChangeText={v => { setContent(v); setShowTemplates(false); }}
                multiline scrollEnabled={false} textAlignVertical="top"
              />
            )}

            {/* Inserted drawings */}
            {images.length > 0 && (
              <View style={{ gap: 12, marginTop: 16 }}>
                {images.map((src, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    {IS_WEB && (
                      // @ts-ignore
                      <img src={src} alt={`Drawing ${i + 1}`}
                        style={{ width: '100%', borderRadius: 12, display: 'block', border: `1px solid ${colors.border}` } as any} />
                    )}
                    <TouchableOpacity
                      onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      style={[styles.imgDeleteBtn, { backgroundColor: colors.error }]}
                    >
                      <Trash2 size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── Preview mode ── */}
        {mode === 'preview' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16, letterSpacing: -0.5 }}>
              {title || 'Untitled'}
            </Text>
            {content.trim()
              ? IS_WEB
                ? <>
                    <style>{`
                      .note-preview h1 { font-size: 24px; font-weight: 800; margin: 20px 0 8px; color: ${colors.text}; }
                      .note-preview h2 { font-size: 20px; font-weight: 700; margin: 16px 0 6px; color: ${colors.text}; }
                      .note-preview h3 { font-size: 16px; font-weight: 700; margin: 12px 0 4px; color: ${colors.text}; }
                      .note-preview p  { margin: 4px 0; line-height: 1.7; color: ${colors.text}; }
                      .note-preview ul, .note-preview ol { padding-left: 22px; margin: 6px 0; }
                      .note-preview li { margin: 3px 0; line-height: 1.65; color: ${colors.text}; }
                      .note-preview blockquote { border-left: 3px solid ${colors.primary}; padding: 4px 0 4px 14px; margin: 8px 0; color: ${colors.textSecondary}; font-style: italic; }
                      .note-preview pre  { background: rgba(0,0,0,0.06); border-radius: 10px; padding: 12px 14px; margin: 10px 0; font-family: monospace; overflow-x: auto; }
                      .note-preview code { font-family: monospace; background: rgba(120,80,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 93%; }
                      .note-preview hr   { border: none; border-top: 1px solid ${colors.border}; margin: 14px 0; }
                      .note-preview strong { font-weight: 700; }
                      .note-preview em { font-style: italic; }
                      .note-preview a { color: ${colors.primary}; text-decoration: underline; }
                      .note-preview * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 16px; line-height: 1.7; }
                    `}</style>
                    {/* @ts-ignore */}
                    <div className="note-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </>
                : <Text style={{ color: colors.text, fontSize: 16, lineHeight: 27 }}>{content}</Text>
              : <Text style={{ color: colors.textTertiary, fontSize: 14, fontStyle: 'italic' }}>Nothing to preview yet.</Text>
            }
            <TouchableOpacity onPress={() => setMode('write')} style={[styles.editHintBtn, { borderColor: colors.border }]}>
              <Pencil size={13} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Back to editing</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── Draw mode ── */}
        {mode === 'draw' && (
          <View style={{ flex: 1 }}>
            {/* ── Draw Toolbar ── */}
            <View style={[styles.drawToolbar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>

              {/* Tool selector pills */}
              <View style={[styles.drawToolGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {([
                  { key: 'pen',         label: 'Pen',    icon: '✏️' },
                  { key: 'highlighter', label: 'Marker', icon: '🖊' },
                  { key: 'eraser',      label: 'Erase',  icon: '⬜' },
                ] as { key: DrawTool; label: string; icon: string }[]).map(tool => (
                  <TouchableOpacity
                    key={tool.key}
                    onPress={() => setDrawTool(tool.key)}
                    style={[
                      styles.drawToolBtn,
                      drawTool === tool.key && {
                        backgroundColor: tool.key === 'eraser' ? colors.error + '22' : colors.primary + '18',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{tool.icon}</Text>
                    <Text style={{
                      fontSize: 10, fontWeight: '700',
                      color: drawTool === tool.key
                        ? (tool.key === 'eraser' ? colors.error : colors.primary)
                        : colors.textTertiary,
                    }}>{tool.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Size dots */}
              <View style={[styles.drawToolGroup, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
                {[2, 4, 7].map(s => (
                  <TouchableOpacity key={s} onPress={() => setBrushSize(s)} style={styles.sizeDotBtn}>
                    <View style={{
                      width: Math.max(6, s * 2.2), height: Math.max(6, s * 2.2),
                      borderRadius: s * 2,
                      backgroundColor: brushSize === s ? (drawTool === 'eraser' ? colors.error : drawColor) : colors.textTertiary,
                      opacity: brushSize === s ? 1 : 0.3,
                    }} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color swatch — tap to open picker */}
              <TouchableOpacity
                onPress={() => setShowColorPicker(v => !v)}
                style={[styles.colorSwatchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: drawColor, borderWidth: 1.5, borderColor: colors.border }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Color</Text>
                <Text style={{ fontSize: 9, color: colors.textTertiary }}>{showColorPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              {/* Clear */}
              <TouchableOpacity onPress={clearCanvas} style={[styles.drawIconBtn, { borderColor: colors.border }]}>
                <Trash2 size={14} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Insert */}
              <TouchableOpacity onPress={insertDrawing} style={[styles.insertBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Insert ↑</Text>
              </TouchableOpacity>
            </View>

            {/* ── Color Picker Panel ── */}
            {showColorPicker && (
              <View style={[styles.colorPickerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {DRAW_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => {
                        setDrawColor(c);
                        if (drawTool === 'eraser') setDrawTool('pen');
                        setShowColorPicker(false);
                      }}
                      style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: c,
                        borderWidth: drawColor === c ? 3 : 1.5,
                        borderColor: drawColor === c ? colors.primary : colors.border,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Canvas ── */}
            {IS_WEB && (
              <canvas
                ref={canvasRef}
                style={{
                  flex: 1, width: '100%', display: 'block',
                  cursor: drawTool === 'eraser' ? 'cell' : 'crosshair',
                  touchAction: 'none',
                  backgroundColor: colors.card,
                } as any}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
              />
            )}
          </View>
        )}

        {/* ── Drawing lightbox ── */}
        {lightboxImg && IS_WEB && (
          <TouchableOpacity
            onPress={() => setLightboxImg(null)}
            style={{
              position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            {/* @ts-ignore */}
            <img
              src={lightboxImg}
              style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: 14, objectFit: 'contain' } as any}
            />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16 }}>Tap anywhere to close</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottomWidth: 0.5, gap: 6, flexWrap: 'wrap' },
  iconBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 0.5 },
  modeTab:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18, borderWidth: 0.5 },
  saveChip:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, borderWidth: 1 },

  aiBar:       { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, flexWrap: 'nowrap' },
  aiChip:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 0.5, flexShrink: 0 },
  askWrap:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, minWidth: 0 },
  aiOutput:    { borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 0.5 },

  fmtBarWrap:  { borderBottomWidth: 0.5, maxHeight: 46 },
  fmtBar:      { paddingHorizontal: 12, paddingVertical: 6, gap: 4, alignItems: 'center', flexDirection: 'row' },
  fmtBtn:      { width: 34, height: 34, borderRadius: 9, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  fmtDivider:  { width: 0.5, height: 22, marginHorizontal: 2 },

  templatesBox:   { borderWidth: 0.5, borderRadius: 16, padding: 14, marginBottom: 16 },
  templatesLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  templateChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 0.5 },

  titleInput:   { fontSize: 26, fontWeight: '800', marginBottom: 12, padding: 0, borderWidth: 0, letterSpacing: -0.5 },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' },
  tagInput:     { fontSize: 13, minWidth: 80, borderWidth: 0 },
  nbPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  divider:      { height: 0.5, marginBottom: 16 },
  contentInput: { fontSize: 16, lineHeight: 27, minHeight: 300, borderWidth: 0 },

  editHintBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 32, paddingVertical: 12, borderTopWidth: 0.5 },

  drawToolbar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, gap: 8 },
  drawToolGroup:   { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  drawToolBtn:     { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  sizeDotBtn:      { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  colorSwatchBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  drawIconBtn:     { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorPickerPanel:{ position: 'absolute' as any, top: 57, left: 0, right: 0, zIndex: 100, padding: 14, borderBottomWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  insertBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  imgDeleteBtn:    { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
