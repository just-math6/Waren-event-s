/** Only the local development server may send authentication traffic over HTTP. */
export function secureAuthUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error('Adresse d’authentification invalide.'); }
  const localHttp = process.env.NODE_ENV === 'development'
    && url.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
    throw new Error('Une adresse HTTPS est requise pour l’authentification.');
  }
  return url;
}

export function authReturnUrl(origin: string, path: '/equipe' | '/equipe/mot-de-passe') {
  return secureAuthUrl(origin).origin + path;
}
