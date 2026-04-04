import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import UploadView from "./views/UploadView";
import SwaggerView from "./views/SwaggerView";

function App() {
  return (
    <Router>
      <div className="min-h-screen w-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.15),transparent_40%)]">
        {/* Global Toaster for notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
            success: {
              iconTheme: { primary: "#4ade80", secondary: "#1e293b" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#1e293b" },
            },
          }}
        />

        {/* Main Routing Container */}
        <Routes>
          <Route path="/" element={<UploadView />} />
          <Route path="/swagger/*" element={<SwaggerView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
