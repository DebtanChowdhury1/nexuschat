import { create } from 'zustand';

import type { RoomPresenceState } from '../lib/realtime';

interface ActiveRoom {
  roomId: string;
  conversationId: string;
  isHost: boolean;
  myUserId: string;
  myDisplayName: string;
  myColor: string;
}

interface RoomState {
  activeRoom: ActiveRoom | null;
  participants: RoomPresenceState[];
  setActiveRoom: (room: ActiveRoom | null) => void;
  setParticipants: (participants: RoomPresenceState[]) => void;
}

/**
 * Holds the currently-open Live Room's identity + live presence roster. Only
 * one chat screen is ever open at a time in this app, so a single global
 * slot (rather than keying by conversationId) is sufficient.
 */
export const useRoomStore = create<RoomState>((set) => ({
  activeRoom: null,
  participants: [],
  setActiveRoom: (room) => set({ activeRoom: room, participants: [] }),
  setParticipants: (participants) => set({ participants }),
}));
