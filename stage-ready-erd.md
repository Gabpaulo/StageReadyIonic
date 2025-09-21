# StageReady Application - Entity Relationship Diagram (ERD)

## Overview
This ERD represents the complete data model for the StageReady Ionic application, a speech analysis and coaching platform that helps users improve their public speaking skills through AI-powered feedback and gamification.

## Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        string uid PK "Firebase Auth UID"
        string email "User email from Google Auth"
        string firstName "First name"
        string lastName "Last name"
        number age "User age"
        string phoneNumber "Phone number"
        string gender "User gender"
        array interests "Array of interests/tags"
        string bio "User biography"
        timestamp createdAt "Profile creation date"
        timestamp updatedAt "Profile last updated"
    }

    SPEECH_SESSION {
        string id PK "Unique speech session ID"
        string userId FK "Reference to USER.uid"
        string transcript "Speech transcription text"
        object feedback "AI-generated feedback object"
        timestamp createdAt "When speech was recorded"
        number duration "Speech duration in seconds"
        number wordCount "Number of words spoken"
        number averagePace "Words per minute"
        string audioUrl "Firebase Storage URL for audio"
        string audioData "Base64 audio data (legacy)"
        string audioMimeType "Audio file MIME type"
    }

    SPEECH_FEEDBACK {
        string sessionId FK "Reference to SPEECH_SESSION.id"
        string pace "Pace rating (excellent/good/fair/poor)"
        string tone "Tone rating (excellent/good/fair/poor)"
        string clarity "Clarity rating (excellent/good/fair/poor)"
        object fillerWords "Filler words analysis object"
    }

    FILLER_WORD_DETECTION {
        string word "Filler word detected"
        number timestamp "Timestamp in speech"
        string sessionId FK "Reference to SPEECH_SESSION.id"
    }

    USER_BADGE_PROGRESS {
        string userId PK "Reference to USER.uid"
        array badgeProgress "Array of badge progress objects"
        number totalBadges "Total available badges"
        number unlockedCount "Number of unlocked badges"
        timestamp lastUpdated "Last badge update timestamp"
    }

    BADGE_DEFINITION {
        string id PK "Unique badge identifier"
        string name "Badge display name"
        string description "Badge description"
        string icon "Ionic icon name"
        string category "Badge category enum"
        string rarity "Badge rarity enum"
        number maxProgress "Maximum progress needed"
    }

    BADGE_CRITERIA {
        string badgeId PK "Reference to BADGE_DEFINITION.id"
        string type "Criteria type enum"
        number value "Required value for unlock"
        string condition "Comparison condition"
        string ratingType "Rating type for criteria"
        string ratingValue "Required rating value"
    }

    USER_BADGE_INSTANCE {
        string userId FK "Reference to USER.uid"
        string badgeId FK "Reference to BADGE_DEFINITION.id"
        boolean isUnlocked "Whether user has unlocked"
        date unlockedAt "When badge was unlocked"
        number progress "Current progress value"
    }

    SPEECH_HISTORY_SUMMARY {
        string userId PK "Reference to USER.uid"
        number totalSessions "Total speech sessions"
        number averageClarity "Average clarity score"
        number averagePace "Average pace score"
        number averageTone "Average tone score"
        number totalWords "Total words spoken"
        number totalDuration "Total practice time"
        date lastSession "Last practice date"
        string improvementTrend "Trend: improving/stable/declining"
    }

    USER ||--o{ SPEECH_SESSION : "records"
    USER ||--|| USER_BADGE_PROGRESS : "has"
    USER ||--o{ USER_BADGE_INSTANCE : "earns"
    USER ||--|| SPEECH_HISTORY_SUMMARY : "has"
    SPEECH_SESSION ||--|| SPEECH_FEEDBACK : "generates"
    SPEECH_SESSION ||--o{ FILLER_WORD_DETECTION : "contains"
    BADGE_DEFINITION ||--|| BADGE_CRITERIA : "has"
    USER_BADGE_INSTANCE }o--|| BADGE_DEFINITION : "references"
```

## Key Relationships

### Core Entities
1. **USER** - Central entity representing app users with complete profile information
2. **SPEECH_SESSION** - Individual speech practice sessions with audio and metadata
3. **SPEECH_FEEDBACK** - AI-generated analysis results for each speech session
4. **USER_BADGE_PROGRESS** - Overall badge tracking and statistics per user
5. **BADGE_DEFINITION** - Master badge definitions and metadata
6. **USER_BADGE_INSTANCE** - Individual badge instances per user with progress
7. **SPEECH_HISTORY_SUMMARY** - Aggregated statistics and trends

### Business Logic
- Users can record multiple speech sessions over time
- Each speech session generates detailed AI feedback (pace, tone, clarity, filler words)
- Badge system tracks user achievements across different categories
- Speech history summary provides analytics and improvement trends
- Audio files are stored in Firebase Storage with references in speech sessions

### Data Flow
1. User records speech → Creates SPEECH_SESSION entry
2. AI analyzes speech → Generates SPEECH_FEEDBACK data
3. Filler words detected → Creates FILLER_WORD_DETECTION records
4. Badge system evaluates criteria → Updates USER_BADGE_INSTANCE records
5. Summary statistics updated → Updates SPEECH_HISTORY_SUMMARY

## Entity Descriptions

### USER
The central entity storing user profile information including personal details, interests, and biographical information. Serves as the root for all user-related data.

### SPEECH_SESSION
Represents individual speech practice sessions. Contains the audio recording, transcript, timing data, and references to Firebase Storage for audio files.

### SPEECH_FEEDBACK
AI-generated analysis results for each speech session, including ratings for pace, tone, and clarity, plus filler word analysis.

### FILLER_WORD_DETECTION
Detailed tracking of specific filler words detected during speech analysis, with timestamps for precise location in the audio.

### USER_BADGE_PROGRESS
Overall badge statistics and progress tracking per user, including total badges and unlocked count.

### BADGE_DEFINITION
Master definitions of all available badges in the system, including metadata like icons, categories, and rarity levels.

### BADGE_CRITERIA
Rules and conditions that determine when badges are unlocked, including different types of criteria (speech count, ratings, profile completion).

### USER_BADGE_INSTANCE
Individual badge instances for each user, tracking progress and unlock status for specific badges.

### SPEECH_HISTORY_SUMMARY
Aggregated analytics including total sessions, average scores, improvement trends, and overall statistics.

## Enums and Constants

### BadgeCategory
- **PRACTICE** - Daily practice and consistency badges
- **PROGRESS** - Skill improvement and rating achievements  
- **PERFORMANCE** - Volume and speed-based achievements
- **SPECIAL** - Unique or time-based accomplishments
- **LEARNING** - Profile completion and exploration badges

### BadgeRarity
- **COMMON** - Easy to achieve, frequent badges
- **RARE** - Moderate difficulty, less frequent
- **EPIC** - Difficult to achieve, significant milestones
- **LEGENDARY** - Very difficult, major accomplishments

### Badge Criteria Types
- **speech_count** - Number of completed speech sessions
- **consecutive_days** - Days of consecutive practice
- **total_days** - Total unique practice days
- **rating_achievement** - Achieving specific rating levels
- **profile_completion** - Completing profile sections
- **time_based** - Time-specific achievements (e.g., night practice)

### Rating Values
- **excellent** - Highest rating level
- **good** - Above average performance
- **fair** - Average performance
- **poor** - Below average performance

## Technical Implementation Notes

- **Firebase Integration**: Uses Firestore for document storage and Firebase Storage for audio files
- **AI Analysis**: Integrates with Google Gemini API for speech analysis
- **Real-time Updates**: Badge progress updates in real-time as users complete activities
- **Audio Processing**: Supports multiple audio formats with MIME type tracking
- **Scalability**: Designed to handle multiple users with individual badge tracking
