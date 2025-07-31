import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpeechFeedbackPage } from './speech-feedback.page';

describe('SpeechFeedbackPage', () => {
  let component: SpeechFeedbackPage;
  let fixture: ComponentFixture<SpeechFeedbackPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SpeechFeedbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
