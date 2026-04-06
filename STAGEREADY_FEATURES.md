# StageReady — Application Documentation

## Overview

**StageReady** is a cross-platform AI-powered speech coaching application built as a thesis project. It helps users improve their public speaking skills through real-time analysis, guided practice, gamification, and personalized AI feedback. It runs as both a **mobile app** (Ionic/Capacitor for Android) and a **web app** (Angular SPA), sharing the same codebase.

---

## Tech Stack

### Frontend Framework
| Layer | Technology |
|---|---|
| Framework | **Ionic v8** + **Angular v19** |
| Architecture | NgModule-based (not standalone) — lazy-loaded feature modules |
| UI Components | Ionic components (mobile), Angular Material v19 (web) |
| Icons | Ionicons v7 |
| Styling | SCSS with CSS custom properties |
| Routing | Angular Router with platform-aware lazy loading (`/ionic/` and `/web/`) |
| Native Bridge | **Capacitor v7** (Android deployment) |
| PWA | Angular Service Worker (`@angular/service-worker`) |

### AI & Speech APIs
| Purpose | Technology |
|---|---|
| Speech-to-text / Transcription | **Groq Whisper** (`whisper-large-v3-turbo`) via Groq API — `verbose_json` format with word-level timestamps |
| Coaching Feedback (LLM) | **Groq LLaMA 3.3 70B Versatile** — structured JSON output at `temperature: 0.2` |
| Real-time Speech Recognition (Practice Mode) | **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) — `continuous: true`, `interimResults: true` |

### Backend / Cloud
| Purpose | Technology |
|---|---|
| Authentication | **Firebase Authentication** (Google Sign-In) |
| Database | **Cloud Firestore** — speech history, user profiles, badges, gamification state |
| File Storage | **Firebase Storage** — audio blob uploads |

### Key Libraries
- `rxjs ~7.8` — reactive streams for API orchestration
- `@angular/cdk` — overlay/dialog primitives
- `swiper v11` — carousel components
- `buffer v6` — binary buffer polyfill for audio processing

---

## Application Features

### 1. Dual Platform Shell
Two separate UI shells sharing the same Angular modules:
- **Mobile shell** (`/ionic/`) — tab-based navigation with Ionic components, native Android build via Capacitor
- **Web shell** (`/web/`) — sidebar navigation with Angular Material, full desktop-optimized layout

---

### 2. Speech Analysis
**Route:** `/ionic/speech-analysis` · `/web/analysis`

The core feature of the app. The user records a speech (any length), selects a category, and receives a full AI-powered breakdown.

**Recording pipeline:**
- `AudioRecorderService` captures microphone input as WebM/WAV
- Audio is sent to **Groq Whisper** (`whisper-large-v3-turbo`) with a bias prompt to retain filler words and hesitation sounds
- Whisper returns a `verbose_json` response with the full transcript and **word-level timestamps** for every spoken word

**Filler word detection — dual strategy:**
1. **Token scan** — scans Whisper's word token array for exact filler matches (has precise timestamps)
2. **Text scan** — regex-scans the raw transcript for fillers Whisper may have silently normalized (e.g. "um", "uh"), estimates timestamps from word position and average speech rate
3. Results from both strategies are merged and deduplicated by timestamp proximity (< 0.5s window)

**Pause & fluency analysis:**
- Gap-based detection across consecutive word tokens (threshold: 0.4 s)
- Reports: total pause count, average duration, longest pause, total silence time, and the top 15 notable pauses with timestamps
- **Rolling WPM segments** — 10-word sliding window (stepped every 5 words) across word timestamps identifies the fastest speech bursts, returning the top 5 with their timestamps and WPM values

**Scoring — 1 to 5 scale:**
| Dimension | How scored |
|---|---|
| Speech Pace | Pre-computed from WPM (120–150 = 5, etc.) |
| Pausing & Fluency | LLM inference from pause count and average duration |
| Volume Control | LLM inference from sentence structure and exclamation patterns |
| Pitch Variation | LLM inference from punctuation, question marks, emotional range |
| Articulation & Clarity | LLM inference from sentence completeness and word choice |
| Expressiveness | LLM inference based on category-appropriate energy |
| Filler Words | Pre-computed from filler count (0 = 5, ≤2 = 4, ≤5 = 3, etc.) |

