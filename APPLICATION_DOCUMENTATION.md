# StageReady Application Documentation

## Overview
StageReady is an Ionic + Angular mobile/web application designed for public speaking practice, speech analysis, and gamified learning. The app includes user authentication, onboarding, badges, practice mode, speech history, speech analysis, feedback, profile management, and a knowledge base.

## Key Features
- Authentication with Firebase
- Onboarding flow for new users
- Dashboard overview with progress and goals
- Gamification with badges and achievements
- Speech practice mode with guided scripts
- Speech analysis and feedback tools
- Speech history tracking
- Knowledge base for speaking tips and guidance
- Responsive shell layout that adapts to desktop and mobile views

## Mobile UI Behavior
- Desktop/tablet: left-side navigation menu remains visible
- Mobile: the left-side navigation is replaced by a bottom button bar
- The bottom navigation bar is implemented in `src/app/web/web-shell/web-shell.component.html`
- Mobile content receives extra bottom spacing to avoid overlap with navigation controls

## Project Structure

### Root files
- `angular.json`: Angular workspace configuration
- `package.json`: dependencies, scripts, and project metadata
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`: TypeScript configuration
- `global.scss`: global Ionic styles and theme imports

### Source directory (`src/`)
- `main.ts`: Angular bootstrap file
- `index.html`: application shell HTML
- `polyfills.ts`: required polyfills for browser compatibility
- `app/`: main application code

### Application modules and pages
- `app/app.module.ts`: root module and configuration
- `app/app-routing.module.ts`: global route definitions
- `app/web/`: web-specific module and routing
  - `web-routing.module.ts`: child routes for web application
  - `web-shell/`: main shell component with navigation layout
  - `web-dashboard/`: dashboard page
  - `web-badges/`: badge display page
  - `web-history/`: speech history page
  - `web-analysis/`: speech analysis page
  - `web-feedback/`: speech feedback page
  - `web-profile/`: user profile page
  - `web-knowledge-base/`: knowledge base page
  - `web-login/`: login page
  - `web-onboarding/`: onboarding page
- `app/pages/practice-mode/`: practice mode page module

### Services
- `app/services/firebase.service.ts`: Firebase authentication and data services
- `app/services/speech-analysis-api.service.ts`: speech analysis API integration
- `app/services/gamification.service.ts`: badge and gamification logic
- `app/services/adaptive-learning.service.ts`: adaptive content or learning rules
- `app/services/badge.service.ts`: badge data management
- `app/services/badge-notification.service.ts`: badge and event notifications
- `app/services/onboarding.service.ts`: onboarding state management
- `app/services/audio-recorder.service.ts`: audio recording and speech capture

### Models and data
- `app/models/`: TypeScript models for badges, gamification, speech data, and history
- `app/data/`: static badge and practice script data

### Assets
- `src/assets/`: app icons, badge artwork, onboarding graphics, and images
- `src/theme/`: shared theme variables and styles

## How to Run
1. Install dependencies

```bash
npm install
```

2. Serve the app locally

```bash
npm start
```

3. Build for production

```bash
npm run build:prod
```

4. Build Android APK (with Capacitor)

```bash
npx cap sync android
npx cap open android
```

> Note: Mobile navigation is optimized with a bottom button bar for small screens, making the app look more native and avoiding a desktop-like left menu.

## Important Files for Mobile UI
- `src/app/web/web-shell/web-shell.component.html`
- `src/app/web/web-shell/web-shell.component.scss`
- `src/app/web/web-shell/web-shell.component.ts`

## Notes
- The shell layout now uses `ion-split-pane` with `when="(min-width: 768px)"` so the split-pane layout is only active on larger screens.
- On mobile devices, the bottom navigation bar appears and the top menu button is hidden to keep the UI clean and app-like.
