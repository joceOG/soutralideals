#!/usr/bin/env node

// 📝 SCRIPT DE SURVEILLANCE DES LOGS - WINDOWS
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '..', 'logs');
const combinedLog = path.join(logDir, 'combined.log');
const errorLog = path.join(logDir, 'error.log');

// 🎨 Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// 📊 Fonction pour colorer les logs
const colorizeLog = (line) => {
  if (line.includes('ERROR')) return colors.red + line + colors.reset;
  if (line.includes('WARN')) return colors.yellow + line + colors.reset;
  if (line.includes('INFO')) return colors.green + line + colors.reset;
  if (line.includes('HTTP')) return colors.magenta + line + colors.reset;
  if (line.includes('DEBUG')) return colors.cyan + line + colors.reset;
  return colors.white + line + colors.reset;
};

// 👀 Fonction pour surveiller un fichier
const watchLogFile = (filePath, label, color) => {
  if (!fs.existsSync(filePath)) {
    console.log(`${color}📁 Création du fichier de log: ${filePath}${colors.reset}`);
    fs.writeFileSync(filePath, '');
  }

  console.log(`${color}👀 Surveillance de ${label}: ${filePath}${colors.reset}`);
  console.log(`${color}📊 Appuyez sur Ctrl+C pour arrêter${colors.reset}\n`);

  let lastSize = fs.statSync(filePath).size;
  
  const checkForChanges = () => {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(filePath, { start: lastSize });
        let data = '';
        
        stream.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        stream.on('end', () => {
          const lines = data.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            console.log(colorizeLog(line));
          });
          lastSize = stats.size;
        });
      }
    } catch (error) {
      console.error(`${colors.red}❌ Erreur lors de la lecture du fichier: ${error.message}${colors.reset}`);
    }
  };

  // Vérifier les changements toutes les 500ms
  const interval = setInterval(checkForChanges, 500);

  // Nettoyage à l'arrêt
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log(`\n${color}👋 Arrêt de la surveillance de ${label}${colors.reset}`);
    process.exit(0);
  });
};

// 🎯 Fonction principale
const main = () => {
  const args = process.argv.slice(2);
  const logType = args[0] || 'combined';

  console.log(`${colors.cyan}🚀 SOUTRALI DEALS - Surveillance des Logs${colors.reset}`);
  console.log(`${colors.cyan}==========================================${colors.reset}\n`);

  // Créer le dossier logs s'il n'existe pas
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`${colors.green}📁 Dossier logs créé: ${logDir}${colors.reset}`);
  }

  switch (logType) {
    case 'combined':
      watchLogFile(combinedLog, 'Combined Logs', colors.blue);
      break;
    case 'error':
      watchLogFile(errorLog, 'Error Logs', colors.red);
      break;
    case 'both':
      watchLogFile(combinedLog, 'Combined Logs', colors.blue);
      watchLogFile(errorLog, 'Error Logs', colors.red);
      break;
    default:
      console.log(`${colors.yellow}Usage: node watch-logs.js [combined|error|both]${colors.reset}`);
      console.log(`${colors.yellow}  combined: Surveiller les logs combinés${colors.reset}`);
      console.log(`${colors.yellow}  error: Surveiller les logs d'erreur${colors.reset}`);
      console.log(`${colors.yellow}  both: Surveiller les deux types de logs${colors.reset}`);
      process.exit(1);
  }
};

// 🎯 Démarrer
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;


