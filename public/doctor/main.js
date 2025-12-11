// main.js

import { setupEventListeners } from './eventHandlers.js';
import {checkAuth,getLastMonthDateRange} from '../utilities/utils.js';
import { loadRentabiliteData } from '../doctor/rentabiliteDoctor.js';

// Function to populate the doctor dropdown
function populateDoctorDropdown() {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }

    // API call to get the list of doctors
    fetch('/api/doctors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(doctors => {
        const select = document.getElementById('doctor-select');
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.firstName} ${doctor.lastName}`;
            select.appendChild(option);
        });
    })
    .catch(error => console.error('Erreur lors de la récupération des médecins:', error));
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // --- MODIFICATION : Dates fixes par défaut ---
    const startDate = '2022-01-01';
    const endDate = '2024-12-31';

    // Initialiser les champs de date avec ces valeurs
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    if (startInput) startInput.value = startDate;
    if (endInput) endInput.value = endDate;
    
    populateDoctorDropdown(); // Call the function to populate the doctor dropdown
    setupEventListeners(); // Setup the other event listeners
    
    // Charger les données de rentabilité au chargement initial
    loadRentabiliteData();
});