# Key Finder - Plan d'implementation responsive

## 1. Objectif

Rendre l'ensemble de Key Finder aussi soigne, lisible et fonctionnel sur mobile
que sur desktop, sans modifier la direction artistique existante.

La feature couvre toutes les routes et tous les etats:

- `/` Home et file de traitement;
- `/player`;
- `/library`, vues cartes et liste, playlists et mini-player;
- `/discovery`;
- `/settings`;
- authentification, modales, menus, overlays, chargements, erreurs et etats vides.

Le resultat attendu n'est pas une version desktop compressee. Chaque viewport
doit recevoir une composition adaptee, avec la meme hierarchie visuelle, les
memes couleurs reactives, les memes surfaces glass et toutes les fonctions
accessibles au tactile.

## 2. Sources de verite

Les agents doivent conserver les choix etablis dans:

- `frontend/src/app/globals.css`: tokens `--kf-*`, glassmorphism, themes et
  animations;
- `frontend/tailwind.config.ts`: couleurs semantiques, typographies et rayons;
- `frontend/src/lib/mood.ts`, `frontend/src/lib/mood-presets.ts` et
  `frontend/src/lib/background.ts`: couleurs reactives liees au BPM et a la
  tonalite;
- `project-desing pages_handoff/`: intention visuelle desktop;
- `SPECIFICATION.md`: comportements produit;
- `frontend/messages/fr.json` et `frontend/messages/en.json`: textes visibles.

Le responsive doit etendre ce systeme, pas creer un second langage visuel.

## 3. Audit actuel

### Bloquants globaux

- `NavRail` occupe toujours 76 px horizontalement. Sur mobile, il reduit
  fortement la surface utile et garde les controles langue/theme en colonne.
- Plusieurs pages utilisent `min-h-screen` ou `h-screen`; ces valeurs sont
  fragiles avec les barres navigateur et le clavier virtuel mobile.
- Le `main` global est en `overflow-hidden`, puis chaque vue gere son propre
  scroll. Ce modele produit facilement des doubles scrolls ou du contenu
  inaccessible.
- Les espacements, titres et illustrations sont majoritairement fixes.
- Beaucoup de boutons font moins de 44 px et plusieurs actions n'apparaissent
  qu'avec `hover`, interaction inexistante sur ecran tactile.
- Les menus sont positionnes en `absolute` depuis leur declencheur. Ils peuvent
  sortir du viewport sur mobile.
- Il n'existe pas de politique globale pour les safe areas, le clavier, le
  mode paysage, `prefers-reduced-motion` ou `hover: none`.

### Bloquants par surface

- Home: titre a 58 px, formulaire horizontal, hints en une ligne, panneau de
  queue dense et bouton de fond trop large.
- Player: carte horizontale de 1000 px, artwork fixe de 320 px, page sans
  scroll et controles repartis pour desktop.
- Library: sidebar interne fixe de 62/224 px en plus de la navigation globale,
  `h-screen`, colonnes fixes en vue liste, actions au survol et mini-player
  horizontal.
- Discovery: grille commence a deux colonnes, formulaire horizontal et action
  YouTube principalement revelee au survol.
- Settings: lignes label/controle horizontales, segmented controls non
  repliables, slider fixe, presets et actions pouvant deborder.
- Auth: carte sans padding de page mobile ni prise en compte du clavier.
- Correction modal: centrage vertical fixe, contenu non scrollable et actions
  potentiellement sous le clavier.

## 4. Contrat responsive global

### Viewports de reference

Utiliser une approche mobile-first et verifier au minimum:

| Classe | Largeur de reference | Usage |
|---|---:|---|
| compact | 320, 360, 390, 430 px | telephones portrait |
| medium | 600, 768, 820 px | grand mobile, tablette portrait |
| expanded | 1024, 1280, 1440 px | tablette paysage et desktop |

Les breakpoints Tailwind peuvent rester `sm`, `md`, `lg`, `xl`, mais les
composants doivent reagir a leur espace disponible. Pour les composants
reutilisables et les zones imbriquees de Library, preferer des container
queries si elles reduisent les exceptions liees au viewport.

### Fondations CSS a ajouter

Centraliser les valeurs responsive dans `globals.css`:

```css
:root {
  --kf-nav-mobile-h: 68px;
  --kf-page-pad-x: clamp(16px, 4vw, 40px);
  --kf-page-pad-y: clamp(18px, 3vw, 30px);
  --kf-touch-target: 44px;
}
```

Ajouter les primitives suivantes:

