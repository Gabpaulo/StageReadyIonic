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

  // ── Category weights (must sum to 1.0 per category) ──────────────────────
  private readonly WEIGHTS: Record<string, Record<string, number>> = {
    informative: {
      speech_pace: 0.16, pausing_fluency: 0.13, loudness_control: 0.14,
      pitch_variation: 0.12, articulation_clarity: 0.17,
      filler_words: 0.18, expressive_emphasis: 0.10
    },
    persuasive: {
      speech_pace: 0.15, pausing_fluency: 0.12, loudness_control: 0.12,
      pitch_variation: 0.17, articulation_clarity: 0.17,
      filler_words: 0.08, expressive_emphasis: 0.19
    },
    motivational: {
      speech_pace: 0.13, pausing_fluency: 0.12, loudness_control: 0.14,
      pitch_variation: 0.18, articulation_clarity: 0.15,
      filler_words: 0.06, expressive_emphasis: 0.22
    }
  };

  private computeWeightedOverall(scores: Record<string, number>, category: string): number {
    const key = category.toLowerCase();
    const weights = this.WEIGHTS[key] ?? this.WEIGHTS['informative'];
    const dims = ['speech_pace', 'pausing_fluency', 'loudness_control', 'pitch_variation', 'articulation_clarity', 'filler_words', 'expressive_emphasis'];
    const total = dims.reduce((sum, d) => sum + (scores[d] ?? 3) * (weights[d] ?? 0), 0);
    return parseFloat(total.toFixed(1));
  }

  // ── Mapping ────────────────────────────────────────────────────────────────

  private mapToFeedbackOutput(
    r: any,
    transcription: WhisperResponse,
    category: string,
    pauseStats: PauseStats
  ): AnalyzeSpeechForFeedbackOutput {
    const ds = r.feedback?.detailed_scores ?? {};
    const fillerData = this.extractFillers(transcription);

    // Per-dimension feedback — prefer top-level fields, fall back to detailed_scores
    const pace_feedback     = r.pace_feedback     || ds.speech_pace?.description          || '';
    const volume_feedback   = r.volume_feedback   || ds.loudness_control?.description     || '';
    const pitch_feedback    = r.pitch_feedback    || ds.pitch_variation?.description      || '';
    const clarity_feedback  = r.clarity_feedback  || ds.articulation_clarity?.description || '';
    const pausing_feedback  = r.pausing_feedback  || ds.pausing_fluency?.description      || '';
    const filler_feedback   = r.filler_feedback   || ds.filler_words?.description         || '';
    const tone_feedback     = r.tone_feedback     || ds.expressive_emphasis?.description  || '';

    const strengths    = Array.isArray(r.strengths)    ? r.strengths.filter(Boolean)    : [];
    const improvements = Array.isArray(r.improvements) ? r.improvements.filter(Boolean) : [];

    return {
      transcript: transcription.text,
      category,
      duration: transcription.duration ?? 0,
      wordCount: transcription.text.trim().split(/\s+/).length,
      averagePace: transcription.duration
        ? Math.round((transcription.text.trim().split(/\s+/).length / transcription.duration) * 60)
        : 0,

      speech_pace:          r.speech_pace          ?? 3,
      pausing_fluency:      r.pausing_fluency      ?? 3,
      loudness_control:     r.loudness_control     ?? 3,
      loud_control:         r.loudness_control     ?? 3,
      pitch_variation:      r.pitch_variation      ?? 3,
      articulation_clarity: r.articulation_clarity ?? 3,
      expressive_emphasis:  r.expressive_emphasis  ?? 3,
      expressive_emph:      r.expressive_emphasis  ?? 3,
      filler_words:         r.filler_words         ?? 3,
      filler_words_score:   r.filler_words         ?? 3,
      overall: this.computeWeightedOverall({
        speech_pace:          r.speech_pace          ?? 3,
        pausing_fluency:      r.pausing_fluency      ?? 3,
        loudness_control:     r.loudness_control     ?? 3,
        pitch_variation:      r.pitch_variation      ?? 3,
        articulation_clarity: r.articulation_clarity ?? 3,
        filler_words:         r.filler_words         ?? 3,
        expressive_emphasis:  r.expressive_emphasis  ?? 3,
      }, category),

      transcript_words:    transcription.words ?? [],
      filler_word_details: fillerData,
      pause_details:       pauseStats,
      pause_analysis: {
        count:            pauseStats.total_count,
        average_duration: pauseStats.average_duration,
        longest_pause:    pauseStats.longest_duration,
        total_pause_time: +(pauseStats.pauses.reduce((s, p) => s + p.duration, 0)).toFixed(2),
        pauses:           [...pauseStats.pauses]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 15)
          .map(p => ({ start: p.timestamp, end: p.timestamp + p.duration, duration: p.duration })),
        wpm_segments: []
      },

      overall_assessment: r.overall_assessment || r.feedback?.overall_assessment || '',
      strengths,
      improvements,
      closing_message: r.closing_message || '',

      pace_feedback,
      volume_feedback,
      pitch_feedback,
      tone_feedback,
      clarity_feedback,
      pausing_feedback,
      filler_feedback,

      areas_improvement: improvements.join('\n\n'),

      feedback: {
        overall_assessment: r.overall_assessment || r.feedback?.overall_assessment || '',
        detailed_scores: r.feedback?.detailed_scores ?? {}
      },
      recommendations: r.recommendations ?? [],
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
    const opening = transcript.slice(0, 200).replace(/"/g, "'");
    const paceLabel = wpm < 100 ? 'very slow' : wpm < 120 ? 'slightly slow' : wpm <= 155 ? 'ideal' : wpm <= 175 ? 'slightly fast' : 'too fast';

    return `You are a professional speech coach reviewing a student's ${category} speech. Your feedback must be specific to THIS transcript — never generic.

FULL TRANSCRIPT:
"${transcript}"

OPENING: "${opening}..."

METRICS:
- Duration: ${duration.toFixed(1)}s
- WPM: ${wpm} (${paceLabel} — ideal 120–155 WPM)
- Pauses ≥0.5s: ${pauseStats.total_count} total (short: ${pauseStats.short_count}, medium: ${pauseStats.medium_count}, long: ${pauseStats.long_count})
- Average pause: ${pauseStats.average_duration}s | Longest: ${pauseStats.longest_duration}s

SCORING RULES (use one decimal place — e.g. 3.7, 4.2 — never round to whole numbers):
Scale: 1.0=Poor, 2.0=Below Average, 3.0=Average, 4.0=Good, 5.0=Excellent. Use in-between values to reflect nuance.
- speech_pace: based on WPM=${wpm} vs ideal 120–155 for ${category}
- pausing_fluency: are the ${pauseStats.total_count} pauses strategic or hesitant?
- loudness_control: infer from sentence energy, exclamations, emphasis in transcript
- pitch_variation: infer from punctuation variety, questions, emotional range
- articulation_clarity: sentence completeness, clarity of ideas, word choice
- expressive_emphasis: how engaging/energetic is this as a ${category} speech?
- filler_words: 5.0=none, 4.0–4.9=1–2, 3.0–3.9=3–5, 2.0–2.9=6–10, 1.0–1.9=10+ fillers detected

STRICT RULES — EVERY field below must reference the actual transcript:
1. overall_assessment: 2–3 sentences. MUST quote an exact phrase from the transcript. Reference one specific metric.
2. strengths: 3 items. Each MUST reference something specific (a phrase they said, a metric achieved). NO generic praise.
3. improvements: 3 items. Each MUST name a specific technique and reference their actual data (WPM, filler count, pause data).
4. All *_feedback fields MUST quote or reference the actual transcript content.

Return ONLY this JSON (all scores must be decimals with one decimal place, e.g. 3.7 not 4):
{
  "speech_pace": <1.0-5.0>,
  "pausing_fluency": <1.0-5.0>,
  "loudness_control": <1.0-5.0>,
  "pitch_variation": <1.0-5.0>,
  "articulation_clarity": <1.0-5.0>,
  "expressive_emphasis": <1.0-5.0>,
  "filler_words": <1.0-5.0>,
  "overall_assessment": "<2-3 sentences quoting an actual phrase from the transcript and mentioning one metric>",
  "strengths": [
    "<Specific strength with transcript quote or metric evidence>",
    "<Second specific strength>",
    "<Third specific strength>"
  ],
  "improvements": [
    "<Actionable fix #1 referencing actual data — e.g. 'Your ${wpm} WPM pace...'>",
    "<Actionable fix #2>",
    "<Actionable fix #3>"
  ],
  "closing_message": "<One sentence referencing something specific from this speech and what to focus on next>",
  "pace_feedback": "<Reference their exact WPM of ${wpm}. What it felt like as a listener. What to change.>",
  "volume_feedback": "<Infer energy from transcript. Quote a line. Advice on volume/emphasis.>",
  "pitch_feedback": "<Reference punctuation and emotional range. Quote an example line. Give technique.>",
  "clarity_feedback": "<Reference specific word choice or sentence from transcript. Quote it. Advice.>",
  "pausing_feedback": "<Mention their ${pauseStats.total_count} pauses, avg ${pauseStats.average_duration}s. Strategic or hesitant? Advice.>",
  "filler_feedback": "<Name the filler words detected. Give the replace-with-silence technique.>",
  "tone_feedback": "<Reference energy level for a ${category} speech. Quote a high or low energy phrase.>",
  "feedback": {
    "overall_assessment": "<same as overall_assessment above>",
    "detailed_scores": {
      "speech_pace":          { "score": <1.0-5.0>, "description": "<same as pace_feedback>" },
      "pausing_fluency":      { "score": <1.0-5.0>, "description": "<same as pausing_feedback>" },
      "loudness_control":     { "score": <1.0-5.0>, "description": "<same as volume_feedback>" },
      "pitch_variation":      { "score": <1.0-5.0>, "description": "<same as pitch_feedback>" },
      "articulation_clarity": { "score": <1.0-5.0>, "description": "<same as clarity_feedback>" },
      "expressive_emphasis":  { "score": <1.0-5.0>, "description": "<same as tone_feedback>" },
      "filler_words":         { "score": <1.0-5.0>, "description": "<same as filler_feedback>" }
    }
  },
  "recommendations": [
    { "category": "<metric name>", "issue": "<specific problem>", "suggestion": "<actionable advice>" }
  ]
}`;
  }

  // ── Practice Mode Analysis ─────────────────────────────────────────────────

  async analyzePracticeSession(
    audioBlob: Blob,
    scriptText: string,
    category: string,
    targetDimensions: string[]
  ): Promise<PracticeAnalysisResult> {
    const transcription = await this.transcribeAudio(audioBlob);

    const rawText   = transcription.text?.trim() ?? '';
    const wordCount = rawText.length > 0 ? rawText.split(/\s+/).filter(Boolean).length : 0;

    // ── Guard 1: No speech detected ─────────────────────────────────────────
    if (wordCount < 5 || rawText.length < 10) {
      return this.buildZeroResult(rawText, scriptText, targetDimensions, 'no_speech');
    }

    const pauseStats = this.detectPauses(transcription);
    const fillerData = this.extractFillers(transcription);

    const duration  = transcription.duration ?? 0;
    const actualWpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

    // Word accuracy: compare transcript vs script
    const accuracy = this.computeWordAccuracy(rawText, scriptText);

    // ── Guard 2: Complete content mismatch ───────────────────────────────────
    if (accuracy.matchPct < 20) {
      return this.buildZeroResult(rawText, scriptText, targetDimensions, 'mismatch', accuracy);
    }

    // Algorithmic dimension scores
    const algorithmicScores = this.computeAlgorithmicScores(
      accuracy.matchPct, actualWpm, fillerData.count, wordCount,
      pauseStats, duration, scriptText
    );

    // LLM scores for expressive / pitch / volume dimensions
    const llmScores = await this.scorePracticeDimensions(
      transcription.text, scriptText, category, actualWpm, pauseStats
    );

    // Merge: prefer algorithmic where available, fill with LLM
    const merged: Record<string, number> = { ...llmScores, ...algorithmicScores };

    // Overall = weighted average of targetDimensions only
    const dimValues = targetDimensions.map(d => merged[d] ?? 3).filter(v => !isNaN(v));
    const overall   = dimValues.length
      ? parseFloat((dimValues.reduce((a, b) => a + b, 0) / dimValues.length).toFixed(1))
      : 3.0;

    return {
      transcript:      transcription.text,
      duration,
      actualWpm,
      wordAccuracy:    accuracy.matchPct,
      matchedWords:    accuracy.matched,
      totalScriptWords: accuracy.total,
      missedWords:     accuracy.missedWords,
      fillerCount:     fillerData.count,
      detectedFillers: fillerData.fillers.map(f => f.word),
      dimensionScores: merged,
      overall,
      pauseStats
    };
  }

  // ── Zero-score result for no-speech / mismatch ───────────────────────────

  private buildZeroResult(
    transcript: string,
    scriptText: string,
    targetDimensions: string[],
    reason: 'no_speech' | 'mismatch',
    accuracy?: { matchPct: number; matched: number; total: number; missedWords: string[] }
  ): PracticeAnalysisResult {
    const ALL_DIMS = [
      'speech_pace', 'pausing_fluency', 'loud_control', 'pitch_variation',
      'articulation_clarity', 'expressive_emph', 'filler_words_score', 'filler_words'
    ];
    const zeroDims: Record<string, number> = {};
    for (const d of ALL_DIMS) zeroDims[d] = 1.0;

    const totalScriptWords = scriptText.trim().split(/\s+/).filter(Boolean).length;
    const emptyPauseStats = {
      pauses: [], total_count: 0, average_duration: 0,
      longest_duration: 0, short_count: 0, medium_count: 0, long_count: 0
    };

    return {
      transcript,
      duration:          0,
      actualWpm:         0,
      wordAccuracy:      accuracy?.matchPct ?? 0,
      matchedWords:      accuracy?.matched  ?? 0,
      totalScriptWords,
      missedWords:       accuracy?.missedWords ?? [],
      fillerCount:       0,
      detectedFillers:   [],
      dimensionScores:   zeroDims,
      overall:           1.0,
      pauseStats:        emptyPauseStats,
      noSpeechDetected:  reason === 'no_speech',
      contentMismatch:   reason === 'mismatch'
    };
  }

  private computeWordAccuracy(
    transcript: string, script: string
  ): { matchPct: number; matched: number; total: number; missedWords: string[] } {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const scriptWords  = norm(script).split(/\s+/).filter(Boolean);
    const spokenWords  = norm(transcript).split(/\s+/).filter(Boolean);
    const total = scriptWords.length;

    // Greedy sequential match with ±4 word lookahead
    let si = 0;
    let matched = 0;
    const matchedIndices = new Set<number>();

    for (const spoken of spokenWords) {
      if (si >= scriptWords.length) break;
      for (let offset = 0; offset <= 4 && si + offset < scriptWords.length; offset++) {
        if (spoken === scriptWords[si + offset] || this.fuzzyEqual(spoken, scriptWords[si + offset])) {
          matchedIndices.add(si + offset);
          matched++;
          si += offset + 1;
          break;
        }
      }
    }

    // Collect unique missed words — skip ultra-common stop words to reduce noise
    const STOP = new Set(['the','a','an','and','or','of','to','in','is','it','that','with','as',
                          'for','on','are','was','be','this','but','by','at','from','they','we']);
    const seenMissed = new Set<string>();
    const missedWords: string[] = [];
    scriptWords.forEach((w, i) => {
      if (!matchedIndices.has(i) && w.length > 2 && !STOP.has(w) && !seenMissed.has(w)) {
        seenMissed.add(w);
        missedWords.push(w);
      }
    });

    return {
      matchPct: total > 0 ? parseFloat(((matched / total) * 100).toFixed(1)) : 0,
      matched,
      total,
      missedWords: missedWords.slice(0, 30)   // cap at 30 unique words
    };
  }

  private fuzzyEqual(a: string, b: string): boolean {
    if (!a || !b) return false;
    const contractions: Record<string, string> = {
      dont:"don't", cant:"can't", wont:"won't", its:"it's", youre:"you're",
      im:"i'm", ive:"i've", weve:"we've", theyre:"they're", hes:"he's",
      shes:"she's", isnt:"isn't", arent:"aren't", wasnt:"wasn't"
    };
    return contractions[a] === b || contractions[b] === a
        || a.replace(/'/g,'') === b || b.replace(/'/g,'') === a;
  }

  private computeAlgorithmicScores(
    matchPct: number, wpm: number, fillerCount: number, wordCount: number,
    pauseStats: PauseStats, duration: number, _script: string
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    // articulation_clarity: based on word accuracy
    scores['articulation_clarity'] = matchPct >= 95 ? 5.0
      : matchPct >= 85 ? 4.0 + (matchPct - 85) / 10
      : matchPct >= 70 ? 3.0 + (matchPct - 70) / 15
      : matchPct >= 55 ? 2.0 + (matchPct - 55) / 15
      : 1.0 + matchPct / 55;
    scores['articulation_clarity'] = parseFloat(Math.max(1, Math.min(5, scores['articulation_clarity'])).toFixed(1));

    // speech_pace: WPM vs ideal 120-150
    if (wpm > 0) {
      const diff = Math.max(0, Math.abs(wpm - 135) - 15);
      const raw  = 5.0 - diff * 0.08;
      scores['speech_pace'] = parseFloat(Math.max(1, Math.min(5, raw)).toFixed(1));
    }

    // filler_words_score: filler rate
    if (wordCount > 0) {
      const rate = (fillerCount / wordCount) * 100;
      scores['filler_words_score'] = parseFloat(Math.max(1, 5 - rate * 0.5).toFixed(1));
      scores['filler_words'] = scores['filler_words_score'];
    }

    // pausing_fluency: based on pause count & duration relative to speech length
    if (duration > 0) {
      const pauseRatio = pauseStats.pauses.reduce((s, p) => s + p.duration, 0) / duration;
      const longPauses = pauseStats.long_count;
      const raw = 5.0 - longPauses * 0.4 - pauseRatio * 3;
      scores['pausing_fluency'] = parseFloat(Math.max(1, Math.min(5, raw)).toFixed(1));
    }

    return scores;
  }

  private async scorePracticeDimensions(
    transcript: string, script: string, category: string,
    wpm: number, pauseStats: PauseStats
  ): Promise<Record<string, number>> {
    const prompt = `You are a speech coach. A student read the following REFERENCE SCRIPT aloud for a ${category} speech.

REFERENCE SCRIPT:
"${script.slice(0, 800)}"

WHAT THEY ACTUALLY SAID (Whisper transcript):
"${transcript.slice(0, 800)}"

WPM: ${wpm}. Pauses ≥0.5s: ${pauseStats.total_count}.

Score ONLY these 3 dimensions (one decimal, 1.0–5.0):
- loudness_control: infer energy from their word choices vs the script's intent
- pitch_variation: infer from how well they matched the emotional arc of the script
- expressive_emphasis: how engaging and dynamic does this sound for a ${category} speech?

Return ONLY JSON:
{"loudness_control":<1.0-5.0>,"pitch_variation":<1.0-5.0>,"expressive_emphasis":<1.0-5.0>}`;

    try {
      const response = await fetch(`${this.GROQ_API}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${environment.groqApiKey}` },
        body: JSON.stringify({
          model: this.LLM_MODEL,
          messages: [
            { role: 'system', content: 'You are a speech coach. Respond with valid JSON only.' },
            { role: 'user',   content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });
      if (!response.ok) throw new Error('LLM failed');
      const data = await response.json();
      const r = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      return {
        loud_control:    parseFloat((r.loudness_control ?? 3).toFixed(1)),
        pitch_variation: parseFloat((r.pitch_variation  ?? 3).toFixed(1)),
        expressive_emph: parseFloat((r.expressive_emphasis ?? 3).toFixed(1))
      };
    } catch {
      return { loud_control: 3.0, pitch_variation: 3.0, expressive_emph: 3.0 };
    }
  }
}

export interface PracticeAnalysisResult {
  transcript:        string;
  duration:          number;
  actualWpm:         number;
  wordAccuracy:      number;   // 0-100 %
  matchedWords:      number;
  totalScriptWords:  number;
  missedWords:       string[]; // unique script words not detected in speech
  fillerCount:       number;
  detectedFillers:   string[];
  dimensionScores:   Record<string, number>;
  overall:           number;   // 1.0-5.0 average of targetDimensions
  pauseStats:        any;
  noSpeechDetected?: boolean;  // transcript was blank / too short
  contentMismatch?:  boolean;  // word accuracy < 20% — wrong content spoken
}
