import { checkAuth } from "../utilities/utils.js";

// Fonction pour charger les données avec une période donnée
export function loadVisitsRevenue(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/visits-revenue?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Effacer les anciens éléments SVG
        d3.select("#visits-revenue-chart").selectAll("*").remove();

        // 1. Définition des dimensions RESPONSIVE (Base large)
        const margin = { top: 40, right: 80, bottom: 80, left: 80 };
        const fullWidth = 1200; // Largeur virtuelle augmentée pour éviter le tassement
        const fullHeight = 600;
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;

        // 2. Création du SVG avec viewBox
        const svg = d3.select("#visits-revenue-chart")
            .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .classed("svg-content-responsive", true)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.2);

        const yLeft = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.visit_count)])
            .nice()
            .range([height, 0]);

        const yRight = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.revenue)])
            .nice()
            .range([height, 0]);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0); // Caché par défaut

        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.month))
            .attr("y", d => yLeft(d.visit_count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - yLeft(d.visit_count))
            .attr("fill", "#0f62fe")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`Visites: ${d.visit_count}<br>Revenus: ${d.revenue} €`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", function(event, d) {
                if(typeof updateConsultationsChart === "function") {
                    updateConsultationsChart(d.month);
                }
            });

        const line = d3.line()
            .x(d => x(d.month) + x.bandwidth() / 2)
            .y(d => yRight(d.revenue));

        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line)
            .attr("stroke", "#ff832b")
            .attr("stroke-width", 3)
            .attr("fill", "none");

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

        // Labels des axes
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 20)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Nombre de Visites"); // Traduit en FR

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", width + margin.right - 40)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Revenus (€)");

        // Légende
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 200},${-margin.top + 10})`); // Position ajustée

        const legendData = [
            { label: "Nombre de Visites", color: "#0f62fe" },
            { label: "Revenus (€)", color: "#ff832b" }
        ];

        legend.selectAll("rect")
            .data(legendData)
            .enter().append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 25)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => d.color);

        legend.selectAll("text")
            .data(legendData)
            .enter().append("text")
            .attr("x", 25)
            .attr("y", (d, i) => i * 25 + 14)
            .text(d => d.label)
            .style("font-size", "14px") // Plus grand
            .attr("alignment-baseline", "middle");
    })
    .catch(error => console.error('Erreur:', error));
}