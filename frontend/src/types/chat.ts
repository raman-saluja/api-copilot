export type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  tokensUsed?: number;
};
