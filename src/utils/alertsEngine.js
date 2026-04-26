import { analyzeVenueReadiness } from './formationMatcher';

/**
 * PedagoTrack alerts engine
 * Derives alerts dynamically from the reactive store (formations, crefocs, sessions,
 * enseignants) and merged Kirkpatrick data.
 *
 * Every emitted alert carries a rich envelope used by the UI:
 *   - alertId / priority / color / nom / message / detail  (legacy)
 *   - type          : 'blocking' | 'warning' | 'info'
 *   - source        : 'enseignants' | 'sessions' | 'formations' | 'crefocs' | 'acquis' | 'transfert' | 'satisfaction'
 *   - entityId      : stable identifier of the offending entity
 *   - actionLink    : { path, label } — where the user should go to act
 *   - computedAt    : ISO timestamp when the condition was detected
 *   - formation/circo/op/enseignantId : contextual grouping keys
 */

const PRIORITY_TO_TYPE = {
  critique: 'blocking',
  haute: 'warning',
  moyenne: 'warning',
  basse: 'info',
};

function typeOf(priority) {
  return PRIORITY_TO_TYPE[priority] || 'info';
}

function isUpcoming(statut) {
  return statut === 'Planifiée' || statut === 'Confirmée' || statut === 'Prochaine';
}

