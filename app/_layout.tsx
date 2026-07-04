import '../global.css';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';

import { useAuthStore } from '../store/authStore';
import { installGlobalErrorHandlers } from '../lib/sentry';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    installGlobalErrorHandlers();
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color="#7C6FF2" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
