# Guide Technique d'Implémentation - Nouveaux Indicateurs BI

## 🎯 Objectif du Document

Ce guide fournit les spécifications techniques détaillées pour implémenter les nouveaux indicateurs identifiés dans l'analyse des besoins métier MYDental.

---

## 📐 Architecture Technique

### Stack Technologique Existante
- **Backend**: Node.js + Express.js
- **Database**: MariaDB (via MySQL2)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Visualisation**: D3.js v7
- **Authentification**: JWT

### Structure des Fichiers
```
mydental-bi/
├── server.js                    # Point d'entrée Express
├── routes/                      # Routes API existantes
│   ├── statsRoute.js           # KPIs généraux
│   ├── doctorIndicatorsRoute.js
│   └── ...
├── public/                      # Frontend
│   ├── index.html              # Dashboard clinique
│   ├── doctorPerformance.html  # Perf médecins
│   └── ...
└── db/                         # Scripts DB
```

---

## 🚀 Phase 1 - Quick Wins (5 indicateurs)

### 1. Analyse des Impayés et Créances

#### 1.1 Route API: `/api/financial-analysis/impayments`

**Fichier**: `routes/financialAnalysisRoute.js`

```javascript
// GET /api/financial-analysis/impayments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/impayments', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    WITH unpaid_analysis AS (
      SELECT 
        p.id,
        p.consultation_id,
        p.date,
        p.amount,
        p.remaining_amount,
        p.payment_type,
        pat.firstName,
        pat.lastName,
        pat.phone,
        DATEDIFF(NOW(), p.date) as days_overdue,
        CASE 
          WHEN DATEDIFF(NOW(), p.date) < 30 THEN '0-30 jours'
          WHEN DATEDIFF(NOW(), p.date) < 60 THEN '30-60 jours'
          WHEN DATEDIFF(NOW(), p.date) < 90 THEN '60-90 jours'
          ELSE '> 90 jours'
        END as aging_bucket
      FROM payment p
      JOIN visit v ON v.id = p.consultation_id
      JOIN patient pat ON pat.id = v.patient_id
      WHERE p.remaining_amount > 0
        AND p.date BETWEEN ? AND ?
    )
    SELECT 
      aging_bucket,
      COUNT(*) as count,
      SUM(remaining_amount) as total_unpaid,
      AVG(remaining_amount) as avg_unpaid,
      AVG(days_overdue) as avg_days_overdue
    FROM unpaid_analysis
    GROUP BY aging_bucket
    ORDER BY 
      CASE aging_bucket
        WHEN '0-30 jours' THEN 1
        WHEN '30-60 jours' THEN 2
        WHEN '60-90 jours' THEN 3
        ELSE 4
      END;
  `;
  
  connection.query(query, [startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error fetching impayments:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

// GET /api/financial-analysis/top-debtors
router.get('/top-debtors', (req, res) => {
  const { limit = 10 } = req.query;
  
  const query = `
    SELECT 
      pat.id,
      pat.firstName,
      pat.lastName,
      pat.phone,
      SUM(p.remaining_amount) as total_debt,
      COUNT(DISTINCT p.id) as unpaid_invoices_count,
      MAX(p.date) as last_payment_date,
      DATEDIFF(NOW(), MAX(p.date)) as days_since_last_payment
    FROM payment p
    JOIN visit v ON v.id = p.consultation_id
    JOIN patient pat ON pat.id = v.patient_id
    WHERE p.remaining_amount > 0
    GROUP BY pat.id, pat.firstName, pat.lastName, pat.phone
    ORDER BY total_debt DESC
    LIMIT ?;
  `;
  
  connection.query(query, [parseInt(limit)], (error, results) => {
    if (error) {
      console.error('Error fetching top debtors:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});
```

#### 1.2 Page Frontend: `financial-analysis.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Analyse Financière - MYDental BI</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <h1>Analyse des Impayés</h1>
    
    <!-- Période de sélection -->
    <div class="period-selector">
        <input type="date" id="start-date">
        <input type="date" id="end-date">
        <button id="apply-period">Mettre à jour</button>
    </div>
    
    <!-- KPIs -->
    <div class="stats-card-container">
        <div class="stats-card">
            <div class="stats-title">Total Impayés</div>
            <div class="stats-value" id="total-unpaid">--</div>
        </div>
        <div class="stats-card">
            <div class="stats-title">Nombre de Créances</div>
            <div class="stats-value" id="unpaid-count">--</div>
        </div>
        <div class="stats-card">
            <div class="stats-title">Taux d'Impayés</div>
            <div class="stats-value" id="unpaid-rate">--</div>
        </div>
    </div>
    
    <!-- Graphique aging -->
    <div id="aging-chart"></div>
    
    <!-- Top débiteurs -->
    <div id="top-debtors-table"></div>
    
    <script src="utilities/auth.js"></script>
    <script src="financial/impayments.js"></script>
</body>
</html>
```

#### 1.3 JavaScript: `public/financial/impayments.js`

```javascript
const token = localStorage.getItem('authToken');

async function fetchImpayments(startDate, endDate) {
  const response = await fetch(
    `/api/financial-analysis/impayments?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}

async function renderAgingChart(data) {
  const svg = d3.select('#aging-chart')
    .append('svg')
    .attr('width', 600)
    .attr('height', 400);
  
  // Implémentation du graphique en barres D3.js
  // Afficher les catégories d'âge sur l'axe X
  // et les montants impayés sur l'axe Y
}

// Initialisation au chargement de la page
document.getElementById('apply-period').addEventListener('click', async () => {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  const data = await fetchImpayments(startDate, endDate);
  renderAgingChart(data);
});
```

---

### 2. Mix de Paiement

#### 2.1 Route API: `/api/financial-analysis/payment-mix`

```javascript
router.get('/payment-mix', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    SELECT 
      payment_type,
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      (SUM(amount) / (SELECT SUM(amount) FROM payment WHERE date BETWEEN ? AND ?)) * 100 as percentage
    FROM payment
    WHERE date BETWEEN ? AND ?
      AND payment_type IS NOT NULL
    GROUP BY payment_type
    ORDER BY total_amount DESC;
  `;
  
  connection.query(query, [startDate, endDate, startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error fetching payment mix:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

router.get('/payment-mix/trends', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    SELECT 
      DATE_FORMAT(date, '%Y-%m') as month,
      payment_type,
      SUM(amount) as amount
    FROM payment
    WHERE date BETWEEN ? AND ?
      AND payment_type IS NOT NULL
    GROUP BY month, payment_type
    ORDER BY month, payment_type;
  `;
  
  connection.query(query, [startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error fetching payment mix trends:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});
```

**Visualisation**: Graphique en camembert (pie chart) D3.js

---

### 3. Lifetime Value (LTV) Patient

#### 3.1 Route API: `/api/patient-lifecycle/ltv`

```javascript
router.get('/ltv', (req, res) => {
  const { minVisits = 0, orderBy = 'ltv', limit = 100 } = req.query;
  
  const query = `
    SELECT 
      pat.id,
      pat.firstName,
      pat.lastName,
      COUNT(DISTINCT v.id) as total_visits,
      SUM(p.amount) as ltv,
      AVG(p.amount) as avg_transaction,
      MIN(v.arrivalDate) as first_visit,
      MAX(v.arrivalDate) as last_visit,
      DATEDIFF(MAX(v.arrivalDate), MIN(v.arrivalDate)) as lifetime_days,
      SUM(p.amount) / NULLIF(COUNT(DISTINCT v.id), 0) as revenue_per_visit,
      CASE 
        WHEN DATEDIFF(NOW(), MAX(v.arrivalDate)) > 180 THEN 'Inactif'
        WHEN DATEDIFF(NOW(), MAX(v.arrivalDate)) > 90 THEN 'À Risque'
        ELSE 'Actif'
      END as status
    FROM patient pat
    JOIN visit v ON v.patient_id = pat.id
    JOIN payment p ON p.consultation_id = v.id
    GROUP BY pat.id
    HAVING total_visits >= ?
    ORDER BY ${orderBy} DESC
    LIMIT ?;
  `;
  
  connection.query(query, [minVisits, parseInt(limit)], (error, results) => {
    if (error) {
      console.error('Error calculating LTV:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

router.get('/ltv/segments', (req, res) => {
  const query = `
    WITH patient_ltv AS (
      SELECT 
        pat.id,
        SUM(p.amount) as ltv,
        COUNT(DISTINCT v.id) as visits
      FROM patient pat
      JOIN visit v ON v.patient_id = pat.id
      JOIN payment p ON p.consultation_id = v.id
      GROUP BY pat.id
    )
    SELECT 
      CASE 
        WHEN ltv < 500 THEN 'Bronze (< 500€)'
        WHEN ltv < 1500 THEN 'Argent (500-1500€)'
        WHEN ltv < 3000 THEN 'Or (1500-3000€)'
        ELSE 'Platine (> 3000€)'
      END as segment,
      COUNT(*) as patient_count,
      SUM(ltv) as total_revenue,
      AVG(ltv) as avg_ltv,
      AVG(visits) as avg_visits
    FROM patient_ltv
    GROUP BY segment
    ORDER BY avg_ltv;
  `;
  
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching LTV segments:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});
```

---

### 4. Taux de No-Show

#### 4.1 Route API: `/api/operational-efficiency/no-show`

```javascript
router.get('/no-show-rate', (req, res) => {
  const { startDate, endDate, doctorId } = req.query;
  
  let query = `
    WITH scheduled_appointments AS (
      SELECT 
        e.id as event_id,
        e.startDatetime,
        e.calendar_id,
        pue.user_id as doctor_id,
        u.firstName as doctor_firstname,
        u.lastName as doctor_lastname
      FROM evenement e
      JOIN patient_user_event pue ON pue.id = e.id
      JOIN user u ON u.id = pue.user_id
      WHERE e.startDatetime BETWEEN ? AND ?
        ${doctorId ? 'AND pue.user_id = ?' : ''}
    ),
    realized_visits AS (
      SELECT 
        v.id as visit_id,
        v.startDate,
        v.user_activated_id as doctor_id
      FROM visit v
      WHERE v.startDate BETWEEN ? AND ?
        ${doctorId ? 'AND v.user_activated_id = ?' : ''}
        AND v.startDate IS NOT NULL
    )
    SELECT 
      sa.doctor_id,
      sa.doctor_firstname,
      sa.doctor_lastname,
      COUNT(DISTINCT sa.event_id) as scheduled_count,
      COUNT(DISTINCT rv.visit_id) as realized_count,
      (COUNT(DISTINCT sa.event_id) - COUNT(DISTINCT rv.visit_id)) as no_show_count,
      ROUND(
        (COUNT(DISTINCT sa.event_id) - COUNT(DISTINCT rv.visit_id)) / 
        NULLIF(COUNT(DISTINCT sa.event_id), 0) * 100, 
        2
      ) as no_show_rate
    FROM scheduled_appointments sa
    LEFT JOIN realized_visits rv ON 
      sa.doctor_id = rv.doctor_id 
      AND DATE(sa.startDatetime) = DATE(rv.startDate)
      AND HOUR(sa.startDatetime) = HOUR(rv.startDate)
    GROUP BY sa.doctor_id, sa.doctor_firstname, sa.doctor_lastname
    ORDER BY no_show_rate DESC;
  `;
  
  const params = doctorId 
    ? [startDate, endDate, doctorId, startDate, endDate, doctorId]
    : [startDate, endDate, startDate, endDate];
  
  connection.query(query, params, (error, results) => {
    if (error) {
      console.error('Error calculating no-show rate:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});

router.get('/no-show-by-timeslot', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    WITH scheduled_appointments AS (
      SELECT 
        e.id,
        e.startDatetime,
        HOUR(e.startDatetime) as hour_of_day,
        CASE 
          WHEN HOUR(e.startDatetime) < 12 THEN 'Matin (8h-12h)'
          WHEN HOUR(e.startDatetime) < 14 THEN 'Déjeuner (12h-14h)'
          ELSE 'Après-midi (14h-18h)'
        END as time_slot
      FROM evenement e
      WHERE e.startDatetime BETWEEN ? AND ?
    ),
    realized_visits AS (
      SELECT 
        v.id,
        v.startDate,
        HOUR(v.startDate) as hour_of_day
      FROM visit v
      WHERE v.startDate BETWEEN ? AND ?
        AND v.startDate IS NOT NULL
    )
    SELECT 
      sa.time_slot,
      COUNT(DISTINCT sa.id) as scheduled,
      COUNT(DISTINCT rv.id) as realized,
      (COUNT(DISTINCT sa.id) - COUNT(DISTINCT rv.id)) as no_show,
      ROUND(
        (COUNT(DISTINCT sa.id) - COUNT(DISTINCT rv.id)) / 
        NULLIF(COUNT(DISTINCT sa.id), 0) * 100, 
        2
      ) as no_show_rate
    FROM scheduled_appointments sa
    LEFT JOIN realized_visits rv ON 
      DATE(sa.startDatetime) = DATE(rv.startDate)
      AND sa.hour_of_day = rv.hour_of_day
    GROUP BY sa.time_slot
    ORDER BY sa.time_slot;
  `;
  
  connection.query(query, [startDate, endDate, startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error calculating no-show by timeslot:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});
```

---

### 5. Analyse des Remises

#### 5.1 Route API: `/api/financial-analysis/discounts`

```javascript
router.get('/discounts', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    SELECT 
      COUNT(*) as total_transactions,
      COUNT(CASE WHEN discount > 0 THEN 1 END) as discounted_transactions,
      SUM(amount + discount) as gross_revenue,
      SUM(amount) as net_revenue,
      SUM(discount) as total_discounts,
      AVG(discount_percent) as avg_discount_percent,
      ROUND(SUM(discount) / SUM(amount + discount) * 100, 2) as overall_discount_rate
    FROM payment
    WHERE date BETWEEN ? AND ?;
  `;
  
  connection.query(query, [startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error fetching discounts:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results[0]);
  });
});

router.get('/discounts/by-reason', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const query = `
    SELECT 
      discount_reason,
      COUNT(*) as count,
      SUM(discount) as total_discount,
      AVG(discount_percent) as avg_percent,
      SUM(amount) as net_revenue
    FROM payment
    WHERE date BETWEEN ? AND ?
      AND discount > 0
      AND discount_reason IS NOT NULL
      AND discount_reason != '/'
    GROUP BY discount_reason
    ORDER BY total_discount DESC;
  `;
  
  connection.query(query, [startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error fetching discounts by reason:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results);
  });
});
```

---

## 📊 Phase 2 - Strategic Insights (8 indicateurs)

### 6. Heatmap Dentaire

#### 6.1 Route API: `/api/clinical-insights/dental-heatmap`

```javascript
router.get('/dental-heatmap', (req, res) => {
  const { startDate, endDate, actType } = req.query;
  
  let query = `
    SELECT 
      dd.tooth_number,
      COUNT(DISTINCT dd.id) as treatment_count,
      COUNT(DISTINCT dd.patient_id) as patient_count,
      u.description1 as most_common_act,
      COUNT(*) as act_count
    FROM dental_diagram dd
    JOIN dental_diagram_udc ddu ON ddu.dental_diagram_id = dd.id
    JOIN udc u ON u.id = ddu.udc_id
    WHERE dd.date BETWEEN ? AND ?
      ${actType ? 'AND u.code1 = ?' : ''}
    GROUP BY dd.tooth_number, u.description1
    ORDER BY dd.tooth_number, act_count DESC;
  `;
  
  const params = actType ? [startDate, endDate, actType] : [startDate, endDate];
  
  connection.query(query, params, (error, results) => {
    if (error) {
      console.error('Error fetching dental heatmap:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Regrouper par dent (garder l'acte le plus fréquent)
    const heatmapData = {};
    results.forEach(row => {
      const toothNum = row.tooth_number.replace(/[^0-9]/g, '');
      if (!heatmapData[toothNum]) {
        heatmapData[toothNum] = {
          tooth: toothNum,
          treatments: row.treatment_count,
          patients: row.patient_count,
          topAct: row.most_common_act
        };
      }
    });
    
    res.json(Object.values(heatmapData));
  });
});
```

**Visualisation Frontend**: Schéma dentaire interactif avec code couleur selon intensité de traitement

---

## 🔮 Phase 3 - Predictive Analytics (7 indicateurs)

### 15. Prévisions de CA

#### 15.1 Route API: `/api/predictive-analytics/revenue-forecast`

```javascript
router.get('/revenue-forecast', (req, res) => {
  const { months = 6 } = req.query;
  
  const query = `
    WITH monthly_revenue AS (
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as revenue
      FROM payment
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
      GROUP BY month
      ORDER BY month
    )
    SELECT 
      month,
      revenue,
      AVG(revenue) OVER (
        ORDER BY month 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
      ) as moving_avg_3m,
      AVG(revenue) OVER (
        ORDER BY month 
        ROWS BETWEEN 5 PRECEDING AND CURRENT ROW
      ) as moving_avg_6m
    FROM monthly_revenue;
  `;
  
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching revenue forecast:', error);
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Calculer la tendance et projeter les mois futurs
    // (Implémentation simplifiée - nécessite régression linéaire)
    const lastRevenue = results[results.length - 1].moving_avg_6m;
    const forecast = [];
    for (let i = 1; i <= months; i++) {
      forecast.push({
        month: `+${i}m`,
        forecasted_revenue: lastRevenue * (1 + 0.02 * i) // Croissance 2%/mois
      });
    }
    
    res.json({
      historical: results,
      forecast: forecast
    });
  });
});
```

---

## 🔌 Intégration dans server.js

```javascript
// Ajouter dans server.js après les routes existantes

// Phase 1 - Quick Wins
app.use('/api/financial-analysis', authenticateToken, require('./routes/financialAnalysisRoute')(connection));
app.use('/api/patient-lifecycle', authenticateToken, require('./routes/patientLifecycleRoute')(connection));
app.use('/api/operational-efficiency', authenticateToken, require('./routes/operationalEfficiencyRoute')(connection));

// Phase 2 - Strategic Insights
app.use('/api/clinical-insights', authenticateToken, require('./routes/clinicalInsightsRoute')(connection));
app.use('/api/benchmarking', authenticateToken, require('./routes/benchmarkingRoute')(connection));

// Phase 3 - Predictive Analytics
app.use('/api/predictive-analytics', authenticateToken, require('./routes/predictiveAnalyticsRoute')(connection));
```

---

## 🧪 Tests et Validation

### Tests Unitaires (Exemple pour impayés)

```javascript
// test/financialAnalysis.test.js
const request = require('supertest');
const app = require('../server');

describe('Financial Analysis API', () => {
  let token;
  
  beforeAll(async () => {
    // Obtenir un token JWT valide
    const response = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'admin' });
    token = response.body.token;
  });
  
  test('GET /api/financial-analysis/impayments should return aging buckets', async () => {
    const response = await request(app)
      .get('/api/financial-analysis/impayments')
      .query({ startDate: '2023-01-01', endDate: '2023-12-31' })
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('aging_bucket');
    expect(response.body[0]).toHaveProperty('total_unpaid');
  });
  
  test('GET /api/financial-analysis/top-debtors should return list of debtors', async () => {
    const response = await request(app)
      .get('/api/financial-analysis/top-debtors')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeLessThanOrEqual(5);
  });
});
```

---

## 📝 Checklist de Déploiement

### Avant Développement
- [ ] Review de l'architecture proposée
- [ ] Validation des requêtes SQL sur base de test
- [ ] Configuration environnement de développement

### Développement
- [ ] Création des routes API selon spécifications
- [ ] Implémentation des pages frontend
- [ ] Ajout des visualisations D3.js
- [ ] Tests unitaires API
- [ ] Tests d'intégration end-to-end

### Tests
- [ ] Tests fonctionnels avec données réelles
- [ ] Validation performance des requêtes SQL
- [ ] Tests de charge (>1000 requêtes simultanées)
- [ ] Tests cross-browser (Chrome, Firefox, Safari, Edge)

### Documentation
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Guide utilisateur
- [ ] Documentation technique
- [ ] Vidéos de formation

### Déploiement
- [ ] Backup base de données
- [ ] Déploiement sur environnement de staging
- [ ] Tests d'acceptation utilisateurs
- [ ] Migration vers production
- [ ] Monitoring post-déploiement

---

## 🎯 Optimisations Recommandées

### Index Database

```sql
-- Optimiser les requêtes fréquentes
CREATE INDEX idx_payment_date ON payment(date);
CREATE INDEX idx_payment_remaining ON payment(remaining_amount);
CREATE INDEX idx_visit_patient_date ON visit(patient_id, currentLocalTimeAssignment);
CREATE INDEX idx_dental_diagram_date ON dental_diagram(date, tooth_number);
CREATE INDEX idx_evenement_datetime ON evenement(startDatetime);
```

### Vues Matérialisées (MySQL 8.0+)

```sql
-- Vue pour LTV patient (rafraîchie quotidiennement)
CREATE VIEW v_patient_ltv AS
SELECT 
  pat.id,
  pat.firstName,
  pat.lastName,
  COUNT(DISTINCT v.id) as total_visits,
  SUM(p.amount) as ltv,
  MAX(v.arrivalDate) as last_visit
FROM patient pat
JOIN visit v ON v.patient_id = pat.id
JOIN payment p ON p.consultation_id = v.id
GROUP BY pat.id, pat.firstName, pat.lastName;
```

---

## 📚 Ressources et Références

### Documentation
- [D3.js Gallery](https://observablehq.com/@d3/gallery)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

### Librairies Utiles
- `moment.js` ou `date-fns`: Manipulation de dates
- `chart.js`: Alternative à D3.js pour graphiques simples
- `express-validator`: Validation des paramètres API
- `helmet`: Sécurité Express.js

---

*Guide Technique d'Implémentation - Version 1.0*  
*Créé le: 2025-12-10*  
*Dernière mise à jour: 2025-12-10*
