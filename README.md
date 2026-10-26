# Khuluma API

**Gamified, AI-assisted REST API for learning South African languages (starting with isiZulu).**
PROG7314 / OPSC7312 — POE Part 2 · Group: *The Viltrumites*

This is the custom cloud-hosted REST API for the **Khuluma** Android app. Per the Part 1 design, the API — not the phone — does the heavy lifting: it serves all learning content and owns every gamification and learning rule (XP, streaks, levels, spaced-repetition scheduling, adaptive difficulty and AI coaching).

---

## Architecture

```
Android app (Kotlin/Compose, Retrofit)
        │  HTTPS + Firebase ID token
        ▼
  Khuluma REST API  (Node.js · Express · TypeScript)   ← this repo
        ├── MongoDB Atlas        (NoSQL: users, courses, lessons, reviews, attempts)
        ├── Firebase Admin       (verifies Google-SSO tokens)
        └── Google Gemini        (AI Buddy, mistake explanations, free-text grading)
```

The Android client only handles presentation and (in the POE phase) offline storage. All learning logic is centralised here so it is applied consistently for every learner.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | Firebase Authentication (Google SSO), verified with Firebase Admin |
| AI | Google Gemini (`gemini-2.5-flash`) |
| Hosting | Azure App Service |
| Tests / CI | Jest + ts-jest, GitHub Actions |

## API endpoints

All routes are under `/api` and require `Authorization: Bearer <Firebase ID token>` (except `/api/health`).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/me` | Profile, settings and progress |
| PUT | `/api/me/settings` | Update learner preferences |
| GET | `/api/courses/:lang/path` | Skill tree: units + lessons |
| GET | `/api/lessons/:id/next` | Adaptive exercises (recent mistakes first) |
| POST | `/api/attempts` | Submit an answer → correctness, XP, streak, level, review scheduling |
| GET | `/api/review/due` | Vocabulary due for spaced-repetition review |
| POST | `/api/ai/chat` | AI Buddy tutor |
| POST | `/api/ai/explain` | Plain-English "why was I wrong" |
| POST | `/api/ai/check-answer` | Grade a typed translation on meaning |
| GET | `/api/leaderboard` | Weekly XP league |
| GET | `/api/word-of-day` | Daily word + cultural note |
| POST | `/api/sync` | Replay actions performed offline |

`POST /api/attempts` is the core of the system — one call validates the answer, awards XP, updates the streak and level, schedules the next SM-2 review, unlocks achievements and updates the weekly league.

## Project structure

```
src/
  config/     env, MongoDB, Firebase Admin
  middleware/ auth (Firebase token), error handler
  models/     Mongoose schemas (User, Course, Lesson, Attempt, Review, ...)
  routes/     one file per resource, mounted in routes/index.ts
  services/   gamification (XP/streak/level), spacedRepetition (SM-2), gemini
  scripts/    seed.ts — isiZulu starter content
tests/        Jest unit tests (gamification + spaced repetition)
.github/workflows/ci.yml   build + test on every push
```

## Run it locally

**Prerequisites:** Node.js 20+, a MongoDB Atlas connection string.

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm run seed              # loads the isiZulu course, word-of-day, achievements
npm run dev               # starts on http://localhost:8080
curl http://localhost:8080/api/health
```

### Dev without Firebase/Gemini

For quick local testing set `AUTH_DEV_BYPASS=true` in `.env`. The API then trusts an
`x-dev-user` header instead of a Firebase token, so you can hit protected routes:

```bash
curl -H "x-dev-user: demo1" http://localhost:8080/api/me
curl -H "x-dev-user: demo1" -H "Content-Type: application/json" \
  -d '{"exerciseId":"l1e1","lessonId":"l1","answer":"Sawubona","responseMs":1800}' \
  http://localhost:8080/api/attempts
```

AI routes still need a real `GEMINI_API_KEY`; without one they return `503`.

## Environment setup

Copy `.env.example` → `.env` and fill in:

- **MongoDB Atlas** — create a free M0 cluster, then *Connect → Drivers* for `MONGODB_URI`.
- **Firebase** — create a project, enable **Google** sign-in, then *Project settings → Service accounts → Generate new private key*. Paste the JSON (one line) into `FIREBASE_SERVICE_ACCOUNT` and set `FIREBASE_PROJECT_ID`.
- **Gemini** — get a key from Google AI Studio → `GEMINI_API_KEY`.

Never commit `.env` (it is gitignored). Service keys stay on the server only.

## Deploy to Azure App Service

1. Create an App Service (Node 20 LTS, Linux).
2. In *Configuration → Application settings*, add the same variables from `.env` (`MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT`, `GEMINI_API_KEY`).
3. Set the startup command to `npm run start` (App Service runs `npm install` and `npm run build` on deploy).
4. Deploy from GitHub (Deployment Center) or with the Azure CLI. Your live base URL becomes `https://<app-name>.azurewebsites.net/api`, which the Android app's Retrofit client points to.

## Testing & CI

```bash
npm test        # Jest unit tests (19 tests: XP, streak, levels, SM-2)
npm run build   # TypeScript type-check + compile
```

`.github/workflows/ci.yml` runs the build and the full test suite on every push and pull request — satisfying the Part 2 requirement for GitHub Actions automated builds + unit tests.

## Team — The Viltrumites

| Member | Area |
|---|---|
| Shaun Bruce McClatchie (ST10434042) | — |
| McKale Keanu Naidoo (ST10066440) | — |
| Akwande Gqoboka (ST10198519) | — |
| Akshar Jadoonandan (ST10441329) | — |

## Academic note

Built for the IIE PROG7314 POE. Content and code are the team's own work; external
libraries and documentation are credited in the Part 1 design document and in code
comments where patterns were adopted.
