import mongoose from 'mongoose';
import { mongooseValidationTo400 } from './prestataireValidation.js';

export { mongooseValidationTo400 };

const BUSINESS_TYPES = ['Particulier', 'Entreprise', 'Auto-entrepreneur'];
const SHIPPING_METHODS = ['Standard', 'Express', 'Same-Day', 'Pickup'];
const PAYMENT_METHODS = ['Mobile Money', 'Carte Bancaire', 'Virement', 'Espèces'];
const CONTACT_METHODS = ['Email', 'Phone', 'WhatsApp'];
const MAX_SHOP_NAME = 100;
const MAX_SHOP_DESC = 1000;

export function parseJsonArrayField(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [String(p)];
    } catch {
      return [v];
    }
  }
  return [String(v)];
}

export function parseJsonObjectField(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return typeof p === 'object' && p ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function validateVendeurCreateBody({ body, isAdminUser, requesterId }) {
  const errors = [];
  const shopName = typeof body.shopName === 'string' ? body.shopName.trim() : '';
  const shopDescription = typeof body.shopDescription === 'string' ? body.shopDescription.trim() : '';
  const businessType = typeof body.businessType === 'string' ? body.businessType.trim() : '';

  if (!shopName) errors.push('shopName requis');
  if (shopName.length > MAX_SHOP_NAME) errors.push('shopName trop long');
  if (!shopDescription) errors.push('shopDescription requise');
  if (shopDescription.length > MAX_SHOP_DESC) errors.push('shopDescription trop longue');
  if (!businessType) errors.push('businessType requis');
  if (businessType && !BUSINESS_TYPES.includes(businessType)) {
    errors.push('businessType invalide');
  }

  const categories = parseJsonArrayField(body.businessCategories);
  if (!categories.length) errors.push('businessCategories requises');

  if (body.shippingMethods) {
    const methods = parseJsonArrayField(body.shippingMethods);
    for (const m of methods) {
      if (!SHIPPING_METHODS.includes(m)) errors.push(`shippingMethods invalide: ${m}`);
    }
  }
  if (body.paymentMethods) {
    const pm = parseJsonArrayField(body.paymentMethods);
    for (const m of pm) {
      if (!PAYMENT_METHODS.includes(m)) errors.push(`paymentMethods invalide: ${m}`);
    }
  }
  if (body.preferredContactMethod && !CONTACT_METHODS.includes(body.preferredContactMethod)) {
    errors.push('preferredContactMethod invalide');
  }

  let ownerId = requesterId;
  if (isAdminUser) {
    if (!body.utilisateur || !mongoose.Types.ObjectId.isValid(String(body.utilisateur))) {
      errors.push('utilisateur requis pour la création admin');
    } else {
      ownerId = String(body.utilisateur);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    ownerId,
    shopName,
    shopDescription,
    businessType,
    businessCategories: categories,
  };
}
