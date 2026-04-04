import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Bot,
  Settings,
  X,
  Key,
  RotateCcw,
} from "lucide-react";
import api from "../utils/api";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypePrettyCode from "rehype-pretty-code";
import CodeBlock from "./CodeBlock";
import { ApiLinkRenderer } from "./ApiLinkRenderer";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  tokensUsed?: number;
}

export default function ChatWindow() {
  const filename = useParams()["*"];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! How can I help you with this API specification today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState(
    localStorage.getItem("gemini_api_key") || "",
  );
  const [tempApiKey, setTempApiKey] = useState(userApiKey);
  const [showKeyNeededHint, setShowKeyNeededHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!filename) return;

      try {
        // filename is 'spec-timestamp/openapi.json'
        const response = await api.get(`/chat-history/${filename}`);
        if (response.data.data && response.data.data.length > 0) {
          const history = response.data.data.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(history);

          // Calculate total tokens from history
          const total = history.reduce(
            (acc: number, msg: any) => acc + (msg.tokensUsed || 0),
            0,
          );
          setTotalTokens(total);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchHistory();
  }, [filename]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!userApiKey) {
      setIsSettingsOpen(true);
      setShowKeyNeededHint(true);
      return;
    }

    setInputValue("");
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        "X-Gemini-API-Key": userApiKey,
      };

      const response = await api.post(
        "/chat",
        {
          message: newUserMsg.text,
          filename,
        },
        { headers },
      );
      const newBotMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.data.reply,
        sender: "bot",
        timestamp: new Date(),
        tokensUsed: response.data.data.tokensUsed,
      };
      setMessages((prev) => [...prev, newBotMsg]);
      setTotalTokens((prev) => prev + (response.data.data.tokensUsed || 0));
    } catch (error: any) {
      console.error("Error sending message:", error);

      let errorMessage =
        "Sorry, I encountered an error while processing your message.";
      if (error?.response?.status === 429) {
        errorMessage =
          "Rate limit exceeded. Please try again later or provide your own Gemini API key in Settings.";
      } else if (error?.response?.status === 401) {
        errorMessage =
          "Gemini API Key is missing or invalid. Please check your settings.";
        setIsSettingsOpen(true);
        setShowKeyNeededHint(true);
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = async () => {
    if (!filename) return;

    if (
      !window.confirm(
        "Are you sure you want to clear this conversation? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await api.delete(`/chat-history/${filename}`);
      setMessages([
        {
          id: Date.now().toString(),
          text: "Hello! How can I help you with this API specification today?",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setTotalTokens(0);
    } catch (error) {
      console.error("Error resetting chat:", error);
      alert("Failed to reset chat. Please try again.");
    }
  };

  const saveSettings = () => {
    localStorage.setItem("gemini_api_key", tempApiKey);
    setUserApiKey(tempApiKey);
    setIsSettingsOpen(false);
    setShowKeyNeededHint(false);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Settings Modal overlay */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[280px] border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Settings
                </span>
              </div>
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setTempApiKey(userApiKey);
                  setShowKeyNeededHint(false);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                <span>Gemini API Key</span>
                {showKeyNeededHint && (
                  <span className="text-rose-500 animate-pulse normal-case font-medium">
                    Key Required!
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  className="w-full pl-8 pr-3 py-2 text-slate-700 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
                <Key
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                Your key is stored locally in your browser and used only for
                requests from this window.
              </p>
              <button
                onClick={saveSettings}
                className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 text-white shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/30">
          <MessageSquare size={16} className="text-indigo-300" />
        </div>
        <div>
          <h3 className="font-semibold text-sm leading-tight m-0">
            API Copilot
          </h3>
          <p className="text-[11px] text-slate-400 m-0 leading-tight">
            Ask anything about this spec
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
                Online
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 mt-0.5">
              {totalTokens.toLocaleString()} tokens
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={handleResetChat}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
            title="Reset Chat"
            disabled={messages.length <= 1 && totalTokens === 0}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                  <Bot size={11} className="text-indigo-600" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">
                  Copilot
                </span>
              </div>
            )}
            <div
              className={`max-w-[88%] overflow-x-auto px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.sender === "user"
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
                {msg.text.replace(
                  /\[\[([A-Z]+)\s+([^\]]+)\]\]/g,
                  "[$1 $2](#api-link|$1|$2)",
                )}
              </ReactMarkdown>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {msg.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
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

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about this API..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-100/80 text-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white transition-all border border-transparent focus:border-indigo-300/50 placeholder:text-slate-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
          >
            <Send size={15} className="-ml-0.5 mt-0.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-2 m-0">
          Powered by Gemini · Answers may vary
        </p>
      </div>
    </div>
  );
}
