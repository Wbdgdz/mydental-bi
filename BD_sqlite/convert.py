import sqlite3
import re
import os
import sys
from tqdm import tqdm

# --- CONFIGURATION ---
INPUT_FILE = 'import.sql'      
OUTPUT_DB = 'dental_data.db'   
# ---------------------

def clean_create_table(sql):
    """
    Nettoyage chirurgical des CREATE TABLE.
    """
    # 1. Nettoyage préliminaire
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL) 
    sql = re.sub(r'AUTO_INCREMENT', '', sql, flags=re.IGNORECASE)
    
    # 2. IDENTIFIER LE NOM DE LA TABLE
    # On cherche "CREATE TABLE `nom` (" ou "CREATE TABLE nom ("
    name_match = re.search(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`"]?(\w+)[`"]?', sql, flags=re.IGNORECASE)
    if not name_match:
        return None
    table_name = name_match.group(1)

    # 3. NETTOYER LA FIN DE L'INSTRUCTION (Le point critique)
    # MySQL termine souvent par ") ENGINE=InnoDB ... ;"
    # On va chercher la dernière parenthèse fermante avant le point-virgule final
    last_paren_index = sql.rfind(')')
    if last_paren_index != -1:
        # On coupe tout ce qu'il y a après la dernière parenthèse et on met juste un ;
        sql_body = sql[:last_paren_index] 
    else:
        return None

    # 4. EXTRAIRE LE CONTENU ENTRE LES PARENTHÈSES PRINCIPALES
    # On cherche la première parenthèse ouvrante
    first_paren_index = sql_body.find('(')
    if first_paren_index == -1:
        return None
    
    # Le corps, c'est tout ce qu'il y a entre la 1ère ( et la dernière )
    body_content = sql_body[first_paren_index+1:]

    # 5. FILTRER LES LIGNES INTERDITES (INDEX, KEYS)
    lines = body_content.split(',')
    clean_lines = []
    
    for line in lines:
        l = line.strip()
        u_l = l.upper()
        
        # Si la ligne commence par un mot clé d'index ou contrainte MySQL, on la vire
        if (u_l.startswith('KEY') or 
            u_l.startswith('UNIQUE KEY') or 
            u_l.startswith('CONSTRAINT') or 
            u_l.startswith('FULLTEXT') or
            u_l.startswith('INDEX') or
            u_l.startswith('FOREIGN KEY') or
            'REFERENCES' in u_l): # On vire les foreign keys pour éviter les erreurs d'ordre
            continue
            
        # Si c'est vide, on passe
        if not l:
            continue

        # Nettoyage des types MySQL dans la ligne
        l = re.sub(r'int\(\d+\)', 'INTEGER', l, flags=re.IGNORECASE)
        l = re.sub(r'tinyint\(\d+\)', 'INTEGER', l, flags=re.IGNORECASE)
        l = re.sub(r'smallint\(\d+\)', 'INTEGER', l, flags=re.IGNORECASE)
        l = re.sub(r'bigint\(\d+\)', 'INTEGER', l, flags=re.IGNORECASE)
        l = re.sub(r'double(\(\d+,\d+\))?', 'REAL', l, flags=re.IGNORECASE)
        l = re.sub(r'float(\(\d+,\d+\))?', 'REAL', l, flags=re.IGNORECASE)
        # Supprimer les trucs genre "unsigned", "COLLATE..."
        l = re.sub(r'unsigned', '', l, flags=re.IGNORECASE)
        l = re.sub(r'COLLATE\s+\w+', '', l, flags=re.IGNORECASE)
        l = re.sub(r'DEFAULT CHARSET=\w+', '', l, flags=re.IGNORECASE)
        l = re.sub(r'COMMENT\s+\'.*?\'', '', l, flags=re.IGNORECASE)

        clean_lines.append(l)

    # 6. RECONSTRUIRE
    new_body = ',\n'.join(clean_lines)
    final_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` ({new_body});"
    
    return final_sql

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Erreur : Fichier introuvable : {INPUT_FILE}")
        return

    # On supprime l'ancienne base pour être sûr
    if os.path.exists(OUTPUT_DB):
        try:
            os.remove(OUTPUT_DB)
        except PermissionError:
            print("❌ Erreur : Ferme DB Browser avant de relancer le script !")
            return

    print(f"🚀 Conversion V3 (Robustesse Max) : {INPUT_FILE} -> {OUTPUT_DB}")

    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA journal_mode = MEMORY")

    # On ignore ces commandes
    ignored_prefixes = ('--', '/*', 'LOCK', 'UNLOCK', 'CREATE DATABASE', 'USE', 'GRANT', 'FLUSH', 'SET', 'ALTER')

    file_size = os.path.getsize(INPUT_FILE)
    buffer = ""
    
    with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as f:
        with tqdm(total=file_size, unit='B', unit_scale=True, desc="Progression") as pbar:
            for line in f:
                pbar.update(len(line.encode('utf-8')))
                stripped = line.strip()
                
                if not stripped or stripped.startswith(ignored_prefixes):
                    continue
                
                buffer += line
                
                # Détection de fin d'instruction
                if stripped.endswith(';'):
                    statement = buffer.strip()
                    final_sql = None

                    if statement.upper().startswith("CREATE TABLE"):
                        final_sql = clean_create_table(statement)
                        # Debug si ça plante encore sur action
                        # if "action" in statement and final_sql is None:
                        #     print("\nDEBUG: Échec nettoyage table action")
                    
                    elif statement.upper().startswith("INSERT INTO"):
                        # Gestion simple des inserts
                        final_sql = statement.replace("\\'", "''")
                        final_sql = final_sql.replace('\\"', '"') # Parfois utile
                    
                    elif statement.upper().startswith("DROP TABLE"):
                         final_sql = statement # On garde les drop

                    if final_sql:
                        try:
                            cursor.execute(final_sql)
                        except sqlite3.Error as e:
                            # On ignore silencieusement les erreurs d'insert pour ne pas spammer
                            # Mais on afficherait les erreurs de CREATE TABLE
                            if "CREATE TABLE" in final_sql:
                                pbar.write(f"\n⚠️ Erreur Table : {e}")
                                # pbar.write(f"SQL: {final_sql}")
                            pass
                    
                    buffer = "" # Reset

    conn.commit()
    conn.close()
    print("\n✅ Terminé. Relance le script describe.py pour vérifier !")

if __name__ == "__main__":
    main()