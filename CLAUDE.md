# Workspace — Claude Code Guide

## What this app is
**Workspace** is a student productivity app for Bellevue College students. It combines Canvas LMS integration, AI-powered study tools, notes, tasks, and a focus timer — all in one place. Built with Expo (React Native) targeting primarily the **web** platform via Metro bundler.

## Stack
| Layer | Tech |
|---|---|
| Framework | Expo SDK 52 + Expo Router (file-based routing) |
| Language | TypeScript |
| State management | Zustand with `localStorage` persistence (web-safe) |
| Styling | React Native `StyleSheet` + inline styles |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) via local proxy |
| Canvas LMS | REST API at `bc.instructure.com` via local proxy |
| Target platforms | Web (primary), iOS, Android |

## Running locally
```bash
# 1. Start the CORS proxy (required for Canvas + Claude API on web)
node canvas-proxy.js

# 2. Start Expo (use --clear to bust Metro cache after lib changes)
npx expo start --web --clear

# 3. Hard refresh browser after proxy/claude.ts changes (Ctrl+Shift+R)
```

## Proxy (`canvas-proxy.js`)
Runs on `http://localhost:3001`. Routes:
- `/api/*` → `https://bc.instructure.com` (Canvas)
- `/claude/*` → `https://api.anthropic.com/v1/*` (Anthropic)

Uses Google DNS (8.8.8.8) to avoid Windows `EAI_AGAIN` errors.

## Environment variables (`.env`)
```
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...
```

## Project structure
```
src/
  app/                  # Expo Router screens
    _layout.tsx         # Root layout + ThemedStatusBar
    index.tsx           # Redirect → /home or /auth/login
    home/               # Dashboard
    notes/              # Notes list + editor (with drawing canvas)
    tasks/              # Task manager (manual + Canvas assignments)
    focus/              # Pomodoro focus timer
    ai-studio/          # AI tools (summarize, flashcards, quiz, etc.)
    canvas/             # Canvas LMS integration
    settings/           # Settings + Grade Calculator
    auth/               # Login + Register
    onboarding/         # 5-step onboarding flow
  components/
    ui/                 # Button, Card, Badge, Input, EmptyState, LoadingSpinner
    layout/             # TabBar, ScreenWithTabs
  store/                # Zustand stores
    auth.ts             # User session + onboarding state
    notes.ts            # Notes + notebooks
    tasks.ts            # Tasks + Canvas import
    canvas.ts           # Canvas connection, courses, assignments
    focus.ts            # Timer state, sessions, streak
    settings.ts         # darkMode toggle
  lib/
    claude.ts           # Claude API wrapper (summarize, flashcards, quiz, etc.)
    canvas.ts           # Canvas REST API client
    theme.ts            # Colors (light/dark), spacing, radius, shadow
    gptzero.ts          # AI detection (GPTZero)
    storage.ts          # AsyncStorage helpers
  utils/
    helpers.ts          # fmt, priorityColor, showAlert, initials, wordCount
```

## Dark mode — critical pattern

**Never put `colors.*` values inside `StyleSheet.create()`** — those are evaluated once at module load using the static `lightColors` fallback and will NOT update when dark mode toggles.

```ts
// ✅ CORRECT — reactive, inside component
const colors = useColors();
<View style={{ backgroundColor: colors.card }}>

// ❌ WRONG — static, ignores dark mode
const styles = StyleSheet.create({ card: { backgroundColor: colors.card } });
```

Use `StyleSheet.create()` only for non-color properties (layout, padding, borderRadius, fontSize, etc.).

## Web-specific patterns

### Native HTML inputs (AI Studio)
`TextInput` inside `GestureHandlerRootView` swallows space keypresses on web. Use native `<textarea>`/`<input>` elements instead:
```tsx
if (Platform.OS === 'web') {
  return <textarea value={value} onChange={e => onChange(e.target.value)} ... />;
}
```

### SVG progress rings (Focus timer)
Use raw `<svg>` elements on web (Expo web supports them). Native uses `View` with `borderRadius`.

### Guards
Always wrap web-only features in `Platform.OS === 'web'`.

### Remove outline on inputs (web)
```tsx
Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}
```

## Avoiding the 1-letter input bug
Never define component functions **inside** another component's render body. React treats them as new component types each render → unmounts/remounts → input loses focus after every keystroke.

```tsx
// ❌ BAD — defined inside render, causes remount
function MyScreen() {
  function InnerInput() { return <TextInput ... />; }
  return <InnerInput />;
}

// ✅ GOOD — defined at module level, or inline JSX
function MyScreen() {
  return <TextInput ... />; // inline JSX is fine
}
```

## Stores
All Zustand stores persist to `localStorage` on web (custom storage adapter). Key stores:

