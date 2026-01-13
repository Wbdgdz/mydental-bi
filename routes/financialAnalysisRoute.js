const express = require('express');
const router = express.Router();

module.exports = (connection) => {

  // 1. Taux d'impayés Global
  router.get('/unpaid-rate', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        SUM(amount + remaining_amount) AS total_amount,
        SUM(remaining_amount) AS total_remaining,
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS unpaid_rate_percent
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) {
        console.error("Erreur Unpaid Rate:", err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results[0]);
    });
  });

  // 2. Panier Moyen (Average Transaction Value)
  router.get('/average-ticket', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        ROUND(AVG(amount + remaining_amount), 2) AS average_ticket,
        COUNT(id) AS total_transactions
      FROM payment
      WHERE date BETWEEN ? AND ? 
      AND (amount + remaining_amount) > 0;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(results[0]);
    });
  });

  // 3. Répartition par Mode de Paiement (Pour le Camembert)
  router.get('/payment-methods', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        IFNULL(payment_type, 'Non spécifié') AS method,
        SUM(amount) AS total_amount
      FROM payment
      WHERE date BETWEEN ? AND ?
      GROUP BY payment_type
      ORDER BY total_amount DESC;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(results);
    });
  });

  // 4. Distinction "Vrai Impayé" vs "Attente Tiers Payant"
  router.get('/unpaid-breakdown', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        SUM(CASE 
          WHEN (payment_type IN ('Espèces', 'Carte Bancaire', 'Carte') OR payment_type IS NULL) 
          THEN remaining_amount ELSE 0 
        END) AS patient_debt,

        SUM(CASE 
          WHEN payment_type IN ('Virement', 'Chèque', 'Tiers Payant', 'Assurance') 
          THEN remaining_amount ELSE 0 
        END) AS insurance_pending
      FROM payment
      WHERE date BETWEEN ? AND ? 
      AND remaining_amount > 0;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(results[0]);
    });
  });

  // 5. Top 10 Patients Impayés
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
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(results);
    });
  });

  // 6. Taux de Recouvrement (Financier)
  router.get('/recovery-rate', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        ROUND((SUM(amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS full_payment_rate,
        COUNT(CASE WHEN remaining_amount <= 0.01 THEN 1 END) AS count_full_payments,
        COUNT(id) AS total_payments_count
      FROM payment
      WHERE date BETWEEN ? AND ?;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      const data = results[0];
      res.json({
          full_payment_rate: data.full_payment_rate || 0, 
          partial_payment_rate: (100 - (data.full_payment_rate || 0)).toFixed(2),
          full_payments: data.count_full_payments,
          total_payments: data.total_payments_count
      });
    });
  });

  // 7. Évolution Mensuelle (Enrichie : Facturé vs Encaissé)
  router.get('/monthly-receivables', (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') AS month,
        SUM(amount + remaining_amount) AS billed_revenue, -- CA Facturé (Théorique)
        SUM(amount) AS collected_cash,                    -- CA Encaissé (Réel)
        SUM(remaining_amount) AS total_remaining,         -- Delta
        ROUND((SUM(remaining_amount) / NULLIF(SUM(amount + remaining_amount), 0)) * 100, 2) AS unpaid_rate_percent,
        COUNT(id) AS payment_count
      FROM payment
      WHERE date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month;
    `;
    connection.query(query, [startDate, endDate], (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(results);
    });
  });

  return router;
};