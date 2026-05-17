export interface Message {
  id: string;
  uid: string;
  username: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  roomId: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

export interface OnlineUser {
  uid: string;
  username: string;
  avatarColor: string;
  lastSeen: number;
}
