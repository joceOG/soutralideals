/**
 * Fix mécanique exhaustive-deps sans changer le métier :
 * - pour les loaders manquants : ref.current pattern
 * - GoogleMapComponent mapMarkers : ref
 *
 * Usage: node scripts/fixExhaustiveDeps.mjs
 */
import fs from 'fs';
import path from 'path';

const files = [
  {
    rel: 'src/components/GoogleMaps/GeographicAnalytics.tsx',
    ensure: ['useRef'],
    patches: [
      {
        from: `  // ✅ CHARGEMENT DES DONNÉES ANALYTICS
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {`,
        to: `  // ✅ CHARGEMENT DES DONNÉES ANALYTICS
  const loadAnalyticsData = async () => {`,
      },
      {
        // after loadZonesCouverture ends (before mapMarkers)
        from: `  // ✅ PRÉPARATION DES DONNÉES POUR LA CARTE
  const mapMarkers = zonesCouverture.map(zone => ({`,
        to: `  const loadAnalyticsDataRef = useRef(loadAnalyticsData);
  loadAnalyticsDataRef.current = loadAnalyticsData;
  useEffect(() => {
    loadAnalyticsDataRef.current();
  }, []);

  // ✅ PRÉPARATION DES DONNÉES POUR LA CARTE
  const mapMarkers = zonesCouverture.map(zone => ({`,
      },
    ],
  },
  {
    rel: 'src/components/GoogleMaps/PrestatairesMap.tsx',
    ensure: ['useRef'],
    patches: [
      {
        from: `  // ✅ CHARGEMENT DES PRESTATAIRES
  useEffect(() => {
    loadPrestataires();
  }, [loadPrestataires]);

  const loadPrestataires = async () => {`,
        to: `  const loadPrestataires = async () => {`,
      },
      {
        from: `  // ✅ CHARGEMENT DES PRESTATAIRES
  useEffect(() => {
    loadPrestataires();
  }, []);

  const loadPrestataires = async () => {`,
        to: `  const loadPrestataires = async () => {`,
      },
    ],
    appendAfterFn: {
      fnStart: '  const loadPrestataires = async () => {',
      insertBefore: '  // ✅ FILTRAGE DES PRESTATAIRES',
      insert: `  const loadPrestatairesRef = useRef(loadPrestataires);
  loadPrestatairesRef.current = loadPrestataires;
  useEffect(() => {
    loadPrestatairesRef.current();
  }, []);

`,
    },
  },
];

// Manual targeted replacements — more reliable below
const root = process.cwd();

function ensureImport(src, name) {
  if (new RegExp(`\\b${name}\\b`).test(src.split('\n').slice(0, 5).join('\n'))) {
    // might still be missing from import
  }
  const re = /import React, \{([^}]+)\} from 'react';/;
  const m = src.match(re);
  if (!m) return src;
  if (m[1].includes(name)) return src;
  return src.replace(re, `import React, {${m[1].trim().replace(/,$/, '')}, ${name} } from 'react';`);
}

// ——— GeographicAnalytics ———
{
  const fp = path.join(root, 'src/components/GoogleMaps/GeographicAnalytics.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  // ✅ CHARGEMENT DES DONNÉES ANALYTICS\n  useEffect(() => {\n    loadAnalyticsData();\n  }, []);\n\n  const loadAnalyticsData = async () => {`,
    `  const loadAnalyticsData = async () => {`,
  );
  if (!s.includes('loadAnalyticsDataRef')) {
    s = s.replace(
      `  // ✅ PRÉPARATION DES DONNÉES POUR LA CARTE`,
      `  const loadAnalyticsDataRef = useRef(loadAnalyticsData);\n  loadAnalyticsDataRef.current = loadAnalyticsData;\n  useEffect(() => {\n    loadAnalyticsDataRef.current();\n  }, []);\n\n  // ✅ PRÉPARATION DES DONNÉES POUR LA CARTE`,
    );
  }
  fs.writeFileSync(fp, s);
  console.log('ok GeographicAnalytics');
}

