// Backend response structure from /api/speech-analysis/analyze/
export interface AnalyzeSpeechForFeedbackOutput {
    // Optional fields (may not be present)
    transcript?: string;
    category?: string;
    duration?: number;

    // Scores (1-5 scale) - directly from backend
    speech_pace: number;
    pausing_fluency: number;
    loudness_control?: number;  // New backend field name
    loud_control?: number;       // Old field name (for backward compatibility)
    pitch_variation: number;
    articulation_clarity: number;
    expressive_emphasis?: number; // New backend field name
    expressive_emph?: number;     // Old field name (for backward compatibility)
    filler_words?: number;        // New backend field name (score)
    filler_words_score?: number;  // Old field name (for backward compatibility)
    overall: number;

    // Nested feedback object (from new backend)
    feedback?: {
      overall_assessment?: string;
      detailed_scores?: {
        [key: string]: {
          score: number;
          description: string;
        };
      };
    };

    // Recommendations array (from new backend)
    recommendations?: Array<{
      category: string;
      issue: string;
      suggestion: string;
    }>;

    // Old feedback fields (for backward compatibility)
    pace_feedback?: string;
    tone_feedback?: string;
    clarity_feedback?: string;
    strengths?: string;
    areas_improvement?: string;

    analysis?: any; // Keep analysis as optional any
  }
