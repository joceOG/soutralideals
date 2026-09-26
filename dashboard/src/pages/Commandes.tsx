import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Skeleton, Snackbar, Alert, Stack, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { apiClient } from '../services/setupApi';
import { createOrder, mapCreateOrderError } from '../services/commandeService';
import { fetchArticles, type ArticleListItem } from '../services/articleService';
import { colors } from '../tokens/colors';

// ✅ INTERFACES TYPESCRIPT
interface IInfoCommande {
  addresse: string;
  ville: string;
  telephone: string;
  codePostal: string;
  pays: string;
}

interface IArticleCommande {
  articleId?: string | null;
  article?: string;
  nom: string;
  quantite?: number;
  quantité?: number;
  image?: string | null;
  prix: number;
}

interface IPaiementInfo {
  id?: string;
  status?: string;
}

interface ICommande {
  _id?: string;
  infoCommande: IInfoCommande;
  articles: IArticleCommande[];
  paiementInfo?: IPaiementInfo;
  datePaie?: string;
  prixArticles: number;
  prixLivraison: number;
  prixTotal: number;
  statusCommande: string;
  dateLivraison?: string;
  dateCreation?: string;
}

interface ICommandeStats {
  statsParStatus: Array<{
    _id: string;
    count: number;
    totalRevenu: number;
  }>;
  totalCommandes: number;
  revenueTotal: number;
}

function lineQuantite(a: IArticleCommande): number {
  return a.quantite ?? a.quantité ?? 0;
}

function lineArticleId(a: IArticleCommande): string | null {
  if (a.articleId) return String(a.articleId);
  if (a.article) return String(a.article);
  return null;
}

/** API : { commandes, total, ... } ou tableau brut */
function normalizeCommandesPayload(data: unknown): ICommande[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data as ICommande[];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.commandes)) return o.commandes as ICommande[];
  if (Array.isArray(o.data)) return o.data as ICommande[];
  if (
    o.data &&
    typeof o.data === 'object' &&
    Array.isArray((o.data as Record<string, unknown>).commandes)
  ) {
    return (o.data as { commandes: ICommande[] }).commandes;
  }
  return [];
}

function formatMoneyFcfa(value: unknown): string {
  const n = Number(value);
  if (Number.isFinite(n)) return n.toLocaleString('fr-FR');
  return '0';
}

const TH_SX = {
  color: colors.textSecondary, fontWeight: 600, fontSize: '0.72rem',
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  backgroundColor: colors.bgWarm, borderBottom: `1px solid ${colors.border}`,
  py: 1.5, px: 2,
};

