// rentabiliteDoctor.js - Graphiques de rentabilité spécifiques par médecin pour doctorPerformance.html

import { 
    hasSimulationData, 
    getSimulationInfo,
    getActesRentabilite,
    getGlobalStats,
    getSimulationParams
} from '../utilities/utils.js';

let currentDoctorId = null;

// Fonction pour formater les nombres
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num);
}

// Charger et afficher les données de rentabilité filtrées par médecin
export function loadRentabiliteData(doctorId = null) {
    currentDoctorId = doctorId;
    
    // Vérifier si des données de simulation existent
    if (!hasSimulationData()) {
        const section = document.getElementById('rentabilite-section');
        if (section) section.style.display = 'none';
        return;
    }

    const params = getSimulationParams();
    
    // Afficher la section
    const section = document.getElementById('rentabilite-section');
    if (section) section.style.display = 'block';

    // Afficher les informations de simulation
    const infoDiv = document.getElementById('rentabilite-info');
    const infoText = document.getElementById('simulation-info-text');
    
    if (infoText) {
        if (doctorId && doctorId !== 'all') {
            infoText.textContent = `${getSimulationInfo()} - Filtré pour le médecin sélectionné`;
        } else {
            infoText.textContent = `${getSimulationInfo()} - Vue globale (tous les médecins)`;
        }
    }
    
    // Restaurer les styles normaux
    if (infoDiv) {
        infoDiv.style.background = '#f8f9fa';
        infoDiv.style.borderLeftColor = '#667eea';
    }

    // Afficher stats et graphiques
    const statsContainer = document.getElementById('rentabilite-stats');
    if (statsContainer) statsContainer.style.display = 'grid';
    const charts = document.getElementById('rentabilite-charts-container');
    if (charts) charts.style.display = 'block';

    // Afficher les statistiques filtrées par médecin
    displayRentabiliteStats(doctorId);

    // Attendre que le DOM soit rendu avant de créer les graphiques
    setTimeout(() => {
        createTopCAChart(doctorId);
        createCADistributionChart(doctorId);
        createTopVisitsChart(doctorId);
    }, 100);
}

// Afficher les statistiques de rentabilité (basées sur les données réelles uniquement)
function displayRentabiliteStats(doctorId = null) {
    const stats = getGlobalStats(doctorId);

    const statsContainer = document.getElementById('rentabilite-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stats-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 5px;">Actes Analysés</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #2c3e50;">${stats.nombreActes}</div>
        </div>
        <div class="stats-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 5px;">CA Total</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #27ae60;">${formatNumber(stats.totalCA)} DA</div>
        </div>
        <div class="stats-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 5px;">Nombre de Visites</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #3498db;">${stats.totalVisites || 0}</div>
        </div>
        <div class="stats-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 5px;">CA Moyen par Visite</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #9b59b6;">${formatNumber(stats.totalVisites > 0 ? stats.totalCA / stats.totalVisites : 0)} DA</div>
        </div>
    `;
}

// Créer le graphique Top 10 Actes par CA
function createTopCAChart(doctorId = null) {
    const actes = getActesRentabilite(doctorId);
    const topActes = actes
        .sort((a, b) => b.CA - a.CA)
        .slice(0, 10);

    const container = document.getElementById('rentabilite-scatter-chart');
    if (!container) return;

    const width = container.offsetWidth || 800;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 200 };

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('Top 10 Actes par Chiffre d\'Affaires');

    // Échelles
    const y = d3.scaleBand()
        .domain(topActes.map(d => d.acte))
        .range([0, chartHeight])
        .padding(0.2);

    const x = d3.scaleLinear()
        .domain([0, d3.max(topActes, d => d.CA)])
        .nice()
        .range([0, chartWidth]);

    // Axes
    g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px');

    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => formatNumber(d) + ' DA'));

    // Barres
    g.selectAll('.bar')
        .data(topActes)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.acte))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('width', d => x(d.CA))
        .attr('fill', '#3498db')
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${d.acte}</strong><br/>CA: ${formatNumber(d.CA)} DA<br/>Visites: ${d.total_visits}<br/>Prix moyen: ${formatNumber(d.prix_moyen)} DA`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });

    // Ajouter les valeurs sur les barres
    g.selectAll('.label')
        .data(topActes)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('y', d => y(d.acte) + y.bandwidth() / 2)
        .attr('x', d => x(d.CA) + 5)
        .attr('dy', '.35em')
        .attr('font-size', '11px')
        .attr('fill', '#333')
        .text(d => formatNumber(d.CA) + ' DA');
}

