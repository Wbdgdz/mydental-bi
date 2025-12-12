// Module utilitaire pour les exports PDF et Excel

/**
 * Exporte les statistiques d'une page en PDF
 * @param {Object} config - Configuration de l'export
 * @param {string} config.title - Titre du document
 * @param {string} config.subtitle - Sous-titre (période, médecin, etc.)
 * @param {Array} config.statsCards - Cartes de statistiques [{label: string, value: string}]
 * @param {Array} config.tables - Tableaux à inclure [{title: string, element: HTMLElement}]
 * @param {string} config.filename - Nom du fichier (sans extension)
 */
export function exportPageToPDF(config) {
    // Vérifier si jsPDF est chargé
    if (typeof window.jspdf === 'undefined') {
        alert('La bibliothèque jsPDF n\'est pas chargée.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;
    const margin = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * margin);
    
    // En-tête principal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 98, 254);
    doc.text(config.title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Sous-titre
    if (config.subtitle) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(config.subtitle, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
    }
    
    // Ligne séparatrice
    doc.setLineWidth(0.5);
    doc.setDrawColor(15, 98, 254);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // Section: Statistiques principales
    if (config.statsCards && config.statsCards.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Indicateurs Principaux', margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const cardsPerRow = 2;
        const cardWidth = (contentWidth - 10) / cardsPerRow;
        const cardHeight = 20;
        
        config.statsCards.forEach((card, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);
            const x = margin + (col * (cardWidth + 10));
            const y = yPosition + (row * (cardHeight + 5));
            
            // Vérifier si on doit changer de page
            if (y + cardHeight > 270) {
                doc.addPage();
                yPosition = 20;
                return;
            }
            
            // Fond de la carte
            doc.setFillColor(245, 247, 250);
            doc.roundedRect(x, y - 5, cardWidth, cardHeight, 2, 2, 'F');
            
            // Label
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(card.label, x + 3, y);
            
            // Valeur
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 98, 254);
            doc.text(String(card.value), x + 3, y + 8);
            doc.setFont('helvetica', 'normal');
        });
        
        yPosition += Math.ceil(config.statsCards.length / cardsPerRow) * (cardHeight + 5) + 10;
    }
    
    // Section: Tableaux
    if (config.tables && config.tables.length > 0) {
        config.tables.forEach((tableConfig, tableIndex) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(tableConfig.title, margin, yPosition);
            yPosition += 8;
            
            const table = tableConfig.element;
            if (!table) return;
            
            // Extraire les en-têtes
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            
            // Limiter le nombre de colonnes si trop large
            const maxCols = Math.min(headers.length, 6);
            const colWidth = contentWidth / maxCols;
            
            // En-têtes du tableau
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPosition - 5, contentWidth, 7, 'F');
            
            headers.slice(0, maxCols).forEach((header, i) => {
                const text = header.length > 20 ? header.substring(0, 17) + '...' : header;
                doc.text(text, margin + (i * colWidth) + 2, yPosition);
            });
            yPosition += 8;
            
            // Lignes de données
            doc.setFont('helvetica', 'normal');
            rows.slice(0, 30).forEach((row, rowIndex) => { // Limiter à 30 lignes
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
                
                // Alternance de couleur
                if (rowIndex % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(margin, yPosition - 4, contentWidth, 6, 'F');
                }
                
                cells.slice(0, maxCols).forEach((cell, i) => {
                    const text = cell.length > 20 ? cell.substring(0, 17) + '...' : cell;
                    doc.text(text, margin + (i * colWidth) + 2, yPosition);
                });
                yPosition += 6;
            });
            
            yPosition += 10;
        });
    }
    
    // Pied de page sur toutes les pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, 287, { align: 'center' });
        doc.text(`MyDental BI - Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 292, { align: 'center' });
    }
    
    // Sauvegarder
    const filename = config.filename || `export-${new Date().toISOString().split('T')[0]}`;
    doc.save(`${filename}.pdf`);
}

/**
 * Exporte un tableau HTML en Excel
 * @param {HTMLElement} tableElement - Élément table à exporter
 * @param {string} sheetName - Nom de la feuille
 * @param {string} filename - Nom du fichier (sans extension)
 */
export function exportTableToExcel(tableElement, sheetName = 'Données', filename = 'export') {
    // Vérifier si SheetJS est chargé
    if (typeof XLSX === 'undefined') {
        alert('La bibliothèque SheetJS n\'est pas chargée.');
        return;
    }
    
    if (!tableElement) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    // Créer un workbook
    const wb = XLSX.utils.book_new();
    
    // Convertir le tableau HTML en feuille
    const ws = XLSX.utils.table_to_sheet(tableElement);
    
    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Sauvegarder le fichier
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exporte plusieurs tableaux dans un fichier Excel (plusieurs feuilles)
 * @param {Array} tables - [{element: HTMLElement, sheetName: string}]
 * @param {string} filename - Nom du fichier
 */
export function exportMultipleTablestoExcel(tables, filename = 'export') {
    if (typeof XLSX === 'undefined') {
        alert('La bibliothèque SheetJS n\'est pas chargée.');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    tables.forEach(({element, sheetName}) => {
        if (element) {
            const ws = XLSX.utils.table_to_sheet(element);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    });
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
