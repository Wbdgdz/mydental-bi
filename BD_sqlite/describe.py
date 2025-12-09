import sqlite3
import os

# --- CONFIGURATION ---
DB_FILE = 'dental_data.db'
OUTPUT_FILE = 'analyse2.txt'
# ---------------------

def describe_database():
    if not os.path.exists(DB_FILE):
        error_msg = f"❌ Erreur : La base de données {DB_FILE} n'existe pas."
        print(error_msg)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(error_msg + '\n')
        return

    # Ouvrir le fichier de sortie
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as output:
        output.write(f"🔍 ANALYSE APPROFONDIE DE LA BASE : {DB_FILE}\n\n")

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Récupérer la liste de toutes les tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = cursor.fetchall()

        if not tables:
            output.write("⚠️ Aucune table trouvée dans la base.\n")
            return

        count_tables = len(tables)
        output.write(f"📊 STATISTIQUES GÉNÉRALES\n")
        output.write("=" * 80 + "\n")
        output.write(f"Nombre total de tables : {count_tables}\n\n")

        # Boucler sur chaque table
        for table in tables:
            table_name = table['name']
            output.write(f"\n{'='*80}\n")
            output.write(f"📦 TABLE : {table_name}\n")
            output.write("=" * 80 + "\n")

            try:
                # 1. SCHÉMA DE LA TABLE
                output.write("\n🔧 SCHÉMA DES COLONNES :\n")
                output.write("-" * 80 + "\n")
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()
                
                for col in columns_info:
                    col_id = col['cid']
                    col_name = col['name']
                    col_type = col['type']
                    not_null = "NOT NULL" if col['notnull'] else "NULL"
                    default_val = f"DEFAULT {col['dflt_value']}" if col['dflt_value'] else ""
                    primary_key = "🔑 PRIMARY KEY" if col['pk'] else ""
                    
                    output.write(f"  [{col_id}] {col_name:<25} {col_type:<15} {not_null:<10} {default_val:<20} {primary_key}\n")

                # 2. CLÉS ÉTRANGÈRES
                cursor.execute(f"PRAGMA foreign_key_list({table_name})")
                foreign_keys = cursor.fetchall()
                if foreign_keys:
                    output.write("\n🔗 CLÉS ÉTRANGÈRES :\n")
                    output.write("-" * 80 + "\n")
                    for fk in foreign_keys:
                        output.write(f"  {fk['from']:<25} → {fk['table']}.{fk['to']}\n")

                # 3. INDEX
                cursor.execute(f"PRAGMA index_list({table_name})")
                indexes = cursor.fetchall()
                if indexes:
                    output.write("\n📇 INDEX :\n")
                    output.write("-" * 80 + "\n")
                    for idx in indexes:
                        unique = "UNIQUE" if idx['unique'] else "NON-UNIQUE"
                        output.write(f"  {idx['name']:<40} ({unique})\n")

                # 4. STATISTIQUES SUR LES DONNÉES
                cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
                row_count = cursor.fetchone()['count']
                
                output.write(f"\n📊 STATISTIQUES DES DONNÉES :\n")
                output.write("-" * 80 + "\n")
                output.write(f"  Nombre total de lignes : {row_count}\n")

                if row_count > 0:
                    # Statistiques par colonne
                    output.write("\n  Analyse par colonne :\n")
                    for col in columns_info:
                        col_name = col['name']
                        
                        # Compter les valeurs NULL
                        cursor.execute(f"SELECT COUNT(*) as null_count FROM {table_name} WHERE {col_name} IS NULL")
                        null_count = cursor.fetchone()['null_count']
                        
                        # Compter les valeurs distinctes
                        cursor.execute(f"SELECT COUNT(DISTINCT {col_name}) as distinct_count FROM {table_name}")
                        distinct_count = cursor.fetchone()['distinct_count']
                        
                        null_percent = (null_count / row_count * 100) if row_count > 0 else 0
                        
                        output.write(f"    • {col_name:<25} | NULL: {null_count:>5} ({null_percent:>5.1f}%) | Distinct: {distinct_count:>5}\n")

                    # 5. EXEMPLE DE DONNÉES (première ligne)
                    output.write("\n💾 EXEMPLE DE DONNÉES (première ligne) :\n")
                    output.write("-" * 80 + "\n")
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
                    row = cursor.fetchone()
                    
                    for col_name in row.keys():
                        value = row[col_name]
                        val_str = str(value) if value is not None else "NULL"
                        if len(val_str) > 60:
                            val_str = val_str[:57] + "..."
                        output.write(f"  {col_name:<25} : {val_str}\n")
                else:
                    output.write("\n⚠️  Table vide - aucune donnée\n")

            except sqlite3.Error as e:
                output.write(f"\n❌ Erreur lors de l'analyse : {e}\n")

        conn.close()
        output.write(f"\n{'='*80}\n")
        output.write("✅ Analyse terminée\n")

    print(f"✅ Analyse terminée. Résultats écrits dans : {OUTPUT_FILE}")

if __name__ == "__main__":
    describe_database()