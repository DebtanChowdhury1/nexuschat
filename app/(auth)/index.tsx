import { router } from 'expo-router';

import { OnboardingCarousel } from '../../components/onboarding/OnboardingCarousel';

/**
 * Native's counterpart to index.web.tsx — no marketing surface on mobile,
 * straight to the sign-in screen (after a feature carousel, shown on every
 * cold open rather than gated behind a "seen once" flag — see
 * OnboardingCarousel). Deliberately does not import LandingPage or anything
 * under it (see index.web.tsx's comment): that whole tree pulls in
 * @react-three/fiber's native build, which needs expo-gl, a package this
 * app never installs since none of the 3D scenes are meant to run natively.
 */
export default function AuthIndex() {
  return <OnboardingCarousel onDone={() => router.replace('/login')} />;
}
