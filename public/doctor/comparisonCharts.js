// --- GRAPHIQUE EN BARRES COMPARATIF ---
export function createComparisonBarChart(data) {
    const container = d3.select('#comparison-bar-chart');
    container.selectAll('*').remove();
    
    const fullWidth = 1200;
    const fullHeight = 600;
    const margin = { top: 60, right: 150, bottom: 80, left: 80 };
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    
    const svg = container
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Métriques à afficher
    const metrics = [
        { key: 'uniquePatients', label: 'Patients Uniques' },
        { key: 'totalVisits', label: 'Visites' },
        { key: 'newPatients', label: 'Nouveaux Patients' },
        { key: 'totalRevenue', label: 'Revenus (€)', isRevenue: true }
    ];
    
    // Préparer les données
    const chartData = metrics.map(metric => ({
        metric: metric.label,
        ...data.doctors.reduce((acc, doctor) => {
            acc[doctor.nom] = metric.isRevenue 
                ? doctor[metric.key] / 100 // Diviser par 100 pour meilleure échelle
                : doctor[metric.key];
            return acc;
        }, {})
    }));
    
    // Échelles
    const x0 = d3.scaleBand()
        .domain(metrics.map(m => m.label))
        .range([0, width])
        .padding(0.2);
    
    const x1 = d3.scaleBand()
        .domain(data.doctors.map(d => d.nom))
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const maxValue = d3.max(chartData, d => 
        d3.max(data.doctors.map(doctor => d[doctor.nom]))
    );
    
    const y = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .nice()
        .range([height, 0]);
    
    // Axes
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '600');
    
    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px');
    
    // Grille horizontale
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll('line')
        .style('stroke', '#e0e0e0')
        .style('stroke-dasharray', '3,3');
    
    // Groupes de barres
    const metricGroups = svg.selectAll('.metric-group')
        .data(chartData)
        .join('g')
        .attr('class', 'metric-group')
        .attr('transform', d => `translate(${x0(d.metric)},0)`);
    
    // Barres
    metricGroups.selectAll('rect')
        .data(d => data.doctors.map(doctor => ({
            doctor: doctor.nom,
            value: d[doctor.nom],
            color: doctor.color
        })))
        .join('rect')
        .attr('x', d => x1(d.doctor))
        .attr('y', height)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', d => d.color)
        .attr('rx', 4)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .style('opacity', 0.8)
                .style('cursor', 'pointer');
            
            showTooltip(event, `<strong>${d.doctor}</strong><br>${d.value.toFixed(0)}`);
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 1);
            hideTooltip();
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.value))
        .attr('height', d => height - y(d.value));
    
    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', '700')
        .style('fill', '#333')
        .text('Comparaison des Indicateurs Clés');
    
    // Légende
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 0)`);
    
    data.doctors.forEach((doctor, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', doctor.color)
            .attr('rx', 3);
        
        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .style('font-weight', '600')
            .text(`${doctor.nom} ${doctor.prenom}`);
    });
}

// --- GRAPHIQUE RADAR ---
export function createComparisonRadarChart(data) {
    const container = d3.select('#comparison-radar-chart');
    container.selectAll('*').remove();
    
    const fullWidth = 1200;
    const fullHeight = 700;
    const margin = 80;
    const width = fullWidth - 2 * margin;
    const height = fullHeight - 2 * margin;
    const radius = Math.min(width, height) / 2;
    
    const svg = container
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .append('g')
        .attr('transform', `translate(${fullWidth / 2},${fullHeight / 2})`);
    
    // Métriques pour le radar (normalisées sur 100)
    const metrics = [
        'uniquePatients',
        'totalVisits',
        'newPatients',
        'revenuePerHour',
        'avgPatientTime'
    ];
    
    const labels = [
        'Patients Uniques',
        'Visites',
        'Nouveaux Patients',
        'CA/Heure',
        'Temps Patient'
    ];
    
    // Normaliser les données sur 100
    const normalizedData = data.doctors.map(doctor => {
        const maxValues = {
            uniquePatients: d3.max(data.doctors, d => d.uniquePatients),
            totalVisits: d3.max(data.doctors, d => d.totalVisits),
            newPatients: d3.max(data.doctors, d => d.newPatients),
            revenuePerHour: d3.max(data.doctors, d => d.revenuePerHour),
            avgPatientTime: d3.max(data.doctors, d => d.avgPatientTime)
        };
        
        return {
            ...doctor,
            normalized: metrics.map(m => 
                maxValues[m] > 0 ? (doctor[m] / maxValues[m]) * 100 : 0
            )
        };
    });
    
    // Nombre d'axes
    const total = metrics.length;
    const angleSlice = Math.PI * 2 / total;
    
    // Échelles
    const rScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, radius]);
    
    // Cercles de fond
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
        svg.append('circle')
            .attr('r', radius / levels * i)
            .style('fill', 'none')
            .style('stroke', '#e0e0e0')
            .style('stroke-width', '1px');
        
        // Valeurs
        svg.append('text')
            .attr('x', 5)
            .attr('y', -radius / levels * i)
            .style('font-size', '10px')
            .style('fill', '#999')
            .text((100 / levels * i).toFixed(0));
    }
    
    // Axes
    metrics.forEach((metric, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // Ligne d'axe
        svg.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', y)
            .style('stroke', '#ccc')
            .style('stroke-width', '2px');
        
        // Label
        const labelX = Math.cos(angle) * (radius + 30);
        const labelY = Math.sin(angle) * (radius + 30);
        
        svg.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .text(labels[i]);
    });
    
    // Générateur de ligne radar
    const radarLine = d3.lineRadial()
        .angle((d, i) => angleSlice * i)
        .radius(d => rScale(d))
        .curve(d3.curveLinearClosed);
    
    // Dessiner les polygones pour chaque médecin
    normalizedData.forEach(doctor => {
        // Zone
        svg.append('path')
            .datum(doctor.normalized)
            .attr('d', radarLine)
            .style('fill', doctor.color)
            .style('fill-opacity', 0.2)
            .style('stroke', doctor.color)
            .style('stroke-width', '3px')
            .on('mouseover', function() {
                d3.select(this)
                    .style('fill-opacity', 0.4)
                    .style('cursor', 'pointer');
            })
            .on('mouseout', function() {
                d3.select(this).style('fill-opacity', 0.2);
            });
        
        // Points
        doctor.normalized.forEach((value, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = Math.cos(angle) * rScale(value);
            const y = Math.sin(angle) * rScale(value);
            
            svg.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 5)
                .style('fill', doctor.color)
                .style('stroke', 'white')
                .style('stroke-width', '2px')
                .on('mouseover', function(event) {
                    d3.select(this)
                        .attr('r', 7)
                        .style('cursor', 'pointer');
                    
                    showTooltip(event, `<strong>${doctor.nom}</strong><br>${labels[i]}: ${value.toFixed(1)}/100`);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('r', 5);
                    hideTooltip();
                });
        });
    });
    
    // Titre
    svg.append('text')
        .attr('x', 0)
        .attr('y', -height / 2 - 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', '700')
        .style('fill', '#333')
        .text('Radar des Performances');
}

// --- GRAPHIQUE CHRONOLOGIQUE ---
export function createComparisonTimeline(data) {
    const container = d3.select('#comparison-timeline-chart');
    container.selectAll('*').remove();
    
    const fullWidth = 1200;
    const fullHeight = 500;
    const margin = { top: 60, right: 150, bottom: 60, left: 80 };
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    
    const svg = container
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Pour l'instant, afficher un message car nous aurions besoin de données temporelles
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#999')
        .text('Évolution Temporelle - Nécessite des données mensuelles supplémentaires');
    
    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', '700')
        .style('fill', '#333')
        .text('Évolution dans le Temps');
}

// --- UTILITAIRES TOOLTIP ---
function showTooltip(event, content) {
    const tooltip = d3.select('body').selectAll('.tooltip').data([0]);
    
    const tooltipEnter = tooltip.enter()
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '8px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('z-index', '9999')
        .style('opacity', 0);
    
    const tooltipUpdate = tooltip.merge(tooltipEnter);
    
    tooltipUpdate
        .html(content)
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 28}px`)
        .transition()
        .duration(200)
        .style('opacity', 1);
}

function hideTooltip() {
    d3.select('.tooltip')
        .transition()
        .duration(200)
        .style('opacity', 0)
        .remove();
}
