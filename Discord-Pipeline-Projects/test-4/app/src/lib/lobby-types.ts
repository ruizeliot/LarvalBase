export interface LobbyConfigData {
  theme: string;
  rounds: number;
  timer: number;
  mode: string;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  level: number;
  isHost: boolean;
  isReady: boolean;
  isNew: boolean;
}
