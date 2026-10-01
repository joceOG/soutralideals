/**
 * Plan éditorial Métiers — données de migration (pas d’IDs Mongo en dur).
 * Fusions destructives : aucune. Ambiguïtés : A_REVOIR.
 */
export const CATEGORY_TRIM = [
  { current: ' Beauté & Soins', proposed: 'Beauté & Soins', action: 'CLARIFIER' },
];

/** Catégories Métiers à créer si absentes (pas un nouvel univers). */
export const CATEGORY_ADD = [
  {
    nomcategorie: 'Jardinage & Espaces verts',
    catalogKey: 'metiers.cat.jardinage',
    note: 'Élagueur n’est pas du gros œuvre. Jardinier / Paysagiste reste en Bâtiment jusqu’à revue manuelle.',
  },
  {
    nomcategorie: 'Événementiel & Animation',
    catalogKey: 'metiers.cat.evenementiel',
    note: 'DJ, sono, MC, organisateur : distincts de l’artisanat. Musicien / Danseur existants non déplacés.',
  },
];

/** Catégories proposées, non créées automatiquement. */
export const CATEGORY_PROPOSED = [
  {
    nomcategorie: 'Sport & Loisirs',
    forTitles: ['Maître-nageur / moniteur de natation', 'Coach sportif à domicile'],
    auto: false,
    note: 'Aucune catégorie sport existante. Domicile vs bassin / club non tranché.',
  },
];

/** Renommages conservant l’ObjectId. aliases inclut toujours l’ancien nom. */
export const RENAMES = [
  { current: 'Bijoutier Artisannal', proposed: 'Bijoutier artisanal', action: 'RENOMMER' },
  { current: 'Controlleur Entrée', proposed: 'Agent de contrôle d’accès', action: 'RENOMMER' },
  { current: 'Faux Plafonds', proposed: 'Poseur de faux plafonds', action: 'RENOMMER' },
  { current: 'Servante ménagère', proposed: 'Aide ménagère à domicile', action: 'RENOMMER' },
  { current: 'Marchand Céraéles', proposed: 'Marchand de céréales', action: 'RENOMMER' },
  { current: 'Technicen ADSL', proposed: 'Technicien ADSL', action: 'RENOMMER' },
  { current: 'Technicien Photo Voltaique', proposed: 'Technicien photovoltaïque', action: 'RENOMMER' },
  { current: 'Vulganisateur', proposed: 'Vulcanisateur', action: 'RENOMMER' },
  { current: 'Specialiste Console', proposed: 'Spécialiste consoles de jeux', action: 'RENOMMER' },
  { current: 'Service de déménagement local ', proposed: 'Déménageur', action: 'RENOMMER' },
  { current: 'Coiffure Homme', proposed: 'Coiffeur / coiffeuse pour hommes', action: 'RENOMMER' },
  { current: 'Coiffeuse Dame', proposed: 'Coiffeur / coiffeuse pour femmes', action: 'RENOMMER' },
  { current: 'Manicure Pedicure', proposed: 'Manucure / pédicure', action: 'RENOMMER' },
  { current: 'Protheiste Ongulaire', proposed: 'Prothésiste ongulaire', action: 'RENOMMER' },
  { current: 'Estheticien', proposed: 'Esthéticien / esthéticienne', action: 'RENOMMER' },
  { current: 'Couturiere', proposed: 'Couturier / couturière', action: 'RENOMMER' },
  { current: 'Marchand Legume', proposed: 'Marchand de légumes', action: 'RENOMMER' },
  { current: 'Reparateur ElectroMenager', proposed: 'Réparateur d’électroménager', action: 'RENOMMER' },
  { current: 'Réparateurs d\' appareils ménagers', proposed: 'Réparateur d’appareils ménagers', action: 'RENOMMER' },
  { current: 'Poseur VItre Teintées', proposed: 'Poseur de vitres teintées', action: 'RENOMMER' },
  { current: 'Specialiste Tunning', proposed: 'Spécialiste tuning automobile', action: 'RENOMMER' },
  { current: 'Laveur Auto ', proposed: 'Laveur auto', action: 'RENOMMER' },
  { current: 'Taxi moto ', proposed: 'Taxi moto', action: 'RENOMMER' },
  { current: 'Livreur de colis ', proposed: 'Livreur de colis', action: 'RENOMMER' },
  { current: 'Gardien / Vigile ', proposed: 'Gardien / vigile', action: 'RENOMMER' },
  { current: 'Createur Bijoux', proposed: 'Créateur de bijoux', action: 'RENOMMER' },
  { current: 'Cuisinier a domicile', proposed: 'Cuisinier à domicile', action: 'RENOMMER' },
  { current: 'Electricien', proposed: 'Électricien', action: 'RENOMMER' },
  { current: 'Electricien Auto', proposed: 'Électricien auto', action: 'RENOMMER' },
  { current: 'Electricien Industriel', proposed: 'Électricien industriel', action: 'RENOMMER' },
  { current: 'Mecanicien Auto', proposed: 'Mécanicien auto', action: 'RENOMMER' },
  { current: 'Decorateur Interieur', proposed: 'Décorateur d’intérieur', action: 'RENOMMER' },
];

