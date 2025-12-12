// Gestion des exports pour le tableau de bord clinique
import { exportPageToPDF, exportMultipleTablestoExcel } from '../utilities/exportUtils.js';

// Export PDF
export async function exportClinicDashboardToPDF() {
    // Récupérer les statistiques
    const statsCards = [
        { label: 'Nombre de patients', value: document.getElementById('total_patients')?.textContent || 'N/A' },
        { label: 'Nombre de visites', value: document.getElementById('total-visits')?.textContent || 'N/A' },
        { label: 'Chiffre d\'affaires', value: document.getElementById('CA')?.textContent || 'N/A' },
        { label: 'CA par Heure', value: document.getElementById('CA_Per_hour')?.textContent || 'N/A' },
        { label: 'Nouveaux patients', value: document.getElementById('new-patients')?.textContent || 'N/A' },
        { label: 'Patients fidèles', value: document.getElementById('loyal-patients')?.textContent || 'N/A' },
        { label: 'Temps d\'attente moyen', value: document.getElementById('avg-waiting-time')?.textContent || 'N/A' }
    ];
    
    // Récupérer la période
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    const subtitle = startDate && endDate ? `Période: ${startDate} au ${endDate}` : 'Toutes périodes';
    
    // Récupérer les tableaux
    const tables = [
        { 
            title: 'Détail des Actes', 
            element: document.getElementById('actes-table')
        },
        { 
            title: 'Performance des Médecins', 
            element: document.getElementById('medecins-table')
        }
    ];
    
    // Récupérer les graphiques principaux
    const charts = [
        {
            title: 'Analyse Visites & Revenus par Mois',
            svgId: 'visits-revenue-chart'
        },
        {
            title: 'Évolution des Patients Fidèles',
            svgId: 'patient-visits-chart'
        },
        {
            title: 'Temps d\'Attente Moyen par Mois',
            svgId: 'waiting-time-monthly-chart'
        }
    ];
    
    await exportPageToPDF({
        title: 'Tableau de Bord Clinique',
        subtitle: subtitle,
        statsCards: statsCards,
        tables: tables,
        charts: charts,
        filename: `tableau-bord-clinique-${new Date().toISOString().split('T')[0]}`
    });
}

// Export Excel
export function exportClinicDashboardToExcel() {
    const tables = [];
    
    const actesTable = document.getElementById('actes-table');
    if (actesTable) {
        tables.push({ element: actesTable, sheetName: 'Actes' });
    }
    
    const medecinsTable = document.getElementById('medecins-table');
    if (medecinsTable) {
        tables.push({ element: medecinsTable, sheetName: 'Médecins' });
    }
    
    if (tables.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    exportMultipleTablestoExcel(tables, `tableau-bord-clinique-${new Date().toISOString().split('T')[0]}`);
}

// Initialiser les boutons d'export
export function initClinicExportButtons() {
    const pdfBtn = document.getElementById('export-pdf-btn');
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportClinicDashboardToPDF);
    }
}
