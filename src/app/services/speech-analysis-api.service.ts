import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL          = 'https://api.groq.com/openai/v1/chat/completions';

const FILLER_SET = new Set([
  'um','uh','er','ah','hmm','hm','like','basically','literally',
  'actually','you know','i mean','sort of','kind of','right','so','well',
  'okay','alright'
]);

const PAUSE_THRESHOLD_SEC = 0.35; // gaps >= this are counted as pauses

@Injectable({ providedIn: 'root' })
export class SpeechAnalysisApiService {

  constructor(private http: HttpClient) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  analyzeSpeech(audioBlob: Blob, category: string): Observable<any> {
    return this.transcribeAudio(audioBlob).pipe(
      switchMap(transcription => this.buildFullAnalysis(transcription, category)),
      catchError((err: HttpErrorResponse | any) => {
        console.error('Speech Analysis Error:', err);
        return throwError(() => ({ ...err, message: this.resolveError(err) }));
      })
    );
  }

  // ─── Step 1: Whisper transcription with word timestamps ───────────────────

  private transcribeAudio(audioBlob: Blob): Observable<any> {
    const ext = audioBlob.type?.includes('wav') ? 'wav' : 'webm';
    const fd  = new FormData();
    fd.append('file', audioBlob, `speech.${ext}`);
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('response_format', 'verbose_json');
    fd.append('timestamp_granularities[]', 'word');
    fd.append('language', 'en');

    return this.http.post<any>(GROQ_TRANSCRIPTION_URL, fd, {
      headers: new HttpHeaders({ Authorization: `Bearer ${environment.groqApiKey}` })
    });
  }

  // ─── Step 2: Build full analysis from Whisper output ─────────────────────

