import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL          = 'https://api.groq.com/openai/v1/chat/completions';

const PAUSE_THRESHOLD_SEC = 0.4;

/**
 * Ordered longest-first so multi-word fillers ("you know", "i mean") match
 * before single words.  All entries lowercase, no punctuation.
 */
const FILLER_PATTERNS: { phrase: string; regex: RegExp }[] = [
  'you know', 'i mean', 'sort of', 'kind of',
  'um', 'uh', 'er', 'ah', 'hmm', 'hm', 'mhm',
  'like', 'basically', 'literally', 'actually',
  'right', 'so', 'well', 'okay', 'alright'
].map(p => ({
  phrase: p,
  // word-boundary aware; handles optional trailing punctuation
  regex: new RegExp(`(?<![\\w])${p.replace(/\s+/g, '\\s+')}(?![\\w])`, 'gi')
}));

@Injectable({ providedIn: 'root' })
export class SpeechAnalysisApiService {

  constructor(private http: HttpClient) {}

  analyzeSpeech(audioBlob: Blob, category: string): Observable<any> {
    return this.transcribeAudio(audioBlob).pipe(
      switchMap(t => this.buildFullAnalysis(t, category)),
      catchError((err: HttpErrorResponse | any) => {
        console.error('Speech Analysis Error:', err);
        return throwError(() => ({ ...err, message: this.resolveError(err) }));
      })
    );
  }

  // ─── Step 1: Whisper ─────────────────────────────────────────────────────

  private transcribeAudio(audioBlob: Blob): Observable<any> {
    const ext = audioBlob.type?.includes('wav') ? 'wav' : 'webm';
    const fd  = new FormData();
    fd.append('file', audioBlob, `speech.${ext}`);
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('response_format', 'verbose_json');
    fd.append('timestamp_granularities[]', 'word');
    fd.append('language', 'en');
    // Bias Whisper to keep hesitation words instead of silently dropping them
    fd.append('prompt',
      'Transcribe exactly as spoken, including all hesitation sounds and filler words ' +
      'such as um, uh, er, ah, hmm, like, so, well, you know, i mean, basically, ' +
      'literally, actually, right, okay, alright, sort of, kind of.'
    );

    return this.http.post<any>(GROQ_TRANSCRIPTION_URL, fd, {
      headers: new HttpHeaders({ Authorization: `Bearer ${environment.groqApiKey}` })
    });
  }

  // ─── Step 2: Build analysis ───────────────────────────────────────────────

