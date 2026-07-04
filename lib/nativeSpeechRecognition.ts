import { Platform } from 'react-native';

// expo-speech-recognition's native module only exists in a custom dev
// client build (see eas.json's "development" profile) — Expo Go's fixed
// binary can't include third-party native modules at all. Importing the
// package normally throws synchronously the instant its own top-level code
// runs (`Cannot find native module 'ExpoSpeechRecognition'`), which crashes
// every screen that transitively imports VoiceMode — including plain Expo
// Go sessions, before anyone's even opened voice mode. Loading it via a
// guarded `require()` here (not a static `import`, which can't be wrapped
// in try/catch) lets the rest of the app keep working under Expo Go, with
// voice *input* falling back to "unavailable" — TTS playback is unaffected
// since expo-speech is a real Expo Go module, not this one.
let ExpoSpeechRecognitionModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechRecognitionEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent = () => {};
let nativeSpeechAvailable = false;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
    nativeSpeechAvailable = true;
  } catch {
    // Running in Expo Go (or an older build) without the native module —
    // handled by the exported defaults above.
  }
}

export { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent, nativeSpeechAvailable };
