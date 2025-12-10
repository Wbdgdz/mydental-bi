const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'clinique.db');

router.post('/', async (req, res) => {
    const { doctorIds, startDate, endDate } = req.body;
    
    // Validation
    if (!doctorIds || !Array.isArray(doctorIds) || doctorIds.length < 2) {
        return res.status(400).json({ error: 'Au moins 2 médecins doivent être sélectionnés' });
    }
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Les dates de début et de fin sont requises' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Préparer les placeholders pour la requête SQL
        const placeholders = doctorIds.map(() => '?').join(',');
        
        // Récupérer les données de chaque médecin
        const doctorsData = await Promise.all(doctorIds.map(doctorId => 
            getDoctorComparisonData(db, doctorId, startDate, endDate)
        ));
        
        // Calculer les scores globaux
        const enrichedData = doctorsData.map(doctor => ({
            ...doctor,
            globalScore: calculateGlobalScore(doctor),
            loyaltyRate: calculateLoyaltyRate(doctor)
        }));
        
        res.json({
            doctors: enrichedData,
            period: { startDate, endDate }
        });
        
    } catch (error) {
        console.error('Erreur lors de la comparaison:', error);
        res.status(500).json({ error: 'Erreur lors de la comparaison des médecins' });
    } finally {
        db.close();
    }
});

// Fonction pour récupérer toutes les données d'un médecin
function getDoctorComparisonData(db, doctorId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                m.idMedecin,
                m.nom,
                m.prenom,
                
                -- Patients uniques
                COUNT(DISTINCT c.idPatient) as uniquePatients,
                
                -- Nombre total de visites
                COUNT(DISTINCT c.idConsultation) as totalVisits,
                
                -- Nouveaux patients (première consultation dans la période)
                COUNT(DISTINCT CASE 
                    WHEN c.dateConsultation = (
                        SELECT MIN(c2.dateConsultation) 
                        FROM Consultations c2 
                        WHERE c2.idPatient = c.idPatient 
                        AND c2.idMedecin = m.idMedecin
                    ) 
                    THEN c.idPatient 
                END) as newPatients,
                
                -- Temps patient moyen (en minutes)
                CAST(AVG(CAST(
                    (julianday(c.heureFin) - julianday(c.heureDebut)) * 24 * 60 
                    AS INTEGER)) AS INTEGER) as avgPatientTime,
                
                -- Temps d'attente moyen (en minutes)
                CAST(AVG(CASE 
                    WHEN c.heureArrivee IS NOT NULL AND c.heureDebut IS NOT NULL
                    THEN CAST(
                        (julianday(c.heureDebut) - julianday(c.heureArrivee)) * 24 * 60 
                        AS INTEGER)
                    ELSE NULL
                END) AS INTEGER) as avgWaitingTime,
                
                -- Revenus total
                COALESCE(SUM(a.tarif), 0) as totalRevenue,
                
                -- Temps de travail total (en heures)
                SUM(
                    (julianday(c.heureFin) - julianday(c.heureDebut)) * 24
                ) as totalWorkingHours
                
            FROM Medecins m
            LEFT JOIN Consultations c ON m.idMedecin = c.idMedecin
                AND DATE(c.dateConsultation) BETWEEN ? AND ?
            LEFT JOIN Actes a ON c.idConsultation = a.idConsultation
            WHERE m.idMedecin = ?
            GROUP BY m.idMedecin, m.nom, m.prenom
        `;
        
        db.get(query, [startDate, endDate, doctorId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                // Calculer le CA par heure
                const revenuePerHour = row.totalWorkingHours > 0 
                    ? row.totalRevenue / row.totalWorkingHours 
                    : 0;
                
                resolve({
                    idMedecin: row.idMedecin,
                    nom: row.nom,
                    prenom: row.prenom,
                    uniquePatients: row.uniquePatients || 0,
                    totalVisits: row.totalVisits || 0,
                    newPatients: row.newPatients || 0,
                    avgPatientTime: row.avgPatientTime || 0,
                    avgWaitingTime: row.avgWaitingTime || 0,
                    totalRevenue: row.totalRevenue || 0,
                    totalWorkingHours: row.totalWorkingHours || 0,
                    revenuePerHour: revenuePerHour
                });
            }
        });
    });
}

// Calculer le score global (0-100) basé sur plusieurs métriques
function calculateGlobalScore(doctor) {
    // Pondération des différentes métriques
    const weights = {
        totalVisits: 0.2,
        revenuePerHour: 0.3,
        uniquePatients: 0.2,
        newPatients: 0.15,
        avgWaitingTime: 0.15  // Inverse: moins c'est mieux
    };
    
    // Normaliser chaque métrique sur une échelle de 0-100
    // (Ces valeurs de référence peuvent être ajustées selon vos besoins)
    const normalized = {
        totalVisits: Math.min((doctor.totalVisits / 200) * 100, 100),
        revenuePerHour: Math.min((doctor.revenuePerHour / 150) * 100, 100),
        uniquePatients: Math.min((doctor.uniquePatients / 150) * 100, 100),
        newPatients: Math.min((doctor.newPatients / 50) * 100, 100),
        avgWaitingTime: doctor.avgWaitingTime > 0 
            ? Math.max(100 - (doctor.avgWaitingTime / 30) * 100, 0) 
            : 100
    };
    
    // Calculer le score pondéré
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
        score += normalized[key] * weight;
    }
    
    return Math.round(score * 10) / 10; // Arrondir à 1 décimale
}

// Calculer le taux de fidélisation (patients récurrents / patients total)
function calculateLoyaltyRate(doctor) {
    if (doctor.uniquePatients === 0) return 0;
    
    // Le taux de fidélisation est estimé par :
    // (patients uniques - nouveaux patients) / patients uniques
    const recurringPatients = doctor.uniquePatients - doctor.newPatients;
    return (recurringPatients / doctor.uniquePatients) * 100;
}

module.exports = router;
