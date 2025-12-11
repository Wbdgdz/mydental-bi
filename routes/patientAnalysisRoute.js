const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  // Endpoint: Indicateurs globaux des patients
  router.get('/global-indicators', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      WITH patient_stats AS (
        SELECT 
          COUNT(DISTINCT v.patient_id) AS total_patients,
          -- Nouveaux patients (première visite dans la période)
          COUNT(DISTINCT CASE 
            WHEN first_visit.first_visit_date BETWEEN ? AND ? 
            THEN v.patient_id 
          END) AS new_patients,
          -- Patients fidèles (ont eu des visites avant la période et pendant la période)
          COUNT(DISTINCT CASE 
            WHEN first_visit.first_visit_date < ? AND v.currentLocalTimeAssignment BETWEEN ? AND ?
            THEN v.patient_id 
          END) AS returning_patients,
          -- Patients avec une seule visite
          COUNT(DISTINCT CASE 
            WHEN patient_visit_count.visit_count = 1 
            THEN v.patient_id 
          END) AS single_visit_patients,
          -- Patients avec multiples visites
          COUNT(DISTINCT CASE 
            WHEN patient_visit_count.visit_count > 1 
            THEN v.patient_id 
          END) AS multi_visit_patients
        FROM visit v
        LEFT JOIN (
          SELECT patient_id, MIN(currentLocalTimeAssignment) AS first_visit_date
          FROM visit
          GROUP BY patient_id
        ) AS first_visit ON v.patient_id = first_visit.patient_id
        LEFT JOIN (
          SELECT patient_id, COUNT(id) AS visit_count
          FROM visit
          GROUP BY patient_id
        ) AS patient_visit_count ON v.patient_id = patient_visit_count.patient_id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      ),
      retention_stats AS (
        SELECT 
          -- Nouveaux patients qui sont revenus
          COUNT(DISTINCT CASE 
            WHEN first_visit.first_visit_date BETWEEN ? AND ?
            AND patient_visit_count.visit_count > 1
            THEN v.patient_id 
          END) AS new_patients_returned
        FROM visit v
        LEFT JOIN (
          SELECT patient_id, MIN(currentLocalTimeAssignment) AS first_visit_date
          FROM visit
          GROUP BY patient_id
        ) AS first_visit ON v.patient_id = first_visit.patient_id
        LEFT JOIN (
          SELECT patient_id, COUNT(id) AS visit_count
          FROM visit
          WHERE currentLocalTimeAssignment BETWEEN ? AND ?
          GROUP BY patient_id
        ) AS patient_visit_count ON v.patient_id = patient_visit_count.patient_id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      ),
      avg_visits AS (
        SELECT 
          ROUND(AVG(visit_count), 2) AS avg_visits_per_patient
        FROM (
          SELECT patient_id, COUNT(id) AS visit_count
          FROM visit
          WHERE currentLocalTimeAssignment BETWEEN ? AND ?
          GROUP BY patient_id
        ) AS patient_visits
      )
      SELECT 
        ps.*,
        rs.new_patients_returned,
        av.avg_visits_per_patient,
        ROUND((rs.new_patients_returned / NULLIF(ps.new_patients, 0)) * 100, 2) AS retention_rate
      FROM patient_stats ps, retention_stats rs, avg_visits av;
    `;

    connection.query(
      query,
      [startDate, endDate, startDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate],
      (error, results) => {
        if (error) {
          console.error('Erreur lors de la récupération des indicateurs globaux:', error);
          return res.status(500).json({ message: 'Erreur serveur' });
        }
        res.json(results[0] || {});
      }
    );
  });

  // Endpoint: Évolution mensuelle des patients
  router.get('/monthly-evolution', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      WITH monthly_data AS (
        SELECT 
          DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m') AS month,
          COUNT(DISTINCT v.patient_id) AS total_patients,
          COUNT(DISTINCT v.id) AS total_visits,
          COUNT(DISTINCT CASE 
            WHEN first_visit.first_visit_date >= DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-01')
            AND first_visit.first_visit_date < DATE_ADD(DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-01'), INTERVAL 1 MONTH)
            THEN v.patient_id 
          END) AS new_patients,
          COUNT(DISTINCT CASE 
            WHEN first_visit.first_visit_date < DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-01')
            THEN v.patient_id 
          END) AS returning_patients
        FROM visit v
        LEFT JOIN (
          SELECT patient_id, MIN(currentLocalTimeAssignment) AS first_visit_date
          FROM visit
          GROUP BY patient_id
        ) AS first_visit ON v.patient_id = first_visit.patient_id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m')
      )
      SELECT 
        month,
        total_patients,
        total_visits,
        new_patients,
        returning_patients,
        ROUND(total_visits / NULLIF(total_patients, 0), 2) AS avg_visits_per_patient,
        SUM(new_patients) OVER (ORDER BY month) AS cumulative_new_patients,
        SUM(returning_patients) OVER (ORDER BY month) AS cumulative_returning_patients
      FROM monthly_data
      ORDER BY month;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération de l\'évolution mensuelle:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Analyse de la rétention des patients
  router.get('/retention-analysis', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      WITH patient_visit_summary AS (
        SELECT 
          patient_id,
          COUNT(id) AS total_visits,
          MIN(currentLocalTimeAssignment) AS first_visit,
          MAX(currentLocalTimeAssignment) AS last_visit,
          DATEDIFF(MAX(currentLocalTimeAssignment), MIN(currentLocalTimeAssignment)) AS days_between_first_last
        FROM visit
        WHERE currentLocalTimeAssignment BETWEEN ? AND ?
        GROUP BY patient_id
      ),
      total_patients AS (
        SELECT COUNT(DISTINCT patient_id) AS total_count
        FROM visit
        WHERE currentLocalTimeAssignment BETWEEN ? AND ?
      )
      SELECT 
        '1 visite' AS visit_category,
        COUNT(*) AS patient_count,
        ROUND((COUNT(*) / (SELECT total_count FROM total_patients)) * 100, 2) AS percentage
      FROM patient_visit_summary
      WHERE total_visits = 1
      UNION ALL
      SELECT 
        '2-3 visites' AS visit_category,
        COUNT(*) AS patient_count,
        ROUND((COUNT(*) / (SELECT total_count FROM total_patients)) * 100, 2) AS percentage
      FROM patient_visit_summary
      WHERE total_visits BETWEEN 2 AND 3
      UNION ALL
      SELECT 
        '4-6 visites' AS visit_category,
        COUNT(*) AS patient_count,
        ROUND((COUNT(*) / (SELECT total_count FROM total_patients)) * 100, 2) AS percentage
      FROM patient_visit_summary
      WHERE total_visits BETWEEN 4 AND 6
      UNION ALL
      SELECT 
        '7+ visites' AS visit_category,
        COUNT(*) AS patient_count,
        ROUND((COUNT(*) / (SELECT total_count FROM total_patients)) * 100, 2) AS percentage
      FROM patient_visit_summary
      WHERE total_visits >= 7
      ORDER BY patient_count DESC;
    `;

    connection.query(
      query,
      [startDate, endDate, startDate, endDate],
      (error, results) => {
        if (error) {
          console.error('Erreur lors de la récupération de l\'analyse de rétention:', error);
          return res.status(500).json({ message: 'Erreur serveur' });
        }
        res.json(results);
      }
    );
  });

  return router;
};
