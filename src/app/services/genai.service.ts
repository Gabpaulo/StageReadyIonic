import { Injectable } from '@angular/core';
import { GoogleGenAI }   from '@google/genai';
import { environment }   from '../../environments/environment';
import { from, Observable } from 'rxjs';
import { switchMap }     from 'rxjs/operators';
import { AnalyzeSpeechForFeedbackOutput }
  from '../pages/speech-analysis/model';

@Injectable({ providedIn: 'root' })
export class SpeechAnalysisService {
  private ai = new GoogleGenAI({ apiKey: environment.geminiApiKey });

  analyzeAudioBlob(blob: Blob, speechType: 'informative' | 'motivational' | 'persuasive' = 'informative'): Observable<AnalyzeSpeechForFeedbackOutput> {
    // 1) Blob → base64 Data URI
    const toDataUri = new Promise<string>((resolve, reject) => {
      const rdr = new FileReader();
      rdr.onloadend = () => resolve(rdr.result as string);
      rdr.onerror = reject;
      rdr.readAsDataURL(blob);
    });

    return from(toDataUri).pipe(
      // 2) Call Gemini with a prompt asking ONLY for descriptive feedback
      switchMap(dataUri =>
        this.ai.models.generateContent({
          model: 'gemini-1.5-flash-latest',
          contents: [
            {
              text: `You are an AI speech coach. The user is practicing a ${speechType} public speech. Tailor your feedback to that style. Given this audio, return STRICT JSON with ONLY these keys:
  "transcript" (the spoken text),
  "pace" (a sentence describing the speaker’s pace),
  "tone" (a sentence describing the speaker’s tone),
  "clarity" (a sentence about how clear the speech was),
  "fillerWords" (an object with "feedback" and a "words" list with each filler word & timestamp).
Do NOT include any numerical scores or overall summaries.`
            },
            {
              inlineData: {
                mimeType: blob.type,
                data: dataUri.split(',')[1]
              }
            }
          ]
        })
      ),
      // 3) Strip Markdown fences & parse JSON
      switchMap(res => {
        let text = res.text ?? '';
        const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = m ? m[1] : text;
        const parsed = JSON.parse(jsonStr.trim());
        return [parsed as AnalyzeSpeechForFeedbackOutput];
      })
    );
  }
}
