import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** True when the device has a working internet connection. */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
