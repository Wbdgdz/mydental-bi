const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  // Constants for capacity calculation
  const STANDARD_WORKING_HOURS = 8; // Standard working hours per day
  const AVG_CONSULTATION_DURATION = 0.5; // Average consultation duration in hours (30 minutes)

  // Endpoint: Nombre de patients par mois
  router.get('/monthly-patient-count', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      SELECT 
        DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m') AS month,
        COUNT(DISTINCT v.patient_id) AS unique_patients,
        COUNT(v.id) AS total_visits,
        ROUND(COUNT(v.id) / COUNT(DISTINCT v.patient_id), 2) AS avg_visits_per_patient
      FROM visit v
      WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m')
      ORDER BY month;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération du nombre de patients par mois:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Périodes de forte affluence (jour de la semaine et heure)
  router.get('/peak-periods', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      SELECT 
        DAYOFWEEK(v.currentLocalTimeAssignment) AS day_of_week,
        HOUR(v.currentLocalTimeAssignment) AS hour_of_day,
        COUNT(DISTINCT v.patient_id) AS unique_patients,
        COUNT(v.id) AS total_visits,
        CASE DAYOFWEEK(v.currentLocalTimeAssignment)
          WHEN 1 THEN 'Dimanche'
          WHEN 2 THEN 'Lundi'
          WHEN 3 THEN 'Mardi'
          WHEN 4 THEN 'Mercredi'
          WHEN 5 THEN 'Jeudi'
          WHEN 6 THEN 'Vendredi'
          WHEN 7 THEN 'Samedi'
        END AS day_name
      FROM visit v
      WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      GROUP BY day_of_week, hour_of_day, day_name
      ORDER BY day_of_week, hour_of_day;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération des périodes de forte affluence:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Capacité résiduelle par médecin
  router.get('/doctor-capacity', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      WITH doctor_stats AS (
        SELECT 
          u.id AS doctor_id,
          CONCAT(u.firstName, ' ', u.lastName) AS doctor_name,
          COUNT(v.id) AS total_consultations,
          COUNT(DISTINCT DATE(v.currentLocalTimeAssignment)) AS working_days,
          SUM(TIMESTAMPDIFF(MINUTE, v.currentLocalTimeAssignment, v.release_datetime)) / 60 AS total_hours,
          ROUND(SUM(TIMESTAMPDIFF(MINUTE, v.currentLocalTimeAssignment, v.release_datetime)) / 60 / 
                COUNT(DISTINCT DATE(v.currentLocalTimeAssignment)), 2) AS avg_hours_per_day
        FROM visit v
        JOIN user u ON v.user_activated_id = u.id
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
        AND v.release_datetime IS NOT NULL
        GROUP BY u.id, doctor_name
      )
      SELECT 
        doctor_id,
        doctor_name,
        total_consultations,
        working_days,
        ROUND(total_hours, 2) AS total_hours,
        avg_hours_per_day,
        ROUND(total_consultations / NULLIF(working_days, 0), 2) AS avg_consultations_per_day,
        -- Capacité résiduelle estimée (basée sur les constantes configurables)
        ROUND((${STANDARD_WORKING_HOURS} - avg_hours_per_day) / ${AVG_CONSULTATION_DURATION}, 0) AS estimated_daily_capacity,
        CASE 
          WHEN avg_hours_per_day < 6 THEN 'Faible utilisation'
          WHEN avg_hours_per_day BETWEEN 6 AND 7.5 THEN 'Utilisation normale'
          ELSE 'Forte utilisation'
        END AS utilization_status
      FROM doctor_stats
      ORDER BY total_consultations DESC;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération de la capacité par médecin:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Indicateurs globaux de flux
  router.get('/global-flow-indicators', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
      WITH flow_stats AS (
        SELECT 
          COUNT(DISTINCT v.patient_id) AS total_patients,
          COUNT(v.id) AS total_visits,
          COUNT(DISTINCT DATE(v.currentLocalTimeAssignment)) AS total_days,
          COUNT(DISTINCT v.user_activated_id) AS total_doctors
        FROM visit v
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      ),
      peak_day AS (
        SELECT 
          DATE(v.currentLocalTimeAssignment) AS peak_date,
          COUNT(v.id) AS visit_count
        FROM visit v
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
        GROUP BY DATE(v.currentLocalTimeAssignment)
        ORDER BY visit_count DESC
        LIMIT 1
      ),
      peak_hour AS (
        SELECT 
          HOUR(v.currentLocalTimeAssignment) AS peak_hour,
          COUNT(v.id) AS visit_count
        FROM visit v
        WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
        GROUP BY HOUR(v.currentLocalTimeAssignment)
        ORDER BY visit_count DESC
        LIMIT 1
      )
      SELECT 
        fs.total_patients,
        fs.total_visits,
        fs.total_days,
        fs.total_doctors,
        ROUND(fs.total_visits / NULLIF(fs.total_days, 0), 2) AS avg_visits_per_day,
        ROUND(fs.total_patients / NULLIF(fs.total_days, 0), 2) AS avg_patients_per_day,
        pd.peak_date,
        pd.visit_count AS peak_day_visits,
        ph.peak_hour,
        ph.visit_count AS peak_hour_visits
      FROM flow_stats fs, peak_day pd, peak_hour ph;
    `;

    connection.query(
      query,
      [startDate, endDate, startDate, endDate, startDate, endDate],
      (error, results) => {
        if (error) {
          console.error('Erreur lors de la récupération des indicateurs globaux:', error);
          return res.status(500).json({ message: 'Erreur serveur' });
        }
        res.json(results[0] || {});
      }
    );
  });

  // Endpoint: Export CSV for patient flow forecasting
  router.get('/export-csv', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    // Validate date format to prevent injection (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: 'Format de date invalide. Utilisez YYYY-MM-DD.' });
    }

    const query = `
      SELECT 
        DATE(v.currentLocalTimeAssignment) AS date,
        DAYOFWEEK(v.currentLocalTimeAssignment) AS day_of_week,
        CASE DAYOFWEEK(v.currentLocalTimeAssignment)
          WHEN 1 THEN 'Dimanche'
          WHEN 2 THEN 'Lundi'
          WHEN 3 THEN 'Mardi'
          WHEN 4 THEN 'Mercredi'
          WHEN 5 THEN 'Jeudi'
          WHEN 6 THEN 'Vendredi'
          WHEN 7 THEN 'Samedi'
        END AS day_name,
        HOUR(v.currentLocalTimeAssignment) AS hour,
        COUNT(v.id) AS total_visits,
        COUNT(DISTINCT v.patient_id) AS unique_patients,
        COUNT(DISTINCT v.user_activated_id) AS active_doctors
      FROM visit v
      WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
      GROUP BY DATE(v.currentLocalTimeAssignment), HOUR(v.currentLocalTimeAssignment), day_of_week, day_name
      ORDER BY date, hour;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de l\'export CSV:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
      }

      // Generate CSV content
      const csvHeaders = ['date', 'day_of_week', 'day_name', 'hour', 'total_visits', 'unique_patients', 'active_doctors'];
      let csvContent = csvHeaders.join(',') + '\n';
      
      results.forEach(row => {
        const csvRow = csvHeaders.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += csvRow.join(',') + '\n';
      });

      // Sanitize dates for filename (already validated above, but extra safety)
      const safeStartDate = startDate.replace(/[^0-9-]/g, '');
      const safeEndDate = endDate.replace(/[^0-9-]/g, '');

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=patient-flow-data-${safeStartDate}-to-${safeEndDate}.csv`);
      res.send(csvContent);
    });
  });

  // Endpoint: Get prediction data from CSV
  router.get('/predictions', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const csvPath = path.join(__dirname, '../public/data/previsions_flux_2024_2027.csv');

    fs.readFile(csvPath, 'utf8', (error, data) => {
      if (error) {
        console.error('Erreur lors de la lecture du fichier CSV:', error);
        return res.status(500).json({ message: 'Erreur lors de la lecture des prévisions' });
      }

      // Parse CSV
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',');
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        results.push(row);
      }

      res.json(results);
    });
  });

  return router;
};
