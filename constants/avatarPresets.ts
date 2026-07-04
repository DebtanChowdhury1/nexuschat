// Preset color avatars — an alternative to uploading a photo. Stored in
// `profiles.avatar_url` as a sentinel string ("preset:<id>") rather than a
// real URL, so no schema change or storage upload is needed to pick one.
export interface AvatarPreset {
  id: string;
  colors: [string, string];
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'ember', colors: ['#FF8F6B', '#FF5A36'] },
  { id: 'nova', colors: ['#FF6FA8', '#FF2D78'] },
  { id: 'sunset', colors: ['#FF5A36', '#FF2D78'] },
  { id: 'ocean', colors: ['#5CD0E0', '#2196A8'] },
  { id: 'violet', colors: ['#B79CF7', '#7C4FE0'] },
  { id: 'forest', colors: ['#6FD98F', '#2E9955'] },
  { id: 'gold', colors: ['#F8CD6B', '#D99A2B'] },
  { id: 'slate', colors: ['#A8B2C4', '#5B6577'] },
];

const PRESET_PREFIX = 'preset:';

export function presetAvatarValue(id: string): string {
  return `${PRESET_PREFIX}${id}`;
}

export function getAvatarPreset(avatarUrl: string | null | undefined): AvatarPreset | undefined {
  if (!avatarUrl || !avatarUrl.startsWith(PRESET_PREFIX)) return undefined;
  const id = avatarUrl.slice(PRESET_PREFIX.length);
  return AVATAR_PRESETS.find((p) => p.id === id);
}
