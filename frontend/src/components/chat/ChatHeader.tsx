import { MessageSquare, RotateCcw, Settings } from "lucide-react";

interface ChatHeaderProps {
  totalTokens: number;
  onOpenSettings: () => void;
  onResetChat: () => void;
  isResetDisabled: boolean;
}

export default function ChatHeader({
  totalTokens,
  onOpenSettings,
  onResetChat,
  isResetDisabled,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 text-white shrink-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/30">
        <MessageSquare size={16} className="text-indigo-300" />
      </div>
      <div>
        <h3 className="font-semibold text-sm leading-tight m-0">API Copilot</h3>
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
          onClick={onOpenSettings}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={onResetChat}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
          title="Reset Chat"
          disabled={isResetDisabled}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
