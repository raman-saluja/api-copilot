import { useEffect, useRef } from "react";
import type { Message } from "../../types/chat";
import MessageItem from "./MessageItem";
import { Bot } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <Bot size={11} className="text-indigo-600" />
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              Copilot
            </span>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></span>
              <span
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></span>
              <span
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
