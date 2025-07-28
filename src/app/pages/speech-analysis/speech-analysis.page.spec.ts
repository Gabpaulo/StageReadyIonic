import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpeechAnalysisPage } from './speech-analysis.page';

describe('SpeechAnalysisPage', () => {
  let component: SpeechAnalysisPage;
  let fixture: ComponentFixture<SpeechAnalysisPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SpeechAnalysisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
