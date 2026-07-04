import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutRight,
  SlideOutLeft,
  ZoomIn,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { color } from '../../constants/theme';
import { FEATURES } from '../../constants/features';

const CARD_DURATION_MS = 2600;

function ProgressBar({ active, duration, paused }: { active: boolean; duration: number; paused: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    if (!paused) {
      progress.value = withTiming(1, { duration, easing: Easing.linear });
    }
  }, [active, paused, duration, progress]);

  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
      <Animated.View style={[{ height: '100%', backgroundColor: color.brand.DEFAULT }, style]} />
    </View>
  );
}

/**
 * Feature carousel shown before every sign-in on native — auto-advances
 * every ~2.6s (pauses on long-press), but Prev/Next give full manual control
 * at any point, and Skip jumps straight past the whole thing. Each card
 * slides in from the direction of travel with the icon popping in a beat
 * later, rather than a flat crossfade.
 */
export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = index === 0;
  const isLast = index === FEATURES.length - 1;

  const goNext = () => {
    if (isLast) return;
    setDirection(1);
    setIndex((i) => Math.min(FEATURES.length - 1, i + 1));
  };
  const goPrev = () => {
    if (isFirst) return;
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  };

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i < FEATURES.length - 1 ? i + 1 : i));
    }, CARD_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused]);

  const feature = FEATURES[index];

  return (
    <View
      className="flex-1 bg-bg-dark"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <View className="flex-1 px-6 pb-8 pt-16">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row gap-1.5">
            {FEATURES.map((f, i) => (
              <ProgressBar key={f.title} active={i === index} duration={CARD_DURATION_MS} paused={paused && i === index} />
            ))}
          </View>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            className="rounded-full bg-white/10 px-3 py-1"
          >
            <Text className="text-xs font-medium text-white/70">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center overflow-hidden">
          <Animated.View
            key={feature.title}
            entering={(direction === 1 ? SlideInRight : SlideInLeft).duration(320).easing(Easing.out(Easing.cubic))}
            exiting={(direction === 1 ? SlideOutLeft : SlideOutRight).duration(220)}
            className="items-center px-2"
          >
            <Animated.View entering={ZoomIn.delay(90).springify().damping(14)}>
              <LinearGradient
                colors={[color.brand.DEFAULT, color.accent2.DEFAULT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
              >
                <feature.Icon size={38} color="#fff" strokeWidth={1.8} />
              </LinearGradient>
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(140).duration(240)}
              className="mt-7 text-center text-2xl font-bold text-white"
            >
              {feature.title}
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(190).duration(240)}
              className="mt-3 max-w-xs text-center text-[15px] leading-5 text-white/70"
            >
              {feature.body}
            </Animated.Text>
          </Animated.View>
        </View>

        <View className="mb-5 flex-row justify-center gap-1.5">
          {FEATURES.map((f, i) => (
            <Pressable
              key={f.title}
              onPress={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${f.title}`}
              accessibilityState={{ selected: i === index }}
            >
              <View
                className="h-1.5 rounded-full"
                style={{
                  width: i === index ? 16 : 6,
                  backgroundColor: i === index ? color.brand.DEFAULT : 'rgba(255,255,255,0.2)',
                }}
              />
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={goPrev}
            disabled={isFirst}
            accessibilityRole="button"
            accessibilityLabel="Previous"
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"
          >
            <ArrowLeft size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>

          {isLast ? (
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Get started"
              className="flex-1 active:opacity-85"
            >
              <LinearGradient
                colors={[color.brand.DEFAULT, color.accent2.DEFAULT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 14,
                  paddingVertical: 14,
                }}
              >
                <Text className="text-base font-semibold text-white">Get started</Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel="Next"
              className="flex-1 active:opacity-85"
            >
              <LinearGradient
                colors={[color.brand.DEFAULT, color.accent2.DEFAULT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 14,
                  paddingVertical: 14,
                }}
              >
                <Text className="text-base font-semibold text-white">Next</Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
