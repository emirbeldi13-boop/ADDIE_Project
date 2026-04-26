import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { EnseignantsList } from '../components/features/enseignants/EnseignantsList';
import { EnseignantFiche } from '../components/features/enseignants/EnseignantFiche';

export function EnseignantsPage({ data, alertCount, loadedAt, onMenuOpen, store }) {
  const { id } = useParams();

  if (id) {
    const ens = data.enseignants.find(e => e['ID'] === id);
    return (
      <div>
        <Header
          title={ens ? `${ens['Prénom']} ${ens['Nom']}` : 'Fiche enseignant'}
          subtitle={ens ? `${ens['Nom du Lycée']} · ${ens['Circonscription']}` : ''}
          alertCount={alertCount}
          loadedAt={loadedAt}
          onMenuOpen={onMenuOpen}
        />
        <Breadcrumb />
        <div className="p-4 md:p-6">
          <EnseignantFiche id={id} data={data} store={store} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Enseignants"
        subtitle={`${data.enseignants.length} enseignants — ${Object.keys(store.crefocs || {}).join(' · ')}`}
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />
      <div className="p-4 md:p-6">
        <EnseignantsList enseignants={data.enseignants} store={store} />
      </div>
    </div>
  );
}
