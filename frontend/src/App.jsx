import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { connectSocket, disconnectSocket } from "./lib/socket.js";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CapturePage from "./pages/CapturePage.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import InboxPage from "./pages/InboxPage.jsx";

function RequireAuth({ children }) {
  const { session } = useAuth();

  // Reconnect the socket on a hard refresh (session restored from
  // localStorage), not just on the login form submit.
  useEffect(() => {
    if (session) connectSocket();
    return () => { if (!session) disconnectSocket(); };
  }, [session]);

  if (!session) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/sales">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/capture" element={<RequireAuth><CapturePage /></RequireAuth>} />
          <Route path="/board" element={<RequireAuth><BoardPage /></RequireAuth>} />
          <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/capture" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
