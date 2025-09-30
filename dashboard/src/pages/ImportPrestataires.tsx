import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CloudUpload, CheckCircle } from '@mui/icons-material';
import Papa from 'papaparse';

interface PrestataireData {
  nom: string;
  telephone: string;
  metier: string;
  latitude: number;
  longitude: number;
  ville: string;
  quartier: string;
  horaires: string;
}

interface ImportResult {
  success: number;
  errors: string[];
  duplicates: PrestataireData[];
  total: number;
}

const ImportPrestataires: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PrestataireData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // ✅ RÉCUPÉRATION des données persistées au chargement
  React.useEffect(() => {
    const savedData = localStorage.getItem('csvImportData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setPreviewData(parsedData);
        console.log('🔄 Données récupérées depuis localStorage:', parsedData.length);
      } catch (error) {
        console.error('Erreur récupération localStorage:', error);
      }
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setCsvFile(file);
      parseCSV(file);
    } else {
      alert('Veuillez sélectionner un fichier CSV ou Excel valide');
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 0, // ✅ Charger TOUTES les lignes (pas de limite)
      complete: (results) => {
        console.log('📊 Résultats parsing:', results);
        console.log('📋 Colonnes détectées:', results.meta.fields);
        console.log('📄 Première ligne:', results.data[0]);
        console.log('📊 Total lignes chargées:', results.data.length);
        console.log('📊 Dernière ligne:', results.data[results.data.length - 1]);
        console.log('📊 Taille du fichier:', file.size, 'bytes');
        console.log('📊 Dernière ligne:', results.data[results.data.length - 1]);
        console.log('📊 Taille du fichier:', file.size, 'bytes');
        
        // Mapping des colonnes détectées vers les colonnes attendues
        const detectedColumns = results.meta.fields || [];
        console.log('🔍 Colonnes détectées:', detectedColumns);
        
        // Mapping spécifique pour votre structure de 8 colonnes
        const columnMapping = {
          nom: detectedColumns.find(col => 
            col.toLowerCase().includes('nom et') ||
            col.toLowerCase().includes('nom et prénoms') ||
            col.toLowerCase().includes('nom') ||
            col.toLowerCase().includes('prénom') ||
            col.toLowerCase().includes('prénoms')
          ),
          telephone: detectedColumns.find(col => 
            col.toLowerCase().includes('numéro de') ||
            col.toLowerCase().includes('numero de') ||
            col.toLowerCase().includes('téléphone') || 
            col.toLowerCase().includes('telephone') ||
            col.toLowerCase().includes('numéro') ||
            col.toLowerCase().includes('numero')
          ),
          metier: detectedColumns.find(col => 
            col.toLowerCase().includes('métier') || 
            col.toLowerCase().includes('metier') ||
            col.toLowerCase().includes('métiers') ||
            col.toLowerCase().includes('metiers') ||
            col.toLowerCase().includes('profession') ||
            col.toLowerCase().includes('activité') ||
            col.toLowerCase().includes('activite')
          ),
          latitude: detectedColumns.find(col => 
            col.toLowerCase().includes('latitude') || 
            col.toLowerCase().includes('lat')
          ),
          longitude: detectedColumns.find(col => 
            col.toLowerCase().includes('longitude') || 
            col.toLowerCase().includes('long') ||
            col.toLowerCase().includes('longitud')
          ),
          ville: detectedColumns.find(col => 
            col.toLowerCase().includes('la ville') ||
            col.toLowerCase().includes('ville')
          ),
          quartier: detectedColumns.find(col => 
            col.toLowerCase().includes('la comr') ||
            col.toLowerCase().includes('comr') ||
            col.toLowerCase().includes('commune') ||
            col.toLowerCase().includes('quartier')
          ),
          horaires: detectedColumns.find(col => 
            col.toLowerCase().includes('horaire') || 
            col.toLowerCase().includes('horaires') ||
            col.toLowerCase().includes('plage') ||
            col.toLowerCase().includes('ouverture') ||
            col.toLowerCase().includes('disponibilité') ||
            col.toLowerCase().includes('disponibilite')
          )
        };
        
        console.log('🗺️ Mapping des colonnes:', columnMapping);
        
        // Debug détaillé du mapping
        console.log('📊 Détail du mapping:');
        Object.entries(columnMapping).forEach(([key, value]) => {
          console.log(`  ${key}: ${value || 'NON TROUVÉ'}`);
        });
        
        // Vérifier les colonnes essentielles (seulement GPS obligatoires)
        const essentialColumns = ['latitude', 'longitude'];
        const missingEssential = essentialColumns.filter(col => !columnMapping[col as keyof typeof columnMapping]);
        
        if (missingEssential.length > 0) {
          console.error('❌ Colonnes manquantes:', missingEssential);
          console.error('📋 Colonnes détectées:', detectedColumns);
          console.error('🗺️ Mapping complet:', columnMapping);
          
          alert(`❌ ERREUR DE MAPPING\n\nColonnes manquantes: ${missingEssential.join(', ')}\n\nColonnes détectées dans votre fichier:\n${detectedColumns.map((col, i) => `${i + 1}. "${col}"`).join('\n')}\n\nMapping actuel:\n${Object.entries(columnMapping).map(([key, value]) => `${key}: ${value || 'NON TROUVÉ'}`).join('\n')}\n\nVérifiez que vos colonnes correspondent exactement à la structure attendue.`);
          return;
        }
        
        // Transformer les données avec le mapping - Adapté pour votre structure
        const transformedData = results.data.map((row: any, index: number) => {
          // Récupérer les valeurs des colonnes mappées
          const nom = row[columnMapping.nom || ''] || '';
          const telephone = row[columnMapping.telephone || ''] || '';
          const metier = row[columnMapping.metier || ''] || '';
          const latitudeRaw = row[columnMapping.latitude || ''] || '';
          const longitudeRaw = row[columnMapping.longitude || ''] || '';
          const ville = row[columnMapping.ville || ''] || 'À définir';
          const quartier = row[columnMapping.quartier || ''] || 'À définir';
          const horaires = row[columnMapping.horaires || ''] || '';
          
          // Corriger les coordonnées GPS (remplacer virgule par point)
          const latitude = parseFloat(latitudeRaw.toString().replace(',', '.')) || 0;
          const longitude = parseFloat(longitudeRaw.toString().replace(',', '.')) || 0;
          
          // Debug pour les premières lignes
          if (index < 3) {
            console.log(`📋 Ligne ${index + 1}:`, {
              nom, telephone, metier, 
              latitudeRaw, longitudeRaw, // Valeurs brutes
              latitude, longitude, // Valeurs transformées
              ville, quartier, horaires
            });
          }
          
          return {
            // Nom avec valeur par défaut si vide
            nom: nom.trim() || `Prestataire ${index + 1}`,
            // Téléphone avec valeur par défaut si vide
            telephone: telephone.toString().trim() || 'Non renseigné',
            // Métier avec valeur par défaut si vide
            metier: metier.trim() || 'Service général',
            // Coordonnées GPS corrigées
            latitude: latitude,
            longitude: longitude,
            ville: ville.trim() || 'À définir',
            quartier: quartier.trim() || 'À définir',
            horaires: horaires.trim() || '8h-18h'
          };
        });
        
        console.log('✅ Données transformées:', transformedData.slice(0, 3));
        console.log('📊 TOTAL DONNÉES TRANSFORMÉES:', transformedData.length);
        
        const data = transformedData as PrestataireData[];
        console.log('📊 AVANT setPreviewData - data.length:', data.length);
        
        // ✅ PERSISTANCE dans localStorage
        localStorage.setItem('csvImportData', JSON.stringify(data));
        console.log('💾 Données sauvegardées dans localStorage');
        
        setPreviewData(data);
        console.log('📊 APRÈS setPreviewData - previewData sera:', data.length);
      },
      error: (error) => {
        console.error('Erreur parsing CSV:', error);
        alert('Erreur lors de la lecture du fichier CSV: ' + error.message);
      }
    });
  };

  const validateData = (data: PrestataireData[]): string[] => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const lineNumber = index + 2; // +2 car index 0 = ligne 2 (après header)
      
      // Nom optionnel - utiliser une valeur par défaut si vide
      if (!row.nom?.trim()) {
        console.log(`Ligne ${lineNumber}: Nom vide, utilisation de la valeur par défaut`);
      }
      
      // Téléphone optionnel - utiliser une valeur par défaut si vide
      if (!row.telephone?.trim()) {
        console.log(`Ligne ${lineNumber}: Téléphone vide, utilisation de la valeur par défaut`);
      }
      
      // Métier optionnel - utiliser une valeur par défaut si vide
      if (!row.metier?.trim()) {
        // Pas d'erreur, on utilisera une valeur par défaut
        console.log(`Ligne ${lineNumber}: Métier vide, utilisation de la valeur par défaut`);
      }
      
      // Validation GPS plus flexible - ignorer les lignes avec coordonnées vides
      if (row.latitude && row.longitude && (isNaN(Number(row.latitude)) || isNaN(Number(row.longitude)) || Number(row.latitude) === 0 || Number(row.longitude) === 0)) {
        errors.push(`Ligne ${lineNumber}: Coordonnées GPS invalides (lat: ${row.latitude}, lng: ${row.longitude})`);
      }
      
      // Horaires optionnels - utiliser une valeur par défaut si vide
      if (!row.horaires?.trim()) {
        // Pas d'erreur, on utilisera une valeur par défaut
        console.log(`Ligne ${lineNumber}: Horaires vides, utilisation de la valeur par défaut`);
      }
    });
    
    return errors;
  };

  const handleImport = async () => {
    if (!csvFile || previewData.length === 0) return;
    
    setImporting(true);
    setProgress(0);
    
    try {
      // Validation des données
      const validationErrors = validateData(previewData);
      if (validationErrors.length > 0) {
        setImportResult({
          success: 0,
          errors: validationErrors,
          duplicates: [],
          total: previewData.length
        });
        setShowResults(true);
        setImporting(false);
        return;
      }

      // Import réel par lots
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < previewData.length; i += batchSize) {
        batches.push(previewData.slice(i, i + batchSize));
      }

      let successCount = 0;
      const errors: string[] = [];
      const duplicates: PrestataireData[] = [];

      console.log(`📦 Nombre de lots à traiter: ${batches.length}`);
      console.log(`📊 Total prestataires à importer: ${previewData.length}`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔄 Traitement du lot ${i + 1}/${batches.length} (${batch.length} prestataires)`);
        
        // ✅ Délai entre les requêtes pour éviter le rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms de délai
        }
        
        try {
          // Appel API réel vers le backend
          const response = await fetch('http://localhost:3000/api/prestataires/import-csv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              csvData: batch,
              clearExisting: i === 0 // Nettoyer seulement au premier lot
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`📊 Réponse backend lot ${i + 1}:`, result);
            // ✅ Corriger l'accès à la propriété success
            const lotSuccessCount = result.results?.success || batch.length;
            successCount += lotSuccessCount;
            console.log(`✅ Lot ${i + 1}/${batches.length} terminé: ${lotSuccessCount} succès`);
            
            if (result.errors && result.errors.length > 0) {
              errors.push(`Lot ${i + 1}: ${result.errors.length} erreurs`);
            }
          } else {
            // ❌ Ne pas compter les échecs comme succès
            console.log(`❌ Lot ${i + 1}/${batches.length} échoué: ${response.status}`);
            errors.push(`Lot ${i + 1}: Erreur HTTP ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ Lot ${i + 1}/${batches.length} erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          // ✅ Ne pas compter comme succès en cas d'erreur
          errors.push(`Lot ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
        
        setProgress(((i + 1) / batches.length) * 100);
      }

      setImportResult({
        success: successCount,
        errors,
        duplicates,
        total: previewData.length
      });
      
      setShowResults(true);
      
      // Afficher un message de succès
      console.log(`🎉 Import terminé: ${successCount} prestataires importés avec succès !`);
      
    } catch (error) {
      console.error('Erreur import:', error);
      setImportResult({
        success: 0,
        errors: [`Erreur lors de l'import: ${error}`],
        duplicates: [],
        total: previewData.length
      });
      setShowResults(true);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setCsvFile(null);
    setPreviewData([]);
    setImportResult(null);
    setShowResults(false);
    setProgress(0);
    // ✅ Nettoyer le localStorage
    localStorage.removeItem('csvImportData');
    console.log('🧹 localStorage nettoyé');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Import Prestataires CSV
      </Typography>
      
      <Card>
        <CardHeader title="Étape 1: Sélection du fichier CSV" />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                Sélectionner le fichier CSV
              </Button>
            </label>
          </Box>
          
          {csvFile && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Fichier sélectionné: {csvFile.name} ({csvFile.size} bytes)
            </Alert>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardHeader 
            title={`Étape 2: Prévisualisation (${previewData.length} prestataires)`}
            action={
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing}
                startIcon={importing ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {importing ? 'Import en cours...' : 'Lancer l\'import'}
              </Button>
            }
          />
          <CardContent>
            {importing && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Progression: {Math.round(progress)}%
                </Typography>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            )}
            
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Métier</TableCell>
                    <TableCell>Ville</TableCell>
                    <TableCell>Quartier</TableCell>
                    <TableCell>Horaires</TableCell>
                    <TableCell>GPS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData
                    .slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
                    .map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.nom}</TableCell>
                      <TableCell>{row.telephone}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.metier} 
                          color="primary" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{row.ville}</TableCell>
                      <TableCell>{row.quartier}</TableCell>
                      <TableCell>{row.horaires}</TableCell>
                      <TableCell>
                        {row.latitude}, {row.longitude}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Lignes par page</InputLabel>
                <Select
                  value={rowsPerPage}
                  label="Lignes par page"
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                >
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                </Select>
              </FormControl>
              
              <TablePagination
                component="div"
                count={previewData.length}
                page={currentPage}
                onPageChange={(event, newPage) => setCurrentPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setCurrentPage(0);
                }}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
                }
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Affichage des résultats persistants */}
      {importResult && !showResults && (
        <Card sx={{ mt: 2, bgcolor: 'success.light' }}>
          <CardHeader 
            title="Import terminé avec succès !"
            avatar={<CheckCircle color="success" />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="h4" color="success.contrastText" align="center">
                  {importResult.success}
                </Typography>
                <Typography variant="body2" color="success.contrastText" align="center">
                  Prestataires importés
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="error.contrastText" align="center">
                  {importResult.errors.length}
                </Typography>
                <Typography variant="body2" color="error.contrastText" align="center">
                  Erreurs
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="warning.contrastText" align="center">
                  {importResult.duplicates.length}
                </Typography>
                <Typography variant="body2" color="warning.contrastText" align="center">
                  Doublons
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setShowResults(true)}
                  fullWidth
                >
                  Voir détails
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Dialog des résultats */}
      <Dialog 
        open={showResults} 
        onClose={() => setShowResults(false)} 
        maxWidth="xl" 
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            height: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" />
            Résultats de l'import
          </Box>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
          {importResult && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                    <Typography variant="h4" color="success.contrastText">
                      {importResult.success}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Succès
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                    <Typography variant="h4" color="error.contrastText">
                      {importResult.errors.length}
                    </Typography>
                    <Typography variant="body2" color="error.contrastText">
                      Erreurs
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                    <Typography variant="h4" color="warning.contrastText">
                      {importResult.duplicates.length}
                    </Typography>
                    <Typography variant="body2" color="warning.contrastText">
                      Doublons
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Message de succès */}
              {importResult.success > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    🎉 Import réussi ! {importResult.success} prestataires ont été importés dans la base de données.
                  </Typography>
                  <Typography variant="body2">
                    Les prestataires sont maintenant disponibles dans le système et peuvent être validés via le dashboard.
                  </Typography>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Erreurs détectées ({importResult.errors.length}):
                  </Typography>
                  <Box sx={{ 
                    maxHeight: '300px', 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    p: 1
                  }}>
                    {importResult.errors.map((error, index) => (
                      <Typography 
                        key={index} 
                        variant="body2" 
                        color="error" 
                        sx={{ 
                          mb: 0.5, 
                          p: 0.5, 
                          bgcolor: 'error.light', 
                          borderRadius: 0.5 
                        }}
                      >
                        {error}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {importResult.duplicates.length > 0 && (
                <Box>
                  <Typography variant="h6" color="warning" gutterBottom>
                    Doublons détectés ({importResult.duplicates.length}):
                  </Typography>
                  <Box sx={{ 
                    maxHeight: '200px', 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1,
                    p: 1
                  }}>
                    {importResult.duplicates.map((dup, index) => (
                      <Typography 
                        key={index} 
                        variant="body2" 
                        color="warning.main" 
                        sx={{ 
                          mb: 0.5, 
                          p: 0.5, 
                          bgcolor: 'warning.light', 
                          borderRadius: 0.5 
                        }}
                      >
                        {dup.nom} - {dup.telephone}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>
            Fermer
          </Button>
          <Button onClick={resetImport} variant="contained" color="primary">
            Nouvel import
          </Button>
          <Button 
            onClick={() => {
              setShowResults(false);
              // Garder les résultats affichés
            }} 
            variant="contained" 
            color="success"
          >
            Voir les prestataires
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportPrestataires;
