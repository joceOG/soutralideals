import { apiClient } from './setupApi';

export type CreateOrderLineInput = {
  articleId: string;
  quantite: number;
};

export type CreateOrderInfoCommande = {
  adresse: string;
  ville: string;
  telephone: string;
  codePostal: string;
  pays: string;
};

export type CreateOrderInput = {
  articles: CreateOrderLineInput[];
  infoCommande: CreateOrderInfoCommande;
  dateLivraison?: string;
};

export type CreateOrderLineResponse = {
  articleId: string | null;
  nom: string;
  quantite: number;
  prix: number;
  image: string | null;
};

export type CreateOrderResponse = {
  success: boolean;
  _id: string;
  statusCommande: string;
  prixArticles: number;
  prixLivraison: number;
  prixTotal: number;
  articles: CreateOrderLineResponse[];
  infoCommande: {
    addresse: string;
    ville: string;
    telephone: string;
    codePostal: string;
    pays: string;
  };
  vendeur?: { _id: string; shopName?: string };
  dateLivraison?: string;
  dateCreation?: string;
};

const ORDER_ERROR_HINTS: Record<string, string> = {
  MULTI_VENDOR_ORDER_NOT_SUPPORTED:
    'Les articles doivent provenir de la même boutique. Séparez le panier.',
  INSUFFICIENT_STOCK: 'Stock insuffisant. Réduisez la quantité ou rafraîchissez.',
  VENDOR_NOT_AVAILABLE: 'Cette boutique n\'accepte pas de nouvelles commandes.',
  ORDER_FIELD_FORBIDDEN: 'Données invalides envoyées au serveur.',
  ARTICLE_NOT_FOUND: 'Un article n\'existe plus.',
};

export function mapCreateOrderError(error: unknown): string {
  const ax = error as {
    response?: { status?: number; data?: { code?: string; message?: string } };
  };
  const code = ax.response?.data?.code;
  const msg = ax.response?.data?.message;
  if (code && ORDER_ERROR_HINTS[code]) return ORDER_ERROR_HINTS[code];
  if (msg) return msg;
  if (ax.response?.status === 401) return 'Session expirée. Reconnectez-vous.';
  return 'Impossible de créer la commande.';
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  const res = await apiClient.post<CreateOrderResponse>('/commande', input);
  return res.data;
}
