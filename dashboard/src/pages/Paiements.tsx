import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Grid, FormControl, InputLabel, Select, Alert,
  LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Skeleton, Snackbar, Stack, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { apiClient } from '../services/setupApi';
import { colors } from '../tokens/colors';

// ✅ INTERFACES TYPESCRIPT
interface IPaiement {
  _id?: string;
  numeroTransaction: string;
  referenceExterne?: string;
  payeur: string;
  beneficiaire?: string;
  typeObjet: 'COMMANDE' | 'PRESTATION' | 'ABONNEMENT' | 'COMMISSION' | 'REMBOURSEMENT' | 'AUTRE';
  objetId?: string;
  montantOriginal: number;
  montantFrais: number;
  montantNet: number;
  devise: 'XAF' | 'EUR' | 'USD';
  methodePaiement: string;
  statut: 'INITIE' | 'EN_ATTENTE' | 'EN_COURS' | 'VALIDE' | 'ECHEC' | 'ANNULE' | 'REMBOURSE' | 'LITIGE';
  dateInitiation: string;
  dateValidation?: string;
  description: string;
  fournisseurPaiement: string;
  commissionPlateforme: number;
  tauxCommission: number;
  createdAt?: string;
  updatedAt?: string;
}

interface IStatsPaiements {
  totalPaiements: number;
  montantTotal: number;
  paiementsValides: number;
  paiementsEnEchec: number;
  commissionTotale: number;
  statsParMethode: Array<{
    methode: string;
    count: number;
    montant: number;
  }>;
}

const TH_SX = {
  color: colors.textSecondary, fontWeight: 600, fontSize: '0.72rem',
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  backgroundColor: colors.bgWarm, borderBottom: `1px solid ${colors.border}`,
  py: 1.5, px: 2,
};

