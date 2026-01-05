import { checkAuth } from "../utilities/utils.js";

export function loadWaitingTimes(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/waiting-times?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawMonthlyWaitingTimeChart(data.avg_waiting_time_by_month);
        drawDoctorWaitingTimeChart(data.avg_waiting_time_by_doctor);
    })
    .catch(error => console.error('Erreur:', error));
}

// Graphique 1 : Temps d'attente par mois
function drawMonthlyWaitingTimeChart(monthlyData) {
    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const fullWidth = 1200;
    const fullHeight = 500;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    const svg = d3.select("#waiting-time-monthly-chart");
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    xScale.domain(monthlyData.map(d => d.month));
    yScale.domain([0, 120]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale))
     .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(yScale).ticks(10));

    // Label Y
    g.append("text").attr("transform", "rotate(-90)").attr("y", -45).attr("x", -height / 2)
     .attr("text-anchor", "middle").text("Minutes");

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    g.selectAll(".bar")
     .data(monthlyData).enter().append("rect")
     .attr("class", "bar")
     .attr("x", d => xScale(d.month)).attr("y", d => yScale(d.avg_waiting_time))
     .attr("width", xScale.bandwidth()).attr("height", d => height - yScale(d.avg_waiting_time))
     .attr("fill", "#0f62fe")
     .on("mouseover", function(event, d) {
         tooltip.transition().duration(200).style("opacity", .9);
         tooltip.html(`${d.avg_waiting_time} min`).style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    // Seuils
    const thresholds = [{ v: 30, c: "green" }, { v: 45, c: "orange" }, { v: 60, c: "red" }];
    thresholds.forEach(t => {
        g.append("line").attr("x1", 0).attr("x2", width).attr("y1", yScale(t.v)).attr("y2", yScale(t.v))
         .attr("stroke", t.c).attr("stroke-width", 2).attr("stroke-dasharray", "4");
    });
}

// Graphique 2 : Temps d'attente par médecin
function drawDoctorWaitingTimeChart(doctorsData) {
    const margin = { top: 30, right: 30, bottom: 100, left: 60 };
    const fullWidth = 1200;
    const fullHeight = 500;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    const svg = d3.select("#waiting-time-doctors-chart");
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");
    
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    xScale.domain(doctorsData.map(d => d.doctor_name));
    yScale.domain([0, 120]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale))
     .selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(yScale));

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    g.selectAll(".bar")
        .data(doctorsData).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.doctor_name)).attr("y", d => yScale(d.avg_waiting_time_per_doctor))
        .attr("width", xScale.bandwidth()).attr("height", d => height - yScale(d.avg_waiting_time_per_doctor))
        .attr("fill", "#0f62fe")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d.avg_waiting_time_per_doctor} min`).style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}