**Overall score — category-weighted:**
The overall score is NOT an LLM output — it is computed deterministically using category-specific weights:

| Metric | Informative | Persuasive | Motivational |
|---|---|---|---|
| Speech Pace | 16% | 15% | 13% |
| Pausing & Fluency | 13% | 12% | 12% |
| Volume Control | 14% | 12% | 14% |
| Pitch Variation | 12% | 17% | 18% |
| Articulation | 17% | 17% | 15% |
| Filler Words | 18% | 8% | 6% |
| Expressiveness | 10% | 19% | 22% |

**LLM Coach Report (LLaMA 3.3 70B):**
The LLM is instructed at `temperature: 0.2` with strict rules:
- Must quote exact phrases from the transcript
- Must reference specific metrics (WPM, filler count, pause data)
- Zero generic praise allowed
- Produces: `overall_assessment`, `strengths[]`, `improvements[]`, `closing_message`, and 7 per-dimension feedback strings

---

### 3. Speech Feedback Page
**Route:** `/ionic/speech-feedback` · `/web/feedback`

A comprehensive multi-section results dashboard displayed after every speech analysis:

1. **Score Hero** — Grade ring (A/B/C/D/F) with conic-gradient fill showing overall percentage, category label, duration, and WPM
2. **Transcript** — Full transcript with filler words highlighted inline using `<mark>` tags
3. **Quick Stats Row** — At-a-glance pills: filler count, pause count, average pause, longest pause
4. **Coach's Report** — Overall assessment (with transcript quotes), strengths list, improvements list (numbered, actionable), closing message
5. **Score Breakdown** — Animated bar chart for all 7 dimensions, each showing score/5, label (Excellent/Good/Fair/Poor/Very Poor), and a coach sentence specific to that dimension
6. **Filler Word Analysis** — Total count, percentage of words, word-frequency chips ("um" × 4), timestamped timeline of every filler occurrence
7. **Pausing & Fluency** — Pause statistics (count, average, longest, total silence), notable pauses timeline with timestamps, ⚡ Fastest Moments showing top 5 WPM bursts with timestamps, and coach note

---

### 4. Practice Mode (Karaoke)
**Route:** `/ionic/tabs/practice-mode` · `/web/practice-mode`

A guided script-reading session modelled after karaoke — the user reads a pre-written script aloud and the app tracks their progress in near real-time.

**Flow:**
1. **Category selection** — Informative, Persuasive, or Motivational
2. **Script selection** — 3 scripts per category (9 total), each with difficulty rating and estimated duration
3. **Live session** — karaoke-style reading with real-time word tracking
4. **Results** — completion rate, average WPM, filler word count, pace rating

**Word tracking system:**
- `confirmedWordIndex` — advances only on FINAL Web Speech API results (ground truth)
- `liveWordIndex` — advances on every INTERIM event for near-instant visual feedback
- Words are highlighted using background-color only (no bold/font-weight changes) to prevent text reflow during reading
- Word states: `spoken` (dimmed), `live` (blue highlight), `current` (bright highlight + glow pulse)
- SR restarts with a 30ms gap to stay nearly continuous
- Fuzzy matching handles contractions spoken without apostrophes (e.g. "dont" → "don't")

**Smart filler detection:**
- When a script is selected, the app pre-scans it for filler words that appear intentionally in the script text (e.g. "well", "like", "actually")
- Those words are added to a `scriptFillerWords` set and excluded from filler detection during the session
- Only extra, unscripted hesitation words (e.g. "um", "uh", "er") are counted as filler mistakes

**Live pace tracker:**
- Rolling 30-second WPM window updated every second
- Color-coded pace gauge (Too Slow / A bit slow / Great pace! / A bit fast / Too fast)

