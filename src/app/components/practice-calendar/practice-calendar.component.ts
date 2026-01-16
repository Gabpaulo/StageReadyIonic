import { Component, OnInit, Input } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';

interface CalendarDay {
  date: Date;
  practiced: boolean;
  speechCount: number;
  currentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-practice-calendar',
  templateUrl: './practice-calendar.component.html',
  styleUrls: ['./practice-calendar.component.scss'],
  standalone: false
})
export class PracticeCalendarComponent implements OnInit {
  @Input() userId!: string;

  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  practiceDates: Set<string> = new Set();
  practiceStats: { [key: string]: number } = {};

  currentStreak = 0;
  longestStreak = 0;
  totalPracticeDays = 0;

  constructor(private firebaseService: FirebaseService) {}

  async ngOnInit() {
    await this.loadPracticeHistory();
    this.generateCalendar();
  }

  async loadPracticeHistory() {
    if (!this.userId) return;

    try {
      const history = await this.firebaseService.getSpeechHistory(this.userId);

      // Process history to extract practice dates
      history.forEach((speech: any) => {
        const timestamp = speech.timestamp?.toDate?.() || new Date(speech.timestamp);
        const dateKey = this.getDateKey(timestamp);

        this.practiceDates.add(dateKey);
        this.practiceStats[dateKey] = (this.practiceStats[dateKey] || 0) + 1;
      });

      this.totalPracticeDays = this.practiceDates.size;
      this.calculateStreaks();
    } catch (error) {
      console.error('Error loading practice history:', error);
    }
  }

  calculateStreaks() {
    const sortedDates = Array.from(this.practiceDates)
      .map(dateKey => new Date(dateKey))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length === 0) return;

    // Calculate current streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const dateKey = this.getDateKey(checkDate);
      if (this.practiceDates.has(dateKey)) {
        streak++;
      } else if (i > 0) {
        // Allow one day gap for current streak
        break;
      }
    }

    this.currentStreak = streak;

    // Calculate longest streak
    let maxStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = sortedDates[i];
      const next = sortedDates[i + 1];

      const dayDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    this.longestStreak = Math.max(maxStreak, 1);
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    this.calendarDays = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateKey = this.getDateKey(currentDate);
      const practiced = this.practiceDates.has(dateKey);
      const speechCount = this.practiceStats[dateKey] || 0;

      this.calendarDays.push({
        date: new Date(currentDate),
        practiced,
        speechCount,
        currentMonth: currentDate.getMonth() === month,
        isToday: currentDate.getTime() === today.getTime()
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  getDateKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  get currentMonthYear(): string {
    return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  canGoNext(): boolean {
    const today = new Date();
    const nextMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    return nextMonth <= today;
  }
}
