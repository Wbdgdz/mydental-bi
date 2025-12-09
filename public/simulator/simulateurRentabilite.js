// simulateurRentabilite.js - Gestion du simulateur de rentabilité

import { getDateRange, getLastMonthDateRange } from '../utilities/utils.js';

let currentData = null;

// Fonction pour formater les nombres avec séparateur de milliers
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num);
}

// Fonction pour mettre à jour le résumé des paramètres
function updateParamsSummary(remunerationMedecin, coutCentre, margeCible) {
    const margeActuelle = 100 - remunerationMedecin - coutCentre;
    
    document.getElementById('summary-rem-med').textContent = `${remunerationMedecin}%`;
    document.getElementById('summary-cout-centre').textContent = `${coutCentre}%`;
    document.getElementById('summary-marge-actuelle').textContent = `${margeActuelle.toFixed(2)}%`;
    document.getElementById('summary-marge-cible').textContent = `${margeCible}%`;
    
    // Colorer la marge actuelle selon qu'elle soit positive ou négative
    const margeActuelleEl = document.getElementById('summary-marge-actuelle');
    if (margeActuelle < 0) {
        margeActuelleEl.style.color = '#e74c3c';
    } else if (margeActuelle < 20) {
        margeActuelleEl.style.color = '#f39c12';
    } else {
        margeActuelleEl.style.color = '#27ae60';
    }
}

// Fonction pour initialiser les dates avec le mois précédent
function initializeDates() {
    const { startDate, endDate } = getLastMonthDateRange();
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    
    if (startInput && !startInput.value) {
        startInput.value = startDate;
    }
    if (endInput && !endInput.value) {
        endInput.value = endDate;
    }
}

// Fonction pour calculer les statistiques globales
function calculateGlobalStats(actes) {
    let totalCA = 0;
    let totalMarge = 0;
    let totalMargeWeighted = 0;
    
    actes.forEach(acte => {
        totalCA += acte.CA || 0;
        totalMarge += acte.marge_brute || 0;
        totalMargeWeighted += (acte.marge_brute_pct || 0) * (acte.CA || 0);
    });
    
    const margeMoyenne = totalCA > 0 ? (totalMargeWeighted / totalCA) : 0;
    
    document.getElementById('total-actes').textContent = actes.length;
    document.getElementById('total-ca').textContent = formatNumber(totalCA) + ' DA';
    document.getElementById('total-marge').textContent = formatNumber(totalMarge) + ' DA';
    document.getElementById('marge-moyenne').textContent = margeMoyenne.toFixed(2) + '%';
}