export const FUSION_CANDIDATES = [
  { ids: ['Chef à domicile', 'Cuisinier à domicile', 'Cuisinier a domicile'], action: 'FUSION_CANDIDATE', note: 'Chef vs cuisinier : métiers distincts possibles. Pas de fusion auto.' },
  { ids: ['Garagiste', 'Mécanicien auto', 'Mecanicien Auto', 'Reparateur Auto', 'Réparateur Auto'], action: 'FUSION_CANDIDATE', note: 'Garage = établissement ; mécanicien / réparateur = activité.' },
  { ids: ['Réparateur d’électroménager', 'Réparateur d’appareils ménagers', 'Reparateur ElectroMenager', 'Réparateurs d\' appareils ménagers'], action: 'FUSION_CANDIDATE', note: 'Doublon fonctionnel probable — inventorier les références avant fusion.' },
  { ids: ['Mecanicien Groupe Electrogene', 'Réparateur de générateur'], action: 'FUSION_CANDIDATE' },
  { ids: ['Installateur Domotique', 'Specialiste Domotique'], action: 'FUSION_CANDIDATE', note: 'Installation ≠ spécialisation réparation.' },
  { ids: ['Réparateur de pneus', 'Reparateur Pneumatique', 'Vulcanisateur', 'Vulganisateur'], action: 'FUSION_CANDIDATE', note: 'Pneumatique peut être industriel.' },
  { ids: ['Collecteur d\'ordures privées', 'Collecteur déchets'], action: 'FUSION_CANDIDATE' },
  { ids: ['Baby-sitter', 'Nounou / Garde d\'enfants'], action: 'FUSION_CANDIDATE', note: 'Ponctuel vs régulier — rester identifiables.' },
  { ids: ['Bijoutier artisanal', 'Créateur de bijoux', 'Bijoutier Artisannal', 'Createur Bijoux'], action: 'FUSION_CANDIDATE' },
  { ids: ['Installateur Antenne', 'Installateur Parabole'], action: 'FUSION_CANDIDATE' },
  { ids: ['Décorateur', 'Décorateur d’intérieur', 'Decorateur', 'Decorateur Interieur'], action: 'FUSION_CANDIDATE', note: 'Intérieur vs événementiel : non tranché. Decorateur conservé A_REVOIR.' },
];

export const A_REVOIR = [
  'Depanneur',
  'Mécanique',
  'Controlleur Technique',
  'Installateur Reseau',
  'Reparateur Engins',
  'Constructeur Bassins',
  'Location Materiel',
  'Spécialiste Gazon',
  'Maçon Traditionnaliste',
  'Ferrailleur',
  'Eleveur Ruminants',
  'Chauffeur de véhicule électrique',
  'Decorateur',
  'Technicien CCTV',
];

