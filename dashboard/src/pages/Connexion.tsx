import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import axios from "axios";
import { getApiUrl, validateSession } from "../services/setupApi";

const BRAND = {
  turquoise: "#009DB3",
  emerald: "#00A046",
  darkEmerald: "#007C34",
};

const Connexion: React.FC = () => {
  const apiUrl = getApiUrl();
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
      const response = await axios.post(`${apiUrl}/login`, {
        identifiant: identifiant.trim(),
        password: password.trim(),
      });

      localStorage.setItem("token", response.data.token);
      navigate("/", { replace: true });
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

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        bgcolor: "#f4f7f9",
      }}
    >
      <CssBaseline />

      {/* Panneau branding — desktop */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 6,
          background: `linear-gradient(145deg, ${BRAND.turquoise} 0%, ${BRAND.emerald} 55%, ${BRAND.darkEmerald} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08), transparent 40%)",
          }}
        />
        <Box sx={{ position: "relative", textAlign: "center", maxWidth: 420 }}>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/brand/logo.png`}
            alt="Soutrali Deals"
            sx={{
              width: 140,
              height: 140,
              objectFit: "contain",
              mb: 3,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.2))",
            }}
          />
          <Typography
            variant="h4"
            sx={{ color: "#fff", fontWeight: 800, letterSpacing: "0.04em", mb: 1.5 }}
          >
            SOUTRALI DEALS
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.88)", fontSize: "1.05rem", lineHeight: 1.6 }}>
            Console d&apos;administration — gérez prestataires, commandes et
            validations en Côte d&apos;Ivoire.
          </Typography>
        </Box>
      </Box>

      {/* Formulaire */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 480px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: { xs: 3, sm: 6 },
          py: 4,
        }}
      >
        {/* Logo mobile */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/brand/logo.png`}
            alt="Soutrali Deals"
            sx={{ width: 96, height: 96, objectFit: "contain", mb: 1 }}
          />
          <Typography variant="h6" fontWeight={700} color="text.primary">
            SOUTRALI DEALS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Espace administration
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 400,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 32px rgba(0, 157, 179, 0.08)",
          }}
        >
          <Typography component="h1" variant="h5" fontWeight={700} gutterBottom>
            Connexion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                background: `linear-gradient(135deg, ${BRAND.turquoise}, ${BRAND.emerald})`,
                "&:hover": {
                  background: `linear-gradient(135deg, #00809A, ${BRAND.darkEmerald})`,
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
            </Button>
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
          © {new Date().getFullYear()} Soutrali Deals — Accès réservé aux administrateurs
        </Typography>
      </Box>
    </Box>
  );
};

export default Connexion;
