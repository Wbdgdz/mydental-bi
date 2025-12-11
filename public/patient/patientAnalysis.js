import { checkAuth } from "../utilities/utils.js";

// Vérifier l'authentification
checkAuth();
const token = localStorage.getItem('token');

// Dates par défaut
const today = new Date();
const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

document.getElementById('start-date').valueAsDate = oneYearAgo;
document.getElementById('end-date').valueAsDate = today;

// Fonction pour formater les dates
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Fonction pour charger les indicateurs globaux
async function loadGlobalIndicators(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-analysis/global-indicators?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        document.getElementById('total-patients').textContent = data.total_patients || 0;
        document.getElementById('new-patients').textContent = data.new_patients || 0;
        document.getElementById('returning-patients').textContent = data.returning_patients || 0;
        document.getElementById('retention-rate').textContent = (data.retention_rate || 0) + '%';
        document.getElementById('new-patients-returned').textContent = data.new_patients_returned || 0;
        document.getElementById('avg-visits-per-patient').textContent = data.avg_visits_per_patient || 0;
        document.getElementById('single-visit-patients').textContent = data.single_visit_patients || 0;
        document.getElementById('multi-visit-patients').textContent = data.multi_visit_patients || 0;
    } catch (error) {
        console.error('Erreur lors du chargement des indicateurs globaux:', error);
    }
}

// Fonction pour charger et afficher l'évolution mensuelle
async function loadMonthlyEvolution(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-analysis/monthly-evolution?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        // Mettre à jour le tableau
        const tbody = document.querySelector('#monthly-table tbody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune donnée disponible</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(row => `
            <tr>
                <td><strong>${row.month}</strong></td>
                <td>${row.total_patients}</td>
                <td style="color: #27ae60;">${row.new_patients}</td>
                <td style="color: #3498db;">${row.returning_patients}</td>
                <td>${row.total_visits}</td>
                <td><strong>${row.avg_visits_per_patient}</strong></td>
            </tr>
        `).join('');

        // Créer le graphique
        createMonthlyEvolutionChart(data);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'évolution mensuelle:', error);
    }
}

// Fonction pour créer le graphique d'évolution mensuelle
function createMonthlyEvolutionChart(data) {
    const margin = { top: 40, right: 100, bottom: 80, left: 80 };
    const fullWidth = 1200;
    const fullHeight = 500;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Supprimer l'ancien graphique
    d3.select("#monthly-evolution-chart").selectAll("*").remove();

    const svg = d3.select("#monthly-evolution-chart")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Échelles
    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.new_patients, d.returning_patients, d.total_patients))])
        .nice()
        .range([height, 0]);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Barres pour nouveaux patients
    svg.selectAll(".bar-new")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar-new")
        .attr("x", d => x(d.month))
        .attr("y", d => y(d.new_patients))
        .attr("width", x.bandwidth() / 2)
        .attr("height", d => height - y(d.new_patients))
        .attr("fill", "#27ae60")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Nouveaux patients: ${d.new_patients}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Barres pour patients fidèles
    svg.selectAll(".bar-returning")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar-returning")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => y(d.returning_patients))
        .attr("width", x.bandwidth() / 2)
        .attr("height", d => height - y(d.returning_patients))
        .attr("fill", "#3498db")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Patients fidèles: ${d.returning_patients}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Ligne pour le total
    const line = d3.line()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y(d => y(d.total_patients));

    svg.append("path")
        .datum(data)
        .attr("class", "line-total")
        .attr("d", line)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3)
        .attr("fill", "none");

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
        .call(d3.axisLeft(y));

    // Labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Nombre de Patients");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Mois");

    // Légende
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, 0)`);

    const legendData = [
        { label: "Nouveaux", color: "#27ae60" },
        { label: "Fidèles", color: "#3498db" },
        { label: "Total", color: "#e74c3c" }
    ];

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 25)
        .attr("y", (d, i) => i * 25 + 15)
        .text(d => d.label)
        .style("font-size", "14px");
}

// Fonction pour charger et afficher l'analyse de rétention
async function loadRetentionAnalysis(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-analysis/retention-analysis?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        createRetentionChart(data);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'analyse de rétention:', error);
    }
}