// Créer le graphique de distribution du CA par Acte (Pie Chart)
function createCADistributionChart(doctorId = null) {
    const actes = getActesRentabilite(doctorId);
    const topActes = actes
        .sort((a, b) => b.CA - a.CA)
        .slice(0, 8); // Top 8 pour meilleure lisibilité

    const container = document.getElementById('rentabilite-top-marge-chart');
    if (!container) return;

    const width = container.offsetWidth || 800;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('Distribution du CA par Acte (Top 8)');

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2 + 20})`);

    // Couleurs
    const color = d3.scaleOrdinal()
        .domain(topActes.map(d => d.acte))
        .range(['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e74c3c', '#1abc9c', '#e67e22', '#95a5a6']);

    // Générateur de pie
    const pie = d3.pie()
        .value(d => d.CA)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const arcHover = d3.arc()
        .innerRadius(0)
        .outerRadius(radius + 10);

    // Créer les tranches
    const arcs = g.selectAll('.arc')
        .data(pie(topActes))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.acte))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('opacity', 1)
                .attr('d', arcHover);
            const total = topActes.reduce((sum, a) => sum + a.CA, 0);
            const percent = ((d.data.CA / total) * 100).toFixed(1);
            showTooltip(event, `<strong>${d.data.acte}</strong><br/>CA: ${formatNumber(d.data.CA)} DA<br/>Part: ${percent}%<br/>Visites: ${d.data.total_visits}`);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('opacity', 0.8)
                .attr('d', arc);
            hideTooltip();
        });

    // Ajouter les labels
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text(d => {
            const total = topActes.reduce((sum, a) => sum + a.CA, 0);
            const percent = ((d.data.CA / total) * 100).toFixed(0);
            return percent > 5 ? percent + '%' : ''; // N'afficher que si > 5%
        });

    // Légende
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 180}, 50)`);

    topActes.forEach((d, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', color(d.acte))
            .attr('opacity', 0.8);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '10px')
            .attr('fill', '#333')
            .text(d.acte.length > 25 ? d.acte.substring(0, 25) + '...' : d.acte);
    });
}

// Créer le graphique Top 10 Actes par Nombre de Visites
function createTopVisitsChart(doctorId = null) {
    const actes = getActesRentabilite(doctorId);
    const topActes = actes
        .sort((a, b) => b.total_visits - a.total_visits)
        .slice(0, 10);

    const container = document.getElementById('rentabilite-potentiel-chart');
    if (!container) return;

    const width = container.offsetWidth || 800;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 200 };

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('Top 10 Actes les Plus Pratiqués');

    // Échelles
    const y = d3.scaleBand()
        .domain(topActes.map(d => d.acte))
        .range([0, chartHeight])
        .padding(0.2);

    const x = d3.scaleLinear()
        .domain([0, d3.max(topActes, d => d.total_visits)])
        .nice()
        .range([0, chartWidth]);

    // Axes
    g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px');

    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => d));

    // Barres
    g.selectAll('.bar')
        .data(topActes)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.acte))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('width', d => x(d.total_visits))
        .attr('fill', '#2ecc71')
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${d.acte}</strong><br/>Visites: ${d.total_visits}<br/>CA total: ${formatNumber(d.CA)} DA<br/>Prix moyen: ${formatNumber(d.prix_moyen)} DA`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });

    // Ajouter les valeurs sur les barres
    g.selectAll('.label')
        .data(topActes)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('y', d => y(d.acte) + y.bandwidth() / 2)
        .attr('x', d => x(d.total_visits) + 5)
        .attr('dy', '.35em')
        .attr('font-size', '11px')
        .attr('fill', '#333')
        .text(d => d.total_visits);
}

// Fonctions helper pour tooltip
function showTooltip(event, html) {
    let tooltip = d3.select('#rentabilite-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('id', 'rentabilite-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');
    }
    tooltip
        .html(html)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('display', 'block');
}

function hideTooltip() {
    d3.select('#rentabilite-tooltip').style('display', 'none');
}
