import * as React from "react";
import { Box, Typography, Divider } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { colors } from "../tokens/colors";

/** Décor uniquement dans les coins — jamais sous le texte. */
function CornerArtisanMotif({ position }: { position: "tl" | "br" }) {
  const sx =
    position === "tl"
      ? { top: 24, left: 24 }
      : { bottom: 24, right: 24, transform: "rotate(180deg)" };
  return (
    <Box sx={{ position: "absolute", ...sx, width: 120, height: 120, opacity: 0.14, pointerEvents: "none" }} aria-hidden>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path
          d="M10 50 L50 10 L90 50 L50 90 Z"
          fill="none"
          stroke={colors.beigeAccent}
          strokeWidth="1.5"
        />
        <circle cx="50" cy="50" r="8" fill={colors.emerald} opacity="0.5" />
      </svg>
    </Box>
  );
}

function FeatureLine({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          mt: 0.25,
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 1.5,
          bgcolor: alpha(colors.forestGreen, 0.08),
          border: `1px solid ${alpha(colors.forestGreen, 0.15)}`,
          color: colors.forestGreen,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        {children}
      </Box>
      <Typography sx={{ color: colors.textPrimary, fontSize: "0.92rem", lineHeight: 1.55, fontWeight: 500 }}>
        {text}
      </Typography>
    </Box>
  );
}

/** Panneau branding — lisible, fond uni, carte « papier » artisanal */
export function LoginArtisanBrandPanel() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        px: { md: 4, lg: 7 },
        py: 5,
        position: "relative",
        overflow: "hidden",
        backgroundColor: colors.forestGreen,
        backgroundImage: `radial-gradient(ellipse 80% 60% at 20% 10%, ${alpha(colors.emerald, 0.22)} 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 90% 90%, ${alpha(colors.primary, 0.15)} 0%, transparent 50%)`,
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, bgcolor: colors.beigeAccent }} />
      <CornerArtisanMotif position="tl" />
      <CornerArtisanMotif position="br" />

      <Box
        sx={{
          position: "relative",
          maxWidth: 460,
          width: "100%",
          bgcolor: colors.beigeLight,
          borderRadius: 3,
          border: `2px solid ${colors.beigeAccent}`,
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
          p: { md: 3.5, lg: 4 },
        }}
      >
        <Typography
          component="p"
          sx={{
            color: colors.forestGreen,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textAlign: "center",
            mb: 2.5,
          }}
        >
          Terroir · Confiance · Économie locale
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2.5 }}>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/brand/logo.png`}
            alt="Soutrali Deals"
            sx={{ width: 100, height: 100, objectFit: "contain", mb: 1.5 }}
          />
          <Typography
            variant="h4"
            sx={{
              color: colors.forestGreen,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textAlign: "center",
              fontSize: { md: "1.65rem", lg: "1.85rem" },
            }}
          >
            SOUTRALI DEALS
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: colors.textSecondary,
              fontSize: "0.95rem",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            L&apos;artisanat rencontre le digital
          </Typography>
        </Box>

        <Divider sx={{ borderColor: alpha(colors.forestGreen, 0.12), mb: 2.5 }} />

        <Typography
          sx={{
            color: colors.textPrimary,
            fontSize: "1rem",
            lineHeight: 1.65,
            textAlign: "center",
            mb: 3,
            fontWeight: 500,
          }}
        >
          Console d&apos;administration pour les talents ivoiriens — prestataires, vendeurs et
          freelances au service des communautés.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FeatureLine text="Valider profils et recensements terrain.">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16l-4.9 2.7.9-5.5-4-3.9 5.5-.8L12 3z" />
            </svg>
          </FeatureLine>
          <FeatureLine text="Piloter commandes, prestations et paiements.">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </FeatureLine>
          <FeatureLine text="Un écosystème ancré en Côte d&apos;Ivoire.">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3c-4 6-4 10 0 16 4-6 4-10 0-16z" />
            </svg>
          </FeatureLine>
        </Box>
      </Box>
    </Box>
  );
}

export function LoginArtisanMobileHeader() {
  return (
    <Box
      sx={{
        display: { xs: "flex", md: "none" },
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        py: 2.5,
        px: 2,
        bgcolor: colors.forestGreen,
        borderBottom: `4px solid ${colors.beigeAccent}`,
      }}
    >
      <Box
        component="img"
        src={`${process.env.PUBLIC_URL}/brand/logo.png`}
        alt="Soutrali Deals"
        sx={{ width: 64, height: 64, objectFit: "contain", mb: 0.75 }}
      />
      <Typography variant="h6" sx={{ fontWeight: 800, color: colors.white, letterSpacing: "0.04em" }}>
        SOUTRALI DEALS
      </Typography>
      <Typography variant="caption" sx={{ color: colors.primary100 }}>
        Administration · Côte d&apos;Ivoire
      </Typography>
    </Box>
  );
}
