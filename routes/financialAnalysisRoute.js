const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  // Endpoint: Taux d'impayés (Unpaid rate)
  router.get('/unpaid-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const query = `
      SELECT 
        SUM(amount) AS total_amount,
        SUM(remaining_amount) AS total_remaining,
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount), 0)) * 100, 2) AS unpaid_rate_percent
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération du taux d\'impayés:', error);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results[0]);
    });
  });

  // Endpoint: Créances par ancienneté (Receivables by aging)
  router.get('/receivables-aging', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

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
        console.error('Erreur lors de la récupération des créances par ancienneté:', error);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results[0]);
    });
  });

  // Endpoint: Top 10 patients avec soldes impayés (Top 10 patients with unpaid balances)
  router.get('/top-unpaid-patients', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const query = `
      SELECT 
        p.id AS patient_id,
        CONCAT(p.firstName, ' ', p.lastName) AS patient_name,
        SUM(pay.remaining_amount) AS total_unpaid,
        COUNT(pay.id) AS payment_count,
        MAX(pay.date) AS last_payment_date
      FROM payment pay
      JOIN consultation c ON pay.consultation_id = c.id
      JOIN visit v ON c.id = v.id
      JOIN patient p ON v.patient_id = p.id
      WHERE pay.date BETWEEN ? AND ? AND pay.remaining_amount > 0
      GROUP BY p.id, p.firstName, p.lastName
      ORDER BY total_unpaid DESC
      LIMIT 10;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération des patients avec impayés:', error);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Évolution mensuelle des créances (Monthly evolution of receivables)
  router.get('/monthly-receivables', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const query = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') AS month,
        SUM(amount) AS total_amount,
        SUM(remaining_amount) AS total_remaining,
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount), 0)) * 100, 2) AS unpaid_rate_percent,
        COUNT(id) AS payment_count
      FROM payment
      WHERE date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération de l\'évolution mensuelle:', error);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results);
    });
  });

  // Endpoint: Taux de recouvrement (Recovery rate)
  router.get('/recovery-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN remaining_amount > 0 AND remaining_amount < amount THEN id END) AS partial_payments,
        COUNT(DISTINCT CASE WHEN remaining_amount = 0 THEN id END) AS full_payments,
        COUNT(DISTINCT CASE WHEN remaining_amount = amount THEN id END) AS no_payments,
        COUNT(DISTINCT id) AS total_payments,
        ROUND((COUNT(DISTINCT CASE WHEN remaining_amount = 0 THEN id END) / NULLIF(COUNT(DISTINCT id), 0)) * 100, 2) AS full_payment_rate,
        ROUND((COUNT(DISTINCT CASE WHEN remaining_amount > 0 AND remaining_amount < amount THEN id END) / NULLIF(COUNT(DISTINCT id), 0)) * 100, 2) AS partial_payment_rate
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération du taux de recouvrement:', error);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results[0]);
    });
  });

  return router;
};