- hauteur de page basee sur `100dvh`, avec fallback `100vh`;
- padding `env(safe-area-inset-*)` pour navigation, overlays et mini-player;
- verrouillage horizontal global: aucun contenu applicatif ne doit augmenter
  la largeur du document;
- classe de contenu scrollable avec `overscroll-behavior`;
- focus visible coherent avec la couleur primaire;
- reduction ou suppression des animations decoratives sous
  `prefers-reduced-motion: reduce`;
- reduction du blur, du nombre de blobs ou de leur taille sur les appareils
  compacts pour conserver fluidite et lisibilite;
- regles `@media (hover: none)` pour rendre les actions tactiles visibles.

### Shell et navigation

Refactorer `layout.tsx` et `nav-rail.tsx` en shell adaptatif:

- `lg+`: conserver le rail lateral actuel de 76 px;
- `< lg`: remplacer le rail par une barre de navigation fixe en bas;
- la barre mobile contient Home, Discovery, Library et Settings;
- le Player reste contextuel et Home reste actif pendant sa lecture;
- langue, theme et deconnexion ne doivent pas prendre une place permanente
  dans la barre. Les regrouper dans un menu "Preferences rapides" accessible
  depuis le header mobile ou Settings;
- reserver dans le contenu le padding necessaire a la barre basse et a la safe
  area;
- chaque cible tactile fait au moins 44 x 44 px;
- le libelle actif reste visible; les libelles inactifs peuvent etre plus
  discrets mais ne doivent pas dependre d'un tooltip.

Ne pas dupliquer la liste des routes ou la logique `isActive`: partager la
configuration entre les variantes desktop et mobile.

### Typographie et espacement

- Titres de page: `clamp()` ou classes responsives, environ 28-32 px mobile et
  30-42 px desktop selon la page.
- Hero Home: environ 36-42 px mobile, 58 px desktop.
- Corps: ne pas descendre sous 14 px pour le contenu principal.
- Meta: 11-13 px permis si le contraste reste suffisant.
- Padding lateral: 16 px a 360 px, 20-24 px sur tablette, valeurs actuelles sur
  desktop.
- Les panneaux glass peuvent reduire rayon et padding sur compact, mais gardent
  gradient, border, blur et glow du design system.

### Interaction et accessibilite

- Toute action disponible au survol doit etre accessible au tap, au clavier et
  avec un nom accessible.
- Les menus complexes deviennent des bottom sheets sur compact. Desktop peut
  conserver les popovers ancres.
- Les modales utilisent `role="dialog"`, `aria-modal`, focus initial, boucle de
  focus et retour du focus au declencheur.
- `Escape`, clic backdrop et bouton explicite ferment les overlays quand cela
  ne detruit pas de donnees.
- Ajouter `touch-action: manipulation` aux controles adaptes.
- Conserver un zoom navigateur fonctionnel; ne pas bloquer le viewport.
- Les champs doivent utiliser une taille de texte d'au moins 16 px sur mobile
  si necessaire pour eviter le zoom automatique iOS.

## 5. Composants transverses a creer ou adapter

### `AppShell`

Responsable de:

- la navigation desktop/mobile;
- la hauteur `dvh`;
- les safe areas;
- le padding bas reserve;
- le conteneur principal de scroll.

### `ResponsivePage`

Primitive optionnelle pour uniformiser:

- aurora;
- header de page;
- padding responsive;
- scroll vertical;
- largeur maximale.

Ne l'introduire que si Home, Discovery et Settings peuvent reellement partager
le comportement sans multiplier les props cosmetiques.

### `ResponsiveOverlay`

Primitive partagee par les menus d'actions, filtres et selecteurs:

- popover ancre sur `md+`;
- bottom sheet sur compact;
- contenu contraint a `max-height: min(..., 100dvh - safe areas)`;
- scroll interne;
- fermeture, focus et backdrop standardises.

### Controles

Adapter ou ajouter:

- `IconButton` avec tailles 44/48 px tactiles;
- `SegmentedControl` repliable ou scrollable horizontalement;
- `MobileHeaderActions`;
- `BottomSheet`;
- `ResponsiveDialog`.

Eviter une bibliotheque supplementaire si les primitives actuelles suffisent.
Si une gestion de focus robuste devient complexe, adopter une primitive Radix
compatible avec le stack existant et documenter la nouvelle dependance.

## 6. Exigences par page

### 6.1 Authentification

Fichiers principaux:

- `frontend/src/components/auth-gate.tsx`

Implementation:

- ajouter padding lateral et safe areas;
- largeur `min(100% - 32px, 384px)`;
- reduire le padding interne a 20-24 px sur compact;
- garder le bouton principal pleine largeur et cible >= 48 px;
- lorsque le clavier est ouvert, permettre le scroll et aligner la carte vers
  le haut si le centrage masque les erreurs;
- integrer la deconnexion aux actions du shell mobile; le bouton flottant
  actuel ne doit pas recouvrir la navigation ou le mini-player;
- passer les textes hardcodes dans les catalogues i18n.

### 6.2 Home

Fichiers principaux:

- `frontend/src/app/page.tsx`
- `frontend/src/components/queue-row.tsx`
- `frontend/src/components/transition-overlay.tsx`

Compact:

- header mobile avec marque et bouton compact pour le mode de fond;
- masquer les pastilles de couleurs ou le libelle secondaire si largeur < 390;
- hero aligne au centre, titre 36-42 px, kicker autorise a se replier;
- formulaire en panneau arrondi, champ sur une ligne et CTA pleine largeur sous
  le champ;
- le bouton Analyze fait au moins 48 px de haut;
- hints en liste compacte ou chips repliables, sans separateurs orphelins;
- la queue devient une section dans le flux, avec marge basse pour la nav;
- `QueueRow` passe en disposition adaptee: contenu principal en haut, progression
  et actions en bas. Aucun titre ne doit etre limite par un `max-width` desktop;
- Retry/Delete restent visibles au tactile.

Medium:

- formulaire horizontal possible a partir du moment ou le champ conserve au
  moins 280 px;
- queue a une colonne jusqu'a ce que chaque carte dispose d'au moins 420 px.

Desktop:

- conserver la composition actuelle.

### 6.3 Player

Fichiers principaux:

- `frontend/src/components/player-view.tsx`
- `frontend/src/lib/use-wave-player.ts`

Compact:

- page verticalement scrollable;
- top bar sur deux zones: retour a gauche, indicateur mood compact a droite ou
  sous la premiere ligne;
- carte principale en colonne;
- artwork `width: 100%`, `max-width` environ 360 px, ratio carre;
- play overlay tactile >= 72 px;
- titre repliable sur plusieurs lignes;
- readouts BPM/Key en grille de deux colonnes si >= 360 px, sinon empiles;
- confidence et alternatives ne doivent pas deborder;
- waveform sur toute la largeur avec cible de seek suffisamment haute;
- controle principal et download en zone sticky basse seulement si cela ne
  concurrence pas la navigation globale; sinon, controles dans le flux avec
  CTA download pleine largeur;
- menu de format en bottom sheet ou menu qui reste dans le viewport;
- nom de fichier repliable avec `overflow-wrap:anywhere`.

Medium:

- carte en colonne sur tablette portrait;
- autoriser la composition horizontale seulement quand artwork + infos gardent
  une largeur confortable, typiquement `lg`.

Desktop:

- conserver artwork 320 px et carte horizontale.

Etats Loading/Empty:

- utiliser le meme padding reserve et les safe areas;
- CTA >= 44 px.

### 6.4 Library

Fichiers principaux:

- `frontend/src/components/library-view.tsx`
- `frontend/src/components/track-card.tsx`
- `frontend/src/components/track-row.tsx`
- `frontend/src/components/correction-modal.tsx`

Navigation interne:

- `lg+`: sidebar actuelle, ouverte ou reduite;
- `< lg`: supprimer la colonne persistante. Ouvrir sections et playlists depuis
  un bouton dans le header via drawer/bottom sheet;
- exposer le titre de section active et le compteur dans le header;
- creation, renommage et suppression de playlist doivent etre possibles dans
  ce drawer;
- ne pas persister l'etat desktop `sidebarCollapsed` comme choix mobile.

Toolbar:

- recherche pleine largeur sur la premiere ligne;
- seconde ligne avec Sort, Key et View;
- sous 360 px, utiliser boutons icones + libelles accessibles ou une action
  "Filtres" ouvrant une sheet;
- les listes de tonalites et tris deviennent des sheets sur compact;
- afficher clairement les filtres actifs et une action de reinitialisation.

Vue cartes:

- une colonne de 320 a environ 520 px;
- deux colonnes seulement si chaque carte garde au moins 220 px;
- aucune information essentielle uniquement sur hover;
- sur tactile, play, favori et menu sont toujours visibles;
- tags restent caches par defaut comme demande par le design, mais accessibles
  via le menu/detail;
- supprimer `hover:scale` sur `hover: none`.

Vue liste:

