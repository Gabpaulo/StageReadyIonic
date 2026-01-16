# Practice Calendar - Feature Guide

## Overview

A beautiful, interactive calendar component that tracks and visualizes your practice days with streaks, stats, and color-coded practice intensity!

## What Was Added

### New Component
**File:** `src/app/components/practice-calendar/practice-calendar.component.ts`

A fully-featured practice calendar with:
- 📅 Monthly calendar view with navigation
- 🔥 Current practice streak tracker
- 🏆 Longest streak counter
- 📊 Total practice days count
- 🎨 Color-coded days (blue for 1 practice, green for 2+)
- ✨ Smooth animations and hover effects
- 📱 Fully responsive design

### Integration
- ✅ Added to Web Dashboard
- ✅ Automatically loads practice history from Firebase
- ✅ Updates in real-time

## Features

### 1. Calendar Stats (Top Section)
```
🔥 Day Streak    🏆 Best Streak    📅 Total Days
     5               12                 28
```

Shows three key metrics:
- **Day Streak**: Current consecutive days
- **Best Streak**: Longest streak ever
- **Total Days**: Total unique practice days

### 2. Month Navigation
- Previous/Next month buttons
- Current month/year display
- Can't navigate beyond current month

### 3. Visual Calendar Grid
- **Empty Days**: Gray with light border
- **1 Practice**: Blue background with blue dot
- **2+ Practices**: Green background with green dot + count badge
- **Today**: Blue border highlight
- **Hover Effects**: Scale up and glow

### 4. Interactive Features
- Click/hover on days to see practice count
- Days from other months are dimmed
- Today is always highlighted
- Practice count badge for multiple sessions

### 5. Legend
Shows what each color means:
- Gray: No practice
- Blue: 1 practice session
- Green: 2+ practice sessions

## How It Works

### Data Flow
1. Component receives `userId` from parent dashboard
2. Loads practice history from Firebase `speechHistory` collection
3. Groups practices by date
4. Calculates streaks automatically
5. Renders calendar with color-coding

### Streak Calculation
**Current Streak:**
- Counts consecutive days from today backward
- Allows 1-day gap (yesterday can be skipped if today practiced)

**Longest Streak:**
- Finds longest consecutive practice period
- Historical calculation across all data

### Date Handling
- All dates normalized to midnight (00:00:00)
- Uses ISO date strings for comparison
- Timezone-aware display

## Visual Design

### Colors
- **Primary Blue**: `rgba(34, 167, 240, 0.15)` for single practice
- **Success Green**: `rgba(76, 175, 80, 0.15)` for multiple practices
- **Border**: `rgba(34, 167, 240, 0.3)` for highlights

### Animations
```scss
// Hover effect on stats
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(34, 167, 240, 0.2);

// Calendar day hover
transform: scale(1.05);
box-shadow: 0 4px 12px rgba(34, 167, 240, 0.3);
```

### Responsive Design
**Desktop:**
- Full stats display
- Larger calendar cells
- Prominent day numbers

**Mobile:**
- Stacked stats
- Compact calendar
- Smaller fonts
- Touch-optimized

## Usage

### In Dashboard
The calendar is automatically displayed on the web dashboard:

```html
<app-practice-calendar [userId]="userId"></app-practice-calendar>
```

### Standalone Usage
Can be used in any component:

```typescript
// In your component
import { Component } from '@angular/core';

@Component({
  template: `
    <app-practice-calendar [userId]="currentUserId"></app-practice-calendar>
  `
})
export class MyComponent {
  currentUserId = 'user-123';
}
```

## Technical Details

### Dependencies
- **Firebase**: For practice history data
- **RxJS**: For async data handling
- **Ionic Icons**: For navigation buttons

### Performance
- ✅ Only loads data once on init
- ✅ Efficient date calculations
- ✅ CSS-only animations (no JS)
- ✅ Lazy loading compatible

### Browser Support
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers
- ✅ Works offline (cached data)

## Customization

### Change Colors
Edit `practice-calendar.component.scss`:

```scss
// Single practice (currently blue)
&.practiced {
  background: rgba(255, 64, 129, 0.15); // Change to pink
  border-color: rgba(255, 64, 129, 0.4);
}

// Multiple practices (currently green)
&[data-count="2"] {
  background: rgba(255, 152, 0, 0.15); // Change to orange
}
```

### Adjust Streak Logic
Edit `practice-calendar.component.ts`:

```typescript
// Allow 2-day gap instead of 1
if (dateKey || i > 1) { // Change from i > 0 to i > 1
  break;
}
```

### Add More Stats
Add to component:

```typescript
get averagePracticesPerDay(): number {
  return this.totalPracticeDays > 0
    ? Object.values(this.practiceStats).reduce((a, b) => a + b, 0) / this.totalPracticeDays
    : 0;
}
```

## Example Data

### Firebase Structure
```javascript
users/{userId}/speechHistory/{speechId}
{
  timestamp: Firestore.Timestamp,
  feedback: {...},
  duration: 120,
  speechType: 'informative'
}
```

### Processed Data
```javascript
{
  practiceDates: Set(['2024-01-15', '2024-01-16', '2024-01-18']),
  practiceStats: {
    '2024-01-15': 1,  // 1 practice
    '2024-01-16': 2,  // 2 practices
    '2024-01-18': 1   // 1 practice
  },
  currentStreak: 2,
  longestStreak: 2,
  totalPracticeDays: 3
}
```

## Future Enhancements

Possible additions:
1. **Click to view details**: Show speeches for that day
2. **Goal setting**: Set practice goals per week/month
3. **Export**: Download practice history as PDF/CSV
4. **Achievements**: Unlock badges for streaks
5. **Heatmap view**: Year-long practice visualization
6. **Comparison**: Compare with previous months
7. **Reminders**: Notify on streak breaks

## Troubleshooting

### Calendar Not Loading
**Check:**
1. User is logged in (`userId` is set)
2. Firebase connection working
3. `speechHistory` collection exists
4. Browser console for errors

### Dates Not Showing
**Check:**
1. Timestamps in Firebase are valid
2. Timezone settings correct
3. Date conversion working

### Streaks Incorrect
**Verify:**
1. Practice dates are sequential
2. No date gaps in data
3. Streak logic matches expectations

## Testing

### Web Browser
```bash
npm start
```
Navigate to dashboard - calendar appears below daily challenge

### Android
```bash
npx cap open android
```
Run app - calendar works same as web

## Files Created

1. **Component**: `src/app/components/practice-calendar/practice-calendar.component.ts` (220 lines)
2. **Template**: `src/app/components/practice-calendar/practice-calendar.component.html` (70 lines)
3. **Styles**: `src/app/components/practice-calendar/practice-calendar.component.scss` (370 lines)

## Integration Points

- **Web Module**: Declared in `web.module.ts`
- **Dashboard**: Embedded in `web-dashboard.component.html`
- **Firebase Service**: Uses `getSpeechHistory()`

## Summary

The practice calendar provides a beautiful, motivating visualization of your practice journey with:
- ✅ Real-time streak tracking
- ✅ Color-coded practice intensity
- ✅ Interactive month navigation
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Zero configuration needed

Start practicing and watch your calendar light up! 🎉
