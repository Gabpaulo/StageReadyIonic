// Defines exactly what keys Gemini will return—no numeric scores
export interface AnalyzeSpeechForFeedbackOutput {
    transcript: string;
    category: string; // Added category
    duration: number; // Added duration
    
    // Scores (directly from backend)
    speech_pace: number;
    pausing_fluency: number;
    loud_control: number;
    pitch_variation: number;
    articulation_clarity: number;
    expressive_emph: number;
    filler_words_score: number; // Renamed to match backend
    overall: number;

    // Feedback messages (directly from backend)
    pace_feedback: string;
    tone_feedback: string;
    clarity_feedback: string;
    strengths: string;
    areas_improvement: string;

    // Filler words (directly from backend)
    filler_words: Array<{ // Renamed to match backend
      word: string;
      start_time: number; // Use start_time as per backend
    }>;
    
    analysis?: any; // Keep analysis as optional any
  }
