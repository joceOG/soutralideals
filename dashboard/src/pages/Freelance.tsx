// src/pages/Freelance.tsx
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
import WorkIcon from '@mui/icons-material/Work';
import VerifiedIcon from '@mui/icons-material/Verified';
import { apiClient } from '../services/setupApi';
import { colors } from '../tokens/colors';
import { FreelanceFormDialog } from '../components/freelance/FreelanceFormDialog';
import { stripFreelanceListRow } from '../services/freelanceService';

export interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface IFreelanceData {
  _id?: string;
  utilisateur?: IUtilisateur;
  name: string;
  job: string;
  category: string;
  imagePath?: string;
  rating: number;
  isTopRated: boolean;
  skills: string[];
  hourlyRate: number;
  location: string;
  availabilityStatus: string;
  verificationDocuments?: {
    isVerified?: boolean;
    cni1?: boolean | string;
    cni2?: boolean | string;
    selfie?: boolean | string;
  };
}

function normalizeFreelancesPayload(data: unknown): IFreelanceData[] {
  let rows: IFreelanceData[] = [];
  if (Array.isArray(data)) rows = data as IFreelanceData[];
  else if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { freelances?: unknown }).freelances)
  ) {
    rows = (data as { freelances: IFreelanceData[] }).freelances;
  }
  return rows.map((r) => stripFreelanceListRow(r) as IFreelanceData);
}

const FreelanceComponent: React.FC = () => {
  const [freelances, setFreelances] = useState<IFreelanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
  const [tableSearch, setTableSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  const fetchFreelances = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/freelance`, {
        params: { page: 1, limit: 200 },
      });
      setFreelances(normalizeFreelancesPayload(response.data));
    } catch {
      setFreelances([]);
      notify('Erreur lors du chargement des freelances', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFreelances();
  }, [fetchFreelances]);

  const onDelete = async (rowData: IFreelanceData) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce freelance ?')) return;
    try {
      await apiClient.delete(`/freelance/${rowData._id}`);
      setFreelances((prev) => prev.filter((item) => item._id !== rowData._id));
      notify('Freelance supprimé avec succès.');
    } catch {
      notify('Erreur lors de la suppression.', 'error');
    }
  };

  const onEdit = (row: IFreelanceData) => {
    setEditId(row._id ?? null);
    setFormOpen(true);
  };

  const onAdd = () => {
    setEditId(null);
    setFormOpen(true);
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

  const tableFiltered = freelances.filter((f) => {
    const q = tableSearch.toLowerCase();
    return (
      !q ||
      f.name?.toLowerCase().includes(q) ||
      f.job?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q) ||
      f.location?.toLowerCase().includes(q)
    );
  });
  const tablePaged = tableFiltered.slice(
    tablePage * tableRowsPerPage,
    (tablePage + 1) * tableRowsPerPage,
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(colors.primary, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WorkIcon sx={{ color: colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Gérez les profils des travailleurs indépendants.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${tableFiltered.length} freelance${tableFiltered.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} sx={{ borderRadius: 2, px: 2.5 }}>
          Ajouter un freelance
        </Button>
      </Stack>

      <TextField
        size="small"
        placeholder="Rechercher nom, métier, catégorie…"
        value={tableSearch}
        onChange={(e) => {
          setTableSearch(e.target.value);
          setTablePage(0);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2.5, width: 360 }}
      />

      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH, width: 48 }}>#</TableCell>
                <TableCell sx={TH}>Freelance</TableCell>
                <TableCell sx={TH}>Métier</TableCell>
                <TableCell sx={TH}>Localisation</TableCell>
                <TableCell sx={{ ...TH, width: 120 }}>Tarif/h</TableCell>
                <TableCell sx={TH}>Dispo</TableCell>
                <TableCell sx={TH}>Vérification</TableCell>
                <TableCell sx={TH}>Compétences</TableCell>
                <TableCell sx={{ ...TH, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tablePaged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun freelance trouvé
                  </TableCell>
                </TableRow>
              ) : (
                tablePaged.map((f, idx) => {
                  const initials = `${(f.name?.[0] ?? '').toUpperCase()}`;
                  const isDispo = f.availabilityStatus === 'Disponible';
                  const verified = Boolean(f.verificationDocuments?.isVerified);
                  return (
                    <TableRow key={f._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ color: colors.textMuted, fontSize: '0.8rem', pl: 2 }}>
                        {tablePage * tableRowsPerPage + idx + 1}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                          {f.imagePath ? (
                            <Avatar src={f.imagePath} sx={{ width: 32, height: 32 }} />
                          ) : (
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 13,
                                bgcolor: alpha(colors.primary, 0.12),
                                color: colors.primary,
                              }}
                            >
                              {initials}
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {f.name || '—'}
                            </Typography>
                            <Typography variant="caption" color={colors.textMuted}>
                              {f.category || ''}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{f.job || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={colors.textSecondary}>
                          {f.location || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {(f.hourlyRate || 0).toLocaleString()} F/h
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={f.availabilityStatus || 'N/A'}
                          size="small"
                          sx={{
                            fontSize: '0.72rem',
                            bgcolor: isDispo ? alpha(colors.success, 0.1) : alpha(colors.error, 0.08),
                            color: isDispo ? colors.success : colors.error,
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {verified ? (
                          <Chip
                            icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                            label="Vérifié"
                            size="small"
                            sx={{ fontSize: '0.72rem', bgcolor: alpha(colors.success, 0.08) }}
                          />
                        ) : (
                          <Chip label="En attente" size="small" sx={{ fontSize: '0.72rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {(f.skills || []).slice(0, 2).map((s, i) => (
                            <Chip
                              key={i}
                              label={s}
                              size="small"
                              sx={{
                                fontSize: '0.68rem',
                                height: 20,
                                bgcolor: alpha(colors.info, 0.08),
                                color: colors.info,
                              }}
                            />
                          ))}
                          {(f.skills || []).length > 2 && (
                            <Chip label={`+${f.skills.length - 2}`} size="small" sx={{ fontSize: '0.68rem', height: 20 }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => onEdit(f)} sx={{ color: colors.primary }}>
                              <EditIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => onDelete(f)} sx={{ color: colors.error }}>
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
          count={tableFiltered.length}
          page={tablePage}
          rowsPerPage={tableRowsPerPage}
          onPageChange={(_, p) => setTablePage(p)}
          onRowsPerPageChange={(e) => {
            setTableRowsPerPage(+e.target.value);
            setTablePage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      <FreelanceFormDialog
        open={formOpen}
        freelanceId={editId}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          notify(editId ? 'Freelance mis à jour.' : 'Freelance créé.');
          fetchFreelances();
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FreelanceComponent;
