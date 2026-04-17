import { Key, Settings, X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
  showKeyNeededHint: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  onSave,
  showKeyNeededHint,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
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
            onClick={onSave}
            className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
