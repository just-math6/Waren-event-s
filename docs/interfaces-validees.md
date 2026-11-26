# Écrans validés de Waren Events

Ces repères décrivent les maquettes approuvées et permettent de conserver les choix au fil des mises à jour. Les noms, chiffres et dates des démos sont des exemples, jamais les valeurs par défaut du poste réel.

## Accueil coordination

Navigation : Accueil, Vendre, Contrôler, Équipe, Caisse. En tête : nom et date de l’événement, raccourcis et illustration du billet pour Football Tournament Two. Ensuite : billets vendus (papier / virtuel), entrées validées, recettes des ventes, stock par catégorie et modification des quantités.

## Paiement et caisse

Le vendeur confirme le prix complet affiché, en une action, avant d’activer le papier ou de partager le billet virtuel. Aucun champ « remis », « écart » ou acompte à l’achat. L’onglet Caisse montre les recettes par vendeur ; le coordinateur peut ouvrir séparément le suivi des versements des vendeurs à la clôture.

## Poste de contrôle

Référence interactive : `/demo/controle`. La démo et le poste réel utilisent le même composant d’interface (`app/equipe/controle/station.tsx`).

1. Bandeau Waren Events, identité de la personne au poste, nom et date de l’événement, compteur d’entrées uniques sur billets vendus.
2. Deux modes au même endroit : **Scan QR** et **Saisie manuelle**.
3. Aucune légende permanente. Après un scan, seul son résultat apparaît, puis disparaît (les contrôles restent consultables dans l’historique) : **vert ✓ autorisé**, **orange ! déjà utilisé**, **rouge × refusé**. Chaque résultat a une icône et un libellé, indépendamment de la couleur.
4. Le lecteur conserve le fond vert sombre, le cadre citron et le billet d’illustration. La démo propose une sélection de billets fictifs ; le poste connecté ouvre la caméra. Une démo ne contacte jamais la base de billetterie.
5. Navigation inférieure : **Contrôler / Historique**. Chaque contrôleur consulte ses 40 derniers résultats pour l’événement. Le premier passage, le type, le canal et le nom du vendeur sont affichés lorsqu’ils sont disponibles. Le journal ne conserve pas le contenu du QR.
6. Le poste réel ne donne pas de feu vert sans confirmation du serveur. Un coordinateur ou une personne avec deux rôles peut changer de mode après la fin de l’opération.
