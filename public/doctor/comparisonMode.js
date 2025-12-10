// --- IMPORTS ---
import { createComparisonBarChart, createComparisonRadarChart, createComparisonTimeline } from './comparisonCharts.js';

// --- GESTION DU MODE (INDIVIDUAL / COMPARISON) ---

const individualMode = document.getElementById('individual-mode');
const comparisonMode = document.getElementById('comparison-mode');
const individualBtn = document.getElementById('individual-btn');
const comparisonBtn = document.getElementById('comparison-btn');

// Initialiser en mode Individual
let currentMode = 'individual';

individualBtn.addEventListener('click', () => {
    switchMode('individual');
});

comparisonBtn.addEventListener('click', () => {
    switchMode('comparison');
});

function switchMode(mode) {
    currentMode = mode;
    
    if (mode === 'individual') {
        individualBtn.classList.add('active');
        comparisonBtn.classList.remove('active');
        individualMode.style.display = 'block';
        comparisonMode.style.display = 'none';
    } else {
        comparisonBtn.classList.add('active');
        individualBtn.classList.remove('active');
        individualMode.style.display = 'none';
        comparisonMode.style.display = 'block';
    }
}

// --- GESTION DES DROPDOWNS DE COMPARAISON ---

const doctorSelects = [
    document.getElementById('doctor-select-1'),
    document.getElementById('doctor-select-2'),
    document.getElementById('doctor-select-3')
];

const compareBtn = document.getElementById('compare-btn');
const comparisonStartDate = document.getElementById('comparison-start-date');
const comparisonEndDate = document.getElementById('comparison-end-date');

// Charger la liste des médecins dans tous les dropdowns
async function loadDoctorsForComparison() {
    try {
        const response = await fetch('/api/doctors');
        if (!response.ok) throw new Error('Erreur lors du chargement des médecins');
        
        const doctors = await response.json();
        
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
        console.error('Erreur:', error);
    }
}

// Empêcher la sélection du même médecin dans plusieurs dropdowns
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
comparisonStartDate.addEventListener('change', validateComparisonForm);
comparisonEndDate.addEventListener('change', validateComparisonForm);

// --- INITIALISATION DES DATES ---
function initializeComparisonDates() {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    comparisonStartDate.value = threeMonthsAgo.toISOString().split('T')[0];
    comparisonEndDate.value = today.toISOString().split('T')[0];
}

// --- LANCER LA COMPARAISON ---
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

// --- AFFICHAGE DES RÉSULTATS DE COMPARAISON ---
function displayComparisonResults(data) {
    const resultsContainer = document.getElementById('comparison-results');
    
    // Palette de couleurs pour les médecins
    const colors = ['#0f62fe', '#ff832b', '#43e97b', '#da1e28'];
    
    // Assigner une couleur à chaque médecin
    data.doctors.forEach((doctor, index) => {
        doctor.color = colors[index % colors.length];
    });
    
    resultsContainer.innerHTML = `
        <!-- Badges de performance -->
        <section class="badges-section">
            <h2>🏆 Badges de Performance</h2>
            <div class="badges-container" id="badges-container"></div>
        </section>
        
        <!-- KPI Cards -->
        <section class="kpi-section">
            <h2>📊 Indicateurs Clés de Performance</h2>
            <div class="kpi-cards-container" id="kpi-cards-container"></div>
        </section>
        
        <!-- Graphiques de comparaison -->
        <div class="chart-container">
            <h2>📊 Comparaison des KPIs</h2>
            <svg id="comparison-bar-chart"></svg>
        </div>
        
        <div class="chart-container">
            <h2>🎯 Radar des Performances</h2>
            <svg id="comparison-radar-chart"></svg>
        </div>
        
        <div class="chart-container">
            <h2>📈 Évolution Temporelle</h2>
            <svg id="comparison-timeline-chart"></svg>
        </div>
        
        <!-- Suggestions -->
        <section class="suggestions-section">
            <h2>💡 Suggestions d'Amélioration</h2>
            <div class="suggestions-grid" id="suggestions-grid"></div>
        </section>
        
        <!-- Export -->
        <section class="export-section">
            <button class="btn-export" id="export-pdf">
                <span>📄</span>
                Exporter en PDF
            </button>
            <button class="btn-export" id="export-excel">
                <span>📊</span>
                Exporter en Excel
            </button>
        </section>
    `;
    
    // Générer les badges
    generateBadges(data);
    
    // Générer les KPI Cards
    generateKPICards(data);
    
    // Générer les graphiques
    createComparisonBarChart(data);
    createComparisonRadarChart(data);
    createComparisonTimeline(data);
    
    // Générer les suggestions
    generateSuggestions(data);
    
    // Attacher les événements d'export
    document.getElementById('export-pdf').addEventListener('click', () => exportToPDF(data));
    document.getElementById('export-excel').addEventListener('click', () => exportToExcel(data));
}

