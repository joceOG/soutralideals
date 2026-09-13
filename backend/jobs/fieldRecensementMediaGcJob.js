/**
 * R1-12 — Job GC médias (appelable depuis script ; pas de scheduler prod).
 */
import { v2 as cloudinary } from 'cloudinary';
import { runFieldRecensementMediaGc } from '../services/fieldRecensementMediaGcService.js';
import { FIELD_MEDIA_TAGS } from '../utils/fieldRecensementMediaClassification.js';

function isMockMode() {
  return process.env.NODE_ENV === 'test' || process.env.TEST_CLOUDINARY_MOCK === '1';
}

/**
 * Adapter Cloudinary Admin API — listing borné par tag uniquement.
 * En test / mock : listByTag injecté obligatoire pour éviter tout appel réel.
 */
export function createCloudinaryTagLister(api = cloudinary.api) {
  return async function listByTag({ tag, resourceType, type, maxResults, nextCursor }) {
    if (isMockMode() && !process.env.FIELD_RECENSEMENT_MEDIA_GC_ALLOW_LIVE_LIST) {
      return { resources: [], next_cursor: undefined };
    }
    return api.resources_by_tag(tag || FIELD_MEDIA_TAGS[0], {
      resource_type: resourceType || 'image',
      type,
      max_results: maxResults || 50,
      next_cursor: nextCursor,
      tags: true,
      context: true,
    });
  };
}

export function createCloudinaryDestroyer(uploader = cloudinary.uploader) {
  return async function destroyAsset({ publicId, resourceType, type, invalidate }) {
    if (isMockMode() && !process.env.FIELD_RECENSEMENT_MEDIA_GC_ALLOW_LIVE_DESTROY) {
      throw new Error('Destroy réel interdit en mode test/mock');
    }
    return uploader.destroy(publicId, {
      resource_type: resourceType || 'image',
      type,
      invalidate: Boolean(invalidate),
    });
  };
}

/**
 * @param {{
 *   execute?: boolean,
 *   confirm?: string,
 *   reportOnly?: boolean,
 *   listByTag?: Function,
 *   destroyAsset?: Function,
 * }} opts
 */
export async function runFieldRecensementMediaGcJob(opts = {}) {
  const listByTag = opts.listByTag || createCloudinaryTagLister();
  const destroyAsset = opts.destroyAsset || createCloudinaryDestroyer();
  return runFieldRecensementMediaGc({
    cli: {
      execute: opts.execute === true,
      confirm: opts.confirm,
      reportOnly: opts.reportOnly === true,
    },
    listByTag,
    destroyAsset,
    writeCandidates: opts.reportOnly !== true,
  });
}

export default runFieldRecensementMediaGcJob;
