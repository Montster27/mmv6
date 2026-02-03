export type MessageKind = "game" | "tester";
export type MessageTone = "neutral" | "positive" | "warning";

export type UXMessage = {
  id: string;
  kind: MessageKind;
  tone?: MessageTone;
  title?: string;
  body: string;
  details?: string;
  createdAt?: string;
};
