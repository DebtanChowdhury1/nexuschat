import { LandingPage } from '../../components/landing/LandingPage';
import { usePageTitle } from '../../lib/usePageTitle';

/**
 * Marketing landing page — web only, shown to logged-out visitors at '/'.
 * (auth)/_layout.tsx already redirects to chat if a session exists, so this
 * only ever renders for a logged-out web visitor.
 *
 * Split into its own .web.tsx file (rather than a Platform.OS check inside
 * a single index.tsx, as this used to be) so Metro never even resolves
 * LandingPage's import graph for native bundles. Platform.OS is a runtime
 * check — it can't stop the bundler from statically walking every import
 * reachable from a file, and LandingPage pulls in @react-three/fiber for
 * its 3D scenes. That package's *native* entry point requires expo-gl,
 * which this app never installs (there's no real 3D anywhere in the native
 * UI), so any native build failed outright — see index.tsx for the
 * intentionally minimal, LandingPage-free native counterpart.
 */
export default function AuthIndexWeb() {
  usePageTitle('The AI chat that lives on every device');
  return <LandingPage />;
}
