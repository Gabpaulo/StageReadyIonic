# Microphone Access Setup Guide

## What Was Fixed

Your microphone access issues have been resolved with the following changes:

### 1. Android Permissions Added

Updated `android/app/src/main/AndroidManifest.xml` with:
- `RECORD_AUDIO` - Required for microphone access
- `MODIFY_AUDIO_SETTINGS` - For audio quality settings
- `WRITE_EXTERNAL_STORAGE` - For saving audio files
- `READ_EXTERNAL_STORAGE` - For reading audio files

### 2. Enhanced Audio Recorder Service

Updated `src/app/services/audio-recorder.service.ts` with:
- **Platform-aware permission handling** - Different messages for web vs mobile
- **Explicit permission requests** - Requests permission before recording
- **Better error handling** - Clear user guidance for each error type
- **Optimized audio settings** - Echo cancellation, noise suppression
- **MIME type detection** - Uses best supported format per platform
- **Fallback mechanism** - Tries simpler settings if advanced fail

## How It Works Now

### On Android/iOS:

1. **First Time Recording:**
   - App requests microphone permission
   - Android shows system permission dialog
   - User grants/denies permission

2. **If Permission Denied:**
   - Clear message guides user to Settings
   - "Settings > Apps > StageReady > Permissions"

3. **Recording:**
   - Uses optimized audio settings
   - Mono audio for smaller file size
   - 48kHz sample rate for quality
   - Echo cancellation enabled

### On Web Browser:

1. **First Time Recording:**
   - Browser shows permission prompt
   - User clicks "Allow"

2. **If Permission Denied:**
   - Message shows how to enable in browser
   - "Click microphone icon in address bar"

## Testing on Android

### Step 1: Uninstall Old Version (If Exists)
```bash
# If you previously installed the app
adb uninstall io.ionic.starter
```

### Step 2: Open in Android Studio
```bash
cd StageReadyIonic
npx cap open android
```

### Step 3: Run on Device/Emulator
1. Wait for Gradle sync
2. Click Run button ▶️
3. App installs with new permissions

### Step 4: Test Microphone
1. Navigate to Speech Analysis page
2. Click Record button
3. Android prompts: "Allow StageReady to record audio?"
4. Click "Allow"
5. Recording should start successfully

## Troubleshooting

### Problem: Still Getting "Permission Denied"

**Solution 1: Clear App Data**
```bash
adb shell pm clear io.ionic.starter
```

**Solution 2: Manually Enable in Settings**
1. Open device Settings
2. Go to Apps > StageReady
3. Tap Permissions
4. Enable Microphone
5. Restart app

### Problem: Permission Dialog Doesn't Appear

**Solution: Uninstall and Reinstall**
```bash
adb uninstall io.ionic.starter
# Then rebuild and reinstall in Android Studio
```

### Problem: "Microphone Already in Use"

**Solution:**
- Close other apps using microphone
- Restart the device
- Try again

### Problem: Recording Works But Backend Fails

**Check these:**
1. **Network Connection:** Ensure device has internet
2. **Backend URL:** Check your API endpoint is accessible
3. **CORS Settings:** Backend must allow requests from app
4. **File Format:** Backend accepts WAV/WebM format

## Audio Quality Settings

The service now uses optimized settings:

```typescript
{
  echoCancellation: true,  // Removes echo
  noiseSuppression: true,  // Reduces background noise
  autoGainControl: true,   // Normalizes volume
  channelCount: 1,         // Mono (smaller files)
  sampleRate: 48000        // High quality
}
```

## Supported Audio Formats

Priority order (uses first supported):
1. `audio/webm;codecs=opus` - Best compression
2. `audio/webm` - Standard WebM
3. `audio/ogg;codecs=opus` - Fallback
4. `audio/mp4` - Mobile fallback
5. `audio/wav` - Universal fallback

The recorded audio is converted to WAV before sending to backend.

## Permission Flow Diagram

```
User Clicks Record
    ↓
Has Permission? → No → Request Permission
    ↓                      ↓
   Yes                  Granted?
    ↓                      ↓
Start Recording    Yes → Start Recording
    ↓                      ↓
Send to Backend         No → Show Error Message
```

## Backend Integration

Your audio is sent as WAV format to the backend. Ensure your backend:

1. **Accepts WAV files:**
   ```python
   # Example backend check
   if file.content_type in ['audio/wav', 'audio/webm']:
       # Process audio
   ```

2. **Has CORS enabled:**
   ```python
   # Example Flask CORS
   CORS(app, resources={r"/*": {"origins": "*"}})
   ```

3. **Handles large files:**
   - Audio files can be 1-5MB
   - Set appropriate upload size limits

## For Future Updates

When you make changes to audio recording:

```bash
# 1. Make code changes
# 2. Rebuild
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Rerun in Android Studio
```

## Tips for Best Results

1. **Test on Real Device:** Emulator microphone can be problematic
2. **Use Headphones:** Reduces echo and feedback
3. **Quiet Environment:** Better audio quality
4. **Grant Permissions:** Always allow when prompted
5. **Update Regularly:** Keep app and OS updated

## Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| NotAllowedError | User denied permission | Enable in Settings |
| NotFoundError | No microphone detected | Check hardware |
| NotReadableError | Mic in use by another app | Close other apps |
| OverconstrainedError | Settings too strict | Auto-fallback enabled |
| SecurityError | HTTPS required (web) | Use HTTPS or localhost |

## Next Steps

1. ✅ Permissions added to Android manifest
2. ✅ Audio service enhanced with error handling
3. ✅ Platform-specific guidance added
4. ✅ Code rebuilt and synced
5. 🔄 **Your turn:** Test in Android Studio!

## Need Help?

If you still encounter issues:
1. Check device Settings > Apps > StageReady > Permissions
2. Verify internet connection
3. Check browser console for errors (web)
4. Use `adb logcat` for Android debugging
