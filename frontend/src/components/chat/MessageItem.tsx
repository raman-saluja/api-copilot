import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../../types/chat";
import { ApiLinkRenderer } from "../ApiLinkRenderer";
import CodeBlock from "../CodeBlock";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  return (
    <div
      className={`flex flex-col ${
        message.sender === "user" ? "items-end" : "items-start"
      }`}
    >
      {message.sender === "bot" && (
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <Bot size={11} className="text-indigo-600" />
          </div>
          <span className="text-[10px] font-medium text-slate-500">Copilot</span>
        </div>
      )}
      <div
        className={`max-w-[88%] overflow-x-auto px-3.5 py-2.5 text-[13px] leading-relaxed ${
          message.sender === "user"
            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-md"
            : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm"
        }`}
      >
        <ReactMarkdown
          components={{
            code: CodeBlock,
            a: ApiLinkRenderer,
          }}
        >
          {message.text.replace(
            /\[\[([A-Z]+)\s+([^\]]+)\]\]/g,
            "[$1 $2](#api-link|$1|$2)",
          )}
        </ReactMarkdown>
      </div>
      <span className="text-[10px] text-slate-400 mt-1 px-1">
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
