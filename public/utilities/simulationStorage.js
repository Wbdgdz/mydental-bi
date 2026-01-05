// simulationStorage.js - Utilitaire pour accéder aux données de simulation

/**
 * Récupère les données de simulation sauvegardées
 * @returns {Object|null} Les données de simulation ou null si aucune donnée n'existe
 */
export function getSimulationData() {
    const data = localStorage.getItem('simulationRentabilite');
    if (!data) {
        return null;
    }
    
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la lecture des données de simulation:', error);
        return null;
    }
}

/**
 * Récupère uniquement les données de rentabilité
 * @returns {Object|null}
 */
export function getRentabiliteData() {
    const simulation = getSimulationData();
    return simulation ? simulation.rentabilite : null;
}

/**
 * Récupère uniquement les suggestions de tarifs
 * @returns {Object|null}
 */
export function getSuggestionsData() {
    const simulation = getSimulationData();
    return simulation ? simulation.suggestions : null;
}

/**
 * Récupère les paramètres de la simulation
 * @returns {Object|null}
 */
export function getSimulationParams() {
    const simulation = getSimulationData();
    if (!simulation) return null;
    
    return {
        remunerationMedecin: simulation.rentabilite?.parametres?.remunerationMedecin || 
                            simulation.suggestions?.parametres?.remunerationMedecin,
        coutCentre: simulation.rentabilite?.parametres?.coutCentre || 
                   simulation.suggestions?.parametres?.coutCentre,
        margeCible: simulation.rentabilite?.parametres?.margeCible || 
                   simulation.suggestions?.parametres?.margeCible,
        doctorId: simulation.doctorId,
        doctorName: simulation.doctorName,
        period: simulation.period,
        timestamp: simulation.timestamp
    };
}

/**
 * Vérifie si des données de simulation existent
 * @returns {boolean}
 */
export function hasSimulationData() {
    return localStorage.getItem('simulationRentabilite') !== null;
}

/**
 * Supprime les données de simulation
 */
export function clearSimulationData() {
    localStorage.removeItem('simulationRentabilite');
}

/**
 * Récupère les actes avec leur rentabilité
 * @param {string|number|null} doctorId - ID du médecin pour filtrer (optionnel)
 * @returns {Array} Liste des actes avec leurs données de rentabilité
 */
export function getActesRentabilite(doctorId = null) {
    const rentabilite = getRentabiliteData();
    const allActes = rentabilite?.actes || [];
    
    // Si pas de filtre ou filtre "all", retourner tous les actes
    if (!doctorId || doctorId === 'all') {
        return allActes;
    }
    
    // Filtrer par doctor_id
    const doctorIdNum = parseInt(doctorId);
    return allActes.filter(acte => acte.doctor_id === doctorIdNum);
}

/**
 * Récupère un acte spécifique par son nom
 * @param {string} acteName - Nom de l'acte
 * @returns {Object|null}
 */
export function getActeByName(acteName) {
    const actes = getActesRentabilite();
    return actes.find(acte => acte.acte === acteName) || null;
}

/**
 * Récupère les actes avec une marge inférieure à un seuil
 * @param {number} threshold - Seuil de marge en pourcentage
 * @returns {Array}
 */
export function getActesBelowMargin(threshold) {
    const actes = getActesRentabilite();
    return actes.filter(acte => acte.marge_brute_pct < threshold);
}

/**
 * Récupère les actes avec une marge supérieure à un seuil
 * @param {number} threshold - Seuil de marge en pourcentage
 * @returns {Array}
 */
export function getActesAboveMargin(threshold) {
    const actes = getActesRentabilite();
    return actes.filter(acte => acte.marge_brute_pct >= threshold);
}

/**
 * Calcule les statistiques globales de rentabilité
 * @param {string|number|null} doctorId - ID du médecin pour filtrer (optionnel)
 * @returns {Object}
 */
export function getGlobalStats(doctorId = null) {
    const actes = getActesRentabilite(doctorId);
    
    if (actes.length === 0) {
        return {
            totalCA: 0,
            totalMarge: 0,
            margeMoyenne: 0,
            nombreActes: 0,
            totalVisites: 0
        };
    }
    
    let totalCA = 0;
    let totalMarge = 0;
    let totalMargeWeighted = 0;
    let totalVisites = 0;
    
    actes.forEach(acte => {
        totalCA += acte.CA || 0;
        totalMarge += acte.marge_brute || 0;
        totalMargeWeighted += (acte.marge_brute_pct || 0) * (acte.CA || 0);
        totalVisites += acte.total_visits || 0;
    });
    
    const margeMoyenne = totalCA > 0 ? (totalMargeWeighted / totalCA) : 0;
    
    return {
        totalCA,
        totalMarge,
        margeMoyenne,
        nombreActes: actes.length,
        totalVisites
    };
}

/**
 * Obtient un message d'information sur la dernière simulation
 * @returns {string}
 */
export function getSimulationInfo() {
    const params = getSimulationParams();
    if (!params) {
        return 'Aucune simulation disponible';
    }
    
    const date = new Date(params.timestamp);
    const formattedDate = date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `Simulation du ${formattedDate} - ${params.doctorName} - Période: ${params.period.startDate} au ${params.period.endDate}`;
}
