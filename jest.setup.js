// Silence noisy warnings from the env module during tests — API keys are
// intentionally unset in CI.
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Persisted zustand stores (theme/settings preferences) are backed by
// AsyncStorage, which has no JS implementation outside a real native
// runtime — without this mock, any test that transitively imports one of
// those stores fails with "NativeModule: AsyncStorage is null".
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
