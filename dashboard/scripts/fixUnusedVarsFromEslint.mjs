/**
 * Fix mécanique no-unused-vars depuis la sortie ESLint JSON.
 * - Retire les imports réellement inutilisés
 * - Retire les variables / useState / const réellement inutilisés
 * - Ne préfixe PAS avec _ (CRA ne les ignore pas)
 * Usage: node scripts/fixUnusedVarsFromEslint.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';

const targets = [
  'src/components/GoogleMaps/**/*.{ts,tsx}',
  'src/pages/**/*.{ts,tsx}',
];

let raw;
try {
  raw = execSync(
    `npx eslint ${targets.map((t) => `"${t}"`).join(' ')} -f json`,
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
} catch (e) {
  raw = e.stdout || '';
}

const reports = JSON.parse(raw || '[]');
let filesTouched = 0;
let edits = 0;

function removeNamedImport(line, name) {
  let next = line
    .replace(new RegExp(`\\b${name}\\s+as\\s+\\w+\\s*,?\\s*`), '')
    .replace(new RegExp(`,?\\s*\\b${name}\\b\\s*`), '')
    .replace(/\{\s*,/, '{')
    .replace(/,\s*\}/, '}')
    .replace(/\{\s*\}/, '{}');
  if (/import\s+\{\s*\}\s+from/.test(next)) return '';
  return next;
}

function stripUnusedFromUseState(line, unusedNames) {
  // const [a, setA] = useState(...)
  const m = line.match(
    /^(\s*const\s+)\[([^\]]+)\](\s*=\s*useState[\s\S]*)$/,
  );
  if (!m) return null;
  const parts = m[2].split(',').map((p) => p.trim());
  const kept = parts.map((p) => {
    if (!p) return p;
    if (unusedNames.has(p)) {
      // Keep slot for setter position: value unused → empty hole
      return '';
    }
    return p;
  });
  // If everything unused, drop the line
  if (kept.every((p) => !p)) return '';
  // Normalize holes: [, setX] or [x] or [x, ]
  const cleaned = kept
    .map((p, i) => (p === '' && i === kept.length - 1 ? null : p))
    .filter((p) => p !== null);
  // Trim trailing empties already handled; join with commas preserving leading hole
  while (cleaned.length > 1 && cleaned[cleaned.length - 1] === '') cleaned.pop();
  return `${m[1]}[${cleaned.join(', ')}]${m[3]}`;
}

for (const file of reports) {
  const unused = (file.messages || []).filter(
    (m) => m.ruleId === '@typescript-eslint/no-unused-vars',
  );
  if (!unused.length) continue;

  let src = fs.readFileSync(file.filePath, 'utf8');
  const lines = src.split(/\r?\n/);

  // Group by line
  const byLine = new Map();
  for (const m of unused) {
    const nameMatch = /'([^']+)' is (defined|assigned)/.exec(m.message);
    if (!nameMatch) continue;
    const list = byLine.get(m.line) || [];
    list.push({ ...m, name: nameMatch[1] });
    byLine.set(m.line, list);
  }

  const sortedLines = [...byLine.keys()].sort((a, b) => b - a);
  let changed = false;

  for (const lineNo of sortedLines) {
    const msgs = byLine.get(lineNo);
    const idx = lineNo - 1;
    if (idx < 0 || idx >= lines.length) continue;
    let line = lines[idx];
    const unusedNames = new Set(msgs.map((m) => m.name));

    // Imports
    if (/^\s*import\s/.test(line)) {
      if (line.includes('{')) {
        for (const name of unusedNames) {
          line = removeNamedImport(line, name);
        }
        lines[idx] = line;
        changed = true;
        edits++;
        continue;
      }
      // default import unused → drop line
      const def = line.match(/^\s*import\s+(\w+)/);
      if (def && unusedNames.has(def[1])) {
        lines[idx] = '';
        changed = true;
        edits++;
        continue;
      }
    }

    // useState destructure
    const useStateFixed = stripUnusedFromUseState(line, unusedNames);
    if (useStateFixed !== null) {
      lines[idx] = useStateFixed;
      changed = true;
      edits++;
      continue;
    }

    // const / let / var declaration of unused name — remove whole statement
    // Handle multi-line styled() blocks starting at this line
    const decl = line.match(
      /^\s*(?:export\s+)?(?:const|let|var)\s+([_$A-Za-z][\w$]*)\s*=/,
    );
    if (decl && unusedNames.has(decl[1])) {
      // Find end of statement (balanced braces/parens + semicolon or next top-level)
      let end = idx;
      let depth = 0;
      let started = false;
      for (let i = idx; i < lines.length; i++) {
        const L = lines[i];
        for (const ch of L) {
          if (ch === '{' || ch === '(' || ch === '[') {
            depth++;
            started = true;
          } else if (ch === '}' || ch === ')' || ch === ']') {
            depth--;
          }
        }
        if (started && depth <= 0 && /;?\s*$/.test(L)) {
          end = i;
          break;
        }
        // simple single-line without braces
        if (!started && /;\s*$/.test(L)) {
          end = i;
          break;
        }
        // arrow / function without trailing ; ending at }
        if (started && depth <= 0) {
          end = i;
          break;
        }
        if (i > idx + 80) {
          end = i;
          break;
        }
      }
      for (let i = idx; i <= end; i++) lines[i] = '';
      changed = true;
      edits++;
      continue;
    }

    // Already prefixed leftovers like `_foo` on a line that is only that binding in useState — handled above
    // Fallback: blank the line if it only declares the unused names
    if (
      unusedNames.size > 0 &&
      /^\s*(?:const|let|var)\s/.test(line) &&
      [...unusedNames].every((n) => line.includes(n))
    ) {
      // e.g. const [a, _setA] already partially fixed — try again with raw names
      lines[idx] = '';
      changed = true;
      edits++;
    }
  }

  if (changed) {
    const out = lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '');
    fs.writeFileSync(file.filePath, out);
    filesTouched++;
  }
}

console.log(JSON.stringify({ filesTouched, edits }));
