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
    
    // Générer les cartes KPI principales
    const mainKPIsHTML = generateMainKPICards(data.doctors);
    
    // Générer le tableau comparatif détaillé
    const comparisonTableHTML = generateComparisonTable(data.doctors);
    
    // Générer les suggestions intelligentes
    const suggestionsHTML = generateSuggestions(data.doctors);
    
    resultsContainer.innerHTML = `
        <!-- Badges de performance -->
        <div class="badges-container">
            ${badgesHTML}
        </div>
        
        <!-- Indicateurs Clés Principaux -->
        <div class="main-kpis-section">
            <h3 class="section-title">📊 Indicateurs Clés de Performance</h3>
            <div class="main-kpis-grid">
                ${mainKPIsHTML}
            </div>
        </div>
        
        <!-- Graphiques de comparaison -->
        <div class="charts-section">
            <h3 class="section-title">📈 Visualisations Comparatives</h3>
            
            <div class="chart-row">
                <div class="chart-container">
                    <svg id="comparison-bar-chart"></svg>
                </div>
            </div>
            
            <div class="chart-row chart-row-2cols">
                <div class="chart-container">
                    <svg id="comparison-radar-chart"></svg>
                </div>
                
                <div class="chart-container">
                    <h4>CA par Heure vs Temps Moyen</h4>
                    <svg id="comparison-scatter-chart"></svg>
                </div>
            </div>
        </div>
        
        <!-- Tableau Comparatif Détaillé -->
        <div class="table-section">
            <h3 class="section-title">📋 Tableau Comparatif Détaillé</h3>
            ${comparisonTableHTML}
        </div>
        
        <!-- Suggestions intelligentes -->
        <div class="suggestions-section">
            <h3 class="section-title">💡 Analyses et Recommandations</h3>
            <div class="suggestions-grid">
                ${suggestionsHTML}
            </div>
        </div>
        
        <!-- Boutons d'export -->
        <div class="export-buttons">
            <button class="btn-export" onclick="exportToPDF()">
                📄 Exporter en PDF
            </button>
        </div>
    `;
    
    // Créer les graphiques D3
    createComparisonBarChart(data);
    createComparisonRadarChart(data);
    createScatterChart(data);
}