// ——— PrestatairesMap ———
{
  const fp = path.join(root, 'src/components/GoogleMaps/PrestatairesMap.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    /  \/\/ ✅ CHARGEMENT DES PRESTATAIRES\n  useEffect\(\(\) => \{\n    loadPrestataires\(\);\n  \}, \[[^\]]*\]\);\n\n  const loadPrestataires = async \(\) => \{/,
    `  const loadPrestataires = async () => {`,
  );
  if (!s.includes('loadPrestatairesRef')) {
    // insert after loadPrestataires function — find filter section
    const markers = [
      '  // ✅ FILTRAGE',
      '  const filterPrestataires',
      '  useEffect(() => {\n    filter',
    ];
    let inserted = false;
    for (const mk of markers) {
      if (s.includes(mk) && !inserted) {
        s = s.replace(
          mk,
          `  const loadPrestatairesRef = useRef(loadPrestataires);\n  loadPrestatairesRef.current = loadPrestataires;\n  useEffect(() => {\n    loadPrestatairesRef.current();\n  }, []);\n\n${mk}`,
        );
        inserted = true;
      }
    }
    if (!inserted) console.warn('PrestatairesMap insert failed');
  }
  fs.writeFileSync(fp, s);
  console.log('ok PrestatairesMap');
}

// ——— GoogleMapComponent mapMarkers ———
{
  const fp = path.join(root, 'src/components/GoogleMaps/GoogleMapComponent.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  if (!s.includes('mapMarkersRef')) {
    s = s.replace(
      `  // ✅ GESTION DES MARQUEURS\n  useEffect(() => {\n    if (!map || !googleMapsLoaded) return;\n\n    // Supprimer les anciens marqueurs\n    mapMarkers.forEach(marker => marker.setMap(null));\n    setMapMarkers([]);`,
      `  const mapMarkersRef = useRef(mapMarkers);\n  mapMarkersRef.current = mapMarkers;\n\n  // ✅ GESTION DES MARQUEURS\n  useEffect(() => {\n    if (!map || !googleMapsLoaded) return;\n\n    // Supprimer les anciens marqueurs\n    mapMarkersRef.current.forEach(marker => marker.setMap(null));\n    setMapMarkers([]);`,
    );
  }
  fs.writeFileSync(fp, s);
  console.log('ok GoogleMapComponent');
}

function patchPageLoader(rel, {
  effectFrom,
  effectRemove = true,
  fnNames,
  insertBefore,
}) {
  const fp = path.join(root, rel);
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  if (effectFrom) {
    s = s.replace(effectFrom, '');
  }
  if (!s.includes(`${fnNames[0]}Ref`)) {
    const refs = fnNames
      .map(
        (n) =>
          `  const ${n}Ref = useRef(${n});\n  ${n}Ref.current = ${n};`,
      )
      .join('\n');
    const calls = fnNames.map((n) => `    ${n}Ref.current();`).join('\n');
    // recover deps from effectFrom if present
    const depsMatch = effectFrom && effectFrom.match(/\}, \[([^\]]*)\]\);/);
    const deps = depsMatch ? depsMatch[1] : '';
    const block = `${refs}\n  useEffect(() => {\n${calls}\n  }, [${deps}]);\n\n`;
    if (!s.includes(insertBefore)) {
      console.warn('insertBefore missing', rel, insertBefore);
    } else {
      s = s.replace(insertBefore, block + insertBefore);
    }
  }
  fs.writeFileSync(fp, s);
  console.log('ok', rel);
}