---

### 5. Gamification
**Service:** `GamificationService`, `BadgeService`

- **XP system** — users earn XP for completing speeches, first speech of the day, and streak milestones
- **Level progression** — XP accumulates toward the next level threshold (`XP_PER_LEVEL`)
- **Streak tracking** — daily login/speech streak maintained in Firestore with automatic reset logic
- **Daily challenges** — rotating challenges stored in Firestore (`DailyChallenge` model)
- **Badges** — unlockable achievements tracked via `UserBadgeProgress`; badge unlock notifications via `BadgeNotificationService`

---

### 6. Speech History
**Route:** `/ionic/tabs/speech-history` · `/web/history`

Displays all past speech sessions saved to Firestore, including transcript, scores, category, and date. Users can review past feedback.

---

### 7. Knowledge Base
**Route:** `/ionic/tabs/knowledge-base` · `/web/knowledge-base`

A curated library of public speaking tips, techniques, and resources. Content is loaded from a local fallback dataset (no external API dependency).

---

### 8. Profile & Progress
**Route:** `/ionic/tabs/profile` · `/web/profile`

- User profile (Google account info)
- XP bar and current level display
- Average scores per dimension across all speech sessions
- Streak count and badge collection summary

---

### 9. Badge Collection
**Route:** `/ionic/tabs/badges` · `/web/badges`

Full gallery of all unlockable badges, showing locked/unlocked state, progress bars, and unlock dates.

---

## Data Flow

```
User Records Audio
       │
       ▼
AudioRecorderService → WebM/WAV Blob
       │
       ▼
Groq Whisper API (whisper-large-v3-turbo)
  → verbose_json with word-level timestamps
       │
       ├─→ detectFillers()   (token scan + text scan, deduplicated)
       ├─→ analyzePauses()   (gap-based + rolling WPM segments)
       │
       ▼
Groq LLaMA 3.3 70B (temperature 0.2, JSON mode)
  → coach report, per-dimension feedback strings
       │
       ▼
assembleResponse()
  → weighted overall score (category-specific)
  → full feedback object
       │
       ├─→ Navigate to SpeechFeedbackPage (state transfer)
       └─→ Firebase Firestore (save history, XP, badges) [background]
```

---

## AI Model Recommendation

### Current AI Usage
The app currently uses two Groq-hosted models for all AI features:
- **Whisper large-v3-turbo** — transcription with word timestamps
- **LLaMA 3.3 70B** — coaching feedback generation

The LLM handles all scoring for qualitative dimensions and all text generation. Two dimensions (Speech Pace and Filler Words) are already scored deterministically from computed metrics.

### Recommended: Hybrid AI Architecture

A trained ML model for scoring (separate from the LLM used for coaching language) would significantly improve consistency and reproducibility. The LLM is non-deterministic even at low temperature — the same speech may receive different scores on different runs. A trained classifier produces the same score every time and runs in milliseconds.

The project already has `Speeches_Dataset_Clean.csv` and `Speeches_Dataset_Clean_Expanded.csv` which could be used as training data.

**Recommended approach:**
- Train a regression or classification model (scikit-learn / TensorFlow Lite) on the existing speech dataset to predict scores for each dimension
- Extract acoustic features (MFCCs, pitch, energy, zero-crossing rate) from audio using `librosa` or `pyAudioAnalysis`
- Deploy as a lightweight API (FastAPI) or convert to TensorFlow Lite / ONNX for on-device inference via Capacitor plugin
- Keep the LLM **only** for generating the text feedback (coach report, improvement suggestions) — it is well-suited for language generation but not for numerical scoring

---

## 10 Feature Recommendations

### 1. 🎙️ Real-Time Audio Feature Extraction Model
Train a custom model on the existing speech dataset to extract and score acoustic features directly from the audio waveform — MFCCs, pitch variance, energy envelope, speaking rate, and voice tremor. Replace LLM-based scoring of volume, pitch, and expressiveness with this model for consistent, near-instant results without an API call.