- ne pas forcer le tableau desktop dans le viewport;
- compact: transformer chaque `TrackRow` en ligne mobile a deux niveaux:
  miniature + titre + menu, puis Key/BPM/duree/confiance;
- masquer le `ListHeader` desktop sur compact;
- play/pause, favori et menu sont toujours visibles;
- conserver les colonnes actuelles uniquement sur `lg+`.

Mini-player:

- compact: barre au-dessus de la navigation mobile;
- ligne 1: miniature, titre, Key/BPM, play, fermeture;
- waveform et lien Player peuvent etre sur une seconde ligne ou accessibles par
  expansion;
- prendre en compte `safe-area-inset-bottom` et la hauteur de nav;
- le contenu de la bibliotheque reserve sa hauteur exacte;
- eviter deux instances audio concurrentes lors de la rotation ou du
  changement de layout.

Modale de correction:

- bottom sheet sur compact, dialogue centre sur `md+`;
- `max-height` base sur `dvh`, contenu scrollable;
- actions sticky en bas;
- champs et alternatives utilisables avec clavier ouvert.

Menus Track:

- mutualiser la logique entre `TrackCard` et `TrackRow` si possible;
- rendu bottom sheet sur compact;
- confirmation de suppression explicite;
- zones playlist/tags scrollables.

### 6.5 Discovery

Fichiers principaux:

- `frontend/src/components/discovery-view.tsx`

Compact:

- padding 16 px;
- formulaire de recherche empile, CTA pleine largeur;
- grille a une colonne par defaut;
- deux colonnes uniquement quand chaque carte dispose d'une largeur utile
  d'environ 180-200 px;
- action YouTube toujours visible au tactile;
- retirer l'effet `hover:scale` sur tactile;
- boutons Import et etats associes >= 44 px;
- tabs de playlists horizontalement scrollables avec gradient/fade indiquant
  le debordement;
- banner API et etats vides en composition verticale.

Medium/Desktop:

- conserver l'augmentation progressive a 3/4/5 colonnes, en validant la largeur
  reelle des cartes;
- ne pas passer automatiquement a deux colonnes a 320 px.

### 6.6 Settings

Fichiers principaux:

- `frontend/src/components/settings-view.tsx`

Compact:

- header 30-34 px et padding 16 px;
- panneaux a padding 16-18 px;
- `SettingRow` empile label, description et controle par defaut;
- autoriser une ligne horizontale seulement pour un petit toggle;
- segmented controls en largeur complete, wrap ou scroll horizontal explicite;
- preset selector repliable ou remplace par `select`/sheet si plusieurs presets;
- slider hue en largeur flexible au lieu de 160 px fixe;
- apercu des 12 tonalites en grille adaptee;
- boutons Save/Update/Delete repliables et CTA destructif separe;
- champ playlist + Add empiles sous 480 px;
- URL avec `overflow-wrap:anywhere`, suppression toujours visible.

Medium/Desktop:

- les lignes simples peuvent revenir a l'horizontale;
- conserver la largeur maximale actuelle pour la lisibilite.

### 6.7 Overlays et etats globaux

Fichiers principaux:

- `frontend/src/components/transition-overlay.tsx`
- `frontend/src/components/aurora.tsx`
- composants Loading/Empty de chaque vue

Implementation:

- transition Home -> Player dimensionnee avec `min(160px, 42vw)`;
- titre sur deux lignes maximum plutot qu'une troncature prematuree;
- animation reduite sous `prefers-reduced-motion`;
- aurora moins couteuse sur compact et en mode economie de mouvement;
- tous les etats vides gardent une action accessible et ne sont pas caches par
  les barres fixes.

## 7. Strategie d'implementation

### Lot 1 - Fondations

Proprietaire conseille: agent "shell/design system".

- ajouter tokens responsive, safe areas, `dvh`, motion et touch;
- creer le shell adaptatif;
- transformer la navigation en rail desktop + bottom nav mobile;
- standardiser les tailles tactiles;
- adapter AuthGate et deconnexion;
- ajouter tests de navigation.

Critere de sortie: toutes les routes sont navigables a 320 px sans overflow
horizontal, meme avant adaptation fine de leur contenu.

### Lot 2 - Home et Discovery

Proprietaire conseille: agent "entry/discovery".

- adapter Home, QueueRow et TransitionOverlay;
- adapter Discovery, cards, recherche, tabs et etats;
- verifier FR et EN;
- ajouter tests composants/E2E des formulaires tactiles.

Depend de Lot 1.

### Lot 3 - Player

Proprietaire conseille: agent "player".

