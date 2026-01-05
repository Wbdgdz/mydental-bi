// Gestion des exports pour la performance individuelle des médecins
import { exportPageToPDF, exportTableToExcel } from '../utilities/exportUtils.js';

// Export PDF pour la performance individuelle
export async function exportIndividualPerformanceToPDF() {
    // Récupérer le médecin sélectionné
    const doctorSelect = document.getElementById('doctor-select');
    const doctorName = doctorSelect.options[doctorSelect.selectedIndex]?.text || 'Médecin';
    
    // Récupérer les statistiques
    const statsCards = [
        { label: 'Patients uniques', value: document.getElementById('unique-patients')?.textContent || 'N/A' },
        { label: 'Visites', value: document.getElementById('total-visits')?.textContent || 'N/A' },
        { label: 'Patients (sans retour)', value: document.getElementById('patients-premiere-visite-pas-retour')?.textContent || 'N/A' },
        { label: 'Nouveaux patients', value: document.getElementById('new-patients')?.textContent || 'N/A' },
        { label: 'Visites (Nouveaux patients)', value: document.getElementById('visits-generated-by-new-patients')?.textContent || 'N/A' },
        { label: 'Patients (1ère visite clinique)', value: document.getElementById('patients-premiere-visite')?.textContent || 'N/A' },
        { label: 'Patients fidèles', value: document.getElementById('loyal-patients')?.textContent || 'N/A' },
        { label: 'Visites de suivi', value: document.getElementById('follow-up-visits')?.textContent || 'N/A' },
        { label: 'Total des revenus', value: document.getElementById('total-revenue-consultations')?.textContent || 'N/A' },
        { label: 'Heures patient', value: document.getElementById('total-hours-worked')?.textContent || 'N/A' },
        { label: 'CA par heure', value: document.getElementById('revenue-per-hour')?.textContent || 'N/A' },
        { label: 'Temps Patient moyen', value: document.getElementById('hours-worked')?.textContent || 'N/A' },
        { label: 'Temps d\'attente moyen', value: document.getElementById('avg-waiting-time')?.textContent || 'N/A' }
    ];
    
    // Récupérer la période
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    const subtitle = `${doctorName} | Période: ${startDate} au ${endDate}`;
    
    // Récupérer le tableau des actes
    const tables = [
        { 
            title: 'Détail des Actes Effectués', 
            element: document.getElementById('actes-table')
        }
    ];
    
    // Récupérer les graphiques principaux
    const charts = [
        {
            title: 'Analyse Visites vs Revenus',
            svgId: 'visits-revenue-chart'
        },
        {
            title: 'Fidélité des Patients',
            svgId: 'patients-chart'
        },
        {
            title: 'Temps de Travail',
            svgId: 'work-time-chart'
        }
    ];
    
    await exportPageToPDF({
        title: 'Performance Médecin',
        subtitle: subtitle,
        statsCards: statsCards,
        tables: tables,
        charts: charts,
        filename: `performance-${doctorName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`
    });
}

// Export Excel pour la performance individuelle
export function exportIndividualPerformanceToExcel() {
    const actesTable = document.getElementById('actes-table');
    if (!actesTable) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    const doctorSelect = document.getElementById('doctor-select');
    const doctorName = doctorSelect.options[doctorSelect.selectedIndex]?.text || 'Médecin';
    
    exportTableToExcel(
        actesTable, 
        'Actes', 
        `performance-${doctorName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`
    );
}

// Initialiser les boutons d'export pour la performance individuelle
export function initIndividualPerformanceExportButtons() {
    const pdfBtn = document.getElementById('export-individual-pdf-btn');
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportIndividualPerformanceToPDF);
    }
}
