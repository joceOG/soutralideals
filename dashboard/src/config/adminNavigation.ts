import type { ElementType } from 'react';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WorkIcon from '@mui/icons-material/Work';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BadgeIcon from '@mui/icons-material/Badge';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HandymanIcon from '@mui/icons-material/Handyman';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MapIcon from '@mui/icons-material/Map';
import SettingsIcon from '@mui/icons-material/Settings';
import PaymentIcon from '@mui/icons-material/Payment';
import type { NavigationBadgeKey } from '../services/navigationSummaryService';
import type { NavigationBadgeTone } from '../context/AdminNavigationContext';

export type AdminNavSectionId =
  | 'dashboard'
  | 'acteurs'
  | 'catalogue'
  | 'operations'
  | 'communication'
  | 'geolocalisation'
  | 'admin';

export interface AdminNavigationItem {
  key: string;
  label: string;
  path: string;
  icon: ElementType;
  section: AdminNavSectionId;
  description?: string;
  searchable?: boolean;
  exact?: boolean;
  badgeKey?: NavigationBadgeKey;
  badgeTone?: NavigationBadgeTone;
  children?: AdminNavigationItem[];
}

export const ADMIN_NAV_SECTION_LABELS: Record<AdminNavSectionId, string> = {
  dashboard: 'Accueil',
  acteurs: 'Acteurs',
  catalogue: 'Catalogue',
  operations: 'Opérations',
  communication: 'Communication',
  geolocalisation: 'Géolocalisation',
  admin: 'Admin',
};

/** Arbre de navigation admin — source unique sidebar, topbar et recherche. */
export const ADMIN_NAV_ITEMS: AdminNavigationItem[] = [
  {
    key: 'home',
    label: 'Tableau de bord',
    path: '/',
    icon: HomeIcon,
    section: 'dashboard',
    description: 'Vue d’ensemble, indicateurs et activité récente.',
    exact: true,
  },
  {
    key: 'utilisateur',
    label: 'Utilisateurs',
    path: '/utilisateur',
    icon: PeopleIcon,
    section: 'acteurs',
    description: 'Comptes clients et gestion des accès.',
  },
  {
    key: 'prestataire',
    label: 'Prestataires',
    path: '/prestataire',
    icon: CoPresentIcon,
    section: 'acteurs',
    description: 'Profils prestataires et validation.',
  },
  {
    key: 'freelance',
    label: 'Freelances',
    path: '/freelance',
    icon: WorkIcon,
    section: 'acteurs',
    description: 'Freelances inscrits sur la plateforme.',
  },
  {
    key: 'vendeur',
    label: 'Vendeurs',
    path: '/vendeur',
    icon: StorefrontIcon,
    section: 'acteurs',
    description: 'Boutiques et vendeurs e-market.',
  },
  {
    key: 'agents-recenseurs',
    label: 'Agents recenseurs',
    path: '/agents-recenseurs',
    icon: BadgeIcon,
    section: 'acteurs',
    description: 'Agents terrain habilités au recensement.',
  },
  {
    key: 'groupe',
    label: 'Groupes',
    path: '/groupe',
    icon: GroupIcon,
    section: 'catalogue',
    description: 'Groupes de catégories du catalogue.',
  },
  {
    key: 'categorie',
    label: 'Catégories',
    path: '/categorie',
    icon: CategoryIcon,
    section: 'catalogue',
    description: 'Catégories de services et produits.',
  },
  {
    key: 'service',
    label: 'Services',
    path: '/service',
    icon: DesignServicesIcon,
    section: 'catalogue',
    description: 'Offres de services prestataires.',
  },
  {
    key: 'freelance-offres',
    label: 'Offres freelance',
    path: '/freelance-offres',
    icon: AssignmentTurnedInIcon,
    section: 'catalogue',
    description: 'Catalogue des offres freelance.',
  },
  {
    key: 'article',
    label: 'Articles',
    path: '/article',
    icon: ShoppingCartIcon,
    section: 'catalogue',
    description: 'Articles vendus sur la marketplace.',
  },
  {
    key: 'commandes',
    label: 'Commandes',
    path: '/commandes',
    icon: ReceiptIcon,
    section: 'operations',
    description: 'Suivi des commandes clients à traiter.',
    badgeKey: 'ordersPending',
    badgeTone: 'warning',
  },
  {
    key: 'prestations',
    label: 'Prestations',
    path: '/prestations',
    icon: HandymanIcon,
    section: 'operations',
    description: 'Demandes de prestation en cours.',
    badgeKey: 'prestationsPending',
    badgeTone: 'warning',
  },
  {
    key: 'paiements',
    label: 'Paiements',
    path: '/paiements',
    icon: PaymentIcon,
    section: 'operations',
    description: 'Paiements à valider, en échec ou en litige.',
    badgeKey: 'paymentsAttention',
    badgeTone: 'danger',
  },
  {
    key: 'import-prestataires',
    label: 'Import prestataires',
    path: '/import-prestataires',
    icon: CloudUploadIcon,
    section: 'operations',
    description: 'Import en masse de fiches prestataires.',
  },
  {
    key: 'recensements-pending',
    label: 'En attente',
    path: '/recensements-pending',
    icon: PendingActionsIcon,
    section: 'operations',
    description: 'Recensements en attente de validation admin.',
    badgeKey: 'recensementsPending',
    badgeTone: 'warning',
  },
  {
    key: 'recensements-terrain',
    label: 'Recensements terrain',
    path: '/recensements-terrain',
    icon: TravelExploreIcon,
    section: 'operations',
    description: 'Dossiers recensement terrain à modérer.',
    badgeKey: 'recensementsPending',
    badgeTone: 'warning',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: NotificationsIcon,
    section: 'communication',
    description: 'Messages et alertes reçus par l’administrateur.',
    badgeKey: 'notificationsUnread',
    badgeTone: 'info',
  },
  {
    key: 'geo',
    label: 'Cartes',
    path: '/__geo',
    icon: MapIcon,
    section: 'geolocalisation',
    description: 'Cartographie des acteurs.',
    searchable: false,
    children: [
      {
        key: 'prestataires-map',
        label: 'Prestataires',
        path: '/prestataires-map',
        icon: LocationOnIcon,
        section: 'geolocalisation',
        description: 'Carte des prestataires géolocalisés.',
      },
      {
        key: 'freelances-map',
        label: 'Freelances',
        path: '/freelances-map',
        icon: LocationOnIcon,
        section: 'geolocalisation',
        description: 'Carte des freelances.',
      },
      {
        key: 'vendeurs-map',
        label: 'Vendeurs',
        path: '/vendeurs-map',
        icon: PublicIcon,
        section: 'geolocalisation',
        description: 'Carte des vendeurs.',
      },
      {
        key: 'geographic-analytics',
        label: 'Analyse géo',
        path: '/geographic-analytics',
        icon: AnalyticsIcon,
        section: 'geolocalisation',
        description: 'Statistiques et répartition géographique.',
      },
    ],
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    path: '/parametres',
    icon: SettingsIcon,
    section: 'admin',
    description: 'Configuration de l’espace administration.',
  },
];

