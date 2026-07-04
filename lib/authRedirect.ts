import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Where Supabase should send the user back to after clicking the magic link. */
export function getAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return Linking.createURL('/');
}
