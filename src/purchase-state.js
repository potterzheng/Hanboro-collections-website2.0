'use strict';

function productGallery(product) {
  if (!product) return [];
  if (product.kind === 'packaging') return product.images.gallery.length ? product.images.gallery : [product.images.main].filter(Boolean);
  if (!product.variants.length) return [product.images.main].filter(Boolean);
  return product.variants.flatMap(variant => (variant.images?.length ? variant.images : [variant.image]).filter(Boolean).map(image => ({ ...image, variantId: variant.id })));
}

function purchaseSelection(product, variantId, imageId, allowLegacyMain = false) {
  if (!product || product.outOfStock) return null;
  const requested = product.legacyVariantIds?.[variantId] || variantId;
  let variant = product.variants.find(item => item.id === requested) || null;
  const gallery = productGallery(product);
  let image = gallery.find(item => item.id === imageId);
  if (image?.variantId) variant = product.variants.find(item => item.id === image.variantId) || null;
  if (!image && imageId && !(allowLegacyMain && requested == null && imageId === product.images.main?.id)) return null;
  if (!image && variant) image = (variant.images?.length ? variant.images : [variant.image])[0];
  if (!image && requested != null) return null;
  if (!image && (allowLegacyMain || !product.variants.length)) image = product.kind === 'packaging' ? gallery[0] : product.images.main;
  if (!image) return null;
  return { product, variant, image };
}

function cartIdentity(entry) { return JSON.stringify([entry.productId, entry.variantId || null, entry.imageId]); }

function normalizeCartEntries(entries, products) {
  const byId = new Map(products.map(product => [product.id, product]));
  const result = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || !Number.isFinite(Number(entry.quantity)) || Number(entry.quantity) < 1) continue;
    const matches = !entry.productId ? products.filter(product => product.sku === entry.sku) : [];
    const product = byId.get(entry.productId) || (matches.length === 1 ? matches[0] : null);
    const selected = purchaseSelection(product, entry.variantId, entry.imageId, entry.variantId == null);
    if (!selected) continue;
    const item = { productId: product.id, sku: product.sku, variantId: selected.variant?.id || null, imageId: selected.image.id, quantity: Math.min(999, Math.max(1, Math.floor(Number(entry.quantity)))), notes: typeof entry.notes === 'string' ? entry.notes.slice(0, 60) : '' };
    const existing = result.find(other => cartIdentity(other) === cartIdentity(item));
    if (existing) existing.quantity = Math.min(999, existing.quantity + item.quantity);
    else result.push(item);
  }
  return result;
}

function paginateEntries(entries, requested, size = 10) {
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const page = Math.max(1, Math.min(pages, Math.floor(Number(requested)) || 1));
  const start = (page - 1) * size;
  return { page, pages, items: entries.slice(start, start + size).map((entry, offset) => ({ entry, index: start + offset })) };
}

function cartImageQuantity(entries, productId, imageId) {
  return entries.filter(entry => entry.productId === productId && entry.imageId === imageId).reduce((sum, entry) => sum + entry.quantity, 0);
}
