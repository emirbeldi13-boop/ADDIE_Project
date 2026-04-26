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

