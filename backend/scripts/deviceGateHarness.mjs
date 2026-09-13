/**
 * Gate Android R2 — harness HTTP local (MongoMemoryServer).
 * INTERDIT : Atlas, Cloudinary réel, MONGO_URL de production.
 *
 * Usage (depuis soutralideals/backend) :
 *   node scripts/deviceGateHarness.mjs
 *
 * Écoute 127.0.0.1:3000 — couple avec `adb reverse tcp:3000 tcp:3000`.
 */
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cloudinary from 'cloudinary';
// bcrypt : compare login harness (modèle hashe au save)

import {
  startIsolatedMongo,
  stopIsolatedMongo,
} from '../tests/helpers/mongoTestHarness.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from '../tests/helpers/fieldRecensementV1TestEnv.js';
import categorieRouter from '../routes/categorieRoutes.js';
import serviceRouter from '../routes/serviceRoutes.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import Utilisateur from '../models/utilisateurModel.js';

process.env.NODE_ENV = 'test';
delete process.env.MONGO_URL;
delete process.env.MONGODB_URI;
delete process.env.DATABASE_URL;

const SECRET =
  process.env.JWT_SECRET ||
  'gate-android-r2-test-secret-min-32chars!!';
process.env.JWT_SECRET = SECRET;

const PORT = Number(process.env.GATE_HARNESS_PORT || 3000);
const HOST = process.env.GATE_HARNESS_HOST || '127.0.0.1';

/** Failpoints réservés au test — header X-SDEALS-TEST-FAILPOINT */
const FAILPOINTS = new Set([
  'RECENSEMENT_PROCESSING',
  'SERVER_TEMPORARY_ERROR',
  'DROP_AFTER_APPLY',
  'TOKEN_EXPIRED',
  'PERMISSION_REVOKED',
  'APP_VERSION_BLOCKED',
  'DUPLICATE_SUSPECTED',
  'IDEMPOTENCY_KEY_REUSED',
]);

let agentA;
let agentB;
let agentAdmin;
let catalogIds = {};

function issueToken(user, expiresIn = '2h') {
  return jwt.sign(
    { _id: String(user._id), id: String(user._id), role: user.role || 'Client' },
    SECRET,
    { expiresIn },
  );
}

async function seed() {
  const gMetiers = new mongoose.Types.ObjectId();
  const gFreelance = new mongoose.Types.ObjectId();
  const gEmarche = new mongoose.Types.ObjectId();
  const catMetiers = new mongoose.Types.ObjectId();
  const catFreelance = new mongoose.Types.ObjectId();
  const catVendeur = new mongoose.Types.ObjectId();
  const svc = new mongoose.Types.ObjectId();

  await mongoose.connection.collection('groupes').insertMany([
    { _id: gMetiers, nomgroupe: 'Métiers' },
    { _id: gFreelance, nomgroupe: 'Freelance' },
    { _id: gEmarche, nomgroupe: 'E-marché' },
  ]);
  await mongoose.connection.collection('categories').insertMany([
    {
      _id: catMetiers,
      nomcategorie: 'Plomberie Gate',
      imagecategorie: 'x.jpg',
      groupe: gMetiers,
    },
    {
      _id: catFreelance,
      nomcategorie: 'Graphisme Gate',
      imagecategorie: 'x.jpg',
      groupe: gFreelance,
    },
    {
      _id: catVendeur,
      nomcategorie: 'Mode Gate',
      imagecategorie: 'x.jpg',
      groupe: gEmarche,
    },
  ]);
  await mongoose.connection.collection('services').insertOne({
    _id: svc,
    nomservice: 'Débouchage Gate',
    categorie: catMetiers,
  });

  catalogIds = {
    serviceId: String(svc),
    metiersCategoryId: String(catMetiers),
    freelanceCategoryId: String(catFreelance),
    vendeurCategoryId: String(catVendeur),
  };

  // Mot de passe en clair — le modèle Utilisateur hashe au save (comme les tests R1).
  agentA = await Utilisateur.create({
    nom: 'AgentA Gate',
    prenom: 'QA',
    email: 'agent.a.gate@example.test',
    telephone: '+2250700000001',
    password: 'GateTest1a!!',
    role: 'Client',
    canCreateRecensement: true,
    telephoneVerified: true,
  });
  agentB = await Utilisateur.create({
    nom: 'AgentB Gate',
    prenom: 'QA',
    email: 'agent.b.gate@example.test',
    telephone: '+2250700000002',
    password: 'GateTest1a!!',
    role: 'Client',
    canCreateRecensement: true,
    telephoneVerified: true,
  });
  agentAdmin = await Utilisateur.create({
    nom: 'Admin Gate',
    prenom: 'QA',
    email: 'admin.gate@example.test',
    telephone: '+2250700000009',
    password: 'GateTest1a!!',
    role: 'Admin',
    canCreateRecensement: false,
    telephoneVerified: true,
  });
}

function failpointMiddleware(req, res, next) {
  const fp = req.get('X-SDEALS-TEST-FAILPOINT');
  if (!fp || process.env.NODE_ENV !== 'test') return next();
  if (!FAILPOINTS.has(fp)) {
    return res.status(400).json({
      code: 'UNKNOWN_TEST_FAILPOINT',
      message: 'Failpoint inconnu (test only)',
    });
  }
  if (fp === 'SERVER_TEMPORARY_ERROR') {
    return res.status(503).json({
      code: 'SERVER_TEMPORARY_ERROR',
      message: 'Simulated temporary error',
    });
  }
  if (fp === 'APP_VERSION_BLOCKED') {
    return res.status(403).json({
      code: 'APP_VERSION_BLOCKED',
      message: 'Simulated build block',
    });
  }
  if (fp === 'PERMISSION_REVOKED') {
    return res.status(403).json({
      code: 'RECENSEUR_PERMISSION_REVOKED',
      message: 'Simulated revoke',
    });
  }
  if (fp === 'TOKEN_EXPIRED') {
    return res.status(401).json({
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Simulated expiry',
    });
  }
  req.sdealsTestFailpoint = fp;
  return next();
}

