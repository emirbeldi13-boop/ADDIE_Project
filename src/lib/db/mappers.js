/**
 * Bidirectional mappers between Supabase row shapes (snake_case) and the
 * legacy app shapes (French/spaced keys) that components and the priority
 * engine expect.
 *
 * Convention:
 *   fromDB(row)    →  app shape
 *   toDB(record, userId)  →  Supabase row (for upsert)
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
function dashIfNull(v) {
  return v === null || v === undefined || v === '' ? '—' : v;
}

function nullOrDash(v) {
  return v === null || v === undefined || v === '' || v === '—' ? null : v;
}

function isoToFR(iso) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function frToISO(s) {
  if (!s || s === '—') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// ─── Enseignants ────────────────────────────────────────────────────────────
export function enseignantFromDB(r) {
  return {
    'ID': r.ens_id,
    'Prénom': r.prenom ?? '',
    'Nom': r.nom ?? '',
    'Sexe': r.sexe ?? '',
    'Circonscription': r.circonscription ?? '',
    'Code Lycée': r.code_lycee ?? '',
    'Nom du Lycée': r.nom_lycee ?? '',
    'Ville': r.ville ?? '',
    'Niveaux': r.niveaux ?? '',
    'Statut': r.statut ?? '',
    'Année stage': r.annee_stage ?? '—',
    'Ancienneté (ans)': r.anciennete_ans ?? '—',
    'Effectif moy.': r.effectif_moy ?? '',
    'Note dernière visite /20': r.note_visite_20 ?? '—',
    'Date dernière visite': r.date_derniere_visite ? isoToFR(r.date_derniere_visite) : '—',
    'Délai depuis visite (mois)': r.delai_visite_mois ?? '—',
    'Observateur': r.observateur ?? '—',
    'Dispo. confirmée': r.dispo_confirmee ?? 'Oui',
    'Score Statut (1-5)': r.score_statut ?? null,
    'Score Délai (1-5)': r.score_delai ?? null,
    'Score Note inv. (1-5)': r.score_note_inv ?? 'N/A',
    'Score Autopos. inv. (1-5)': r.score_autopos_inv ?? null,
    'Score Dispo (1-5)': r.score_dispo ?? null,
    'Score sélection global': r.score_global ?? null,
    'Rang circumscription': r.rang_circo ?? null,
    'Recommandation': r.recommandation ?? '',
    ...(r.extra || {}),
  };
}

export function enseignantToDB(e, userId) {
  return {
    user_id: userId,
    ens_id: e['ID'],
    prenom: nullOrDash(e['Prénom']),
    nom: nullOrDash(e['Nom']),
    sexe: nullOrDash(e['Sexe']),
    circonscription: nullOrDash(e['Circonscription']),
    code_lycee: nullOrDash(e['Code Lycée']),
    nom_lycee: nullOrDash(e['Nom du Lycée']),
    ville: nullOrDash(e['Ville']),
    niveaux: nullOrDash(e['Niveaux']),
    statut: nullOrDash(e['Statut']),
    annee_stage: numOrNull(e['Année stage']),
    anciennete_ans: numOrNull(e['Ancienneté (ans)']),
    effectif_moy: numOrNull(e['Effectif moy.']),
    note_visite_20: numOrNull(e['Note dernière visite /20']),
    date_derniere_visite: frToISO(e['Date dernière visite']),
    delai_visite_mois: numOrNull(e['Délai depuis visite (mois)']),
    observateur: nullOrDash(e['Observateur']),
    dispo_confirmee: nullOrDash(e['Dispo. confirmée']),
    score_statut: numOrNull(e['Score Statut (1-5)']),
    score_delai: numOrNull(e['Score Délai (1-5)']),
    score_note_inv: nullOrDash(e['Score Note inv. (1-5)']),
    score_autopos_inv: numOrNull(e['Score Autopos. inv. (1-5)']),
    score_dispo: numOrNull(e['Score Dispo (1-5)']),
    score_global: numOrNull(e['Score sélection global']),
    rang_circo: intOrNull(e['Rang circumscription']),
    recommandation: nullOrDash(e['Recommandation']),
  };
}

function numOrNull(v) {
  if (v === null || v === undefined || v === '' || v === '—' || v === 'N/A') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v) {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

// ─── Sessions ───────────────────────────────────────────────────────────────
export function sessionFromDB(r) {
  return {
    'ID Session': r.session_id,
    'Formation': r.formation_id ?? '',
    'Titre formation': r.titre_formation ?? '',
    'Trimestre': r.trimestre ?? '',
    'Circonscription': r.circonscription ?? '',
    'Date (Samedi)': r.date_session ?? '',
    'Lieu': r.lieu ?? '',
    'Formateur principal': r.formateur ?? '',
    'Nb inscrits': r.nb_inscrits ?? 0,
    'Durée (h)': r.duree ?? '',
    'Statut': r.statut ?? 'Planifiée',
    'Compétence RCET': r.competence_rcet ?? '',
    'Date ARE (J+42 approx.)': r.date_are ?? '',
    inscrits: Array.isArray(r.inscrits) ? r.inscrits : [],
    cdc: r.cdc ?? null,
    ...(r.extra || {}),
  };
}

export function sessionToDB(s, userId) {
  return {
    user_id: userId,
    session_id: s['ID Session'],
    formation_id: nullOrDash(s['Formation']),
    titre_formation: nullOrDash(s['Titre formation']),
    trimestre: nullOrDash(s['Trimestre']),
    circonscription: nullOrDash(s['Circonscription']),
    date_session: frToISO(s['Date (Samedi)']) || (typeof s['Date (Samedi)'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s['Date (Samedi)']) ? s['Date (Samedi)'] : null),
    lieu: nullOrDash(s['Lieu']),
    formateur: nullOrDash(s['Formateur principal']),
    nb_inscrits: intOrNull(s['Nb inscrits']),
    duree: nullOrDash(s['Durée (h)']),
    statut: nullOrDash(s['Statut']),
    competence_rcet: nullOrDash(s['Compétence RCET']),
    date_are: nullOrDash(s['Date ARE (J+42 approx.)']),
    inscrits: Array.isArray(s.inscrits) ? s.inscrits : [],
    cdc: s.cdc ?? null,
  };
}

// ─── Visits ─────────────────────────────────────────────────────────────────
export function visitFromDB(r) {
  return {
    id: r.visit_id,
    date: r.visit_date ? isoToFR(r.visit_date) : null,
    observer: r.observer ?? null,
    scores: r.scores ?? {},
    weights: r.weights ?? {},
    visitScore: r.visit_score ?? null,
    globalScore: r.global_score ?? null,
    note20: r.note_20 ?? null,
    appreciation: r.appreciation ?? null,
    visitType: r.visit_type ?? null,
    deleted: !!r.deleted,
    recordedAt: r.recorded_at,
  };
}

export function visitToDB(v, userId, ensId) {
  return {
    user_id: userId,
    visit_id: v.id,
    ens_id: ensId,
    visit_date: frToISO(v.date),
    observer: v.observer ?? null,
    scores: v.scores ?? {},
    weights: v.weights ?? {},
    visit_score: numOrNull(v.visitScore),
    global_score: numOrNull(v.globalScore),
    note_20: numOrNull(v.note20),
    appreciation: v.appreciation ?? null,
    visit_type: v.visitType ?? null,
    deleted: !!v.deleted,
    recorded_at: v.recordedAt ?? new Date().toISOString(),
  };
}

// ─── Overrides ──────────────────────────────────────────────────────────────
export function overrideFromDB(r) {
  return {
    reason: r.reason ?? '',
    reasonText: r.reason_text ?? '',
    scopes: Array.isArray(r.scopes) ? r.scopes : [],
    active: !!r.active,
    timestamp: r.created_at,
  };
}

export function overrideToDB(o, userId, ensId) {
  return {
    user_id: userId,
    ens_id: ensId,
    reason: o.reason ?? null,
    reason_text: o.reasonText ?? null,
    scopes: Array.isArray(o.scopes) ? o.scopes : [],
    active: !!o.active,
  };
}

// ─── Availability (per ens × per formation) ────────────────────────────────
export function availabilityFromDB(rows) {
  // rows → { [ensId]: { [formationId]: {declared, status, validatedAt, ...} } }
  const out = {};
  for (const r of rows) {
    if (!out[r.ens_id]) out[r.ens_id] = {};
    out[r.ens_id][r.formation_id] = {
      declared: !!r.declared,
      status: r.status ?? null,
      validatedAt: r.validated_at,
      justification: r.justification ?? '',
    };
  }
  return out;
}

export function availabilityToDB(entry, userId, ensId, formationId) {
  return {
    user_id: userId,
    ens_id: ensId,
    formation_id: formationId,
    declared: !!entry.declared,
    status: entry.status ?? null,
    validated_at: entry.validatedAt ?? null,
    justification: entry.justification ?? '',
  };
}

// ─── Autopositionnement (seed grain) ───────────────────────────────────────
export function autoposFromDB(r) {
  return {
    'ID Autopos': r.autopos_id,
    'ID Enseignant': r.ens_id,
    'Compétence': r.competence ?? '',
    'Moment': r.moment ?? '',
    'Formation': r.formation ?? '',
    'Score (1-5)': r.score_5 ?? null,
    'Date collecte': r.date_collecte ? isoToFR(r.date_collecte) : '',
  };
}

// ─── Autopos Manual (admin entries) ─────────────────────────────────────────
export function autoposManualFromDB(rows) {
  // rows → { [ensId]: [{ id, scores: {RC1: 4}, recordedAt, ... }] }
  const out = {};
  for (const r of rows) {
    const entry = {
      id: r.entry_id,
      scores: r.scores ?? {},
      date: r.entry_date,
      recordedAt: r.recorded_at,
    };
    if (!out[r.ens_id]) out[r.ens_id] = [];
    out[r.ens_id].push(entry);
  }
  // Sort each list by recordedAt desc
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  }
  return out;
}

export function autoposManualEntryToDB(entry, userId, ensId) {
  return {
    user_id: userId,
    entry_id: entry.id, // uuid
    ens_id: ensId,
    scores: entry.scores ?? {},
    entry_date: entry.date ?? null,
    recorded_at: entry.recordedAt ?? new Date().toISOString(),
  };
}

// ─── Observations ──────────────────────────────────────────────────────────
export function observationFromDB(r) {
  return {
    'ID Obs': r.obs_id,
    'ID Ens': r.ens_id,
    'Compétence': r.competence ?? '',
    'Méthode score': r.methode_score ?? '',
    'Observateur': r.observateur ?? '',
    'Visite officielle': r.visite_officielle ?? '',
    'Score (1-5)': r.score_5 ?? null,
    'Indicateurs cochés': r.indicateurs_coches ?? '',
    'Appréciation': r.appreciation ?? '',
    ...(r.extra || {}),
  };
}

// ─── Kirkpatrick L1 / L2 / L3 ──────────────────────────────────────────────
export function satisfactionFromDB(r) {
  return {
    'ID Sat': r.sat_id,
    'ID Ens': r.ens_id ?? '',
    'Formation': r.formation ?? '',
    'Date': r.date_satis ?? '',
    'Q1 Pertinence obj.': r.q1_pertinence ?? null,
    'Q2 Qualité anim.': r.q2_qualite_anim ?? null,
    'Q3 Adéquation méth.': r.q3_methode ?? null,
    'Q4 Qualité supports': r.q4_supports ?? null,
    'Q5 Applicabilité': r.q5_applicabilite ?? null,
    ...(r.extra || {}),
  };
}

export function acquisFromDB(r) {
  return {
    'ID Acq': r.acq_id,
    'ID Ens': r.ens_id ?? '',
    'Formation': r.formation ?? '',
    'Compétence ciblée': r.competence_ciblee ?? '',
    'Pré-test /5': r.pretest_5 ?? null,
    'Post-test /20': r.posttest_20 ?? null,
    'Post-test /5': r.posttest_5 ?? null,
    'Delta progression': r.delta ?? null,
    'OT atteint': r.ot_atteint ?? '',
    ...(r.extra || {}),
  };
}

export function transfertFromDB(r) {
  return {
    'ID Trans': r.trans_id,
    'ID Ens': r.ens_id ?? '',
    'Formation': r.formation ?? '',
    'Date ARE': r.date_are ?? '',
    'PAP prévu': r.pap_prevu ?? null,
    'PAP réalisé': r.pap_realise ?? null,
    '% réalisation': r.pct_realisation ?? '',
    'Actions mises en œuvre': r.actions_mises_oeuvre ?? '',
    'Difficulté principale': r.difficulte ?? '',
    ...(r.extra || {}),
  };
}

// ─── Triangulation ──────────────────────────────────────────────────────────
export function besoinFromDB(r) {
  return {
    'ID Besoin': r.besoin_id,
    'Description du besoin': r.description ?? '',
    'Compétence RCET': r.competence_rcet ?? '',
    'Formation ciblée': r.formation_ciblee ?? '',
    '✓ Autopos.': r.src_autopos ? 'O' : 'N',
    '✓ Entretien inspecteur': r.src_entretien ? 'O' : 'N',
    '✓ Observation classe': r.src_observation ? 'O' : 'N',
    '✓ Analyse doc.': r.src_doc ? 'O' : 'N',
    'Nb sources (sur 4)': r.nb_sources ?? 0,
    'Score triang. /4': r.score_triang ?? 0,
    'Statut validation': r.statut_validation ?? '',
  };
}

// ─── Crefocs ────────────────────────────────────────────────────────────────
export function crefocsFromDB(rows) {
  const out = {};
  for (const r of rows) {
    out[r.code] = {
      nom: r.nom,
      lieu: r.lieu,
      contact: r.contact,
      adresse: r.adresse,
      note: r.note,
      confirmed: !!r.confirmed,
      places: r.places ?? 20,
      logistics: r.logistics ?? {},
    };
  }
  return out;
}

export function crefocToDB(code, c, userId) {
  return {
    user_id: userId,
    code,
    nom: c.nom ?? null,
    lieu: c.lieu ?? null,
    contact: c.contact ?? null,
    adresse: c.adresse ?? null,
    note: c.note ?? null,
    confirmed: !!c.confirmed,
    places: intOrNull(c.places) ?? 20,
    logistics: c.logistics ?? {},
  };
}

// ─── Formations ─────────────────────────────────────────────────────────────
export function formationsFromDB(rows) {
  const out = {};
  for (const r of rows) {
    out[r.formation_id] = {
      ...(r.data ?? {}),
      id: r.formation_id,
      libelle: r.titre ?? r.data?.libelle ?? r.formation_id,
      competence: r.competence ?? r.data?.competence ?? null,
      targetedComps: Array.isArray(r.targeted_comps) ? r.targeted_comps : [],
    };
  }
  return out;
}

export function formationToDB(formation, userId) {
  // Strip the volatile fields off `data`; keep everything else for forward-compat.
  // eslint-disable-next-line no-unused-vars
  const { id, libelle, competence, targetedComps, ...rest } = formation;
  return {
    user_id: userId,
    formation_id: id,
    titre: libelle ?? null,
    competence: competence ?? null,
    targeted_comps: Array.isArray(targetedComps) ? targetedComps : [],
    data: { ...rest, id, libelle, competence, targetedComps },
  };
}

// ─── Competences (object map keyed by code) ─────────────────────────────────
export function competencesFromDB(rows) {
  const out = {};
  for (const r of rows) out[r.code] = r.label ?? r.code;
  return out;
}

export function competenceToDB(code, label, userId) {
  return { user_id: userId, code, label };
}

// ─── Referential modules ────────────────────────────────────────────────────
export function referentialFromDB(rows) {
  const out = {};
  for (const r of rows) {
    out[r.module_id] = { ...(r.data ?? {}), id: r.module_id };
  }
  return out;
}

export function referentialToDB(item, userId) {
  return { user_id: userId, module_id: item.id, data: item };
}

// ─── Audit trail ────────────────────────────────────────────────────────────
export function auditFromDB(rows) {
  return rows.map((r) => ({
    id: r.audit_id,
    type: r.type,
    ensId: r.ens_id,
    timestamp: r.ts,
    data: r.data ?? {},
  }));
}

export function auditToDB(entry, userId) {
  return {
    user_id: userId,
    audit_id: entry.id,
    type: entry.type ?? null,
    ens_id: entry.ensId ?? null,
    data: entry.data ?? {},
    ts: entry.timestamp ?? new Date().toISOString(),
  };
}

// ─── Triangulation row (write-back) ────────────────────────────────────────
export function besoinToDB(b, userId) {
  return {
    user_id: userId,
    besoin_id: b['ID Besoin'],
    description: nullOrDash(b['Description du besoin']),
    competence_rcet: nullOrDash(b['Compétence RCET']),
    formation_ciblee: nullOrDash(b['Formation ciblée']),
    src_autopos: b['✓ Autopos.'] === 'O',
    src_entretien: b['✓ Entretien inspecteur'] === 'O',
    src_observation: b['✓ Observation classe'] === 'O',
    src_doc: b['✓ Analyse doc.'] === 'O',
    nb_sources: intOrNull(b['Nb sources (sur 4)']),
    score_triang: numOrNull(b['Score triang. /4']),
    statut_validation: nullOrDash(b['Statut validation']),
  };
}

export { dashIfNull, nullOrDash, isoToFR, frToISO, numOrNull, intOrNull };
