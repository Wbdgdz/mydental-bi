import { checkAuth } from "../utilities/utils.js";

// Fonction pour charger les données du graphique
export function loadChartData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/patient-visits?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Dimensions responsive
        const margin = { top: 40, right: 80, bottom: 80, left: 80 };
        const fullWidth = 1200;
        const fullHeight = 600;
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;

        // Supprimer l'ancien graphique
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

        // Helper pour barres
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

        // Helper pour lignes
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

        // Axes
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yLeft));
        svg.append("g").attr("class", "y-axis").attr("transform", `translate(${width}, 0)`).call(d3.axisRight(yRight));

        // Labels
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

        // Légende (simplifiée)
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
    })
    .catch(error => console.error('Erreur:', error));
}