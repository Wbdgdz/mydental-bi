const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    router.post('/', async (req, res) => {
        const { doctorIds, startDate, endDate } = req.body;
        
        // Validation
        if (!doctorIds || !Array.isArray(doctorIds) || doctorIds.length < 2) {
            return res.status(400).json({ error: 'Au moins 2 médecins doivent être sélectionnés' });
        }
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Les dates de début et de fin sont requises' });
        }
        
        try {
            // Récupérer les données de chaque médecin
            const doctorsData = await Promise.all(doctorIds.map(doctorId => 
                getDoctorComparisonData(connection, doctorId, startDate, endDate)
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
        }
    });

// Fonction pour récupérer toutes les données d'un médecin
function getDoctorComparisonData(connection, doctorId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                u.id as idMedecin,
                u.lastName as nom,
                u.firstName as prenom,
                
                -- Patients uniques
                COUNT(DISTINCT v.patient_id) as uniquePatients,
                
                -- Nombre total de visites
                COUNT(DISTINCT v.id) as totalVisits,
                
                -- Nouveaux patients (première visite dans la période)
                COUNT(DISTINCT CASE 
                    WHEN v.currentLocalTimeAssignment = (
                        SELECT MIN(v2.currentLocalTimeAssignment) 
                        FROM visit v2 
                        WHERE v2.patient_id = v.patient_id 
                        AND v2.user_activated_id = u.id
                    ) 
                    THEN v.patient_id 
                END) as newPatients,
                
                -- Temps patient moyen (en minutes)
                CAST(AVG(
                    TIMESTAMPDIFF(MINUTE, v.startDate, v.endDate)
                ) AS SIGNED) as avgPatientTime,
                
                -- Temps d'attente moyen (en minutes)
                CAST(AVG(CASE 
                    WHEN v.arrivalDate IS NOT NULL AND v.startDate IS NOT NULL
                    THEN TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate)
                    ELSE NULL
                END) AS SIGNED) as avgWaitingTime,
                
                -- Revenus total
                COALESCE(SUM(p.amount), 0) as totalRevenue,
                
                -- Temps de travail total (en heures)
                SUM(
                    TIMESTAMPDIFF(MINUTE, v.startDate, v.endDate) / 60
                ) as totalWorkingHours
                
            FROM user u
            LEFT JOIN visit v ON u.id = v.user_activated_id
                AND DATE(v.currentLocalTimeAssignment) BETWEEN ? AND ?
            LEFT JOIN payment p ON v.id = p.consultation_id
            WHERE u.id = ?
            GROUP BY u.id, u.lastName, u.firstName
        `;
        
        connection.query(query, [startDate, endDate, doctorId], (err, results) => {
            if (err) {
                reject(err);
            } else if (results.length === 0) {
                reject(new Error(`Médecin avec ID ${doctorId} non trouvé`));
            } else {
                const row = results[0];
                
                // Calculer le CA par heure et par visite
                const totalRevenue = parseFloat(row.totalRevenue) || 0;
                const totalWorkingHours = parseFloat(row.totalWorkingHours) || 0;
                const totalVisits = row.totalVisits || 0;
                
                const revenuePerHour = totalWorkingHours > 0 
                    ? totalRevenue / totalWorkingHours 
                    : 0;
                
                const avgRevenuePerVisit = totalVisits > 0 
                    ? totalRevenue / totalVisits 
                    : 0;
                
                resolve({
                    id: row.idMedecin,
                    nom: row.nom,
                    prenom: row.prenom,
                    name: `${row.nom} ${row.prenom}`,
                    uniquePatients: row.uniquePatients || 0,
                    totalVisits: totalVisits,
                    newPatients: row.newPatients || 0,
                    avgPatientTime: row.avgPatientTime || 0,
                    avgWaitingTime: row.avgWaitingTime || 0,
                    totalRevenue: totalRevenue,
                    totalWorkingHours: totalWorkingHours,
                    revenuePerHour: revenuePerHour,
                    avgRevenuePerVisit: avgRevenuePerVisit
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

    return router;
};
