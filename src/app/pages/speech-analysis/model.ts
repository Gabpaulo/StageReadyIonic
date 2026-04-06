// Backend response structure from speech-analysis-api.service.ts
export interface AnalyzeSpeechForFeedbackOutput {
    // Optional fields (may not be present)
    transcript?: string;
    category?: string;
    duration?: number;
    wordCount?: number;
    averagePace?: number;

    // Scores (0-4 scale)
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

    // Per-dimension coach feedback strings
    pace_feedback?: string;
    tone_feedback?: string;
    clarity_feedback?: string;
    pausing_feedback?: string;
    filler_feedback?: string;

    // Coach report sections
    overall_assessment?: string;
    strengths?: string[] | string;
    improvements?: string[] | string;
    areas_improvement?: string;
    closing_message?: string;

    // Detailed analysis objects
    filler_word_details?: {
      count: number;
      word_count: number;
      ratio: number;
      fillers: { word: string; start: number; end: number }[];
      summary: { word: string; count: number }[];
    };
    pause_analysis?: {
      count: number;
      average_duration: number;
      longest_pause: number;
      total_pause_time: number;
      pauses: { start: number; end: number; duration: number }[];
      wpm_segments: { start: number; end: number; wpm: number }[];
    };

    // Legacy nested feedback object
    feedback?: {
      overall_assessment?: string;
      detailed_scores?: {
        [key: string]: {
          score: number;
          description: string;
        };
      };
    };

    recommendations?: Array<{
      category: string;
      issue: string;
      suggestion: string;
    }>;

    analysis?: any;
  }
