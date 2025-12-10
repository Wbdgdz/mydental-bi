// --- IMPORTS ---
import { createComparisonBarChart, createComparisonRadarChart, createComparisonTimeline } from './comparisonCharts.js';

// --- VARIABLES GLOBALES ---
let doctorSelects, compareBtn, comparisonStartDate, comparisonEndDate;

// --- GESTION DES DROPDOWNS DE COMPARAISON ---

// Charger la liste des médecins dans tous les dropdowns
async function loadDoctorsForComparison() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/doctors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Erreur API:', response.status, response.statusText);
            throw new Error('Erreur lors du chargement des médecins');
        }
        
        const doctors = await response.json();
        console.log('Médecins chargés:', doctors);
        
        doctorSelects.forEach(select => {
            select.innerHTML = '<option value="">-- Sélectionner un médecin --</option>';
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = `${doctor.lastName} ${doctor.firstName}`;
                select.appendChild(option);
            });
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des médecins:', error);
        alert('Impossible de charger la liste des médecins. Veuillez vous reconnecter.');
    }
}

// Empêcher la sélection du même médecin dans plusieurs dropdowns
function setupDoctorSelectListeners() {
    doctorSelects.forEach((select, index) => {
        select.addEventListener('change', () => {
            updateDoctorSelectsAvailability();
            validateComparisonForm();
            
            // Ajouter classe "selected" si un médecin est choisi
            if (select.value) {
                select.classList.add('selected');
            } else {
                select.classList.remove('selected');
            }
        });
    });
}

function updateDoctorSelectsAvailability() {
    // Récupérer tous les médecins sélectionnés
    const selectedDoctors = doctorSelects
        .map(select => select.value)
        .filter(value => value !== '');
    
    // Pour chaque dropdown, désactiver les médecins déjà sélectionnés ailleurs
    doctorSelects.forEach(select => {
        const currentValue = select.value;
        const options = select.querySelectorAll('option');
        
        options.forEach(option => {
            if (option.value === '') return; // Ne pas désactiver l'option vide
            
            // Désactiver si sélectionné ailleurs, mais pas dans ce dropdown
            if (selectedDoctors.includes(option.value) && option.value !== currentValue) {
                option.disabled = true;
                option.style.color = '#ccc';
            } else {
                option.disabled = false;
                option.style.color = '';
            }
        });
    });
}

// Valider que au moins 2 médecins sont sélectionnés
function validateComparisonForm() {
    const selectedDoctors = doctorSelects
        .map(select => select.value)
        .filter(value => value !== '');
    
    const hasValidDates = comparisonStartDate.value && comparisonEndDate.value;
    const hasMinDoctors = selectedDoctors.length >= 2;
    
    compareBtn.disabled = !(hasValidDates && hasMinDoctors);
}

// Écouter les changements de dates
function setupDateListeners() {
    comparisonStartDate.addEventListener('change', validateComparisonForm);
    comparisonEndDate.addEventListener('change', validateComparisonForm);
}

// --- INITIALISATION DES DATES ---
function initializeComparisonDates() {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    comparisonStartDate.value = oneMonthAgo.toISOString().split('T')[0];
    comparisonEndDate.value = today.toISOString().split('T')[0];
}

// --- LANCER LA COMPARAISON ---
function setupCompareButton() {
    compareBtn.addEventListener('click', async () => {
        const selectedDoctorIds = doctorSelects
            .map(select => select.value)
            .filter(value => value !== '');
        
        const startDate = comparisonStartDate.value;
        const endDate = comparisonEndDate.value;
        
        if (selectedDoctorIds.length < 2) {
            alert('Veuillez sélectionner au moins 2 médecins pour effectuer une comparaison.');
            return;
        }
        
        if (!startDate || !endDate) {
            alert('Veuillez sélectionner une période de comparaison.');
            return;
        }
        
        // Afficher un loader
        const resultsContainer = document.getElementById('comparison-results');
        resultsContainer.innerHTML = '<div style="text-align: center; padding: 50px;"><p>Chargement de la comparaison...</p></div>';
        
        try {
            // Appeler l'API de comparaison
            const response = await fetch('/api/doctor-comparison', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    doctorIds: selectedDoctorIds,
                    startDate,
                    endDate
                })
            });
            
            if (!response.ok) throw new Error('Erreur lors de la comparaison');
            
            const comparisonData = await response.json();
            
            // Afficher les résultats
            displayComparisonResults(comparisonData);
            
        } catch (error) {
            console.error('Erreur:', error);
            resultsContainer.innerHTML = '<div style="text-align: center; padding: 50px; color: #da1e28;"><p>❌ Erreur lors du chargement de la comparaison</p></div>';
        }
    });
}

