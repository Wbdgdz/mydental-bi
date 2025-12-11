import { checkAuth } from "../utilities/utils.js";

// Vérifier l'authentification
checkAuth();
const token = localStorage.getItem('token');

// Dates fixes: du 1er janvier 2015 à aujourd'hui
const START_DATE = '2015-01-01';
const getEndDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// Tooltip global unique pour tous les graphiques
let globalTooltip = d3.select("body").select(".tooltip");
if (globalTooltip.empty()) {
    globalTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
}

// Fonction pour charger les indicateurs globaux
async function loadGlobalIndicators(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-flow/global-flow-indicators?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        document.getElementById('total-patients').textContent = data.total_patients || 0;
        document.getElementById('avg-visits-per-day').textContent = data.avg_visits_per_day || 0;
        document.getElementById('peak-hour').textContent = data.peak_hour ? `${data.peak_hour}h` : '-';
        document.getElementById('peak-day-visits').textContent = data.peak_day_visits || 0;
    } catch (error) {
        console.error('Erreur lors du chargement des indicateurs globaux:', error);
    }
}

// Fonction pour charger et afficher l'évolution mensuelle
async function loadMonthlyPatientCount(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-flow/monthly-patient-count?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        createMonthlyPatientChart(data);
    } catch (error) {
        console.error('Erreur lors du chargement du nombre de patients par mois:', error);
    }
}

// Fonction pour créer le graphique mensuel
function createMonthlyPatientChart(data) {
    const margin = { top: 40, right: 100, bottom: 80, left: 80 };
    const fullWidth = 1200;
    const fullHeight = 500;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Supprimer l'ancien graphique
    d3.select("#monthly-patient-chart").selectAll("*").remove();

    const svg = d3.select("#monthly-patient-chart")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Échelles
    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const yLeft = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.unique_patients, d.total_visits))])
        .nice()
        .range([height, 0]);

    const yRight = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avg_visits_per_patient)])
        .nice()
        .range([height, 0]);

    // Barres pour les patients uniques
    svg.selectAll(".bar-patients")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar-patients")
        .attr("x", d => x(d.month))
        .attr("y", d => yLeft(d.unique_patients))
        .attr("width", x.bandwidth() / 2)
        .attr("height", d => height - yLeft(d.unique_patients))
        .attr("fill", "#667eea")
        .on("mouseover", function(event, d) {
            globalTooltip.transition().duration(200).style("opacity", .9);
            globalTooltip.html(`Patients uniques: ${d.unique_patients}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            globalTooltip.transition().duration(500).style("opacity", 0);
        });

    // Barres pour le total des visites
    svg.selectAll(".bar-visits")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar-visits")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => yLeft(d.total_visits))
        .attr("width", x.bandwidth() / 2)
        .attr("height", d => height - yLeft(d.total_visits))
        .attr("fill", "#764ba2")
        .on("mouseover", function(event, d) {
            globalTooltip.transition().duration(200).style("opacity", .9);
            globalTooltip.html(`Total visites: ${d.total_visits}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            globalTooltip.transition().duration(500).style("opacity", 0);
        });

    // Ligne pour la moyenne de visites par patient
    const line = d3.line()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y(d => yRight(d.avg_visits_per_patient));

    svg.append("path")
        .datum(data)
        .attr("class", "line-avg")
        .attr("d", line)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3)
        .attr("fill", "none");

    // Points sur la ligne
    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.month) + x.bandwidth() / 2)
        .attr("cy", d => yRight(d.avg_visits_per_patient))
        .attr("r", 4)
        .attr("fill", "#e74c3c")
        .on("mouseover", function(event, d) {
            globalTooltip.transition().duration(200).style("opacity", .9);
            globalTooltip.html(`Moy. visites/patient: ${d.avg_visits_per_patient}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            globalTooltip.transition().duration(500).style("opacity", 0);
        });

    // Axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yLeft));

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yRight));

    // Labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Nombre de Patients / Visites");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", width + margin.right - 40)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Moyenne Visites/Patient");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Mois");

    // Légende
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 200}, 0)`);

    const legendData = [
        { label: "Patients uniques", color: "#667eea" },
        { label: "Total visites", color: "#764ba2" },
        { label: "Moy. visites/patient", color: "#e74c3c" }
    ];

    legend.selectAll("rect")
        .data(legendData.filter(d => d.color !== "#e74c3c"))
        .enter().append("rect")
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    legend.selectAll("line")
        .data(legendData.filter(d => d.color === "#e74c3c"))
        .enter().append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 50 + 10)
        .attr("y2", 50 + 10)
        .attr("stroke", d => d.color)
        .attr("stroke-width", 3);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 25)
        .attr("y", (d, i) => i * 25 + 15)
        .text(d => d.label)
        .style("font-size", "14px");
}

