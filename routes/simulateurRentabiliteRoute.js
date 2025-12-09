const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Route pour calculer la rentabilité des actes
  router.get('/', (req, res) => {
    const { start, end, remunerationMedecin, coutCentre } = req.query;

    // Validation des paramètres
    if (!start || !end) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    // Valeurs par défaut si non fournies (en pourcentage)
    const remMed = parseFloat(remunerationMedecin) || 40; // 40% par défaut
    const coutCtr = parseFloat(coutCentre) || 25; // 25% par défaut

    // Requête SQL pour calculer la rentabilité par acte
    const query = `
      WITH actes_par_visit AS (
        SELECT 
            v.id AS visit_id,
            u.description1 AS acte,
            u.id AS acte_id
        FROM dental_diagram_udc ddu
        JOIN dental_diagram dd ON dd.id = ddu.dental_diagram_id
        JOIN udc u ON u.id = ddu.udc_id
        JOIN visit v ON v.id = dd.consultation_id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      ),
      nombre_actes_par_visit AS (
        SELECT 
            visit_id,
            COUNT(*) AS nb_actes
        FROM actes_par_visit
        GROUP BY visit_id
      ),
      revenus_par_acte AS (
        SELECT 
            apv.acte,
            apv.acte_id,
            SUM(p.amount / napv.nb_actes) AS totalRevenue,
            COUNT(DISTINCT apv.visit_id) AS nb_visites
        FROM actes_par_visit apv
        JOIN nombre_actes_par_visit napv ON apv.visit_id = napv.visit_id
        JOIN payment p ON p.consultation_id = apv.visit_id
        GROUP BY apv.acte, apv.acte_id
      ),
      statistiques_actes AS (
        SELECT 
            apv.acte,
            apv.acte_id,
            COUNT(DISTINCT v.id) AS total_visits,
            COUNT(DISTINCT v.patient_id) AS unique_patients,
            SUM(TIMESTAMPDIFF(MINUTE, v.startDate, v.endDate)) / 60.0 AS total_hours
        FROM actes_par_visit apv
        JOIN visit v ON v.id = apv.visit_id
        WHERE v.startDate IS NOT NULL AND v.endDate IS NOT NULL
        GROUP BY apv.acte, apv.acte_id
      )
      SELECT 
        sa.acte_id,
        sa.acte,
        sa.total_visits,
        sa.unique_patients AS uniq_patients,
        ROUND(COALESCE(sa.total_hours, 0), 2) AS total_hours,
        ROUND(COALESCE(rpa.totalRevenue, 0), 2) AS CA,
        ROUND(COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_hours, 0), 2) AS ca_par_heure,
        
        -- Calculs de rentabilité
        ROUND(COALESCE(rpa.totalRevenue, 0) * (? / 100), 2) AS remuneration_medecin,
        ROUND(COALESCE(rpa.totalRevenue, 0) * (? / 100), 2) AS cout_centre,
        ROUND(COALESCE(rpa.totalRevenue, 0) * (1 - (? + ?) / 100), 2) AS marge_brute,
        ROUND((1 - (? + ?) / 100) * 100, 2) AS marge_brute_pct,
        ROUND(
          (COALESCE(rpa.totalRevenue, 0) * (1 - (? + ?) / 100)) / NULLIF(sa.total_hours, 0), 
          2
        ) AS marge_par_heure,
        
        -- Prix moyen par acte
        ROUND(COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0), 2) AS prix_moyen_acte
        
      FROM statistiques_actes sa
      LEFT JOIN revenus_par_acte rpa ON sa.acte = rpa.acte AND sa.acte_id = rpa.acte_id
      WHERE COALESCE(rpa.totalRevenue, 0) > 0
      ORDER BY CA DESC;
    `;

    // Exécution de la requête
    // Les paramètres sont répétés car utilisés plusieurs fois dans la requête
    db.query(
      query, 
      [
        start, end,  // Pour le filtre de dates
        remMed, coutCtr, // Pour remuneration_medecin et cout_centre
        remMed, coutCtr, // Pour marge_brute
        remMed, coutCtr, // Pour marge_brute_pct
        remMed, coutCtr  // Pour marge_par_heure
      ], 
      (err, results) => {
        if (err) {
          console.error('Erreur lors de l\'exécution de la requête:', err);
          return res.status(500).json({ error: 'Erreur du serveur', details: err.message });
        }

        // Retourner les résultats avec les paramètres utilisés
        res.json({
          parametres: {
            remunerationMedecin: remMed,
            coutCentre: coutCtr,
            margeCible: 100 - remMed - coutCtr
          },
          actes: results
        });
      }
    );
  });

  // Route pour calculer les nouveaux tarifs suggérés
  router.get('/suggestion-tarifs', (req, res) => {
    const { start, end, remunerationMedecin, coutCentre, margeCible } = req.query;

    // Validation des paramètres
    if (!start || !end) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const remMed = parseFloat(remunerationMedecin) || 40;
    const coutCtr = parseFloat(coutCentre) || 25;
    const targetMarge = parseFloat(margeCible) || 30;

    const query = `
      WITH actes_par_visit AS (
        SELECT 
            v.id AS visit_id,
            u.description1 AS acte,
            u.id AS acte_id
        FROM dental_diagram_udc ddu
        JOIN dental_diagram dd ON dd.id = ddu.dental_diagram_id
        JOIN udc u ON u.id = ddu.udc_id
        JOIN visit v ON v.id = dd.consultation_id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      ),
      nombre_actes_par_visit AS (
        SELECT 
            visit_id,
            COUNT(*) AS nb_actes
        FROM actes_par_visit
        GROUP BY visit_id
      ),
      revenus_par_acte AS (
        SELECT 
            apv.acte,
            apv.acte_id,
            SUM(p.amount / napv.nb_actes) AS totalRevenue,
            COUNT(DISTINCT apv.visit_id) AS nb_visites
        FROM actes_par_visit apv
        JOIN nombre_actes_par_visit napv ON apv.visit_id = napv.visit_id
        JOIN payment p ON p.consultation_id = apv.visit_id
        GROUP BY apv.acte, apv.acte_id
      ),
      statistiques_actes AS (
        SELECT 
            apv.acte,
            apv.acte_id,
            COUNT(DISTINCT v.id) AS total_visits
        FROM actes_par_visit apv
        JOIN visit v ON v.id = apv.visit_id
        GROUP BY apv.acte, apv.acte_id
      )
      SELECT 
        sa.acte_id,
        sa.acte,
        ROUND(COALESCE(rpa.totalRevenue, 0), 2) AS ca_actuel,
        ROUND(COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0), 2) AS prix_actuel,
        
        -- Calcul du nouveau tarif pour atteindre la marge cible
        -- Si marge actuelle < marge cible, augmenter le prix
        -- Nouveau_Prix = Prix_Actuel / (1 - (RemMed% + CoutCentre%)) * (1 - MargeCible%)
        -- Simplifié: Prix_Actuel * (100 - MargeCible) / (100 - RemMed - CoutCentre)
        ROUND(
          (COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0)) * 
          ((100 - ?) / (100 - ? - ?)),
          2
        ) AS tarif_suggere,
        
        ROUND((1 - (? + ?) / 100) * 100, 2) AS marge_actuelle_pct,
        ? AS marge_cible_pct,
        
        -- CA projeté avec le nouveau tarif
        ROUND(
          ((COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0)) * 
          ((100 - ?) / (100 - ? - ?))) * sa.total_visits,
          2
        ) AS ca_projete,
        
        -- Variation en pourcentage
        ROUND(
          ((((COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0)) * 
          ((100 - ?) / (100 - ? - ?))) 
          / NULLIF((COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_visits, 0)), 0) - 1) * 100),
          2
        ) AS variation_pct
        
      FROM statistiques_actes sa
      LEFT JOIN revenus_par_acte rpa ON sa.acte = rpa.acte AND sa.acte_id = rpa.acte_id
      WHERE COALESCE(rpa.totalRevenue, 0) > 0
      ORDER BY ca_actuel DESC;
    `;

    db.query(
      query,
      [
        start, end,
        targetMarge, remMed, coutCtr,  // Pour tarif_suggere
        remMed, coutCtr,               // Pour marge_actuelle_pct
        targetMarge,                    // Pour marge_cible_pct
        targetMarge, remMed, coutCtr,  // Pour ca_projete
        targetMarge, remMed, coutCtr   // Pour variation_pct
      ],
      (err, results) => {
        if (err) {
          console.error('Erreur lors de l\'exécution de la requête:', err);
          return res.status(500).json({ error: 'Erreur du serveur', details: err.message });
        }

        res.json({
          parametres: {
            remunerationMedecin: remMed,
            coutCentre: coutCtr,
            margeCible: targetMarge
          },
          suggestions: results
        });
      }
    );
  });

  return router;
};