// Avis — two separate effects
{
  const fp = path.join(root, 'src/pages/Avis.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    fetchAvis();\n  }, [searchTerm, statutFilter, objetTypeFilter, noteFilter]);\n\n  useEffect(() => {\n    fetchStats();\n  }, [avis]);\n`,
    '',
  );
  if (!s.includes('fetchAvisRef')) {
    const block = `  const fetchAvisRef = useRef(fetchAvis);\n  fetchAvisRef.current = fetchAvis;\n  const fetchStatsRef = useRef(fetchStats);\n  fetchStatsRef.current = fetchStats;\n  useEffect(() => {\n    fetchAvisRef.current();\n  }, [searchTerm, statutFilter, objetTypeFilter, noteFilter]);\n  useEffect(() => {\n    fetchStatsRef.current();\n  }, [avis]);\n\n`;
    s = s.replace('  // 🔹 GESTION DES MODALES', block + '  // 🔹 GESTION DES MODALES');
  }
  fs.writeFileSync(fp, s);
  console.log('ok Avis');
}

// Historique
{
  const fp = path.join(root, 'src/pages/Historique.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    fetchHistorique();\n    fetchStats();\n  }, [searchTerm, typeFilter, statutFilter, periodeFilter, pagination.page]);\n`,
    '',
  );
  if (!s.includes('fetchHistoriqueRef')) {
    const block = `  const fetchHistoriqueRef = useRef(fetchHistorique);\n  fetchHistoriqueRef.current = fetchHistorique;\n  const fetchStatsRef = useRef(fetchStats);\n  fetchStatsRef.current = fetchStats;\n  useEffect(() => {\n    fetchHistoriqueRef.current();\n    fetchStatsRef.current();\n  }, [searchTerm, typeFilter, statutFilter, periodeFilter, pagination.page]);\n\n`;
    s = s.replace('  // 🔹 GESTION DES MODALES', block + '  // 🔹 GESTION DES MODALES');
  }
  fs.writeFileSync(fp, s);
  console.log('ok Historique');
}

// Messages
{
  const fp = path.join(root, 'src/pages/Messages.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    fetchConversations();\n    fetchStats();\n    setLoading(false);\n  }, []);\n`,
    '',
  );
  if (!s.includes('fetchConversationsRef')) {
    const block = `  const fetchConversationsRef = useRef(fetchConversations);\n  fetchConversationsRef.current = fetchConversations;\n  const fetchStatsRef = useRef(fetchStats);\n  fetchStatsRef.current = fetchStats;\n  useEffect(() => {\n    fetchConversationsRef.current();\n    fetchStatsRef.current();\n    setLoading(false);\n  }, []);\n\n`;
    s = s.replace('  // 🔹 SÉLECTION D\'UNE CONVERSATION', block + '  // 🔹 SÉLECTION D\'UNE CONVERSATION');
  }
  fs.writeFileSync(fp, s);
  console.log('ok Messages');
}

