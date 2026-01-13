const express = require('express');
const router = express.Router();

module.exports = (connection) => {

  // 1. Endpoint: Taux d'impayés Global
  // REVENU SUR LA TABLE PAYMENT (car table visit vide financièrement)
  router.get('/unpaid-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        -- CA Total = Ce qui est payé + Ce qui reste à payer
        SUM(amount + remaining_amount) AS total_amount,
        
        -- Total Impayé
        SUM(remaining_amount) AS total_remaining,
        
        -- Calcul du pourcentage
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS unpaid_rate_percent
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Unpaid Rate:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results[0]);
    });
  });

  // 2. Endpoint: Créances par ancienneté
  router.get('/receivables-aging', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        SUM(CASE WHEN DATEDIFF(CURDATE(), date) < 30 THEN remaining_amount ELSE 0 END) AS less_than_30_days,
        SUM(CASE WHEN DATEDIFF(CURDATE(), date) BETWEEN 30 AND 59 THEN remaining_amount ELSE 0 END) AS between_30_60_days,
        SUM(CASE WHEN DATEDIFF(CURDATE(), date) BETWEEN 60 AND 89 THEN remaining_amount ELSE 0 END) AS between_60_90_days,
        SUM(CASE WHEN DATEDIFF(CURDATE(), date) >= 90 THEN remaining_amount ELSE 0 END) AS more_than_90_days,
        SUM(remaining_amount) AS total_receivables
      FROM payment
      WHERE date BETWEEN ? AND ? AND remaining_amount > 0;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Aging:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results[0]);
    });
  });

  // 3. Endpoint: Top 10 patients avec soldes impayés
  router.get('/top-unpaid-patients', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        p.id AS patient_id,
        CONCAT(p.firstName, ' ', p.lastName) AS patient_name,
        SUM(pay.remaining_amount) AS total_unpaid,
        COUNT(pay.id) AS payment_count,
        MAX(pay.date) AS last_payment_date
      FROM payment pay
      JOIN visit v ON pay.consultation_id = v.id
      JOIN patient p ON v.patient_id = p.id
      WHERE pay.date BETWEEN ? AND ? AND pay.remaining_amount > 0
      GROUP BY p.id, p.firstName, p.lastName
      ORDER BY total_unpaid DESC
      LIMIT 10;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Top Patients:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // 4. Endpoint: Évolution mensuelle des créances
  router.get('/monthly-receivables', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') AS month,
        SUM(amount + remaining_amount) AS total_amount, -- CA Reconstitué
        SUM(remaining_amount) AS total_remaining,
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS unpaid_rate_percent,
        COUNT(id) AS payment_count
      FROM payment
      WHERE date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Monthly:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // 5. Endpoint: Taux de recouvrement
  router.get('/recovery-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        -- Taux de recouvrement financier (Ce qui est encaissé / Ce qui aurait dû l'être)
        ROUND((SUM(amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS full_payment_rate,
        
        -- Volumes financiers pour vérification
        SUM(amount) AS total_collected_cash,
        SUM(amount + remaining_amount) AS total_expected_revenue,
        
        -- Compteurs de dossiers (Juste pour info visuelle)
        COUNT(CASE WHEN remaining_amount <= 0.01 THEN 1 END) AS count_full_payments,
        COUNT(id) AS total_payments_count
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Recovery Rate:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      const data = results[0];
      res.json({
          full_payment_rate: data.full_payment_rate || 0, 
          partial_payment_rate: (100 - (data.full_payment_rate || 0)).toFixed(2),
          full_payments: data.count_full_payments,
          total_payments: data.total_payments_count
      });
    });
  });

  return router;
};