const SIDEBAR_SECTION_ORDER: AdminNavSectionId[] = [
  'dashboard',
  'acteurs',
  'catalogue',
  'operations',
  'communication',
  'geolocalisation',
  'admin',
];

export interface SidebarSectionGroup {
  section: AdminNavSectionId;
  label: string;
  items: AdminNavigationItem[];
}

export function getSidebarNavigationGroups(): SidebarSectionGroup[] {
  return SIDEBAR_SECTION_ORDER.map((section) => ({
    section,
    label: section === 'dashboard' ? '' : ADMIN_NAV_SECTION_LABELS[section],
    items: ADMIN_NAV_ITEMS.filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);
}

function flattenItems(items: AdminNavigationItem[]): AdminNavigationItem[] {
  const out: AdminNavigationItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flattenItems(item.children));
    } else if (item.path && !item.path.startsWith('/__')) {
      out.push(item);
    }
  }
  return out;
}

export function getSearchableAdminNavItems(): AdminNavigationItem[] {
  return flattenItems(ADMIN_NAV_ITEMS).filter((item) => item.searchable !== false);
}

export function resolveAdminPageMeta(pathname: string): { title: string; description: string } {
  const flat = flattenItems(ADMIN_NAV_ITEMS);
  const exact = flat.find((item) => item.path === pathname);
  if (exact) {
    return {
      title: exact.label,
      description: exact.description ?? '',
    };
  }
  const home = ADMIN_NAV_ITEMS.find((i) => i.key === 'home');
  if (pathname === '/' && home) {
    return { title: home.label, description: home.description ?? '' };
  }
  return {
    title: 'Administration',
    description: 'Espace d’administration Soutrali Deals.',
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterAdminNavSearch(query: string): AdminNavigationItem[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  return getSearchableAdminNavItems().filter((item) => {
    const haystack = normalizeSearchText(
      [item.label, ADMIN_NAV_SECTION_LABELS[item.section], item.description ?? ''].join(' '),
    );
    return haystack.includes(q);
  });
}
