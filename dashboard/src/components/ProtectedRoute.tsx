import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import { validateSession } from "../services/setupApi";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    validateSession().then((ok) => {
      if (!cancelled) setStatus(ok ? "ok" : "denied");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (status === "denied") {
    return (
      <Navigate to="/connexion" replace state={{ from: location.pathname }} />
    );
  }

  return children;
};

export default ProtectedRoute;
