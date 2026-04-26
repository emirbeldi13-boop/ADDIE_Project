#!/usr/bin/env node
/**
 * One-shot migration: load all JSON seed data + constants into Supabase,
 * owned by the super admin account.
 *
 * Run:  npm run migrate:seeds
 * Reqs: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, plus an
 *       active super_admin profile in the database.
 *
 * Idempotent: re-running upserts on (user_id, legacy_id) — no duplicates.
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// ─── Setup ─────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('✗ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  console.error('  Run via:  npm run migrate:seeds');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────────
const KNOWN_NULL_TOKENS = new Set([null, undefined, '', '—', 'N/A', 'n/a']);

function nullIfBlank(v) {
  return KNOWN_NULL_TOKENS.has(v) ? null : v;
}

function num(v) {
  if (KNOWN_NULL_TOKENS.has(v)) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function int(v) {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}

function dateISO(v) {
  if (KNOWN_NULL_TOKENS.has(v)) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function boolFR(v) {
  if (v === 'O' || v === 'Oui' || v === true || v === 1 || v === '1') return true;
  if (v === 'N' || v === 'Non' || v === false || v === 0 || v === '0') return false;
  return null;
}

function clean(arr) {
  return arr.filter((row) =>
    row && Object.values(row).some((v) => v !== null && v !== undefined && v !== '')
  );
}

function extractExtra(row, knownKeys) {
  const extra = {};
  for (const [k, v] of Object.entries(row)) {
    if (!knownKeys.has(k) && v !== null && v !== undefined && v !== '') {
      extra[k] = v;
    }
  }
  return extra;
}

async function readJSON(name) {
  const raw = await readFile(join(DATA, name), 'utf-8');
  return JSON.parse(raw);
}

async function batchUpsert(table, rows, onConflict) {
  if (!rows.length) {
    console.log(`  · ${table}: 0 rows (skipped)`);
    return 0;
  }
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from(table)
      .upsert(slice, { onConflict, ignoreDuplicates: false });
    if (error) {
      console.error(`\n  ✗ ${table} batch ${i}-${i + slice.length}:`, error.message);
      throw error;
    }
    done += slice.length;
    stdout.write(`  ↺ ${table}: ${done}/${rows.length}\r`);
  }
  stdout.write(`  ✓ ${table}: ${done} rows\n`);
  return done;
}

// ─── Catalogue constants (extracted from src/constants & useDataStore) ─────
const FORMATIONS = {
  F1: { id: 'F1', libelle: 'F1 — Linguistique et Culture', court: 'Linguistique', family: 'Linguistique et Culture', competence: "RC4 — Maîtriser la langue d'enseignement", targetedComps: ['RC4'], color: '#2E75B6' },
  F2: { id: 'F2', libelle: "F2 — Didactique de l'Italien", court: 'Didactique', family: "Didactique de l'Italien", competence: 'RC3 — Maîtriser la didactique disciplinaire', targetedComps: ['RC3'], color: '#375623' },
  F3: { id: 'F3', libelle: 'F3 — Conception et Gestion', court: 'Conception', family: 'Conception et Gestion', competence: 'RC5 — Concevoir et planifier', targetedComps: ['RC5'], color: '#C55A11' },
  F4: { id: 'F4', libelle: 'F4 — Évaluation et Remédiation', family: 'Évaluation et Remédiation', targetedComps: ['RC7'], color: '#7030A0' },
  F5: { id: 'F5', libelle: 'F5 — Différenciation et Inclusion', family: 'Différenciation et Inclusion', targetedComps: ['RC9'], color: '#833C0C' },
  F6: { id: 'F6', libelle: 'F6 — Numérique et Innovation', family: 'Numérique et Innovation', targetedComps: ['RC12'], color: '#1F3864' },
  F7: { id: 'F7', libelle: 'F7 — Professionnalisme et Posture', family: 'Professionnalisme et Posture', targetedComps: ['RC11'], color: '#535353' },
};

const COMPETENCES_RCET = {
  RC1: "RC1 — Agir de façon éthique et responsable dans l'exercice de ses fonctions",
  RC2: 'RC2 — Maîtriser les savoirs disciplinaires et la culture générale',
  RC3: 'RC3 — Maîtriser la didactique disciplinaire',
  RC4: "RC4 — Maîtriser la langue d'enseignement et les langues de travail",
  RC5: "RC5 — Concevoir et planifier des situations d'apprentissage",
  RC6: "RC6 — Mettre en œuvre des situations d'apprentissage",
  RC7: 'RC7 — Évaluer les apprentissages des élèves',
  RC8: 'RC8 — Gérer la progression des apprentissages',
  RC9: 'RC9 — Prendre en compte la diversité des élèves et leurs besoins',
  RC10: "RC10 — Travailler en équipe et coopérer avec les partenaires de l'école",
  RC11: "RC11 — S'engager dans une démarche de développement professionnel continu",
  RC12: 'RC12 — Intégrer les technologies numériques dans sa pratique professionnelle',
};

const CREFOC_LOGISTICS_DEFAULT = {
  internet: false, sonorisation: false, multiprises: false, papeterie: false,
  eau: false, pmr: false, tableau: true, interactif: false, videoproj: true,
  tv: false, clim: true, photocopieuse: false,
};

const CREFOCS = {
  Kef:      { nom: 'CREFOC Kef',      lieu: 'Salle pédagogique CRES Kef',  contact: 'M. Mansour (Directeur)', adresse: 'Avenue Habib Bourguiba, Kef', note: 'Equipement complet',         confirmed: true,  places: 25, logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: true, interactif: true, multiprises: true } },
  'Béja':   { nom: 'CREFOC Béja',     lieu: 'Lycée Pilote Béja',           contact: 'Mme. Amel',              adresse: 'Cité Olympique, Béja',         note: 'Tableau blanc uniquement',   confirmed: false, places: 20, logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: false, multiprises: true } },
  Jendouba: { nom: 'CREFOC Jendouba', lieu: 'CRES Jendouba',               contact: 'Direction Régionale',    adresse: 'Jendouba Centre',              note: 'Connexion instable',         confirmed: false, places: 18, logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: true, sonorisation: true } },
};

// ─── Mappers ───────────────────────────────────────────────────────────────
const ENS_KNOWN = new Set([
  'ID', 'Prénom', 'Nom', 'Sexe', 'Circonscription', 'Code Lycée', 'Nom du Lycée',
  'Ville', 'Niveaux', 'Statut', 'Année stage', 'Ancienneté (ans)', 'Effectif moy.',
  'Note dernière visite /20', 'Date dernière visite', 'Délai depuis visite (mois)',
  'Observateur', 'Dispo. confirmée', 'Score Statut (1-5)', 'Score Délai (1-5)',
  'Score Note inv. (1-5)', 'Score Autopos. inv. (1-5)', 'Score Dispo (1-5)',
  'Score sélection global', 'Rang circumscription', 'Recommandation',
]);

function mapEnseignant(e, user_id) {
  return {
    user_id,
    ens_id: e['ID'],
    prenom: nullIfBlank(e['Prénom']),
    nom: nullIfBlank(e['Nom']),
    sexe: nullIfBlank(e['Sexe']),
    circonscription: nullIfBlank(e['Circonscription']),
    code_lycee: nullIfBlank(e['Code Lycée']),
    nom_lycee: nullIfBlank(e['Nom du Lycée']),
    ville: nullIfBlank(e['Ville']),
    niveaux: nullIfBlank(e['Niveaux']),
    statut: nullIfBlank(e['Statut']),
    annee_stage: int(e['Année stage']),
    anciennete_ans: num(e['Ancienneté (ans)']),
    effectif_moy: num(e['Effectif moy.']),
    note_visite_20: num(e['Note dernière visite /20']),
    date_derniere_visite: dateISO(e['Date dernière visite']),
    delai_visite_mois: num(e['Délai depuis visite (mois)']),
    observateur: nullIfBlank(e['Observateur']),
    dispo_confirmee: nullIfBlank(e['Dispo. confirmée']),
    score_statut: num(e['Score Statut (1-5)']),
    score_delai: num(e['Score Délai (1-5)']),
    score_note_inv: nullIfBlank(e['Score Note inv. (1-5)']),
    score_autopos_inv: num(e['Score Autopos. inv. (1-5)']),
    score_dispo: num(e['Score Dispo (1-5)']),
    score_global: num(e['Score sélection global']),
    rang_circo: int(e['Rang circumscription']),
    recommandation: nullIfBlank(e['Recommandation']),
    extra: extractExtra(e, ENS_KNOWN),
  };
}

const SES_KNOWN = new Set([
  'ID Session', 'Formation', 'Titre formation', 'Trimestre', 'Circonscription',
  'Date (Samedi)', 'Lieu', 'Formateur principal', 'Nb inscrits', 'Durée (h)',
  'Statut', 'Compétence RCET', 'Date ARE (J+42 approx.)',
]);

function mapSession(s, user_id) {
  return {
    user_id,
    session_id: s['ID Session'],
    formation_id: nullIfBlank(s['Formation']),
    titre_formation: nullIfBlank(s['Titre formation']),
    trimestre: nullIfBlank(s['Trimestre']),
    circonscription: nullIfBlank(s['Circonscription']),
    date_session: dateISO(s['Date (Samedi)']),
    lieu: nullIfBlank(s['Lieu']),
    formateur: nullIfBlank(s['Formateur principal']),
    nb_inscrits: int(s['Nb inscrits']),
    duree: nullIfBlank(s['Durée (h)']),
    statut: nullIfBlank(s['Statut']),
    competence_rcet: nullIfBlank(s['Compétence RCET']),
    date_are: nullIfBlank(s['Date ARE (J+42 approx.)']),
    inscrits: [],
    cdc: null,
    extra: extractExtra(s, SES_KNOWN),
  };
}

const OBS_KNOWN = new Set([
  'ID Obs', 'ID Ens', 'Compétence', 'Méthode score', 'Observateur',
  'Visite officielle', 'Score (1-5)', 'Indicateurs cochés', 'Appréciation',
]);

function mapObservation(o, user_id) {
  return {
    user_id,
    obs_id: o['ID Obs'],
    ens_id: o['ID Ens'],
    competence: nullIfBlank(o['Compétence']),
    methode_score: nullIfBlank(o['Méthode score']),
    observateur: nullIfBlank(o['Observateur']),
    visite_officielle: nullIfBlank(o['Visite officielle']),
    score_5: num(o['Score (1-5)']),
    indicateurs_coches: nullIfBlank(o['Indicateurs cochés']),
    appreciation: nullIfBlank(o['Appréciation']),
    extra: extractExtra(o, OBS_KNOWN),
  };
}

const SAT_KNOWN = new Set([
  'ID Sat', 'ID Ens', 'Formation', 'Date',
  'Q1 Pertinence obj.', 'Q2 Qualité anim.', 'Q3 Adéquation méth.',
  'Q4 Qualité supports', 'Q5 Applicabilité',
]);

function mapSatisfaction(s, user_id) {
  return {
    user_id,
    sat_id: s['ID Sat'],
    ens_id: nullIfBlank(s['ID Ens']),
    formation: nullIfBlank(s['Formation']),
    date_satis: dateISO(s['Date']),
    q1_pertinence: num(s['Q1 Pertinence obj.']),
    q2_qualite_anim: num(s['Q2 Qualité anim.']),
    q3_methode: num(s['Q3 Adéquation méth.']),
    q4_supports: num(s['Q4 Qualité supports']),
    q5_applicabilite: num(s['Q5 Applicabilité']),
    extra: extractExtra(s, SAT_KNOWN),
  };
}

const ACQ_KNOWN = new Set([
  'ID Acq', 'ID Ens', 'Formation', 'Compétence ciblée',
  'Pré-test /5', 'Post-test /20', 'Post-test /5', 'Delta progression', 'OT atteint',
]);

function mapAcquis(a, user_id) {
  return {
    user_id,
    acq_id: a['ID Acq'],
    ens_id: nullIfBlank(a['ID Ens']),
    formation: nullIfBlank(a['Formation']),
    competence_ciblee: nullIfBlank(a['Compétence ciblée']),
    pretest_5: num(a['Pré-test /5']),
    posttest_20: num(a['Post-test /20']),
    posttest_5: num(a['Post-test /5']),
    delta: num(a['Delta progression']),
    ot_atteint: nullIfBlank(a['OT atteint']),
    extra: extractExtra(a, ACQ_KNOWN),
  };
}

const TRA_KNOWN = new Set([
  'ID Trans', 'ID Ens', 'Formation', 'Date ARE',
  'PAP prévu', 'PAP réalisé', '% réalisation',
  'Actions mises en œuvre', 'Difficulté principale',
]);

function mapTransfert(t, user_id) {
  return {
    user_id,
    trans_id: t['ID Trans'],
    ens_id: nullIfBlank(t['ID Ens']),
    formation: nullIfBlank(t['Formation']),
    date_are: nullIfBlank(t['Date ARE']),
    pap_prevu: int(t['PAP prévu']),
    pap_realise: int(t['PAP réalisé']),
    pct_realisation: nullIfBlank(t['% réalisation']),
    actions_mises_oeuvre: nullIfBlank(t['Actions mises en œuvre']),
    difficulte: nullIfBlank(t['Difficulté principale']),
    extra: extractExtra(t, TRA_KNOWN),
  };
}

function mapAutopos(a, user_id) {
  return {
    user_id,
    autopos_id: a['ID Autopos'],
    ens_id: a['ID Enseignant'],
    competence: nullIfBlank(a['Compétence']),
    moment: nullIfBlank(a['Moment']),
    formation: nullIfBlank(a['Formation']),
    score_5: num(a['Score (1-5)']),
    date_collecte: dateISO(a['Date collecte']),
  };
}

function mapBesoin(b, user_id) {
  return {
    user_id,
    besoin_id: b['ID Besoin'],
    description: nullIfBlank(b['Description du besoin']),
    competence_rcet: nullIfBlank(b['Compétence RCET']),
    formation_ciblee: nullIfBlank(b['Formation ciblée']),
    src_autopos: boolFR(b['✓ Autopos.']),
    src_entretien: boolFR(b['✓ Entretien inspecteur']),
    src_observation: boolFR(b['✓ Observation classe']),
    src_doc: boolFR(b['✓ Analyse doc.']),
    nb_sources: int(b['Nb sources (sur 4)']),
    score_triang: num(b['Score triang. /4']),
    statut_validation: nullIfBlank(b['Statut validation']),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━ PedagoTrack seed migration ━━━\n');

  // 1. Authenticate as super admin
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (process.argv[2] || (await rl.question('Super admin email: '))).trim();
  const password = await rl.question('Password: ');
  rl.close();

  console.log('\n→ Signing in…');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email, password,
  });
  if (authErr) {
    console.error('✗ Sign-in failed:', authErr.message);
    process.exit(1);
  }
  const user_id = auth.user.id;

  // 2. Verify role
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, is_active, email')
    .eq('id', user_id)
    .single();
  if (profErr || !profile) {
    console.error('✗ Could not load profile:', profErr?.message);
    process.exit(1);
  }
  if (profile.role !== 'super_admin' || !profile.is_active) {
    console.error(`✗ User ${profile.email} is not an active super_admin (role=${profile.role}).`);
    process.exit(1);
  }
  console.log(`✓ Authenticated as ${profile.email} (super_admin) [${user_id}]\n`);

  // 3. Catalogues (per-tenant) — insert first so FKs / lookups work
  console.log('→ Catalogues');

  const competencesRows = Object.entries(COMPETENCES_RCET).map(([code, label]) => ({
    user_id, code, label,
  }));
  await batchUpsert('competences', competencesRows, 'user_id,code');

  const formationsRows = Object.values(FORMATIONS).map((f) => ({
    user_id,
    formation_id: f.id,
    titre: f.libelle,
    competence: f.competence ?? null,
    targeted_comps: f.targetedComps ?? [],
    data: f,
  }));
  await batchUpsert('formations', formationsRows, 'user_id,formation_id');

  const crefocsRows = Object.entries(CREFOCS).map(([code, c]) => ({
    user_id, code,
    nom: c.nom, lieu: c.lieu, contact: c.contact, adresse: c.adresse,
    note: c.note, confirmed: c.confirmed, places: c.places,
    logistics: c.logistics,
  }));
  await batchUpsert('crefocs', crefocsRows, 'user_id,code');

  // Referential modules from catalogue.js — embed inline to avoid double source of truth
  const catalogueRaw = await readFile(join(ROOT, 'src', 'constants', 'catalogue.js'), 'utf-8');
  // Extract object literal between "export const CATALOGUE_FORMATIONS = {" and the trailing "};"
  const catalogueMatch = /export const CATALOGUE_FORMATIONS\s*=\s*(\{[\s\S]*?\n\});\s*$/m.exec(catalogueRaw);
  let catalogue = {};
  if (catalogueMatch) {
    // Safe-ish eval: it's a static literal from our own repo.
    // eslint-disable-next-line no-new-func
    catalogue = new Function(`return ${catalogueMatch[1]};`)();
  }
  const refRows = Object.values(catalogue).map((m) => ({
    user_id, module_id: m.id, data: m,
  }));
  await batchUpsert('referential_modules', refRows, 'user_id,module_id');

  // 4. Enseignants (parent — required for FKs on visits, observations, autopos)
  console.log('\n→ Operational data');
  const ensRaw = clean(await readJSON('Enseignants.json'));
  const ensRows = ensRaw.map((e) => mapEnseignant(e, user_id)).filter((r) => !!r.ens_id);
  await batchUpsert('enseignants', ensRows, 'user_id,ens_id');

  // Build set of valid ens_ids for FK validation on dependents.
  const validEns = new Set(ensRows.map((r) => r.ens_id));

  // 5. Sessions
  const sesRaw = clean(await readJSON('Sessions.json'));
  const sesRows = sesRaw.map((s) => mapSession(s, user_id)).filter((r) => !!r.session_id);
  await batchUpsert('sessions', sesRows, 'user_id,session_id');

  // 6. Observations (FK → enseignants)
  const obsRaw = clean(await readJSON('Observations.json'));
  const obsAll = obsRaw.map((o) => mapObservation(o, user_id)).filter((r) => !!r.obs_id);
  const obsRows = obsAll.filter((r) => validEns.has(r.ens_id));
  const obsSkipped = obsAll.length - obsRows.length;
  if (obsSkipped) console.log(`  ⚠ observations: skipping ${obsSkipped} rows with unknown ens_id`);
  await batchUpsert('observations', obsRows, 'user_id,obs_id');

  // 7. Autopositionnement (FK → enseignants)
  const autoRaw = clean(await readJSON('Autopositionnement.json'));
  const autoAll = autoRaw.map((a) => mapAutopos(a, user_id)).filter((r) => !!r.autopos_id);
  const autoRows = autoAll.filter((r) => validEns.has(r.ens_id));
  const autoSkipped = autoAll.length - autoRows.length;
  if (autoSkipped) console.log(`  ⚠ autopositionnement: skipping ${autoSkipped} rows with unknown ens_id`);
  await batchUpsert('autopositionnement', autoRows, 'user_id,autopos_id');

  // 8. Kirkpatrick L1/L2/L3 (no FK in schema, but we keep ens_id text)
  const satRaw = clean(await readJSON('Satisfaction.json'));
  const satRows = satRaw.map((s) => mapSatisfaction(s, user_id)).filter((r) => !!r.sat_id);
  await batchUpsert('satisfaction', satRows, 'user_id,sat_id');

  const acqRaw = clean(await readJSON('Acquis.json'));
  const acqRows = acqRaw.map((a) => mapAcquis(a, user_id)).filter((r) => !!r.acq_id);
  await batchUpsert('acquis', acqRows, 'user_id,acq_id');

  const traRaw = clean(await readJSON('Transfert.json'));
  const traRows = traRaw.map((t) => mapTransfert(t, user_id)).filter((r) => !!r.trans_id);
  await batchUpsert('transfert', traRows, 'user_id,trans_id');

  // 9. Triangulation
  const triRaw = clean(await readJSON('Triangulation.json'));
  const triRows = triRaw.map((b) => mapBesoin(b, user_id)).filter((r) => !!r.besoin_id);
  await batchUpsert('triangulation_besoins', triRows, 'user_id,besoin_id');

  // 10. Done
  console.log('\n━━━ Migration complete ━━━');
  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error('\n✗ Migration failed:', err.message ?? err);
  process.exit(1);
});
