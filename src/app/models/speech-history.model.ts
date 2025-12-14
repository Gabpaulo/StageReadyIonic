export interface SpeechHistoryEntry {
  id: string;
  userId: string;
  transcript: string;
  speechType?: 'informative' | 'motivational' | 'persuasive';
  feedback: {
    speech_pace: number;
    pausing_fluency: number;
    loud_control: number;
    pitch_variation: number;
    articulation_clarity: number;
    expressive_emph: number;
    filler_words_score: number;
    overall: number;
    pace_feedback: string;
    tone_feedback: string;
    clarity_feedback: string;
    strengths: string;
    areas_improvement: string;
    filler_words: Array<{
      word: string;
      start_time: number;
    }>;
  };
  createdAt: Date;
  duration?: number; // in seconds
  wordCount?: number;
  averagePace?: number; // words per minute
  audioUrl?: string; // Firebase Storage URL
  audioData?: string; // base64 audio
  audioMimeType?: string; // mime type of audio
}

export interface SpeechHistorySummary {
  totalSessions: number;
  averageClarity: number;
  averagePace: number;
  averageTone: number;
  totalWords: number;
  totalDuration: number; // in seconds
  lastSession?: Date;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface SpeechHistoryFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  clarityRating?: 'excellent' | 'good' | 'fair' | 'poor';
  paceRating?: 'excellent' | 'good' | 'fair' | 'poor';
  toneRating?: 'excellent' | 'good' | 'fair' | 'poor';
}
