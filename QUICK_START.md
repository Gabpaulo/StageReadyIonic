# Quick Start Guide - Platform-Aware Routing

## What Changed

Your app now automatically detects whether it's running on mobile or web and routes accordingly:

- **Browser/Web** → Uses `/web/*` routes (Angular Material UI)
- **Android/iOS** → Uses `/ionic/*` routes (Ionic UI)

## Testing

### On Web Browser
```bash
cd StageReadyIonic
npm start
```
Open `http://localhost:4200` - will automatically go to `/web/login`

### On Android Emulator/Device

1. **Open Android Studio:**
   ```bash
   cd StageReadyIonic
   npx cap open android
   ```

2. **In Android Studio:**
   - Wait for Gradle sync
   - Select emulator or device
   - Click green Run button ▶️

3. **App will automatically route to** `/ionic-login` (Ionic UI)

## After Making Code Changes

```bash
# 1. Rebuild
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Rerun in Android Studio
```

## Key Files Created

1. **PlatformRoutingService** - `src/app/services/platform-routing.service.ts`
   - Detects platform (mobile vs web)
   - Provides navigation methods

2. **PlatformRedirectGuard** - `src/app/guards/platform-redirect.guard.ts`
   - Automatically redirects root `/` to correct login page

3. **Updated AppComponent** - Initializes platform routing

## How It Works

```
User Opens App
    ↓
Platform Detection
    ↓
    ├─ Mobile → /ionic-login → Ionic Dashboard
    └─ Web    → /web/login   → Web Dashboard
```

## Example Usage in Components

```typescript
import { PlatformRoutingService } from '../services/platform-routing.service';

constructor(private platformRoutingService: PlatformRoutingService) {}

// Navigate to dashboard (auto-selects /ionic or /web)
this.platformRoutingService.navigateToDashboard();

// Check platform
if (this.platformRoutingService.isMobilePlatform()) {
  console.log('Running on mobile');
}
```

## Build APK for Distribution

In Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Troubleshooting

**Mobile not using Ionic routes?**
- Run `npx cap sync android`
- Clear app data on device
- Rebuild and reinstall

**Build errors?**
- Run `npm install`
- Check `npx cap doctor`

For detailed documentation, see `PLATFORM_ROUTING_GUIDE.md`