  private buildFullAnalysis(transcription: any, category: string): Observable<any> {
    const transcript: string  = transcription.text?.trim() || '';
    const duration: number    = transcription.duration   || 0;
    const wordTokens: any[]   = transcription.words      || [];

    const wordCount     = transcript.split(/\s+/).filter(Boolean).length;
    const wpm           = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
    const fillerDetails = this.detectFillers(wordTokens, wordCount);
    const pauseAnalysis = this.analyzePauses(wordTokens, duration);

    const prompt = this.buildCoachingPrompt(
      transcript, category, wpm, duration, fillerDetails, pauseAnalysis
    );

    return this.http.post<any>(GROQ_CHAT_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert public speaking coach with 20 years of experience. ' +
            'Analyze the student\'s speech and return ONLY a valid JSON object. ' +
            'Be direct, specific, and encouraging — like a real coach speaking to a student.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 1600,
      response_format: { type: 'json_object' }
    }, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${environment.groqApiKey}`,
        'Content-Type': 'application/json'
      })
    }).pipe(
      switchMap(response => {
        const raw = response.choices?.[0]?.message?.content || '{}';
        let llm: any = {};
        try { llm = JSON.parse(raw); } catch (e) { console.warn('LLM parse fail', e); }
        return from(Promise.resolve(
          this.assembleResponse(llm, transcript, duration, wpm, fillerDetails, pauseAnalysis)
        ));
      })
    );
  }

  // ─── Filler word detection from Whisper word timestamps ──────────────────

  private detectFillers(
    wordTokens: any[],
    totalWordCount: number
  ): { count: number; word_count: number; ratio: number; fillers: any[]; summary: any[] } {
    const fillers: { word: string; start: number; end: number }[] = [];

    for (const token of wordTokens) {
      const clean = (token.word || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
      if (FILLER_SET.has(clean)) {
        fillers.push({
          word:  clean,
          start: +(token.start ?? 0).toFixed(2),
          end:   +(token.end   ?? 0).toFixed(2)
        });
      }
    }

    // Build summary map
    const countMap = new Map<string, number>();
    for (const f of fillers) countMap.set(f.word, (countMap.get(f.word) || 0) + 1);
    const summary = Array.from(countMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    const ratio = totalWordCount > 0
      ? +((fillers.length / totalWordCount) * 100).toFixed(1)
      : 0;

    return { count: fillers.length, word_count: totalWordCount, ratio, fillers, summary };
  }

  // ─── Pause analysis from word-level gaps ─────────────────────────────────

  private analyzePauses(wordTokens: any[], duration: number) {
    if (wordTokens.length < 2) {
      return { count: 0, average_duration: 0, longest_pause: 0, total_pause_time: 0, pauses: [] };
    }

    const pauses: { start: number; end: number; duration: number }[] = [];

    for (let i = 0; i < wordTokens.length - 1; i++) {
      const gap = (wordTokens[i + 1].start ?? 0) - (wordTokens[i].end ?? 0);
      if (gap >= PAUSE_THRESHOLD_SEC) {
        pauses.push({
          start:    +(wordTokens[i].end    ?? 0).toFixed(2),
          end:      +(wordTokens[i + 1].start ?? 0).toFixed(2),
          duration: +gap.toFixed(2)
        });
      }
    }

    const totalPauseTime = pauses.reduce((s, p) => s + p.duration, 0);
    const avgDuration    = pauses.length > 0
      ? +(totalPauseTime / pauses.length).toFixed(2) : 0;
    const longestPause   = pauses.length > 0
      ? +Math.max(...pauses.map(p => p.duration)).toFixed(2) : 0;

    return {
      count:            pauses.length,
      average_duration: avgDuration,
      longest_pause:    longestPause,
      total_pause_time: +totalPauseTime.toFixed(2),
      pauses:           pauses
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 15) // top 15 pauses for display
    };
  }

  // ─── LLM coaching prompt ──────────────────────────────────────────────────

  private buildCoachingPrompt(
    transcript: string,
    category: string,
    wpm: number,
    duration: number,
    fillers: any,
    pauses: any
  ): string {
    const fillerList    = fillers.summary.map((f: any) => `"${f.word}" (${f.count}x)`).join(', ') || 'none';
    const pausePercent  = duration > 0
      ? +((pauses.total_pause_time / duration) * 100).toFixed(1) : 0;

    return `You are coaching a student who just delivered the following ${category} speech. Analyze it and provide honest, specific, actionable feedback exactly like a professional speech coach would.

TRANSCRIPT:
"${transcript}"

OBJECTIVE DATA:
- Speech category: ${category}
- Duration: ${Math.round(duration)} seconds
- Speaking rate: ${wpm} WPM (ideal range: 120–150 WPM)
- Filler words: ${fillers.count} total — ${fillerList}
- Filler ratio: ${fillers.ratio}% of words spoken
- Number of pauses (≥ 0.35s): ${pauses.count}
- Average pause duration: ${pauses.average_duration}s
- Longest single pause: ${pauses.longest_pause}s
- Total silence: ${pauses.total_pause_time}s (${pausePercent}% of speech)

Score each dimension from 0 to 4:
- speech_pace: based on ${wpm} WPM — 120-150=4, 100-120 or 150-170=3, outside=lower
- pausing_fluency: appropriate pausing (too many long pauses = lower; strategic pauses = higher)
- loud_control: inferred from overall delivery
- pitch_variation: inferred from transcript content and delivery style
- articulation_clarity: based on transcript quality and coherence
- expressive_emph: based on ${category} speech requirements and energy in transcript
- filler_words_score: 0 fillers=4, 1-2=3, 3-5=2, 6-10=1, >10=0
- overall: holistic score

Return ONLY this JSON (no markdown, no extra text):
{
  "speech_pace": <0-4>,
  "pausing_fluency": <0-4>,
  "loud_control": <0-4>,
  "pitch_variation": <0-4>,
  "articulation_clarity": <0-4>,
  "expressive_emph": <0-4>,
  "filler_words_score": <0-4>,
  "overall": <0-4>,

  "overall_assessment": "<2-3 sentences opening exactly as a coach would speak to a student. Reference something specific from their speech. Be encouraging but honest.>",

  "strengths": [
    "<Specific strength 1 — reference actual content or metrics from their speech>",
    "<Specific strength 2>",
    "<Specific strength 3>"
  ],

  "improvements": [
    "<Specific improvement 1 with concrete how-to advice. If filler words are a problem, name the specific ones.>",
    "<Specific improvement 2>",
    "<Specific improvement 3>"
  ],

  "pace_feedback": "<1-2 sentences. Mention their exact WPM (${wpm}) and what that means for the listener.>",
  "tone_feedback": "<1-2 sentences about vocal variety, energy, and expressiveness for a ${category} speech.>",
  "clarity_feedback": "<1-2 sentences about articulation, word choice, and overall message clarity.>",
  "pausing_feedback": "<1-2 sentences. Mention avg pause of ${pauses.average_duration}s and longest pause of ${pauses.longest_pause}s. Distinguish between deliberate pauses and hesitation pauses.>",
  "filler_feedback": "<1-2 sentences. If fillers exist, name the most frequent ones and suggest the pause-instead-of-filler technique.>",

  "closing_message": "<One warm, specific, motivating sentence to end the coaching session.>"
}`;
  }

  // ─── Assemble final response ──────────────────────────────────────────────

  private assembleResponse(
    llm: any,
    transcript: string,
    duration: number,
    wpm: number,
    fillerDetails: any,
    pauseAnalysis: any
  ): any {
    const clamp = (v: any, def = 2): number => {
      const n = Number(v);
      return isNaN(n) ? def : Math.min(4, Math.max(0, Math.round(n)));
    };

    return {
      // ── Scores ──
      speech_pace:          clamp(llm.speech_pace),
      pausing_fluency:      clamp(llm.pausing_fluency),
      loud_control:         clamp(llm.loud_control),
      loudness_control:     clamp(llm.loud_control),
      pitch_variation:      clamp(llm.pitch_variation),
      articulation_clarity: clamp(llm.articulation_clarity),
      expressive_emph:      clamp(llm.expressive_emph),
      expressive_emphasis:  clamp(llm.expressive_emph),
      filler_words_score:   clamp(llm.filler_words_score),
      filler_words:         clamp(llm.filler_words_score),
      overall:              clamp(llm.overall),

      // ── Transcript & timing ──
      transcript,
      duration,
      wordCount: transcript.split(/\s+/).filter(Boolean).length,
      averagePace: wpm,

      // ── Coaching narrative ──
      overall_assessment: llm.overall_assessment || '',
      strengths:          Array.isArray(llm.strengths)    ? llm.strengths    : [llm.strengths    || ''],
      improvements:       Array.isArray(llm.improvements) ? llm.improvements : [llm.improvements || ''],
      closing_message:    llm.closing_message || '',

      // ── Per-dimension feedback ──
      pace_feedback:     llm.pace_feedback     || '',
      tone_feedback:     llm.tone_feedback      || '',
      clarity_feedback:  llm.clarity_feedback   || '',
      pausing_feedback:  llm.pausing_feedback   || '',
      filler_feedback:   llm.filler_feedback    || '',

      // ── Backward-compat flat fields ──
      areas_improvement: Array.isArray(llm.improvements)
        ? llm.improvements.join('\n\n') : (llm.areas_improvement || ''),

      // ── Rich analysis objects ──
      filler_word_details: fillerDetails,
      pause_analysis:      pauseAnalysis,

      // ── Nested feedback object (old shape still works) ──
      feedback: {
        pace_feedback:     llm.pace_feedback    || '',
        tone_feedback:     llm.tone_feedback    || '',
        clarity_feedback:  llm.clarity_feedback || '',
        strengths:         Array.isArray(llm.strengths) ? llm.strengths.join(' ') : (llm.strengths || ''),
        areas_improvement: Array.isArray(llm.improvements) ? llm.improvements.join(' ') : '',
        filler_words:      fillerDetails.fillers
      }
    };
  }

  // ─── Error helper ─────────────────────────────────────────────────────────

  private resolveError(err: any): string {
    if (err?.status === 0)   return 'No internet connection. Please check your network.';
    if (err?.status === 401) return 'Invalid Groq API key. Please check your configuration.';
    if (err?.status === 429) return 'Rate limit reached. Please wait a moment and try again.';
    if (err?.status === 413) return 'Audio file is too large. Please record a shorter speech.';
    return err?.error?.error?.message || err?.message || 'Analysis failed. Please try again.';
  }
}
