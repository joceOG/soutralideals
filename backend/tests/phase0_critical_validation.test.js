/**
 * PHASE 0 — Validation critique (tests isolés, aucune modification métier).
 * Couvre : mot de passe prévisible, KYC update pipeline, filtres publics,
 * IDOR /roles, unicité profils, contrats search/category/top.
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPhoneVerificationMode,
  isPhoneVerificationRequiredForSignup,
} from '../services/phoneVerificationPolicy.js';
import {
  applyProPublicFilter,
  isProPubliclyVisible,
  withFieldRecensementPublicationGuard,
  FREELANCE_VENDEUR_PUBLIC_MATCH,
} from '../utils/proPublicFilter.js';
import {
  uploadKycToCloudinary,
  CLD_AUTH_PREFIX,
  isCloudinaryAuthRef,
} from '../utils/kycAccess.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // .../soutralideals/backend
const WORKSPACE = path.resolve(ROOT, '../..'); // .../CascadeProjects/soutralideals
const ID_APP = path.join(WORKSPACE, 'SDEALSIDENTIFICATION');

/** Miroir exact de SDEALSIDENTIFICATION ApiService._generatePassword */
function generateTempPasswordFromPhone(telephone) {
  return `temp_${String(telephone).replaceAll(/[^0-9]/g, '')}`;
}

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readId(rel) {
  return fs.readFileSync(path.join(ID_APP, rel), 'utf8');
}

