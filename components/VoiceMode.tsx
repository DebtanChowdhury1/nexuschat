import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import * as Speech from 'expo-speech';

import { AIOrb } from './AIOrb';
import { ExpoSpeechRecognitionModule, nativeSpeechAvailable, useSpeechRecognitionEvent } from '../lib/nativeSpeechRecognition';

interface VoiceModeProps {
  visible: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
  /** Text of the most recent assistant reply, spoken aloud when it changes. */
  speakText?: string;
}

/**
 * Voice-to-voice mode. Speech-to-text on web uses the browser's Web Speech
 * API; on native it uses expo-speech-recognition (a native module — this
 * requires a custom dev client build, not plain Expo Go, since Expo Go's
 * fixed binary can't include third-party native modules). Text-to-speech
 * works everywhere via expo-speech.
 */
export function VoiceMode({ visible, onClose, onTranscript, speakText }: VoiceModeProps) {
  const [listening, setListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const supportsWebSTT =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const supportsNativeSTT = Platform.OS !== 'web' && nativeSpeechAvailable;
  const canListen = supportsWebSTT || supportsNativeSTT;

  // --- Native (expo-speech-recognition) event wiring ---
  // These hooks are inert no-ops on web (the native module only actually
  // does anything when Platform.OS !== 'web'), so it's safe to keep them
  // registered unconditionally rather than branching the whole component.
  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setAmplitude(0);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript && event.isFinal) onTranscript(transcript);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    setNativeError(event.message || 'Speech recognition failed — try again.');
  });
  // Volume is reported as roughly -2 (silent) to 10 (loud) — normalize to
  // the same 0-1 amplitude range the web path already feeds into the orb.
  useSpeechRecognitionEvent('volumechange', (event) => {
    setAmplitude(Math.max(0, Math.min(1, (event.value + 2) / 12)));
  });

  useEffect(() => {
    if (!visible || !speakText) return;
    // Cancel whatever's still playing before starting the new reply — without
    // this, a fast-arriving second reply (or reopening voice mode) overlaps
    // audio instead of replacing it.
    Speech.stop();
    Speech.speak(speakText, { rate: 1.0 });
  }, [visible, speakText]);

  // Closing the overlay (visible -> false) must stop playback immediately —
  // Speech.speak() has no automatic tie to this component's lifecycle, so
  // without this the reply keeps reading itself out after the modal closes.
  useEffect(() => {
    if (!visible) Speech.stop();
  }, [visible]);

  useEffect(() => {
    return () => {
      stopListening();
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAmplitudeLoop = async (stream: MediaStream) => {
    const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioContextCtor();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      setAmplitude(Math.min(1, avg / 128));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startListening = async () => {
    setNativeError(null);
    if (supportsNativeSTT && ExpoSpeechRecognitionModule) {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setNativeError('Microphone/speech permission denied — enable it in your device Settings.');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
        continuous: false,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
      });
      return;
    }

    if (!supportsWebSTT) return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startAmplitudeLoop(stream);
    } catch {
      // amplitude visualization is a bonus — mic access denial shouldn't block STT
    }
  };

  const stopListening = () => {
    if (supportsNativeSTT && ExpoSpeechRecognitionModule) {
      ExpoSpeechRecognitionModule.stop();
    }
    recognitionRef.current?.stop?.();
    setListening(false);
    setAmplitude(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/80">
      <AIOrb active={listening} amplitude={amplitude} />
      <Text className="mt-6 text-center text-white/70">
        {nativeError ??
          (canListen
            ? listening
              ? 'Listening…'
              : 'Tap the mic to speak'
            : Platform.OS !== 'web'
              ? 'Voice input needs the NexusChat dev build, not Expo Go — replies are still read aloud.'
              : 'Voice input needs a browser with the Web Speech API.')}
      </Text>
      <View className="mt-8 flex-row gap-4">
        {canListen && (
          <Pressable
            onPress={listening ? stopListening : startListening}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Start speaking'}
            className="rounded-full bg-brand px-6 py-3"
          >
            <Text className="font-semibold text-white">{listening ? 'Stop' : '🎤 Speak'}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close voice mode"
          className="rounded-full bg-white/10 px-6 py-3"
        >
          <Text className="text-white">Close</Text>
        </Pressable>
      </View>
    </View>
  );
}
