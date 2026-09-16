# Waren Event’s

Base de billetterie privée : Next.js App Router, TypeScript, Tailwind CSS et Supabase Auth. La page `/admin/evenements` liste les événements et permet leur création avec plusieurs types de billets. La vente présentielle et le partage du lien WhatsApp sont disponibles ; la consultation publique et le téléchargement du billet restent à implémenter.

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

La protection des pages ne remplace pas les politiques RLS de la base. Le schéma existant a été inspecté. La migration `admin_event_creation` restreint les trois tables au compte administrateur, active `security_invoker` sur `event_summary` et ajoute une fonction de création transactionnelle. Elle est déjà appliquée au projet Supabase connecté. Pour un autre projet, appliquer d’abord le schéma initial puis adapter l’UUID administrateur dans la migration et `ADMIN_USER_ID` ensemble. Les futures fonctions de billets publics devront contrôler les liens uniques sans ouvrir l’accès aux données administratives.

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

## Événements

`/admin/evenements` lit `events` et la vue `event_summary` (billets vendus et recettes hors annulations), avec lecture paginée de toutes les lignes. Une erreur de chargement ne présente pas des totaux artificiellement nuls.

Le formulaire accepte un titre, une date/heure locale, un lieu et 1 à 50 types de billets : nom unique, prix positif ou nul à deux décimales, quantité entière strictement positive. La date est enregistrée en UTC et affichée dans le fuseau de l’appareil. Le schéma ne définit aucune devise : les prix et recettes sont affichés sans symbole monétaire.

La Server Action vérifie l’administrateur et les champs, puis appelle `create_event_with_ticket_types` avec la session utilisateur. Cette fonction SECURITY INVOKER respecte les règles RLS et enregistre l’événement et tous ses types dans une même transaction. Aucun secret service_role n’est utilisé.

Validation effectuée : 22 tests automatisés, lint et compilation. Test SQL transactionnel annulé : création de deux types, totaux initiaux nuls, exclusion d’un billet annulé, retour arrière sur un type invalide, refus de lecture et de création pour un autre utilisateur. Les tests ne conservent pas de données. Le parcours navigateur avec le vrai compte reste à essayer.

## Vente présentielle

Depuis chaque événement, « Vendre un billet » ouvre `/admin/evenements/[id]/vendre` : types côte à côte, prix et quantités restantes (hors annulations), nom et téléphone obligatoires, vendeur et confirmation. Les montants restent sans symbole tant que la devise n’est pas définie.

Le contrôle du téléphone est temporisé de 350 ms et recherche uniquement les billets `valide` du même événement. Il normalise aussi les anciens numéros formatés. Son avertissement ne bloque jamais la vente. Saisir l’indicatif pays ; aucun pays n’est déduit automatiquement.

`SELLER_NAMES` permet d’ajouter des vendeurs séparés par des virgules au compte administrateur, sans créer de comptes supplémentaires. La sélection est contrôlée côté serveur. Le prix payé est lu depuis `ticket_types`, et l’appartenance du type à l’événement est vérifiée avant insertion. Le trigger existant conserve le contrôle du quota ; son message est présenté dans le formulaire.

Chaque formulaire utilise un token cryptographiquement aléatoire de 32 octets. La contrainte unique et la recherche du token permettent de reprendre la même vente après une réponse perdue sans réinsérer le billet. Après confirmation, le lien utilise le domaine courant en HTTPS (HTTP autorisé pour localhost), avec copie et ouverture de WhatsApp au numéro international normalisé. L’envoi du message reste manuel dans WhatsApp.

La route publique `/billet/[token]` et le téléchargement du billet restent à implémenter : cette étape crée la vente et son lien. Le déploiement doit utiliser le domaine public final avant de partager les liens aux acheteurs.

Validation de cette étape : 31 tests automatisés, lint, TypeScript et compilation réussis. Le test SQL sous le rôle authentifié a confirmé l’insertion et le refus d’un billet au-delà du quota, puis a annulé les données. Le parcours complet avec le vrai compte administrateur reste à essayer dans un navigateur.
