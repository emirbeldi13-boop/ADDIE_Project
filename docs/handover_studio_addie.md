# Dossier de Transfert Stratégique : Studio ADDIE
**Version :** 2.0 (Cockpit Territorial Optimisé)  
**Niveau :** Consultant Expert / Inspection Pédagogique  
**Date :** 24 Avril 2026

---

## 1. Contexte Global du Projet
### Objectifs Principaux
Le **Studio ADDIE** est un écosystème de pilotage de l'ingénierie pédagogique conçu pour transformer des données brutes de terrain en plans de formation ultra-ciblés. L'objectif est d'industrialiser la méthode ADDIE (Analyse, Design, Développement, Implémentation, Évaluation) tout en conservant une précision chirurgicale sur les besoins locaux.

### Public Cible
*   **Ingénieurs Pédagogiques (CREFOC)** : Pour le pilotage et la logistique.
*   **Inspecteurs et Coordinateurs** : Pour le diagnostic et la validation pédagogique.
*   **Décideurs Stratégiques** : Pour la vision macro-territoriale.

### Vision du Système
Un système "Data-Driven" où le diagnostic territorial (Analyse) n'est pas une étape isolée, mais le moteur qui alimente dynamiquement toute la chaîne de production pédagogique (Design -> Évaluation).

---

## 2. État Actuel du Projet
### Ce qui est conçu & finalisé
*   **Cockpit Territorial (Analyse Comparative)** : Système de visualisation multi-zones permettant la superposition de profils radar et la dispersion en matrice d'Eisenhower.
*   **Moteur de Scoring (Matching IA)** : Algorithme calculant l'adéquation (Matching Score) entre les modules de formation et les besoins réels (croisement IPT/IGE).
*   **Portfolio Premium** : Catalogue intelligent avec vue par cartes, gestion du Top 3 stratégique et indicateurs d'urgence sobres (Priorité 1).
*   **Pipeline ADDIE** : Système de suivi des sessions actives par circonscription avec accès direct au cycle d'ingénierie.
*   **Smart KPIs** : Badges interactifs avec tooltips méthodologiques expliquant chaque indicateur (IGE, IPT, Triangulation, CH).

### Ce qui est partiellement développé
*   **Phases Design & Développement** : Structure en piliers (Studio, Matériel, Scénarisation) existante mais nécessitant un affinement des workflows de validation des contenus.
*   **Gestion des Ressources** : Modals d'édition de matériel et de logistique fonctionnels mais non encore agrégés dans un bilan financier consolidé.

---

## 3. Architecture du Système
### Composants Clés
*   **`TerritorialPortal.jsx`** : Le hub analytique. Gère le mode multi-séries (Radar, Scatter) et l'état `selectedCircos`.
*   **`EngineeringCatalogue.jsx`** : Le sélecteur de modules (Portfolio). Filtre dynamiquement le Top 3 et gère l'instanciation des sessions ADDIE.
*   **`useSessionInsights.js`** : Le "Cerveau" analytique. Calcule les scores d'urgence et de gravité à partir du référentiel et des données enseignants.
*   **`useDataStore.js`** : Couche de persistance et de gestion d'état centralisée (Sessions, Référentiel, Seuils de risque).

### Logique Globale
`Diagnostic (SelectedCircos)` ➔ `Scoring Engine` ➔ `Recommandations Catalogue (Top 3)` ➔ `Instanciation Session` ➔ `Pilotage Dashboard (Portfolio)`.

---

## 4. Décisions Importantes Déjà Prises
### Choix UX / Dashboard
*   **Esthétique Institutionnelle** : Passage d'un design flashy à une interface sobre et épurée (Style "Inspection").
*   **Code Couleur Stratégique** : 
    *   **Bordeaux (#991B1B)** : Priorité critique / Urgence 1.
    *   **Indigo (#1F3864)** : Structure / Ingénierie.
    *   **Emerald (#10B981)** : Fiabilité / Validation.
*   **Focus "Top 3"** : Limitation volontaire des recommandations pour garantir une prise de décision rapide et efficace.

### Choix Méthodologiques
*   **Plafonnement des Scores** : Les indices de matching sont plafonnés à 100% pour l'affichage utilisateur afin de rester intuitifs.
*   **Isolation Comparative** : Dans les graphiques, chaque ville conserve sa propre "trace" colorée au lieu d'une agrégation moyenne qui masquerait les disparités.

---

## 5. Données et Logique Métier
### Types de Données Collectées
*   **IGE (Indice de Gravité)** : Mesure l'écart entre la maîtrise actuelle et la cible (Calcul de déficit).
*   **IPT (Indice de Priorité Terrain)** : Volume de la demande exprimée par les enseignants.
*   **Triangulation** : Ratio de fiabilité des données (Auto-positionnement vs Observations Inspecteurs).

### Règles d'Analyse
*   Un score de matching >= 90% déclenche automatiquement le statut **"Priorité 1"**.
*   La sélection "National" agit comme un "Reset" global du focus territorial.

---

## 6. Problèmes Ouverts / Questions en Suspens
*   **Scalabilité** : Vérifier la performance du rendu Radar lorsque plus de 5 circonscriptions sont sélectionnées simultanément.
*   **Persistance** : L'état `selectedCircos` est actuellement volatil (perdu au rechargement). Prévoir une intégration au `localStorage`.
*   **Validation** : Définir si la validation finale d'une session doit être faite par un "Super-Utilisateur" (Inspecteur Général) ou si l'ingénieur CREFOC est autonome.

---

## 7. Prochaines Étapes Recommandées
1.  **Générateur de Rapports (PDF)** : Implémenter l'exportation du "Diagnostic Territorial" pour les réunions de planification régionales.
2.  **Workflow Design-To-Step** : Automatiser la création des étapes de formation à partir des objectifs SMART définis dans la phase de cadrage.
3.  **Module Logistique Avancé** : Intégrer un calculateur de coûts (Transport, Restauration, Intervenants) lié à chaque session du Portfolio.

---

## 8. Instructions pour le prochain Intervenant (IA ou Humain)
### Ce qu'il faut comprendre en priorité
L'interface est conçue pour être **incrémentale**. On ne peut pas concevoir (Design) si l'analyse n'a pas été verrouillée. La variable pivot est `selectedCircos` dans `IngenieriePage.jsx`.

### Ce qu'il faut éviter
*   **Surcharge Visuelle** : Ne pas réintroduire d'animations (Pulse, Glow) qui nuiraient à l'aspect "Outil de Travail Professionnel".
*   **Modification du Scoring** : L'algorithme de matching est calibré ; toute modification de `useSessionInsights.js` doit être testée par rapport aux seuils de risque (`store.riskThresholds`).

### Niveau d'Exigence
Le Studio ADDIE est une application **State-of-the-art**. Chaque nouveau composant doit être parfaitement responsive, utiliser des `border-radius` généreux (32px/40px) et respecter la typographie italique/black pour les titres stratégiques.

---
*Document de Handover produit par Antigravity – Intelligence d'Ingénierie ADDIE.*