  private buildFullAnalysis(transcription: any, category: string): Observable<any> {
    const transcript: string = transcription.text?.trim() || '';
    const duration: number   = transcription.duration     || 0;
    const wordTokens: any[]  = transcription.words        || [];

    const wordCount     = transcript.split(/\s+/).filter(Boolean).length;
    const wpm           = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
    const fillerDetails = this.detectFillers(wordTokens, transcript, duration, wordCount);
    const pauseAnalysis = this.analyzePauses(wordTokens, duration);

    const prompt = this.buildPrompt(transcript, category, wpm, duration, fillerDetails, pauseAnalysis);

    return this.http.post<any>(GROQ_CHAT_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional speech coach with 20 years of experience training ' +
            'executives, students, and public figures. You give feedback the way a real ' +
            'coach would in a one-on-one session — direct, honest, warm, and always ' +
            'grounded in exactly what the student said. You NEVER give generic praise. ' +
            'Every sentence you write must reference something specific from the transcript, ' +
            'the metrics, or a concrete technique. Return ONLY valid JSON, no markdown.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1800,
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
          this.assembleResponse(llm, transcript, duration, wpm, fillerDetails, pauseAnalysis, category)
        ));
      })
    );
  }

  // ─── Filler detection — dual strategy ────────────────────────────────────
  /**
   * Strategy 1: scan Whisper word tokens (has exact timestamps).
   * Strategy 2: scan the transcript text (catches what Whisper normalised away),
   *             then estimate timestamps from word position + average WPM.
   * Merge both; deduplicate by timestamp proximity.
   */
  private detectFillers(
    wordTokens: any[],
    transcript: string,
    duration: number,
    totalWordCount: number
  ): { count: number; word_count: number; ratio: number; fillers: any[]; summary: any[] } {

    const fillers: { word: string; start: number; end: number; source: string }[] = [];

    // ── Strategy 1: token-level scan ──────────────────────────────────────
    for (const token of wordTokens) {
      const raw   = (token.word || '').trim();
      const clean = raw.toLowerCase().replace(/[^a-z\s]/g, '').trim();
      if (!clean) continue;

      for (const { phrase } of FILLER_PATTERNS) {
        if (clean === phrase || clean.startsWith(phrase + ' ') || clean.endsWith(' ' + phrase)) {
          fillers.push({
            word:   phrase,
            start:  +(token.start ?? 0).toFixed(2),
            end:    +(token.end   ?? 0).toFixed(2),
            source: 'token'
          });
          break;
        }
      }
    }

    // ── Strategy 2: text scan with estimated timestamps ───────────────────
    const avgSecPerWord = totalWordCount > 0 && duration > 0
      ? duration / totalWordCount : 0.4;

    // Build a word-position → approximate timestamp map from tokens
    const tokenMap = new Map<number, { start: number; end: number }>();
    wordTokens.forEach((t, i) => tokenMap.set(i, { start: t.start ?? 0, end: t.end ?? 0 }));

    // Tokenize transcript to get positions
    const transcriptWords = transcript.split(/\s+/);

    for (const { phrase, regex } of FILLER_PATTERNS) {
      let m: RegExpExecArray | null;
      // Reset lastIndex each call since we reuse regex objects
      regex.lastIndex = 0;
      const transcriptLower = transcript.toLowerCase();

      while ((m = regex.exec(transcriptLower)) !== null) {
        // Find approximate word index by counting spaces before match
        const charsBefore   = transcriptLower.slice(0, m.index);
        const wordIdx       = charsBefore.split(/\s+/).filter(Boolean).length;
        const tokenEntry    = tokenMap.get(wordIdx);

        let start: number;
        let end:   number;

        if (tokenEntry) {
          start = +tokenEntry.start.toFixed(2);
          end   = +tokenEntry.end.toFixed(2);
        } else {
          // Estimate from word position
          start = +(wordIdx * avgSecPerWord).toFixed(2);
          end   = +((wordIdx + phrase.split(' ').length) * avgSecPerWord).toFixed(2);
        }

        // Deduplicate: skip if a token-source filler is within 0.5s
        const alreadyCovered = fillers.some(
          f => f.word === phrase && Math.abs(f.start - start) < 0.5
        );

        if (!alreadyCovered) {
          fillers.push({ word: phrase, start, end, source: 'text' });
        }
      }
    }

    // Sort by start time
    fillers.sort((a, b) => a.start - b.start);

    // Summary map
    const countMap = new Map<string, number>();
    for (const f of fillers) countMap.set(f.word, (countMap.get(f.word) || 0) + 1);
    const summary = Array.from(countMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    const ratio = totalWordCount > 0
      ? +((fillers.length / totalWordCount) * 100).toFixed(1) : 0;

    return {
      count:      fillers.length,
      word_count: totalWordCount,
      ratio,
      fillers:    fillers.map(({ word, start, end }) => ({ word, start, end })),
      summary
    };
  }

  // ─── Pause & fluency analysis ─────────────────────────────────────────────

  private analyzePauses(wordTokens: any[], duration: number) {
    if (wordTokens.length < 2) {
      return {
        count: 0, average_duration: 0, longest_pause: 0, total_pause_time: 0,
        pauses: [], wpm_segments: []
      };
    }

    // ── Pause detection ──────────────────────────────────────────────────────
    const pauses: { start: number; end: number; duration: number }[] = [];

    for (let i = 0; i < wordTokens.length - 1; i++) {
      const gap = (wordTokens[i + 1].start ?? 0) - (wordTokens[i].end ?? 0);
      if (gap >= PAUSE_THRESHOLD_SEC) {
        pauses.push({
          start:    +(wordTokens[i].end         ?? 0).toFixed(2),
          end:      +(wordTokens[i + 1].start   ?? 0).toFixed(2),
          duration: +gap.toFixed(2)
        });
      }
    }

    const totalPauseTime = pauses.reduce((s, p) => s + p.duration, 0);
    const avgDuration    = pauses.length > 0
      ? +(totalPauseTime / pauses.length).toFixed(2) : 0;
    const longestPause   = pauses.length > 0
      ? +Math.max(...pauses.map(p => p.duration)).toFixed(2) : 0;

    // ── Rolling WPM segments ─────────────────────────────────────────────────
    // Use a sliding window of WINDOW_WORDS words, stepped by STEP_WORDS, to find
    // the fastest bursts in the speech with their timestamps.
    const WINDOW_WORDS = 10;
    const STEP_WORDS   = 5;
    const wpmSegments: { start: number; end: number; wpm: number }[] = [];

    if (wordTokens.length >= WINDOW_WORDS) {
      for (let i = 0; i <= wordTokens.length - WINDOW_WORDS; i += STEP_WORDS) {
        const first   = wordTokens[i];
        const last    = wordTokens[i + WINDOW_WORDS - 1];
        const segStart = +(first.start ?? 0).toFixed(2);
        const segEnd   = +(last.end   ?? 0).toFixed(2);
        const segDurMin = (segEnd - segStart) / 60;
        if (segDurMin <= 0) continue;
        const wpm = Math.round(WINDOW_WORDS / segDurMin);
        wpmSegments.push({ start: segStart, end: segEnd, wpm });
      }
    }

    // Keep the top 5 fastest segments, sorted descending by WPM
    const topWpmSegments = [...wpmSegments]
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 5);

    return {
      count:            pauses.length,
      average_duration: avgDuration,
      longest_pause:    longestPause,
      total_pause_time: +totalPauseTime.toFixed(2),
      pauses:           [...pauses]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 15),
      wpm_segments:     topWpmSegments
    };
  }

  // ─── Category weights for overall score ─────────────────────────────────
  private static readonly WEIGHTS: Record<string, Record<string, number>> = {
    informative: { speech_pace: 0.16, pausing_fluency: 0.13, loud_control: 0.14, pitch_variation: 0.12, articulation_clarity: 0.17, filler_words_score: 0.18, expressive_emph: 0.10 },
    persuasive:  { speech_pace: 0.15, pausing_fluency: 0.12, loud_control: 0.12, pitch_variation: 0.17, articulation_clarity: 0.17, filler_words_score: 0.08, expressive_emph: 0.19 },
    motivational:{ speech_pace: 0.13, pausing_fluency: 0.12, loud_control: 0.14, pitch_variation: 0.18, articulation_clarity: 0.15, filler_words_score: 0.06, expressive_emph: 0.22 },
  };

  private calcWeightedOverall(scores: Record<string, number>, category: string): number {
    const w = SpeechAnalysisApiService.WEIGHTS[category.toLowerCase()]
           || SpeechAnalysisApiService.WEIGHTS['informative'];
    const raw = w['speech_pace']          * scores['speech_pace']
              + w['pausing_fluency']      * scores['pausing_fluency']
              + w['loud_control']         * scores['loud_control']
              + w['pitch_variation']      * scores['pitch_variation']
              + w['articulation_clarity'] * scores['articulation_clarity']
              + w['filler_words_score']   * scores['filler_words_score']
              + w['expressive_emph']      * scores['expressive_emph'];
    return +raw.toFixed(2);
  }

  // ─── LLM prompt ───────────────────────────────────────────────────────────

  private buildPrompt(
    transcript: string,
    category: string,
    wpm: number,
    duration: number,
    fillers: any,
    pauses: any
  ): string {
    const fillerList   = fillers.summary.length
      ? fillers.summary.map((f: any) => `"${f.word}" × ${f.count}`).join(', ')
      : 'none detected';
    const pausePct     = duration > 0
      ? +((pauses.total_pause_time / duration) * 100).toFixed(1) : 0;
    const paceRating   = wpm < 100 ? 'very slow' : wpm < 120 ? 'slightly slow'
                       : wpm <= 150 ? 'ideal' : wpm <= 170 ? 'slightly fast' : 'too fast';

    // Pre-compute deterministic scores so the LLM only needs to judge qualitative ones
    const paceSc   = wpm >= 120 && wpm <= 150 ? 5 : wpm >= 105 && wpm <= 165 ? 4 : wpm >= 90 && wpm <= 180 ? 3 : wpm >= 75 ? 2 : 1;
    const fillerSc = fillers.count === 0 ? 5 : fillers.count <= 2 ? 4 : fillers.count <= 5 ? 3 : fillers.count <= 10 ? 2 : 1;

    const opening = transcript.slice(0, 220).replace(/"/g, "'");

    return `You are coaching a student on their ${category} speech. Here is EVERYTHING you need:

FULL TRANSCRIPT:
"${transcript}"

OPENING (first words): "${opening}..."

OBJECTIVE METRICS:
- Duration: ${Math.round(duration)}s
- WPM: ${wpm} (${paceRating} — ideal is 120–150 WPM)
- Filler words: ${fillers.count} total → ${fillerList}
- Filler ratio: ${fillers.ratio}% of all words
- Pauses ≥ ${PAUSE_THRESHOLD_SEC}s: ${pauses.count} total
- Average pause: ${pauses.average_duration}s | Longest: ${pauses.longest_pause}s
- Total silence: ${pauses.total_pause_time}s (${pausePct}% of speech)

SCORING RULES (1–5 scale, where 1=Very Poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent):
- speech_pace: MUST be exactly ${paceSc} (pre-computed from WPM=${wpm})
- filler_words_score: MUST be exactly ${fillerSc} (pre-computed from count=${fillers.count})
- pausing_fluency: score 1-5 based on whether the ${pauses.count} pauses (avg ${pauses.average_duration}s) aid or disrupt the speech flow
- loud_control: score 1-5 by inferring volume energy from sentence structure, word emphasis, exclamations
- pitch_variation: score 1-5 from punctuation, question marks, exclamations, emotional range in the transcript
- articulation_clarity: score 1-5 from sentence completeness, coherent word choice, clear ideas
- expressive_emph: score 1-5 on how engaging and expressive this ${category} speech is

DO NOT compute overall — it will be calculated separately using category weights.

RULES FOR YOUR FEEDBACK (STRICTLY ENFORCED):
1. overall_assessment: Quote an EXACT phrase from the transcript (use quotation marks). Be direct. 2–3 sentences max.
2. strengths: Each item MUST quote something specific — a phrase they used, a metric they achieved, or a technique they demonstrated. NO generic praise.
3. improvements: Each item MUST be actionable. Reference their actual data (specific filler words, their actual WPM, their actual pause count).
4. ALL 7 feedback fields (pace_feedback, volume_feedback, pitch_feedback, clarity_feedback, pausing_feedback, filler_feedback, tone_feedback) are REQUIRED — none can be empty.
5. All feedback must mention specific numbers, words, or phrases from this speech.

Return ONLY this JSON:
{
  "speech_pace": ${paceSc},
  "pausing_fluency": <1-5>,
  "loud_control": <1-5>,
  "pitch_variation": <1-5>,
  "articulation_clarity": <1-5>,
  "expressive_emph": <1-5>,
  "filler_words_score": ${fillerSc},
  "overall_assessment": "<2-3 sentences. Quote an exact phrase from their transcript. Mention one specific metric.>",
  "strengths": [
    "<Quote a specific phrase or metric from their speech>",
    "<Another specific strength with evidence>",
    "<Third specific strength>"
  ],
  "improvements": [
    "<Specific fix #1 referencing their actual data, e.g. 'You said \\"um\\" ${fillers.summary[0]?.count ?? 0} times — practice pausing silently instead'>",
    "<Specific fix #2>",
    "<Specific fix #3>"
  ],
  "pace_feedback": "<Reference their exact WPM of ${wpm}. Explain what that pace felt like and what to adjust.>",
  "volume_feedback": "<Infer energy/volume from the transcript. Quote a line where energy was strong or weak. Give advice.>",
  "pitch_feedback": "<Reference punctuation patterns or emotional range. Quote a line. Give specific technique to vary pitch.>",
  "clarity_feedback": "<Reference word choice or sentence structure from their actual transcript. Quote an example.>",
  "pausing_feedback": "<Mention their ${pauses.count} pauses, avg ${pauses.average_duration}s. Were they strategic or hesitant? Specific advice.>",
  "filler_feedback": "<Name their most frequent filler words from: ${fillerList}. Give the specific replace-with-pause technique.>",
  "tone_feedback": "<Reference energy level and expressiveness for a ${category} speech. Quote a phrase where energy was high or flat.>",
  "closing_message": "<One sentence. Reference one thing they should be proud of from this specific speech and one thing to focus on next time.>"
}`;
  }

  // ─── Assemble response ────────────────────────────────────────────────────

  private assembleResponse(
    llm: any,
    transcript: string,
    duration: number,
    wpm: number,
    fillerDetails: any,
    pauseAnalysis: any,
    category: string
  ): any {
    // 1-5 scale
    const clamp = (v: any, def = 3): number => {
      const n = Number(v);
      return isNaN(n) ? def : Math.min(5, Math.max(1, Math.round(n)));
    };

    const scores = {
      speech_pace:          clamp(llm.speech_pace),
      pausing_fluency:      clamp(llm.pausing_fluency),
      loud_control:         clamp(llm.loud_control),
      pitch_variation:      clamp(llm.pitch_variation),
      articulation_clarity: clamp(llm.articulation_clarity),
      expressive_emph:      clamp(llm.expressive_emph),
      filler_words_score:   clamp(llm.filler_words_score),
    };

    const overall = this.calcWeightedOverall(scores, category);

    return {
      ...scores,
      loudness_control:    scores.loud_control,
      expressive_emphasis: scores.expressive_emph,
      filler_words:        scores.filler_words_score,
      overall,

      category,
      transcript,
      duration,
      wordCount:   transcript.split(/\s+/).filter(Boolean).length,
      averagePace: wpm,

      overall_assessment: llm.overall_assessment || '',
      strengths:   Array.isArray(llm.strengths)    ? llm.strengths.filter(Boolean)    : [],
      improvements:Array.isArray(llm.improvements) ? llm.improvements.filter(Boolean) : [],
      closing_message: llm.closing_message || '',

      pace_feedback:    llm.pace_feedback    || '',
      volume_feedback:  llm.volume_feedback  || '',
      pitch_feedback:   llm.pitch_feedback   || '',
      tone_feedback:    llm.tone_feedback    || '',
      clarity_feedback: llm.clarity_feedback || '',
      pausing_feedback: llm.pausing_feedback || '',
      filler_feedback:  llm.filler_feedback  || '',

      areas_improvement: Array.isArray(llm.improvements)
        ? llm.improvements.join('\n\n') : '',

      filler_word_details: fillerDetails,
      pause_analysis:      pauseAnalysis,
    };
  }

  private resolveError(err: any): string {
    if (err?.status === 0)   return 'No internet connection. Please check your network.';
    if (err?.status === 401) return 'Invalid Groq API key.';
    if (err?.status === 429) return 'Rate limit reached. Please wait and try again.';
    if (err?.status === 413) return 'Audio file too large. Record a shorter speech.';
    return err?.error?.error?.message || err?.message || 'Analysis failed. Please try again.';
  }
}