| Store | Key state |
|---|---|
| `useAuthStore` | `user`, `isLoggedIn`, `hasOnboarded`, `logout()` |
| `useNotesStore` | `notes[]`, `notebooks[]`, CRUD methods |
| `useTasksStore` | `tasks[]`, `createTask()`, `importFromCanvas()` |
| `useCanvasStore` | `connected`, `courses[]`, `assignments[]`, `connect(token)`, `sync()` |
| `useFocusStore` | `sessions`, `totalFocusMinutes`, `streak`, `recordSession()` |
| `useSettingsStore` | `darkMode`, `toggleDarkMode()` |

## Claude API (`src/lib/claude.ts`)
All methods are async and call through the local proxy on web:
```ts
claude.summarize(text, 'medium')
claude.explainSimply(text, 'beginner')
claude.generateFlashcards(text, 5)
claude.generateQuiz(text, 5, 'medium')
claude.generateStudyGuide(text)
claude.improveWriting(text, 'clarity')
claude.parseSyllabus(text)
claude.emailDraft(context, 'professor')
claude.askNotes(question, notes)
claude.weeklyPlanner(tasks, hours)
```

If you get "Failed to fetch": ensure `node canvas-proxy.js` is running and restart Expo with `--clear`.

## Tab navigation
`TabBar` component renders a fixed bottom bar with 5 tabs: Home, Notes, Tasks, Focus, Settings. It reads the active route from `usePathname()`. AI Studio uses the same TabBar but also has a top nav bar (web only).

## Key helpers (`src/utils/helpers.ts`)
- `fmt.relative(date)` — "2 hours ago", "Yesterday"
- `fmt.dueDate(date)` — returns `{ label, color }` ("Due today" in red, etc.)
- `priorityColor(priority)` — color per priority level
- `showAlert(title, msg?, buttons?)` — wraps `Alert.alert`, no-op-safe on web
- `initials(name)` — "John Doe" → "JD"
- `wordCount(text)` — count words in a string

## Canvas integration
- Proxy path: `/api/v1/courses`, `/api/v1/users/self/todo`, etc.
- Token stored in Zustand + localStorage
- `canvasStore.connect(token)` fetches courses + assignments
- `canvasStore.sync()` re-fetches everything
- `tasksStore.importFromCanvas(assignments)` converts assignments to tasks

## Things NOT to do
- Don't hardcode dark colors (`#111`, `#1c1c2e`, `#1e1b4b`) — use `useColors()`
- Don't use `colors.*` in `StyleSheet.create()` for color properties
- Don't define component functions inside render functions
- Don't call the Anthropic API directly from the browser (CORS) — always use the proxy
- Don't skip `--clear` when changing files in `src/lib/` — Metro caches aggressively

## Current Development Status (as of 2026-04-12)

### Completed features
| Feature | File(s) |
|---|---|
| Tasks filter pills (no-scroll, fixed width) | `src/app/tasks/index.tsx` |
| Notes sort (newest/oldest/alpha/words) + notebook color bars | `src/app/notes/index.tsx` |
| Notes WYSIWYG editor (contenteditable + execCommand) | `src/app/notes/editor.tsx` |
| Notes PDF export + share | `src/app/notes/editor.tsx` |
| Global search screen | `src/app/search/index.tsx` |
| Home: search button + due-soon notifications | `src/app/home/index.tsx` |
| GPA calculator tab in grade calculator | `src/app/settings/grades.tsx` |
| Syllabus parser tool in AI Studio | `src/app/ai-studio/index.tsx` |
| Web Notification API utility | `src/lib/notifications.ts` |
| Notifications toggle in settings store | `src/store/settings.ts` |
| WebViewer component (iframe overlay) | `src/components/ui/WebViewer.tsx` |
| Canvas assignments "View" button → WebViewer | `src/app/canvas/index.tsx` |
| Study Buddy chat | `src/app/study-buddy/index.tsx`, `src/store/studyBuddy.ts` |

### Pending features (next phases)
1. **Email Draft UI** — `claude.emailDraft(context, type)` exists but no UI. Build at `/email` or as AI Studio tab. Types: `'professor' | 'extension' | 'internship' | 'group'`
2. **Weekly Planner UI** — `claude.weeklyPlanner(tasks, hours)` exists but no UI. Could be home card or tasks tab
3. **Offline mode** — Cache Canvas data; queue changes (complex, Phase 3)
4. **iOS/Android store submission** (Phase 4)

### Notes on the WYSIWYG editor
- Notes are stored as HTML on web (when `content.includes('<') && content.includes('</') && content.includes('>')`)
- Backward compat: on load, if no HTML tags detected, markdown is converted via `buildMarkdownHtml()`
- `contenteditable` div is **uncontrolled** — read `innerHTML` via `onInput`, never set via React state after mount
- `ceInitialized` ref prevents double-init
- Toolbar uses `document.execCommand` (bold, italic, formatBlock h1/h2, lists, blockquote, pre)
- CSS class `note-editor` applies visual styles for h1/h2/p/ul/ol/blockquote/code
- `handleSave` captures `contentRef.current.innerHTML` before navigating back
