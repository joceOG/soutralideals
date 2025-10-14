import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';

interface Utilisateur {
  _id: string;
  nom: string;
  prenom?: string;
  telephone: string;
  email?: string;
}

interface Recenseur {
  _id: string;
  nom: string;
  prenom?: string;
  telephone: string;
}

interface Service {
  _id: string;
  nomservice: string;
}

interface Prestataire {
  _id: string;
  utilisateur: Utilisateur;
  service: Service;
  localisation: string;
  prixprestataire: number;
  description: string;
  recenseur: Recenseur;
  dateRecensement: string;
  source: string;
  status: string;
}

interface Freelance {
  _id: string;
  utilisateur: Utilisateur;
  name: string;
  job: string;
  location: string;
  hourlyRate: number;
  description: string;
  recenseur: Recenseur;
  dateRecensement: string;
  source: string;
  status: string;
}

interface Vendeur {
  _id: string;
  utilisateur: Utilisateur;
  shopName: string;
  businessType: string;
  shopDescription: string;
  recenseur: Recenseur;
  dateRecensement: string;
  source: string;
  status: string;
}

export const RecensementsPending: React.FC = () => {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [freelances, setFreelances] = useState<Freelance[]>([]);
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: string; id: string } | null>(null);
  const [motifRejet, setMotifRejet] = useState('');
  const toast = React.useRef<Toast>(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      // Ajouter timestamp pour éviter le cache 304
      const timestamp = Date.now();
      const [prestRes, freelRes, vendRes] = await Promise.all([
        axios.get(`${apiUrl}/prestataire/pending/list?t=${timestamp}`),
        axios.get(`${apiUrl}/freelance/pending/list?t=${timestamp}`),
        axios.get(`${apiUrl}/vendeur/pending/list?t=${timestamp}`),
      ]);

      setPrestataires(prestRes.data);
      setFreelances(freelRes.data);
      setVendeurs(vendRes.data);

      console.log('✅ Recensements chargés:', {
        prestataires: prestRes.data.length,
        freelances: freelRes.data.length,
        vendeurs: vendRes.data.length,
      });
    } catch (error) {
      console.error('❌ Erreur chargement pending:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger les recensements en attente',
        life: 3000,
      });
    }
    setLoading(false);
  };

  const handleValidate = (type: string, id: string, name: string) => {
    confirmDialog({
      message: `Voulez-vous valider ce ${type} (${name}) ?`,
      header: 'Confirmation de validation',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Valider',
      rejectLabel: 'Annuler',
      accept: async () => {
        try {
          await axios.put(`${apiUrl}/${type}/${id}/validate`);
          
          toast.current?.show({
            severity: 'success',
            summary: 'Validé',
            detail: `${name} a été validé avec succès`,
            life: 3000,
          });

          loadPending(); // Recharger la liste
        } catch (error) {
          console.error('❌ Erreur validation:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors de la validation',
            life: 3000,
          });
        }
      },
    });
  };

  const handleReject = async () => {
    if (!selectedItem || !motifRejet.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Veuillez entrer un motif de rejet',
        life: 3000,
      });
      return;
    }

    try {
      await axios.put(
        `${apiUrl}/${selectedItem.type}/${selectedItem.id}/reject`,
        { motif: motifRejet }
      );

      toast.current?.show({
        severity: 'info',
        summary: 'Rejeté',
        detail: 'Le recensement a été rejeté',
        life: 3000,
      });

      setRejectDialogVisible(false);
      setMotifRejet('');
      setSelectedItem(null);
      loadPending();
    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Erreur lors du rejet',
        life: 3000,
      });
    }
  };

  const openRejectDialog = (type: string, id: string) => {
    setSelectedItem({ type, id });
    setRejectDialogVisible(true);
  };

  const actionsTemplate = (rowData: any, type: string, nameField: string) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button
        icon="pi pi-check"
        className="p-button-success p-button-sm"
        tooltip="Valider"
        onClick={() => handleValidate(type, rowData._id, rowData[nameField] || 'N/A')}
      />
      <Button
        icon="pi pi-times"
        className="p-button-danger p-button-sm"
        tooltip="Rejeter"
        onClick={() => openRejectDialog(type, rowData._id)}
      />
    </div>
  );

  const dateTemplate = (rowData: any) => {
    return new Date(rowData.dateRecensement).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const recenseurTemplate = (rowData: any) => {
    if (!rowData.recenseur) return 'N/A';
    return `${rowData.recenseur.prenom || ''} ${rowData.recenseur.nom || ''}`.trim();
  };

  const telephoneTemplate = (rowData: any) => {
    return rowData.utilisateur?.telephone || 'N/A';
  };

  const sourceTemplate = (rowData: any) => {
    const sourceColors: { [key: string]: string } = {
      sdealsidentification: 'info',
      web: 'success',
      sdealsmobile: 'warning',
      dashboard: 'secondary',
    };
    return (
      <Badge 
        value={rowData.source} 
        severity={sourceColors[rowData.source] as any || 'info'}
      />
    );
  };

  const prixTemplate = (rowData: any) => {
    const prix = rowData.prixprestataire || rowData.hourlyRate || 0;
    return `${prix.toLocaleString('fr-FR')} FCFA`;
  };

  return (
    <div className="recensements-pending" style={{ padding: '2rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>
          📋 Recensements en attente de validation
        </h1>
        <p style={{ color: '#666' }}>
          Validez ou rejetez les recensements effectués par les recenseurs terrain
        </p>
      </div>

      <TabView>
        {/* TAB PRESTATAIRES */}
        <TabPanel 
          header={
            <span>
              👷 Prestataires{' '}
              <Badge value={prestataires.length} severity="info" />
            </span>
          }
        >
          <Card>
            <DataTable 
              value={prestataires} 
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucun prestataire en attente"
              responsiveLayout="scroll"
            >
              <Column 
                field="utilisateur.nom" 
                header="Nom" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Téléphone"
                body={telephoneTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                field="service.nomservice" 
                header="Service" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                field="localisation" 
                header="Localisation" 
                sortable
                style={{ minWidth: '200px' }}
              />
              <Column 
                header="Prix"
                body={prixTemplate}
                sortable
                style={{ minWidth: '120px' }}
              />
              <Column 
                header="Recenseur"
                body={recenseurTemplate}
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Source"
                body={sourceTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                header="Date"
                body={dateTemplate}
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column
                header="Actions"
                body={(rowData) => actionsTemplate(rowData, 'prestataire', 'utilisateur.nom')}
                style={{ minWidth: '120px' }}
              />
            </DataTable>
          </Card>
        </TabPanel>

        {/* TAB FREELANCES */}
        <TabPanel 
          header={
            <span>
              💼 Freelances{' '}
              <Badge value={freelances.length} severity="success" />
            </span>
          }
        >
          <Card>
            <DataTable 
              value={freelances} 
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucun freelance en attente"
              responsiveLayout="scroll"
            >
              <Column 
                field="name" 
                header="Nom" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Téléphone"
                body={telephoneTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                field="job" 
                header="Métier" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                field="location" 
                header="Localisation" 
                sortable
                style={{ minWidth: '200px' }}
              />
              <Column 
                header="Tarif horaire"
                body={prixTemplate}
                sortable
                style={{ minWidth: '120px' }}
              />
              <Column 
                header="Recenseur"
                body={recenseurTemplate}
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Source"
                body={sourceTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                header="Date"
                body={dateTemplate}
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column
                header="Actions"
                body={(rowData) => actionsTemplate(rowData, 'freelance', 'name')}
                style={{ minWidth: '120px' }}
              />
            </DataTable>
          </Card>
        </TabPanel>

        {/* TAB VENDEURS */}
        <TabPanel 
          header={
            <span>
              🏪 Vendeurs{' '}
              <Badge value={vendeurs.length} severity="warning" />
            </span>
          }
        >
          <Card>
            <DataTable 
              value={vendeurs} 
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucun vendeur en attente"
              responsiveLayout="scroll"
            >
              <Column 
                field="shopName" 
                header="Boutique" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Téléphone"
                body={telephoneTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                field="businessType" 
                header="Type" 
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                field="shopDescription" 
                header="Description" 
                style={{ minWidth: '250px' }}
              />
              <Column 
                header="Recenseur"
                body={recenseurTemplate}
                style={{ minWidth: '150px' }}
              />
              <Column 
                header="Source"
                body={sourceTemplate}
                style={{ minWidth: '130px' }}
              />
              <Column 
                header="Date"
                body={dateTemplate}
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column
                header="Actions"
                body={(rowData) => actionsTemplate(rowData, 'vendeur', 'shopName')}
                style={{ minWidth: '120px' }}
              />
            </DataTable>
          </Card>
        </TabPanel>
      </TabView>

      {/* Dialog Rejet */}
      <Dialog
        visible={rejectDialogVisible}
        header="Motif du rejet"
        modal
        style={{ width: '500px' }}
        onHide={() => {
          setRejectDialogVisible(false);
          setMotifRejet('');
          setSelectedItem(null);
        }}
        footer={
          <div>
            <Button
              label="Annuler"
              icon="pi pi-times"
              onClick={() => {
                setRejectDialogVisible(false);
                setMotifRejet('');
                setSelectedItem(null);
              }}
              className="p-button-text"
            />
            <Button
              label="Rejeter"
              icon="pi pi-check"
              onClick={handleReject}
              className="p-button-danger"
              disabled={!motifRejet.trim()}
            />
          </div>
        }
      >
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="motif" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Veuillez indiquer la raison du rejet :
          </label>
          <InputTextarea
            id="motif"
            value={motifRejet}
            onChange={(e) => setMotifRejet(e.target.value)}
            rows={5}
            cols={50}
            placeholder="Ex: Informations incomplètes, photo non conforme, doublon, etc."
            style={{ width: '100%' }}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default RecensementsPending;
