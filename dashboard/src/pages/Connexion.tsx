import * as React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

const defaultTheme = createTheme();

const Connexion: React.FC = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "";
  const navigate = useNavigate();

  const [identifiant, setIdentifiant] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!identifiant.trim() || !password.trim()) {
      return setError("Identifiant ou mot de passe requis");
    }

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        identifiant: identifiant.trim(),
        password: password.trim(),
      });

      setSuccess("Connexion réussie 🎉");
      localStorage.setItem("token", response.data.token);
      setTimeout(() => navigate("/"), 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null && "response" in err) {
        // @ts-ignore
        setError(err.response?.data?.error || "Erreur inattendue");
      } else {
        setError("Erreur inattendue");
      }
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <p>Navbar</p>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: "10px",
            padding: "20px",
            backgroundColor: "#f0f0f0",
          }}
        >
          <Typography component="h1" variant="h5">
            Bonjour!
          </Typography>
          <Typography>
            Connectez-vous pour découvrir toutes nos fonctionnalités
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="identifiant"
              name="identifiant"
              label="Identifiant (Email ou Téléphone)"
              autoFocus
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Grid item xs>
              <Link to="#">Mot de passe oublié</Link>
            </Grid>
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Se connecter
            </Button>
            <Grid container>
              <Grid item>
                Envie de nous rejoindre ?{" "}
                <Link to="/inscription" style={{ textDecoration: "none", color: "blue" }}>
                  Créez un compte
                </Link>
              </Grid>
            </Grid>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
          </Box>
        </Box>
      </Container>
      <p>Footer</p>
    </ThemeProvider>
  );
};

export default Connexion;
