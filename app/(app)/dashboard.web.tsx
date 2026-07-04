import { DashboardPage } from '../../components/dashboard/DashboardPage';
import { usePageTitle } from '../../lib/usePageTitle';

/**
 * Split into .web.tsx (see app/(auth)/index.web.tsx for the full reasoning)
 * so Metro never resolves DashboardPage's import graph for native bundles —
 * it pulls in AmbientBackground/HeroOrb (@react-three/fiber, needs expo-gl
 * on native, which this app doesn't install) and Framer Motion (a web-only
 * library) via its dashboard subcomponents.
 */
export default function DashboardScreenWeb() {
  usePageTitle('Dashboard');
  return <DashboardPage />;
}
