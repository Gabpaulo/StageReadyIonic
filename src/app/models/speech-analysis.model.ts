export interface AnalyzeSpeechForFeedbackOutput {
  transcript: string;
  category: string;
  duration: number;
  wordCount: number;
  averagePace: number;

  speech_pace: number;
  pausing_fluency: number;
  loudness_control: number;
  loud_control: number;
  pitch_variation: number;
  articulation_clarity: number;
  expressive_emphasis: number;
  expressive_emph: number;
  filler_words: number;
  filler_words_score: number;
  overall: number;

  transcript_words: any[];
  filler_word_details: any;
  pause_details: any;
  pause_analysis: {
    count: number;
    average_duration: number;
    longest_pause: number;
    total_pause_time: number;
    pauses: { start: number; end: number; duration: number }[];
    wpm_segments: any[];
  };

  overall_assessment: string;
  strengths: string[];
  improvements: string[];
  closing_message: string;
  areas_improvement: string;

  pace_feedback: string;
  volume_feedback: string;
  pitch_feedback: string;
  tone_feedback: string;
  clarity_feedback: string;
  pausing_feedback: string;
  filler_feedback: string;

  feedback: {
    overall_assessment: string;
    detailed_scores: Record<string, { score: number; description: string }>;
  };
  recommendations: { category: string; issue: string; suggestion: string }[];
  analysis: any;
}
