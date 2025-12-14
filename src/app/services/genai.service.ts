import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environment';
import { from, Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { AnalyzeSpeechForFeedbackOutput } from '../pages/speech-analysis/model';

@Injectable({ providedIn: 'root' })
export class GenAIService {
  private ai = new GoogleGenerativeAI(environment.geminiApiKey);
  private useBackend = true; // Set to false to use Gemini API instead

  constructor(private http: HttpClient) {}

  analyzeAudioBlob(blob: Blob, speechType: 'informative' | 'motivational' | 'persuasive' = 'informative'): Observable<AnalyzeSpeechForFeedbackOutput> {
    if (this.useBackend && environment.backendApiUrl) {
      // Use Django backend
      return this.analyzeWithBackend(blob, speechType);
    } else {
      // Fallback to Gemini API
      return this.analyzeWithGemini(blob, speechType);
    }
  }

  private analyzeWithBackend(blob: Blob, speechType: 'informative' | 'motivational' | 'persuasive'): Observable<AnalyzeSpeechForFeedbackOutput> {
    const formData = new FormData();
    formData.append('audio_file', blob, 'recording.webm');
    formData.append('category', speechType);

    return this.http.post<any>(`${environment.backendApiUrl}/analyze/`, formData).pipe(
      map(response => {
        // Transform backend response to match expected format
        const fillerWords = (response.filler_words || []).map((fw: any) => ({
          word: fw.word || '',
          start_time: fw.start_time !== undefined ? fw.start_time : (fw.timestamp || 0)
        }));

        return {
          transcript: response.transcript || '',
          category: response.category || '',
          duration: response.duration || 0,
          speech_pace: response.speech_pace,
          pausing_fluency: response.pausing_fluency,
          loud_control: response.loud_control,
          pitch_variation: response.pitch_variation,
          articulation_clarity: response.articulation_clarity,
          expressive_emph: response.expressive_emph,
          filler_words_score: response.filler_words_score,
          overall: response.overall,
          pace_feedback: response.pace_feedback || '',
          tone_feedback: response.tone_feedback || '',
          clarity_feedback: response.clarity_feedback || '',
          strengths: response.strengths || '',
          areas_improvement: response.areas_improvement || '',
          filler_words: fillerWords,
          analysis: response.analysis || null
        } as AnalyzeSpeechForFeedbackOutput;
      }),
      catchError(error => {
        console.error('Backend analysis error, falling back to Gemini:', error);
        // Fallback to Gemini if backend fails
        return this.analyzeWithGemini(blob, speechType);
      })
    );
  }

  private analyzeWithGemini(blob: Blob, speechType: 'informative' | 'motivational' | 'persuasive'): Observable<AnalyzeSpeechForFeedbackOutput> {
    // 1) Blob → base64 Data URI
    const toDataUri = new Promise<string>((resolve, reject) => {
      const rdr = new FileReader();
      rdr.onloadend = () => resolve(rdr.result as string);
      rdr.onerror = reject;
      rdr.readAsDataURL(blob);
    });

    return from(toDataUri).pipe(
      // 2) Call Gemini with a prompt asking ONLY for descriptive feedback
      switchMap(dataUri => {
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        return model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an AI speech coach. The user is practicing a ${speechType} public speech. Tailor your feedback to that style. Given this audio, return STRICT JSON with ONLY these keys:
  "transcript" (the spoken text),
  "pace_feedback" (a sentence describing the speaker's pace),
  "tone_feedback" (a sentence describing the speaker's tone),
  "clarity_feedback" (a sentence about how clear the speech was),
  "filler_words" (a list with each filler word & start_time).
Do NOT include any numerical scores or overall summaries.`
                },
                {
                  inlineData: {
                    mimeType: blob.type,
                    data: dataUri.split(',')[1]
                  }
                }
              ]
            }
          ]
        });
      }),
      // 3) Strip Markdown fences & parse JSON
      switchMap(res => {
        let text = res.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = m ? m[1] : text;
        const parsed = JSON.parse(jsonStr.trim());
        return [parsed as AnalyzeSpeechForFeedbackOutput];
      })
    );
  }
}