### 2. 📈 Progress Trend Analytics Dashboard
Add a dedicated analytics page showing score trends over time per dimension (line charts), personal bests, average improvement rate per month, and a heatmap calendar of speech activity. Firebase already stores all historical data — this is a visualization layer on top of existing data. Helps users see concrete growth rather than just individual session results.

### 3. 🗣️ AI Pronunciation Coach
Integrate a phoneme-level pronunciation analysis model (e.g. wav2vec 2.0 fine-tuned for pronunciation scoring, or CMU Pronouncing Dictionary matching). After each speech, highlight specific words that were mispronounced or difficult to understand, with the correct phonetic breakdown shown. Especially useful for non-native English speakers.

### 4. 🎭 Emotion & Tone Detection
Run a sentiment/emotion classifier (e.g. a fine-tuned RoBERTa or a dedicated audio emotion model like `speech-emotion-recognition`) on the transcript or audio to detect emotional range — confident, nervous, enthusiastic, monotone, anxious. Display a timeline of emotional shifts during the speech and compare the emotional arc to what the speech category demands (motivational speeches should have rising energy).

### 5. 👁️ Posture & Eye Contact Analysis (Vision)
Using the device camera and a pose estimation model (MediaPipe Pose or BlazePose via TensorFlow.js), analyze body language during speeches recorded via the front camera — head nodding, shoulder tension, eye contact direction, hand gestures. Score posture and non-verbal communication as additional dimensions in the feedback report.

### 6. 🔁 AI-Powered Script Generator
Add a "Generate Practice Script" feature where the user specifies a topic, category (informative/persuasive/motivational), difficulty level, and target duration. The LLM generates a custom script tailored to their stated weaknesses (e.g. if their pitch variation score is low, generate a script with dramatic highs and lows). Scripts are saved to the user's personal library.

### 7. 🧑‍🏫 Conversational AI Speech Coach
Add an in-app chat interface where users can ask the AI coach follow-up questions about their feedback ("Why was my pace score only 3?"), request specific drills ("Give me a tongue twister for articulation"), or get personalized study plans ("I have a presentation in 2 days, what should I practice?"). Use LLaMA or Claude with the user's speech history as context.

### 8. 🏆 Multiplayer / Peer Comparison Mode
Allow users to submit speeches to a community leaderboard (by category and difficulty) and compare their scores against peers with similar levels. Add a "Challenge" feature where two users record the same script and both receive the analysis side-by-side. Peer benchmarking is one of the strongest motivators for skill development.

### 9. 🔊 Noise & Environment Analysis
Before a speech session begins, analyze the ambient audio environment using a noise classification model (YAMNet or similar) and warn the user if background noise levels are high enough to affect transcription quality. Also post-process the Whisper transcript with a confidence score and flag low-confidence word regions that may have been misheard.

### 10. 📚 Adaptive Learning Path (AI Curriculum)
Based on the user's score history across all dimensions, automatically generate a personalized weekly practice plan — selecting scripts from the library that specifically target weak areas, setting achievable WPM goals for the next session, and adjusting difficulty as scores improve. An LSTM or simple rule-based recommendation engine could power this using the existing Firestore data, making the app feel like a personalized tutor rather than a generic recording tool.

### 11. 🎬 Video Recording Mode with Facial Analysis
Extend the recording feature to capture video (front camera) alongside audio. Use a facial landmark model (MediaPipe Face Mesh) to analyze facial expressiveness — smiling frequency, eyebrow movement, mouth opening (for projection), and eye contact with the camera. Add a "Visual Expressiveness" score dimension to the feedback report.

### 12. 🧘 Nervousness / Anxiety Detector
Train a binary classifier on acoustic features (voice tremor via jitter/shimmer, breath sounds, speech rate acceleration, pitch spikes) to detect signs of nervousness during a speech. Show a "Confidence Timeline" in the feedback that maps anxious moments to their timestamps, allowing the user to identify which parts of their speech made them most nervous and practice those sections specifically.
