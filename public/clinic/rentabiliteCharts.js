// rentabiliteCharts.js - Graphiques généraux de rentabilité pour index.html

import { 
    hasSimulationData, 
    getSimulationInfo,
    getActesRentabilite,
    getGlobalStats,
    getSimulationParams
} from '../utilities/utils.js';

// Fonction pour formater les nombres
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num);
}

// Charger et afficher les données de rentabilité avec graphiques
export function loadRentabiliteData() {
    // Vérifier si des données de simulation existent
    if (!hasSimulationData()) {
        const section = document.getElementById('rentabilite-section');
        if (section) section.style.display = 'none';
        return;
    }

    // Afficher la section
    const section = document.getElementById('rentabilite-section');
    if (section) section.style.display = 'block';

    // Afficher les informations de simulation
    const infoText = document.getElementById('simulation-info-text');
    if (infoText) infoText.textContent = getSimulationInfo();

    // Afficher les statistiques globales
    displayRentabiliteStats();

    // Attendre que le DOM soit rendu avant de créer les graphiques
    setTimeout(() => {
        createCADistributionChart();
        createMargeDistributionChart();
    }, 100);
}

// Afficher les statistiques de rentabilité (basées sur les données réelles uniquement)
function displayRentabiliteStats() {
    const stats = getGlobalStats();

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

// Créer le graphique de distribution du CA par acte (Top 10)
function createCADistributionChart() {
    const actes = getActesRentabilite();
    
    // Agréger par nom d'acte (somme des CA de tous les médecins)
    const actesAggregated = {};
    actes.forEach(acte => {
        if (!actesAggregated[acte.acte]) {
            actesAggregated[acte.acte] = {
                acte: acte.acte,
                CA: 0,
                total_visits: 0
            };
        }
        actesAggregated[acte.acte].CA += acte.CA || 0;
        actesAggregated[acte.acte].total_visits += acte.total_visits || 0;
    });
    
    const topActes = Object.values(actesAggregated)
        .sort((a, b) => b.CA - a.CA)
        .slice(0, 10);

    const container = document.getElementById('rentabilite-ca-chart');
    if (!container) {
        console.error('Conteneur rentabilite-ca-chart non trouvé');
        return;
    }

    const margin = { top: 40, right: 80, bottom: 100, left: 80 };
    const fullWidth = 1200;
    const fullHeight = 600;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .classed('svg-content-responsive', true);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Échelles
    const x = d3.scaleBand()
        .domain(topActes.map(d => d.acte))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(topActes, d => d.CA)])
        .nice()
        .range([height, 0]);

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '11px');

    g.append('g')
        .call(d3.axisLeft(y).tickFormat(d => formatNumber(d) + ' DA'));

    // Barres
    g.selectAll('.bar')
        .data(topActes)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.acte))
        .attr('y', d => y(d.CA))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.CA))
        .attr('fill', '#667eea')
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `${d.acte}<br/>CA: ${formatNumber(d.CA)} DA`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });
}

// Créer le graphique de répartition du CA par catégorie d'actes (Camembert)
function createMargeDistributionChart() {
    const actes = getActesRentabilite();
    
    // D'abord agréger par nom d'acte
    const actesAggregated = {};
    actes.forEach(acte => {
        if (!actesAggregated[acte.acte]) {
            actesAggregated[acte.acte] = {
                acte: acte.acte,
                CA: 0
            };
        }
        actesAggregated[acte.acte].CA += acte.CA || 0;
    });
    
    // Ensuite regrouper par catégorie (basé sur les premiers mots du nom)
    const categories = {};
    Object.values(actesAggregated).forEach(acte => {
        // Extraire les 2-3 premiers mots comme catégorie
        const words = acte.acte.split(' ');
        const category = words.slice(0, Math.min(2, words.length)).join(' ');
        
        if (!categories[category]) {
            categories[category] = { count: 0, ca: 0 };
        }
        categories[category].count++;
        categories[category].ca += acte.CA;
    });

    // Trier par CA et prendre le top 6
    const topCategories = Object.entries(categories)
        .sort((a, b) => b[1].ca - a[1].ca)
        .slice(0, 6);

    const colors = ['#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c'];
    
    const data = topCategories.map(([name, info], i) => ({
        label: name,
        value: info.ca,
        count: info.count,
        color: colors[i]
    }));

    console.log('[RentabiliteCharts] Données pour camembert:', data);

    const container = document.getElementById('rentabilite-marge-chart');
    if (!container) {
        console.error('Conteneur rentabilite-marge-chart non trouvé');
        return;
    }
    
    if (data.length === 0) {
        console.warn('Aucune donnée pour le camembert');
        return;
    }

    const fullWidth = 1200;
    const fullHeight = 600;
    const radius = Math.min(fullWidth, fullHeight) / 2 - 100;

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .classed('svg-content-responsive', true)
        .style('background', '#f9f9f9'); // Debug: voir le SVG

    const g = svg.append('g')
        .attr('transform', `translate(${fullWidth / 2},${fullHeight / 2})`);

    console.log('[RentabiliteCharts] Radius:', radius);
    console.log('[RentabiliteCharts] Center:', fullWidth / 2, fullHeight / 2);

    // Créer le camembert
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const pieData = pie(data);
    console.log('[RentabiliteCharts] Pie data:', pieData);

    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);
    
    console.log('[RentabiliteCharts] Arc innerRadius:', radius * 0.5, 'outerRadius:', radius);

    const arcs = g.selectAll('.arc')
        .data(pieData)
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => {
            console.log('[RentabiliteCharts] Couleur pour:', d.data.label, '=', d.data.color);
            return d.data.color;
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            const totalCA = data.reduce((sum, cat) => sum + cat.value, 0);
            const percentage = ((d.data.value / totalCA) * 100).toFixed(1);
            showTooltip(event, `<strong>${d.data.label}</strong><br/>CA: ${formatNumber(d.data.value)} DA<br/>Part: ${percentage}%<br/>Actes: ${d.data.count}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });

    // Ajouter les labels avec pourcentages
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text(d => {
            const totalCA = data.reduce((sum, cat) => sum + cat.value, 0);
            const percentage = ((d.data.value / totalCA) * 100).toFixed(0);
            return percentage > 5 ? percentage + '%' : ''; // N'afficher que si > 5%
        });

    // Légende
    const legend = svg.append('g')
        .attr('transform', `translate(${fullWidth - 280}, 50)`);

    data.forEach((d, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);

        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d.color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '12px')
            .text(d.label);
    });
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