// --- GÉNÉRATION DES BADGES ---
function generateBadges(data) {
    const container = document.getElementById('badges-container');
    
    const badges = [
        {
            title: 'Top Performer Global',
            icon: '🏆',
            metric: 'globalScore',
            format: (value) => `Score: ${value.toFixed(1)}/100`
        },
        {
            title: 'Meilleur CA',
            icon: '💰',
            metric: 'totalRevenue',
            format: (value) => `${value.toFixed(2)} €`
        },
        {
            title: 'Meilleur Taux de Fidélisation',
            icon: '❤️',
            metric: 'loyaltyRate',
            format: (value) => `${value.toFixed(1)} %`
        }
    ];
    
    badges.forEach(badge => {
        // Trouver le médecin avec la meilleure valeur
        const winner = data.doctors.reduce((prev, curr) => 
            curr[badge.metric] > prev[badge.metric] ? curr : prev
        );
        
        const badgeCard = document.createElement('div');
        badgeCard.className = 'badge-card';
        badgeCard.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-content">
                <div class="badge-title">${badge.title}</div>
                <div class="badge-winner">${winner.nom} ${winner.prenom}</div>
                <div class="badge-value">${badge.format(winner[badge.metric])}</div>
            </div>
        `;
        container.appendChild(badgeCard);
    });
}

// --- GÉNÉRATION DES KPI CARDS ---
function generateKPICards(data) {
    const container = document.getElementById('kpi-cards-container');
    
    const kpis = [
        { key: 'uniquePatients', label: 'Patients Uniques', format: (v) => v },
        { key: 'totalVisits', label: 'Nombre de Visites', format: (v) => v },
        { key: 'newPatients', label: 'Nouveaux Patients', format: (v) => v },
        { key: 'revenuePerHour', label: 'CA par Heure', format: (v) => `${v.toFixed(2)} €` },
        { key: 'avgPatientTime', label: 'Temps Patient Moyen', format: (v) => `${v} min` },
        { key: 'avgWaitingTime', label: 'Temps d\'Attente Moyen', format: (v) => `${v} min` },
        { key: 'totalRevenue', label: 'Total des Revenus', format: (v) => `${v.toFixed(2)} €` }
    ];
    
    kpis.forEach(kpi => {
        const card = document.createElement('div');
        card.className = 'kpi-comparison-card';
        
        // Trier les médecins par cette métrique
        const sortedDoctors = [...data.doctors].sort((a, b) => b[kpi.key] - a[kpi.key]);
        
        const valuesHTML = sortedDoctors.map((doctor, index) => `
            <div class="kpi-doctor-value">
                <div class="kpi-doctor-name">
                    <span class="doctor-color-dot" style="background-color: ${doctor.color};"></span>
                    ${doctor.nom} ${doctor.prenom}
                    <span class="kpi-rank rank-${index + 1}">#${index + 1}</span>
                </div>
                <div class="kpi-value" style="color: ${doctor.color};">${kpi.format(doctor[kpi.key])}</div>
            </div>
        `).join('');
        
        card.innerHTML = `
            <div class="kpi-title">${kpi.label}</div>
            <div class="kpi-values">
                ${valuesHTML}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// --- SUGGESTIONS ---
function generateSuggestions(data) {
    const container = document.getElementById('suggestions-grid');
    container.innerHTML = '';
    
    // Analyser chaque médecin
    data.doctors.forEach(doctor => {
        const analysis = analyzeDoctorPerformance(doctor, data.doctors);
        
        // Carte des forces
        if (analysis.strengths.length > 0) {
            const strengthCard = document.createElement('div');
            strengthCard.className = 'suggestion-card strength';
            strengthCard.innerHTML = `
                <div class="suggestion-header">
                    <div class="suggestion-doctor">${doctor.nom} ${doctor.prenom}</div>
                    <span class="suggestion-type strength">💪 Forces</span>
                </div>
                <div class="suggestion-content">
                    <ul>
                        ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            `;
            container.appendChild(strengthCard);
        }
        
        // Carte des axes d'amélioration
        if (analysis.improvements.length > 0) {
            const improvementCard = document.createElement('div');
            improvementCard.className = 'suggestion-card weakness';
            improvementCard.innerHTML = `
                <div class="suggestion-header">
                    <div class="suggestion-doctor">${doctor.nom} ${doctor.prenom}</div>
                    <span class="suggestion-type weakness">📈 Axes d'Amélioration</span>
                </div>
                <div class="suggestion-content">
                    <ul>
                        ${analysis.improvements.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            `;
            container.appendChild(improvementCard);
        }
    });
}

// Analyser les performances d'un médecin par rapport aux autres
function analyzeDoctorPerformance(doctor, allDoctors) {
    const strengths = [];
    const improvements = [];
    
    // Calculer les moyennes
    const avgMetrics = {
        uniquePatients: d3.mean(allDoctors, d => d.uniquePatients),
        totalVisits: d3.mean(allDoctors, d => d.totalVisits),
        newPatients: d3.mean(allDoctors, d => d.newPatients),
        revenuePerHour: d3.mean(allDoctors, d => d.revenuePerHour),
        avgPatientTime: d3.mean(allDoctors, d => d.avgPatientTime),
        avgWaitingTime: d3.mean(allDoctors, d => d.avgWaitingTime),
        totalRevenue: d3.mean(allDoctors, d => d.totalRevenue),
        loyaltyRate: d3.mean(allDoctors, d => d.loyaltyRate)
    };
    
    // Trouver le meilleur pour chaque métrique
    const bestMetrics = {
        uniquePatients: d3.max(allDoctors, d => d.uniquePatients),
        totalVisits: d3.max(allDoctors, d => d.totalVisits),
        newPatients: d3.max(allDoctors, d => d.newPatients),
        revenuePerHour: d3.max(allDoctors, d => d.revenuePerHour),
        avgWaitingTime: d3.min(allDoctors, d => d.avgWaitingTime),
        totalRevenue: d3.max(allDoctors, d => d.totalRevenue),
        loyaltyRate: d3.max(allDoctors, d => d.loyaltyRate)
    };
    
    // Analyser les patients uniques
    if (doctor.uniquePatients >= avgMetrics.uniquePatients * 1.1) {
        strengths.push(`Excellent volume de patients uniques (${doctor.uniquePatients} vs moyenne de ${avgMetrics.uniquePatients.toFixed(0)})`);
    } else if (doctor.uniquePatients < avgMetrics.uniquePatients * 0.8) {
        improvements.push(`Augmenter le nombre de patients uniques (actuellement ${doctor.uniquePatients} vs moyenne de ${avgMetrics.uniquePatients.toFixed(0)})`);
    }
    
    // Analyser le CA par heure
    if (doctor.revenuePerHour >= avgMetrics.revenuePerHour * 1.15) {
        strengths.push(`Très bon rendement financier avec ${doctor.revenuePerHour.toFixed(2)}€/heure`);
    } else if (doctor.revenuePerHour < avgMetrics.revenuePerHour * 0.85) {
        improvements.push(`Optimiser le CA par heure (${doctor.revenuePerHour.toFixed(2)}€ vs moyenne ${avgMetrics.revenuePerHour.toFixed(2)}€)`);
    }
    
    // Analyser le temps d'attente
    if (doctor.avgWaitingTime <= avgMetrics.avgWaitingTime * 0.8) {
        strengths.push(`Excellente gestion du temps d'attente (${doctor.avgWaitingTime} min)`);
    } else if (doctor.avgWaitingTime > avgMetrics.avgWaitingTime * 1.2) {
        improvements.push(`Réduire le temps d'attente moyen (${doctor.avgWaitingTime} min vs ${avgMetrics.avgWaitingTime.toFixed(0)} min)`);
    }
    
    // Analyser les nouveaux patients
    if (doctor.newPatients >= avgMetrics.newPatients * 1.2) {
        strengths.push(`Fort taux d'acquisition de nouveaux patients (${doctor.newPatients})`);
    } else if (doctor.newPatients < avgMetrics.newPatients * 0.7) {
        improvements.push(`Développer l'acquisition de nouveaux patients (${doctor.newPatients} vs ${avgMetrics.newPatients.toFixed(0)})`);
    }
    
    // Analyser la fidélisation
    if (doctor.loyaltyRate >= avgMetrics.loyaltyRate * 1.1) {
        strengths.push(`Excellent taux de fidélisation (${doctor.loyaltyRate.toFixed(1)}%)`);
    } else if (doctor.loyaltyRate < avgMetrics.loyaltyRate * 0.9) {
        improvements.push(`Améliorer la fidélisation des patients (${doctor.loyaltyRate.toFixed(1)}% vs ${avgMetrics.loyaltyRate.toFixed(1)}%)`);
    }
    
    // Analyser le temps patient
    if (doctor.avgPatientTime >= avgMetrics.avgPatientTime * 1.2) {
        improvements.push(`Optimiser le temps passé par patient (${doctor.avgPatientTime} min vs ${avgMetrics.avgPatientTime.toFixed(0)} min)`);
    } else if (doctor.avgPatientTime <= avgMetrics.avgPatientTime * 0.8) {
        // Peut être une force ou une faiblesse selon le contexte
        strengths.push(`Efficacité dans la prise en charge (${doctor.avgPatientTime} min par patient)`);
    }
    
    // Score global
    if (doctor.globalScore >= 75) {
        strengths.push(`Performance globale excellente (score: ${doctor.globalScore}/100)`);
    } else if (doctor.globalScore < 50) {
        improvements.push(`Améliorer la performance globale (score actuel: ${doctor.globalScore}/100)`);
    }
    
    // Si aucune suggestion spécifique
    if (strengths.length === 0) {
        strengths.push('Performance dans la moyenne, continuer les efforts');
    }
    
    if (improvements.length === 0) {
        improvements.push('Maintenir le niveau de performance actuel');
    }
    
    return { strengths, improvements };
}

// --- EXPORT ---
function exportToPDF(data) {
    alert('Export PDF - Fonctionnalité à implémenter');
}

function exportToExcel(data) {
    alert('Export Excel - Fonctionnalité à implémenter');
}

// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---
window.addEventListener('DOMContentLoaded', () => {
    loadDoctorsForComparison();
    initializeComparisonDates();
    switchMode('individual'); // Démarrer en mode Individual
});
