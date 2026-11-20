# Graph Report - StageReady  (2026-10-26)

## Corpus Check
- 176 files · ~63,489 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .scss 20, .xml 10, (none) 5)

## Summary
- 875 nodes · 1610 edges · 61 communities (31 shown, 30 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Badge Collection UI
- Firebase Data Service
- Angular Build Targets
- Practice Mode Page
- Session History Details
- Runtime Dependencies
- Badge Display & Rarity
- Auth & Onboarding Flow
- App Shell & PWA
- Audio Recorder Service
- TypeScript Config
- Dev Dependencies
- Speech Analysis API
- Speech Feedback View
- Knowledge Base & Quiz
- Feature NgModules
- App Bootstrap Module
- Angular Workspace Config
- Practice Script Sources
- Package Metadata
- Gamification & History Models
- Practice Script Loading
- Web Module & Dialogs
- Script Data & Weekly Plan
- Practice Calendar
- Scoring Dimensions & Feedback
- Routing & Guards
- Android Tests
- Web Dashboard
- Shared Angular Core Types
- Dashboard/Onboarding/Profile Concepts
- Adaptive Learning Engine
- npm Scripts
- Polyfills & Test Setup
- Service Worker Config
- ESLint Config
- Free-Speech Analysis
- MCP Typings
- Vercel Deploy Config
- Android MainActivity
- Chat API Function
- Transcribe API Function
- Capacitor Core
- Angular ESLint Plugin
- ESLint Template Parser
- Angular Language Service
- Capacitor CLI
- ESLint
- Jasmine Spec Reporter
- Karma
- Jasmine Types
- Node Types
- Prod Environment

## God Nodes (most connected - your core abstractions)
1. `FirebaseService` - 66 edges
2. `PracticeModePage` - 50 edges
3. `@angular/core` - 45 edges
4. `BadgeService` - 38 edges
5. `Badge` - 32 edges
6. `WebHistoryComponent` - 30 edges
7. `GamificationService` - 24 edges
8. `WebKnowledgeBaseComponent` - 24 edges
9. `WebAnalysisComponent` - 23 edges
10. `WebFeedbackComponent` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Badge Unlock Popup Template` --references--> `BadgeUnlockPopupComponent`  [INFERRED]
  src/app/components/badge-unlock-popup/badge-unlock-popup.component.html → src/app/components/badge-unlock-popup/badge-unlock-popup.component.ts
- `Practice Calendar Template` --references--> `PracticeCalendarComponent`  [INFERRED]
  src/app/components/practice-calendar/practice-calendar.component.html → src/app/components/practice-calendar/practice-calendar.component.ts
- `Badge Display Template` --references--> `BadgeDisplayComponent`  [INFERRED]
  src/app/components/badge-display/badge-display.component.html → src/app/components/badge-display/badge-display.component.ts
- `Badge Notification Template` --references--> `BadgeNotificationComponent`  [INFERRED]
  src/app/components/badge-notification/badge-notification.component.html → src/app/components/badge-notification/badge-notification.component.ts
- `Practice Mode Page Template` --references--> `PracticeModePage`  [INFERRED]
  src/app/pages/practice-mode/practice-mode.page.html → src/app/pages/practice-mode/practice-mode.page.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Web Shell Routed Feature Pages** — src_app_web_web_shell_web_shell_component_template, src_app_web_web_dashboard_web_dashboard_component_webdashboardcomponent, src_app_web_web_badges_web_badges_component_webbadgescomponent, src_app_web_web_history_web_history_component_webhistorycomponent, src_app_web_web_analysis_web_analysis_component_webanalysiscomponent, src_app_web_web_feedback_web_feedback_component_webfeedbackcomponent, src_app_web_web_knowledge_base_web_knowledge_base_component_webknowledgebasecomponent, src_app_web_web_profile_web_profile_component_webprofilecomponent [EXTRACTED 1.00]
- **Badge and Gamification UI Surfaces** — src_app_components_badge_collection_badge_collection_component_template, src_app_components_badge_display_badge_display_component_template, src_app_components_badge_notification_badge_notification_component_template, src_app_components_badge_unlock_popup_badge_unlock_popup_component_template, src_app_web_web_badges_web_badges_component_template, src_app_components_badge_display_badge_display_component_badge_rarity_system, src_app_components_badge_collection_badge_collection_component_badge_progress [INFERRED 0.85]
- **Script Practice Recording-Transcription-Scoring Pipeline** — src_app_pages_practice_mode_practice_mode_page_practice_session_flow, src_app_pages_practice_mode_practice_mode_page_live_wpm_tracking, src_app_pages_practice_mode_practice_mode_page_whisper_transcription, src_app_pages_practice_mode_practice_mode_page_word_accuracy_scoring, src_app_data_practice_scripts_sources_seven_speech_dimensions [INFERRED 0.85]

## Communities (61 total, 30 thin omitted)

### Community 0 - "Badge Collection UI"
Cohesion: 0.06
Nodes (24): rxjs@~7.8.0, rxjs, BadgeCollectionComponent, Badge Collection Template, BADGE_CRITERIA, BADGE_DEFINITIONS, Badge, BadgeCategory (+16 more)

### Community 1 - "Firebase Data Service"
Cohesion: 0.06
Nodes (4): UserGamification, FirebaseService, GamificationService, WebProfileComponent

### Community 2 - "Angular Build Targets"
Cohesion: 0.05
Nodes (49): architect, build, extract-i18n, lint, serve, test, builder, configurations (+41 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @angular/animations@^19.0.0, @angular/cdk@^19.0.0, @angular/compiler@^19.0.0, @angular/core@^19.0.0, @angular/forms@^19.0.0, @angular/material@^19.0.0, @angular/router@^19.0.0 (+24 more)

### Community 6 - "Badge Display & Rarity"
Cohesion: 0.07
Nodes (7): Badge Rarity and Category System, BadgeDisplayComponent, Badge Display Template, BadgeNotificationComponent, Badge Notification Template, BadgeNotificationModule, Badge Unlock Popup Template

### Community 7 - "Auth & Onboarding Flow"
Cohesion: 0.09
Nodes (6): OnboardingGuard, OnboardingService, Google Sign-In, Web Login Template, WebLoginComponent, WebOnboardingComponent

### Community 8 - "App Shell & PWA"
Cohesion: 0.09
Nodes (8): AppComponent, PWA Install Prompt (installApp), App Root Template, BadgeUnlockPopupComponent, BadgeNotificationService, Ionicons 5.5.2 CDN Scripts, index.html PWA Host Page, Web App Manifest Link

### Community 10 - "TypeScript Config"
Cohesion: 0.07
Nodes (29): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave, compilerOptions, allowArbitraryExtensions (+21 more)

### Community 11 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): devDependencies, @angular/cli@^19.0.0, @angular-devkit/build-angular@^19.0.0, eslint-plugin-import@^2.29.1, eslint-plugin-jsdoc@^48.2.1, eslint-plugin-prefer-arrow@1.2.2, @ionic/angular-toolkit@^12.0.0, karma-chrome-launcher@~3.2.0 (+19 more)

### Community 12 - "Speech Analysis API"
Cohesion: 0.14
Nodes (8): AnalyzeSpeechForFeedbackOutput, RagMetadata, PauseDetail, PauseStats, PracticeAnalysisResult, SpeechAnalysisApiService, WhisperResponse, WhisperWord

### Community 13 - "Speech Feedback View"
Cohesion: 0.10
Nodes (3): WebFeedbackComponent, Web Shell Navigation Template, WebShellComponent

### Community 14 - "Knowledge Base & Quiz"
Cohesion: 0.10
Nodes (4): Open-Source Speaking Resource Library, Speech Knowledge Quiz Game, Knowledge Base Template, WebKnowledgeBaseComponent

### Community 15 - "Feature NgModules"
Cohesion: 0.14
Nodes (10): @angular/common@^19.0.0, @angular/common, @angular/forms, @ionic/angular, BadgeCollectionModule, BadgeDisplayModule, PracticeModePageModule, PracticeModePageRoutingModule (+2 more)

### Community 16 - "App Bootstrap Module"
Cohesion: 0.12
Nodes (12): @angular/platform-browser@^19.0.0, @angular/service-worker@^19.0.0, swiper@^11.2.10, @angular/platform-browser, @angular/service-worker, swiper, app, AppModule (+4 more)

### Community 17 - "Angular Workspace Config"
Cohesion: 0.11
Nodes (18): prefix, projectType, root, schematics, sourceRoot, cli, analytics, schematicCollections (+10 more)

### Community 18 - "Practice Script Sources"
Cohesion: 0.12
Nodes (19): Brown (2010) The Gifts of Imperfection, Clear (2018) Atomic Habits, Difficulty Tiers and WPM Ranges (Beginner 110-130, Intermediate 120-140, Advanced 130-155), Dweck (2006) Mindset, Hawking (1988) A Brief History of Time, Informative Scripts (info-1..15), Kahneman (2011) Thinking, Fast and Slow, Kennedy (1962) Rice University Address (+11 more)

### Community 19 - "Package Metadata"
Cohesion: 0.12
Nodes (16): author, description, @angular/compiler-cli@^19.0.0, @angular-eslint/builder@^19.0.0, @angular-eslint/eslint-plugin-template@^19.0.0, @angular-eslint/schematics@^19.0.0, jasmine-core@~5.1.0, homepage (+8 more)

### Community 20 - "Gamification & History Models"
Cohesion: 0.25
Nodes (10): firebase@^12.0.0, firebase, DAILY_CHALLENGES, DailyChallenge, XP_PER_LEVEL, XP_REWARDS, XPReward, SpeechHistoryEntry (+2 more)

### Community 22 - "Web Module & Dialogs"
Cohesion: 0.19
Nodes (4): @angular/material, SpeechTypeDialogComponent, WebModule, WebRoutingModule

### Community 23 - "Script Data & Weekly Plan"
Cohesion: 0.19
Nodes (9): PRACTICE_SCRIPTS, ScriptTargetLevel, Category, DIM_LABELS, Step, DIM_LABELS, DIMS, RecommendedScript (+1 more)

### Community 25 - "Scoring Dimensions & Feedback"
Cohesion: 0.16
Nodes (14): Articulation Clarity Dimension, Expressive Emphasis Dimension, Filler Words Score Dimension, Loudness Control Dimension, Pausing Fluency Dimension, Pitch Variation Dimension, Seven Speech Scoring Dimensions, Speech Pace Dimension (+6 more)

### Community 26 - "Routing & Guards"
Cohesion: 0.26
Nodes (4): @angular/router, AuthGuard, OnboardingData, routes

### Community 29 - "Shared Angular Core Types"
Cohesion: 0.22
Nodes (5): @angular/core, CalendarDay, KnowledgeResource, QuizCategory, QuizQuestion

### Community 30 - "Dashboard/Onboarding/Profile Concepts"
Cohesion: 0.20
Nodes (10): Badge Progress (unlocked/total/percentage), Practice Streak Tracking (current, longest, total days), Practice Calendar Template, Script Word-Accuracy Scoring and Comparison, Web Dashboard Template, XP, Level and Daily Challenge Gamification, Onboarding Wizard (Welcome, Profile, Goals, All Set), Web Onboarding Template (+2 more)

### Community 32 - "npm Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:prod, build:pwa, lint, ng, start, test (+1 more)

### Community 33 - "Polyfills & Test Setup"
Cohesion: 0.29
Nodes (4): @angular/platform-browser-dynamic@^19.0.0, zone.js@~0.15.0, @angular/platform-browser-dynamic, zone.js

### Community 34 - "Service Worker Config"
Cohesion: 0.40
Nodes (4): assetGroups, dataGroups, index, $schema

### Community 36 - "ESLint Config"
Cohesion: 0.50
Nodes (3): ignorePatterns, overrides, root

### Community 37 - "Free-Speech Analysis"
Cohesion: 0.50
Nodes (4): Audio Recording and Level Visualizer, Speech Type Selection Gate, Free Speech Practice (Web Analysis) Template, Free-Speech Weighted Scoring (Pace 50%, Fillers 30%, Structure 10%, Engagement 10%)

### Community 38 - "MCP Typings"
Cohesion: 0.50
Nodes (3): Client, @modelcontextprotocol/sdk, @modelcontextprotocol/sdk/client/index.js

### Community 39 - "Vercel Deploy Config"
Cohesion: 0.50
Nodes (3): buildCommand, outputDirectory, rewrites

## Knowledge Gaps
- **35 isolated node(s):** `PRACTICE`, `PROGRESS`, `PERFORMANCE`, `SPECIAL`, `LEARNING` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 329 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `Shared Angular Core Types` to `Badge Collection UI`, `Polyfills & Test Setup`, `Runtime Dependencies`, `Badge Display & Rarity`, `Speech Analysis API`, `Feature NgModules`, `App Bootstrap Module`, `Package Metadata`, `Gamification & History Models`, `Web Module & Dialogs`, `Script Data & Weekly Plan`, `Routing & Guards`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `PracticeModePage` (e.g. with `Practice Mode Page Template` and `Web Dashboard Template`) actually correct?**
  _`PracticeModePage` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PRACTICE`, `PROGRESS`, `PERFORMANCE` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Badge Collection UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05502392344497608 - nodes in this community are weakly interconnected._
- **Why does `PracticeModePage` connect `Practice Mode Page` to `Audio Recorder Service`, `Speech Analysis API`, `Speech Feedback View`, `Feature NgModules`, `Practice Script Sources`, `Practice Script Loading`, `Script Data & Weekly Plan`, `Dashboard/Onboarding/Profile Concepts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `Firebase Data Service` be split into smaller, more focused modules?**
  _Cohesion score 0.056866303690260134 - nodes in this community are weakly interconnected._
- **Why does `FirebaseService` connect `Firebase Data Service` to `Badge Collection UI`, `Practice Mode Page`, `Session History Details`, `Auth & Onboarding Flow`, `Audio Recorder Service`, `Speech Feedback View`, `Gamification & History Models`, `Practice Script Loading`, `Web Module & Dialogs`, `Script Data & Weekly Plan`, `Practice Calendar`, `Routing & Guards`, `Web Dashboard`, `Shared Angular Core Types`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._