describe('PHASE0 — mot de passe temporaire prévisible', () => {
  const envKeys = ['PHONE_VERIFICATION_MODE', 'OTP_REQUIRED'];
  const backup = {};

  beforeEach(() => {
    for (const k of envKeys) backup[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it('algorithme déterministe : téléphone fictif → mot de passe calculable', () => {
    const phone = '+2250700000099';
    const pwd = generateTempPasswordFromPhone(phone);
    assert.equal(pwd, 'temp_2250700000099');
    assert.equal(generateTempPasswordFromPhone('07 00 00 00 99'), 'temp_0700000099');
  });

  it('preuve statique : ApiService identification contient le même motif', () => {
    const idApi = path.join(ID_APP, 'lib/services/api_service.dart');
    assert.ok(fs.existsSync(idApi), `api_service.dart introuvable: ${idApi}`);
    const src = readId('lib/services/api_service.dart');
    assert.match(src, /temp_\$\{telephone\.replaceAll/);
    assert.match(src, /_generatePassword/);
    assert.match(src, /\$baseUrl\/register/);
  });

  it('mode deferred : OTP non requis → compte utilisable avec mdp prévisible (CONDITIONNEL env)', () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    assert.equal(isPhoneVerificationRequiredForSignup(), false);
  });

  it('mode required : OTP requis → register sans token bloqué (CONDITIONNEL env)', () => {
    process.env.PHONE_VERIFICATION_MODE = 'required';
    assert.equal(isPhoneVerificationRequiredForSignup(), true);
  });

  it('legacy OTP_REQUIRED=false : inscription sans OTP', () => {
    delete process.env.PHONE_VERIFICATION_MODE;
    process.env.OTP_REQUIRED = 'false';
    assert.equal(isPhoneVerificationRequiredForSignup(), false);
  });

  it('signIn ne force pas de changement de mot de passe après login', () => {
    const src = readSource('controller/utilisateurController.js');
    const signInStart = src.indexOf('export const signIn');
    const signInEnd = src.indexOf('export const signInWithGoogle', signInStart);
    const block = src.slice(signInStart, signInEnd);
    assert.ok(block.includes('findByCredentials'));
    assert.ok(!block.includes('mustChangePassword'));
    assert.ok(!block.includes('forcePasswordChange'));
    assert.ok(!block.includes('passwordExpired'));
  });

  it('rate-limit auth présent sur /api/login et /api/register', () => {
    const src = readSource('server.js');
    assert.match(src, /authLimiter/);
    assert.match(src, /app\.use\('\/api\/login',\s*authLimiter\)/);
    assert.match(src, /app\.use\('\/api\/register',\s*authLimiter\)/);
    assert.match(src, /max:\s*5/);
  });
});

describe('PHASE0 — pipeline KYC create vs update', () => {
  it('uploadKycToCloudinary force type authenticated et préfixe cld:auth:', async () => {
    // Preuve contractuelle du helper sans réseau Cloudinary :
    // on vérifie le code source et le préfixe, pas un vrai upload.
    const src = readSource('utils/kycAccess.js');
    assert.match(src, /type:\s*'authenticated'/);
    assert.match(src, /sign_url:\s*true/);
    assert.equal(CLD_AUTH_PREFIX, 'cld:auth:');
    assert.equal(isCloudinaryAuthRef('cld:auth:folder/doc'), true);
    assert.equal(isCloudinaryAuthRef('https://res.cloudinary.com/demo/image/upload/x.jpg'), false);
  });

  it('prestataire CREATE et UPDATE utilisent pipeline KYC auth', () => {
    const src = readSource('controller/prestataireController.js');
    assert.match(
      src,
      /uploads\.cni1 = \(await uploadToCloudinary\(req\.files\.cni1\[0\]\.path, "prestataires\/cni", \{ kyc: true \}\)/,
    );
    assert.match(src, /prepareKycReplacement/);
    const updateIdx = src.indexOf('// Upload fichiers KYC (même politique CREATE');
    assert.ok(updateIdx > 0);
    const updateBlock = src.slice(updateIdx, updateIdx + 500);
    assert.match(updateBlock, /prepareKycReplacement/);
  });

  it('freelance CREATE KYC auth ; UPDATE aussi auth (R0-06)', () => {
    const src = readSource('controller/freelanceController.js');
    assert.match(src, /uploadKycToCloudinary|prepareKycReplacement/);
    const createStart = src.indexOf('Upload documents de vérification');
    const createBlock = src.slice(createStart, createStart + 400);
    assert.match(createBlock, /uploadKycToCloudinary/);
    const updateStart = src.indexOf('Upload documents de vérification', createStart + 1);
    assert.ok(updateStart > createStart);
    const updateBlock = src.slice(updateStart, updateStart + 500);
    assert.match(updateBlock, /prepareKycReplacement|uploadKycToCloudinary/);
    assert.ok(!updateBlock.includes("cloudinary.v2.uploader.upload(req.files[field]"));
  });

  it('vendeur CREATE KYC auth ; UPDATE aussi auth (R0-06)', () => {
    const src = readSource('controller/vendeurController.js');
    const createIdx = src.indexOf('Upload documents de vérification');
    const updateIdx = src.indexOf('UPLOAD NOUVEAUX DOCUMENTS');
    const createBlock = src.slice(createIdx, updateIdx);
    assert.match(createBlock, /uploadKycToCloudinary/);
    const updateBlock = src.slice(updateIdx, updateIdx + 550);
    assert.match(updateBlock, /prepareKycReplacement|uploadKycToCloudinary/);
    assert.ok(!updateBlock.includes("cloudinary.v2.uploader.upload(req.files[field]"));
  });

  it('prestataire UPDATE KYC utilise prepareKycReplacement', () => {
    const src = readSource('controller/prestataireController.js');
    const updateIdx = src.indexOf('// Upload fichiers KYC (même politique CREATE');
    assert.ok(updateIdx > 0);
    const block = src.slice(updateIdx, updateIdx + 450);
    assert.match(block, /prepareKycReplacement/);
  });
});

describe('PHASE0 — publication profils non validés', () => {
  const fixtures = {
    pending: {
      status: 'pending',
      accountStatus: 'Pending',
      verificationDocuments: { isVerified: false },
      verifier: false,
    },
    activeVerified: {
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
      verifier: true,
    },
    rejected: {
      status: 'rejected',
      accountStatus: 'Suspended',
      verificationDocuments: { isVerified: false },
    },
    suspended: {
      status: 'suspended',
      accountStatus: 'Suspended',
      verificationDocuments: { isVerified: true },
    },
    accountActiveNotVerified: {
      status: 'pending',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: false },
    },
    verifierTrueWrongStatus: {
      status: 'pending',
      verifier: true,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    },
  };

  it('applyProPublicFilter n’accepte que active+Active+isVerified pour public', () => {
    const filter = applyProPublicFilter({ query: {}, utilisateur: null }, {});
    assert.deepEqual(
      filter,
      withFieldRecensementPublicationGuard({ ...FREELANCE_VENDEUR_PUBLIC_MATCH }),
    );
  });

  it('isProPubliclyVisible matrice fixtures', () => {
    assert.equal(isProPubliclyVisible(fixtures.activeVerified), true);
    assert.equal(isProPubliclyVisible(fixtures.pending), false);
    assert.equal(isProPubliclyVisible(fixtures.rejected), false);
    assert.equal(isProPubliclyVisible(fixtures.suspended), false);
    assert.equal(isProPubliclyVisible(fixtures.accountActiveNotVerified), false);
    assert.equal(isProPubliclyVisible(fixtures.verifierTrueWrongStatus), false);
  });

  it('searchController globalSearch applique les filtres publics', () => {
    const src = readSource('controller/searchController.js');
    assert.match(src, /applyFreelanceVendeurPublicMatch/);
    assert.match(src, /applyPrestatairePublicMatch/);
    assert.match(src, /findPublicVendeurIds/);
  });

  it('getVendeursByCategory / getTopRated exigent status+accountStatus+isVerified', () => {
    const src = readSource('models/vendeurModel.js');
    assert.match(src, /getTopRatedVendeurs[\s\S]*status:\s*'active'/);
    assert.match(src, /getTopRatedVendeurs[\s\S]*verificationDocuments\.isVerified':\s*true/);
    assert.match(src, /getVendeursByCategory[\s\S]*status:\s*'active'/);
    assert.match(src, /getVendeursByCategory[\s\S]*verificationDocuments\.isVerified':\s*true/);
  });

  it('prestataire catalogue public exige status active ET verifier true', () => {
    const src = readSource('controller/prestataireController.js');
    assert.match(src, /filter\.status = "active"/);
    assert.match(src, /filter\.verifier = true/);
  });
});

describe('PHASE0 — accès cross-user GET /utilisateur/:id/roles', () => {
  it('route montée avec auth + requireSelfOrAdminParam', () => {
    const routes = readSource('routes/utilisateurRoutes.js');
    assert.match(routes, /requireSelfOrAdminParam\('id'\)/);
    assert.match(routes, /utilisateurController\.getUserRoles/);
  });

  it('getUserRoles ne renvoie email/telephone qu’aux admins ; select minimal', () => {
    const src = readSource('controller/utilisateurController.js');
    const start = src.indexOf('export const getUserRoles');
    const block = src.slice(start, start + 2200);
    assert.ok(block.includes("select('nom prenom email telephone role')"));
    assert.ok(block.includes('viewerIsAdmin'));
    assert.ok(block.includes("select('_id verifier')"));
    assert.ok(!block.includes('cni1'));
  });
});

describe('PHASE0 — doublons / unicité / idempotence', () => {
  it('aucun index unique utilisateur sur prestataire/freelance/vendeur', () => {
    const prest = readSource('models/prestataireModel.js');
    const freel = readSource('models/freelanceModel.js');
    const vend = readSource('models/vendeurModel.js');
    // Interdit : unique sur utilisateur (1 user → N profils legacy). Autorisé : unique sparse sourceFieldRecensementId (R1-09).
    assert.ok(!/utilisateur:\s*1\s*,\s*unique:\s*true/.test(prest));
    assert.ok(!prest.includes('utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true, unique: true'));
    assert.ok(!freel.includes('utilisateur: 1, unique: true'));
    assert.match(vend, /VendeurSchema\.index\(\{\s*utilisateur:\s*1\s*\}\)/);
    assert.ok(!/index\(\s*\{\s*utilisateur:\s*1\s*\}\s*,\s*\{\s*unique:\s*true/.test(vend));
    assert.match(prest, /uniq_prestataire_source_field_recensement/);
    assert.match(freel, /uniq_freelance_source_field_recensement/);
    assert.match(vend, /uniq_vendeur_source_field_recensement/);
  });

  it('createPrestataire/createFreelance/createVendeur sans findOne doublon ni clientMutationId', () => {
    for (const file of [
      'controller/prestataireController.js',
      'controller/freelanceController.js',
      'controller/vendeurController.js',
    ]) {
      const src = readSource(file);
      const createName =
        file.includes('prestataire')
          ? 'createPrestataire'
          : file.includes('freelance')
            ? 'createFreelance'
            : 'createVendeur';
      const start = src.indexOf(`export const ${createName}`);
      assert.ok(start >= 0, createName);
      const block = src.slice(start, start + 3500);
      assert.ok(!block.includes('clientMutationId'));
      assert.ok(!block.includes('idempotency'));
      assert.ok(!/findOne\(\{\s*utilisateur/.test(block));
    }
  });

  it('identification : submitRecensementSimple sans idempotence', () => {
    const src = readId('lib/services/api_service.dart');
    assert.ok(!src.includes('clientMutationId'));
    assert.ok(!src.includes('Idempotency'));
  });
});

describe('PHASE0 — hors ligne / formulaire', () => {
  it('recensement_form_screen n’appelle pas saveRecensement', () => {
    const src = readId('lib/screens/recensement_form_screen.dart');
    assert.ok(src.includes('submitRecensementSimple'));
    assert.ok(!src.includes('LocalStorageService.saveRecensement'));
    assert.ok(!src.includes('SyncService.'));
  });

  it('paramètre id brouillon non lu par le formulaire / routeur', () => {
    const main = readId('lib/main.dart');
    assert.match(main, /queryParameters\['type'\]/);
    assert.ok(!main.includes("queryParameters['id']"));
    const form = readId('lib/screens/recensement_form_screen.dart');
    assert.ok(!form.includes('widget.id'));
    assert.ok(!/queryParameters\[['\"]id['\"]\]/.test(form));
  });

  it('SyncService lit pending_sync mais markAsSynced ne retire pas la file explicitement', () => {
    const local = readId('lib/services/local_storage_service.dart');
    const mark = local.slice(local.indexOf('markAsSynced'), local.indexOf('// ===== RECENSEUR'));
    assert.ok(mark.includes("status: 'synced'"));
    assert.ok(!mark.includes('_removeFromPendingSync'));
  });
});

describe('PHASE0 — contrats classification / payload', () => {
  it('CategorieModel identification attend id/nom/groupeId incompatibles backend', () => {
    const model = readId('lib/models/classification_model.dart');
    assert.match(model, /id: json\['id'\] as String/);
    assert.match(model, /nom: json\['nom'\] as String/);
    assert.match(model, /groupeId: json\['groupeId'\] as String/);
    const catModel = readSource('models/categorieModel.js');
    assert.match(catModel, /nomcategorie/);
  });

  it('payload prestataire identification mappe photo vers cni1 ; CNI UI absentes', () => {
    const api = readId('lib/services/api_service.dart');
    assert.match(api, /MultipartFile\.fromPath\('cni1'/);
    assert.ok(!api.includes("fromPath('cni2'"));
    assert.ok(!api.includes('productCategories'));
    assert.ok(!api.includes('productTypes'));
    assert.match(api, /workingHours'\] = 'Temps partiel'/);
    assert.match(api, /zoneIntervention'\] = json\.encode\(data\['zoneIntervention'\]\)/);
  });

  it('escapeRegex utilisé dans certaines recherches (référence anti-ReDoS)', () => {
    assert.equal(escapeRegex('a+b'), 'a\\+b');
  });
});

describe('PHASE0 — signature Android identification', () => {
  it('release signingConfig = debug', () => {
    const gradle = readId('android/app/build.gradle.kts');
    assert.match(gradle, /signingConfig = signingConfigs\.getByName\("debug"\)/);
    assert.equal(fs.existsSync(path.join(ID_APP, 'android/app/keystore')), false);
  });
});
