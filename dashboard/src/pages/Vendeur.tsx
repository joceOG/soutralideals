import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Avatar,
  Chip,
  Skeleton,
  Snackbar,
  Alert,
  Tooltip,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Link as RouterLink } from 'react-router-dom';
import { apiClient } from '../services/setupApi';
import { colors } from '../tokens/colors';
import { VendeurFormDialog, VendeurPostCreateHint } from '../components/vendeur/VendeurFormDialog';
import { stripVendeurListRow } from '../services/vendeurService';

export interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  telephone?: string;
}

export interface IVendeurRow {
  _id?: string;
  utilisateur?: IUtilisateur;
  shopName: string;
  shopDescription?: string;
  shopLogo?: string;
  businessType: string;
  businessCategories: string[];
  businessAddress?: { city?: string; country?: string };
  accountStatus?: string;
  status?: string;
  articleCount?: number;
  verificationDocuments?: {
    isVerified?: boolean;
    cni1?: boolean | string;
    businessLicense?: boolean | string;
  };
}

function normalizeVendeursPayload(data: unknown): IVendeurRow[] {
  let rows: IVendeurRow[] = [];
  if (Array.isArray(data)) rows = data as IVendeurRow[];
  else if (data && typeof data === 'object' && Array.isArray((data as { vendeurs?: unknown }).vendeurs)) {
    rows = (data as { vendeurs: IVendeurRow[] }).vendeurs;
  }
  return rows.map((r) => stripVendeurListRow(r) as IVendeurRow);
}

const VendeurComponent: React.FC = () => {
  const [vendeurs, setVendeurs] = useState<IVendeurRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
  const [tableSearch, setTableSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  const fetchVendeurs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vendeur', { params: { page: 1, limit: 200 } });
      setVendeurs(normalizeVendeursPayload(response.data));
    } catch {
      setVendeurs([]);
      notify('Erreur lors du chargement des vendeurs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendeurs();
  }, [fetchVendeurs]);

  const onDelete = async (row: IVendeurRow) => {
    if (!window.confirm('Supprimer ce vendeur ?')) return;
    try {
      await apiClient.delete(`/vendeur/${row._id}`);
      setVendeurs((prev) => prev.filter((v) => v._id !== row._id));
      notify('Vendeur supprimé.');
    } catch {
      notify('Erreur lors de la suppression.', 'error');
    }
  };

  const TH = {
    color: colors.textSecondary,
    fontWeight: 600,
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    backgroundColor: colors.bgWarm,
    borderBottom: `1px solid ${colors.border}`,
    py: 1.5,
    px: 2,
  };

  const filtered = vendeurs.filter((v) => {
    const q = tableSearch.toLowerCase();
    return (
      !q ||
      v.shopName?.toLowerCase().includes(q) ||
      v.businessType?.toLowerCase().includes(q) ||
      v.businessAddress?.city?.toLowerCase().includes(q) ||
      v.utilisateur?.nom?.toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice(tablePage * tableRowsPerPage, (tablePage + 1) * tableRowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: alpha(colors.primary, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StorefrontIcon sx={{ color: colors.primary }} />
          </Box>
          <Box>
            <Typography variant="body2" color={colors.textSecondary}>
              Profils vendeurs et vitrines E‑marché (produits dans Articles, ventes dans Commandes).
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filtered.length} vendeur${filtered.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setFormOpen(true); }}>
          Créer un vendeur
        </Button>
      </Stack>

      {lastCreatedId ? <VendeurPostCreateHint vendeurId={lastCreatedId} /> : null}

      <TextField
        size="small"
        placeholder="Rechercher boutique, type, ville…"
        value={tableSearch}
        onChange={(e) => { setTableSearch(e.target.value); setTablePage(0); }}
        sx={{ mb: 2, width: 360 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={TH}>Boutique</TableCell>
                <TableCell sx={TH}>Propriétaire</TableCell>
                <TableCell sx={TH}>Type</TableCell>
                <TableCell sx={TH}>Localisation</TableCell>
                <TableCell sx={TH}>Articles</TableCell>
                <TableCell sx={TH}>Statut</TableCell>
                <TableCell sx={TH}>Vérification</TableCell>
                <TableCell sx={{ ...TH, width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun vendeur
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((v) => {
                  const verified = Boolean(v.verificationDocuments?.isVerified);
                  const owner = v.utilisateur
                    ? `${v.utilisateur.prenom ?? ''} ${v.utilisateur.nom ?? ''}`.trim()
                    : '—';
                  return (
                    <TableRow key={v._id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1}>
                          {v.shopLogo ? (
                            <Avatar src={v.shopLogo} variant="rounded" sx={{ width: 32, height: 32 }} />
                          ) : (
                            <Avatar variant="rounded" sx={{ width: 32, height: 32, fontSize: 12 }}>
                              {(v.shopName?.[0] ?? 'B').toUpperCase()}
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{v.shopName}</Typography>
                            <Typography variant="caption" color={colors.textMuted}>
                              {(v.businessCategories || []).slice(0, 2).join(', ')}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="body2">{owner}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{v.businessType}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{v.businessAddress?.city ?? '—'}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {typeof v.articleCount === 'number' ? v.articleCount : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={v.accountStatus || v.status || '—'} size="small" sx={{ fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell>
                        {verified ? (
                          <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Vérifié" size="small" />
                        ) : (
                          <Chip label="En attente" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row">
                          <Tooltip title="Gérer les articles">
                            <IconButton
                              size="small"
                              component={RouterLink}
                              to={`/article?vendeur=${v._id}`}
                              sx={{ color: colors.warning }}
                            >
                              <Inventory2Icon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => { setEditId(v._id ?? null); setFormOpen(true); }}>
                              <EditIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => onDelete(v)}>
                              <DeleteIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={tablePage}
          rowsPerPage={tableRowsPerPage}
          onPageChange={(_, p) => setTablePage(p)}
          onRowsPerPageChange={(e) => { setTableRowsPerPage(+e.target.value); setTablePage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      <VendeurFormDialog
        open={formOpen}
        vendeurId={editId}
        onClose={() => setFormOpen(false)}
        onSuccess={(saved) => {
          notify(editId ? 'Vendeur mis à jour.' : 'Vendeur créé.');
          if (!editId && saved._id) setLastCreatedId(String(saved._id));
          fetchVendeurs();
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default VendeurComponent;
