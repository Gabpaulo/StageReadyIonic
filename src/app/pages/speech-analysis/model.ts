// LLM (Groq) response structure for speech analysis
export interface AnalyzeSpeechForFeedbackOutput {
    transcript?: string;
    category?: string;
    duration?: number;

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
        timestamp: number;   // when the pause starts (seconds)
        duration: number;    // length of pause (seconds)
        type: 'short' | 'medium' | 'long';
        before: string;      // last word spoken before the pause
        after: string;       // first word spoken after the pause
      }>;
      total_count: number;
      average_duration: number;
      longest_duration: number;
      short_count: number;   // 0.5–1.0s
      medium_count: number;  // 1.0–2.0s
      long_count: number;    // 2.0s+
    };

    // Nested feedback object
    feedback?: {
      overall_assessment?: string;
      detailed_scores?: {
        [key: string]: {
          score: number;
          description: string;
        };
      };
    };

    // Recommendations
    recommendations?: Array<{
      category: string;
      issue: string;
      suggestion: string;
    }>;

    // Summary feedback strings
    pace_feedback?: string;
    tone_feedback?: string;
    clarity_feedback?: string;
    strengths?: string;
    areas_improvement?: string;

    analysis?: any;
  }
