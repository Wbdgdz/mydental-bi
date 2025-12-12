// Gestion des exports pour le tableau de bord clinique
import { exportPageToPDF, exportMultipleTablestoExcel } from '../utilities/exportUtils.js';

// Export PDF
export function exportClinicDashboardToPDF() {
    // Récupérer les statistiques
    const statsCards = [
        { label: 'Nombre de patients', value: document.getElementById('total_patients')?.textContent || 'N/A' },
        { label: 'Total des visites', value: document.getElementById('total_visits')?.textContent || 'N/A' },
        { label: 'Total de revenus', value: document.getElementById('total_revenue')?.textContent || 'N/A' },
        { label: 'Heures travaillées', value: document.getElementById('total_hours_worked')?.textContent || 'N/A' },
        { label: 'CA par heure', value: document.getElementById('revenue_per_hour')?.textContent || 'N/A' },
        { label: 'Temps patient moyen', value: document.getElementById('avg_patient_time')?.textContent || 'N/A' },
        { label: 'Temps d\'attente moyen', value: document.getElementById('avg_waiting_time')?.textContent || 'N/A' }
    ];
    
    // Récupérer la période
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    const subtitle = startDate && endDate ? `Période: ${startDate} au ${endDate}` : 'Toutes périodes';
    
    // Récupérer les tableaux
    const tables = [
        { 
            title: 'Detail des Actes', 
            element: document.getElementById('actes-table')
        },
        { 
            title: 'Performance des Medecins', 
            element: document.getElementById('medecins-table')
        }
    ];
    
    exportPageToPDF({
        title: 'Tableau de Bord Clinique',
        subtitle: subtitle,
        statsCards: statsCards,
        tables: tables,
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