export function computeAlerts(config, data) {
  const {
    enseignants = [],
    sessions = [],
    satisfaction = [],
    acquis = [],
    transfert = [],
    crefocs = {},
    formations = {},
  } = data || {};

  const active = (config || []).filter(a => a.active);
  const results = [];
  const computedAt = new Date().toISOString();

  const formationIds = Object.keys(formations);
  const circoIds = Object.keys(crefocs);

  for (const alert of active) {
    switch (alert.id) {
      case 'A1': {
        const seuil = alert.seuil ?? 72;
        enseignants.forEach(e => {
          const d = parseInt(e['Délai depuis visite (mois)']);
          if (isNaN(d) || d <= seuil) return;
          results.push({
            alertId: 'A1',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'enseignants',
            color: alert.color,
            nom: alert.nom,
            message: alert.message,
            enseignantId: e['ID'],
            entityId: e['ID'],
            enseignant: `${e['Prénom']} ${e['Nom']}`,
            circo: e['Circonscription'],
            detail: `Délai : ${e['Délai depuis visite (mois)']} mois`,
            actionLink: { path: `/enseignants/${e['ID']}`, label: 'Ouvrir la fiche enseignant' },
            computedAt,
          });
        });
        break;
      }

      case 'A2': {
        const seuil = alert.seuil ?? 5;
        circoIds.forEach(circo => {
          const topTeachers = enseignants
            .filter(e => e['Circonscription'] === circo && e.priorityGroup !== 'unavailable')
            .sort((a, b) => (a.priorityRank || 99) - (b.priorityRank || 99))
            .slice(0, seuil);
          topTeachers.forEach(ens => {
            results.push({
              alertId: 'A2',
              priority: alert.priority,
              type: typeOf(alert.priority),
              source: 'enseignants',
              color: alert.color,
              nom: alert.nom,
              message: alert.message,
              enseignantId: ens['ID'],
              entityId: ens['ID'],
              enseignant: `${ens['Prénom']} ${ens['Nom']}`,
              circo,
              detail: `Rang #${ens.priorityRank} à ${circo} — à confirmer pour la prochaine session`,
              actionLink: { path: `/enseignants/${ens['ID']}`, label: 'Vérifier la sélection' },
              computedAt,
            });
          });
        });
        break;
      }

      case 'A3': {
        const seuil = alert.seuil ?? 50;
        formationIds.forEach(fId => {
          const fDef = formations[fId];
          const objectifs = fDef?.objectifs || [];
          if (!objectifs.length) return;
          const formationData = acquis.filter(a => a['Formation'] === fId);
          if (!formationData.length) return;
          objectifs.forEach(obj => {
            const opId = obj.id;
            const key = `${opId} atteint?`;
            const evaluables = formationData.filter(a => a[key] !== undefined && a[key] !== null && a[key] !== '');
            if (!evaluables.length) return;
            const atteints = evaluables.filter(a => a[key] === 'Oui').length;
            const taux = (atteints / evaluables.length) * 100;
            if (taux >= seuil) return;
            results.push({
              alertId: 'A3',
              priority: alert.priority,
              type: typeOf(alert.priority),
              source: 'acquis',
              color: alert.color,
              nom: alert.nom,
              message: alert.message.replace('[NOM OPP]', opId),
              detail: `${opId} — Formation ${fId} — Taux : ${taux.toFixed(0)}%`,
              entityId: `${fId}-${opId}`,
              formation: fId,
              op: opId,
              actionLink: { path: '/tableaux-de-bord', label: `Ouvrir le tableau ${fId}` },
              computedAt,
            });
          });
        });
        break;
      }

      case 'A4': {
        const seuil = alert.seuil ?? 3.0;
        formationIds.forEach(fId => {
          circoIds.forEach(circo => {
            const rows = satisfaction.filter(s => s['Formation'] === fId && s['Circo'] === circo);
            if (!rows.length) return;
            const avg = rows.reduce((sum, x) => sum + (parseFloat(x['Score global /5']) || 0), 0) / rows.length;
            if (avg >= seuil) return;
            results.push({
              alertId: 'A4',
              priority: alert.priority,
              type: typeOf(alert.priority),
              source: 'satisfaction',
              color: alert.color,
              nom: alert.nom,
              message: alert.message.replace('[Formation]', fId).replace('[Circo.]', circo),
              detail: `Score : ${avg.toFixed(2)}/5 — ${fId} / ${circo}`,
              entityId: `${fId}-${circo}`,
              formation: fId,
              circo,
              actionLink: { path: '/tableaux-de-bord', label: `Inspecter ${fId}` },
              computedAt,
            });
          });
        });
        break;
      }

      case 'A5': {
        transfert.forEach(t => {
          const flagged = t['Alerte'] === 'ALERTE' || t['Statut'] === 'Insuffisant';
          if (!flagged) return;
          results.push({
            alertId: 'A5',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'transfert',
            color: alert.color,
            nom: alert.nom,
            message: alert.message,
            enseignantId: t['ID Ens'],
            entityId: `${t['ID Ens']}-${t['Formation']}`,
            enseignant: `${t['Prénom']} ${t['Nom']}`,
            circo: t['Circo'],
            formation: t['Formation'],
            detail: `Formation : ${t['Formation']} — PAP réalisé : ${t['% réalisation'] ?? '—'} — Statut : ${t['Statut'] || '—'}`,
            actionLink: { path: `/enseignants/${t['ID Ens']}`, label: 'Voir le transfert' },
            computedAt,
          });
        });
        break;
      }

      case 'A6': {
        // Remplissage bas : Nb inscrits très inférieur à la capacité du CREFOC hôte
        const seuil = alert.seuil ?? 60; // % du capacity
        sessions.forEach(s => {
          const inscrits = parseInt(s['Nb inscrits']);
          if (isNaN(inscrits)) return;
          const crefoc = Object.values(crefocs).find(c => c.nom === s['Lieu']) || crefocs[s['Circonscription']];
          const capacity = parseInt(crefoc?.places);
          if (isNaN(capacity) || capacity === 0) return;
          const taux = (inscrits / capacity) * 100;
          if (taux >= seuil) return;
          results.push({
            alertId: 'A6',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'sessions',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Session]', `${s['Formation']} — ${s['Circonscription']}`),
            detail: `Inscrits : ${inscrits}/${capacity} (${taux.toFixed(0)}%)`,
            entityId: s['ID Session'],
            sessionId: s['ID Session'],
            formation: s['Formation'],
            circo: s['Circonscription'],
            actionLink: { path: '/sessions', label: 'Ajuster la session' },
            computedAt,
          });
        });
        break;
      }

      case 'A7': {
        const seuilMin = alert.seuilMin ?? 60;
        const seuilMax = alert.seuilMax ?? 90;
        circoIds.forEach(circo => {
          const circTeachers = enseignants.filter(e => e['Circonscription'] === circo);
          if (!circTeachers.length) return;
          const stagiaires = circTeachers.filter(e => e['Statut'] === 'Stagiaire').length;
          const ratio = (stagiaires / circTeachers.length) * 100;
          if (ratio >= seuilMin && ratio <= seuilMax) return;
          results.push({
            alertId: 'A7',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'enseignants',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Session]', circo),
            detail: `Ratio stagiaires : ${ratio.toFixed(0)}% (${stagiaires}/${circTeachers.length})`,
            entityId: circo,
            circo,
            actionLink: { path: '/enseignants', label: 'Analyser la composition' },
            computedAt,
          });
        });
        break;
      }

      case 'A8': {
        const seuil = alert.seuil ?? 0.8;
        formationIds.forEach(fId => {
          const rows = acquis.filter(a => a['Formation'] === fId);
          if (!rows.length) return;
          const avg = rows.reduce((sum, a) => sum + (parseFloat(a['Delta progression']) || 0), 0) / rows.length;
          if (avg >= seuil) return;
          results.push({
            alertId: 'A8',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'acquis',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Formation]', fId),
            detail: `Delta moyen : ${avg.toFixed(2)}/5 — ${fId}`,
            entityId: fId,
            formation: fId,
            actionLink: { path: '/tableaux-de-bord', label: `Réviser le design ${fId}` },
            computedAt,
          });
        });
        break;
      }

      case 'A9': {
        sessions.filter(s => isUpcoming(s['Statut'])).forEach(s => {
          const formation = formations[s['Formation']];
          const crefoc = Object.values(crefocs).find(c => c.nom === s['Lieu']) || crefocs[s['Circonscription']];
          if (!formation || !crefoc) return;
          const readiness = analyzeVenueReadiness(formation, crefoc);
          if (readiness.canHost) return;
          results.push({
            alertId: 'A9',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'crefocs',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Session]', s['Formation']).replace('[Lieu]', s['Lieu']),
            detail: `Manque : ${readiness.missing.join(', ')} — Readiness: ${readiness.score}%`,
            entityId: s['ID Session'],
            sessionId: s['ID Session'],
            formation: s['Formation'],
            circo: s['Circonscription'],
            actionLink: { path: '/parametres', label: 'Corriger la logistique CREFOC' },
            computedAt,
          });
        });
        break;
      }

      case 'A10': {
        const seuil = alert.seuil ?? 3;
        formationIds.forEach(fId => {
          circoIds.forEach(circo => {
            const upcoming = sessions.filter(s =>
              s['Formation'] === fId &&
              s['Circonscription'] === circo &&
              isUpcoming(s['Statut'])
            );
            if (!upcoming.length) return;
            const enrolledIds = new Set(upcoming.flatMap(s => s.inscrits || []));
            const topTeachers = enseignants
              .filter(e => e['Circonscription'] === circo && e.availabilityStatus !== 'unavailable')
              .sort((a, b) => (a.priorityRank || 99) - (b.priorityRank || 99))
              .slice(0, seuil);
            topTeachers.forEach(ens => {
              if (enrolledIds.has(ens['ID'])) return;
              results.push({
                alertId: 'A10',
                priority: alert.priority,
                type: typeOf(alert.priority),
                source: 'sessions',
                color: alert.color,
                nom: alert.nom,
                message: alert.message
                  .replace('[NOM]', `${ens['Prénom']} ${ens['Nom']}`)
                  .replace('[Formation]', fId)
                  .replace('[Circo]', circo),
                enseignantId: ens['ID'],
                entityId: `${ens['ID']}-${fId}-${circo}`,
                enseignant: `${ens['Prénom']} ${ens['Nom']}`,
                circo,
                formation: fId,
                detail: `Rang #${ens.priorityRank} — Non inscrit aux sessions prévues`,
                actionLink: { path: '/sessions', label: 'Inscrire l\'enseignant' },
                computedAt,
              });
            });
          });
        });
        break;
      }

      case 'A11': {
        // Formation sans objectifs configurés
        formationIds.forEach(fId => {
          const fDef = formations[fId];
          const objectifs = fDef?.objectifs || [];
          if (objectifs.length > 0) return;
          results.push({
            alertId: 'A11',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'formations',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Formation]', fId),
            detail: `${fDef?.libelle || fId} — Aucun objectif pédagogique défini`,
            entityId: fId,
            formation: fId,
            actionLink: { path: '/parametres', label: 'Configurer les objectifs' },
            computedAt,
          });
        });
        break;
      }

      case 'A12': {
        // Formation sans aucune session planifiée
        formationIds.forEach(fId => {
          const fSessions = sessions.filter(s => s['Formation'] === fId);
          if (fSessions.length > 0) return;
          const fDef = formations[fId];
          results.push({
            alertId: 'A12',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'sessions',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Formation]', fId),
            detail: `${fDef?.libelle || fId} — Aucune session planifiée`,
            entityId: fId,
            formation: fId,
            actionLink: { path: '/sessions', label: 'Planifier une session' },
            computedAt,
          });
        });
        break;
      }

      case 'A13': {
        // Session planifiée imminente sans lieu ou formateur défini
        sessions.filter(s => isUpcoming(s['Statut'])).forEach(s => {
          const missingLieu = !s['Lieu'] || !String(s['Lieu']).trim();
          const missingFormateur = !s['Formateur principal'] || !String(s['Formateur principal']).trim();
          if (!missingLieu && !missingFormateur) return;
          const missing = [];
          if (missingLieu) missing.push('lieu');
          if (missingFormateur) missing.push('formateur');
          results.push({
            alertId: 'A13',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'sessions',
            color: alert.color,
            nom: alert.nom,
            message: alert.message
              .replace('[Session]', s['ID Session'] || `${s['Formation']} / ${s['Circonscription']}`),
            detail: `Manque : ${missing.join(' + ')} — statut ${s['Statut']}`,
            entityId: s['ID Session'],
            sessionId: s['ID Session'],
            formation: s['Formation'],
            circo: s['Circonscription'],
            actionLink: { path: '/sessions', label: 'Compléter la session' },
            computedAt,
          });
        });
        break;
      }

      case 'A14': {
        // CREFOC sans capacité / logistique configurée
        circoIds.forEach(circo => {
          const c = crefocs[circo];
          if (!c) return;
          const places = parseInt(c.places);
          const hasLogistics = c.logistics && Object.values(c.logistics).some(Boolean);
          if (!isNaN(places) && places > 0 && hasLogistics) return;
          const missing = [];
          if (isNaN(places) || places === 0) missing.push('capacité');
          if (!hasLogistics) missing.push('équipements');
          results.push({
            alertId: 'A14',
            priority: alert.priority,
            type: typeOf(alert.priority),
            source: 'crefocs',
            color: alert.color,
            nom: alert.nom,
            message: alert.message.replace('[Circo]', circo),
            detail: `CREFOC ${c.nom || circo} — non renseigné : ${missing.join(', ')}`,
            entityId: circo,
            circo,
            actionLink: { path: '/parametres', label: 'Configurer le CREFOC' },
            computedAt,
          });
        });
        break;
      }

      default:
        break;
    }
  }

  return results;
}
