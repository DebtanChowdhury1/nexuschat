export type AIProvider = 'groq' | 'gemini' | 'openrouter';

// Row shapes are declared as `type` (not `interface`) so they satisfy
// supabase-js's `Record<string, unknown>` constraint on GenericTable —
// interfaces don't get an implicit index signature, plain object types do.
export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  is_generating: boolean;
  active_model: AIProvider | null;
  is_pinned: boolean;
  /** ChatGPT-style temporary chat: hidden from the sidebar, deleted client-side on leaving. */
  is_temporary: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageRole = 'user' | 'assistant' | 'system';

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  model_used: AIProvider | null;
  parent_message_id: string | null;
  branch_root_id: string | null;
  created_at: string;
  /** Set only for messages sent from within a Live Room — absent/null for ordinary solo messages. */
  sender_name?: string | null;
  sender_color?: string | null;
};

export type TypingStatus = {
  conversation_id: string;
  device_id: string;
  device_label: string;
  is_typing: boolean;
  updated_at: string;
};

/** A shareable Live Collaborative AI Room tied to one conversation. */
export type Room = {
  id: string;
  conversation_id: string;
  host_user_id: string;
  created_at: string;
  expires_at: string;
  ended_at: string | null;
};

export type RoomParticipant = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  color: string;
  joined_at: string;
  left_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { user_id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { user_id: string; title: string };
        Update: Partial<Conversation>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          conversation_id: string;
          role: MessageRole;
          content: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      typing_status: {
        Row: TypingStatus;
        Insert: Partial<TypingStatus> & { conversation_id: string; device_id: string };
        Update: Partial<TypingStatus>;
        Relationships: [];
      };
      rooms: {
        Row: Room;
        Insert: Partial<Room> & { conversation_id: string; host_user_id: string };
        Update: Partial<Room>;
        Relationships: [];
      };
      room_participants: {
        Row: RoomParticipant;
        Insert: Partial<RoomParticipant> & { room_id: string; user_id: string; display_name: string; color: string };
        Update: Partial<RoomParticipant>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_room: {
        Args: { target_room_id: string; guest_display_name: string; guest_color: string };
        Returns: RoomParticipant;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
