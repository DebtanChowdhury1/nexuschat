import { GitBranch, Ghost, Mic, MonitorSmartphone, Orbit, ShieldCheck, Users2, WifiOff } from 'lucide-react-native';

export interface FeatureCard {
  Icon: typeof MonitorSmartphone;
  title: string;
  body: string;
}

/** Shared feature list — the web landing page, the native Home tab, and the first-launch onboarding carousel all show the same set. */
export const FEATURES: FeatureCard[] = [
  {
    Icon: MonitorSmartphone,
    title: 'Mirror Mode',
    body: 'One conversation, driven live from two devices at once — with typing indicators, not just synced history.',
  },
  {
    Icon: ShieldCheck,
    title: 'Always-on reliability',
    body: "If one AI provider is slow or unavailable, NexusChat automatically falls back to the next — you always get an answer, uninterrupted.",
  },
  {
    Icon: GitBranch,
    title: 'Conversation branching',
    body: 'Edit any past message and branch from it — the original stays reachable, like Git for chat.',
  },
  {
    Icon: Mic,
    title: 'Voice mode',
    body: 'Talk instead of type, with a reactive avatar that visibly responds to your voice.',
  },
  {
    Icon: WifiOff,
    title: 'Offline draft queue',
    body: 'Lose connectivity mid-thought? Keep typing — it sends itself the moment you reconnect.',
  },
  {
    Icon: Ghost,
    title: 'Ghost mode',
    body: 'Temporary chats that never touch your history — gone the moment you leave, on purpose.',
  },
  {
    Icon: Users2,
    title: 'Live Collaborative Room',
    body: 'Invite someone into your conversation with a link — you both talk to the same AI, together, in real time.',
  },
  {
    Icon: Orbit,
    title: 'Conversation DNA',
    body: "A living galaxy of every conversation you've had, clustered by topic — watch your knowledge map grow.",
  },
];
