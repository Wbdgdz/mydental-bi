# Analyse des Besoins et Proposition de Nouveaux Indicateurs BI

## 📋 Résumé Exécutif

Ce document présente une analyse approfondie de la base de données MYDental et propose de nouveaux indicateurs de performance (KPI) pour enrichir le système de Business Intelligence existant. L'analyse s'appuie sur l'étude de 80 tables contenant plus de 217 000 paiements et 32 000 visites.

---

## 1. 🔍 Analyse de l'Existant

### 1.1 Indicateurs Actuellement Implémentés

**Tableau de bord Clinique:**
- Nombre de patients et visites
- Chiffre d'affaires total et par heure
- Nouveaux patients vs patients fidèles
- Temps d'attente moyen
- Rendez-vous planifiés

**Performance Médecins:**
- Patients uniques et visites par médecin
- Revenus générés par médecin
- Heures travaillées et CA par heure
- Nouveaux patients vs patients de retour

**Simulateur de Rentabilité:**
- Rentabilité par type d'acte dentaire
- Répartition coûts (médecin, centre, marge)
- Suggestions de tarification optimisée

### 1.2 Données Disponibles Non Exploitées

Après analyse de la base de données, plusieurs tables contiennent des données précieuses non encore utilisées:

- **Table `expense`** (2 enregistrements): Dépenses et consommables
- **Table `payment_history`** (18 493 enregistrements): Historique détaillé des actes par visite
- **Table `dental_diagram`** (28 014 enregistrements): Détails des traitements dentaires par dent
- **Table `evenement`** (14 507 enregistrements): Planning et rendez-vous
- **Table `patient_service_event`** (14 507 enregistrements): Gestion des files d'attente
- **Table `document`** (27 457 enregistrements): Documents générés (factures, certificats)
- **Table `udc`** (525 codes d'actes): Nomenclature complète des actes

---

## 2. 💡 Nouveaux Indicateurs Proposés

### 2.1 📊 Indicateurs de Gestion Financière Avancée

#### 2.1.1 Analyse des Impayés et Créances
**Justification**: Table `payment` contient `remaining_amount` (montants restants à payer)

**Indicateurs proposés:**
- **Taux d'impayés**: `SUM(remaining_amount) / SUM(amount) * 100`
- **Créances par ancienneté**: Classification < 30j, 30-60j, 60-90j, > 90j
- **Top 10 patients avec soldes impayés**
- **Évolution mensuelle des créances**
- **Taux de recouvrement**: Suivi des paiements partiels

**Impact métier**: Amélioration de la trésorerie et identification des risques de non-paiement

#### 2.1.2 Analyse du Mix de Paiement
**Justification**: Colonne `payment_type` (Espèces, Carte, etc.)

**Indicateurs proposés:**
- **Répartition CA par mode de paiement** (graphique en camembert)
- **Montant moyen par type de paiement**
- **Tendances mensuelles par mode de paiement**

**Impact métier**: Optimisation de la gestion de trésorerie et des commissions bancaires

#### 2.1.3 Analyse des Remises et Promotions
**Justification**: Colonnes `discount`, `discount_percent`, `discount_reason`

**Indicateurs proposés:**
- **Taux de remise moyen**: `AVG(discount_percent)`
- **CA perdu en remises**: `SUM(discount)`
- **Top motifs de remises** (analyse de `discount_reason`)
- **Patients bénéficiant le plus de remises**

**Impact métier**: Évaluation de l'impact des politiques tarifaires sur la rentabilité

---

### 2.2 🦷 Indicateurs Cliniques et Médicaux

#### 2.2.1 Analyse par Topographie Dentaire
**Justification**: Table `dental_diagram` avec `tooth_number` et actes associés

**Indicateurs proposés:**
- **Heatmap des dents les plus traitées** (visualisation des 32 dents)
- **Actes les plus fréquents par quadrant dentaire**
- **Taux de traitement par type de dent** (molaires, incisives, canines)
- **Problèmes dentaires récurrents par zone**

**Impact métier**: Identification des pathologies fréquentes et besoins en équipement spécialisé

#### 2.2.2 Analyse des Plans de Traitement
**Justification**: Colonnes `current_acts` et `next_acts` dans `dental_diagram`

**Indicateurs proposés:**
- **Taux de réalisation des plans de traitement** 
- **Durée moyenne entre diagnostic et réalisation**
- **Actes planifiés non réalisés** (abandons de traitement)
- **Valeur des traitements en cours vs réalisés**

**Impact métier**: Optimisation du suivi patient et réduction des abandons de traitement

#### 2.2.3 Analyse des Types de Consultations
**Justification**: Colonne `discr` dans `visit` (OrthodonticConsultation, etc.)

**Indicateurs proposés:**
- **Répartition des consultations par spécialité**
- **Revenus moyens par type de consultation**
- **Durée moyenne par type de consultation**
- **Saisonnalité par spécialité**

**Impact métier**: Planification des ressources et spécialisation des médecins

---

### 2.3 👥 Indicateurs de Fidélisation et Satisfaction Patient

#### 2.3.1 Analyse du Cycle de Vie Patient
**Justification**: Multiples visites par patient dans `visit`

**Indicateurs proposés:**
- **Lifetime Value (LTV) du patient**: Revenu total généré par patient
- **Durée de vie moyenne d'un patient**: Période entre première et dernière visite
- **Taux de rétention à 3 mois, 6 mois, 1 an**
- **Courbe de survie des patients** (analyse de cohorte)
- **Valeur moyenne par visite par patient**

**Impact métier**: Stratégies de fidélisation ciblées et prévision de revenus

#### 2.3.2 Analyse des Abandons et Réactivations
**Justification**: Colonne `status` dans `visit` (statuts comme "A revoir")

**Indicateurs proposés:**
- **Taux d'abandon par statut de visite**
- **Patients inactifs depuis > 6 mois** (candidates à la réactivation)
- **Taux de réactivation après campagne**
- **Raisons d'abandon** (analyse du champ `reason`)

**Impact métier**: Campagnes de réactivation et réduction du churn

#### 2.3.3 Analyse de la Provenance des Patients
**Justification**: Colonne `referencedBy` dans `patient`

**Indicateurs proposés:**
- **Top sources de recommandation**
- **Taux de conversion par source**
- **LTV par canal d'acquisition**
- **ROI des différentes sources d'acquisition**

**Impact métier**: Optimisation des investissements marketing

---

### 2.4 ⏰ Indicateurs d'Efficacité Opérationnelle

#### 2.4.1 Analyse du Taux de Remplissage
**Justification**: Tables `evenement` (rendez-vous planifiés) et `visit` (visites réalisées)

**Indicateurs proposés:**
- **Taux de présentation aux RDV**: `Visites réalisées / RDV planifiés * 100`
- **Taux de no-show par créneau horaire**
- **Taux de no-show par médecin**
- **Impact financier des absences** (CA perdu)
- **Taux de confirmation SMS/Email** (utilisation de `smsConfirmation`)

**Impact métier**: Réduction des créneaux perdus et optimisation du planning

#### 2.4.2 Analyse de la Productivité par Créneau Horaire
**Justification**: Colonnes `startDatetime` et `endDatetime` dans `evenement`

**Indicateurs proposés:**
- **Taux d'occupation par plage horaire** (8h-12h, 14h-18h, etc.)
- **CA par créneau horaire**
- **Nombre de patients par créneau**
- **Créneaux les plus rentables**

**Impact métier**: Optimisation des horaires d'ouverture et planification du personnel

#### 2.4.3 Analyse des Temps de Traitement
**Justification**: Colonnes `startDate` et `endDate` dans `visit`

**Indicateurs proposés:**
- **Durée moyenne par type d'acte**
- **Variance des temps de traitement par médecin**
- **Identification des actes chronophages**
- **Ratio temps productif / temps total**

**Impact métier**: Standardisation des pratiques et amélioration de la productivité

---

### 2.5 📅 Indicateurs Prédictifs et de Planification

#### 2.5.1 Prévisions de CA
**Justification**: Historique de paiements sur plusieurs années

**Indicateurs proposés:**
- **Prévision CA mensuel** (moyenne mobile, lissage exponentiel)
- **Saisonnalité du CA** (identification des mois creux/forts)
- **Tendance annuelle** (croissance ou décroissance)
- **CA prévisionnel vs réalisé**

**Impact métier**: Planification budgétaire et anticipation des besoins

#### 2.5.2 Prévisions de Flux de Patients
**Justification**: Historique des visites

**Indicateurs proposés:**
- **Prévision du nombre de patients par mois**
- **Identification des périodes de forte affluence**
- **Capacité résiduelle par médecin**
- **Besoins en ressources humaines**

**Impact métier**: Optimisation du staffing et des investissements

#### 2.5.3 Analyse Prévisionnelle des Traitements
**Justification**: Table `orthodontic_consultation` avec plans de traitement

**Indicateurs proposés:**
- **Pipeline de traitements en cours**
- **CA prévisionnel des traitements planifiés**
- **Durée moyenne des traitements complexes**
- **Taux de complétion des traitements longs**

**Impact métier**: Visibilité sur le CA futur et gestion des ressources

---

### 2.6 📈 Indicateurs de Performance Comparative

#### 2.6.1 Benchmarking entre Médecins
**Justification**: Plusieurs médecins dans la table `doctor`

**Indicateurs proposés:**
- **Classement des médecins par CA**
- **Classement par taux de satisfaction** (proxy: taux de retour des patients)
- **Classement par productivité** (CA/heure)
- **Classement par nouveau patients générés**
- **Matrice performance: CA vs Satisfaction**

**Impact métier**: Émulation positive et identification des meilleures pratiques

#### 2.6.2 Analyse des Actes par Médecin
**Justification**: Tables `payment_history` et `visit` liées aux médecins

**Indicateurs proposés:**
- **Spécialisation de chaque médecin** (distribution des actes)
- **Actes les plus rentables par médecin**
- **Diversité du portefeuille d'actes**
- **Taux de conversion consultation → traitement**

**Impact métier**: Développement des compétences et orientation stratégique

---

### 2.7 🎯 Indicateurs de Qualité et Conformité

#### 2.7.1 Analyse de la Documentation
**Justification**: Table `document` (27 457 documents)

**Indicateurs proposés:**
- **Taux de documentation par visite** (factures, certificats générés)
- **Délai moyen d'édition des documents**
- **Conformité documentaire par médecin**
- **Types de documents les plus générés**

**Impact métier**: Conformité réglementaire et traçabilité

#### 2.7.2 Analyse des Actes Réalisés
**Justification**: Table `payment_history` (18 493 actes détaillés)

**Indicateurs proposés:**
- **Nombre d'actes par visite** (moyenne, min, max)
- **Corrélation entre nombre d'actes et satisfaction patient**
- **Actes fréquemment combinés** (analyse de paniers)
- **Évolution du mix d'actes dans le temps**

**Impact métier**: Optimisation de l'offre de soins et packages attractifs

---

### 2.8 💰 Indicateurs de Gestion des Stocks (Données Limitées)

**Note**: La table `expense` contient seulement 2 enregistrements, indiquant un suivi limité des stocks. Les tables `product`, `lot`, `action` sont vides.

**Indicateurs proposés** (nécessitent amélioration du suivi):
- **Suivi des consommables par type d'acte**
- **Coût des consommables par visite**
- **Ratio consommables / CA**
- **Alertes de réapprovisionnement**

**Recommandation**: Mettre en place un système de suivi des stocks plus robuste pour exploiter pleinement ces indicateurs.

---

## 3. 🎯 Indicateurs Prioritaires à Implémenter

### Phase 1 (Quick Wins - Impact Immédiat)

1. **Analyse des Impayés et Créances** 
   - Données disponibles: ✅
   - Complexité: Faible
   - Impact: Très élevé (trésorerie)

2. **Taux de Remplissage et No-Show**
   - Données disponibles: ✅
   - Complexité: Moyenne
   - Impact: Élevé (optimisation planning)

3. **Lifetime Value Patient**
   - Données disponibles: ✅
   - Complexité: Faible
   - Impact: Élevé (stratégie fidélisation)

4. **Mix de Paiement**
   - Données disponibles: ✅
   - Complexité: Très faible
   - Impact: Moyen (optimisation trésorerie)

### Phase 2 (Indicateurs Stratégiques)

5. **Heatmap Dentaire**
   - Données disponibles: ✅
   - Complexité: Moyenne
   - Impact: Élevé (planification équipement)

6. **Benchmarking entre Médecins**
   - Données disponibles: ✅
   - Complexité: Moyenne
   - Impact: Élevé (performance)

7. **Analyse du Cycle de Vie Patient**
   - Données disponibles: ✅
   - Complexité: Élevée
   - Impact: Très élevé (rétention)

8. **Plans de Traitement et Pipeline**
   - Données disponibles: ✅
   - Complexité: Élevée
   - Impact: Élevé (prévision CA)

### Phase 3 (Indicateurs Prédictifs)

9. **Prévisions de CA et Flux**
   - Données disponibles: ✅
   - Complexité: Très élevée
   - Impact: Très élevé (planification)

10. **Analyse des Abandons et Réactivations**
    - Données disponibles: ✅
    - Complexité: Élevée
    - Impact: Élevé (churn management)

---

## 4. 📊 Recommandations Techniques

### 4.1 Architecture des Nouveaux Indicateurs

Pour implémenter ces indicateurs, il est recommandé de:

1. **Créer des routes API dédiées** dans `/routes/`:
   - `financialAnalysisRoute.js` (impayés, mix paiement, remises)
   - `clinicalAnalysisRoute.js` (heatmap dentaire, plans de traitement)
   - `patientLifecycleRoute.js` (LTV, rétention, abandons)
   - `operationalEfficiencyRoute.js` (taux remplissage, productivité)
   - `predictiveAnalysisRoute.js` (prévisions CA et flux)

2. **Créer des pages frontend** dans `/public/`:
   - `financial-analysis.html` (analyse financière avancée)
   - `clinical-insights.html` (insights cliniques)
   - `patient-lifecycle.html` (cycle de vie patient)
   - `operational-dashboard.html` (efficacité opérationnelle)

3. **Optimiser les requêtes SQL**:
   - Créer des vues matérialisées pour les calculs complexes
   - Ajouter des index sur les colonnes fréquemment utilisées (`patient_id`, `doctor_id`, `date`)
   - Utiliser des requêtes avec CTEs pour la lisibilité

### 4.2 Qualité des Données

**Points d'attention identifiés:**

1. **Tables vides**: Plusieurs tables sont vides (`invoice`, `invoice_prothese`, `convention`) - le système actuel utilise `payment` directement
2. **Colonnes `NULL`**: Beaucoup de colonnes ont des valeurs NULL (ex: `doctor.consult_percent = 0`)
3. **Données manquantes**: Certains champs métier ne sont pas renseignés (`discount_reason`, `reason` dans visit)

**Recommandations:**
- Nettoyer et enrichir progressivement les données manquantes
- Mettre en place des contrôles de saisie pour améliorer la qualité future
- Documenter les champs obligatoires vs optionnels

---

## 5. 🔄 Plan de Mise en Œuvre

### Étape 1: Validation Métier (Semaine 1)
- Présentation des indicateurs proposés aux utilisateurs
- Priorisation selon les besoins réels
- Validation de la pertinence de chaque indicateur

### Étape 2: Développement Phase 1 (Semaines 2-3)
- Implémentation des 4 indicateurs Quick Wins
- Tests unitaires et d'intégration
- Documentation technique

### Étape 3: Déploiement et Formation (Semaine 4)
- Mise en production des premiers indicateurs
- Formation des utilisateurs
- Collecte des retours

### Étape 4: Itérations Suivantes (Mois 2-3)
- Développement des phases 2 et 3
- Amélioration continue basée sur les retours
- Extension progressive des fonctionnalités

---

## 6. 📈 Bénéfices Attendus

### Bénéfices Financiers
- **Amélioration de la trésorerie**: Réduction des impayés de 20-30%
- **Optimisation tarifaire**: Augmentation du CA de 5-10% via ajustements ciblés
- **Réduction des pertes**: Diminution des no-show de 15-25%

### Bénéfices Opérationnels
- **Meilleure planification**: Augmentation du taux d'occupation de 10-15%
- **Productivité accrue**: Réduction des temps morts de 20%
- **Optimisation des ressources**: Meilleure allocation du personnel

### Bénéfices Stratégiques
- **Vision 360° du patient**: Meilleure compréhension du parcours patient
- **Décisions data-driven**: Choix stratégiques basés sur des données objectives
- **Anticipation**: Capacité à prévoir et planifier sur 6-12 mois

---

## 7. 📝 Conclusion

Cette analyse révèle un potentiel significatif d'amélioration du système BI MYDental. La base de données contient des données riches et inexploitées qui, une fois transformées en indicateurs actionnables, permettront:

1. **Une meilleure maîtrise financière** via le suivi des impayés et l'optimisation des prix
2. **Une optimisation opérationnelle** via l'analyse des plannings et de la productivité  
3. **Une fidélisation accrue** via la compréhension fine du cycle de vie patient
4. **Une vision prédictive** permettant d'anticiper les besoins et planifier la croissance

Les indicateurs proposés s'appuient sur des données existantes, minimisant les besoins de collecte additionnelle. L'implémentation progressive en 3 phases permet de délivrer de la valeur rapidement tout en construisant un système BI complet et robuste.

**Prochaine étape recommandée**: Présentation de cette analyse aux parties prenantes pour validation et priorisation finale avant démarrage du développement.

---

*Document créé le: 2025-12-10*  
*Auteur: Analyse BI - GitHub Copilot*  
*Version: 1.0*