// Fonction pour créer le graphique de rétention
function createRetentionChart(data) {
    const margin = { top: 40, right: 100, bottom: 80, left: 80 };
    const fullWidth = 1200;
    const fullHeight = 400;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Supprimer l'ancien graphique
    d3.select("#retention-analysis-chart").selectAll("*").remove();

    const svg = d3.select("#retention-analysis-chart")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Échelles
    const x = d3.scaleBand()
        .domain(data.map(d => d.visit_category))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.patient_count)])
        .nice()
        .range([height, 0]);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Barres
    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.visit_category))
        .attr("y", d => y(d.patient_count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.patient_count))
        .attr("fill", (d, i) => d3.schemeCategory10[i])
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d.visit_category}<br/>Patients: ${d.patient_count}<br/>Pourcentage: ${d.percentage}%`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Labels sur les barres
    svg.selectAll(".bar-label")
        .data(data)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.visit_category) + x.bandwidth() / 2)
        .attr("y", d => y(d.patient_count) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => `${d.percentage}%`);

    // Axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Nombre de Patients");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .style("text-anchor", "middle")
        .text("Catégorie de Visites");
}

// Fonction pour charger les données de patientVisitsRoute (indicateurs existants)
async function loadPatientVisitsData(startDate, endDate) {
    try {
        const response = await fetch(`/api/patient-visits?startDate=${startDate}&endDate=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        createPatientVisitsChart(data);
    } catch (error) {
        console.error('Erreur lors du chargement des données de visites:', error);
    }
}

// Fonction pour créer le graphique des visites patient (réutilisation du code existant)
function createPatientVisitsChart(data) {
    const margin = { top: 40, right: 80, bottom: 80, left: 80 };
    const fullWidth = 1200;
    const fullHeight = 500;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    d3.select("#patient-visits-chart").selectAll("*").remove();

    const svg = d3.select("#patient-visits-chart")
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const yLeft = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.new_patient_count, d.retained_patient_count, d.never_returned_patient_count))])
        .nice()
        .range([height, 0]);

    const yRight = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.cumulative_new_patient_count, d.cumulative_retained_patient_count, d.cumulative_never_returned_patient_count))])
        .nice()
        .range([height, 0]);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function createBars(className, key, color, offsetIndex, label) {
        svg.selectAll(`.${className}`)
            .data(data)
            .enter().append("rect")
            .attr("class", className)
            .attr("x", d => x(d.month) + offsetIndex * (x.bandwidth() / 3))
            .attr("y", d => yLeft(d[key]))
            .attr("width", x.bandwidth() / 3)
            .attr("height", d => height - yLeft(d[key]))
            .attr("fill", color)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`${label} : ${d[key]}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            });
    }

    createBars("bar-new-patients", "new_patient_count", "#1F77B4", 0, "Nouveaux");
    createBars("bar-retained-patients", "retained_patient_count", "#2CA02C", 1, "Retenus");
    createBars("bar-never-returned", "never_returned_patient_count", "#D62728", 2, "Jamais revenus");

    function createLine(className, key, color) {
        const lineGen = d3.line()
            .x(d => x(d.month) + x.bandwidth() / 2)
            .y(d => yRight(d[key]));

        svg.append("path")
            .datum(data)
            .attr("class", className)
            .attr("d", lineGen)
            .attr("stroke", color)
            .attr("stroke-width", 3)
            .attr("fill", "none");
    }

    createLine("line-new-patients", "cumulative_new_patient_count", "#9467BD");
    createLine("line-retained-patients", "cumulative_retained_patient_count", "#FF7F0E");
    createLine("line-never-returned", "cumulative_never_returned_patient_count", "#8C564B");

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yLeft));
    svg.append("g").attr("class", "y-axis").attr("transform", `translate(${width}, 0)`).call(d3.axisRight(yRight));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Nombre de Patients");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", width + margin.right - 40)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Cumul des Patients");

    const legend = svg.append("g").attr("transform", `translate(${width - 250},${-margin.top + 10})`);
    const legendData = [
        { label: "Nouveaux", color: "#1F77B4" },
        { label: "Retenus", color: "#2CA02C" },
        { label: "Non-revenus", color: "#D62728" }
    ];

    legend.selectAll("rect").data(legendData).enter().append("rect")
        .attr("y", (d, i) => i * 20).attr("width", 15).attr("height", 15).attr("fill", d => d.color);
    legend.selectAll("text").data(legendData).enter().append("text")
        .attr("x", 20).attr("y", (d, i) => i * 20 + 12).text(d => d.label).style("font-size", "12px");
}

// Fonction pour charger toutes les données
function loadAllData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('Veuillez sélectionner les dates de début et de fin');
        return;
    }

    loadGlobalIndicators(startDate, endDate);
    loadMonthlyEvolution(startDate, endDate);
    loadRetentionAnalysis(startDate, endDate);
    loadPatientVisitsData(startDate, endDate);
}

// Event listeners
document.getElementById('apply-period').addEventListener('click', loadAllData);

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});

// Charger les données au chargement de la page
loadAllData();
