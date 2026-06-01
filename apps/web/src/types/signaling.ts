export interface JoinMessage {
  type: 'join';
}

export interface OfferMessage {
  type: 'offer';
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  type: 'answer';
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
}

export interface LeaveMessage {
  type: 'leave';
}

export type ClientMessage =
  | JoinMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | LeaveMessage;

export interface AssignedRoleMessage {
  type: 'assigned-role';
  role: 'host' | 'guest';
  peerId: string;
}

export interface PeerJoinedMessage {
  type: 'peer-joined';
}

export interface PeerLeftMessage {
  type: 'peer-left';
}

export interface OfferRelayMessage {
  type: 'offer';
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerRelayMessage {
  type: 'answer';
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateRelayMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
}

export interface RoomFullMessage {
  type: 'room-full';
}

export interface RoomNotFoundMessage {
  type: 'room-not-found';
}

export interface RoomExpiredMessage {
  type: 'room-expired';
}

export interface ServerErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type ServerMessage =
  | AssignedRoleMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | OfferRelayMessage
  | AnswerRelayMessage
  | IceCandidateRelayMessage
  | RoomFullMessage
  | RoomNotFoundMessage
  | RoomExpiredMessage
  | ServerErrorMessage;

export interface DataChannelPayload {
  id: string;
  text: string;
  timestamp: number;
}