// --- GÉNÉRATION DES BADGES ---
function generateBadges(doctors) {
    // Trouver le meilleur dans chaque catégorie
    const topPerformer = doctors.reduce((max, doc) => doc.globalScore > max.globalScore ? doc : max);
    const topRevenue = doctors.reduce((max, doc) => doc.totalRevenue > max.totalRevenue ? doc : max);
    const topLoyalty = doctors.reduce((max, doc) => doc.loyaltyRate > max.loyaltyRate ? doc : max);
    const topEfficiency = doctors.reduce((max, doc) => doc.revenuePerHour > max.revenuePerHour ? doc : max);
    
    return `
        <div class="badge-card badge-gold">
            <div class="badge-icon">🏆</div>
            <div class="badge-content">
                <div class="badge-title">Top Performer Global</div>
                <div class="badge-subtitle">Score basé sur CA/h, visites, patients, fidélisation</div>
                <div class="badge-doctor">${topPerformer.name}</div>
                <div class="badge-value">Score: ${topPerformer.globalScore.toFixed(1)}/100</div>
            </div>
        </div>
        
        <div class="badge-card badge-silver">
            <div class="badge-icon">💰</div>
            <div class="badge-content">
                <div class="badge-title">Meilleur Chiffre d'Affaires</div>
                <div class="badge-doctor">${topRevenue.name}</div>
                <div class="badge-value">${topRevenue.totalRevenue.toLocaleString('fr-FR')} €</div>
            </div>
        </div>
        
        <div class="badge-card badge-bronze">
            <div class="badge-icon">⚡</div>
            <div class="badge-content">
                <div class="badge-title">Meilleur Rendement Horaire</div>
                <div class="badge-doctor">${topEfficiency.name}</div>
                <div class="badge-value">${topEfficiency.revenuePerHour.toFixed(2)} €/h</div>
            </div>
        </div>
        
        <div class="badge-card badge-purple">
            <div class="badge-icon">❤️</div>
            <div class="badge-content">
                <div class="badge-title">Meilleure Fidélisation</div>
                <div class="badge-doctor">${topLoyalty.name}</div>
                <div class="badge-value">${topLoyalty.loyaltyRate.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

// --- GÉNÉRATION DES CARTES KPI PRINCIPALES ---
function generateMainKPICards(doctors) {
    // Indicateurs clés de la page Performance Médecins
    const kpis = [
        { 
            key: 'uniquePatients', 
            label: 'Patients Uniques',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        },
        { 
            key: 'totalVisits', 
            label: 'Nombre de Visites',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        },
        { 
            key: 'newPatients', 
            label: 'Nouveaux Patients',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        },
        { 
            key: 'totalRevenue', 
            label: 'Total des Revenus',
            format: (v) => v.toLocaleString('fr-FR') + ' €',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        },
        { 
            key: 'revenuePerHour', 
            label: 'CA par Heure',
            format: (v) => v.toFixed(2) + ' €/h',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        },
        { 
            key: 'avgPatientTime', 
            label: 'Temps Patient Moyen',
            format: (v) => v + ' min',
            getIndicator: (value, avg) => value < avg * 0.9 ? '🟢' : value > avg * 1.1 ? '🔴' : '🟠',
            inverse: true
        },
        { 
            key: 'avgWaitingTime', 
            label: 'Temps d\'Attente Moyen',
            format: (v) => v + ' min',
            getIndicator: (value, avg) => value < avg * 0.9 ? '🟢' : value > avg * 1.1 ? '🔴' : '🟠',
            inverse: true
        },
        { 
            key: 'avgRevenuePerVisit', 
            label: 'CA Moyen / Visite',
            format: (v) => v.toFixed(2) + ' €',
            getIndicator: (value, avg) => value > avg * 1.1 ? '🟢' : value < avg * 0.9 ? '🔴' : '🟠'
        }
    ];
    
    return kpis.map(kpi => {
        const avg = doctors.reduce((sum, d) => sum + (d[kpi.key] || 0), 0) / doctors.length;
        
        const doctorCards = doctors.map(doctor => {
            const value = doctor[kpi.key] || 0;
            const indicator = kpi.getIndicator(value, avg);
            const formattedValue = kpi.format ? kpi.format(value) : value;
            
            return `
                <div class="kpi-doctor-card" style="border-left: 4px solid ${doctor.color};">
                    <div class="kpi-doctor-name">${doctor.name}</div>
                    <div class="kpi-doctor-value">
                        <span class="indicator">${indicator}</span>
                        <span class="value">${formattedValue}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="main-kpi-card">
                <div class="kpi-header">
                    <h4>${kpi.label}</h4>
                </div>
                <div class="kpi-doctors">
                    ${doctorCards}
                </div>
            </div>
        `;
    }).join('');
}

// --- GÉNÉRATION DU TABLEAU COMPARATIF ---
function generateComparisonTable(doctors) {
    const metrics = [
        { key: 'uniquePatients', label: 'Patients Uniques', format: (v) => v },
        { key: 'totalVisits', label: 'Nombre de Visites', format: (v) => v },
        { key: 'newPatients', label: 'Nouveaux Patients', format: (v) => v },
        { key: 'totalRevenue', label: 'Revenus Totaux', format: (v) => v.toLocaleString('fr-FR') + ' €' },
        { key: 'avgRevenuePerVisit', label: 'CA Moyen/Visite', format: (v) => v.toFixed(2) + ' €' },
        { key: 'revenuePerHour', label: 'CA par Heure', format: (v) => v.toFixed(2) + ' €/h' },
        { key: 'totalWorkingHours', label: 'Heures Travaillées', format: (v) => v.toFixed(1) + ' h' },
        { key: 'avgPatientTime', label: 'Temps Patient Moy.', format: (v) => v + ' min' },
        { key: 'avgWaitingTime', label: 'Temps Attente Moy.', format: (v) => v + ' min' },
        { key: 'loyaltyRate', label: 'Taux de Fidélisation', format: (v) => v.toFixed(1) + ' %' },
        { key: 'globalScore', label: 'Score Global', format: (v) => v.toFixed(1) + '/100' }
    ];
    
    const headerCells = doctors.map(doctor => 
        `<th style="background: ${doctor.color}; color: white;">${doctor.name}</th>`
    ).join('');
    
    const rows = metrics.map(metric => {
        const cells = doctors.map(doctor => {
            const value = doctor[metric.key] || 0;
            const avg = doctors.reduce((sum, d) => sum + (d[metric.key] || 0), 0) / doctors.length;
            const isBest = value === Math.max(...doctors.map(d => d[metric.key] || 0));
            const cssClass = isBest ? 'best-value' : '';
            
            return `<td class="${cssClass}">${metric.format(value)}</td>`;
        }).join('');
        
        return `
            <tr>
                <td class="metric-label">${metric.label}</td>
                ${cells}
            </tr>
        `;
    }).join('');
    
    return `
        <div class="comparison-table-wrapper">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Indicateur</th>
                        ${headerCells}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// --- GÉNÉRATION DES SUGGESTIONS ---
// L'algorithme analyse chaque médecin et compare ses performances aux moyennes du groupe
// Pour chaque indicateur clé, il identifie si le médecin est au-dessus ou en-dessous de la moyenne
// Points forts: indicateurs > 120% de la moyenne
// Axes d'amélioration: indicateurs < 80% de la moyenne
function generateSuggestions(doctors) {
    const suggestions = [];
    
    // Analyser chaque médecin
    doctors.forEach(doctor => {
        const analysis = analyzeDoctor(doctor, doctors);
        
        suggestions.push(`
            <div class="suggestion-card" style="border-left: 4px solid ${doctor.color};">
                <div class="suggestion-header">
                    <h4>${doctor.name}</h4>
                    <div class="overall-score" style="background: ${getScoreColor(doctor.globalScore)};">
                        Score: ${doctor.globalScore.toFixed(1)}/100
                    </div>
                </div>
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
                <div class="suggestion-actions">
                    <strong>🎯 Actions recommandées :</strong>
                    <ul>
                        ${analysis.actions.map(a => `<li>${a}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `);
    });
    
    return suggestions.join('');
}

// Obtenir la couleur selon le score
function getScoreColor(score) {
    if (score >= 75) return '#10b981'; // Vert
    if (score >= 50) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
}

function analyzeDoctor(doctor, allDoctors) {
    const strengths = [];
    const improvements = [];
    const actions = [];
    
    // Calculer les moyennes
    const avgRevenue = allDoctors.reduce((sum, d) => sum + d.totalRevenue, 0) / allDoctors.length;
    const avgVisits = allDoctors.reduce((sum, d) => sum + d.totalVisits, 0) / allDoctors.length;
    const avgLoyalty = allDoctors.reduce((sum, d) => sum + d.loyaltyRate, 0) / allDoctors.length;
    const avgRevenuePerVisit = allDoctors.reduce((sum, d) => sum + d.avgRevenuePerVisit, 0) / allDoctors.length;
    const avgRevenuePerHour = allDoctors.reduce((sum, d) => sum + d.revenuePerHour, 0) / allDoctors.length;
    const avgWaitingTime = allDoctors.reduce((sum, d) => sum + d.avgWaitingTime, 0) / allDoctors.length;
    const avgNewPatients = allDoctors.reduce((sum, d) => sum + d.newPatients, 0) / allDoctors.length;
    
    // Analyser le CA
    if (doctor.totalRevenue > avgRevenue * 1.2) {
        strengths.push(`💰 Excellent chiffre d'affaires (${((doctor.totalRevenue / avgRevenue - 1) * 100).toFixed(0)}% au-dessus de la moyenne)`);
    } else if (doctor.totalRevenue < avgRevenue * 0.8) {
        improvements.push(`💰 Chiffre d'affaires à améliorer (${((1 - doctor.totalRevenue / avgRevenue) * 100).toFixed(0)}% en dessous de la moyenne)`);
        actions.push('Augmenter le nombre de consultations ou optimiser les tarifs');
    }
    
    // Analyser le CA par heure
    if (doctor.revenuePerHour > avgRevenuePerHour * 1.2) {
        strengths.push(`⚡ Excellent rendement horaire (${doctor.revenuePerHour.toFixed(2)}€/h)`);
    } else if (doctor.revenuePerHour < avgRevenuePerHour * 0.8) {
        improvements.push(`⚡ Rendement horaire à optimiser (${doctor.revenuePerHour.toFixed(2)}€/h)`);
        actions.push('Réduire les temps morts entre consultations et optimiser le planning');
    }
    
    // Analyser les visites
    if (doctor.totalVisits > avgVisits * 1.15) {
        strengths.push(`📅 Volume d'activité élevé (${doctor.totalVisits} visites)`);
    } else if (doctor.totalVisits < avgVisits * 0.85) {
        improvements.push(`📅 Augmenter le nombre de consultations (actuellement ${doctor.totalVisits} visites)`);
        actions.push('Optimiser les créneaux disponibles et réduire les annulations');
    }
    
    // Analyser la fidélisation
    if (doctor.loyaltyRate > avgLoyalty * 1.1) {
        strengths.push(`❤️ Excellente fidélisation des patients (${doctor.loyaltyRate.toFixed(1)}%)`);
    } else if (doctor.loyaltyRate < avgLoyalty * 0.9) {
        improvements.push(`❤️ Améliorer la rétention des patients (taux actuel: ${doctor.loyaltyRate.toFixed(1)}%)`);
        actions.push('Mettre en place un système de rappel et de suivi des patients');
    }
    
    // Analyser le CA moyen par visite
    if (doctor.avgRevenuePerVisit > avgRevenuePerVisit * 1.15) {
        strengths.push(`💵 Revenus par visite optimisés (${doctor.avgRevenuePerVisit.toFixed(2)}€)`);
    } else if (doctor.avgRevenuePerVisit < avgRevenuePerVisit * 0.85) {
        improvements.push(`💵 Optimiser le panier moyen par consultation (${doctor.avgRevenuePerVisit.toFixed(2)}€)`);
        actions.push('Proposer des soins complémentaires et packages de traitement');
    }
    
    // Analyser le temps d'attente
    if (doctor.avgWaitingTime < avgWaitingTime * 0.85) {
        strengths.push(`⏳ Temps d'attente excellent (${doctor.avgWaitingTime} min)`);
    } else if (doctor.avgWaitingTime > avgWaitingTime * 1.15) {
        improvements.push(`⏳ Temps d'attente à réduire (${doctor.avgWaitingTime} min)`);
        actions.push('Améliorer la gestion du planning et anticiper les retards');
    }
    
    // Analyser les nouveaux patients
    if (doctor.newPatients > avgNewPatients * 1.2) {
        strengths.push(`✨ Très bon taux d'acquisition de nouveaux patients (${doctor.newPatients})`);
    } else if (doctor.newPatients < avgNewPatients * 0.8) {
        improvements.push(`✨ Développer l'acquisition de nouveaux patients (${doctor.newPatients})`);
        actions.push('Renforcer la visibilité et les recommandations de patients');
    }
    
    // Si pas assez de points forts/améliorations, ajouter des messages génériques
    if (strengths.length === 0) {
        strengths.push('Performance globale dans la moyenne du groupe');
    }
    
    if (improvements.length === 0) {
        improvements.push('Aucun axe d\'amélioration majeur identifié');
    }
    
    if (actions.length === 0) {
        actions.push('Maintenir les bonnes pratiques actuelles et viser l\'excellence');
    }
    
    return { strengths, improvements, actions };
}

// --- GRAPHIQUE SCATTER (NUAGE DE POINTS) ---
function createScatterChart(data) {
    const container = d3.select('#comparison-scatter-chart');
    container.selectAll('*').remove();
    
    const fullWidth = 600;
    const fullHeight = 500;
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    
    const svg = container
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Échelles
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data.doctors, d => d.revenuePerHour) * 1.1])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data.doctors, d => Math.max(d.avgPatientTime, d.avgWaitingTime)) * 1.1])
        .range([height, 0]);
    
    // Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 45)
        .attr('fill', '#333')
        .attr('text-anchor', 'middle')
        .text('CA par Heure (€/h)');
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -50)
        .attr('fill', '#333')
        .attr('text-anchor', 'middle')
        .text('Temps (minutes)');
    
    // Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'd3-tooltip')
        .style('opacity', 0);
    
    // Points pour temps patient
    svg.selectAll('.point-patient')
        .data(data.doctors)
        .enter()
        .append('circle')
        .attr('class', 'point-patient')
        .attr('cx', d => xScale(d.revenuePerHour))
        .attr('cy', d => yScale(d.avgPatientTime))
        .attr('r', 8)
        .attr('fill', d => d.color)
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<strong>${d.name}</strong><br/>CA/h: ${d.revenuePerHour.toFixed(2)}€<br/>Temps patient: ${d.avgPatientTime} min`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });
    
    // Points pour temps d'attente
    svg.selectAll('.point-waiting')
        .data(data.doctors)
        .enter()
        .append('rect')
        .attr('class', 'point-waiting')
        .attr('x', d => xScale(d.revenuePerHour) - 6)
        .attr('y', d => yScale(d.avgWaitingTime) - 6)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d => d.color)
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<strong>${d.name}</strong><br/>CA/h: ${d.revenuePerHour.toFixed(2)}€<br/>Temps d'attente: ${d.avgWaitingTime} min`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });
    
    // Légende
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 10}, 0)`);
    
    // Légende médecins
    data.doctors.forEach((doctor, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('circle')
            .attr('r', 6)
            .attr('fill', doctor.color);
        
        legendRow.append('text')
            .attr('x', 12)
            .attr('y', 5)
            .attr('font-size', '11px')
            .text(doctor.nom + ' ' + doctor.prenom.charAt(0) + '.');
    });
    
    // Légende formes
    const shapeLegend = legend.append('g')
        .attr('transform', `translate(0, ${(data.doctors.length + 1) * 25})`);
    
    shapeLegend.append('circle')
        .attr('r', 6)
        .attr('fill', '#666');
    
    shapeLegend.append('text')
        .attr('x', 12)
        .attr('y', 5)
        .attr('font-size', '10px')
        .text('Temps patient');
    
    shapeLegend.append('rect')
        .attr('x', -6)
        .attr('y', 20)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', '#666');
    
    shapeLegend.append('text')
        .attr('x', 12)
        .attr('y', 31)
        .attr('font-size', '10px')
        .text('Temps d\'attente');
}

// --- EXPORT PDF ---
function exportToPDF() {
    // Vérifier si jsPDF est chargé
    if (typeof window.jspdf === 'undefined') {
        alert('La bibliothèque jsPDF n\'est pas chargée. Veuillez ajouter le script dans le HTML.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;
    const margin = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * margin);
    
    // En-tête
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 98, 254); // Couleur primaire
    doc.text('Comparaison des Médecins', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    
    // Période
    const startDate = document.getElementById('comparison-start-date').value;
    const endDate = document.getElementById('comparison-end-date').value;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Période: ${startDate} au ${endDate}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.setDrawColor(15, 98, 254);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // Récupérer les données du tableau
    const table = document.querySelector('.comparison-table');
    if (!table) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    // Extraire les noms des médecins depuis les en-têtes
    const headers = Array.from(table.querySelectorAll('thead th'));
    const doctorNames = headers.slice(1).map(th => th.textContent.trim());
    
    // Section: Médecins comparés
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Medecins compares', margin, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doctorNames.forEach((name, index) => {
        const colors = [[15, 98, 254], [255, 131, 43], [67, 233, 123]];
        const color = colors[index % colors.length];
        doc.setFillColor(...color);
        doc.circle(margin + 2, yPosition - 1, 1.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(name, margin + 6, yPosition);
        yPosition += 6;
    });
    
    yPosition += 5;
    
    // Section: Indicateurs Clés
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicateurs Cles de Performance', margin, yPosition);
    yPosition += 8;
    
    // Extraire les données des lignes du tableau
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const metricsData = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
            metric: cells[0].textContent.trim(),
            values: cells.slice(1).map(cell => cell.textContent.trim())
        };
    });
    
    // Afficher les métriques importantes (première page)
    const importantMetrics = metricsData.slice(0, 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    importantMetrics.forEach((metric, index) => {
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
        
        // Nom de la métrique
        doc.setFont('helvetica', 'bold');
        doc.text(metric.metric, margin, yPosition);
        yPosition += 5;
        
        // Valeurs pour chaque médecin
        doc.setFont('helvetica', 'normal');
        metric.values.forEach((value, i) => {
            const colors = [[15, 98, 254], [255, 131, 43], [67, 233, 123]];
            const color = colors[i % colors.length];
            doc.setTextColor(...color);
            doc.text(`${doctorNames[i]}: ${value}`, margin + 5, yPosition);
            yPosition += 4.5;
        });
        
        doc.setTextColor(0, 0, 0);
        yPosition += 2;
    });
    
    // Nouvelle page pour le tableau complet
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tableau Comparatif Detaille', margin, yPosition);
    yPosition += 10;
    
    // Créer un tableau structuré
    doc.setFontSize(8);
    const colWidth = contentWidth / (doctorNames.length + 1);
    
    // En-têtes
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition - 5, contentWidth, 7, 'F');
    doc.text('Métrique', margin + 2, yPosition);
    doctorNames.forEach((name, i) => {
        doc.text(name.substring(0, 15), margin + colWidth * (i + 1) + 2, yPosition);
    });
    yPosition += 8;
    
    // Lignes de données
    doc.setFont('helvetica', 'normal');
    metricsData.forEach((metric, index) => {
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
        
        // Alternance de couleur de fond
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPosition - 4, contentWidth, 6, 'F');
        }
        
        doc.text(metric.metric.substring(0, 25), margin + 2, yPosition);
        metric.values.forEach((value, i) => {
            doc.text(value, margin + colWidth * (i + 1) + 2, yPosition);
        });
        yPosition += 6;
    });
    
    // Pied de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, 287, { align: 'center' });
        doc.text(`MyDental BI - Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 292, { align: 'center' });
    }
    
    // Sauvegarder
    doc.save(`comparaison-medecins-${new Date().toISOString().split('T')[0]}.pdf`);
}

// --- EXPORT EXCEL ---
function exportToExcel() {
    // Vérifier si SheetJS est chargé
    if (typeof XLSX === 'undefined') {
        alert('La bibliothèque SheetJS n\'est pas chargée. Veuillez ajouter le script dans le HTML.');
        return;
    }
    
    // Récupérer les données du tableau comparatif
    const table = document.querySelector('.comparison-table');
    if (!table) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    // Créer un workbook
    const wb = XLSX.utils.book_new();
    
    // Convertir le tableau HTML en feuille
    const ws = XLSX.utils.table_to_sheet(table);
    
    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Comparaison');
    
    // Sauvegarder le fichier
    const fileName = `comparaison-medecins-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
