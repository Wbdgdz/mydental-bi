const express = require('express');
const router = express.Router();

module.exports = (connection) => {

  // 1. Endpoint: Taux d'impayés Global (CORRIGÉ : Ignore les négatifs)
  router.get('/unpaid-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        -- CA Facturé : On ignore les lignes négatives (avoirs/erreurs) pour ne pas fausser le total
        SUM(CASE WHEN amount + remaining_amount > 0 THEN amount + remaining_amount ELSE 0 END) AS total_amount,
        
        -- Reste à charge : On ignore les montants négatifs (trop perçu)
        SUM(CASE WHEN remaining_amount > 0 THEN remaining_amount ELSE 0 END) AS total_remaining,
        
        -- Pourcentage recalculé sur ces bases saines
        ROUND((
          SUM(CASE WHEN remaining_amount > 0 THEN remaining_amount ELSE 0 END) 
          / 
          NULLIF(SUM(CASE WHEN amount + remaining_amount > 0 THEN amount + remaining_amount ELSE 0 END), 0)
        ) * 100, 2) AS unpaid_rate_percent
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

  // 2. Endpoint: Panier Moyen
  router.get('/average-ticket', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        ROUND(AVG(amount + remaining_amount), 2) AS average_ticket
      FROM payment
      WHERE date BETWEEN ? AND ? 
      AND (amount + remaining_amount) > 0; -- On exclut les actes gratuits ou annulés
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Average Ticket:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results[0]);
    });
  });

  // 3. Endpoint: Répartition par Mode de Paiement
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

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Payment Methods:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // 4. Endpoint: Distinction "Vrai Impayé" vs "Attente Tiers Payant"
  router.get('/unpaid-breakdown', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        -- Dette Patient (Espèces, CB, ou vide)
        SUM(CASE 
          WHEN (payment_type IN ('Espèces', 'Carte Bancaire', 'Carte') OR payment_type IS NULL) 
          THEN remaining_amount ELSE 0 
        END) AS patient_debt,

        -- Attente Tiers Payant (Virement, Chèque, Assurance)
        SUM(CASE 
          WHEN payment_type IN ('Virement', 'Chèque', 'Tiers Payant', 'Assurance', 'Convention') 
          THEN remaining_amount ELSE 0 
        END) AS insurance_pending
      FROM payment
      WHERE date BETWEEN ? AND ? 
      AND remaining_amount > 0; -- Sécurité : on ne regarde que les vraies dettes
    `;

    connection.query(query, [startDate, endDate], (error, results) => {
      if (error) {
        console.error('Erreur SQL Breakdown:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results[0]);
    });
  });

  // 5. Endpoint: Top 10 patients avec soldes impayés
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

  // 6. Endpoint: Taux de recouvrement
  router.get('/recovery-rate', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        -- On applique aussi la logique "positive" ici pour la cohérence
        ROUND((
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) 
          / 
          NULLIF(SUM(CASE WHEN amount + remaining_amount > 0 THEN amount + remaining_amount ELSE 0 END), 0)
        ) * 100, 2) AS full_payment_rate,
        
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

  // 7. Endpoint: Évolution mensuelle (Facturé vs Encaissé)
  router.get('/monthly-receivables', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises.' });

    const query = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') AS month,
        
        -- CA Facturé (Nettoyé des négatifs)
        SUM(CASE WHEN amount + remaining_amount > 0 THEN amount + remaining_amount ELSE 0 END) AS billed_revenue,
        
        -- Encaissé (Nettoyé)
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS collected_cash,
        
        -- Reste à charge (Nettoyé)
        SUM(CASE WHEN remaining_amount > 0 THEN remaining_amount ELSE 0 END) AS total_remaining,
        
        -- Taux recalculé
        ROUND((
            SUM(CASE WHEN remaining_amount > 0 THEN remaining_amount ELSE 0 END) 
            / 
            NULLIF(SUM(CASE WHEN amount + remaining_amount > 0 THEN amount + remaining_amount ELSE 0 END), 0)
        ) * 100, 2) AS unpaid_rate_percent,
        
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

  return router;
};