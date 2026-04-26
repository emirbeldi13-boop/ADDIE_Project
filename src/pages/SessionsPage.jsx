import { useState } from 'react';
import { List, Calendar, Download, Plus, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { SessionsList } from '../components/features/sessions/SessionsList';
import { GanttView } from '../components/features/sessions/GanttView';
import { SessionEditModal } from '../components/features/sessions/SessionEditModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function SessionsPage({ data, store, alertCount, loadedAt, onMenuOpen }) {
  const [view, setView] = useState('list');
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFormation, setFilterFormation] = useState('');
  const [filterCirco, setFilterCirco] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSession, setEditSession] = useState(null);

  // Use the dynamic sessions from store instead of raw data
  const sessions = store.sessions;

  const filteredData = sessions.filter(s => {
    const matchesSearch = s['Titre formation']?.toLowerCase().includes(search.toLowerCase()) || 
                          s['ID Session']?.toLowerCase().includes(search.toLowerCase());
    const matchesForm = !filterFormation || s['Formation'] === filterFormation;
    const matchesCirco = !filterCirco || s['Circonscription'] === filterCirco;
    const matchesStatut = !filterStatut || s['Statut'] === filterStatut;
    return matchesSearch && matchesForm && matchesCirco && matchesStatut;
  });

  const generatePDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(31, 56, 100); // #1F3864
      doc.text("Plan de Formation PedagoTrack", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 28, { align: "center" });

      let yPos = 40;

      data.sessions.forEach((session, index) => {
        // New page for each session (except first)
        if (index > 0) {
          doc.addPage();
          yPos = 20;
        }

        const formation = store.formations[session['Formation']] || { libelle: session['Titre formation'] || session['Formation'] };
        const crefoc = Object.values(store.crefocs).find(c => c.nom === session['Lieu']) || { nom: session['Lieu'] };

        // Session Header
        doc.setFillColor(248, 250, 252);
        doc.rect(14, yPos, pageWidth - 28, 25, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(31, 56, 100);
        doc.setFont(undefined, 'bold');
        doc.text(formation.libelle, 20, yPos + 10);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text(`Session : ${session['ID Session']}  |  Circonscription : ${session['Circonscription']}  |  Période : ${session['Date (Samedi)']}`, 20, yPos + 18);

        yPos += 35;

        // Logistics Section
        doc.setFontSize(12);
        doc.setTextColor(46, 117, 182); // #2E75B6
        doc.text("Logistique & CREFOC", 14, yPos);
        yPos += 7;

        const LOGISTICS_LABELS = {
          internet: 'Wi-Fi', sonorisation: 'Audio', multiprises: 'Prises', papeterie: 'Papeterie', 
          eau: 'Eau/Café', pmr: 'Accès PMR', tableau: 'Tableau', interactif: 'TNI', 
          videoproj: 'Vidéoproj', tv: 'TV', clim: 'Clim', photocopieuse: 'Copie'
        };

        const logisticsData = [
          ["Lieu / CREFOC", crefoc.nom || "N/A"],
          ["Capacité", `${crefoc.places || 0} places`],
          ["Équipements", Object.entries(crefoc.logistics || {})
            .filter(([_, v]) => v)
            .map(([k, _]) => LOGISTICS_LABELS[k] || k)
            .join(", ") || "Aucun"]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [],
          body: logisticsData,
          theme: 'plain',
          styles: { fontSize: 9 },
          columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // Teachers Priority List
        doc.setFontSize(12);
        doc.setTextColor(46, 117, 182);
        doc.text("Liste de priorité des enseignants éligibles", 14, yPos);
        yPos += 7;

        // Generate priority list for this specific session using helper
        const priorityList = store.getPriorityList(session.formationId);
        
        // Filter by CIRCO for this session report
        const filteredList = priorityList.filter(e => e['Circonscription'] === session.circo);

        const tableBody = filteredList.map((item, i) => [
          item.priorityRank || (i + 1),
          `${item['Prénom']} ${item['Nom']}`,
          item['Nom du Lycée'],
          item['Statut'],
          item.priorityScore !== null ? (5 - item.priorityScore).toFixed(2) : "—",
          item.isSelectedInCreFoc ? "Retenu" : "Liste d'attente"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Rang', 'Enseignant', 'Établissement', 'Statut', 'Score Prio.', 'État']],
          body: tableBody,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [46, 117, 182] },
          alternateRowStyles: { fillColor: [245, 247, 250] }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      });

      doc.save(`sessions_export_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <Header
        title="Sessions & Calendrier"
        subtitle={`${data.sessions.length} sessions planifiées`}
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#375623] text-white rounded-lg text-xs font-semibold hover:bg-[#2A411B] transition-all shadow-sm"
            >
              <Plus size={14} /> Nouvelle Session
            </button>
            <button
              onClick={generatePDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E75B6] text-white rounded-lg text-xs font-semibold hover:bg-[#1F3864] transition-all disabled:opacity-50"
            >
              <Download size={14} /> {isExporting ? 'Export...' : 'Exporter PDF'}
            </button>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs sm:text-sm transition-colors ${view === 'list' ? 'bg-white shadow text-[#1F3864]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List size={14} /> Liste
              </button>
              <button
                onClick={() => setView('gantt')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs sm:text-sm transition-colors ${view === 'gantt' ? 'bg-white shadow text-[#1F3864]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Calendar size={14} /> Gantt
              </button>
            </div>
          </div>
        }
      />
      <Breadcrumb />
      
      <div className="p-4 md:p-6">
        {/* Modern Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher une session..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#2E75B6]/30 focus:ring-4 focus:ring-[#2E75B6]/5 transition-all outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-transparent">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={filterFormation} 
                  onChange={e => setFilterFormation(e.target.value)}
                  className="bg-transparent text-xs font-medium text-gray-600 outline-none"
                >
                  <option value="">Toutes les formations</option>
                  {Object.values(store.formations).map((f, idx) => (
                    <option key={`form-${f.id}-${idx}`} value={f.id}>{f.id} — {f.libelle}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-transparent">
                <SlidersHorizontal size={14} className="text-gray-400" />
                <select 
                  value={filterCirco} 
                  onChange={e => setFilterCirco(e.target.value)}
                  className="bg-transparent text-xs font-medium text-gray-600 outline-none"
                >
                  <option value="">Toutes les circos</option>
                  {Object.keys(store.crefocs || {}).map((c, idx) => (
                    <option key={`circo-${c}-${idx}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-transparent">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <select 
                  value={filterStatut} 
                  onChange={e => setFilterStatut(e.target.value)}
                  className="bg-transparent text-xs font-medium text-gray-600 outline-none"
                >
                  <option value="">Tous les statuts</option>
                  {['Planifiée', 'Confirmée', 'En cours', 'Terminée', 'Annulée', 'Analyse'].map((s, idx) => (
                    <option key={`statut-${s}-${idx}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {view === 'list' ? (
          <SessionsList sessions={filteredData} store={store} />
        ) : (
          <GanttView 
            sessions={filteredData} 
            store={store} 
            onEdit={(s) => setEditSession(s)}
          />
        )}
      </div>

      {(showAddModal || editSession) && (
        <SessionEditModal
          isNew={!!showAddModal}
          session={showAddModal ? {
            'Formation': '',
            'Titre formation': '',
            'Circonscription': Object.keys(store.crefocs || {})[0] || '',
            'Date (Samedi)': new Date().toISOString().split('T')[0],
            'Lieu': '',
            'Formateur principal': '',
            'Nb inscrits': 0,
            'Durée (h)': '4 à 5 heures',
            'Statut': 'Planifiée',
            'Date ARE (J+42 approx.)': ''
          } : editSession}
          store={store}
          onSave={(data) => {
            if (showAddModal) store.addSession(data);
            else store.updateSession(editSession['ID Session'], data);
            
            setShowAddModal(false);
            setEditSession(null);
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditSession(null);
          }}
        />
      )}
    </div>
  );
}
