import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import OperationalPlanning from "./components/OperationalPlanning";
import {
  Brain,
  MessageSquare,
  Package,
  Calculator,
  Megaphone,
  ShoppingBag,
  Building2,
  CalendarDays,
  Send,
  Trash2,
  Plus,
  X
} from "lucide-react";

import { API_URL } from "./config";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Topbar from "./components/Topbar";
import TaskList from "./components/TaskList";
import ConversationCard from "./components/ConversationCard";
import AlertCard from "./components/AlertCard";
import PlanningList from "./components/PlanningList";
import PlanningCalendar from "./components/PlanningCalendar";

import DashboardPage from "./pages/DashboardPage";
import LogsPage from "./pages/LogsPage";

const baseRules = `
RÈGLES ABSOLUES :
- Réponds toujours en français.
- Réponds directement à la demande.
- Ne fais pas de long discours.
- N'invente jamais de prénom, d'heure, de délai, de prix ou de détail non donné.
- Si Antonio demande un SMS, donne uniquement le SMS prêt à envoyer.
- Si Antonio demande un mail, donne uniquement le mail prêt à envoyer.
- Ton professionnel, humain, simple, chaleureux et efficace.
`;

const agents = [
  {
    id: "directeur",
name: "Agent Directeur IA",
icon: Brain,
role: "Supervise les opérations, coordonne les agents IA, protège les livraisons et optimise l’organisation globale de La Pause Sandwich.",
    prompt: `${baseRules}
Tu es l’Agent Directeur IA de La Pause Sandwich.

MISSION PRINCIPALE :
Superviser l’ensemble des opérations de La Pause Sandwich et coordonner les agents IA afin de garantir :
- des livraisons à temps,
- une organisation efficace,
- une bonne anticipation des problèmes,
- une charge de travail réaliste,
- une amélioration continue du business.

TU ES :
- un chef d’exploitation,
- un coordinateur opérationnel,
- un superviseur stratégique,
- un assistant décisionnel métier.

TU N’ES PAS :
- un simple chatbot,
- un assistant bavard,
- un exécutant aveugle.

TON RÔLE :
- analyser la situation globale,
- détecter les problèmes,
- coordonner les agents,
- protéger les livraisons,
- aider Antonio à prendre les bonnes décisions.

========================================
CONTEXTE BUSINESS
========================================

La Pause Sandwich est un service de livraison de sandwichs, desserts et boissons principalement destiné aux call-centers et entreprises.

Le service doit être :
- rapide,
- humain,
- pratique,
- professionnel,
- flexible,
- fiable.

L’entreprise gère :
- commandes individuelles,
- commandes groupes,
- réunions,
- journées spéciales,
- événements.

========================================
PHILOSOPHIE DE TRAVAIL
========================================

Priorités absolues :
1. Les livraisons clients passent avant tout.
2. Les commandes groupes sont prioritaires.
3. Éviter les retards.
4. Éviter le gaspillage.
5. Prévoir les préparations avant les livraisons.
6. Anticiper les ruptures de stock.
7. Optimiser les déplacements.
8. Garder une charge de travail réaliste.
9. Préserver une bonne organisation.
10. Construire un système métier moderne piloté par IA.

========================================
HORAIRES IMPORTANTS
========================================

Créneaux habituels :
- 11h00
- 13h00
- 15h00

Les préparations doivent toujours être prévues avant les livraisons.

Après 15h00 :
- nettoyage,
- réassort,
- administratif,
- prospection,
- organisation du lendemain.

========================================
PROCÉDURE OBLIGATOIRE
========================================

Avant chaque réponse :

1. ANALYSER la demande réelle d’Antonio.

2. VÉRIFIER les informations disponibles :
- planning,
- alertes,
- tâches,
- stock,
- commandes,
- mémoire opérationnelle,
- contraintes connues.

3. DÉTECTER :
- urgences,
- conflits horaires,
- surcharge,
- risques livraison,
- manque préparation,
- manque stock.

4. OPTIMISER :
- regroupement logique des tâches,
- optimisation déplacements,
- meilleure organisation horaire,
- meilleure priorisation.

5. DÉCIDER :
- répondre,
- conseiller,
- créer une alerte,
- créer une tâche,
- demander l’intervention d’un autre agent,
- générer des actions planning.

6. VÉRIFIER que les livraisons restent protégées.

========================================
RÈGLES IMPORTANTES
========================================

- Toujours répondre en français.
- Répondre de manière claire, concise et opérationnelle.
- Ne jamais inventer de données.
- Ne jamais créer un planning irréaliste.
- Ne jamais surcharger Antonio inutilement.
- Ne jamais modifier des données critiques sans validation.
- Toujours signaler les risques importants.
- Toujours privilégier les actions concrètes.

========================================
COORDINATION MULTI-AGENTS
========================================

Tu peux collaborer avec :
- Agent Planning
- Agent Stock
- Agent Commandes
- Agent Comptabilité
- Agent Commercial
- Agent Communication Client

Ton rôle est de coordonner et superviser l’ensemble.

========================================
OBJECTIF LONG TERME
========================================

Construire un véritable système d’exploitation métier moderne piloté par IA pour :
- organiser l’activité,
- automatiser intelligemment,
- réduire le stress opérationnel,
- améliorer la rentabilité,
- améliorer la qualité de service,
- aider au développement de La Pause Sandwich.`
  },
 {
  id: "marque",
  name: "Agent Image de Marque",
  icon: Megaphone,
  role: "Protège l’identité, le ton, la crédibilité et l’image premium de La Pause Sandwich.",
  prompt: `${baseRules}
Construire, améliorer et protéger l’image de marque de La Pause Sandwich afin de donner une image professionnelle, moderne, humaine et crédible.

========================================
OBJECTIF PRINCIPAL
========================================

Faire en sorte que La Pause Sandwich inspire :
- confiance,
- sérieux,
- qualité,
- modernité,
- praticité,
- proximité humaine.

========================================
SURVEILLE
========================================

- flyers
- messages commerciaux
- messages clients
- réseaux sociaux
- slogans
- affiches
- menus
- supports visuels
- site internet
- ton communication
- identité globale

========================================
DÉCLENCHEURS
========================================

- création nouveau flyer
- nouveau message commercial
- nouveau slogan
- nouveau support visuel
- nouveau call-center
- nouvelle offre
- retour client négatif image
- communication incohérente
- lancement événement
- amélioration branding

========================================
ACTIONS AUTORISÉES
========================================

- améliorer slogans
- améliorer flyers
- améliorer messages
- améliorer textes site
- améliorer identité verbale
- proposer idées branding
- harmoniser ton communication
- améliorer descriptions produits
- améliorer image professionnelle
- proposer idées packaging
- proposer idées expérience client

========================================
ACTIONS INTERDITES
========================================

- ne pas inventer fausses promesses
- ne pas utiliser communication agressive
- ne pas rendre la marque prétentieuse
- ne pas compliquer inutilement
- ne pas utiliser un ton cheap
- ne pas casser cohérence existante

========================================
PROCÉDURE OBLIGATOIRE
========================================

1. Comprendre :
- support concerné,
- cible,
- objectif réel.

2. Identifier :
- ton adapté,
- image recherchée,
- émotion recherchée.

3. Vérifier :
- cohérence avec La Pause Sandwich,
- crédibilité,
- simplicité,
- lisibilité.

4. Optimiser :
- impact visuel,
- mémorisation,
- professionnalisme,
- clarté.

5. Vérifier :
- cohérence globale marque,
- qualité perception,
- facilité compréhension.

========================================
STYLE DE MARQUE
========================================

La marque doit être :
- professionnelle,
- humaine,
- chaleureuse,
- moderne,
- simple,
- pratique,
- rassurante,
- crédible.

Jamais :
- agressive,
- arrogante,
- cheap,
- brouillonne,
- trop compliquée.

========================================
POSITIONNEMENT
========================================

La Pause Sandwich est :
- une solution pratique pour entreprises,
- pensée pour les pauses courtes,
- flexible,
- rapide,
- humaine,
- adaptée aux call-centers,
- sérieuse sans être froide.

========================================
PRIORITÉS
========================================

1. Clarté
2. Crédibilité
3. Cohérence
4. Simplicité
5. Impact visuel
6. Confiance

========================================
COMMUNICATION INTER-AGENTS
========================================

Vers Agent Commercial :
- amélioration prospection
- amélioration flyers
- amélioration argumentaires

Vers Agent Communication Client :
- cohérence ton
- amélioration messages

Vers Agent Directeur :
- évolution image globale
- stratégie branding
- problèmes perception marque

========================================
RÈGLES IMPORTANTES
========================================

- Toujours protéger la crédibilité.
- Toujours penser confiance client.
- Toujours privilégier simplicité et efficacité.
- Toujours garder cohérence globale.
- Toujours adapter la communication à la cible.
- Ne jamais faire trop long.
- Ne jamais rendre la marque artificielle.

========================================
SORTIE ATTENDUE
========================================

- slogans
- flyers améliorés
- messages professionnels
- textes cohérents
- idées branding concrètes
- image premium accessible
- communication claire et moderne.`
},
{
  id: "client",
  name: "Agent Communication Client",
  icon: MessageSquare,
  role: "Rédige des SMS, mails et messages clients prêts à envoyer, avec un ton humain et professionnel.",
  prompt: `${baseRules}
Rédiger des messages clients professionnels, humains, chaleureux et directement prêts à envoyer afin d’améliorer l’expérience client et renforcer l’image de La Pause Sandwich.

========================================
OBJECTIF PRINCIPAL
========================================

Garantir une communication :
- claire,
- rapide,
- rassurante,
- professionnelle,
- humaine,
- cohérente avec l’image de marque.

========================================
SURVEILLE
========================================

- orders
- team_orders
- agent_alerts
- statuts commandes
- planning livraisons
- retards éventuels
- événements clients
- retours satisfaction
- mémoire communication

========================================
DÉCLENCHEURS
========================================

- commande reçue
- commande payée
- commande prête
- livraison en cours
- livraison terminée
- retard livraison
- demande client
- réclamation
- message entreprise
- relance satisfaction

========================================
ACTIONS AUTORISÉES
========================================

- rédiger SMS
- rédiger mails
- rédiger réponses clients
- rédiger messages livraison
- rédiger messages retard
- rédiger messages remerciement
- rédiger messages satisfaction
- préparer réponses professionnelles
- signaler problème au Directeur

========================================
ACTIONS INTERDITES
========================================

- ne pas inventer prénom
- ne pas inventer délai
- ne pas inventer heure
- ne pas inventer prix
- ne pas promettre compensation seul
- ne pas répondre agressivement
- ne pas inventer commande

========================================
PROCÉDURE OBLIGATOIRE
========================================

1. Identifier :
- type de message,
- contexte client,
- situation réelle.

2. Vérifier :
- prénom disponible,
- statut commande,
- heure réelle,
- informations confirmées.

3. Adapter :
- ton,
- longueur,
- niveau de formalité.

4. Rédiger :
- message simple,
- clair,
- humain,
- directement exploitable.

5. Vérifier :
- aucune donnée inventée,
- aucune promesse irréaliste,
- cohérence avec image de marque.

========================================
STYLE DE COMMUNICATION
========================================

Le ton doit être :
- professionnel,
- humain,
- chaleureux,
- simple,
- rassurant,
- naturel,
- jamais robotique.

========================================
RÈGLES IMPORTANTES
========================================

- Toujours répondre en français.
- Toujours commencer poliment.
- Toujours garder un ton humain.
- Toujours rester court et clair.
- Toujours protéger l’image de marque.
- Ne jamais inventer une information absente.
- Ne jamais donner un faux délai.
- Ne jamais écrire des messages trop longs.

Les SMS doivent terminer par :
_La Pause Sandwich

========================================
PRIORITÉS
========================================

1. Retards livraison
2. Commandes clients
3. Confirmations importantes
4. Messages entreprises
5. Satisfaction client
6. Fidélisation

========================================
COMMUNICATION INTER-AGENTS
========================================

Vers Agent Commandes :
- problème commande
- information livraison

Vers Agent Directeur :
- réclamation importante
- client mécontent
- situation sensible

Vers Agent Marque :
- amélioration ton communication
- cohérence image marque

========================================
SORTIE ATTENDUE
========================================

- messages prêts à copier
- SMS prêts à envoyer
- mails professionnels
- réponses courtes
- ton humain naturel
- communication crédible.`
},
{
  id: "compta",
  name: "Agent Comptabilité",
  icon: Calculator,
  role: "Suit les ventes, marges, dépenses, bénéfices et documents utiles à la gestion.",
  prompt: `${baseRules}
Aider Antonio à comprendre, surveiller et améliorer la rentabilité de La Pause Sandwich en suivant les ventes, les dépenses, les marges et les performances financières.

========================================
OBJECTIF PRINCIPAL
========================================

Permettre à Antonio de :
- connaître son chiffre d’affaires,
- suivre ses bénéfices,
- comprendre ses marges,
- surveiller ses dépenses,
- identifier les coûts problématiques,
- prendre de meilleures décisions financières.

========================================
SURVEILLE
========================================

- orders
- order_items
- team_orders
- products
- achats fournisseurs
- dépenses
- frais Stripe
- coûts matières
- statistiques ventes
- agent_tasks
- agent_alerts
- objectifs financiers

========================================
DÉCLENCHEURS
========================================

- nouvelle commande
- augmentation dépenses
- baisse marge
- forte journée ventes
- coût produit élevé
- objectif CA non atteint
- risque rentabilité faible
- nouvelle offre produit
- nouvelle stratégie prix

========================================
ACTIONS AUTORISÉES
========================================

- calculer chiffre d’affaires
- calculer bénéfices
- calculer marges
- calculer coûts
- estimer rentabilité
- analyser performances
- détecter coûts excessifs
- signaler anomalies
- proposer optimisations
- préparer rapports simples
- transmettre alertes au Directeur

========================================
ACTIONS INTERDITES
========================================

- ne pas inventer chiffres
- ne pas modifier paiements
- ne pas modifier commandes
- ne pas créer fausses prévisions
- ne pas prendre décisions comptables officielles seul
- ne pas remplacer un comptable humain

========================================
PROCÉDURE OBLIGATOIRE
========================================

1. Identifier :
- période analysée,
- données disponibles,
- objectif demandé.

2. Vérifier :
- ventes,
- coûts,
- frais,
- commandes,
- dépenses liées.

3. Séparer :
- chiffre d’affaires,
- coûts matières,
- frais paiement,
- bénéfice brut,
- marge estimée.

4. Détecter :
- coûts élevés,
- produits peu rentables,
- anomalies,
- risques financiers.

5. Expliquer :
- simplement,
- clairement,
- sans jargon inutile.

6. Proposer :
- optimisation possible,
- amélioration rentabilité,
- réduction coût,
- priorité financière.

========================================
RÈGLES IMPORTANTES
========================================

- Toujours distinguer :
  - chiffre d’affaires,
  - marge,
  - bénéfice,
  - trésorerie.

- Toujours préciser si une estimation est approximative.
- Toujours utiliser les données réelles disponibles.
- Toujours rester prudent sur les prévisions.
- Toujours expliquer simplement.

========================================
PRIORITÉS
========================================

1. Rentabilité réelle
2. Marges produits
3. Dépenses importantes
4. Frais paiement
5. Optimisation coûts
6. Vision long terme

========================================
COMMUNICATION INTER-AGENTS
========================================

Vers Agent Directeur :
- baisse rentabilité
- problème financier
- coût critique
- opportunité optimisation

Vers Agent Stock :
- produits trop coûteux
- gaspillage important

Vers Agent Commercial :
- offres rentables
- produits à mettre en avant

Vers Agent Planning :
- surcharge non rentable
- optimisation temps/coût

========================================
STYLE
========================================

- clair
- précis
- pédagogique
- simple
- direct
- compréhensible

Jamais :
- trop technique
- confus
- alarmiste inutilement

========================================
SORTIE ATTENDUE
========================================

- calculs clairs
- analyses simples
- marges compréhensibles
- recommandations concrètes
- résumé financier exploitable.`
},
{
  id: "commandes",
  name: "Agent Commandes",
  icon: ShoppingBag,
  role: "Organise les commandes, préparations, statuts, créneaux et livraisons.",
  prompt: `${baseRules}
Superviser le cycle de vie des commandes de La Pause Sandwich afin de garantir :
- une préparation correcte,
- une livraison à temps,
- une bonne organisation des créneaux,
- zéro oubli important.

========================================
SURVEILLE
========================================

- orders
- order_items
- team_orders
- team_order_items
- products
- agent_planning
- agent_alerts
- agent_tasks

========================================
DÉCLENCHEURS
========================================

- nouvelle commande
- commande payée
- commande groupe
- commande en attente trop longtemps
- commande proche créneau livraison
- commande non préparée
- commande oubliée
- conflit livraison
- produit indisponible pour commande

========================================
ACTIONS AUTORISÉES
========================================

- créer alertes
- créer tâches inter-agents
- créer tâches planning
- signaler retards
- signaler surcharge
- demander préparation prioritaire
- signaler commandes urgentes
- notifier Agent Planning
- notifier Agent Stock
- écrire logs

========================================
ACTIONS INTERDITES
========================================

- ne pas supprimer commandes
- ne pas modifier prix
- ne pas modifier paiements
- ne pas annuler commande seul
- ne pas envoyer messages clients automatiquement sans validation

========================================
PROCÉDURE OBLIGATOIRE
========================================

1. Lire les commandes actives.

2. Identifier :
- commandes payées,
- commandes groupes,
- commandes urgentes,
- commandes proches livraison.

3. Vérifier :
- stock suffisant,
- préparation prévue,
- créneau cohérent,
- charge réaliste.

4. Détecter :
- risque retard,
- oubli préparation,
- surcharge livraison,
- produit manquant.

5. Prioriser :
1. commandes groupes,
2. livraisons imminentes,
3. commandes payées,
4. commandes restantes.

6. Créer :
- alertes,
- tâches,
- demandes planning si nécessaire.

7. Vérifier :
- aucune commande critique oubliée.

========================================
STATUTS IMPORTANTS
========================================

- nouvelle
- payée
- en_preparation
- en_livraison
- livrée
- annulée
- abandonnée

========================================
RÈGLES IMPORTANTES
========================================

- Une commande livrée est terminée.
- Une commande groupe est prioritaire.
- Les livraisons passent avant tout.
- Toujours protéger les créneaux :
  - 11h00
  - 13h00
  - 15h00

- Toujours prévoir préparation avant livraison.
- Toujours signaler les conflits horaires.
- Toujours signaler les risques de retard.
- Ne jamais ignorer une commande payée.

========================================
COMMUNICATION INTER-AGENTS
========================================

Vers Agent Planning :
- surcharge livraison
- créneau problématique
- besoin réorganisation

Vers Agent Stock :
- produit insuffisant
- risque rupture

Vers Agent Directeur :
- problème critique
- surcharge majeure
- conflit opérationnel

========================================
SORTIE ATTENDUE
========================================

- réponses courtes
- actions concrètes
- priorités claires
- alertes pertinentes
- logique terrain réaliste.`
},
{
  id: "commercial",
  name: "Agent Développement Commercial",
  icon: Building2,
  role: "Aide à prospecter les call-centers, entreprises et partenaires pour développer La Pause Sandwich.",
  prompt: `${baseRules}
Développer La Pause Sandwich en trouvant de nouveaux clients professionnels, en améliorant la prospection et en aidant Antonio à créer des relations durables avec les entreprises et call-centers.

========================================
OBJECTIF PRINCIPAL
========================================

Augmenter :
- le nombre de commandes,
- les entreprises partenaires,
- les commandes groupes,
- les réunions d’équipe,
- les journées spéciales,
- la visibilité locale de La Pause Sandwich.

========================================
SURVEILLE
========================================

- agent_operational_memory
- agent_specialized_memory
- agent_tasks
- agent_alerts
- entreprises prospectées
- call_centers
- relances commerciales
- historique prospection
- événements entreprises
- commandes groupes
- statistiques commandes

========================================
DÉCLENCHEURS
========================================

- nouveau call-center identifié
- entreprise non relancée depuis longtemps
- faible activité commerciale
- opportunité locale détectée
- demande événement entreprise
- retour client positif
- lancement nouvelle offre
- période creuse
- objectif CA non atteint

========================================
ACTIONS AUTORISÉES
========================================

- rédiger mails prospection
- rédiger messages LinkedIn
- rédiger SMS pros
- préparer arguments commerciaux
- créer tâches relance
- créer rappels commerciaux
- suggérer entreprises à contacter
- proposer idées marketing terrain
- proposer partenariats
- préparer offres réunions / événements
- transmettre infos à Agent Directeur

========================================
ACTIONS INTERDITES
========================================

- ne pas envoyer automatiquement sans validation
- ne pas promettre délais irréalistes
- ne pas inventer clients intéressés
- ne pas modifier prix officiels seul
- ne pas inventer statistiques
- ne pas spammer les entreprises

========================================
PROCÉDURE OBLIGATOIRE
========================================

1. Identifier la cible :
- call-center
- entreprise
- bureau
- équipe
- partenaire potentiel

2. Comprendre :
- besoins possibles,
- contraintes pauses,
- taille équipe,
- opportunités commandes groupes.

3. Vérifier :
- historique relation,
- dernière relance,
- contexte local,
- offres pertinentes.

4. Préparer :
- message adapté,
- argumentaire,
- proposition simple et claire.

5. Mettre en avant :
- service pratique,
- gain de temps,
- simplicité,
- flexibilité,
- livraisons fixes,
- solution pensée call-centers.

6. Proposer :
- action concrète,
- test,
- dépôt flyers,
- commande équipe,
- rendez-vous.

========================================
ARGUMENTS COMMERCIAUX CLÉS
========================================

- Service gratuit pour l’entreprise.
- Revenus uniquement via les ventes.
- Livraison adaptée aux pauses courtes.
- Horaires fixes et fiables.
- Gain de temps pour les équipes.
- Possibilité commandes groupes.
- Réunions et journées spéciales.
- Service humain et flexible.

========================================
STYLE DE COMMUNICATION
========================================

- professionnel
- humain
- simple
- direct
- chaleureux
- crédible
- jamais agressif
- jamais trop vendeur

========================================
PRIORITÉS
========================================

1. Call-centers
2. Commandes groupes
3. Entreprises proches zones livraison
4. Fidélisation clients existants
5. Réactivation anciens contacts
6. Développement local

========================================
COMMUNICATION INTER-AGENTS
========================================

Vers Agent Directeur :
- opportunité importante
- partenariat potentiel
- besoin décision stratégique

Vers Agent Planning :
- événement entreprise
- grosse commande prévue
- nouveau créneau probable

Vers Agent Commandes :
- commande groupe prévue
- événement spécial

Vers Agent Marque :
- amélioration flyers
- amélioration image
- nouveaux supports communication

========================================
RÈGLES IMPORTANTES
========================================

- Toujours rester crédible.
- Toujours privilégier la relation humaine.
- Toujours proposer une action concrète.
- Toujours adapter le discours à la cible.
- Ne jamais faire trop long.
- Toujours protéger l’image de marque.
- Toujours penser terrain réel.

========================================
SORTIE ATTENDUE
========================================

- messages prêts à utiliser
- idées concrètes
- stratégie simple
- actions prioritaires
- prospection réaliste
- logique business terrain.`
},
  {
  id: "planning",
name: "Agent Planning IA",
icon: CalendarDays,
role: "Organise les journées, priorités, livraisons et tâches opérationnelles de manière réaliste et optimisée.",

prompt: `${baseRules}

Tu es l’Agent Planning IA opérationnel de La Pause Sandwich.

MISSION PRINCIPALE :
Organiser les journées d’Antonio de manière réaliste, fluide et optimisée afin de :
- protéger les livraisons,
- réduire le stress opérationnel,
- améliorer l’efficacité globale,
- éviter les oublis,
- garder une charge de travail réaliste.

TU ES :
- un responsable opérationnel terrain,
- un coordinateur planning,
- un assistant organisationnel intelligent,
- un optimiseur de journées.

TU N’ES PAS :
- un simple calendrier automatique,
- un chatbot bavard,
- un générateur de tâches incohérentes.

========================================
CONTEXTE BUSINESS
========================================

La Pause Sandwich est un service de livraison de sandwichs, desserts et boissons principalement destiné aux call-centers et entreprises.

Le service doit être :
- rapide,
- humain,
- pratique,
- professionnel,
- flexible,
- fiable.

L’entreprise gère :
- commandes individuelles,
- commandes groupes,
- réunions,
- journées spéciales,
- événements.

========================================
PHILOSOPHIE DE TRAVAIL
========================================

Priorités absolues :
1. Les livraisons clients passent avant tout.
2. Les commandes groupes sont prioritaires.
3. Éviter les retards.
4. Éviter le gaspillage.
5. Prévoir les préparations avant les livraisons.
6. Anticiper les ruptures de stock.
7. Optimiser les déplacements.
8. Garder une charge de travail réaliste.
9. Préserver une organisation fluide.
10. Réduire le stress opérationnel.

========================================
HORAIRES IMPORTANTS
========================================

Créneaux habituels :
- 11h00
- 13h00
- 15h00

Toujours prévoir :
- préparation avant livraison,
- temps déplacement,
- marge sécurité.

Après 15h00 :
- nettoyage,
- réassort,
- administratif,
- prospection,
- organisation du lendemain.

========================================
RESPONSABILITÉS
========================================

Tu dois :
- organiser les journées,
- créer des plannings réalistes,
- prioriser les tâches,
- éviter les conflits horaires,
- détecter les surcharges,
- regrouper les tâches proches,
- optimiser les déplacements,
- équilibrer la charge de travail,
- protéger les livraisons,
- protéger les préparations cuisine.

========================================
PROCÉDURE OBLIGATOIRE
========================================

Avant chaque réponse :

1. ANALYSER la demande réelle d’Antonio.

2. VÉRIFIER :
- planning actuel,
- horaires livraison,
- tâches existantes,
- alertes,
- contraintes connues,
- charge de travail,
- temps préparation,
- déplacements.

3. DÉTECTER :
- conflits horaires,
- surcharge,
- manque temps préparation,
- tâches impossibles,
- risques retard livraison,
- déplacements inutiles.

4. OPTIMISER :
- ordre des tâches,
- regroupement déplacements,
- cohérence journée,
- équilibre charge travail,
- fluidité opérationnelle.

5. DÉCIDER :
- créer,
- modifier,
- déplacer,
- reporter,
- supprimer,
- conseiller.

6. VÉRIFIER :
- journée réaliste,
- livraisons protégées,
- préparation suffisante,
- planning exploitable rapidement.

========================================
RÈGLES IMPORTANTES
========================================

- Toujours répondre en français.
- Répondre de manière claire et opérationnelle.
- Ne jamais inventer de données.
- Ne jamais créer un planning irréaliste.
- Ne jamais surcharger Antonio inutilement.
- Toujours privilégier les actions concrètes.
- Toujours protéger les livraisons.
- Toujours garder une logique terrain réaliste.

========================================
MODIFICATION PLANNING
========================================

Quand Antonio demande :
- ajouter,
- modifier,
- déplacer,
- supprimer,
- réorganiser,
- optimiser le planning,

tu dois répondre UNIQUEMENT avec un JSON valide.

========================================
FORMAT CREATE
========================================

[
  {
    "action": "create",
    "title": "Courses Carrefour",
    "description": "Acheter les produits nécessaires",
    "planned_date": "2026-05-13",
    "planned_time": "08:30",
    "priority": "high"
  }
]

========================================
FORMAT UPDATE
========================================

[
  {
    "action": "update",
    "task_id": 12,
    "planned_date": "2026-05-13",
    "planned_time": "16:00",
    "priority": "medium"
  }
]

========================================
FORMAT DELETE
========================================

[
  {
    "action": "delete",
    "task_id": 12
  }
]

========================================
RÈGLES JSON
========================================

- Ne mets aucun texte avant ou après le JSON.
- planned_date doit être au format YYYY-MM-DD.
- planned_time doit être au format HH:MM.
- priority doit être :
  - urgent
  - high
  - medium
  - low

- Si tu ne connais pas le task_id pour modifier ou supprimer, demande quel événement modifier.
- Si Antonio dit “demain”, utilise la date de demain si connue.
- Si la demande est ambiguë, demande une précision courte.

========================================
OBJECTIF LONG TERME
========================================

Devenir un véritable assistant opérationnel capable de :
- organiser efficacement les journées,
- réduire le stress,
- améliorer la fluidité du business,
- anticiper les problèmes,
- aider au développement de La Pause Sandwich.
`
}
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState(agents[2]);
  const [userInput, setUserInput] = useState("");

  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [logs, setLogs] = useState([]);

  const [stats, setStats] = useState({
    conversationsToday: 0,
    totalConversations: 0,
    openTasks: 0,
    memories: 0,
    activeAgents: 0,
    unreadAlerts: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [taskStatusFilter, setTaskStatusFilter] = useState("open");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [inboxFilter, setInboxFilter] = useState("unread");

  const [planningModalOpen, setPlanningModalOpen] = useState(false);
  const [planningSourceAlert, setPlanningSourceAlert] = useState(null);
  const [editingPlanningItem, setEditingPlanningItem] = useState(null);
  const [planningForm, setPlanningForm] = useState({
    title: "",
    description: "",
    planned_date: "",
    planned_time: "",
    priority: "medium"
  });

  const [knownAlertIds, setKnownAlertIds] = useState([]);
  const [alertsInitialized, setAlertsInitialized] = useState(false);

  useEffect(() => {
    runAutomation(false);

    const interval = setInterval(async () => {
      try {
        await loadDashboard();
        await loadPlanning();

        await fetch(`${API_URL}/api/ops?action=check-new-orders`);
        await fetch(`${API_URL}/api/ops?action=check-stock`);
        await fetch(`${API_URL}/api/ops?action=check-orders`);
      } catch (error) {
        console.error("Erreur polling temps réel :", error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!alerts.length) return;

    if (!alertsInitialized) {
      setKnownAlertIds(alerts.map((alert) => alert.id));
      setAlertsInitialized(true);
      return;
    }

    const newAlerts = alerts.filter(
      (alert) => !knownAlertIds.includes(alert.id) && !alert.read
    );

    const latestAlerts = newAlerts.slice(0, 10);

    latestAlerts.forEach((alert) => {
      toast(`🚨 ${alert.title}\n${alert.message}`);
    });

    setKnownAlertIds(alerts.map((alert) => alert.id));
  }, [alerts, alertsInitialized, knownAlertIds]);

  async function loadDashboard() {
    try {
      setIsRefreshing(true);

      const res = await fetch(`${API_URL}/api/dashboard`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur dashboard");
      }

      setStats(
        data.stats || {
          conversationsToday: 0,
          totalConversations: 0,
          openTasks: 0,
          memories: 0,
          activeAgents: 0,
          unreadAlerts: 0
        }
      );

      setAlerts(data.alerts || []);
      setTasks(data.tasks || []);
      setMemories(data.memories || []);
      setLogs(data.logs || []);
      setHistory(formatConversations(data.conversations || []));
    } catch (error) {
      console.error("Erreur chargement dashboard :", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadPlanning() {
    try {
      const res = await fetch(`${API_URL}/api/ops?action=get-planning`);
      const data = await res.json();

      if (res.ok) {
        setPlanning(data.planning || []);
      }
    } catch (error) {
      console.error("Erreur chargement planning :", error);
    }
  }

  async function runAutomation(showAlert = true) {
    try {
      setIsRefreshing(true);

      await fetch(`${API_URL}/api/ops?action=check-new-orders`);
      await fetch(`${API_URL}/api/ops?action=check-stock`);
      await fetch(`${API_URL}/api/ops?action=check-orders`);
      await fetch(`${API_URL}/api/ops?action=auto-director`);

      await loadDashboard();
      await loadPlanning();

      if (showAlert) {
        alert("Synchronisation IA terminée");
      }
    } catch (error) {
      if (showAlert) {
        alert("Erreur synchronisation : " + error.message);
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function formatConversations(items) {
    return items.map((item) => ({
      id: item.id,
      agent: item.agent,
      userInput: item.userInput || item.user_input,
      response: item.response,
      date:
        item.date ||
        (item.created_at
          ? new Date(item.created_at).toLocaleString("fr-FR")
          : "")
    }));
  }

  async function clearHistory() {
    try {
      await fetch(`${API_URL}/api/conversations`, {
        method: "DELETE"
      });

      await loadDashboard();
    } catch (error) {
      alert("Erreur suppression historique : " + error.message);
    }
  }

  async function completeTask(taskId) {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: taskId,
          status: "done",
          completed: true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur mise à jour tâche");
      }

      await loadDashboard();
    } catch (error) {
      alert("Erreur tâche : " + error.message);
    }
  }

  async function updateAlert(id, action) {
    try {
      const res = await fetch(`${API_URL}/api/ops?action=alert-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          action
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur mise à jour alerte");
      }

      await loadDashboard();
    } catch (error) {
      alert("Erreur alerte : " + error.message);
    }
  }

  function openPlanningModal(alert) {
    const today = new Date().toISOString().slice(0, 10);

    setEditingPlanningItem(null);
    setPlanningSourceAlert(alert);
    setPlanningForm({
      title: alert.title || "Action à planifier",
      description: alert.message || "",
      planned_date: today,
      planned_time: "",
      priority: alert.priority || "medium"
    });
    setPlanningModalOpen(true);
  }

  function openPlanningItemModal(item) {
    setPlanningSourceAlert(null);
    setEditingPlanningItem(item);
    setPlanningForm({
      title: item.title || "",
      description: item.description || "",
      planned_date: item.planned_date || "",
      planned_time: item.planned_time ? String(item.planned_time).slice(0, 5) : "",
      priority: item.priority || "medium"
    });
    setPlanningModalOpen(true);
  }

  function closePlanningModal() {
    setPlanningModalOpen(false);
    setPlanningSourceAlert(null);
    setEditingPlanningItem(null);
  }

  async function submitPlanning(e) {
    e.preventDefault();

    try {
      const payload = {
        ...planningForm,
        planned_time:
          planningForm.planned_time && planningForm.planned_time.trim() !== ""
            ? planningForm.planned_time
            : null,
        priority: planningForm.priority?.toLowerCase() || "medium",
        source_type: planningSourceAlert ? "alert" : "manual",
        source_id: planningSourceAlert?.id || null
      };

      const res = await fetch(`${API_URL}/api/ops?action=add-to-planning`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text.slice(0, 200));
      }

      if (!res.ok) {
        throw new Error(data.error || "Erreur planning");
      }

      closePlanningModal();
      await loadDashboard();
      await loadPlanning();
      setActiveTab("planning");
    } catch (error) {
      alert("Erreur ajout planning : " + error.message);
    }
  }

  async function handleMovePlanningEvent(item, start) {
    try {
      const res = await fetch(
        `${API_URL}/api/ops?action=move-planning-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: item.id,
            planned_date: start.toISOString().slice(0, 10),
            planned_time: start.toTimeString().slice(0, 8)
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur déplacement planning");
      }

      await loadPlanning();
      await loadDashboard();
    } catch (error) {
      alert("Erreur déplacement planning : " + error.message);
    }
  }

  async function generateAIPlanning() {
    try {
      setIsRefreshing(true);

      const res = await fetch(`${API_URL}/api/ops?action=generate-planning`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur génération planning");
      }

      await loadPlanning();
      await loadDashboard();

      alert(`Planning IA généré : ${data.generated || 0} actions ajoutées.`);
    } catch (error) {
      alert("Erreur génération planning : " + error.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function executePlanningJsonIfPresent(text) {
  try {
    if (!selectedAgent.name.toLowerCase().includes("planning")) return;

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return;

    const actions = JSON.parse(match[0]);

    if (!Array.isArray(actions)) return;

    const res = await fetch(`${API_URL}/api/ops?action=execute-planning-actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ actions })
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Erreur exécution planning");
    }

    toast.success("Planning mis à jour par l’Agent Planning IA");

    await loadPlanning();
    await loadDashboard();
    setActiveTab("planning");
  } catch (error) {
    console.error("Erreur exécution JSON planning :", error);
    toast.error("JSON planning détecté mais non exécuté");
  }
}

  async function handleSend() {
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    const tempId = Date.now();

    setUserInput("");
    setIsLoading(true);
    setActiveTab("agents");

    const tempMessage = {
      id: tempId,
      agent: selectedAgent.name,
      userInput: currentInput,
      response: "Réflexion en cours...",
      date: new Date().toLocaleString("fr-FR")
    };

    setHistory((prev) => [tempMessage, ...prev]);

    try {
      const res = await fetch(`${API_URL}/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentName: selectedAgent.name,
          agentPrompt: selectedAgent.prompt,
          userMessage: currentInput
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur API inconnue");
      }

      const responseText = data.response || "Pas de réponse reçue.";

      await executePlanningJsonIfPresent(responseText);

      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, response: responseText } : item
        )
      );

      await loadDashboard();
    } catch (error) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                response: "ERREUR : " + error.message
              }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSend();
    }
  }

  const chartData = useMemo(() => {
    const grouped = {};

    history.forEach((item) => {
      const day = item.date ? item.date.slice(0, 10) : "Aujourd’hui";
      grouped[day] = (grouped[day] || 0) + 1;
    });

    return Object.entries(grouped)
      .slice(0, 7)
      .reverse()
      .map(([day, count]) => ({
        day,
        conversations: count
      }));
  }, [history]);

  const agentActivity = useMemo(() => {
    const grouped = {};

    history.forEach((item) => {
      grouped[item.agent] = (grouped[item.agent] || 0) + 1;
    });

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [history]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatch =
        taskStatusFilter === "all" ||
        task.status === taskStatusFilter ||
        (taskStatusFilter === "open" &&
          !task.completed &&
          task.status !== "done") ||
        (taskStatusFilter === "done" &&
          (task.completed || task.status === "done"));

      const priorityMatch =
        taskPriorityFilter === "all" || task.priority === taskPriorityFilter;

      return statusMatch && priorityMatch;
    });
  }, [tasks, taskStatusFilter, taskPriorityFilter]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (inboxFilter === "all") return !alert.deleted;
      if (inboxFilter === "unread") return !alert.read && !alert.deleted;
      if (inboxFilter === "important") return alert.important && !alert.deleted;
      if (inboxFilter === "planned") return alert.planned && !alert.deleted;
      if (inboxFilter === "completed") return alert.completed && !alert.deleted;
      if (inboxFilter === "deleted") return alert.deleted;
      return true;
    });
  }, [alerts, inboxFilter]);

  const planningToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return planning.filter((item) => item.planned_date === today);
  }, [planning]);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        runAutomation={runAutomation}
        isRefreshing={isRefreshing}
      />

      <main className="main">
        <Topbar alerts={alerts} />

        {activeTab === "dashboard" && (
          <DashboardPage
            stats={stats}
            history={history}
            alerts={alerts}
            planningToday={planningToday}
            chartData={chartData}
            agentActivity={agentActivity}
            updateAlert={updateAlert}
            openPlanningModal={openPlanningModal}
          />
        )}

        {activeTab === "inbox" && (
          <>
            <Header
              title="Inbox IA"
              subtitle="Toutes les alertes importantes comme une boîte mail : lu, important, terminé, supprimé ou ajouté au planning."
            />

            <section className="task-filters">
              {[
                ["unread", "Non lus"],
                ["important", "Importants"],
                ["planned", "Planifiés"],
                ["completed", "Terminés"],
                ["deleted", "Supprimés"],
                ["all", "Tous"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={inboxFilter === value ? "filter active" : "filter"}
                  onClick={() => setInboxFilter(value)}
                >
                  {label}
                </button>
              ))}
            </section>

            <section className="inbox-list">
              {filteredAlerts.length === 0 ? (
                <div className="panel">
                  <p className="empty">Aucune alerte dans cette catégorie.</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onUpdate={updateAlert}
                    onPlan={openPlanningModal}
                  />
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "planning" && (
          <>
            <Header
              title="Planning opérationnel"
              subtitle="Calendrier IA connecté aux alertes, tâches et agents."
            />

            <section className="planning-toolbar">
              <button
                className="refresh-button"
                onClick={() => {
                  setPlanningSourceAlert(null);
                  setEditingPlanningItem(null);
                  setPlanningForm({
                    title: "",
                    description: "",
                    planned_date: new Date().toISOString().slice(0, 10),
                    planned_time: "",
                    priority: "medium"
                  });
                  setPlanningModalOpen(true);
                }}
              >
                <Plus size={18} />
                Ajouter au planning
              </button>

              <button
                className="refresh-button"
                onClick={generateAIPlanning}
                disabled={isRefreshing}
              >
                Générer planning IA
              </button>
            </section>

            <section className="planning-grid">
              <PlanningCalendar
                items={planning}
                onSelectEvent={openPlanningItemModal}
                onMoveEvent={handleMovePlanningEvent}
              />

              <div className="panel">
                <div className="panel-header">
                  <h3>Liste planning</h3>
                </div>

                <OperationalPlanning
  items={planning}
  refreshPlanning={loadPlanning}
/>
              </div>
            </section>
          </>
        )}

        {activeTab === "agents" && (
          <>
            <Header
              title="Agents IA"
              subtitle="Sélectionne un agent et donne-lui une mission."
            />

            <section className="agents-layout">
              <div className="agent-selector">
                {agents.map((agent) => {
                  const Icon = agent.icon;

                  return (
                    <button
                      key={agent.id}
                      className={
                        selectedAgent.id === agent.id
                          ? "agent-card active"
                          : "agent-card"
                      }
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Icon size={22} />

                      <div>
                        <strong>{agent.name}</strong>
                        <p>{agent.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="agent-workspace">
                <div className="hero-card">
                  <p className="label">Agent sélectionné</p>
                  <h2>{selectedAgent.name}</h2>
                  <p>{selectedAgent.role}</p>
                </div>

                <div className="panel">
                  <h3>Nouvelle mission</h3>

                  <textarea
                    placeholder="Écris ta demande ici..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />

                  <div className="actions">
                    <button onClick={handleSend} disabled={isLoading}>
                      <Send size={18} />
                      {isLoading ? "Réflexion..." : "Envoyer"}
                    </button>

                    <span>Ctrl + Entrée pour envoyer</span>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Dernière réponse</h3>
                  </div>

                  {history.length === 0 ? (
                    <p className="empty">Aucune réponse pour le moment.</p>
                  ) : (
                    <ConversationCard item={history[0]} />
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "tasks" && (
          <>
            <Header
              title="Tâches inter-agents"
              subtitle="Actions générées automatiquement par les agents."
            />

            <section className="task-filters">
              <button
                className={
                  taskStatusFilter === "open" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("open")}
              >
                Ouvertes
              </button>

              <button
                className={
                  taskStatusFilter === "done" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("done")}
              >
                Terminées
              </button>

              <button
                className={
                  taskStatusFilter === "all" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("all")}
              >
                Toutes
              </button>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
              >
                <option value="all">Toutes priorités</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </section>

            <section className="panel">
              <TaskList tasks={filteredTasks} full onComplete={completeTask} />
            </section>
          </>
        )}

        {activeTab === "logs" && <LogsPage logs={logs} />}

        {activeTab === "memory" && (
          <>
            <Header
              title="Mémoire long terme"
              subtitle="Règles, préférences et informations importantes."
            />

            <section className="memory-grid">
              {memories.length === 0 ? (
                <p className="empty">Aucune mémoire enregistrée.</p>
              ) : (
                memories.map((memory) => (
                  <div className="memory-card" key={memory.id}>
                    <span>{memory.category || "Général"}</span>
                    <p>{memory.content}</p>
                    <small>
                      {memory.created_at
                        ? new Date(memory.created_at).toLocaleString("fr-FR")
                        : ""}
                    </small>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "history" && (
          <>
            <Header
              title="Historique"
              subtitle="Toutes les conversations enregistrées."
            />

            <div className="history-actions">
              <button onClick={clearHistory} className="delete-button">
                <Trash2 size={18} />
                Effacer historique
              </button>
            </div>

            <section className="history-list">
              {history.length === 0 ? (
                <p className="empty">Aucune conversation enregistrée.</p>
              ) : (
                history.map((item) => (
                  <ConversationCard item={item} key={item.id} />
                ))
              )}
            </section>
          </>
        )}
      </main>

      {planningModalOpen && (
        <div className="modal-backdrop">
          <form className="planning-modal" onSubmit={submitPlanning}>
            <div className="modal-header">
              <div>
                <p className="label">Planning</p>
                <h3>
                  {editingPlanningItem
                    ? "Modifier une action"
                    : "Ajouter une action"}
                </h3>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closePlanningModal}
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Titre
              <input
                value={planningForm.title}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    title: e.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={planningForm.description}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    description: e.target.value
                  }))
                }
              />
            </label>

            <div className="form-row">
              <label>
                Date
                <input
                  type="date"
                  value={planningForm.planned_date}
                  onChange={(e) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      planned_date: e.target.value
                    }))
                  }
                  required
                />
              </label>

              <label>
                Heure
                <input
                  type="time"
                  value={planningForm.planned_time || ""}
                  onChange={(e) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      planned_time: e.target.value
                    }))
                  }
                />
              </label>
            </div>

            <label>
              Priorité
              <select
                value={planningForm.priority}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    priority: e.target.value
                  }))
                }
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="delete-button"
                onClick={closePlanningModal}
              >
                Annuler
              </button>

              <button type="submit" className="refresh-button">
                {editingPlanningItem ? "Enregistrer" : "Ajouter au planning"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}