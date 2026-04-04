# Workspace 🎓

**Everything school, in one place.**

A premium student productivity app for iPhone, Mac, and Windows.

## Features

- 📝 **Smart Notes** — rich text editor, tags, notebooks, pinning, search, AI summaries inline
- ✅ **Tasks** — grouped by due date, priorities, Canvas import
- 🤖 **AI Studio** — Claude-powered summarizer, flashcards, quiz generator, study guides, writing tools, AI checker (GPTZero)
- 🎓 **Canvas LMS** — connect Bellevue College Canvas, sync assignments as tasks
- ⏱️ **Focus Timer** — Pomodoro with stats, streaks, session tracking
- 🧮 **Grade Calculator** — weighted grade calculation
- ⚙️ **Settings** — profile, notifications, integrations

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-your-key-here
EXPO_PUBLIC_CANVAS_BASE_URL=https://canvas.bellevuecollege.edu
EXPO_PUBLIC_CANVAS_CLIENT_ID=your-canvas-client-id
EXPO_PUBLIC_GPTZERO_API_KEY=your-gptzero-key-here
```

**Get Claude API key:** https://console.anthropic.com
**GPTZero key (optional):** https://gptzero.me (for AI writing checker)

### 3. Start the app
```bash
# For Windows
npx expo start

# Scan QR with Expo Go app on your phone
# Press 'w' for web preview
```

### 4. Canvas (optional)
- Get a developer key from Bellevue College IT
- Add the Client ID to `.env`
- Or use **Demo Mode** in the Canvas screen

## Architecture

```
src/
├── app/              # Expo Router screens
│   ├── auth/         # Login, Register
│   ├── home/         # Dashboard
│   ├── notes/        # Notes list + editor
│   ├── tasks/        # Task manager
│   ├── ai-studio/    # All AI tools
│   ├── canvas/       # Canvas LMS sync
│   ├── focus/        # Pomodoro timer
│   └── settings/     # Settings + grade calc
├── components/       # Reusable UI components
├── store/            # Zustand state (persisted)
├── lib/              # API clients (Claude, Canvas, GPTZero)
└── utils/            # Helpers, formatting
```

## Tech Stack

- **React Native + Expo** — cross-platform (iOS, Android, Windows, Web)
- **Expo Router** — file-based navigation
- **Zustand + AsyncStorage** — persistent state
- **Claude API** — AI features
- **GPTZero API** — AI writing detection
- **Canvas REST API** — LMS sync
