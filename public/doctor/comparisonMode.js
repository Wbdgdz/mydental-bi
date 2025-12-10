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
    document.getElementById('doctor-select-3'),
    document.getElementById('doctor-select-4')
];

const compareBtn = document.getElementById('btn-compare');
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
                option.value = doctor.idMedecin;
                option.textContent = `${doctor.nom} ${doctor.prenom}`;
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
    generateComparisonBarChart(data);
    generateComparisonRadarChart(data);
    generateComparisonTimeline(data);
    
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

// --- GRAPHIQUES (placeholders pour l'instant) ---
function generateComparisonBarChart(data) {
    // TODO: Implémenter avec D3.js
    console.log('Bar chart:', data);
}

function generateComparisonRadarChart(data) {
    // TODO: Implémenter avec D3.js
    console.log('Radar chart:', data);
}

function generateComparisonTimeline(data) {
    // TODO: Implémenter avec D3.js
    console.log('Timeline chart:', data);
}

// --- SUGGESTIONS ---
function generateSuggestions(data) {
    const container = document.getElementById('suggestions-grid');
    
    // TODO: Algorithme de suggestions basé sur les données
    // Pour l'instant, exemple statique
    data.doctors.forEach(doctor => {
        const suggestionCard = document.createElement('div');
        suggestionCard.className = 'suggestion-card strength';
        suggestionCard.innerHTML = `
            <div class="suggestion-header">
                <div class="suggestion-doctor">${doctor.nom} ${doctor.prenom}</div>
                <span class="suggestion-type strength">Forces</span>
            </div>
            <div class="suggestion-content">
                <p>Analyse en cours...</p>
            </div>
        `;
        container.appendChild(suggestionCard);
    });
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
