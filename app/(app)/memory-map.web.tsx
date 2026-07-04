import { MemoryMapPage } from '../../components/memory-map/MemoryMapPage';
import { usePageTitle } from '../../lib/usePageTitle';

/**
 * Split into .web.tsx (see app/(auth)/index.web.tsx for the full reasoning)
 * so Metro never resolves MemoryMapPage's import graph — it pulls in
 * @react-three/fiber for GalaxyScene, whose native entry needs expo-gl,
 * which this app doesn't install.
 */
export default function MemoryMapScreenWeb() {
  usePageTitle('Memory Map');
  return <MemoryMapPage />;
}