const Paiements: React.FC = () => {
    const [paiements, setPaiements] = useState<IPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') => setSnack({ open: true, msg, severity });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TOUS');
  const [filterMethode, setFilterMethode] = useState('TOUS');
  const [stats, setStats] = useState<IStatsPaiements | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);

  // ✅ CHARGEMENT DES DONNÉES
  useEffect(() => {
    loadPaiements();
    loadStats();
  }, []);

  const loadPaiements = async () => {
    try {
      setLoading(true);
      setModuleUnavailable(false);
      const response = await apiClient.get(`/paiements`);
      const rows = response.data.paiements ?? response.data;
      setPaiements(Array.isArray(rows) ? rows : []);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setModuleUnavailable(true);
        setPaiements([]);
      } else {
        console.error('Erreur chargement paiements:', error);
        notify('Erreur lors du chargement des paiements', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get(`/paiements/stats`);
      setStats(response.data);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setModuleUnavailable(true);
        setStats(null);
      } else {
        console.error('Erreur chargement stats:', error);
      }
    }
  };

  // ✅ FILTRAGE ET RECHERCHE
  const filteredPaiements = paiements.filter(paiement => {
    const matchesSearch = paiement.numeroTransaction.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paiement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'TOUS' || paiement.statut === filterStatus;
    const matchesMethode = filterMethode === 'TOUS' || paiement.methodePaiement === filterMethode;
    return matchesSearch && matchesStatus && matchesMethode;
  });

  const renderMontant = (montant: number, devise: string) => {
    return `${montant.toLocaleString()} ${devise}`;
  };

  const renderMethodePaiement = (methode: string) => {
    const methodes = {
      'CARTE_VISA': 'Visa',
      'CARTE_MASTERCARD': 'Mastercard',
      'MOBILE_MONEY_MTN': 'MTN Mobile Money',
      'MOBILE_MONEY_ORANGE': 'Orange Money',
      'MOBILE_MONEY_MOOV': 'Moov Money',
      'PAYPAL': 'PayPal',
      'VIREMENT_BANCAIRE': 'Virement',
      'ESPECES': 'Espèces',
      'WALLET_PLATEFORME': 'Wallet Plateforme'
    };

    return methodes[methode as keyof typeof methodes] || methode;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(colors.info, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PaymentIcon sx={{ color: colors.info, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Suivez toutes les transactions financières de la plateforme.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filteredPaiements.length} paiement${filteredPaiements.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="outlined" disabled sx={{ borderRadius: 2, px: 2.5 }}>
          Consultation seule
        </Button>
      </Stack>
      <Box sx={{ mb: 3 }}>
        {moduleUnavailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Module Paiements non encore connecté au backend (routes indisponibles). Aucune donnée fictive n&apos;est affichée.
          </Alert>
        )}
        {!moduleUnavailable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Consultation admin en lecture seule — aucune création, remboursement ou mutation financière depuis le dashboard.
          </Alert>
        )}

        {stats && !moduleUnavailable && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalPaiements}</Typography>
                  <Typography variant="body2">Total Paiements</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{renderMontant(stats.montantTotal, 'XAF')}</Typography>
                  <Typography variant="body2">Montant Total</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.paiementsValides}</Typography>
                  <Typography variant="body2">Validés</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.paiementsEnEchec}</Typography>
                  <Typography variant="body2">Échecs</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{renderMontant(stats.commissionTotale, 'XAF')}</Typography>
                  <Typography variant="body2">Commissions</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* ✅ ONGLETS */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Tous les Paiements" />
          <Tab label="En Attente" />
          <Tab label="Validés" />
          <Tab label="Échecs" />
        </Tabs>
      </Box>

      {/* ✅ BARRE D'OUTILS */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Rechercher par numéro ou description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Statut"
          >
            <MenuItem value="TOUS">Tous</MenuItem>
            <MenuItem value="INITIE">Initiés</MenuItem>
            <MenuItem value="EN_ATTENTE">En attente</MenuItem>
            <MenuItem value="EN_COURS">En cours</MenuItem>
            <MenuItem value="VALIDE">Validés</MenuItem>
            <MenuItem value="ECHEC">Échecs</MenuItem>
            <MenuItem value="ANNULE">Annulés</MenuItem>
            <MenuItem value="REMBOURSE">Remboursés</MenuItem>
            <MenuItem value="LITIGE">En litige</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Méthode</InputLabel>
          <Select
            value={filterMethode}
            onChange={(e) => setFilterMethode(e.target.value)}
            label="Méthode"
          >
            <MenuItem value="TOUS">Toutes</MenuItem>
            <MenuItem value="MOBILE_MONEY_MTN">MTN Mobile Money</MenuItem>
            <MenuItem value="MOBILE_MONEY_ORANGE">Orange Money</MenuItem>
            <MenuItem value="CARTE_VISA">Visa</MenuItem>
            <MenuItem value="CARTE_MASTERCARD">Mastercard</MenuItem>
            <MenuItem value="PAYPAL">PayPal</MenuItem>
            <MenuItem value="VIREMENT_BANCAIRE">Virement</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tableau des paiements */}
      {(() => {
        const statutColor = (s: string) => {
          if (s === 'VALIDE') return { bg: alpha(colors.success, 0.1), color: colors.success };
          if (s === 'ECHEC' || s === 'ANNULE') return { bg: alpha(colors.error, 0.08), color: colors.error };
          if (s === 'EN_COURS' || s === 'EN_ATTENTE') return { bg: alpha(colors.warning, 0.1), color: '#B45309' };
          if (s === 'REMBOURSE') return { bg: alpha(colors.info, 0.1), color: colors.info };
          return { bg: colors.bgWarm, color: colors.textMuted };
        };
        const paged = filteredPaiements.slice(tablePage * tableRowsPerPage, (tablePage + 1) * tableRowsPerPage);
        return (
          <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH_SX}>N° Transaction</TableCell>
                    <TableCell sx={TH_SX}>Payeur</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 120 }}>Montant</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 130 }}>Méthode</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 120 }}>Statut</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 110 }}>Date</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 110 }}>Commission</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>{[1,2,3,4,5,6,7].map(j => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  ) : paged.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textMuted }}>Aucun paiement trouvé</TableCell></TableRow>
                  ) : paged.map(p => {
                    const sc = statutColor(p.statut ?? '');
                    return (
                      <TableRow key={p._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.textMuted }}>{p.numeroTransaction || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{p.payeur || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{renderMontant(p.montantNet, p.devise)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{renderMethodePaiement(p.methodePaiement)}</Typography></TableCell>
                        <TableCell><Chip label={p.statut || '—'} size="small" sx={{ fontSize: '0.72rem', bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} /></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{p.dateInitiation ? new Date(p.dateInitiation).toLocaleDateString('fr-FR') : '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{renderMontant(p.commissionPlateforme, 'XAF')}</Typography></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div" count={filteredPaiements.length} page={tablePage} rowsPerPage={tableRowsPerPage}
              onPageChange={(_, pg) => setTablePage(pg)} onRowsPerPageChange={e => { setTableRowsPerPage(+e.target.value); setTablePage(0); }}
              rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="Par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{ borderTop: `1px solid ${colors.border}` }}
            />
          </Paper>
        );
      })()}

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Paiements;