// Fonction pour charger et afficher la heatmap des périodes de forte affluence
async function loadPeakPeriods(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-flow/peak-periods?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        createPeakPeriodsHeatmap(data);
    } catch (error) {
        console.error('Erreur lors du chargement des périodes de forte affluence:', error);
    }
}

// Fonction pour créer la heatmap
function createPeakPeriodsHeatmap(data) {
    const margin = { top: 100, right: 80, bottom: 80, left: 120 };
    const cellSize = 50;
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const hours = [...new Set(data.map(d => d.hour_of_day))].sort((a, b) => a - b);

    const fullWidth = margin.left + margin.right + hours.length * cellSize;
    const fullHeight = margin.top + margin.bottom + days.length * cellSize;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Supprimer l'ancien graphique
    d3.select("#peak-periods-heatmap").selectAll("*").remove();

    const svg = d3.select("#peak-periods-heatmap")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Échelle de couleur
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(data, d => d.total_visits)])
        .interpolator(d3.interpolateYlOrRd);

    // Créer une map pour un accès rapide
    const dataMap = new Map();
    data.forEach(d => {
        const key = `${d.day_of_week}-${d.hour_of_day}`;
        dataMap.set(key, d);
    });

    // Créer les cellules
    days.forEach((day, dayIndex) => {
        hours.forEach((hour, hourIndex) => {
            const dayOfWeek = dayIndex + 2; // Ajuster pour correspondre à MySQL DAYOFWEEK
            const key = `${dayOfWeek > 7 ? 1 : dayOfWeek}-${hour}`;
            const cellData = dataMap.get(key);
            const value = cellData ? cellData.total_visits : 0;

            svg.append("rect")
                .attr("x", hourIndex * cellSize)
                .attr("y", dayIndex * cellSize)
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("fill", value > 0 ? colorScale(value) : "#f0f0f0")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .on("mouseover", function(event) {
                    globalTooltip.transition().duration(200).style("opacity", .9);
                    globalTooltip.html(`${day} - ${hour}h<br/>Visites: ${value}<br/>Patients: ${cellData ? cellData.unique_patients : 0}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    globalTooltip.transition().duration(500).style("opacity", 0);
                });

            // Ajouter le texte de la valeur
            if (value > 0) {
                svg.append("text")
                    .attr("x", hourIndex * cellSize + cellSize / 2)
                    .attr("y", dayIndex * cellSize + cellSize / 2)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", "12px")
                    .style("fill", value > d3.max(data, d => d.total_visits) / 2 ? "white" : "black")
                    .text(value);
            }
        });
    });

    // Axe X (heures)
    svg.selectAll(".hour-label")
        .data(hours)
        .enter().append("text")
        .attr("class", "hour-label")
        .attr("x", (d, i) => i * cellSize + cellSize / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => `${d}h`);

    // Axe Y (jours)
    svg.selectAll(".day-label")
        .data(days)
        .enter().append("text")
        .attr("class", "day-label")
        .attr("x", -10)
        .attr("y", (d, i) => i * cellSize + cellSize / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .text(d => d);

    // Légende
    const legendWidth = 300;
    const legendHeight = 20;
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - legendWidth / 2}, ${height + 40})`);

    const legendScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_visits)])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".0f"));

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient");

    linearGradient.selectAll("stop")
        .data(d3.range(0, 1.1, 0.1))
        .enter().append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(d * d3.max(data, dt => dt.total_visits)));

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    legend.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Nombre de visites");
}

// Fonction pour charger et afficher le tableau de capacité
async function loadDoctorCapacity(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-flow/doctor-capacity?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const tbody = document.querySelector('#doctor-capacity-table tbody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Aucune donnée disponible</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(row => {
            let statusClass = '';
            if (row.utilization_status === 'Faible utilisation') {
                statusClass = 'status-low';
            } else if (row.utilization_status === 'Utilisation normale') {
                statusClass = 'status-normal';
            } else {
                statusClass = 'status-high';
            }

            return `
                <tr>
                    <td><strong>${row.doctor_name}</strong></td>
                    <td>${row.total_consultations}</td>
                    <td>${row.working_days}</td>
                    <td>${row.total_hours}</td>
                    <td>${row.avg_hours_per_day}</td>
                    <td>${row.avg_consultations_per_day}</td>
                    <td><strong>${row.estimated_daily_capacity}</strong></td>
                    <td class="${statusClass}">${row.utilization_status}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Erreur lors du chargement de la capacité par médecin:', error);
    }
}

// Fonction pour charger toutes les données
function loadAllData() {
    const startDate = START_DATE;
    const endDate = getEndDate();

    loadGlobalIndicators(startDate, endDate);
    loadMonthlyPatientCount(startDate, endDate);
    loadPeakPeriods(startDate, endDate);
    loadDoctorCapacity(startDate, endDate);
}

// Event listeners
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});

// Charger les données au chargement de la page
loadAllData();
