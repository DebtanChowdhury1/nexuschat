import { motion } from 'framer-motion';
import { router } from 'expo-router';
import { Plus, Mic, Ghost, Users2, Orbit } from 'lucide-react-native';

import { color } from '../../constants/theme';
import { getOrCreateActiveRoom, joinRoom } from '../../lib/rooms';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

function ActionButton({
  label,
  Icon,
  onClick,
  primary,
}: {
  label: string;
  Icon: typeof Plus;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, boxShadow: primary ? `0 0 24px ${color.brand.DEFAULT}66` : undefined }}
      whileTap={{ scale: 0.97 }}
      className={primary ? undefined : 'border-border-light dark:border-border'}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        borderRadius: 12,
        padding: '11px 18px',
        fontWeight: 600,
        fontSize: 13.5,
        border: primary ? 'none' : '1px solid',
        color: primary ? '#fff' : 'inherit',
        backgroundImage: primary ? `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})` : undefined,
        background: primary ? undefined : 'transparent',
      }}
    >
      <Icon size={15} color={primary ? '#fff' : color.brand.DEFAULT} />
      {label}
    </motion.button>
  );
}

export function QuickActions() {
  const session = useAuthStore((s) => s.session);
  const createConversation = useChatStore((s) => s.createConversation);
  const getOrCreateDraftConversation = useChatStore((s) => s.getOrCreateDraftConversation);

  const handleNewChat = async () => {
    if (!session?.user.id) return;
    const conversation = await getOrCreateDraftConversation(session.user.id);
    router.push(`/(app)/chat/${conversation.id}`);
  };

  const handleVoiceChat = async () => {
    if (!session?.user.id) return;
    const conversation = await getOrCreateDraftConversation(session.user.id);
    router.push(`/(app)/chat/${conversation.id}?voice=1`);
  };

  const handleGhostChat = async () => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id, true);
    router.push(`/(app)/chat/${conversation.id}`);
  };

  const handleStartRoom = async () => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id);
    const room = await getOrCreateActiveRoom(conversation.id, session.user.id);
    const hostName = session.user.email?.split('@')[0] ?? 'Host';
    await joinRoom(room.id, session.user.id, hostName);
    router.push(`/(app)/chat/${conversation.id}?room=${room.id}`);
  };

  return (
    <div
      className="relative z-10 mx-auto w-full max-w-6xl px-6 text-ink-primary-light dark:text-ink-primary"
      style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
    >
      <ActionButton label="New chat" Icon={Plus} onClick={handleNewChat} primary />
      <ActionButton label="Voice mode" Icon={Mic} onClick={handleVoiceChat} />
      <ActionButton label="Ghost chat" Icon={Ghost} onClick={handleGhostChat} />
      <ActionButton label="Start a Room" Icon={Users2} onClick={handleStartRoom} />
      <ActionButton label="View Memory Map" Icon={Orbit} onClick={() => router.push('/(app)/memory-map')} />
    </div>
  );
}
