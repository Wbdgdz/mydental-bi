import { checkAuth } from "../utilities/utils.js";

function drawStackedBarChart(data) {
    const svg = d3.select("#stacked-bar-chart");
    // Dimensions Responsive
    const fullWidth = 1200;
    const fullHeight = 600;
    const margin = { top: 40, right: 30, bottom: 80, left: 60 };
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    svg.selectAll("*").remove(); // Nettoyage

    // ViewBox magique
    svg.attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(["rendezvous_meme_mois", "rendezvous_mois_suivants"])
        .range(["#24a148", "#f1c21b"]); // Vert et Jaune "Carbon Design"

    const stackedData = d3.stack().keys(["rendezvous_meme_mois", "rendezvous_mois_suivants"])(data);

    xScale.domain(data.map(d => d.mois_prise));
    yScale.domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])]);

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale))
     .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(yScale))
     .append("text").attr("transform", "rotate(-90)").attr("y", -45).attr("x", -height/2)
     .attr("text-anchor", "middle").attr("fill", "black").text("Nombre de RDV");

    // Barres
    const layers = g.selectAll(".layer").data(stackedData).enter().append("g")
                    .attr("class", "layer").style("fill", d => color(d.key));

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    layers.selectAll("rect").data(d => d).enter().append("rect")
          .attr("x", d => xScale(d.data.mois_prise))
          .attr("y", d => yScale(d[1]))
          .attr("height", d => yScale(d[0]) - yScale(d[1]))
          .attr("width", xScale.bandwidth())
          .on("mouseover", function(event, d) {
              tooltip.transition().duration(200).style("opacity", .9);
              tooltip.html(`Mois: ${d.data.mois_prise}<br/>Même mois: ${d.data.rendezvous_meme_mois}<br/>Suivants: ${d.data.rendezvous_mois_suivants}`)
                     .style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

export function loadStackedBarData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/rendezvous?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        drawStackedBarChart(data.rendezvous_by_month);
    })
    .catch(error => console.error('Erreur:', error));
}