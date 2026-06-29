/** Basename CRA (ex. /soutralideals quand homepage est défini dans package.json). */
export function getRouterBasename(): string {
  const publicUrl = process.env.PUBLIC_URL || "";
  if (!publicUrl || publicUrl === ".") return "";
  return publicUrl.replace(/\/$/, "");
}

export function getLoginPath(): string {
  const base = getRouterBasename();
  return base ? `${base}/connexion` : "/connexion";
}

export function isLoginPath(pathname: string): boolean {
  return pathname === "/connexion" || pathname.endsWith("/connexion");
}
