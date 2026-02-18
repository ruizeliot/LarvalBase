export interface UserInfo {
  username: string;
  color: string;
  avatar: string;
}

export interface RoomUser {
  username: string;
  color: string;
  avatar: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isPrivate: boolean;
  creator: string;
  creatorColor: string;
  creatorAvatar: string;
  createdAt: string;
  updatedAt: string;
  users: RoomUser[];
}

export const COLORS = [
  '#0d9488', '#7c3aed', '#ea580c', '#db2777',
  '#2563eb', '#059669', '#dc2626', '#d97706',
] as const;

export const AVATARS = ['⚛', '🔬', '🧬', '🌐', '💡', '🔮', '🧪', '📡'] as const;

export const TAGS = ['systeme', 'rh', 'energie', 'finance', 'sante', 'education'] as const;
export type Tag = typeof TAGS[number];

export const TAG_CONFIG: Record<Tag, { label: string; color: string; bg: string; border: string }> = {
  systeme:   { label: 'Système',   color: '#0d9488', bg: 'rgba(13,148,136,0.08)',  border: 'rgba(13,148,136,0.25)' },
  rh:        { label: 'RH',        color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.25)' },
  energie:   { label: 'Énergie',   color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)' },
  finance:   { label: 'Finance',   color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)' },
  sante:     { label: 'Santé',     color: '#db2777', bg: 'rgba(219,39,119,0.08)',  border: 'rgba(219,39,119,0.25)' },
  education: { label: 'Éducation', color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)' },
};

export const DOT_COLORS = ['#0d9488', '#7c3aed', '#ea580c', '#db2777', '#2563eb', '#059669', '#d97706', '#dc2626'];
