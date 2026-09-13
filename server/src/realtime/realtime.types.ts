export type ProjectRoomAck =
  | { ok: true; room: string }
  | { ok: false; error: string };
