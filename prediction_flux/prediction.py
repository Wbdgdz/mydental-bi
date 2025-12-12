import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor

# --- 1. CHARGEMENT ET NETTOYAGE ---
file_path = 'patient-flow-data-2015-01-01-to-2025-12-12.csv'
df = pd.read_csv(file_path)

# Nettoyage du format de date (suppression de la partie "GMT...")
# Ex: "Sun Jul 18 2021 00:00:00 GMT+0000" -> "Sun Jul 18 2021 00:00:00"
df['date_clean'] = df['date'].str.split(' GMT').str[0]
df['datetime'] = pd.to_datetime(df['date_clean'], format='%a %b %d %Y %H:%M:%S')

# Agrégation par jour (on additionne toutes les visites de la journée)
daily_flow = df.groupby(df['datetime'].dt.date)['total_visits'].sum().reset_index()
daily_flow['datetime'] = pd.to_datetime(daily_flow['datetime'])
daily_flow = daily_flow.set_index('datetime').sort_index()

print(f"Données historiques disponibles du {daily_flow.index.min().date()} au {daily_flow.index.max().date()}")

# --- 2. CRÉATION DES FEATURES (VARIABLES) ---
def create_features(df):
    """Crée des variables temporelles pour que le modèle comprenne la saisonnalité"""
    df = df.copy()
    df['dayofweek'] = df.index.dayofweek
    df['quarter'] = df.index.quarter
    df['month'] = df.index.month
    df['year'] = df.index.year
    df['dayofyear'] = df.index.dayofyear
    df['dayofmonth'] = df.index.day
    df['weekofyear'] = df.index.isocalendar().week.astype(int)
    return df

# Préparation des données d'entraînement
df_features = create_features(daily_flow)
FEATURES = ['dayofweek', 'quarter', 'month', 'year', 'dayofyear', 'dayofmonth', 'weekofyear']
TARGET = 'total_visits'

X = df_features[FEATURES]
y = df_features[TARGET]

# --- 3. ENTRAÎNEMENT DU MODÈLE ---
print("Entraînement du Random Forest...")
model = RandomForestRegressor(n_estimators=1000, random_state=42, n_jobs=-1)
model.fit(X, y)
print("Modèle entraîné !")

# --- 4. PRÉDICTION FUTURE (2024-2027) ---
# Mise à jour de la plage de dates pour inclure novembre et décembre 2024
future_dates = pd.date_range(start='2024-11-01', end='2027-01-31', freq='D')
future_df = pd.DataFrame(index=future_dates)
future_df = create_features(future_df)

# Prédiction
future_df['prevision_visites'] = model.predict(future_df[FEATURES])

# --- 5. RÉSULTATS ---
# Affichage des premiers mois
monthly_forecast = future_df['prevision_visites'].resample('M').sum()
print("\n--- Prévision du volume mensuel (novembre 2024 à début 2025) ---")
print(monthly_forecast.head())

# Export des prédictions dans un fichier CSV
output_file = 'previsions_flux_2024_2027.csv'
future_df[['prevision_visites']].to_csv(output_file)
print(f"Prédictions exportées dans le fichier : {output_file}")

# Visualisation
plt.figure(figsize=(15, 6))
plt.plot(daily_flow.index[-365:], daily_flow['total_visits'][-365:], label='Historique (Dernière année)', alpha=0.5)
plt.plot(future_df.index, future_df['prevision_visites'], label='Prédiction 2024-2027', color='red', alpha=0.8)
plt.title('Prédiction du Flux Client')
plt.xlabel('Date')
plt.ylabel('Nombre de Visites')
plt.legend()
plt.grid(True)
plt.show()