// Paiements
{
  const fp = path.join(root, 'src/pages/Paiements.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    loadPaiements();\n    loadStats();\n  }, []);\n`,
    '',
  );
  if (!s.includes('loadPaiementsRef')) {
    // find a stable insert point after loadStats function - look for next section
    const candidates = ['  const handleOpen', '  // 🔹', '  const filtered'];
    let block = `  const loadPaiementsRef = useRef(loadPaiements);\n  loadPaiementsRef.current = loadPaiements;\n  const loadStatsRef = useRef(loadStats);\n  loadStatsRef.current = loadStats;\n  useEffect(() => {\n    loadPaiementsRef.current();\n    loadStatsRef.current();\n  }, []);\n\n`;
    // load functions are AFTER the removed effect - need effect AFTER function defs
    // Re-read: originally effect was BEFORE functions. Functions are still below.
    // We need to place effect AFTER both loadPaiements and loadStats are defined.
    // Search for end of loadStats
  }
  // Place after both functions exist: insert before first handler after loads
  if (!s.includes('loadPaiementsRef')) {
    const idx = s.indexOf('  const loadStats = async');
    if (idx < 0) console.warn('loadStats missing');
    else {
      // find closing of loadStats: next "\n  const " or "\n  // "
      const after = s.slice(idx);
      const endRel = after.search(/\n  const [a-zA-Z]/|\n  \/\/ 🔹|\n  return \(/);
      const abs = idx + endRel;
      const block = `\n  const loadPaiementsRef = useRef(loadPaiements);\n  loadPaiementsRef.current = loadPaiements;\n  const loadStatsRef = useRef(loadStats);\n  loadStatsRef.current = loadStats;\n  useEffect(() => {\n    loadPaiementsRef.current();\n    loadStatsRef.current();\n  }, []);\n`;
      s = s.slice(0, abs) + block + s.slice(abs);
    }
  }
  fs.writeFileSync(fp, s);
  console.log('ok Paiements');
}

// Promotions
{
  const fp = path.join(root, 'src/pages/Promotions.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    loadPromotions();\n    loadStats();\n  }, []);\n`,
    '',
  );
  if (!s.includes('loadPromotionsRef')) {
    const idx = s.indexOf('  const loadStats = async');
    const after = s.slice(idx);
    const endRel = after.search(/\n  const [a-zA-Z]/|\n  \/\/|\n  return \(/);
    const abs = idx + endRel;
    const block = `\n  const loadPromotionsRef = useRef(loadPromotions);\n  loadPromotionsRef.current = loadPromotions;\n  const loadStatsRef = useRef(loadStats);\n  loadStatsRef.current = loadStats;\n  useEffect(() => {\n    loadPromotionsRef.current();\n    loadStatsRef.current();\n  }, []);\n`;
    s = s.slice(0, abs) + block + s.slice(abs);
  }
  fs.writeFileSync(fp, s);
  console.log('ok Promotions');
}

// Statistiques
{
  const fp = path.join(root, 'src/pages/Statistiques.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    loadAllStats();\n  }, [periode, dateDebut, dateFin]);\n\n  const loadAllStats = async () => {`,
    `  const loadAllStats = async () => {`,
  );
  if (!s.includes('loadAllStatsRef')) {
    const idx = s.indexOf('  const loadAllStats = async');
    const after = s.slice(idx);
    const endRel = after.search(/\n  const [a-zA-Z]/|\n  \/\/|\n  return \(/);
    const abs = idx + endRel;
    const block = `\n  const loadAllStatsRef = useRef(loadAllStats);\n  loadAllStatsRef.current = loadAllStats;\n  useEffect(() => {\n    loadAllStatsRef.current();\n  }, [periode, dateDebut, dateFin]);\n`;
    s = s.slice(0, abs) + block + s.slice(abs);
  }
  fs.writeFileSync(fp, s);
  console.log('ok Statistiques');
}

// Securite
{
  const fp = path.join(root, 'src/pages/Parametres/Securite.tsx');
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s, 'useRef');
  s = s.replace(
    `  useEffect(() => {\n    fetchSecurityData();\n    fetchSecurityStats();\n  }, []);\n`,
    '',
  );
  if (!s.includes('fetchSecurityDataRef')) {
    const block = `  const fetchSecurityDataRef = useRef(fetchSecurityData);\n  fetchSecurityDataRef.current = fetchSecurityData;\n  const fetchSecurityStatsRef = useRef(fetchSecurityStats);\n  fetchSecurityStatsRef.current = fetchSecurityStats;\n  useEffect(() => {\n    fetchSecurityDataRef.current();\n    fetchSecurityStatsRef.current();\n  }, []);\n\n`;
    s = s.replace(
      '  // 🔹 ACTIVER L\'AUTHENTIFICATION À DEUX FACTEURS',
      block + '  // 🔹 ACTIVER L\'AUTHENTIFICATION À DEUX FACTEURS',
    );
  }
  fs.writeFileSync(fp, s);
  console.log('ok Securite');
}

console.log('done');
