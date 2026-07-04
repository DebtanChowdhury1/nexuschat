import { Redirect, Slot, usePathname } from 'expo-router';

import { useAuthStore } from '../../store/authStore';

/**
 * The marketing landing page ('/') is the one route in this group an
 * already-authenticated visitor can still land on — e.g. clicking the
 * sidebar logo — rather than being bounced straight back to the app. Every
 * other route here (login, etc.) still redirects a logged-in session away.
 */
export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const pathname = usePathname();
  const isLandingRoute = pathname === '/';

  if (session && !isLandingRoute) return <Redirect href="/(app)/dashboard" />;

  return <Slot />;
}
