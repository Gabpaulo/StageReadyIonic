# Platform Routing Guide

This guide explains how the app automatically routes to the correct endpoints based on whether it's running on mobile (Capacitor) or web.

## How It Works

The app now automatically detects the platform and routes accordingly:

- **Mobile (Android/iOS emulator or device)**: Uses `/ionic/*` routes
- **Web (Browser)**: Uses `/web/*` routes

## What Was Added

### 1. PlatformRoutingService (`src/app/services/platform-routing.service.ts`)

A service that provides methods to:
- Detect if running on mobile or web
- Get the appropriate route prefix (`/ionic` or `/web`)
- Navigate to platform-specific routes
- Handle automatic redirects

### 2. PlatformRedirectGuard (`src/app/guards/platform-redirect.guard.ts`)

A route guard that automatically redirects from the root path (`/`) to the appropriate login page:
- Mobile → `/ionic-login`
- Web → `/web/login`

### 3. Updated App Component

The `AppComponent` now initializes platform routing on startup and monitors navigation to ensure users are on the correct routes for their platform.

## Usage Examples

### In Your Components

You can inject the `PlatformRoutingService` and use it to navigate:

```typescript
import { PlatformRoutingService } from '../services/platform-routing.service';

constructor(
  private platformRoutingService: PlatformRoutingService
) {}

// Navigate to dashboard (automatically goes to /ionic/dashboard or /web/dashboard)
this.platformRoutingService.navigateToDashboard();

// Navigate to login
this.platformRoutingService.navigateToLogin();

// Navigate to any route with platform prefix
this.platformRoutingService.navigateToPlatformRoute('analysis');
// Mobile: /ionic/analysis
// Web: /web/analysis

// Check platform
if (this.platformRoutingService.isMobilePlatform()) {
  // Mobile-specific code
} else {
  // Web-specific code
}
```

### Updating Existing Components (Optional)

You can optionally update your existing login/navigation components to use the service. For example, in `web-login.component.ts`:

```typescript
// Instead of:
this.router.navigate(['/web/dashboard']);

// You can use:
this.platformRoutingService.navigateToDashboard();
```

This makes the code platform-agnostic and reusable.

## Testing

### Test on Web
1. Run `npm start` or `ng serve`
2. Open in browser - should automatically route to `/web/login`

### Test on Mobile
1. Build: `npm run build`
2. Sync: `npx cap sync android`
3. Open: `npx cap open android`
4. Run in emulator - should automatically route to `/ionic-login`

## Route Mapping

| Feature | Web Route | Mobile Route |
|---------|-----------|--------------|
| Login | `/web/login` | `/ionic-login` |
| Dashboard | `/web/dashboard` | `/ionic/dashboard` |
| Analysis | `/web/analysis` | `/ionic/speech-analysis` |
| History | `/web/history` | `/ionic/speech-history` |
| Profile | `/web/profile` | `/ionic/profile` |
| Badges | `/web/badges` | `/ionic/badges` |

## Benefits

1. **Automatic Platform Detection**: No manual configuration needed
2. **Shared Codebase**: Same code works on both platforms
3. **Better UX**: Each platform gets its optimized UI
4. **Easy Maintenance**: Centralized routing logic
5. **Type Safety**: TypeScript interfaces for all methods

## Advanced Usage

### Conditional Features

```typescript
// Show different features based on platform
if (this.platformRoutingService.isMobilePlatform()) {
  // Enable mobile-specific features (camera, haptics, etc.)
} else {
  // Enable web-specific features (file upload, etc.)
}
```

### Custom Route Handling

```typescript
// Get the route prefix and build custom routes
const prefix = this.platformRoutingService.getRoutePrefix();
const customRoute = `${prefix}/custom-page`;
this.router.navigate([customRoute]);
```

## Troubleshooting

### Issue: Not redirecting on mobile
- Make sure you've run `npx cap sync android` after building
- Clear the app data on the emulator/device
- Check that Capacitor is properly installed: `npx cap doctor`

### Issue: Wrong routes after navigation
- Check that you're using the platform routing service methods
- Verify the guard is properly registered in the routing module
- Check browser/device console for errors

## Future Enhancements

You can extend this system to:
- Add tablet-specific routes
- Handle deep links differently per platform
- Implement platform-specific guards
- Add analytics tracking per platform
