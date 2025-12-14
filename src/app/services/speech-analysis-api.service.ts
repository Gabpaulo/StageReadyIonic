import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpeechAnalysisApiService {
  private apiUrl = environment.backendApiUrl + '/analyze/'; // http://localhost:8000/api/analyze/

  constructor(private http: HttpClient) { }

  analyzeSpeech(audioBlob: Blob, category: string): Observable<any> {
    const formData = new FormData();
    // Use the actual blob type or default to webm
    const fileName = `speech.${audioBlob.type?.split('/')[1] || 'webm'}`;
    formData.append('audio_file', audioBlob, fileName);
    formData.append('category', category);

    console.log('Sending request to:', this.apiUrl);
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    console.log('Audio blob type:', audioBlob.type);
    console.log('Category:', category);
    console.log('File name:', fileName);

    return this.http.post(this.apiUrl, formData, {
      headers: {
        // Don't set Content-Type - let browser set it with boundary for FormData
      }
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Speech Analysis API Error:', error);
        
        let errorMessage = 'Analysis failed. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to backend server. Please ensure the backend is running at http://localhost:8000';
        } else if (error.status === 400) {
          errorMessage = error.error?.error || error.error?.message || 'Invalid request. Please check your audio file.';
        } else if (error.status === 503) {
          errorMessage = 'ML models not trained yet. Please train models first.';
        } else if (error.status === 500) {
          errorMessage = error.error?.error || 'Server error. Please try again later.';
        } else if (error.error) {
          errorMessage = error.error.error || error.error.message || JSON.stringify(error.error);
        }
        
        return throwError(() => ({ ...error, message: errorMessage }));
      })
    );
  }
}
