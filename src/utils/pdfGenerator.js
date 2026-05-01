import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional PDF dossier for a training session.
 * Branding: Ministère de l'Éducation + Circonscription
 */
export async function exportSessionToPDF(session, formation, crefoc, participants, store) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // --- Official Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("MINISTÈRE DE L'ÉDUCATION", pageWidth / 2, 15, { align: "center" });
  
  // Fuzzy search for Circonscription in header
  const getFuzzy = (obj, keyword, fallback) => {
    if (!obj) return fallback;
    const cleanKeyword = keyword.toLowerCase().trim();
    // Look for a key that contains the keyword, ignoring case and extra spaces
    const key = Object.keys(obj).find(k => {
      const cleanKey = k.toLowerCase().replace(/\s+/g, ' ');
      return cleanKey.includes(cleanKeyword);
    });
    const val = key ? obj[key] : null;
    return (val !== undefined && val !== null && val !== '') ? val : fallback;
  };
  
  const circoNom = getFuzzy(session, 'circo', 'Générale');
  doc.text(`Circonscription : ${circoNom}`, pageWidth / 2, 22, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.line(margin, 28, pageWidth - margin, 28);

  // --- Title Section ---
  let y = 40;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 56, 100); // Dark Blue
  const title = session['Titre formation'] || formation.libelle || "Dossier de Formation";
  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += (titleLines.length * 10) + 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Session ID: ${session['ID Session'] || 'REF-N/A'}`, pageWidth / 2, y, { align: "center" });
  y += 15;

  // --- Identification Table ---
  // Ultra-resilient data extraction: Try explicit keys first, then fuzzy
  const getExplicitOrFuzzy = (obj, key, keyword, fallback) => {
    if (!obj) return fallback;
    if (obj[key] && obj[key] !== '') return obj[key];
    return getFuzzy(obj, keyword, fallback);
  };

  // --- Section: Identification Table ---
  const lieuNom = getExplicitOrFuzzy(session, 'Lieu', 'lieu', crefoc.nom || 'Non défini');
  const formateurNom = getExplicitOrFuzzy(session, 'Formateur principal', 'formateur', 'À confirmer');
  const dateSession = getExplicitOrFuzzy(session, 'Date (Samedi)', 'date', 'Non définie');
  const circoVal = getExplicitOrFuzzy(session, 'Circonscription', 'circo', 'N/A');

  autoTable(doc, {
    startY: y,
    head: [['Identification de Session', 'Détails']],
    body: [
      ['Date de la session', dateSession],
      ['Lieu / CREFOC', lieuNom],
      ['Formateur Principal', formateurNom],
      ['Circonscription', circoVal],
      ['Atelier ARE (J+42)', session['Date ARE (J+42 approx.)'] || '–'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [31, 56, 100], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  y = doc.lastAutoTable.finalY + 15;

  // --- Section: Diagnostic ADDIE (Phase Analyse) ---
  const cdc = session.cdc || formation.cdc;
  if (cdc) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 56, 100);
    doc.text("PHASE 1 : DIAGNOSTIC & ANALYSE (ADDIE)", margin, y);
    y += 8;

    const addieData = [
      ['1. Besoins identifiés', cdc.besoins],
      ['2. Analyse du Public', cdc.public],
      ['3. Cadre & Contraintes', cdc.contraintes],
    ].filter(row => row[1]);

    // Format SMART Objectives for the table
    let objText = 'Aucun objectif défini.';
    try {
      const objs = JSON.parse(cdc.objectifs || '[]');
      if (objs.length > 0) {
        objText = objs.map((o, i) => `${i+1}. ${o.text} [SMART: ${o.smart?.join('') || '—'}]`).join('\n\n');
      }
    } catch(e) {
      objText = cdc.objectifs || objText;
    }
    addieData.push(['4. Objectifs SMART', objText]);

    autoTable(doc, {
      startY: y,
      body: addieData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50, fillColor: [245, 245, 245] } },
    });
    
    y = doc.lastAutoTable.finalY + 15;
  }

  // --- Section: Design de la Séquence (Phase Design) ---
  const modules = session.modules || formation.modules || [];
  if (modules.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PHASE 2 : DESIGN & SÉQUENÇAGE", margin, y);
    y += 8;

    const sequenceData = modules.map((m, i) => [
      `${i + 1}`,
      m.title,
      `${m.duration || 0} min`,
      m.method || 'APPLICATIF',
      m.activities || '—'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Module', 'Durée', 'Méthode', 'Activités']],
      body: sequenceData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { width: 8.0 } },
    });
    
    y = doc.lastAutoTable.finalY + 15;
  }

  // --- Footer ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Dossier Technique Ingénierie - Studio ADDIE - Page ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }

  const fileName = `Dossier_ADDIE_${session['ID Session'] || 'MASTER'}.pdf`;
  doc.save(fileName);
}

/**
 * Generates a Strategic Diagnostic Report based on the 6-step workflow.
 */
export async function exportStrategyReportToPDF(workflowData, participants, store, stepValidations, selectedCircos = [], selectedRCs = []) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);
  const now = new Date();

  // --- Official Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(31, 56, 100);
  doc.text("STUDIO ADDIE — INGÉNIERIE STRATÉGIQUE", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("RAPPORT DE DIAGNOSTIC TERRITORIAL ET ARBITRAGE DÉCISIONNEL", pageWidth / 2, 22, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(31, 56, 100);
  doc.line(margin, 28, pageWidth - margin, 28);

  let y = 40;

  // --- Title Section ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("BILAN DE L'ANALYSE DÉCISIONNELLE", margin, y);
  y += 12;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Document généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, margin, y);
  doc.text(`Identifiant unique : STRAT-${now.getTime()}`, pageWidth - margin, y, { align: 'right' });
  y += 15;

  // --- Summary Table ---
  const stepLabels = {
    step1: '1. Ciblage Territorial',
    step2: '2. Fiabilité & Robustesse',
    step3: '3. Diagnostic des Déficits',
    step4: '4. Scoring & Éligibilité',
    step5: '5. Séquençage des Besoins',
    step6: '6. Priorisation des Groupes'
  };

  const stepStatus = Object.keys(stepLabels).map(key => [
    stepLabels[key],
    stepValidations?.[key]?.validated ? 'CERTIFIÉ' : 'EN COURS',
    stepValidations?.[key]?.timestamp ? new Date(stepValidations[key].timestamp).toLocaleDateString('fr-FR') : '—'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Phase du Workflow', 'Statut de Validation', 'Date de Clôture']],
    body: stepStatus,
    theme: 'grid',
    headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { fontStyle: 'bold' } }
  });

  y = doc.lastAutoTable.finalY + 15;

  // --- Section 1: Contexte ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 56, 100);
  doc.text("1. CONTEXTE ET FIABILITÉ DES DONNÉES", margin, y);
  y += 8;

  const robustness = workflowData?.step2?.robustnessIndex || 'Non évaluée';

  const contextData = [
    ['Périmètre Géographique', selectedCircos.length > 0 ? selectedCircos.join(', ') : 'National'],
    ['Population Cible', `${participants.length} enseignants analysés`],
    ['Indice de Robustesse', robustness],
    ['Triangulation', 'Score de conformité basé sur Observation + Auto-évaluation']
  ];

  autoTable(doc, {
    startY: y,
    body: contextData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60, textColor: [100, 100, 100] } },
  });

  y = doc.lastAutoTable.finalY + 15;

  // --- Section 2: Analyse des Déficits ---
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 56, 100);
  doc.text("2. DIAGNOSTIC ANALYTIQUE (CAUSALITÉ)", margin, y);
  y += 8;

  const causal = workflowData?.step3?.causalDiagnostics || {};

  const causalData = [
    ['Compétences Critiques', selectedRCs.map(id => store.competences[id]?.split(' — ')[0] || id).join(', ')],
    ['Racine du Problème', causal.primaryRootId || 'Non identifiée'],
    ['Gravité / Urgence', causal.severityLabel || 'Moyenne'],
    ['Note de l\'Inspecteur', causal.inspectorNotes || 'Aucune observation complémentaire']
  ];

  autoTable(doc, {
    startY: y,
    body: causalData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', width: 50, fillColor: [245, 245, 245] } },
  });

  y = doc.lastAutoTable.finalY + 15;

  // --- Section 3: Solutions Retenues ---
  if (y > 180) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 56, 100);
  doc.text("3. SOLUTIONS DE FORMATION ET SCORING", margin, y);
  y += 8;

  const selectedIds = Array.from(workflowData?.step4?.selectedFormations || []);
  const formations = selectedIds.map(id => {
    const f = store.referential[id] || {};
    return [
      id,
      f.libelle || f.title || 'Module personnalisé',
      f.family || 'Spécifique',
      `${f.ipt || 0}%`
    ];
  });

  if (formations.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Module de Formation', 'Domaine', 'Indice IPT']],
      body: formations,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
      columnStyles: { 3: { halign: 'center', fontStyle: 'bold' } }
    });
    y = doc.lastAutoTable.finalY + 15;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text("Aucun module de formation n'a été retenu lors de cette phase.", margin + 5, y);
    y += 15;
  }

  // --- Section 4: Séquençage et Priorité ---
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 56, 100);
  doc.text("4. PLANIFICATION ET CIBLAGE (T1)", margin, y);
  y += 8;

  const sequencing = workflowData?.step5 || {};
  const prioritization = workflowData?.step6 || {};

  const planData = [
    ['Prochaine Formation', sequencing.nextFormation || 'À définir'],
    ['Horizon Temporel', sequencing.horizon || 'Trimestre 1 (T1)'],
    ['Groupe Prioritaire', prioritization.priorityGroup || 'Enseignants en difficulté ciblée'],
    ['Effectif du Groupe', `${prioritization.groupSize || 0} participants`],
    ['Mode de Déploiement', prioritization.deliveryMode || 'Présentiel / Hybride']
  ];

  autoTable(doc, {
    startY: y,
    body: planData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60, textColor: [100, 100, 100] } },
  });

  y = doc.lastAutoTable.finalY + 20;

  // --- Final Validation Stamp ---
  doc.setDrawColor(31, 56, 100);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentWidth, 35);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(31, 56, 100);
  doc.text("CERTIFICATION DE L'ANALYSE STRATÉGIQUE", pageWidth / 2, y + 10, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50);
  const certText = "Ce rapport certifie que le diagnostic a suivi la méthodologie ADDIE et a été validé par l'autorité compétente. Les données sont archivées et prêtes pour la phase de DESIGN.";
  const certLines = doc.splitTextToSize(certText, contentWidth - 20);
  doc.text(certLines, pageWidth / 2, y + 18, { align: 'center' });

  doc.setFont("helvetica", "italic");
  doc.text(`Signé numériquement le ${now.toLocaleDateString('fr-FR')} — Studio ADDIE Engine v2.0`, pageWidth / 2, y + 30, { align: 'center' });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Rapport Stratégique - Studio ADDIE - Page ${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }

  doc.save(`Rapport_Strategique_ADDIE_${now.getTime()}.pdf`);
}
