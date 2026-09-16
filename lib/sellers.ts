import 'server-only';
export function sellerNames(email?: string) {
  return [...new Set([email || 'Administrateur', ...(process.env.SELLER_NAMES || '').split(',').map(name => name.trim()).filter(Boolean)])];
}
