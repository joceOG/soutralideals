/**
 * Doit être importé en tout premier depuis server.js.
 * En ESM, les dépendances des import sont évaluées avant le corps du fichier :
 * un `config()` placé entre les imports dans server.js s’exécutait après le chargement
 * des contrôleurs, donc Cloudinary recevait api_key / api_secret undefined ("Must supply api_key").
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = config({ path: join(__dirname, '.env') });
if (result.error) {
  console.warn('[bootstrapEnv] .env:', result.error.message);
}
