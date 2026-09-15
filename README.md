# Waren Event’s

Base de billetterie privée : Next.js App Router, TypeScript, Tailwind CSS et Supabase Auth. Aucun écran métier, paiement, billet ni envoi WhatsApp n’est implémenté.

## Démarrage

Node.js 22 ou plus récent.

```sh
npm ci
cp .env.example .env.local
# Compléter .env.local avant le lancement
npm run dev
```

Ouvrir http://localhost:3000/admin/login.

- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique anon (ou publishable). Jamais de clé service_role/secret.
- `ADMIN_USER_ID` : UUID du seul administrateur autorisé, dans Authentication > Users. Variable exclusivement serveur. Sans cet identifiant, aucun compte ne peut accéder à /admin.

Dans Supabase, activer Email/password, créer ou utiliser le compte administrateur avec son mot de passe et désactiver les nouvelles inscriptions publiques (Authentication > configuration des inscriptions). Aucune interface d’inscription n’est fournie. Aucun mot de passe n’est stocké dans le dépôt.

Les variables doivent aussi être configurées sur l’hébergeur avant la compilation. `.env.local` est ignoré par Git.

## Structure et sécurité

- `lib/supabase.ts` : client navigateur utilisant les deux variables publiques demandées et des cookies SSR.
- `lib/supabase/server.ts` : client serveur par requête.
- `proxy.ts` : middleware, renommé Proxy dans Next.js 16. Protège `/admin` et toutes ses sous-routes ; seule `/admin/login` reste publique. Vérifie la session auprès de Supabase (`getUser`), contrôle l’UUID admin, renouvelle les cookies, interdit la mise en cache et conserve les cookies lors des redirections.
- `lib/auth.ts` : `requireAdmin()` à appeler dans chaque futur traitement serveur sensible. La page `/admin` l’utilise également.
- `/admin/login` : formulaire courriel/mot de passe, erreurs et état de chargement.
- `/admin` : simple confirmation de connexion et déconnexion locale.

La protection des pages ne remplace pas les politiques RLS de la base. Le schéma SQL n’a pas été fourni : aucune table ni politique existante n’a été modifiée ou validée dans cette étape. Les futures fonctions de billets publics devront contrôler les liens uniques sans ouvrir l’accès aux données administratives.

## Vérification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests automatisés : accès sans session, sous-routes, exception login, rejet non-admin/anonyme, erreur de validation et conservation des cookies renouvelés. Compléter avec une connexion utilisant le vrai mot de passe admin, un rechargement de /admin et une déconnexion.

Style : blanc, cartes gris clair arrondies, boutons foncés pleine largeur, sans ombres ni dégradés. Classes de statut : `text-green-600`, `text-amber-600`, `text-red-600`.

Références : [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) et [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
