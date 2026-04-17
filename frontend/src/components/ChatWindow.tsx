import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import type { Message } from "../types/chat";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import ChatInput from "./chat/ChatInput";
import SettingsModal from "./chat/SettingsModal";

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

  useEffect(() => {
    const fetchHistory = async () => {
      if (!filename) return;

      try {
        const response = await api.get(`/chat-history/${filename}`);
        if (response.data.data && response.data.data.length > 0) {
          const history = response.data.data.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(history);

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
    // If no user API key, we rely on the backend's default key.
    // We don't block the request here anymore.

    setInputValue("");
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (userApiKey) {
        headers["X-Gemini-API-Key"] = userApiKey;
      }

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
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setTempApiKey(userApiKey);
          setShowKeyNeededHint(false);
        }}
        apiKey={tempApiKey}
        onApiKeyChange={setTempApiKey}
        onSave={saveSettings}
        showKeyNeededHint={showKeyNeededHint}
      />

      <ChatHeader
        totalTokens={totalTokens}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetChat={handleResetChat}
        isResetDisabled={messages.length <= 1 && totalTokens === 0}
      />

      <MessageList messages={messages} isLoading={isLoading} />

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