// Fonction pour charger les données de rentabilité
async function loadRentabiliteData() {
    const { startDate, endDate } = getDateRange();
    const remunerationMedecin = parseFloat(document.getElementById('remuneration-medecin').value) || 40;
    const coutCentre = parseFloat(document.getElementById('cout-centre').value) || 25;
    const margeCible = parseFloat(document.getElementById('marge-cible').value) || 30;

    // Vérifier que la somme ne dépasse pas 100%
    if (remunerationMedecin + coutCentre > 100) {
        alert('⚠️ La somme de la rémunération médecin et du coût centre ne peut pas dépasser 100%');
        return;
    }

    updateParamsSummary(remunerationMedecin, coutCentre, margeCible);

    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Token non disponible');
        window.location.href = '/login.html';
        return;
    }

    // Afficher la section des résultats
    const section = document.getElementById('rentabilite-section');
    section.style.display = 'block';
    
    // Afficher le chargement
    const tbody = document.querySelector('#rentabilite-table tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="10" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Chargement des données de rentabilité...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `/api/simulateur-rentabilite?start=${startDate}&end=${endDate}&remunerationMedecin=${remunerationMedecin}&coutCentre=${coutCentre}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des données de rentabilité');
        }

        const data = await response.json();
        currentData = data;
        displayRentabiliteTable(data);
        calculateGlobalStats(data.actes);
        
        // Scroll vers la section des résultats
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Erreur:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #e74c3c;">
                    ❌ Impossible de charger les données de rentabilité. Veuillez réessayer.
                </td>
            </tr>
        `;
    }
}

// Fonction pour afficher le tableau de rentabilité
function displayRentabiliteTable(data) {
    const tbody = document.querySelector('#rentabilite-table tbody');
    tbody.innerHTML = '';

    if (!data.actes || data.actes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    ℹ️ Aucune donnée disponible pour la période sélectionnée
                </td>
            </tr>
        `;
        return;
    }

    data.actes.forEach(acte => {
        const row = document.createElement('tr');
        
        // Colorer la ligne selon la marge
        let rowClass = '';
        if (acte.marge_brute_pct < 0) {
            rowClass = 'negative-margin';
        } else if (acte.marge_brute_pct < 20) {
            rowClass = 'low-margin';
        } else if (acte.marge_brute_pct >= 40) {
            rowClass = 'high-margin';
        }
        row.className = rowClass;

        row.innerHTML = `
            <td><strong>${acte.acte}</strong></td>
            <td>${acte.total_visits}</td>
            <td>${acte.uniq_patients}</td>
            <td><strong>${formatNumber(acte.CA)}</strong></td>
            <td>${acte.total_hours}</td>
            <td>${formatNumber(acte.remuneration_medecin)}</td>
            <td>${formatNumber(acte.cout_centre)}</td>
            <td class="${acte.marge_brute < 0 ? 'negative' : 'positive'}">${formatNumber(acte.marge_brute)}</td>
            <td class="${acte.marge_brute_pct < 0 ? 'negative' : acte.marge_brute_pct < 20 ? 'warning' : 'positive'}">
                <strong>${acte.marge_brute_pct}%</strong>
            </td>
            <td>${formatNumber(acte.marge_par_heure || 0)}</td>
        `;

        tbody.appendChild(row);
    });
}

// Fonction pour calculer les statistiques des suggestions
function calculateSuggestionStats(suggestions) {
    let actesAugmenter = 0;
    let actesDiminuer = 0;
    let totalVariation = 0;
    
    suggestions.forEach(sug => {
        if (sug.variation_pct > 0) {
            actesAugmenter++;
        } else if (sug.variation_pct < 0) {
            actesDiminuer++;
        }
        totalVariation += Math.abs(sug.variation_pct);
    });
    
    const variationMoyenne = suggestions.length > 0 ? (totalVariation / suggestions.length) : 0;
    
    document.getElementById('actes-augmenter').textContent = actesAugmenter;
    document.getElementById('actes-diminuer').textContent = actesDiminuer;
    document.getElementById('variation-moyenne').textContent = variationMoyenne.toFixed(2) + '%';
}

