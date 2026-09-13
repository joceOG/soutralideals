/**
 * R1-11 — Auth JWT pour Field Recensement V1 (contrat canonique).
 * N’altère pas authMiddleware global des autres routes.
 */
import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';

export async function authFieldRecensementV1(req, res, next) {
  try {
    const header = req.header('Authorization');
    const token = header?.startsWith('Bearer ')
      ? header.slice(7).trim()
      : header?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_REQUIRED'),
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('SERVER_TEMPORARY_ERROR'),
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendFieldRecensementError(
          res,
          req,
          FieldRecensementApiError.fromCode('AUTH_TOKEN_EXPIRED'),
        );
      }
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_TOKEN_INVALID'),
      );
    }

    if (decoded.typ === 'socket') {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_TOKEN_INVALID', {
          message: 'Jeton socket non utilisable pour l’API HTTP.',
        }),
      );
    }

    const userId = decoded._id || decoded.id;
    if (!userId) {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_TOKEN_INVALID'),
      );
    }

    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_TOKEN_INVALID', {
          message: 'Utilisateur introuvable.',
        }),
      );
    }

    const tokenExists = utilisateur.tokens?.some((t) => t.token === token);
    if (!tokenExists) {
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('AUTH_TOKEN_INVALID', {
          message: 'Jeton révoqué ou invalide.',
        }),
      );
    }

    req.utilisateur = utilisateur;
    req.user = utilisateur;
    req.token = token;
    return next();
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export default authFieldRecensementV1;