- composition colonne/ligne responsive;
- artwork, readouts, waveform et download;
- etats empty/loading;
- rotation et changement de viewport sans perte de controle audio.

Depend de Lot 1. Peut avancer en parallele des Lots 2 et 4.

### Lot 4 - Library

Proprietaire conseille: agent "library".

- drawer mobile des sections/playlists;
- toolbar responsive;
- cartes et lignes tactiles;
- mini-player mobile;
- menus/bottom sheets;
- correction modal.

Depend de Lot 1. C'est le lot le plus risque et doit etre subdivise en PRs
coherentes si necessaire.

### Lot 5 - Settings et durcissement

Proprietaire conseille: agent "settings/QA".

- adapter toutes les sections Settings;
- unifier les overlays restants;
- audit i18n, focus, reduced motion, light theme;
- matrice Playwright et correction des regressions.

Depend de Lot 1; l'audit final depend des autres lots.

## 8. Regles de collaboration pour les agents

- Ne pas modifier les contrats API ni le modele de donnees pour cette feature.
- Ne pas remplacer les tokens `--kf-*` par des couleurs ponctuelles.
- Ne pas dupliquer un composant uniquement pour mobile sauf si les structures
  semantiques sont reellement incompatibles.
- Garder l'etat metier commun entre rendus desktop et mobile.
- Chaque PR doit inclure les etats loading, empty, error et donnees longues.
- Toute nouvelle chaine visible doit etre ajoutee en FR et EN.
- Ne pas introduire de detection `window.innerWidth` pour rendre la structure
  principale. Utiliser CSS; reserver JS aux comportements qui l'exigent
  reellement, comme le type de portal d'un overlay.
- Ne pas masquer une fonction pour faire tenir l'interface.
- Ne pas accepter un scroll horizontal de page comme solution. Un carrousel ou
  une liste de chips peut scroller horizontalement si ce comportement est
  explicite et local.

## 9. Tests et verification

### Automatisation

Ajouter Playwright au frontend si absent et couvrir:

1. navigation mobile entre les quatre routes;
2. Home: saisie URL, erreur, submit, queue et retry;
3. Player: lecture/pause, seek, choix du format et retour;
4. Library cartes: play, favori, menu, playlist, correction;
5. Library liste mobile: memes actions;
6. mini-player au-dessus de la bottom nav;
7. Discovery: recherche, changement playlist, import;
8. Settings: modification de chaque famille de controles;
9. ouverture/fermeture des bottom sheets et restauration du focus;
10. FR/EN et dark/light sur au moins une largeur compact et une expanded.

Configurer des projets ou tests parametres pour:

- 320 x 568;
- 390 x 844;
- 430 x 932;
- 768 x 1024;
- 1024 x 768;
- 1440 x 900.

### Verification visuelle

Pour chaque page:

- aucune barre horizontale au niveau document;
- aucun contenu sous la bottom nav, le mini-player ou les safe areas;
- clavier ouvert: champ et CTA actifs restent visibles;
- portrait et paysage;
- textes FR plus longs;
- titres, tags, playlists et URL exceptionnellement longs;
- zero, une, beaucoup de cartes;
- hover desktop, clavier et tactile;
- dark et light;
- reduced motion.

### Qualite technique

Commandes minimales:

```bash
cd frontend
npm run lint
npm run build
npx playwright test
```

Surveiller egalement:

- erreurs console et hydration;
- une seule zone de scroll principale par vue;
- reinitialisation involontaire de l'audio apres changement de layout;
- cout GPU des blur/aurora sur mobile;
- score Lighthouse mobile, notamment CLS et accessibilite.

## 10. Definition of Done

La feature est terminee lorsque:

- toutes les fonctions sont utilisables a partir de 320 px;
- aucune route n'a d'overflow horizontal de document;
- la navigation mobile, les overlays et les mini-players respectent les safe
  areas;
- aucune action essentielle ne depend du hover;
- les cibles tactiles principales font au moins 44 px;
- Home, Player, Library, Discovery, Settings et Auth ont des compositions
  adaptees aux trois classes de viewport;
- dark/light et FR/EN sont verifies;
- reduced motion est respecte;
- lint, build et tests Playwright passent;
- la direction artistique glass/mood reste reconnaissable et coherente avec le
  handoff desktop.

## 11. Hors scope

- refonte de la direction artistique;
- changement des algorithmes BPM/key ou de l'API;
- nouvelle fonctionnalite metier;
- application native;
- refonte de contenu ou rebranding;
- virtualisation de la bibliotheque, sauf si elle devient indispensable pour
  corriger une regression de performance introduite par le responsive.
