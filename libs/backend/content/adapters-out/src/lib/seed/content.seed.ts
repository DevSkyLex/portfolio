import { sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  contentRevision,
  profile,
  projects,
  skillGroups,
  timelineEntries,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/*
 * Initial content taken from the "Portfolio — One page v2" mockup, in French and English.
 * CEFii Bachelor dates assumed (September 2023 – June 2024): the mockup showed "20XX".
 */
/**
 * Type ProjectRow
 * @type ProjectRow
 *
 * @description
 * Insert shape inferred from the projects Drizzle table for static seed data.
 */
type ProjectRow = typeof projects.$inferInsert;

/**
 * Type TimelineRow
 * @type TimelineRow
 *
 * @description
 * Insert shape inferred from the timeline entries table.
 */
type TimelineRow = typeof timelineEntries.$inferInsert;

/**
 * Type SkillRow
 * @type SkillRow
 *
 * @description
 * Insert shape inferred from the skill groups table.
 */
type SkillRow = typeof skillGroups.$inferInsert;

/**
 * Type ProfileRow
 * @type ProfileRow
 *
 * @description
 * Insert shape inferred from the singleton profile table.
 */
type ProfileRow = typeof profile.$inferInsert;

/**
 * Constant SEED_PROJECTS
 *
 * @description
 * Initial published and draft project rows adapted from the portfolio mockup content.
 */
export const SEED_PROJECTS: ProjectRow[] = [
  {
    id: 'project-movah',
    slug: 'movah',
    title: { fr: 'Movah', en: 'Movah' },
    summary: {
      fr: 'Une application mobile pour suivre ses séries, films et anime, et ne plus perdre le fil. Flutter sur Android et iOS, avec Supabase.',
      en: 'A mobile app to keep track of series, films and anime without losing the thread. Flutter on Android and iOS, with Supabase.',
    },
    lead: {
      fr: 'Une application mobile pour suivre ses séries, films et anime, et ne plus perdre le fil. Flutter sur Android et iOS, avec Supabase.',
      en: 'A mobile app to keep track of series, films and anime without losing the thread. Flutter on Android and iOS, with Supabase.',
    },
    periodLabel: { fr: 'Depuis juillet 2026', en: 'Since July 2026' },
    client: { fr: 'Projet personnel', en: 'Personal project' },
    role: { fr: 'Conception et développement', en: 'Design and development' },
    place: { fr: 'Android et iOS', en: 'Android and iOS' },
    siteUrl: null,
    techs: ['flutter', 'dart', 'supabase'],
    featured: true,
    position: 0,
    status: 'published',
    version: 1,
    article: {
      context: [
        {
          fr: "Entre les plateformes de streaming, on oublie vite où l'on en est d'une série ou la date de sortie du prochain épisode. Movah réunit au même endroit ce que l'on regarde, ce que l'on veut voir et ce qui arrive bientôt.",
          en: 'With so many streaming platforms, it is easy to forget where you are in a series or when the next episode comes out. Movah brings together what you are watching, what you want to watch and what is coming soon.',
        },
        {
          fr: "C'est un projet personnel, mené de la maquette à l'application, pour aller au bout d'un produit mobile complet : comptes, données, synchronisation et publication sur deux plateformes.",
          en: 'A personal project, taken from mockup to app, to see a complete mobile product through: accounts, data, sync and release on two platforms.',
        },
      ],
      work: [
        {
          fr: "J'ai conçu la maquette haute fidélité, puis développé l'application Flutter et son backend Supabase.",
          en: 'I designed the high-fidelity mockup, then built the Flutter app and its Supabase backend.',
        },
      ],
      workList: [
        {
          fr: 'Le suivi des séries, films et anime, épisode par épisode.',
          en: 'Tracking series, films and anime, episode by episode.',
        },
        {
          fr: "Le catalogue et la recherche, alimentés par l'API de TMDB.",
          en: 'The catalogue and search, powered by the TMDB API.',
        },
        {
          fr: 'Le calendrier des sorties à venir, les listes et les statistiques.',
          en: 'The upcoming release calendar, lists and statistics.',
        },
        {
          fr: 'La connexion par e-mail, Google ou Apple, en français et en anglais.',
          en: 'Sign-in with email, Google or Apple, in French and English.',
        },
      ],
      choices: [
        {
          fr: "L'application n'appelle jamais TMDB directement : des Edge Functions Supabase servent d'intermédiaire, avec un cache dans Postgres. La clé d'API reste sur le serveur, et les écrans continuent d'afficher les dernières données connues si TMDB ne répond pas.",
          en: 'The app never calls TMDB directly: Supabase Edge Functions sit in between, with a cache in Postgres. The API key stays on the server, and screens keep showing the last known data if TMDB does not respond.',
        },
        {
          fr: "Le code est organisé par fonctionnalité, en couches données, domaine et présentation. Les entités du domaine ne dépendent ni de Flutter ni de Supabase, ce qui les rend simples à tester ; l'état de l'application passe par Riverpod.",
          en: 'The code is organised by feature, in data, domain and presentation layers. Domain entities depend on neither Flutter nor Supabase, which keeps them easy to test; app state goes through Riverpod.',
        },
      ],
      result: [
        {
          fr: "L'application tourne sur Android et iOS, avec des thèmes clair et sombre fidèles à la maquette.",
          en: 'The app runs on Android and iOS, with light and dark themes true to the mockup.',
        },
        {
          fr: "Chaque changement passe par une intégration continue GitHub Actions : formatage, analyse du code, tests, puis construction de l'application.",
          en: 'Every change goes through GitHub Actions continuous integration: formatting, code analysis, tests, then the app build.',
        },
      ],
      lessons: [
        {
          fr: "Partir d'une maquette complète avant d'écrire la première ligne a évité beaucoup d'allers-retours : chaque écran avait déjà ses états, ses couleurs et ses textes.",
          en: 'Starting from a complete mockup before writing the first line saved a lot of back-and-forth: every screen already had its states, colours and copy.',
        },
        {
          fr: "Passer d'Angular à Flutter m'a montré que les mêmes idées se retrouvent d'un framework à l'autre : des composants petits et des données qui circulent dans un seul sens.",
          en: 'Moving from Angular to Flutter showed me that the same ideas carry over between frameworks: small components and data that flows in one direction.',
        },
      ],
      captions: [
        {
          fr: "Le suivi d'une série, épisode par épisode.",
          en: 'Following a series, episode by episode.',
        },
        { fr: 'Le calendrier des prochaines sorties.', en: 'The calendar of upcoming releases.' },
      ],
    },
  },
  {
    id: 'project-rdi-manager',
    slug: 'rdi-manager',
    title: { fr: 'RDI Manager', en: 'RDI Manager' },
    summary: {
      fr: "Suivi d'activité de la R&D chez Object as a Service : temps, planning, indicateurs. J'ai repris le suivi et modernisé l'application Symfony et Vue.js.",
      en: 'R&D activity tracking at Object as a Service: time, planning, metrics. I took over maintenance and modernised the Symfony and Vue.js application.',
    },
    lead: {
      fr: "Suivi d'activité de la R&D chez Object as a Service : temps, planning, indicateurs. Back-end Symfony, interface Vue.js.",
      en: 'R&D activity tracking at Object as a Service: time, planning, metrics. Symfony back end, Vue.js interface.',
    },
    periodLabel: { fr: '2023 — 2026', en: '2023 — 2026' },
    client: { fr: 'Object as a Service', en: 'Object as a Service' },
    role: { fr: 'Développeur web fullstack', en: 'Full-stack web developer' },
    place: { fr: 'À distance', en: 'Remote' },
    siteUrl: null,
    techs: ['symfony', 'php', 'vue'],
    featured: false,
    position: 1,
    status: 'published',
    version: 1,
    article: {
      context: [
        {
          fr: "RDI Manager est l'outil interne qui suit l'activité de la R&D d'Object as a Service : le temps passé sur chaque projet, le planning de l'équipe et les indicateurs qui servent au suivi des projets de recherche.",
          en: "RDI Manager is the internal tool that tracks R&D activity at Object as a Service: time spent on each project, the team's schedule and the metrics used to follow research projects.",
        },
        {
          fr: "L'application associe un back-end Symfony et une interface en Vue.js. Elle tournait depuis plusieurs années sur une version ancienne de Symfony. Chaque évolution devenait plus longue, et personne n'osait toucher au calcul des indicateurs.",
          en: 'The application pairs a Symfony back end with a Vue.js interface. It had been running for years on an old Symfony version. Every change took longer, and nobody dared touch the metrics calculation.',
        },
      ],
      work: [
        {
          fr: "J'ai repris la maintenance de l'outil, puis sa modernisation, sans interrompre son utilisation par l'équipe.",
          en: 'I took over maintenance of the tool, then its modernisation, without interrupting the team using it.',
        },
      ],
      workList: [
        {
          fr: 'La mise à jour de PHP, de Symfony et des dépendances, par étapes.',
          en: 'Upgrading PHP, Symfony and dependencies, step by step.',
        },
        {
          fr: 'Des tests sur le calcul des indicateurs avant toute modification.',
          en: 'Tests on the metrics calculation before any change.',
        },
        {
          fr: 'La réécriture des parties les plus fragiles : saisie des temps et calculs.',
          en: 'Rewriting the most fragile parts: time entry and calculations.',
        },
        {
          fr: "Les corrections et évolutions demandées par l'équipe R&D, côté Symfony comme côté Vue.js.",
          en: 'Fixes and features requested by the R&D team, on both the Symfony and Vue.js sides.',
        },
      ],
      choices: [
        {
          fr: "Une réécriture complète aurait gelé l'outil pendant des mois. J'ai préféré une migration progressive : chaque étape laissait l'application utilisable, et les tests vérifiaient que les indicateurs restaient identiques avant et après.",
          en: 'A full rewrite would have frozen the tool for months. I chose a gradual migration: each step left the application usable, and tests checked that metrics stayed identical before and after.',
        },
        {
          fr: 'En contrepartie, quelques parties anciennes cohabitent encore avec le code modernisé. Elles sont isolées derrière des interfaces claires et documentées, pour pouvoir être remplacées plus tard.',
          en: 'The trade-off: a few older parts still live alongside the modernised code. They are isolated behind clear, documented interfaces so they can be replaced later.',
        },
      ],
      result: [
        {
          fr: "L'outil tourne sur une version maintenue de Symfony, et les évolutions se font sans craindre de casser le calcul des indicateurs.",
          en: 'The tool runs on a maintained Symfony version, and changes no longer risk breaking the metrics calculation.',
        },
        {
          fr: "L'équipe R&D a continué à saisir ses temps et à suivre ses projets pendant toute la modernisation.",
          en: 'The R&D team kept entering time and following its projects throughout the modernisation.',
        },
      ],
      lessons: [
        {
          fr: 'Commencer par les tests a été le meilleur investissement du projet : sans eux, chaque mise à jour aurait été un pari.',
          en: 'Starting with tests was the best investment of the project: without them, every upgrade would have been a gamble.',
        },
        {
          fr: "Reprendre le code de quelqu'un d'autre m'a appris à lire avant de juger. Plusieurs bizarreries avaient une raison métier qu'il fallait comprendre avant de les corriger.",
          en: "Taking over someone else's code taught me to read before judging. Several oddities had a business reason that needed understanding before fixing them.",
        },
      ],
      captions: [
        { fr: 'La saisie des temps.', en: 'Time entry.' },
        { fr: 'Le tableau des indicateurs.', en: 'The metrics dashboard.' },
      ],
    },
  },
  {
    id: 'project-crm-kodoka',
    slug: 'crm-kodoka',
    title: { fr: 'CRM Kodoka', en: 'Kodoka CRM' },
    summary: {
      fr: 'Un CRM sur mesure pour Kodoka : interfaces, règles métier et gestion des données.',
      en: 'A custom CRM for Kodoka: interfaces, business rules and data management.',
    },
    lead: {
      fr: 'Un CRM sur mesure pour Kodoka : interfaces, règles métier et gestion des données.',
      en: 'A custom CRM for Kodoka: interfaces, business rules and data management.',
    },
    periodLabel: { fr: 'Mars — avril 2023', en: 'March — April 2023' },
    client: { fr: 'Kodoka', en: 'Kodoka' },
    role: { fr: 'Développeur web fullstack', en: 'Full-stack web developer' },
    place: { fr: 'Joué-lès-Tours', en: 'Joué-lès-Tours' },
    siteUrl: null,
    techs: ['codeigniter', 'php'],
    featured: false,
    position: 2,
    status: 'published',
    version: 1,
    article: {
      context: [
        {
          fr: "Kodoka suivait ses clients et ses échanges commerciaux dans des fichiers séparés. Les informations étaient dispersées et difficiles à partager dans l'équipe.",
          en: 'Kodoka tracked its clients and sales conversations in separate files. Information was scattered and hard to share across the team.',
        },
        {
          fr: "L'entreprise voulait un CRM simple, adapté à sa façon de travailler, plutôt qu'un outil généraliste à configurer pendant des semaines.",
          en: 'The company wanted a simple CRM that fit the way it works, rather than a general-purpose tool that takes weeks to configure.',
        },
      ],
      work: [
        {
          fr: "En deux mois, j'ai conçu et développé le CRM avec CodeIgniter 4, de la base de données aux écrans.",
          en: 'In two months, I designed and built the CRM with CodeIgniter 4, from the database to the screens.',
        },
      ],
      workList: [
        {
          fr: "Les fiches clients et contacts, avec l'historique des échanges.",
          en: 'Client and contact records, with the history of exchanges.',
        },
        {
          fr: 'Le suivi des opportunités commerciales, étape par étape.',
          en: 'Tracking sales opportunities, stage by stage.',
        },
        {
          fr: 'Les règles métier : statuts, relances et droits selon le rôle.',
          en: 'Business rules: statuses, follow-ups and role-based permissions.',
        },
        {
          fr: "L'import des données existantes depuis les anciens fichiers.",
          en: 'Importing existing data from the old files.',
        },
      ],
      choices: [
        {
          fr: "CodeIgniter 4 était léger et déjà connu de l'équipe qui allait reprendre l'outil après moi. Pour un projet de deux mois, c'était plus important qu'un framework plus complet.",
          en: 'CodeIgniter 4 was lightweight and already known to the team who would take the tool over after me. For a two-month project, that mattered more than a fuller framework.',
        },
        {
          fr: "J'ai gardé une interface sobre, rendue côté serveur, pour livrer dans les délais. Seuls les écrans les plus utilisés ont reçu un peu de JavaScript, pour éviter les rechargements.",
          en: 'I kept a plain, server-rendered interface to deliver on time. Only the most used screens got a little JavaScript, to avoid page reloads.',
        },
      ],
      result: [
        {
          fr: "L'équipe retrouve les clients, leurs contacts et l'historique des échanges au même endroit, au lieu de fichiers séparés.",
          en: 'The team finds clients, their contacts and the history of exchanges in one place, instead of separate files.',
        },
        {
          fr: "Le code a été remis avec une documentation d'installation et de prise en main, pour que l'équipe puisse le faire évoluer.",
          en: 'The code was handed over with setup and onboarding documentation, so the team could keep developing it.',
        },
      ],
      lessons: [
        {
          fr: "J'aurais passé plus de temps avec les utilisateurs avant de modéliser les données : deux champs ajoutés en fin de projet auraient été évidents après une matinée d'observation.",
          en: 'I would have spent more time with users before modelling the data: two fields added at the end of the project would have been obvious after a morning of observation.',
        },
        {
          fr: "Livrer un projet entier en deux mois m'a appris à découper le travail en versions utilisables, plutôt qu'à tout finir en même temps.",
          en: 'Delivering a whole project in two months taught me to split work into usable versions, rather than finishing everything at once.',
        },
      ],
      captions: [
        { fr: "La fiche d'un client.", en: 'A client record.' },
        { fr: 'Le suivi des opportunités.', en: 'Tracking opportunities.' },
      ],
    },
  },
  {
    id: 'project-iotplatform',
    slug: 'iotplatform',
    title: { fr: 'IOTPlatform', en: 'IOTPlatform' },
    summary: {
      fr: 'Supervision et pilotage de capteurs LoRaWAN pour Object as a Service. Front-end Angular et NgRx, évolutions du back-end Django.',
      en: 'Monitoring and control of LoRaWAN sensors for Object as a Service. Angular and NgRx front end, improvements to the Django back end.',
    },
    lead: {
      fr: "Supervision et pilotage de capteurs et d'actionneurs LoRaWAN, édités par Object as a Service. J'ai développé le front-end Angular et fait évoluer le back-end Django.",
      en: 'Monitoring and control of LoRaWAN sensors and actuators, published by Object as a Service. I built the Angular front end and improved the Django back end.',
    },
    periodLabel: { fr: '2023 — 2026', en: '2023 — 2026' },
    client: { fr: 'Object as a Service', en: 'Object as a Service' },
    role: { fr: 'Développeur web fullstack', en: 'Full-stack web developer' },
    place: { fr: 'À distance', en: 'Remote' },
    siteUrl: 'https://iotplatform.fr/fr/',
    techs: ['angular', 'ngrx', 'django'],
    featured: false,
    position: 3,
    status: 'published',
    version: 1,
    article: {
      context: [
        {
          fr: 'IOTPlatform permet à des opérateurs industriels, des gestionnaires de réseaux et des collectivités de superviser et de piloter leurs équipements à distance : capteurs de niveau, de débit ou de température, et actionneurs, sur les réseaux Orange LoRa et The Things Network.',
          en: 'IOTPlatform lets industrial operators, network managers and local authorities monitor and control their equipment remotely: level, flow or temperature sensors, and actuators, on the Orange LoRa and The Things Network networks.',
        },
        {
          fr: "La plateforme collecte et décode les trames envoyées par les équipements, déclenche des alertes par e-mail ou SMS, et permet d'envoyer des commandes aux actionneurs.",
          en: 'The platform collects and decodes the frames sent by devices, triggers alerts by email or SMS, and sends commands to actuators.',
        },
      ],
      work: [
        {
          fr: "J'ai pris en charge toute la partie front-end en Angular : la conception des pages et des composants, les appels aux API et la gestion d'état avec NgRx.",
          en: 'I owned the whole Angular front end: designing pages and components, API calls and state management with NgRx.',
        },
        {
          fr: "Côté back-end, en Django, j'ai amélioré le code existant et ajouté plusieurs fonctionnalités.",
          en: 'On the Django back end, I improved the existing code and added several features.',
        },
      ],
      workList: [
        {
          fr: 'Les tableaux de bord de supervision, sur plusieurs sites.',
          en: 'Monitoring dashboards across several sites.',
        },
        {
          fr: "L'envoi de commandes aux actionneurs et leur historique.",
          en: 'Sending commands to actuators, with their history.',
        },
        {
          fr: 'Le paramétrage des alertes par e-mail ou SMS.',
          en: 'Configuring email and SMS alerts.',
        },
        {
          fr: "Les graphiques dans le temps et l'export des données en CSV.",
          en: 'Time-series charts and CSV data export.',
        },
      ],
      choices: [
        {
          fr: "Les données arrivent de nombreux équipements et changent souvent. J'ai centralisé l'état de l'application avec NgRx : les écrans lisent le même store, les appels aux API passent par des effets, et une donnée mise à jour l'est partout à la fois.",
          en: 'Data comes from many devices and changes often. I centralised application state with NgRx: screens read the same store, API calls go through effects, and updated data is updated everywhere at once.',
        },
        {
          fr: "J'ai découpé l'interface en composants réutilisables (tableaux, graphiques, formulaires), partagés entre les écrans. L'interface reste cohérente à mesure que les fonctionnalités s'ajoutent.",
          en: 'I split the interface into reusable components (tables, charts, forms) shared between screens. The interface stays consistent as features are added.',
        },
      ],
      result: [
        {
          fr: "Le front-end Angular est le point d'entrée des clients pour la supervision, les commandes et les alertes.",
          en: "The Angular front end is the clients' entry point for monitoring, commands and alerts.",
        },
      ],
      lessons: [
        {
          fr: "Travailler sur un produit en production m'a appris à faire évoluer l'existant sans casser ce que les clients utilisent chaque jour.",
          en: 'Working on a live product taught me to evolve existing code without breaking what clients use every day.',
        },
        {
          fr: "NgRx demande plus de code au départ, mais il rend le comportement de l'application prévisible quand les écrans se multiplient.",
          en: 'NgRx takes more code up front, but it keeps application behaviour predictable as screens multiply.',
        },
      ],
      captions: [
        { fr: 'Le tableau de bord de supervision.', en: 'The monitoring dashboard.' },
        { fr: "L'envoi d'une commande à un actionneur.", en: 'Sending a command to an actuator.' },
      ],
    },
  },
];

/**
 * Constant SEED_TIMELINE
 *
 * @description
 * Initial education and experience rows used to populate the portfolio timeline.
 */
export const SEED_TIMELINE: TimelineRow[] = [
  {
    id: 'bts-sio',
    kind: 'education',
    title: { fr: 'BTS SIO, option SLAM', en: 'BTS SIO, SLAM track' },
    place: { fr: 'Chambray-lès-Tours', en: 'Chambray-lès-Tours' },
    description: {
      fr: 'Solutions logicielles et applications métiers.',
      en: 'Software solutions and business applications.',
    },
    startYear: 2021,
    startMonth: 9,
    endYear: 2023,
    endMonth: 6,
    techs: [],
  },
  {
    id: 'bachelor-cefii',
    kind: 'education',
    title: {
      fr: "Bachelor Développement d'application, CEFii",
      en: 'Bachelor in Application Development, CEFii',
    },
    place: { fr: 'Avrillé', en: 'Avrillé' },
    description: {
      fr: 'Bac+3, applications web et mobiles.',
      en: 'Three-year degree, web and mobile applications.',
    },
    startYear: 2023,
    startMonth: 9,
    endYear: 2024,
    endMonth: 6,
    techs: [],
  },
  {
    id: 'mastere-ynov',
    kind: 'education',
    title: {
      fr: 'Mastère Expert en développement logiciel, YNOV',
      en: "Master's in Software Development, YNOV",
    },
    place: { fr: 'Paris', en: 'Paris' },
    description: {
      fr: 'Bac+5 : architecture logicielle, sécurité, tests et CI/CD.',
      en: 'Five-year degree: software architecture, security, testing and CI/CD.',
    },
    startYear: 2024,
    startMonth: 9,
    endYear: 2026,
    endMonth: 6,
    techs: [],
  },
  {
    id: 'utopia',
    kind: 'experience',
    title: { fr: 'Développeur web front-end, Utopia', en: 'Front-end web developer, Utopia' },
    place: { fr: 'Tours', en: 'Tours' },
    description: {
      fr: "Sites vitrines WordPress et thème d'administration.",
      en: 'WordPress showcase sites and an admin theme.',
    },
    startYear: 2022,
    startMonth: 5,
    endYear: 2022,
    endMonth: 6,
    techs: ['wordpress', 'php'],
  },
  {
    id: 'kodoka',
    kind: 'experience',
    title: { fr: 'Développeur web fullstack, Kodoka', en: 'Full-stack web developer, Kodoka' },
    place: { fr: 'Joué-lès-Tours', en: 'Joué-lès-Tours' },
    description: {
      fr: 'Un CRM sur mesure avec CodeIgniter 4.',
      en: 'A custom CRM built with CodeIgniter 4.',
    },
    startYear: 2023,
    startMonth: 3,
    endYear: 2023,
    endMonth: 4,
    techs: ['codeigniter', 'php'],
  },
  {
    id: 'object-as-a-service',
    kind: 'experience',
    title: {
      fr: 'Développeur web fullstack, Object as a Service',
      en: 'Full-stack web developer, Object as a Service',
    },
    place: { fr: 'Clerlande, à distance', en: 'Clerlande, remote' },
    description: {
      fr: 'Front-end Angular et back-end Django d’IOTPlatform, modernisation de RDI Manager (Symfony, Vue.js).',
      en: 'The Angular front end and Django back end of IOTPlatform, and the modernisation of RDI Manager (Symfony, Vue.js).',
    },
    startYear: 2023,
    startMonth: 9,
    endYear: 2026,
    endMonth: 6,
    techs: ['angular', 'django', 'symfony', 'vue', 'php'],
  },
];

/**
 * Constant SEED_SKILLS
 *
 * @description
 * Initial skill-group rows used to populate the public skills section.
 */
export const SEED_SKILLS: SkillRow[] = [
  {
    id: 'front-end',
    domain: { fr: 'Front-end', en: 'Front end' },
    techs: [
      { key: 'angular', language: null },
      { key: 'react', language: null },
      { key: 'typescript', language: null },
    ],
    usage: {
      fr: "Interfaces de supervision d'objets connectés, outils internes.",
      en: 'Monitoring interfaces for connected devices, internal tools.',
    },
    position: 0,
  },
  {
    id: 'back-end',
    domain: { fr: 'Back-end', en: 'Back end' },
    techs: [
      { key: 'django', language: 'Python' },
      { key: 'symfony', language: 'PHP' },
    ],
    usage: {
      fr: "API des interfaces IoT, suivi d'activité de la R&D, CRM sur mesure.",
      en: 'APIs for IoT interfaces, R&D activity tracking, custom CRM.',
    },
    position: 1,
  },
  {
    id: 'cms',
    domain: { fr: 'CMS', en: 'CMS' },
    techs: [{ key: 'wordpress', language: null }],
    usage: {
      fr: "Sites vitrines et thème d'administration sur mesure.",
      en: 'Showcase sites and a custom admin theme.',
    },
    position: 2,
  },
  {
    id: 'outils',
    domain: { fr: 'Outils', en: 'Tools' },
    techs: [
      { key: 'git', language: null },
      { key: 'github', language: null },
      { key: 'ci-cd', language: null },
    ],
    usage: {
      fr: 'Versionnement, revues de code, déploiements automatisés.',
      en: 'Version control, code reviews, automated deployments.',
    },
    position: 3,
  },
];

/**
 * Constant SEED_PROFILE
 *
 * @description
 * Initial singleton profile row containing localized home and About content.
 */
export const SEED_PROFILE: ProfileRow = {
  id: 1,
  heroIntro: {
    fr: "Développeur web fullstack à Blois. Je conçois des applications web soignées, de l'interface jusqu'au serveur.",
    en: 'Full-stack web developer in Blois. I build carefully crafted web applications, from the interface to the server.',
  },
  aboutStatement: {
    fr: "J'aime concevoir des applications qui répondent à des besoins concrets, avec autant d'attention pour le code que pour les personnes qui les utilisent.",
    en: 'I like building applications that meet real needs, with as much care for the code as for the people who use them.',
  },
  aboutLead: {
    fr: "Après un BTS SIO et un bachelor, j'ai suivi le mastère de YNOV tout en travaillant trois ans chez Object as a Service, sur des interfaces IoT et des outils internes.",
    en: "After a BTS SIO and a bachelor's degree, I completed YNOV's master's programme while working three years at Object as a Service, on IoT interfaces and internal tools.",
  },
  facts: [
    {
      label: { fr: 'Basé à', en: 'Based in' },
      value: { fr: 'Blois, Loir-et-Cher', en: 'Blois, France' },
    },
    {
      label: { fr: 'Formation', en: 'Education' },
      value: {
        fr: 'Mastère Expert en développement logiciel, YNOV',
        en: "Master's in Software Development, YNOV",
      },
    },
    {
      label: { fr: 'En dehors du code', en: 'Outside of code' },
      value: {
        fr: 'Hardware, jeux vidéo, impression et modélisation 3D',
        en: 'Hardware, video games, 3D printing and modelling',
      },
    },
  ],
};

/**
 * Function seedContent
 *
 * @description
 * Replaces profile and collection contents with the initial seed in one database transaction. The
 * first run creates revision 1; replaying the seed increments the existing revision.
 *
 * @param {ContentDatabase} db - Database handle used for the seed transaction.
 * @returns {Promise<void>} Completion after all seed rows are written.
 */
export async function seedContent(db: ContentDatabase): Promise<void> {
  await db.transaction(async (tx: ContentTransaction): Promise<void> => {
    await tx.delete(projects);
    await tx.delete(timelineEntries);
    await tx.delete(skillGroups);
    await tx.delete(profile);
    await tx.insert(projects).values(SEED_PROJECTS);
    await tx.insert(timelineEntries).values(SEED_TIMELINE);
    await tx.insert(skillGroups).values(SEED_SKILLS);
    await tx.insert(profile).values(SEED_PROFILE);
    await tx
      .insert(contentRevision)
      .values({ id: 1, revision: 1 })
      .onConflictDoUpdate({
        target: contentRevision.id,
        set: { revision: sql`${contentRevision.revision} + 1` },
      });
  });
}
