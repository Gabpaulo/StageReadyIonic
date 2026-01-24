import { Component, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
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
export class PracticeCalendarComponent implements OnInit, OnChanges {
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

  private hasLoaded = false;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    // Generate empty calendar immediately
    this.generateCalendar();
  }

  async ngOnChanges(changes: SimpleChanges) {
    // When userId changes and has a value, load the practice history
    if (changes['userId'] && this.userId) {
      // Reset if user changed
      if (changes['userId'].previousValue !== changes['userId'].currentValue) {
        this.hasLoaded = false;
        this.practiceDates.clear();
        this.practiceStats = {};
      }

      if (!this.hasLoaded) {
        this.hasLoaded = true;
        console.log('PracticeCalendar: Loading history for user:', this.userId);
        await this.loadPracticeHistory();
        console.log('PracticeCalendar: Loaded', this.practiceDates.size, 'practice dates:', Array.from(this.practiceDates));
        this.generateCalendar();
      }
    }
  }

  async loadPracticeHistory() {
    if (!this.userId) {
      console.log('PracticeCalendar: No userId, skipping load');
      return;
    }

    try {
      const history = await this.firebaseService.getSpeechHistory(this.userId);
      console.log('PracticeCalendar: Retrieved', history.length, 'speech history entries');

      // Process history to extract practice dates
      history.forEach((speech: any, index: number) => {
        // getSpeechHistory returns entries with createdAt as a Date object
        let timestamp: Date;
        if (speech.createdAt instanceof Date) {
          timestamp = speech.createdAt;
        } else if (speech.createdAt?.toDate) {
          timestamp = speech.createdAt.toDate();
        } else if (speech.timestamp?.toDate) {
          timestamp = speech.timestamp.toDate();
        } else if (speech.timestamp) {
          timestamp = new Date(speech.timestamp);
        } else if (speech.createdAt) {
          timestamp = new Date(speech.createdAt);
        } else {
          console.warn('PracticeCalendar: Speech entry', index, 'missing timestamp:', speech);
          return;
        }

        const dateKey = this.getDateKey(timestamp);
        console.log('PracticeCalendar: Entry', index, '- Date:', timestamp.toISOString(), '-> Key:', dateKey);
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
    if (this.practiceDates.size === 0) {
      this.currentStreak = 0;
      this.longestStreak = 0;
      return;
    }

    // Get sorted unique practice dates (most recent first)
    const sortedDates = Array.from(this.practiceDates)
      .map(dateKey => new Date(dateKey))
      .sort((a, b) => b.getTime() - a.getTime());

    // Calculate current streak starting from today/yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentPractice = sortedDates[0];
    mostRecentPractice.setHours(0, 0, 0, 0);

    const daysSinceLast = Math.floor((today.getTime() - mostRecentPractice.getTime()) / (1000 * 60 * 60 * 24));

    // If last practice was more than 1 day ago, streak is broken
    if (daysSinceLast > 1) {
      this.currentStreak = 0;
    } else {
      // Count consecutive days backwards from most recent practice
      let streak = 1;
      let expectedDate = new Date(mostRecentPractice);
      expectedDate.setDate(expectedDate.getDate() - 1);

      for (let i = 1; i < sortedDates.length; i++) {
        const currentDay = new Date(sortedDates[i]);
        currentDay.setHours(0, 0, 0, 0);

        if (currentDay.getTime() === expectedDate.getTime()) {
          streak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }

      this.currentStreak = streak;
    }

    // Calculate longest streak by checking all consecutive sequences
    let maxStreak = 1;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      current.setHours(0, 0, 0, 0);
      next.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    this.longestStreak = maxStreak;
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