// Fonction pour charger les suggestions de tarifs
async function loadTarifsSuggestions() {
    const { startDate, endDate } = getDateRange();
    const remunerationMedecin = parseFloat(document.getElementById('remuneration-medecin').value) || 40;
    const coutCentre = parseFloat(document.getElementById('cout-centre').value) || 25;
    const margeCible = parseFloat(document.getElementById('marge-cible').value) || 30;

    // Vérifier que la somme ne dépasse pas 100%
    if (remunerationMedecin + coutCentre + margeCible > 100) {
        alert('⚠️ La somme de la rémunération médecin, du coût centre et de la marge cible ne peut pas dépasser 100%');
        return;
    }

    updateParamsSummary(remunerationMedecin, coutCentre, margeCible);

    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Token non disponible');
        window.location.href = '/login.html';
        return;
    }

    // Afficher la section des suggestions
    const section = document.getElementById('suggestions-section');
    section.style.display = 'block';
    
    // Afficher le chargement
    const tbody = document.querySelector('#suggestions-table tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Calcul des suggestions de tarifs...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `/api/simulateur-rentabilite/suggestion-tarifs?start=${startDate}&end=${endDate}&remunerationMedecin=${remunerationMedecin}&coutCentre=${coutCentre}&margeCible=${margeCible}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des suggestions de tarifs');
        }

        const data = await response.json();
        displayTarifsSuggestions(data);
        calculateSuggestionStats(data.suggestions);
        
        // Scroll vers la section des suggestions
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Erreur:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #e74c3c;">
                    ❌ Impossible de charger les suggestions de tarifs. Veuillez réessayer.
                </td>
            </tr>
        `;
    }
}

// Fonction pour afficher les suggestions de tarifs
function displayTarifsSuggestions(data) {
    const tbody = document.querySelector('#suggestions-table tbody');
    const targetMarginSpan = document.getElementById('target-margin');
    
    targetMarginSpan.textContent = data.parametres.margeCible;
    tbody.innerHTML = '';

    if (!data.suggestions || data.suggestions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    ℹ️ Aucune suggestion disponible pour la période sélectionnée
                </td>
            </tr>
        `;
        return;
    }

    data.suggestions.forEach(suggestion => {
        const row = document.createElement('tr');
        
        // Déterminer la classe de variation
        let variationClass = '';
        let variationBadge = '';
        if (suggestion.variation_pct > 10) {
            variationClass = 'high-increase';
            variationBadge = `<span class="variation-badge high-increase">+${suggestion.variation_pct}%</span>`;
        } else if (suggestion.variation_pct > 0) {
            variationClass = 'moderate-increase';
            variationBadge = `<span class="variation-badge moderate-increase">+${suggestion.variation_pct}%</span>`;
        } else if (suggestion.variation_pct < -10) {
            variationClass = 'high-decrease';
            variationBadge = `<span class="variation-badge high-decrease">${suggestion.variation_pct}%</span>`;
        } else {
            variationClass = 'moderate-decrease';
            variationBadge = `<span class="variation-badge moderate-decrease">${suggestion.variation_pct}%</span>`;
        }

        row.innerHTML = `
            <td><strong>${suggestion.acte}</strong></td>
            <td>${formatNumber(suggestion.prix_actuel)}</td>
            <td class="highlight"><strong>${formatNumber(suggestion.tarif_suggere)}</strong></td>
            <td style="text-align: center;">${variationBadge}</td>
            <td>${suggestion.marge_actuelle_pct}%</td>
            <td><strong>${suggestion.marge_cible_pct}%</strong></td>
            <td>${formatNumber(suggestion.ca_actuel)}</td>
            <td><strong>${formatNumber(suggestion.ca_projete)}</strong></td>
        `;

        tbody.appendChild(row);
    });
}

// Fonction pour exporter les données en CSV
function exportToCSV() {
    if (!currentData || !currentData.actes || currentData.actes.length === 0) {
        alert('⚠️ Aucune donnée à exporter. Veuillez d\'abord calculer la rentabilité.');
        return;
    }

    // Créer le CSV
    let csv = 'Acte,Visites,Patients,CA Total (DA),Heures,Rémunération Médecin (DA),Coût Centre (DA),Marge Brute (DA),Marge %,Marge/Heure (DA)\n';
    
    currentData.actes.forEach(acte => {
        csv += `"${acte.acte}",${acte.total_visits},${acte.uniq_patients},${acte.CA},${acte.total_hours},${acte.remuneration_medecin},${acte.cout_centre},${acte.marge_brute},${acte.marge_brute_pct},${acte.marge_par_heure || 0}\n`;
    });

    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rentabilite_actes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les dates
    initializeDates();
    
    // Boutons
    document.getElementById('calculer-rentabilite').addEventListener('click', loadRentabiliteData);
    document.getElementById('suggerer-tarifs').addEventListener('click', loadTarifsSuggestions);
    document.getElementById('export-data').addEventListener('click', exportToCSV);
    document.getElementById('apply-period').addEventListener('click', () => {
        if (currentData) {
            loadRentabiliteData();
        }
    });

    // Mettre à jour le résumé quand les valeurs changent
    ['remuneration-medecin', 'cout-centre', 'marge-cible'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const rem = parseFloat(document.getElementById('remuneration-medecin').value) || 0;
            const cout = parseFloat(document.getElementById('cout-centre').value) || 0;
            const marge = parseFloat(document.getElementById('marge-cible').value) || 0;
            updateParamsSummary(rem, cout, marge);
        });
    });

    // Initialiser le résumé
    updateParamsSummary(40, 25, 30);
});

export { loadRentabiliteData, loadTarifsSuggestions };
