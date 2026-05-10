# StageReady — Repository Changes Log

## Overview

This document records all structural and functional changes made to the **StageReadyIonic** repository to separate the web application from the mobile application and fully integrate the RAG backend.

---

## 1. Mobile UI Removal

**Goal:** Strip out all Ionic mobile-specific code so this repository becomes a clean web-only Angular application, allowing the mobile UI to live in its own separate repository.

### Deleted — Mobile-only page modules

| Folder | Purpose |
|--------|---------|
| `src/app/pages/tabs/` | Ionic tab bar navigation container |
| `src/app/pages/dashboard/` | Mobile dashboard page |
| `src/app/pages/speech-analysis/` | Mobile speech analysis page |
| `src/app/pages/speech-feedback/` | Mobile feedback display page |
| `src/app/pages/speech-history/` | Mobile speech history page |
| `src/app/pages/badges/` | Mobile badges page |
| `src/app/pages/badge-collection/` | Mobile badge collection page |
| `src/app/pages/profile/` | Mobile profile page |
| `src/app/pages/knowledge-base/` | Mobile knowledge base page |
| `src/app/home/` | Ionic login page |
| `src/app/newflow/` | Ionic onboarding + profile setup wizard |

> **Kept:** `src/app/pages/practice-mode/` — this module is lazy-loaded directly by `web-routing.module.ts` and is required by the web app.

### Deleted — Platform detection logic

- `src/app/guards/platform-redirect.guard.ts` — redirected to `/ionic-login` or `/web/login` based on Capacitor detection
- `src/app/services/platform-routing.service.ts` — detected mobile vs web platform and computed route prefixes

### Deleted — Mobile native configuration

- `capacitor.config.ts` — Capacitor native app config (`appId: io.ionic.starter`)
- `ionic.config.json` — Ionic CLI project config
- `android/` — Full Gradle-based Android native project

### Updated — Routing and module files

**`src/app/app-routing.module.ts`**
- Removed routes: `ionic`, `ionic-login`, `onboarding`, `setup-profile`, `speech-feedback`, `badges`, `badge-collection`, `speech-history`
- Removed `PlatformRedirectGuard` from the root route
- Root path `''` now redirects directly to `/web`
- Only two routes remain: `''` (redirect) and `web` (lazy-loaded `WebModule`)

**`src/app/app.module.ts`**
- Removed `RouteReuseStrategy` provider and `IonicRouteStrategy` (Ionic stack navigation strategy — only needed for tab/stack-based mobile navigation)
- `IonicModule.forRoot()` is retained because web components still use Ionic UI elements

**`src/app/app.component.ts`**
- Removed `PlatformRoutingService` dependency and `setupPlatformRouting()` call
- Retained `ToastController` for PWA install prompts, network status toasts, and service worker update notifications — all of which apply to the web app

**`src/app/guards/auth.guard.ts`**
- Removed branching logic that redirected to `/ionic-login` for mobile routes
- Simplified: unauthenticated users are always redirected to `/web/login`

---

## 2. Merge Conflict Resolution

After committing the mobile UI removal, pulling from `origin/main` caused conflicts because the remote had modifications to files we deleted (`src/app/pages/knowledge-base/`).

**Resolution:** Staged our deletions using `git rm` for the three conflicting files, then completed the merge commit. The upstream changes to `practice-mode` and `web-knowledge-base` (web-side files) were brought in and kept.

---

## 3. SCSS Deprecation Fix

**File:** `src/theme/shared-styles.scss`

**Problem:** The `gradient-background()` mixin used the deprecated `lighten()` and `darken()` Sass functions which are removed in modern Sass versions, causing build errors.

**Fix:**
- Added `@use 'sass:color';` at the top of the file (required for the modern color module)
- Replaced `lighten($background-color, 5%)` → `color.adjust($background-color, $lightness: 5%)`
- Replaced `darken($background-color, 5%)` → `color.adjust($background-color, $lightness: -5%)`

---

## 4. Broken Import Fix — `AnalyzeSpeechForFeedbackOutput`

**Problem:** The type `AnalyzeSpeechForFeedbackOutput` was defined inside the deleted `src/app/pages/speech-analysis/model.ts` mobile page file. Four files imported it from that path, causing TypeScript build errors after the page was deleted.

