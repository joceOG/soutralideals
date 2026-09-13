/**
 * R3-05 — Agents recenseurs (gestion canCreateRecensement sans Postman).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  createFieldAgent,
  FieldAgent,
  FieldAgentFilter,
  generateClientTempPassword,
  listFieldAgents,
  resetAgentPassword,
  setFieldAgentActive,
  setFieldAgentAuthorization,
} from '../services/fieldAgentsApi';
import { clearSession, isCurrentUserAdmin } from '../services/setupApi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function errMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string };
    return data?.error || data?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Erreur inattendue.';
}

const AgentsRecenseurs: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FieldAgentFilter>('authorized');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    password: generateClientTempPassword(),
    authorize: true,
  });
  const [createWarning, setCreateWarning] = useState('');
  const [pendingRetryId, setPendingRetryId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{
    id: string;
    action: 'grant' | 'revoke' | 'activate' | 'deactivate';
    label: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [historyAgent, setHistoryAgent] = useState<FieldAgent | null>(null);

  // Reset MDP
  const [pwdAgent, setPwdAgent] = useState<FieldAgent | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isCurrentUserAdmin()) {
      clearSession();
      navigate('/connexion', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await listFieldAgents({ q: q.trim() || undefined, filter, limit: 100 });
      setAgents(data.agents || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearSession();
        navigate('/connexion', { replace: true });
        return;
      }
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, filter, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      password: generateClientTempPassword(),
      authorize: true,
    });
    setCreateWarning('');
    setPendingRetryId(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateWarning('');
    setError('');
    setSuccess('');
    try {
      const res = await createFieldAgent({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        authorize: form.authorize,
        phoneCountry: 'CI',
      });

      if (form.authorize && !res.authorizationGranted) {
        setCreateWarning(
          res.authorizationError ||
            'Compte créé, mais autorisation de recensement non activée.',
        );
        setPendingRetryId(res.agent.id);
        setSuccess(
          `Compte créé (${res.agent.telephone}). Autorisation à réessayer.`,
        );
      } else {
        setSuccess(res.message);
        setCreateOpen(false);
      }
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const retryAuthorize = async () => {
    if (!pendingRetryId) return;
    setCreating(true);
    try {
      const res = await setFieldAgentAuthorization(pendingRetryId, true);
      setSuccess(res.message);
      setCreateWarning('');
      setPendingRetryId(null);
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateWarning(
        `Compte créé, mais autorisation de recensement non activée. ${errMessage(err)}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusyId(confirm.id);
    setError('');
    try {
      if (confirm.action === 'grant' || confirm.action === 'revoke') {
        const res = await setFieldAgentAuthorization(
          confirm.id,
          confirm.action === 'grant',
        );
        setSuccess(res.message);
      } else {
        const res = await setFieldAgentActive(
          confirm.id,
          confirm.action === 'activate',
        );
        setSuccess(res.message);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Agents recenseurs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Autorisez les agents terrain sans Postman ni MongoDB. Rôle technique :
            Client — capacité : recensement.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: '#0B7A3B', '&:hover': { bgcolor: '#086330' } }}
        >
          Nouvel agent
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            label="Rechercher"
            placeholder="Nom ou téléphone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Filtre"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FieldAgentFilter)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="authorized">Autorisés</MenuItem>
            <MenuItem value="unauthorized">Non autorisés (Client)</MenuItem>
            <MenuItem value="inactive">Comptes inactifs</MenuItem>
            <MenuItem value="all">Tous les Client</MenuItem>
          </TextField>
          <IconButton onClick={() => void load()} aria-label="Actualiser">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Chargement…' : `${total} résultat(s)`}
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Agent</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Recenseur autorisé</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && agents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Aucun agent trouvé. Créez un agent ou élargissez le filtre.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {agents.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>
                    {a.prenom} {a.nom}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.label}
                    {a.email ? ` · ${a.email}` : ''}
                  </Typography>
                </TableCell>
                <TableCell>{a.telephone || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={a.isActive ? 'Actif' : 'Inactif'}
                    color={a.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={a.canCreateRecensement ? 'Oui' : 'Non'}
                    color={a.canCreateRecensement ? 'success' : 'warning'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                    {a.canCreateRecensement ? (
                      <Button
                        size="small"
                        color="warning"
                        disabled={busyId === a.id}
                        onClick={() =>
                          setConfirm({
                            id: a.id,
                            action: 'revoke',
                            label: `${a.prenom} ${a.nom}`,
                          })
                        }
                      >
                        Suspendre
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busyId === a.id}
                        sx={{ bgcolor: '#0B7A3B' }}
                        onClick={() =>
                          setConfirm({
                            id: a.id,
                            action: 'grant',
                            label: `${a.prenom} ${a.nom}`,
                          })
                        }
                      >
                        Autoriser
                      </Button>
                    )}
                    <Button
                      size="small"
                      onClick={() =>
                        setConfirm({
                          id: a.id,
                          action: a.isActive ? 'deactivate' : 'activate',
                          label: `${a.prenom} ${a.nom}`,
                        })
                      }
                    >
                      {a.isActive ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => { setPwdAgent(a); setNewPwd(generateClientTempPassword()); }}
                    >
                      MDP
                    </Button>
                    <Button size="small" onClick={() => setHistoryAgent(a)}>
                      Historique
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Création */}
      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nouvel agent recenseur</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Formulaire court. Le rôle technique reste Client ; cochez l’autorisation
              terrain pour qu’il puisse travailler immédiatement.
            </Typography>
            {createWarning && (
              <Alert
                severity="warning"
                action={
                  pendingRetryId ? (
                    <Button color="inherit" size="small" onClick={() => void retryAuthorize()}>
                      Réessayer l’autorisation
                    </Button>
                  ) : undefined
                }
              >
                {createWarning}
              </Alert>
            )}
            <TextField
              required
              label="Nom"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            />
            <TextField
              required
              label="Prénom"
              value={form.prenom}
              onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
            />
            <TextField
              required
              label="Téléphone"
              placeholder="07 XX XX XX XX"
              helperText="Obligatoire — format CI"
              value={form.telephone}
              onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
            />
            <TextField
              label="Email"
              helperText="Facultatif"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              required
              label="Mot de passe temporaire"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              helperText="Communiquez-le à l’agent de façon sécurisée."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.authorize}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, authorize: e.target.checked }))
                  }
                  color="success"
                />
              }
              label="Autoriser cette personne à effectuer des recensements"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Fermer
          </Button>
          {!pendingRetryId && (
            <Button
              variant="contained"
              onClick={() => void handleCreate()}
              disabled={creating}
              sx={{ bgcolor: '#0B7A3B' }}
            >
              {creating ? 'Création…' : 'Créer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Confirmer</DialogTitle>
        <DialogContent>
          {confirm?.action === 'grant' && (
            <Typography>
              Autoriser <strong>{confirm.label}</strong> à effectuer des recensements
              terrain ?
            </Typography>
          )}
          {confirm?.action === 'revoke' && (
            <Typography>
              Suspendre l’autorisation de recensement pour{' '}
              <strong>{confirm.label}</strong> ? Le compte reste existant.
            </Typography>
          )}
          {confirm?.action === 'deactivate' && (
            <Typography>
              Désactiver le compte de <strong>{confirm.label}</strong> (plus de
              connexion) ?
            </Typography>
          )}
          {confirm?.action === 'activate' && (
            <Typography>
              Réactiver le compte de <strong>{confirm.label}</strong> ?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Annuler</Button>
          <Button variant="contained" onClick={() => void runConfirm()}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset mot de passe */}
      <Dialog open={!!pwdAgent} onClose={() => !pwdBusy && setPwdAgent(null)} fullWidth maxWidth="xs">
        <DialogTitle>Changer le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nouveau mot de passe pour <strong>{pwdAgent?.prenom} {pwdAgent?.nom}</strong>.
            Communiquez-le à l'agent.
          </Typography>
          <TextField
            fullWidth
            label="Nouveau mot de passe"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            helperText="Minimum 8 caractères"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPwdAgent(null)} disabled={pwdBusy}>Annuler</Button>
          <Button
            variant="contained"
            disabled={pwdBusy || newPwd.length < 8}
            onClick={async () => {
              if (!pwdAgent) return;
              setPwdBusy(true);
              try {
                await resetAgentPassword(pwdAgent.id, newPwd);
                setSuccess(`Mot de passe mis à jour pour ${pwdAgent.prenom} ${pwdAgent.nom}.`);
                setPwdAgent(null);
              } catch (err) {
                setError(errMessage(err));
              } finally {
                setPwdBusy(false);
              }
            }}
          >
            {pwdBusy ? 'Mise à jour…' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Historique */}
      <Dialog
        open={!!historyAgent}
        onClose={() => setHistoryAgent(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Historique — {historyAgent?.prenom} {historyAgent?.nom}
        </DialogTitle>
        <DialogContent>
          {(historyAgent?.permissionHistory?.length || 0) === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune entrée d’autorisation pour le moment.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {historyAgent?.permissionHistory.map((h, i) => (
                <Paper key={`${h.at}-${i}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography fontWeight={600}>
                    {h.action === 'grant' ? 'Autorisation accordée' : 'Autorisation retirée'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {h.byAdminLabel} ·{' '}
                    {h.at ? new Date(h.at).toLocaleString('fr-FR') : '—'}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryAgent(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgentsRecenseurs;
