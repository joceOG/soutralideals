/**
 * Normalisation et matching borné du vocabulaire catalogue (noms, alias, besoins).
 * Pas un correcteur générique : distance de Levenshtein limitée, tokens assez longs.
 */

export function normalizeCatalogText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenizeCatalogText(value) {
  return normalizeCatalogText(value)
    .split(' ')
    .filter((t) => t.length >= 2);
}

export function levenshtein(a, b) {
  const s = String(a);
  const t = String(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const prev = new Array(cols);
  const cur = new Array(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    cur[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j += 1) prev[j] = cur[j];
  }
  return prev[t.length];
}

/** Distance max autorisée : 1 si token ≥ 5, 2 si token ≥ 8. */
export function maxTypoDistance(token) {
  const n = String(token || '').length;
  if (n < 5) return 0;
  if (n < 8) return 1;
  return 2;
}

export function tokenFuzzyEquals(queryToken, catalogToken) {
  const q = normalizeCatalogText(queryToken);
  const c = normalizeCatalogText(catalogToken);
  if (!q || !c) return false;
  if (q === c) return true;
  const max = Math.min(maxTypoDistance(q), maxTypoDistance(c) || maxTypoDistance(q));
  if (max <= 0) return false;
  return levenshtein(q, c) <= max;
}

export function uniqueStrings(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list || []) {
    const n = normalizeCatalogText(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(String(raw).trim());
  }
  return out;
}

/**
 * @param {string} query
 * @param {{ nomservice?: string, aliases?: string[], needs?: string[] }} service
 * @returns {{ score: number, kind: string } | null}
 */
export function scoreCatalogService(query, service) {
  const nq = normalizeCatalogText(query);
  if (!nq) return null;

  const name = normalizeCatalogText(service?.nomservice);
  const aliases = uniqueStrings(service?.aliases).map(normalizeCatalogText);
  const needs = uniqueStrings(service?.needs).map(normalizeCatalogText);

  if (name && name === nq) return { score: 100, kind: 'exact-name' };
  if (aliases.includes(nq)) return { score: 92, kind: 'exact-alias' };
  if (needs.includes(nq)) return { score: 88, kind: 'exact-need' };

  const qTokensEarly = tokenizeCatalogText(nq);
  const buyIntent = qTokensEarly.some((t) => ['acheter', 'achat', 'vendre', 'vente'].includes(t));
  const repairIntent = qTokensEarly.some((t) => ['reparer', 'reparation', 'fuite', 'cassee', 'casse'].includes(t));
  if (buyIntent && !repairIntent) {
    const catalogHasBuy = [...needs, ...aliases, name].some((t) =>
      tokenizeCatalogText(t).some((x) => ['acheter', 'achat', 'vente', 'vendre'].includes(x)),
    );
    if (!catalogHasBuy && name !== nq && !aliases.includes(nq)) return null;
  }

  if (name && (name.startsWith(nq) || nq.startsWith(name)) && nq.length >= 3) {
    return { score: 80, kind: 'prefix-name' };
  }
  if (aliases.some((a) => a.startsWith(nq) || (nq.length >= 4 && nq.startsWith(a)))) {
    return { score: 74, kind: 'prefix-alias' };
  }
  if (name && nq.length >= 3 && name.includes(nq)) return { score: 70, kind: 'contains-name' };
  if (aliases.some((a) => nq.length >= 3 && a.includes(nq))) return { score: 66, kind: 'contains-alias' };
  if (needs.some((need) => need.includes(nq) || (nq.length >= 4 && nq.includes(need)))) {
    return { score: 72, kind: 'contains-need' };
  }

  const qTokens = qTokensEarly;
  const catalogTokens = [
    ...tokenizeCatalogText(name),
    ...aliases.flatMap(tokenizeCatalogText),
    ...needs.flatMap(tokenizeCatalogText),
  ];
  if (!qTokens.length || !catalogTokens.length) return null;

  let fuzzyHits = 0;
  for (const qt of qTokens) {
    if (catalogTokens.some((ct) => tokenFuzzyEquals(qt, ct))) fuzzyHits += 1;
  }
  if (fuzzyHits === qTokens.length && qTokens.length >= 1) {
    return { score: 58, kind: 'typo-tokens' };
  }
  if (fuzzyHits > 0 && fuzzyHits >= Math.ceil(qTokens.length / 2) && qTokens.length >= 2) {
    return { score: 50, kind: 'partial-typo' };
  }
  return null;
}

export function rankCatalogServices(query, services, { minScore = 50, limit = 24 } = {}) {
  const scored = [];
  for (const svc of services || []) {
    const match = scoreCatalogService(query, svc);
    if (!match || match.score < minScore) continue;
    scored.push({ service: svc, ...match });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.service?.nomservice || '').localeCompare(String(b.service?.nomservice || ''), 'fr');
  });
  return scored.slice(0, limit);
}

export function parseStringList(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((x) => String(x)));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return uniqueStrings(parsed.map((x) => String(x)));
    } catch {
      /* CSV */
    }
    return uniqueStrings(trimmed.split(/[,;\n]/));
  }
  return uniqueStrings([String(value)]);
}

export function isMetiersGroupName(nomgroupe) {
  return normalizeCatalogText(nomgroupe) === 'metiers';
}

export function isFreelanceGroupName(nomgroupe) {
  return normalizeCatalogText(nomgroupe) === 'freelance';
}

export function isEmarketGroupName(nomgroupe) {
  const n = normalizeCatalogText(nomgroupe);
  return n === 'e marche' || n === 'emarket' || n === 'e-marche';
}

export function resolveSearchScope(raw) {
  const n = normalizeCatalogText(raw);
  if (n === 'metiers') return 'metiers';
  if (n === 'freelance') return 'freelance';
  if (n === 'e marche' || n === 'emarket') return 'emarket';
  return 'global';
}
