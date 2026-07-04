import { View, Text } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import type { RoomPresenceState } from '../../lib/realtime';

const MAX_VISIBLE = 4;

/** Presence-driven avatar bubbles in the chat header — animated pulse-in on join, fade-out on leave. */
export function RoomAvatarBubbles({ participants }: { participants: RoomPresenceState[] }) {
  if (participants.length === 0) return null;
  const visible = participants.slice(0, MAX_VISIBLE);
  const overflow = participants.length - visible.length;

  return (
    <View className="flex-row items-center" style={{ marginLeft: 4 }}>
      {visible.map((p, i) => (
        <Animated.View
          key={p.userId}
          entering={ZoomIn.springify().damping(14).stiffness(200)}
          exiting={ZoomOut.duration(200)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            marginLeft: i === 0 ? 0 : -8,
            backgroundColor: p.color,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#fff',
            zIndex: MAX_VISIBLE - i,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
            {p.displayName.charAt(0).toUpperCase()}
          </Text>
        </Animated.View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            marginLeft: -8,
            backgroundColor: 'rgba(128,128,128,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#fff',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