/** Besoins / alias par nom actuel (avant ou après rename, matching exact nomservice). */
export const VOCAB_BY_CURRENT_NAME = {
  Plombier: {
    aliases: ['plomberie', 'plombier sanitaire'],
    needs: ['robinet', 'fuite d’eau', 'evier bouche', 'lavabo', 'chasse d’eau', 'fuite', 'canalisation'],
  },
  Electricien: {
    aliases: ['électricien', 'electricien', 'électricité'],
    needs: ['panne de courant', 'prise electrique', 'tableau electrique', 'court-circuit'],
  },
  'Servante ménagère': {
    aliases: ['aide menagere', 'ménage', 'femme de menage'],
    needs: ['menage', 'nettoyage maison', 'repassage a domicile'],
  },
  Menuisier: {
    aliases: ['menuiserie'],
    needs: ['chaise cassee', 'reparer une chaise', 'porte en bois', 'meuble en bois'],
  },
  Cordonnier: {
    aliases: ['cordonnerie'],
    needs: ['chaussure a reparer', 'semelle decollee', 'talon', 'chaussure'],
  },
  'Couturiere': {
    aliases: ['couture', 'couturier'],
    needs: ['ourlet', 'fermeture cassee', 'vetement a ajuster'],
  },
  'Réparateur de climatiseur': {
    aliases: ['climatisation', 'clim'],
    needs: ['climatiseur qui ne refroidit plus', 'clim en panne'],
  },
  'Réparateur de téléphone': {
    aliases: ['reparation telephone'],
    needs: ['ecran casse', 'batterie telephone', 'telephone qui ne charge plus'],
  },
  'Installateur Climatisation': {
    aliases: ['installateur clim'],
    needs: ['installer un climatiseur'],
  },
  Maçon: {
    aliases: ['maconnerie'],
    needs: ['mur a construire', 'enduit', 'parpaing'],
  },
  'Mecanicien Auto': {
    aliases: ['mecanicien automobile', 'garage auto'],
    needs: ['voiture en panne', 'revision auto', 'vidange'],
  },
  'Coiffure Homme': {
    aliases: ['coiffeur homme', 'salon homme'],
    needs: ['coupe homme', 'barbe'],
  },
  'Coiffeuse Dame': {
    aliases: ['coiffeuse', 'salon femme'],
    needs: ['tresse', 'defrisage', 'coupe femme'],
  },
};

export const SHORTCUTS = [
  { rank: 1, currentName: 'Plombier', iconKey: 'plumbing' },
  { rank: 2, currentName: 'Electricien', iconKey: 'electrical' },
  { rank: 3, currentName: 'Servante ménagère', iconKey: 'cleaning' },
  { rank: 4, currentName: 'Maçon', iconKey: 'masonry' },
  { rank: 5, currentName: 'Mecanicien Auto', iconKey: 'auto' },
  { rank: 6, currentName: 'Coiffure Homme', iconKey: 'barber' },
];

/**
 * 50 propositions : AJOUTER seulement si pas d’équivalent Métiers/Freelance évident.
 * Priorité éditoriale 1 (fort besoin local) à 3 (de niche).
 */