async function main() {
  // Cloudinary fake — aucun upload externe
  cloudinary.v2.uploader = cloudinary.v2.uploader || {};
  cloudinary.v2.uploader.upload = async () => ({
    public_id: 'gate_fake_public_id',
    secure_url: 'https://example.test/fake.jpg',
    bytes: 12,
  });
  cloudinary.v2.uploader.destroy = async () => ({ result: 'ok' });

  enableFieldRecensementV1ForTests({ minBuild: 1 });
  const mongo = await startIsolatedMongo();
  await seed();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(failpointMiddleware);

  app.get('/api/health/gate', (_req, res) => {
    res.json({
      ok: true,
      env: process.env.NODE_ENV,
      mongo: mongo.dbName,
      atlas: false,
      cloudinaryReal: false,
      catalog: catalogIds,
      agents: {
        a: { telephone: '+2250700000001' },
        b: { telephone: '+2250700000002' },
        admin: { telephone: '+2250700000009' },
      },
      // Tokens non exposés ici — utiliser POST /api/login
      minBuild: TEST_FIELD_APP_BUILD,
    });
  });

  // Inspection Gate 6E-bis — métadonnées uniquement (pas de secrets / KYC)
  app.get('/api/health/gate/recensements', async (_req, res) => {
    const col = mongoose.connection.collection('field_recensements');
    const docs = await col
      .find({})
      .project({
        clientMutationId: 1,
        professionalType: 1,
        reviewStatus: 1,
        publicationStatus: 1,
        revision: 1,
        createdBy: 1,
        'correction.reasonCode': 1,
        'correction.fields': 1,
        'business.shopName': 1,
        'business.serviceId': 1,
        'business.description': 1,
      })
      .toArray();
    res.json({
      count: docs.length,
      items: docs.map((d) => ({
        id: String(d._id),
        clientMutationId: d.clientMutationId,
        professionalType: d.professionalType,
        reviewStatus: d.reviewStatus,
        publicationStatus: d.publicationStatus,
        revision: d.revision,
        createdBy: d.createdBy ? String(d.createdBy) : null,
        correctionReasonCode: d.correction?.reasonCode ?? null,
        correctionFields: d.correction?.fields ?? [],
        shopName: d.business?.shopName ?? null,
        serviceId: d.business?.serviceId
          ? String(d.business.serviceId)
          : null,
        description: d.business?.description ?? null,
      })),
    });
  });

  // Login synthétique simplifié (pas le controller prod — pas d’Atlas)
  // Aligné app mobile : POST { identifiant, password }
  app.post('/api/login', async (req, res) => {
    const raw =
      req.body?.identifiant ??
      req.body?.telephone ??
      req.body?.email ??
      '';
    const tel = String(raw).trim();
    const password = String(req.body?.password || '');
    const user = await Utilisateur.findOne({
      $or: [{ telephone: tel }, { email: tel }],
    });
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const token = issueToken(user);
    const refreshToken = jwt.sign(
      { _id: String(user._id), typ: 'refresh' },
      SECRET,
      { expiresIn: '7d' },
    );
    // Persistance tokens — authFieldRecensementV1 vérifie utilisateur.tokens
    user.tokens = [...(user.tokens || []).filter((t) => t?.token !== token), { token }];
    await user.save();
    // Forme attendue par AuthService (utilisateur + token)
    return res.json({
      token,
      accessToken: token,
      refreshToken,
      utilisateur: {
        _id: user._id,
        id: String(user._id),
        nom: user.nom,
        telephone: user.telephone,
        email: user.email,
        role: user.role,
        canCreateRecensement: user.canCreateRecensement === true,
      },
      user: {
        _id: user._id,
        nom: user.nom,
        telephone: user.telephone,
        email: user.email,
        role: user.role,
      },
    });
  });

  app.post('/api/refresh-token', async (req, res) => {
    const rt = req.body?.refreshToken;
    try {
      const payload = jwt.verify(rt, SECRET);
      const accessToken = jwt.sign(
        { _id: payload._id, id: payload._id, role: 'Client' },
        SECRET,
        { expiresIn: '2h' },
      );
      const user = await Utilisateur.findById(payload._id);
      if (user) {
        user.tokens = [
          ...(user.tokens || []).filter((t) => t?.token !== accessToken),
          { token: accessToken },
        ];
        await user.save();
      }
      return res.json({ accessToken, token: accessToken, refreshToken: rt });
    } catch {
      return res.status(401).json({ code: 'AUTH_TOKEN_INVALID' });
    }
  });

  // Log toutes les requêtes login pour debug Gate
  app.use('/api/login', (req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      event: 'login_attempt',
      body: { identifiant: req.body?.identifiant, telephone: req.body?.telephone, email: req.body?.email, hasPassword: !!req.body?.password },
    }));
    next();
  });

  app.use('/api', categorieRouter);
  app.use('/api', serviceRouter);
  app.use('/api/v1', fieldRecensementV1Router);

  const server = app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'gate_harness_ready',
        host: HOST,
        port: PORT,
        mongoDb: mongo.dbName,
        atlas: false,
        cloudinaryReal: false,
        health: `http://${HOST}:${PORT}/api/health/gate`,
      }),
    );
  });

  const shutdown = async () => {
    server.close();
    await stopIsolatedMongo();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('gate_harness_failed', err?.message || err);
  try {
    await stopIsolatedMongo();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