**Fix:** Created `src/app/models/speech-analysis.model.ts` as the canonical home for this shared type and updated all four import paths:

| File | Old import path | New import path |
|------|----------------|-----------------|
| `services/badge.service.ts` | `../pages/speech-analysis/model` | `../models/speech-analysis.model` |
| `services/speech-analysis-api.service.ts` | `../pages/speech-analysis/model` | `../models/speech-analysis.model` |
| `web/web-feedback/web-feedback.component.ts` | `../../pages/speech-analysis/model` | `../../models/speech-analysis.model` |
| `web/web-analysis/web-analysis.component.ts` | `../../pages/speech-analysis/model` | `../../models/speech-analysis.model` |

---

## 5. RAG Backend Full Integration

Three gaps were identified where the system was not fully utilizing the RAG backend. All three have been resolved.

---

### Gap 1 — `rag_metadata` was discarded

**Problem:** `/api/analyze-rag` returns two objects: `feedback` (LLM scores) and `rag_metadata` (which corpus references were retrieved and used). The frontend was doing `return data.feedback` and silently throwing away `rag_metadata`, meaning the corpus retrieval log was never stored or used.

**Files changed:**

**`src/app/services/speech-analysis-api.service.ts`**
- `analyzeTranscript()` now returns `{ feedback, rag_metadata }` instead of just `data.feedback`
- `analyzeWithGroq()` destructures both and passes `rag_metadata` to `mapToFeedbackOutput()`
- `mapToFeedbackOutput()` includes `rag_metadata` in the returned `AnalyzeSpeechForFeedbackOutput` object

**`src/app/models/speech-analysis.model.ts`**
- Added `RagMetadata` interface with typed fields: `corpus1_retrieved`, `corpus2_retrieved`, `weak_dimensions`
- Added `rag_metadata: RagMetadata | null` field to `AnalyzeSpeechForFeedbackOutput`

**Result:** `rag_metadata` is now included in the feedback object saved to Firebase, preserving the full RAG audit trail (which speeches from Corpus 1 were used as reference, which expert advice chunks from Corpus 2 were retrieved, and which dimensions were flagged as weak).

---

### Gap 2 — 5 of 7 acoustic features sent as `0` to the backend

**Problem:** Corpus 1 similarity search in the backend uses 7 acoustic features to find the most relevant reference speeches. The frontend was computing only 2 (`syllables_per_sec`, `pause_ratio`) and hardcoding the remaining 5 to `0`:

```
loud_mean        → 0  (was hardcoded)
loud_std         → 0  (was hardcoded)
pitch_std        → 0  (was hardcoded)
spectral_centroid → 0  (was hardcoded)
spectral_flux    → 0  (was hardcoded)
```

This meant the cosine similarity search in `retrieval.py` was effectively operating on only 2 dimensions instead of 7.

**Fix — Backend (`backend/RAGBackEnd/main.py`):**

Added `extract_acoustic_features(audio_bytes: bytes) -> dict` function that runs directly on the WAV audio bytes already received by `/api/transcribe`. Uses only `numpy` (already a dependency) and Python's stdlib `wave` module — no new dependencies required.

Features extracted:
- **`loud_mean` / `loud_std`** — RMS energy per 1024-sample frame
- **`spectral_centroid`** — FFT-based weighted mean frequency per hop
- **`spectral_flux`** — Frame-to-frame magnitude change from FFT
- **`pitch_std`** — Autocorrelation-based F0 estimation per 250ms window, standard deviation across voiced segments

`/api/transcribe` now appends `acoustic_features` to every Whisper response before returning it.

**Fix — Frontend (`src/app/services/speech-analysis-api.service.ts`):**

Updated `WhisperResponse` interface to include the optional `acoustic_features` field. `analyzeTranscript()` now reads the features from the transcription response:

```typescript
// Before
loud_mean: 0,  loud_std: 0,  pitch_std: 0,  spectral_centroid: 0,  spectral_flux: 0

// After
loud_mean:         af?.loud_mean         ?? 0,
loud_std:          af?.loud_std          ?? 0,
pitch_std:         af?.pitch_std         ?? 0,
spectral_centroid: af?.spectral_centroid ?? 0,
spectral_flux:     af?.spectral_flux     ?? 0,
```

---

### Gap 3 — Practice mode bypassed the RAG pipeline entirely

