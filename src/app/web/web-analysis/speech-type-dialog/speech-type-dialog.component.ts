import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-speech-type-dialog',
  template: `
    <h2 mat-dialog-title>Choose Speech Type</h2>
    <mat-dialog-content>
      <p>What type of speech are you practicing?</p>
      <mat-radio-group [(ngModel)]="selectedType" class="speech-type-group">
        <mat-radio-button value="informative" class="speech-type-option">
          <div class="option-content">
            <strong>Informative</strong>
            <p>Educational or explanatory content</p>
          </div>
        </mat-radio-button>
        <mat-radio-button value="motivational" class="speech-type-option">
          <div class="option-content">
            <strong>Motivational</strong>
            <p>Inspiring and encouraging content</p>
          </div>
        </mat-radio-button>
        <mat-radio-button value="persuasive" class="speech-type-option">
          <div class="option-content">
            <strong>Persuasive</strong>
            <p>Convincing or argumentative content</p>
          </div>
        </mat-radio-button>
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button color="primary" (click)="onConfirm()" [disabled]="!selectedType">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    h2 {
      color: #e8f1f9;
      margin: 0 0 16px 0;
    }
    
    mat-dialog-content {
      color: #9bb2c8;
      
      p {
        color: #9bb2c8;
        margin-bottom: 16px;
      }
    }
    
    .speech-type-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }
    
    .speech-type-option {
      padding: 12px;
      border: 1px solid #2b3b4c;
      border-radius: 8px;
      transition: all 0.2s;
      background: #1a2734;
    }
    
    .speech-type-option:hover {
      background-color: #1e2c3a;
      border-color: #22a7f0;
    }
    
    .speech-type-option.mat-radio-checked {
      border-color: #22a7f0;
      background-color: rgba(34, 167, 240, 0.1);
    }
    
    ::ng-deep .mat-radio-button .mat-radio-outer-circle {
      border-color: #2b3b4c;
    }
    
    ::ng-deep .mat-radio-button.mat-radio-checked .mat-radio-outer-circle {
      border-color: #22a7f0;
    }
    
    ::ng-deep .mat-radio-button .mat-radio-inner-circle {
      background-color: #22a7f0;
    }
    
    .option-content {
      margin-left: 8px;
    }
    
    .option-content strong {
      display: block;
      margin-bottom: 4px;
      color: #e8f1f9;
    }
    
    .option-content p {
      margin: 0;
      color: #9bb2c8;
      font-size: 14px;
    }
    
    mat-dialog-actions {
      margin-top: 24px;
      
      button {
        color: #9bb2c8;
        
        &[color="primary"] {
          color: #22a7f0;
        }
      }
    }
  `],
  standalone: false
})
export class SpeechTypeDialogComponent {
  selectedType: 'informative' | 'motivational' | 'persuasive';

  constructor(
    public dialogRef: MatDialogRef<SpeechTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentType: 'informative' | 'motivational' | 'persuasive' }
  ) {
    this.selectedType = data.currentType;
  }

  onCancel() {
    this.dialogRef.close();
  }

  onConfirm() {
    this.dialogRef.close(this.selectedType);
  }
}

