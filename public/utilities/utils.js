// utilities/utils.js
// Vérification de l'authentification
export function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
    } else {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp;
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (exp < currentTime) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du token", error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
}

// Réexporter les fonctions de simulationStorage.js pour compatibilité
export {
    hasSimulationData,
    getSimulationInfo,
    getActesRentabilite,
    getGlobalStats,
    getActesBelowMargin,
    getActesAboveMargin,
    getSimulationParams,
    getSimulationData,
    getRentabiliteData,
    getSuggestionsData,
    getActeByName,
    clearSimulationData
} from './simulationStorage.js';

// Fonction pour obtenir la plage de dates du mois précédent
export function getLastMonthDateRange() {
    const today = new Date();

    let year = today.getFullYear();
    let month = today.getMonth();

    if (month === 0) {
        month = 11;
        year -= 1;
    } else {
        month -= 1;
    }

    const startOfLastMonth = new Date(year, month, 1);
    const endOfLastMonth = new Date(year, month + 1, 0);

    const startDate = `${startOfLastMonth.getFullYear()}-${String(startOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfLastMonth.getDate()).padStart(2, '0')}`;
    const endDate = `${endOfLastMonth.getFullYear()}-${String(endOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfLastMonth.getDate()).padStart(2, '0')}`;

    return { startDate, endDate };
}

// Fonction pour calculer le nombre de mois dans la période sélectionnée
export function calculatePeriodMonths(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth() + 1); // +1 pour inclure le mois en cours
    return months;
}

// Fonction pour obtenir la plage de dates sélectionnée
export function getSelectedDateRange() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    return { startDate, endDate };
}

// Fonction pour vérifier et récupérer le token JWT
export function getAuthToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vous devez être connecté pour accéder à ces données.');
        window.location.href = 'login.html';  // Redirection si pas de token
        return null;
    }
    return token;
}

// Fonction pour formater les nombres avec une précision décimale
export function formatWaitingTime(value) {
    // Vérifier si la valeur est un nombre valide et supérieure à 0
    return typeof value === 'number' && value > 0 ? value.toFixed(1) + ' min' : '0 min';  // Afficher '0 min' si la valeur est 0 ou invalide
}

// Fonction pour formater les nombres en milliers (k) ou millions (m)
export function formatNumber(value) {
    if (value >= 1e6) {
        return (value / 1e6).toFixed(1) + 'm';  // Pour les millions
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(1) + 'k';  // Pour les milliers
    } else {
        return value;  // Pour les valeurs inférieures à 1000
    }
}

// --- Gestion du Bouton Retour en Haut ---
const backToTopButton = document.getElementById("back-to-top");

if (backToTopButton) {
    // Gestion du scroll
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            backToTopButton.style.display = "flex";
        } else {
            backToTopButton.style.display = "none";
        }
    });

    // Gestion du clic
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}


/* --- Gestion du Menu Latéral (Overlay) --- */
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    // Création dynamique de l'overlay s'il n'existe pas
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay && sidebar) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    if (menuToggle && sidebar && overlay) {
        // Ouvrir le menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche de fermer immédiatement
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        // Fermer le menu en cliquant sur l'overlay (partie sombre)
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Fermer le menu en cliquant sur un lien du menu
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        });
    }
});
// Fonction pour obtenir la plage de dates depuis les inputs
export function getDateRange() {
    const startDateInput = document.getElementById('start-date')?.value;
    const endDateInput = document.getElementById('end-date')?.value;
    
    // Si les dates ne sont pas définies, retourner votre plage fixe
    if (!startDateInput || !endDateInput) {
        return { 
            startDate: '2022-01-01', // Format YYYY-MM-DD obligatoire
            endDate: '2024-12-31'    // Format YYYY-MM-DD obligatoire
        };
    }
    
    return { startDate: startDateInput, endDate: endDateInput };
}

    // Fonction pour gérer la déconnexion
    export function setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
    
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // Supprimer le token du localStorage
                localStorage.removeItem('token');
            
                // Rediriger vers la page de connexion
                window.location.href = '/login.html';
            });
        }
    }

    // Appeler automatiquement setupLogoutButton au chargement du DOM
    document.addEventListener('DOMContentLoaded', setupLogoutButton);
