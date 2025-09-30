export interface SpeechHistoryEntry {
  id: string;
  userId: string;
  transcript: string;
  speechType?: 'informative' | 'motivational' | 'persuasive';
  feedback: {
    pace: string;
    tone: string;
    clarity: string;
    fillerWords: {
      feedback: string;
      words: Array<{
        word: string;
        timestamp: number;
      }>;
    };
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
