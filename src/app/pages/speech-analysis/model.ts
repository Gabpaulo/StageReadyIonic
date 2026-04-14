// LLM (Groq) response structure for speech analysis
export interface AnalyzeSpeechForFeedbackOutput {
    transcript?: string;
    category?: string;
    duration?: number;
    wordCount?: number;
    averagePace?: number; // WPM

    // Scores (1-5 scale)
    speech_pace: number;
    pausing_fluency: number;
    loudness_control?: number;
    loud_control?: number;
    pitch_variation: number;
    articulation_clarity: number;
    expressive_emphasis?: number;
    expressive_emph?: number;
    filler_words?: number;
    filler_words_score?: number;
    overall: number;

    // Word-level timestamps from Whisper (used for transcript highlighting)
    transcript_words?: Array<{ word: string; start: number; end: number }>;

    // Filler word occurrences with timestamps
    filler_word_details?: {
      count: number;
      word_count: number;
      fillers: Array<{ word: string; start: number; end: number }>;
    };

    // Pause detection from Whisper word-level timestamps
    pause_details?: {
      pauses: Array<{
        timestamp: number;
        duration: number;
        type: 'short' | 'medium' | 'long';
        before: string;
        after: string;
      }>;
      total_count: number;
      average_duration: number;
      longest_duration: number;
      short_count: number;   // 0.5–1.0s
      medium_count: number;  // 1.0–2.0s
      long_count: number;    // 2.0s+
    };

    // Pause analysis adapter (used by feedback page)
    pause_analysis?: {
      count: number;
      average_duration: number;
      longest_pause: number;
      total_pause_time: number;
      pauses: Array<{ start: number; end: number; duration: number }>;
      wpm_segments: Array<{ start: number; end: number; wpm: number; label: string }>;
    };

    // Nested feedback object (legacy)
    feedback?: {
      overall_assessment?: string;
      detailed_scores?: {
        [key: string]: { score: number; description: string; };
      };
    };

    // Recommendations
    recommendations?: Array<{
      category: string;
      issue: string;
      suggestion: string;
    }>;

    // Per-dimension feedback strings from LLM
    pace_feedback?: string;
    volume_feedback?: string;
    pitch_feedback?: string;
    clarity_feedback?: string;
    pausing_feedback?: string;
    filler_feedback?: string;
    tone_feedback?: string;

    // Coach report arrays
    overall_assessment?: string;
    strengths?: string[];
    improvements?: string[];
    closing_message?: string;

    // Legacy
    areas_improvement?: string;

    analysis?: any;
  }
