import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { publicApiClient, validateSession, persistSession } from "../services/setupApi";
import { colors, alpha } from "../tokens/colors";
import { LoginArtisanBrandPanel, LoginArtisanMobileHeader } from "../components/LoginArtisanBrandPanel";

const Connexion: React.FC = () => {
  const navigate = useNavigate();

  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    validateSession().then((ok) => {
      if (ok) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!identifiant.trim() || !password.trim()) {
      setError("Identifiant et mot de passe requis.");
      return;
    }

    setLoading(true);
    try {
      const response = await publicApiClient.post("/login", {
        identifiant: identifiant.trim(),
        password: password.trim(),
      });

      const role = String(response.data?.utilisateur?.role || "").toUpperCase();
      if (role !== "ADMIN") {
        setError("Accès dashboard réservé aux administrateurs.");
        return;
      }

      persistSession(response.data.token, response.data.utilisateur, response.data.refreshToken);
      window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 0);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || "Identifiants incorrects.");
      } else {
        setError("Connexion impossible. Vérifiez que le backend est démarré.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      backgroundColor: colors.bgCard,
      "&.Mui-focused fieldset": {
        borderColor: colors.primary,
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: colors.forestGreen,
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        bgcolor: colors.bgWarm,
      }}
    >
      <LoginArtisanBrandPanel />

      <Box
        sx={{
          flex: { xs: 1, md: "0 0 480px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: { xs: "flex-start", md: "center" },
          alignItems: "center",
          px: { xs: 3, sm: 6 },
          py: { xs: 0, md: 4 },
          borderLeft: { md: `1px solid ${colors.border}` },
          backgroundColor: colors.bgWarm,
        }}
      >
        <LoginArtisanMobileHeader />

        <Box sx={{ width: "100%", maxWidth: 400, px: { xs: 0, md: 0 }, py: { xs: 3, md: 0 } }}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              border: `1px solid ${colors.beigeAccent}`,
              boxShadow: "0 4px 24px rgba(11, 81, 50, 0.06)",
              backgroundColor: colors.bgCard,
            }}
          >
            <Typography component="h1" variant="h5" fontWeight={700} gutterBottom sx={{ color: colors.textPrimary }}>
              Connexion
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: colors.textSecondary }}>
              Accédez au tableau de bord avec votre compte administrateur.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="identifiant"
                name="identifiant"
                label="Email ou téléphone"
                autoComplete="username"
                autoFocus
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                disabled={loading}
                sx={fieldSx}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                sx={fieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 1,
                  py: 1.4,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "1rem",
                  backgroundColor: colors.primary600,
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: colors.primary700,
                    boxShadow: "none",
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
              </Button>
            </Box>
          </Paper>

          <Typography variant="caption" sx={{ mt: 4, display: "block", textAlign: "center", color: colors.textMuted }}>
            © {new Date().getFullYear()} Soutrali Deals — Accès réservé aux administrateurs
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Connexion;
