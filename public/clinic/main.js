// clinic/main.js
import { checkAuth,getLastMonthDateRange,getSelectedDateRange} from "../utilities/utils.js";
import {loadStats} from '../clinic/stats.js';
import {loadMedecinsData} from '../clinic/medecinsPerformance.js';
import {loadVisitsRevenue} from '../clinic/visitsRevenue.js';
import {loadWaitingTimes} from '../clinic/waitingTimes.js';
import {loadActesData}  from '../clinic/actesTable.js';
import {loadChartData} from '../clinic/patientVisits.js';
import {loadHourlyRevenueHeatmap} from '../clinic/hourlyRevenueHeatmap.js';
import {loadPatientsHeatmap} from '../clinic/heatmap.js';
import {loadWaitingTimeHeatmap} from '../clinic/heatmap-waiting-time.js';
import {loadStackedBarData} from '../clinic/rendezvous.js';
import {loadRentabiliteData} from '../clinic/rentabiliteCharts.js';
import {initClinicExportButtons} from '../clinic/clinicExport.js';










// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    // --- MODIFICATION ICI : Dates fixes du 01/01/2022 au 31/12/2024 ---
    const startDate = '2022-01-01';
    const endDate = '2024-12-31';

    // Initialiser les champs de date avec les valeurs définies ci-dessus
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    // Vérification de sécurité au cas où l'élément n'existe pas encore
    if (startDateInput) startDateInput.value = startDate;
    if (endDateInput) endDateInput.value = endDate;
    
    // Charger les données pour cette période par défaut
    loadStats(startDate, endDate);
    loadMedecinsData(startDate, endDate);
    loadVisitsRevenue(startDate, endDate);
    loadChartData(startDate, endDate);
    loadHourlyRevenueHeatmap(startDate, endDate);
    loadPatientsHeatmap(startDate, endDate);
    loadActesData(startDate, endDate);
    loadWaitingTimes(startDate, endDate);
    loadWaitingTimeHeatmap(startDate, endDate);
    loadStackedBarData(startDate, endDate);
    loadRentabiliteData(); // Charger les données de rentabilité si disponibles

    // Initialiser les boutons d'export
    initClinicExportButtons();

    // Ajouter un écouteur pour le bouton "Appliquer"
    document.getElementById('apply-period').addEventListener('click', function () {
        const { startDate, endDate } = getSelectedDateRange(); // Cette fonction lit les inputs

        if (startDate && endDate) {
            loadVisitsRevenue(startDate, endDate);
            loadStats(startDate, endDate);
            loadChartData(startDate, endDate);
            loadHourlyRevenueHeatmap(startDate, endDate);
            loadPatientsHeatmap(startDate, endDate);
            loadActesData(startDate, endDate);
            loadMedecinsData(startDate, endDate);
            loadWaitingTimes(startDate, endDate);
            loadWaitingTimeHeatmap(startDate, endDate);
            loadStackedBarData(startDate, endDate);
        } else {
            alert('Veuillez sélectionner les deux dates.');
        }
    });

    // Gestion du menu latéral
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function() {
            sidebar.style.width = sidebar.style.width === '250px' ? '0' : '250px';
            document.body.classList.toggle("with-sidebar");
            this.classList.toggle("open"); // Change l'icône de menu
        });
    }
});