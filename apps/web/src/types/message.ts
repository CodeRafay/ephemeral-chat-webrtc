export interface Message {
  id: string;
  text: string;
  sender: 'self' | 'peer';
  timestamp: number;
}