**Problem:** Web analysis (`/web/analysis`) called `/api/analyze-rag` for full RAG-calibrated scoring. Practice mode (`/web/practice-mode`) used a completely different path:

- 4 dimensions scored with local formulas (WPM math, word accuracy, filler rate, pause counts)
- 3 dimensions (`loudness_control`, `pitch_variation`, `expressive_emphasis`) scored via a plain `/api/chat` call

This meant practice mode received no Corpus 1 calibration and no Corpus 2 expert advice. The same audio could produce different scores depending on which flow was used.

**Fix — Backend (`backend/RAGBackEnd/main.py`):**

`/api/analyze-rag` now accepts an optional `reference_script` field in the request body. When provided, it is passed to `build_rag_prompt()`.

**Fix — Backend (`backend/RAGBackEnd/prompt_builder.py`):**

`build_rag_prompt()` now accepts `reference_script: str | None = None`. When provided:
- A **REFERENCE SCRIPT** block is injected into the prompt before the transcript
- The LLM is instructed to compare the transcript against the intended script
- The `articulation_clarity` scoring instruction is adjusted to measure word-reproduction accuracy rather than general clarity

**Fix — Frontend (`src/app/services/speech-analysis-api.service.ts`):**

`analyzePracticeSession()` now calls `/api/analyze-rag` with `reference_script` instead of `/api/chat`:

```typescript
body: JSON.stringify({
  transcript:       transcription.text,
  category,
  wpm:              actualWpm,
  pause_stats:      pauseStats,
  filler_count:     fillerData.count,
  user_metrics:     userMetrics,   // now includes real acoustic features
  reference_script: scriptText,    // new — enables script comparison in prompt
})
```

The `articulation_clarity` score from RAG is overridden with a score derived from `computeWordAccuracy()`, since only the local word-matching algorithm can precisely measure how closely the speaker reproduced the intended script.

Removed dead code: `scorePracticeDimensions()` (the old `/api/chat` call) and `computeAlgorithmicScores()` (the local formula scoring).

`PracticeAnalysisResult` now includes `ragMetadata` so the corpus references used in practice sessions are also preserved.

---

## Summary of Files Changed

### Backend (`backend/RAGBackEnd/`)

| File | Change |
|------|--------|
| `main.py` | Added `extract_acoustic_features()`, modified `/api/transcribe` to return acoustic features, added `reference_script` support to `/api/analyze-rag` |
| `prompt_builder.py` | Added `reference_script` parameter, injected Reference Script block, added practice vs freeform articulation scoring instructions |

### Frontend (`src/`)

| File | Change |
|------|--------|
| `app/app-routing.module.ts` | Web-only routing; root redirects to `/web` |
| `app/app.module.ts` | Removed `IonicRouteStrategy` |
| `app/app.component.ts` | Removed `PlatformRoutingService` |
| `app/guards/auth.guard.ts` | Always redirects to `/web/login` |
| `app/models/speech-analysis.model.ts` | Added `RagMetadata` interface; added `rag_metadata` field to `AnalyzeSpeechForFeedbackOutput` |
| `app/services/speech-analysis-api.service.ts` | Full acoustic features, `rag_metadata` propagation, practice mode now uses `/api/analyze-rag` |
| `app/services/badge.service.ts` | Updated import path for `AnalyzeSpeechForFeedbackOutput` |
| `app/web/web-analysis/web-analysis.component.ts` | Updated import path for `AnalyzeSpeechForFeedbackOutput` |
| `app/web/web-feedback/web-feedback.component.ts` | Updated import path for `AnalyzeSpeechForFeedbackOutput` |
| `theme/shared-styles.scss` | Replaced deprecated `lighten()`/`darken()` with `color.adjust()` |

### Deleted

| Path | Reason |
|------|--------|
| `src/app/pages/tabs/` through `knowledge-base/` (9 folders) | Mobile-only Ionic pages |
| `src/app/home/` | Mobile login page |
| `src/app/newflow/` | Mobile onboarding wizard |
| `src/app/guards/platform-redirect.guard.ts` | Mobile platform detection |
| `src/app/services/platform-routing.service.ts` | Mobile platform routing |
| `capacitor.config.ts` | Capacitor native config |
| `ionic.config.json` | Ionic CLI config |
| `android/` | Android native Gradle project |