// --- AFFICHAGE DES RÉSULTATS DE COMPARAISON ---
function displayComparisonResults(data) {
    const resultsContainer = document.getElementById('comparison-results');
    
    // Palette de couleurs pour les médecins
    const colors = ['#0f62fe', '#ff832b', '#43e97b'];
    
    // Assigner une couleur à chaque médecin
    data.doctors.forEach((doctor, index) => {
        doctor.color = colors[index % colors.length];
    });
    
    // Générer les badges
    const badgesHTML = generateBadges(data.doctors);
    
    // Générer les cartes KPI avec classement
    const kpiCardsHTML = generateKPICards(data.doctors);
    
    // Générer les suggestions intelligentes
    const suggestionsHTML = generateSuggestions(data.doctors);
    
    resultsContainer.innerHTML = `
        <!-- Badges de performance -->
        <div class="badges-container">
            ${badgesHTML}
        </div>
        
        <!-- KPI Cards avec classement -->
        <div class="kpi-comparison-grid">
            ${kpiCardsHTML}
        </div>
        
        <!-- Graphiques de comparaison -->
        <div class="comparison-charts">
            <div class="chart-container">
                <h3>Comparaison des Indicateurs Clés</h3>
                <div id="comparison-bar-chart"></div>
            </div>
            
            <div class="chart-container">
                <h3>Profil de Performance (Radar)</h3>
                <div id="comparison-radar-chart"></div>
            </div>
        </div>
        
        <!-- Suggestions intelligentes -->
        <div class="suggestions-container">
            <h3>💡 Suggestions et Analyses</h3>
            ${suggestionsHTML}
        </div>
        
        <!-- Boutons d'export -->
        <div class="export-buttons">
            <button class="btn-export" onclick="exportToPDF()">
                📄 Exporter en PDF
            </button>
            <button class="btn-export" onclick="exportToExcel()">
                📊 Exporter en Excel
            </button>
        </div>
    `;
    
    // Créer les graphiques D3
    createComparisonBarChart(data.doctors, '#comparison-bar-chart');
    createComparisonRadarChart(data.doctors, '#comparison-radar-chart');
}

