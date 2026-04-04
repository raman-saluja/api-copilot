import { useState, useRef, useEffect } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  UploadCloud,
  FileJson,
  X,
  Clock,
  ExternalLink,
  Trash2,
} from "lucide-react";
import api from "../utils/api";

interface FileHistory {
  name: string;
  rawFile: string;
  timestamp: number;
}

export default function UploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<FileHistory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedHistory = localStorage.getItem("api-copilot-history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (newFile: FileHistory) => {
    const updatedHistory = [
      newFile,
      ...history.filter((item) => item.rawFile !== newFile.rawFile),
    ].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem("api-copilot-history", JSON.stringify(updatedHistory));
  };

  const handleDelete = async (e: React.MouseEvent, item: FileHistory) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/file/${item.rawFile}`);
    } catch (error) {
      // Even if server delete fails, remove from local history
      console.error("Failed to delete file from server", error);
    }
    const updatedHistory = history.filter((h) => h.rawFile !== item.rawFile);
    setHistory(updatedHistory);
    localStorage.setItem("api-copilot-history", JSON.stringify(updatedHistory));
    toast.success("File removed");
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const name = selectedFile.name;
    const isJson =
      selectedFile.type === "application/json" || name.endsWith(".json");
    const isYaml =
      selectedFile.type === "application/x-yaml" ||
      selectedFile.type === "text/yaml" ||
      name.endsWith(".yaml") ||
      name.endsWith(".yml");

    if (isJson || isYaml) {
      setFile(selectedFile);
    } else {
      toast.error("Please upload a valid JSON or YAML file");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    const toastId = toast.loading("Uploading OpenAPI specification...");

    try {
      const response = await api.post("/upload-openapi", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success(response.data.message || "Upload successful", {
          id: toastId,
        });
        setFile(null); // Reset form

        // Save to history
        if (response.data.data?.rawFile) {
          saveToHistory({
            name: file.name,
            rawFile: response.data.data.rawFile,
            timestamp: Date.now(),
          });
          navigate(`/swagger/${response.data.data.rawFile}`);
        }
      }
    } catch (error) {
      toast.error("Upload failed. Please try again.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-12 max-w-2xl w-[90%] shadow-2xl text-center animate-slide-up">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-br from-primary to-secondary text-transparent bg-clip-text">
          API Copilot
        </h1>
        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
          Upload your OpenAPI specification to instantly integrate and manage
          endpoints.
        </p>

        <div
          className={`border-2 border-dashed rounded-2xl p-12 my-8 cursor-pointer transition-all duration-300 ${
            isDragging
              ? "bg-primary/10 border-primary"
              : "border-primary/50 bg-black/20 hover:bg-primary/10 hover:border-primary"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/json,.json,application/x-yaml,text/yaml,.yaml,.yml"
            className="hidden"
          />
          <UploadCloud size={48} className="mb-4 text-primary mx-auto" />
          <h3 className="text-lg text-textLight mb-2">
            Drag &amp; drop your OpenAPI JSON or YAML file
          </h3>
          <p className="text-sm text-slate-400">
            Supports <span className="text-primary font-semibold">.json</span>,{" "}
            <span className="text-primary font-semibold">.yaml</span>, and{" "}
            <span className="text-primary font-semibold">.yml</span> formats
          </p>
        </div>

        {file && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center justify-between">
            <div className="font-medium flex items-center gap-2">
              <FileJson size={20} />
              {file.name}
            </div>
            <button
              className="bg-transparent text-white border border-white/10 hover:bg-white/10 hover:border-white/20 px-2 py-1 rounded-lg z-10 transition-colors disabled:opacity-50 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              disabled={isUploading}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <button
          className="mt-8 w-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-[0_10px_15px_-3px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 hover:shadow-[0_20px_25px_-5px_rgba(99,102,241,0.5)] transition-all duration-300 px-8 py-3.5 rounded-full text-lg font-semibold border-none disabled:opacity-50 cursor-pointer outline-none"
          onClick={(e) => {
            e.stopPropagation();
            handleUpload();
          }}
          disabled={!file || isUploading}
        >
          {isUploading ? "Uploading..." : "Process Specification"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-12 w-full max-w-4xl animate-slide-up animation-delay-300">
          <div className="flex items-center gap-2 mb-6 px-4">
            <Clock size={20} className="text-secondary" />
            <h2 className="text-2xl font-bold text-textLight">Recent Files</h2>
          </div>
          <div className="flex flex-col gap-3 px-4">
            {history.map((item, index) => (
              <Link
                key={index}
                to={`/swagger/${item.rawFile}`}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-primary/40 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors shrink-0">
                    <FileJson size={22} className="text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-textLight font-semibold truncate">
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString()} at{" "}
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <ExternalLink
                    size={16}
                    className="text-slate-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                  <button
                    onClick={(e) => handleDelete(e, item)}
                    title="Delete file"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
