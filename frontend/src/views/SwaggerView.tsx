import { useParams, useNavigate } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { ArrowLeft } from "lucide-react";
import ChatWindow from "../components/ChatWindow";

export default function SwaggerView() {
  const filename = useParams()["*"];
  const navigate = useNavigate();

  const specUrl = `/api/specs/${filename}`;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      {/* Main two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Swagger UI — scrollable */}
        <div className="flex-[7] overflow-y-auto bg-white">
          <div className="flex items-center gap-4 px-8 py-4 bg-slate-900 text-slate-50 shadow-md shrink-0">
            <button
              className="flex items-center gap-2 px-4 py-1 rounded-lg text-sm bg-white/10 border border-white/20 text-white cursor-pointer transition-colors hover:bg-white/20"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={16} /> Back to Upload
            </button>
            <h2 className="text-sm font-semibold m-0">
              Viewing Specification: {filename}
            </h2>
          </div>

          {filename ? (
            <SwaggerUI url={specUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-red-500 text-xl font-medium">
              No specification file provided.
            </div>
          )}
        </div>

        {/* Right: Chat Sidebar — fixed height, no scroll on container */}
        <div className="flex-[3] border-l border-slate-200 shrink-0 overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
