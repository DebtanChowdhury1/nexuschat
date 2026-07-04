import { NativeMemoryMap } from '../../components/memory-map/NativeMemoryMap';
import { usePageTitle } from '../../lib/usePageTitle';

/**
 * Native's counterpart to memory-map.web.tsx — deliberately does not import
 * MemoryMapPage or GalaxyScene (see memory-map.web.tsx's comment): that
 * tree pulls in @react-three/fiber's native build, which needs expo-gl, a
 * package this app never installs.
 */
export default function MemoryMapScreen() {
  usePageTitle('Memory Map');
  return <NativeMemoryMap />;
}