export const PROPOSALS = [
  { n: 1, title: 'Technicien de lutte contre les nuisibles', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.nuisibles', priority: 1, aliases: ['deratiseur', 'desinsectisation'], needs: ['rats', 'cafards', 'termite'] },
  { n: 2, title: 'Vidangeur de fosses septiques', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.vidangeur', priority: 1, aliases: ['vidange fosse'], needs: ['fosse septique', 'fosse pleine'] },
  { n: 3, title: 'Agent de curage et d’assainissement', action: 'SPECIALISATION_DISTINCTE', of: 'Plombier', note: 'Curage vs plomberie courante — entrée distincte, non attribuée aux plombiers.', category: 'Bâtiment & Construction', catalogKey: 'metiers.curage', create: true, priority: 2, aliases: ['curage', 'debouchage canalisation'], needs: ['canalisation bouchee', 'egout'] },
  { n: 4, title: 'Nettoyeur de textiles d’ameublement', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.nettoyage-textile', priority: 1, aliases: ['nettoyage canape'], needs: ['canape', 'matelas', 'tapis'] },
  { n: 5, title: 'Laveur de vitres', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.laveur-vitres', priority: 2, aliases: ['laveur vitre'], needs: ['vitres sales', 'vitrines'] },
  { n: 6, title: 'Nettoyeur de fin de chantier', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.nettoyage-chantier', priority: 2 },
  { n: 7, title: 'Technicien d’entretien de piscines', action: 'SPECIALISATION_DISTINCTE', of: 'Installateur Piscine', category: 'Bâtiment & Construction', catalogKey: 'metiers.entretien-piscine', create: true, priority: 2, aliases: ['pisciniste entretien'], needs: ['eau verte', 'entretien piscine'], note: 'Entretien ≠ installation (Installateur Piscine déjà au catalogue).' },
  { n: 8, title: 'Auxiliaire de vie à domicile', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.auxiliaire-vie', priority: 1, aliases: ['aide a domicile'], needs: ['aide personne agee'] },
  { n: 9, title: 'Gardien d’animaux à domicile', action: 'AJOUTER', category: 'Élevage, Animaux & Services Associés', catalogKey: 'metiers.pet-sitter', priority: 2, aliases: ['pet sitter'], needs: ['garder un chien', 'chat en pension'] },
  { n: 10, title: 'Élagueur', action: 'SPECIALISATION_DISTINCTE', of: 'Jardinier / Paysagiste', category: 'Jardinage & Espaces verts', catalogKey: 'metiers.elagueur', create: true, priority: 2, needs: ['arbre a couper', 'elagage'], note: 'Pas du gros œuvre. Nouvelle catégorie Métiers ; Jardinier / Paysagiste n’est pas déplacé automatiquement.' },
  { n: 11, title: 'Menuisier aluminium', action: 'SPECIALISATION_DISTINCTE', of: 'Menuisier', category: 'Bâtiment & Construction', catalogKey: 'metiers.menuisier-alu', create: true, priority: 2, note: 'Menuisier bois #69618414bff072a8b1695dcb existe. Alu = spécialisation distincte, non attribuée aux menuisiers bois. Orphelin Menuiserie / Allure non rattaché.' },
  { n: 12, title: 'Monteur de meubles', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.monteur-meubles', priority: 1, aliases: ['montage meuble'], needs: ['lit a monter', 'armoire a demonter', 'meuble ikea'] },
  { n: 13, title: 'Installateur de cuisines aménagées', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.cuisine-amenagee', priority: 2 },
  { n: 14, title: 'Staffeur', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.staffeur', priority: 3 },
  { n: 15, title: 'Façadier-enduiseur', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.facadier', priority: 2 },
  { n: 16, title: 'Poseur de moustiquaires', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.moustiquaires', priority: 2, needs: ['moustiques', 'moustiquaire fenetre'] },
  { n: 17, title: 'Installateur-réparateur de pompes à eau', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.pompes-eau', priority: 1, aliases: ['surpresseur'], needs: ['pompe a eau', 'plus d eau'] },
  { n: 18, title: 'Technicien de traitement de l’eau', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.traitement-eau', priority: 3 },
  { n: 19, title: 'Installateur de systèmes d’arrosage', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.arrosage', priority: 3 },
  { n: 20, title: 'Installateur-réparateur de chauffe-eau', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.chauffe-eau', priority: 1, needs: ['chauffe-eau en panne', 'pas d eau chaude'] },
  { n: 21, title: 'Ascensoriste', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.ascensoriste', priority: 3 },
  { n: 22, title: 'Bobinier de moteurs électriques', action: 'AJOUTER', category: 'Electronique & Technologie', catalogKey: 'metiers.bobinier', priority: 3 },
  { n: 23, title: 'Technicien d’onduleurs', action: 'AJOUTER', category: 'Electronique & Technologie', catalogKey: 'metiers.onduleurs', priority: 2, aliases: ['inverter'] },
  { n: 24, title: 'Technicien de maintenance d’extincteurs', action: 'AJOUTER', category: 'Services à Domicile & de Sécurité', catalogKey: 'metiers.extincteurs', priority: 3 },
  { n: 25, title: 'Réparateur de machines à coudre', action: 'AJOUTER', category: 'Electronique & Technologie', catalogKey: 'metiers.machine-coudre', priority: 2 },
  { n: 26, title: 'Technicien de balances et pesage', action: 'AJOUTER', category: 'Electronique & Technologie', catalogKey: 'metiers.pesage', priority: 3 },
  { n: 27, title: 'Réparateur de vélos', action: 'AJOUTER', category: 'Mécanique & Transport', catalogKey: 'metiers.velo', priority: 2, needs: ['velo creve', 'chaine velo'] },
  { n: 28, title: 'Dépanneur-remorqueur automobile', action: 'A_REVOIR', create: false, of: 'Depanneur', note: 'Depanneur #6966a35031f7f3c834546d91 est A_REVOIR (sens flou). Pas de création tant que le périmètre dépannage vs remorquage n’est pas tranché.' },
  { n: 29, title: 'Technicien de climatisation automobile', action: 'SPECIALISATION_DISTINCTE', of: 'Mecanicien Auto', category: 'Mécanique & Transport', catalogKey: 'metiers.clim-auto', create: true, priority: 2 },
  { n: 30, title: 'Technicien de diagnostic électronique automobile', action: 'SPECIALISATION_DISTINCTE', of: 'Mecanicien Auto', category: 'Mécanique & Transport', catalogKey: 'metiers.diag-auto', create: true, priority: 2 },
  { n: 31, title: 'Photographe événementiel', action: 'AUTRE_UNIVERS_JUSTIFIE', create: false, equivalent: { groupe: 'Freelance', nomservice: 'Photographe Evenementiel', id: '69d6894cddb4b1fd93b729f4' }, note: 'Équivalent Freelance existant. Pas de duplicata Métiers. L’orphelin Photographe n’est pas rattaché.' },
  { n: 32, title: 'Vidéaste événementiel', action: 'AUTRE_UNIVERS_JUSTIFIE', create: false, equivalent: { groupe: 'Freelance', nomservice: 'Videaste de Mariage' }, note: 'Équivalent Freelance (vidéaste mariage). Parcours Freelance, souvent à distance/livraison de fichiers.' },
  { n: 33, title: 'DJ', action: 'AJOUTER', category: 'Événementiel & Animation', catalogKey: 'metiers.dj', create: true, priority: 1, aliases: ['disc jockey'], note: 'Musicien #69879a0cb20e7d1a0d512952 reste en Artisanat. DJ n’est pas fusionné.' },
  { n: 34, title: 'Technicien de sonorisation', action: 'AJOUTER', category: 'Événementiel & Animation', catalogKey: 'metiers.sono', create: true, priority: 2, note: 'Prestation live technique, distincte de Musicien.' },
  { n: 35, title: 'Maître de cérémonie', action: 'AJOUTER', category: 'Événementiel & Animation', catalogKey: 'metiers.mc', create: true, priority: 2, aliases: ['MC', 'animateur ceremonie'] },
  { n: 36, title: 'Organisateur d’événements', action: 'AJOUTER', category: 'Événementiel & Animation', catalogKey: 'metiers.wedding-planner', create: true, priority: 2, aliases: ['wedding planner'] },
  { n: 37, title: 'Monteur de tentes et chapiteaux', action: 'AJOUTER', category: 'Bâtiment & Construction', catalogKey: 'metiers.chapiteaux', create: true, priority: 2, note: 'Montage de structures, distinct de l’animation Artisanat.' },
  { n: 38, title: 'Serveur événementiel', action: 'AJOUTER', category: 'Alimentation & Restauration', catalogKey: 'metiers.serveur-event', priority: 2 },
  { n: 39, title: 'Barman événementiel', action: 'AJOUTER', category: 'Alimentation & Restauration', catalogKey: 'metiers.barman', priority: 2 },
  { n: 40, title: 'Maquilleur professionnel', action: 'AJOUTER', category: ' Beauté & Soins', catalogKey: 'metiers.maquilleur', priority: 1, aliases: ['maquillage mariage'] },
  { n: 41, title: 'Retoucheur de vêtements', action: 'SPECIALISATION_DISTINCTE', of: 'Couturiere', note: 'Retouche vs création — entrée distincte.', category: 'Textile & Habillement', catalogKey: 'metiers.retouche', create: true, priority: 1, needs: ['ourlet', 'pantalon trop long'] },
  { n: 42, title: 'Imprimeur', action: 'AJOUTER', category: 'Commerce & Service de Proximité', catalogKey: 'metiers.imprimeur', priority: 2, aliases: ['imprimerie'] },
  { n: 43, title: 'Sérigraphe', action: 'AJOUTER', category: 'Textile & Habillement', catalogKey: 'metiers.serigraphe', priority: 3 },
  { n: 44, title: 'Fabricant-poseur d’enseignes', action: 'AJOUTER', category: 'Commerce & Service de Proximité', catalogKey: 'metiers.enseignes', priority: 2 },
  { n: 45, title: 'Graveur-personnalisateur', action: 'AJOUTER', category: 'Artisanat & Art', catalogKey: 'metiers.graveur', priority: 3 },
  { n: 46, title: 'Professeur particulier à domicile', action: 'A_REVOIR', create: false, note: 'Aucun équivalent Métiers ni Freelance « cours / professeur ». L’indépendance ne justifie pas Freelance. Domicile vs distanciel non tranché.' },
  { n: 47, title: 'Coach sportif à domicile', action: 'A_REVOIR', create: false, note: 'Les Coach Freelance existants sont B2B / carrière / nutrition au travail, pas un coaching sportif à domicile.' },
  { n: 48, title: 'Maître-nageur / moniteur de natation', action: 'A_REVOIR', create: false, proposedCategory: 'Sport & Loisirs', note: 'Installateur Piscine #6963d7398eda1aafc5de566c = construction. Pas de catégorie Sport existante. Ne pas ranger en Services à domicile. Catégorie Sport & Loisirs proposée, non créée auto.' },
  { n: 49, title: 'Pisciculteur', action: 'AJOUTER', category: 'Élevage, Animaux & Services Associés', catalogKey: 'metiers.pisciculteur', priority: 3 },
  { n: 50, title: 'Apiculteur', action: 'AJOUTER', category: 'Élevage, Animaux & Services Associés', catalogKey: 'metiers.apiculteur', priority: 3 },
];

export const ORPHAN_IDS = [
  '68d6a41c40b8a717973dd400',
  '68d6a42040b8a717973dd417',
  '68d6a74a8d705907be738abf',
  '68d6a74b8d705907be738ac9',
  '68d6a74f8d705907be738ae3',
  '68d6a7528d705907be738af5',
  '68d6a7548d705907be738aff',
  '68d6a75b8d705907be738b2a',
  '68d6a7748d705907be738bc4',
  '68d6a7768d705907be738bce',
  '68d6a77b8d705907be738bf0',
  '68d6a77c8d705907be738bfa',
  '68d6a852490b63f4b89feec0',
  '68d6a85e490b63f4b89fef0a',
  '68d6a862490b63f4b89fef24',
  '68d6a868490b63f4b89fef46',
  '68d6a86b490b63f4b89fef6c',
  '68d6a871490b63f4b89fefb5',
  '68d6a876490b63f4b89fefe2',
];

export const BROKEN_CATEGORIE_ID = '68d6a41c40b8a717973dd3fd';

export const ORPHAN_POLICY = {
  action: 'A_REVOIR',
  doNotDelete: true,
  doNotAttachToMetiers: true,
  doNotRenameVulgarisateur: true,
  reason:
    'Référence categorie non nulle vers un document Catégorie inexistant (même ObjectId cassé). GET /api/service peuple alors categorie: null. Hors filtre Services généraux.',
};

export function proposalShouldCreate(p) {
  if (p.create === false) return false;
  if (p.action === 'A_REVOIR' || p.action === 'AUTRE_UNIVERS_JUSTIFIE' || p.action === 'AUTRE_UNIVERS' || p.action === 'ENRICHIR_EXISTANT') {
    return false;
  }
  return Boolean(p.catalogKey) && (p.action === 'AJOUTER' || p.action === 'SPECIALISATION_DISTINCTE' || p.create === true || p.add === true);
}