const CommandesComponent: React.FC = () => {
  const [commandes, setCommandes] = useState<ICommande[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') => setSnack({ open: true, msg, severity });
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<ICommande | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState<ICommandeStats | null>(null);
  const [catalogArticles, setCatalogArticles] = useState<ArticleListItem[]>([]);
  const [orderLines, setOrderLines] = useState<{ articleId: string; quantite: number }[]>([
    { articleId: '', quantite: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<ICommande>({
    infoCommande: {
      addresse: '',
      ville: '',
      telephone: '',
      codePostal: '',
      pays: 'Côte d\'Ivoire'
    },
    articles: [],
    prixArticles: 0,
    prixLivraison: 0,
    prixTotal: 0,
    statusCommande: 'En cours'
  });

  const statusOptions = [
    'En cours',
    'Confirmée',
    'En préparation',
    'Expédiée',
    'Livrée',
    'Annulée'
  ];

  // 🔹 CHARGEMENT DES COMMANDES
  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/commandes', {
        params: { page: 1, limit: 200 },
      });
      setCommandes(normalizeCommandesPayload(response.data));
    } catch (error) {
      notify("Erreur lors du chargement des commandes", 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/commandes/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchCommandes();
    fetchStats();
  }, []);

  // 🔹 GESTION DES MODALES
  const handleOpen = async (commande: ICommande | null = null) => {
    setSelectedCommande(commande);
    if (commande) {
      setFormData(commande);
    } else {
      setFormData({
        infoCommande: {
          addresse: '',
          ville: '',
          telephone: '',
          codePostal: '',
          pays: 'Côte d\'Ivoire'
        },
        articles: [],
        prixArticles: 0,
        prixLivraison: 0,
        prixTotal: 0,
        statusCommande: 'En cours'
      });
      setOrderLines([{ articleId: '', quantite: 1 }]);
      try {
        const r = await fetchArticles({ limit: 200 });
        setCatalogArticles(r.items);
      } catch {
        setCatalogArticles([]);
      }
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedCommande(null);
    setModalOpen(false);
    setDetailModalOpen(false);
  };

  const handleDetail = (commande: ICommande) => {
    setSelectedCommande(commande);
    setDetailModalOpen(true);
  };

  // 🔹 SUPPRESSION
  const handleDelete = async (commande: ICommande) => {
    if (!commande._id) return;
    if (window.confirm(`Supprimer la commande ${commande._id} ?`)) {
      try {
        await apiClient.delete(`/commande/${commande._id}`);
        notify("Commande supprimée");
        fetchCommandes();
        fetchStats();
      } catch {
        notify("Erreur lors de la suppression", 'error');
      }
    }
  };

  // 🔹 SAUVEGARDE
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const isUpdate = !!selectedCommande?._id;

      if (isUpdate) {
        await apiClient.put(`/commande/${selectedCommande?._id}`, {
          statusCommande: formData.statusCommande,
          infoCommande: formData.infoCommande,
        });
        notify('Commande mise à jour');
      } else {
        const lines = orderLines.filter((l) => l.articleId && l.quantite > 0);
        if (lines.length === 0) {
          notify('Ajoutez au moins un article à la commande', 'error');
          return;
        }
        if (lines.some((l) => !Number.isFinite(l.quantite) || l.quantite < 1)) {
          notify('Chaque quantité doit être un entier ≥ 1', 'error');
          return;
        }
        const ic = formData.infoCommande;
        if (!ic.addresse || !ic.ville || !ic.telephone || !ic.codePostal || !ic.pays) {
          notify('Complétez les informations de livraison', 'error');
          return;
        }
        await createOrder({
          articles: lines.map((l) => ({ articleId: l.articleId, quantite: Math.floor(l.quantite) })),
          infoCommande: {
            adresse: ic.addresse,
            ville: ic.ville,
            telephone: ic.telephone,
            codePostal: ic.codePostal,
            pays: ic.pays,
          },
        });
        notify('Commande créée');
      }

      fetchCommandes();
      fetchStats();
      handleClose();
    } catch (error) {
      notify(mapCreateOrderError(error), 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // 🔹 FILTRAGE
  const filteredCommandes = (Array.isArray(commandes) ? commandes : []).filter(commande => {
    const q = searchTerm.toLowerCase();
    const ville = (commande.infoCommande?.ville ?? '').toLowerCase();
    const status = (commande.statusCommande ?? '').toLowerCase();
    const idStr = commande._id ? String(commande._id).toLowerCase() : '';
    const matchesSearch =
      idStr.includes(q) || ville.includes(q) || status.includes(q);

    const matchesStatus = !statusFilter || commande.statusCommande === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 🔹 TEMPLATES COLONNES
  const statusBodyTemplate = (rowData: ICommande) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Livrée': return 'success';
        case 'Annulée': return 'error';
        case 'En cours': return 'warning';
        case 'Expédiée': return 'info';
        default: return 'default';
      }
    };

    const st = rowData.statusCommande ?? '—';
    return (
      <Chip
        label={st}
        color={getStatusColor(st) as 'success' | 'error' | 'warning' | 'info' | 'default'}
        size="small"
      />
    );
  };

  const priceBodyTemplate = (rowData: ICommande) => (
    <Typography variant="body2" fontWeight="bold">
      {formatMoneyFcfa(rowData.prixTotal)} F
    </Typography>
  );

  const dateBodyTemplate = (rowData: ICommande) => (
    rowData.dateCreation ? new Date(rowData.dateCreation).toLocaleDateString('fr-FR') : '-'
  );

  const actionBodyTemplate = (rowData: ICommande) => (
    <Box>
      <IconButton color="info" onClick={() => handleDetail(rowData)}>
        <VisibilityIcon />
      </IconButton>
      <IconButton color="primary" onClick={() => handleOpen(rowData)}>
        <EditIcon />
      </IconButton>
      <IconButton color="error" onClick={() => handleDelete(rowData)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('infoCommande.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        infoCommande: {
          ...prev.infoCommande,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: ['prixArticles', 'prixLivraison', 'prixTotal'].includes(name)
          ? Number(value) || 0
          : value
      }));
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Livrée': return { bg: alpha(colors.success, 0.1), color: colors.success };
      case 'Annulée': return { bg: alpha(colors.error, 0.08), color: colors.error };
      case 'En cours': return { bg: alpha(colors.warning, 0.1), color: '#B45309' };
      case 'Expédiée': return { bg: alpha(colors.info, 0.1), color: colors.info };
      default: return { bg: colors.bgWarm, color: colors.textMuted };
    }
  };

  const tablePaged = filteredCommandes.slice(tablePage * tableRowsPerPage, (tablePage + 1) * tableRowsPerPage);

  return (
    <Box sx={{ p: 3 }}>

      {/* En-tête */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(colors.primary, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCartIcon sx={{ color: colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Suivez et gérez toutes les commandes clients.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filteredCommandes.length} commande${filteredCommandes.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen(null)} sx={{ borderRadius: 2, px: 2.5 }}>
          Nouvelle commande
        </Button>
      </Stack>

      {/* KPIs */}
      {stats && (
        <Stack direction="row" gap={2} mb={3} flexWrap="wrap">
          {[
            { label: 'Total commandes', value: stats.totalCommandes ?? 0, color: colors.primary },
            { label: "Chiffre d'affaires", value: `${formatMoneyFcfa(stats.revenueTotal)} F`, color: colors.success },
          ].map(({ label, value, color }) => (
            <Paper key={label} elevation={0} sx={{ px: 3, py: 2, border: `1px solid ${colors.border}`, borderRadius: 2, minWidth: 160 }}>
              <Typography variant="h6" fontWeight={700} color={color}>{value}</Typography>
              <Typography variant="caption" color={colors.textSecondary}>{label}</Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Filtres */}
      <Stack direction="row" gap={2} mb={2.5} alignItems="center">
        <TextField size="small" placeholder="Rechercher ID, ville, statut…"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} /></InputAdornment> }}
          sx={{ width: 320 }}
        />
        <TextField select size="small" label="Statut" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">Tous</MenuItem>
          {statusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Stack>

      {/* Tableau */}
      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH_SX, width: 120 }}>ID</TableCell>
                <TableCell sx={TH_SX}>Ville</TableCell>
                <TableCell sx={TH_SX}>Téléphone</TableCell>
                <TableCell sx={{ ...TH_SX, width: 120 }}>Statut</TableCell>
                <TableCell sx={{ ...TH_SX, width: 130 }}>Prix total</TableCell>
                <TableCell sx={{ ...TH_SX, width: 120 }}>Date</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{[1,2,3,4,5,6,7].map(j => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                ))
              ) : tablePaged.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textMuted }}>Aucune commande trouvée</TableCell></TableRow>
              ) : tablePaged.map(c => {
                const sc = statusColor(c.statusCommande);
                return (
                  <TableRow key={c._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.textMuted }}>{String(c._id ?? '').slice(-8)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{c.infoCommande?.ville || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color={colors.textSecondary}>{c.infoCommande?.telephone || '—'}</Typography></TableCell>
                    <TableCell><Chip label={c.statusCommande || '—'} size="small" sx={{ fontSize: '0.72rem', bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} /></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{formatMoneyFcfa(c.prixTotal)} F</Typography></TableCell>
                    <TableCell><Typography variant="body2" color={colors.textSecondary}>{c.dateCreation ? new Date(c.dateCreation).toLocaleDateString('fr-FR') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Détail"><IconButton size="small" onClick={() => handleDetail(c)} sx={{ color: colors.info }}><VisibilityIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                        <Tooltip title="Modifier"><IconButton size="small" onClick={() => handleOpen(c)} sx={{ color: colors.primary }}><EditIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                        <Tooltip title="Supprimer"><IconButton size="small" onClick={() => handleDelete(c)} sx={{ color: colors.error }}><DeleteIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={filteredCommandes.length} page={tablePage} rowsPerPage={tableRowsPerPage}
          onPageChange={(_, p) => setTablePage(p)} onRowsPerPageChange={e => { setTableRowsPerPage(+e.target.value); setTablePage(0); }}
          rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="Par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      {/* 📝 MODAL ÉDITION */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCommande?._id ? "Modifier Commande" : "Nouvelle Commande"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* Informations de livraison */}
            <Typography variant="h6" gutterBottom>
              Informations de livraison
            </Typography>

            <TextField
              label="Adresse"
              name="infoCommande.addresse"
              fullWidth
              value={formData.infoCommande.addresse}
              onChange={handleChange}
            />

            <Box display="flex" gap={2}>
              <TextField
                label="Ville"
                name="infoCommande.ville"
                value={formData.infoCommande.ville}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Code Postal"
                name="infoCommande.codePostal"
                value={formData.infoCommande.codePostal}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box display="flex" gap={2}>
              <TextField
                label="Téléphone"
                name="infoCommande.telephone"
                value={formData.infoCommande.telephone}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Pays"
                name="infoCommande.pays"
                value={formData.infoCommande.pays}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>

            {!selectedCommande?._id && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Articles (catalogue)
                </Typography>
                <Typography variant="caption" color={colors.textMuted} display="block" mb={1}>
                  Prix et vendeur calculés par le serveur — un seul vendeur par commande.
                </Typography>
                {orderLines.map((line, idx) => (
                  <Box key={idx} display="flex" gap={1} alignItems="center" mb={1}>
                    <TextField
                      select
                      label="Article"
                      size="small"
                      value={line.articleId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOrderLines((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, articleId: v } : row)),
                        );
                      }}
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="">— Choisir —</MenuItem>
                      {catalogArticles.map((a) => (
                        <MenuItem key={a._id} value={a._id}>
                          {a.nomArticle} ({a.prixArticle} F, stock {a.quantiteArticle})
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Qté"
                      type="number"
                      size="small"
                      inputProps={{ min: 1 }}
                      value={line.quantite}
                      onChange={(e) => {
                        const q = Math.max(1, Number(e.target.value) || 1);
                        setOrderLines((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, quantite: q } : row)),
                        );
                      }}
                      sx={{ width: 100 }}
                    />
                    <IconButton
                      color="error"
                      size="small"
                      disabled={orderLines.length <= 1}
                      onClick={() => setOrderLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setOrderLines((prev) => [...prev, { articleId: '', quantite: 1 }])}
                >
                  Ajouter une ligne
                </Button>
              </>
            )}

            {selectedCommande?._id && (
              <>
            {/* Informations financières (lecture / admin MAJ statut) */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Informations financières
            </Typography>

            <Box display="flex" gap={2}>
              <TextField
                label="Prix Articles"
                name="prixArticles"
                type="number"
                value={formData.prixArticles}
                InputProps={{ readOnly: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Prix Livraison"
                name="prixLivraison"
                type="number"
                value={formData.prixLivraison}
                InputProps={{ readOnly: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Prix Total"
                name="prixTotal"
                type="number"
                value={formData.prixTotal}
                InputProps={{ readOnly: true }}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              select
              label="Statut"
              name="statusCommande"
              value={formData.statusCommande}
              onChange={handleChange}
              fullWidth
            >
              {statusOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : selectedCommande?._id ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 👁️ MODAL DÉTAIL */}
      <Dialog open={detailModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Détail de la Commande</DialogTitle>
        <DialogContent>
          {selectedCommande && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Typography><strong>ID:</strong> {selectedCommande._id}</Typography>
              <Typography><strong>Statut:</strong> {selectedCommande.statusCommande ?? '—'}</Typography>
              <Typography><strong>Prix Total:</strong> {formatMoneyFcfa(selectedCommande.prixTotal)} F</Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Adresse de livraison
              </Typography>
              <Typography>{selectedCommande.infoCommande?.addresse ?? '—'}</Typography>
              <Typography>
                {selectedCommande.infoCommande?.ville ?? '—'}
                {selectedCommande.infoCommande?.codePostal != null && selectedCommande.infoCommande?.codePostal !== ''
                  ? `, ${selectedCommande.infoCommande.codePostal}`
                  : ''}
              </Typography>
              <Typography>{selectedCommande.infoCommande?.pays ?? '—'}</Typography>
              <Typography><strong>Tél:</strong> {selectedCommande.infoCommande?.telephone ?? '—'}</Typography>

              {(selectedCommande.articles?.length ?? 0) > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Articles
                  </Typography>
                  {selectedCommande.articles.map((a, i) => (
                    <Typography key={i} variant="body2">
                      {a.nom} × {lineQuantite(a)} — {formatMoneyFcfa(a.prix)} F
                      {lineArticleId(a) ? ` (ref. ${String(lineArticleId(a)).slice(-8)})` : ''}
                    </Typography>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CommandesComponent;

