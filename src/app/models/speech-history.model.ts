export interface SpeechHistoryEntry {
  id: string;
  userId: string;
  transcript: string;
  speechType?: 'informative' | 'motivational' | 'persuasive';
  feedback: {
    // Scores (1–5 scale)
    speech_pace: number;
    pausing_fluency: number;
    loud_control: number;
    pitch_variation: number;
    articulation_clarity: number;
    expressive_emph: number;
    filler_words_score: number;
    overall: number;

    // Per-dimension feedback strings from LLM
    pace_feedback: string;
    volume_feedback: string;
    pitch_feedback: string;
    clarity_feedback: string;
    pausing_feedback: string;
    filler_feedback: string;
    tone_feedback: string;

    // Coach report
    overall_assessment: string;
    strengths: string[];
    improvements: string[];
    closing_message: string;

    // Optional details
    filler_words?: Array<{ word: string; start_time: number }>;
    filler_word_details?: {
      count: number;
      word_count: number;
      fillers: Array<{ word: string; start: number; end: number }>;
    };
    pause_details?: {
      total_count:      number;
      average_duration: number;
      longest_duration: number;
      short_count:      number;
      medium_count:     number;
      long_count:       number;
    };
  };
  createdAt: Date;
  duration?: number;       // seconds
  wordCount?: number;
  averagePace?: number;    // WPM
  audioUrl?: string;
  audioData?: string;
  audioMimeType?: string;
}

export interface SpeechHistorySummary {
  totalSessions: number;
  averageClarity: number;
  averagePace: number;
  averageTone: number;
  totalWords: number;
  totalDuration: number;
  lastSession?: Date;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface SpeechHistoryFilter {
  dateRange?: { start: Date; end: Date; };
  clarityRating?: 'excellent' | 'good' | 'fair' | 'poor';
  paceRating?:   'excellent' | 'good' | 'fair' | 'poor';
  toneRating?:   'excellent' | 'good' | 'fair' | 'poor';
}
