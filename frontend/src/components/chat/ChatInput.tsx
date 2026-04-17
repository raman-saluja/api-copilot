import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  return (
    <div className="p-3 bg-white border-t border-slate-100 shrink-0">
      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask about this API..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 text-sm bg-slate-100/80 text-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white transition-all border border-transparent focus:border-indigo-300/50 placeholder:text-slate-400 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
        >
          <Send size={15} className="-ml-0.5 mt-0.5" />
        </button>
      </form>
      <p className="text-[10px] text-slate-400 text-center mt-2 m-0">
        Powered by Gemini · Answers may vary
      </p>
    </div>
  );
}
