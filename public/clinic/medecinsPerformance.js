import { checkAuth, calculatePeriodMonths} from "../utilities/utils.js";

// Fonction pour charger et afficher les données
export function loadMedecinsData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');

    fetch(`/api/medecins?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Remplir le tableau HTML
        const tableBody = document.querySelector('#medecins-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            data.forEach(d => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${d.lastName} ${d.firstName}</td>
                    <td class="text-right">${d.Consultations}</td>
                    <td class="text-right">${d.Montant} €</td> 
                    <td class="text-right">${d.cout_par_consultation} €</td>
                    <td class="text-right">${d.total_hours} h</td>
                    <td class="text-right">${d.tarif_par_heure} €</td>
                `;
                tableBody.appendChild(row);
            });
        }

        const periodMonths = calculatePeriodMonths(startDate, endDate);
        generateGraph(data, periodMonths);
    })
    .catch(error => console.error('Erreur:', error));
}

// Fonction pour générer le graphique
function generateGraph(data, periodMonths) {
    data.sort((a, b) => b.total_hours - a.total_hours);

    // Dimensions avec viewBox pour responsive
    const fullWidth = 1200;
    const fullHeight = 500;
    const margin = {top: 40, right: 80, bottom: 100, left: 80}; // Marge du bas augmentée pour les noms
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Sélection et configuration du SVG
    const svg = d3.select('#tarif-heure-chart');
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const yMax = 2 * periodMonths * 45; 
    const x = d3.scaleBand().domain(data.map(d => `${d.lastName} ${d.firstName}`)).range([0, width]).padding(0.2);
    const yLeft = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);
    const yRight = d3.scaleLinear().domain([0, d3.max(data, d => d.tarif_par_heure)]).nice().range([height, 0]);

    const tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

    // Barres
    g.selectAll('.bar-hours')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar-hours')
        .attr('x', d => x(`${d.lastName} ${d.firstName}`))
        .attr('y', d => yLeft(d.total_hours))
        .attr('width', x.bandwidth())
        .attr('height', d => height - yLeft(d.total_hours))
        .attr('fill', '#0f62fe') // Bleu IBM
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(`${d.total_hours} heures`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 20) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ligne Tarif
    const line = d3.line()
        .x(d => x(`${d.lastName} ${d.firstName}`) + x.bandwidth() / 2)
        .y(d => yRight(d.tarif_par_heure));

    g.append('path')
        .datum(data)
        .attr('class', 'line-tarif')
        .attr('fill', 'none')
        .attr('stroke', '#ff832b') // Orange
        .attr('stroke-width', 3)
        .attr('d', line);

    // Ligne moyenne
    const adjustedHours = 45 * periodMonths;
    g.append('line')
        .attr('x1', 0).attr('x2', width)
        .attr('y1', yLeft(adjustedHours)).attr('y2', yLeft(adjustedHours))
        .attr('stroke', '#da1e28').attr('stroke-width', 2).attr('stroke-dasharray', '4');

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .style('text-anchor', 'end')
        .style('font-size', '12px');

    g.append('g').call(d3.axisLeft(yLeft))
        .append('text').attr('fill', '#000').attr('x', 5).attr('y', -10).text('Heures');

    g.append('g').attr('transform', `translate(${width},0)`).call(d3.axisRight(yRight))
        .append('text').attr('fill', '#000').attr('x', -5).attr('y', -10).attr('text-anchor', 'end').text('Tarif/Heure (€)');
}