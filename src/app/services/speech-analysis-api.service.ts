import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnalyzeSpeechForFeedbackOutput } from '../pages/speech-analysis/model';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text: string;
  duration?: number;
  words?: WhisperWord[];
}

interface PauseDetail {
  timestamp: number;
  duration: number;
  type: 'short' | 'medium' | 'long';
  before: string;
  after: string;
}

interface PauseStats {
  pauses: PauseDetail[];
  total_count: number;
  average_duration: number;
  longest_duration: number;
  short_count: number;
  medium_count: number;
  long_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechAnalysisApiService {

  private readonly GROQ_API = 'https://api.groq.com/openai/v1';
  private readonly WHISPER_MODEL = 'whisper-large-v3-turbo';
  private readonly LLM_MODEL = 'llama-3.3-70b-versatile';

  analyzeSpeech(audioBlob: Blob, category: string): Observable<AnalyzeSpeechForFeedbackOutput> {
    return from(this.analyzeWithGroq(audioBlob, category));
  }

  private async analyzeWithGroq(
    audioBlob: Blob,
    category: string
  ): Promise<AnalyzeSpeechForFeedbackOutput> {
    const transcription = await this.transcribeAudio(audioBlob);
    const pauseStats = this.detectPauses(transcription);
    const analysis = await this.analyzeTranscript(transcription, category, pauseStats);
    return this.mapToFeedbackOutput(analysis, transcription, category, pauseStats);
  }

  // ── Step 1: Whisper transcription ─────────────────────────────────────────

  private async transcribeAudio(audioBlob: Blob): Promise<WhisperResponse> {
    const ext = (audioBlob.type.split('/')[1] || 'wav').replace('x-', '');
    const formData = new FormData();
    formData.append('file', audioBlob, `speech.${ext}`);
    formData.append('model', this.WHISPER_MODEL);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    // Primes Whisper to keep filler words instead of silently removing them
    formData.append('prompt', 'Um, uh, like, you know, basically, so, right, okay, hmm, mm.');

    const response = await fetch(`${this.GROQ_API}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${environment.groqApiKey}` },
      body: formData
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper transcription failed (${response.status}): ${err}`);
    }

    return response.json();
  }

  // ── Step 2: LLaMA analysis ────────────────────────────────────────────────

  private async analyzeTranscript(
    transcription: WhisperResponse,
    category: string,
    pauseStats: PauseStats
  ): Promise<any> {
    const wordCount = transcription.text.trim().split(/\s+/).length;
    const duration = transcription.duration ?? 0;
    const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

    const prompt = this.buildPrompt(transcription.text, category, wpm, duration, pauseStats);

    const response = await fetch(`${this.GROQ_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.LLM_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional speech coach. Always respond with valid JSON only — no markdown, no code fences.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM analysis failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    const rawText: string = data.choices?.[0]?.message?.content ?? '{}';

    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error('LLM returned invalid JSON. Please try again.');
    }
  }

  // ── Mapping ────────────────────────────────────────────────────────────────

  private mapToFeedbackOutput(
    r: any,
    transcription: WhisperResponse,
    category: string,
    pauseStats: PauseStats
  ): AnalyzeSpeechForFeedbackOutput {
    const detailedScores = r.feedback?.detailed_scores ?? {};
    const fillerData = this.extractFillers(transcription);

    return {
      transcript: transcription.text,
      category,
      duration: transcription.duration ?? 0,

      speech_pace: r.speech_pace ?? 3,
      pausing_fluency: r.pausing_fluency ?? 3,
      loudness_control: r.loudness_control ?? 3,
      loud_control: r.loudness_control ?? 3,
      pitch_variation: r.pitch_variation ?? 3,
      articulation_clarity: r.articulation_clarity ?? 3,
      expressive_emphasis: r.expressive_emphasis ?? 3,
      expressive_emph: r.expressive_emphasis ?? 3,
      filler_words: r.filler_words ?? 3,
      filler_words_score: r.filler_words ?? 3,
      overall: r.overall ?? 3,

      transcript_words: transcription.words ?? [],
      filler_word_details: fillerData,
      pause_details: pauseStats,

      feedback: r.feedback ?? { overall_assessment: '', detailed_scores: {} },
      recommendations: r.recommendations ?? [],

      pace_feedback: detailedScores.speech_pace?.description ?? r.feedback?.overall_assessment ?? '',
      tone_feedback: detailedScores.pitch_variation?.description ?? '',
      clarity_feedback: detailedScores.articulation_clarity?.description ?? '',

      strengths: this.extractStrengths(r),
      areas_improvement: this.extractImprovements(r),

      analysis: r
    };
  }

  // ── Pause detection from Whisper word timestamps ───────────────────────────

  private detectPauses(transcription: WhisperResponse): PauseStats {
    const words = transcription.words ?? [];
    const pauses: PauseDetail[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      if (gap < 0.5) continue;

      const type: 'short' | 'medium' | 'long' =
        gap < 1.0 ? 'short' : gap < 2.0 ? 'medium' : 'long';

      pauses.push({
        timestamp: words[i].end,
        duration: parseFloat(gap.toFixed(2)),
        type,
        before: words[i].word,
        after: words[i + 1].word
      });
    }

    const total_count = pauses.length;
    const average_duration = total_count > 0
      ? parseFloat((pauses.reduce((s, p) => s + p.duration, 0) / total_count).toFixed(2))
      : 0;
    const longest_duration = total_count > 0
      ? parseFloat(Math.max(...pauses.map(p => p.duration)).toFixed(2))
      : 0;

    return {
      pauses,
      total_count,
      average_duration,
      longest_duration,
      short_count:  pauses.filter(p => p.type === 'short').length,
      medium_count: pauses.filter(p => p.type === 'medium').length,
      long_count:   pauses.filter(p => p.type === 'long').length
    };
  }

  // Pull filler words from Whisper word-level timestamps
  private extractFillers(transcription: WhisperResponse): { count: number; word_count: number; fillers: { word: string; start: number; end: number }[] } {
    const FILLERS = new Set([
      'um', 'uh', 'umm', 'uhh',          // core hesitation sounds
      'mm', 'mmm', 'hmm', 'hm', 'mhm',  // Whisper alternate spellings
      'like', 'you know', 'you know what i mean',
      'basically', 'literally', 'actually',
      'so', 'right', 'okay', 'ok',
      'i mean', 'kind of', 'sort of'
    ]);
    const word_count = transcription.words?.length ?? 0;
    if (!word_count) return { count: 0, word_count: 0, fillers: [] };

    const fillers = transcription.words!
      .filter(w => FILLERS.has(w.word.toLowerCase().replace(/[^a-z ]/g, '')))
      .map(w => ({ word: w.word.toLowerCase(), start: w.start, end: w.end }));

    return { count: fillers.length, word_count, fillers };
  }

  private extractStrengths(r: any): string {
    const scores: Record<string, number> = {
      'Speech Pace': r.speech_pace,
      'Pausing & Fluency': r.pausing_fluency,
      'Volume Control': r.loudness_control,
      'Pitch Variation': r.pitch_variation,
      'Articulation': r.articulation_clarity,
      'Expression': r.expressive_emphasis,
      'Filler Words': r.filler_words
    };
    const good = Object.entries(scores)
      .filter(([, v]) => v != null && v >= 4)
      .map(([k]) => k);

    if (good.length === 0) {
      return r.feedback?.overall_assessment ?? 'Continue practicing to improve your skills';
    }
    return `Strong performance in: ${good.join(', ')}`;
  }

  private extractImprovements(r: any): string {
    if (r.recommendations?.length) {
      return (r.recommendations as any[])
        .map((rec: any) => `${rec.category}: ${rec.suggestion}`)
        .join('\n\n');
    }
    const scores: Record<string, number> = {
      'Speech Pace': r.speech_pace,
      'Pausing & Fluency': r.pausing_fluency,
      'Volume Control': r.loudness_control,
      'Pitch Variation': r.pitch_variation,
      'Articulation': r.articulation_clarity,
      'Expression': r.expressive_emphasis,
      'Filler Words': r.filler_words
    };
    const weak = Object.entries(scores)
      .filter(([, v]) => v != null && v <= 3)
      .map(([k]) => k);

    if (weak.length === 0) return 'Great job! Keep up the excellent work';
    return `Focus on improving: ${weak.join(', ')}`;
  }

  private buildPrompt(transcript: string, category: string, wpm: number, duration: number, pauseStats: PauseStats): string {
    return `You are scoring a ${category} speech. Here is the full transcript:

"${transcript}"

Speech stats:
- Duration: ${duration.toFixed(1)} seconds
- Speaking rate: ${wpm} words per minute (ideal for ${category} is 130–160 WPM)
- Total pauses detected: ${pauseStats.total_count} (short ≥0.5s: ${pauseStats.short_count}, medium ≥1s: ${pauseStats.medium_count}, long ≥2s: ${pauseStats.long_count})
- Average pause duration: ${pauseStats.average_duration}s, Longest pause: ${pauseStats.longest_duration}s

Score each dimension 1–5 (1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent):

- speech_pace: Is the speaking rate appropriate for a ${category} speech? (measured WPM: ${wpm})
- pausing_fluency: Use the pause data above — are pauses well-placed and strategic, or excessive/absent? Too many long pauses suggest hesitation; too few suggest rushed delivery.
- loudness_control: Based on expression in the text, does it suggest consistent volume and emphasis? (estimate from delivery style)
- pitch_variation: Does the language suggest varied, engaging delivery or monotone reading?
- articulation_clarity: Is the transcript clear, well-enunciated, and easy to follow?
- expressive_emphasis: Does the language have rhetorical force and emotional engagement fitting a ${category} speech?
- filler_words: Count occurrences of "um", "uh", "like", "you know", "basically", "so", "right", "okay" used as fillers. Score: 5=none, 4=1–2, 3=3–5, 2=6–10, 1=10+

Return ONLY this JSON object:
{
  "speech_pace": <1-5>,
  "pausing_fluency": <1-5>,
  "loudness_control": <1-5>,
  "pitch_variation": <1-5>,
  "articulation_clarity": <1-5>,
  "expressive_emphasis": <1-5>,
  "filler_words": <1-5>,
  "overall": <1-5>,
  "feedback": {
    "overall_assessment": "<2-3 sentence holistic assessment>",
    "detailed_scores": {
      "speech_pace":          { "score": <1-5>, "description": "<specific feedback>" },
      "pausing_fluency":      { "score": <1-5>, "description": "<specific feedback>" },
      "loudness_control":     { "score": <1-5>, "description": "<specific feedback>" },
      "pitch_variation":      { "score": <1-5>, "description": "<specific feedback>" },
      "articulation_clarity": { "score": <1-5>, "description": "<specific feedback>" },
      "expressive_emphasis":  { "score": <1-5>, "description": "<specific feedback>" },
      "filler_words":         { "score": <1-5>, "description": "<specific feedback>" }
    }
  },
  "recommendations": [
    { "category": "<metric>", "issue": "<what the problem is>", "suggestion": "<actionable advice>" }
  ]
}`;
  }
}