// --- GÉNÉRATION DES BADGES ---
function generateBadges(doctors) {
    // Trouver le meilleur dans chaque catégorie
    const topPerformer = doctors.reduce((max, doc) => doc.globalScore > max.globalScore ? doc : max);
    const topRevenue = doctors.reduce((max, doc) => doc.totalRevenue > max.totalRevenue ? doc : max);
    const topLoyalty = doctors.reduce((max, doc) => doc.loyaltyRate > max.loyaltyRate ? doc : max);
    
    return `
        <div class="badge-card badge-gold">
            <div class="badge-icon">🏆</div>
            <div class="badge-content">
                <div class="badge-title">Top Performer</div>
                <div class="badge-doctor">${topPerformer.name}</div>
                <div class="badge-value">Score: ${topPerformer.globalScore.toFixed(1)}/100</div>
            </div>
        </div>
        
        <div class="badge-card badge-silver">
            <div class="badge-icon">💰</div>
            <div class="badge-content">
                <div class="badge-title">Meilleur CA</div>
                <div class="badge-doctor">${topRevenue.name}</div>
                <div class="badge-value">${topRevenue.totalRevenue.toLocaleString('fr-FR')} €</div>
            </div>
        </div>
        
        <div class="badge-card badge-bronze">
            <div class="badge-icon">❤️</div>
            <div class="badge-content">
                <div class="badge-title">Meilleur Fidélisation</div>
                <div class="badge-doctor">${topLoyalty.name}</div>
                <div class="badge-value">${topLoyalty.loyaltyRate.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

// --- GÉNÉRATION DES CARTES KPI ---
function generateKPICards(doctors) {
    // KPIs à comparer
    const kpis = [
        { key: 'totalRevenue', label: 'Chiffre d\'Affaires', unit: '€', format: (v) => v.toLocaleString('fr-FR') },
        { key: 'totalVisits', label: 'Nombre de Visites', unit: '', format: (v) => v },
        { key: 'avgRevenuePerVisit', label: 'CA Moyen / Visite', unit: '€', format: (v) => v.toFixed(2) },
        { key: 'loyaltyRate', label: 'Taux de Fidélisation', unit: '%', format: (v) => v.toFixed(1) }
    ];
    
    return kpis.map(kpi => {
        // Trier les médecins par ce KPI
        const sorted = [...doctors].sort((a, b) => b[kpi.key] - a[kpi.key]);
        
        const rows = sorted.map((doctor, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            return `
                <div class="kpi-row">
                    <div class="kpi-rank">${medal} ${rank}</div>
                    <div class="kpi-doctor" style="border-left: 4px solid ${doctor.color};">
                        ${doctor.name}
                    </div>
                    <div class="kpi-value">${kpi.format(doctor[kpi.key])} ${kpi.unit}</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="kpi-comparison-card">
                <h4>${kpi.label}</h4>
                ${rows}
            </div>
        `;
    }).join('');
}

// --- GÉNÉRATION DES SUGGESTIONS ---
function generateSuggestions(doctors) {
    const suggestions = [];
    
    // Analyser chaque médecin
    doctors.forEach(doctor => {
        const analysis = analyzeDoctor(doctor, doctors);
        
        suggestions.push(`
            <div class="suggestion-card" style="border-left: 4px solid ${doctor.color};">
                <h4>${doctor.name}</h4>
                <div class="suggestion-strengths">
                    <strong>✅ Points forts :</strong>
                    <ul>
                        ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="suggestion-improvements">
                    <strong>📈 Axes d'amélioration :</strong>
                    <ul>
                        ${analysis.improvements.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `);
    });
    
    return suggestions.join('');
}

function analyzeDoctor(doctor, allDoctors) {
    const strengths = [];
    const improvements = [];
    
    // Calculer les moyennes
    const avgRevenue = allDoctors.reduce((sum, d) => sum + d.totalRevenue, 0) / allDoctors.length;
    const avgVisits = allDoctors.reduce((sum, d) => sum + d.totalVisits, 0) / allDoctors.length;
    const avgLoyalty = allDoctors.reduce((sum, d) => sum + d.loyaltyRate, 0) / allDoctors.length;
    const avgRevenuePerVisit = allDoctors.reduce((sum, d) => sum + d.avgRevenuePerVisit, 0) / allDoctors.length;
    
    // Analyser le CA
    if (doctor.totalRevenue > avgRevenue * 1.2) {
        strengths.push(`Excellent chiffre d'affaires (${((doctor.totalRevenue / avgRevenue - 1) * 100).toFixed(0)}% au-dessus de la moyenne)`);
    } else if (doctor.totalRevenue < avgRevenue * 0.8) {
        improvements.push(`Chiffre d'affaires à améliorer (${((1 - doctor.totalRevenue / avgRevenue) * 100).toFixed(0)}% en dessous de la moyenne)`);
    }
    
    // Analyser les visites
    if (doctor.totalVisits > avgVisits * 1.15) {
        strengths.push(`Volume d'activité élevé (${doctor.totalVisits} visites)`);
    } else if (doctor.totalVisits < avgVisits * 0.85) {
        improvements.push(`Augmenter le nombre de consultations (actuellement ${doctor.totalVisits} visites)`);
    }
    
    // Analyser la fidélisation
    if (doctor.loyaltyRate > avgLoyalty * 1.1) {
        strengths.push(`Excellente fidélisation des patients (${doctor.loyaltyRate.toFixed(1)}%)`);
    } else if (doctor.loyaltyRate < avgLoyalty * 0.9) {
        improvements.push(`Améliorer la rétention des patients (taux actuel: ${doctor.loyaltyRate.toFixed(1)}%)`);
    }
    
    // Analyser le CA moyen par visite
    if (doctor.avgRevenuePerVisit > avgRevenuePerVisit * 1.15) {
        strengths.push(`Revenus par visite optimisés (${doctor.avgRevenuePerVisit.toFixed(2)}€)`);
    } else if (doctor.avgRevenuePerVisit < avgRevenuePerVisit * 0.85) {
        improvements.push(`Optimiser le panier moyen par consultation`);
    }
    
    // Si pas assez de points forts/améliorations, ajouter des messages génériques
    if (strengths.length === 0) {
        strengths.push('Performance globale dans la moyenne');
    }
    
    if (improvements.length === 0) {
        improvements.push('Maintenir les bonnes pratiques actuelles');
    }
    
    return { strengths, improvements };
}

// --- EXPORT ---
function exportToPDF() {
    alert('Export PDF - Fonctionnalité à implémenter');
}

function exportToExcel() {
    alert('Export Excel - Fonctionnalité à implémenter');
}

// Exposer les fonctions d'export globalement
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;

// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialiser les références DOM
    doctorSelects = [
        document.getElementById('doctor-select-1'),
        document.getElementById('doctor-select-2'),
        document.getElementById('doctor-select-3')
    ];
    
    compareBtn = document.getElementById('compare-btn');
    comparisonStartDate = document.getElementById('comparison-start-date');
    comparisonEndDate = document.getElementById('comparison-end-date');
    
    // Configurer les event listeners
    setupDoctorSelectListeners();
    setupDateListeners();
    setupCompareButton();
    
    // Initialiser
    loadDoctorsForComparison();
    initializeComparisonDates();
});
