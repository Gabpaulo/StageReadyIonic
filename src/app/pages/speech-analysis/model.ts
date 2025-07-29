// Defines exactly what keys Gemini will return—no numeric scores
export interface AnalyzeSpeechForFeedbackOutput {
    transcript: string;
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
  }
  