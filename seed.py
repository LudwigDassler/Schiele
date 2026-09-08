import psycopg2
import numpy as np

# АРТЕРИЯ К БАЗЕ ДАННЫХ SUPABASE
DATABASE_URL = "postgresql://postgres:JonasKessler18@db.kefdjxsmyarwfqqkfgcx.supabase.co:5432/postgres"

def vector_to_str(vec: np.ndarray) -> str:
    """Конвертирует массив numpy в строку формата '[0.1, 0.2]', которую понимает pgvector"""
    return "[" + ",".join(map(str, vec)) + "]"

def seed_database():
    print("🔌 Подключение к Матрице (Supabase)...")
    # Подключаемся к базе
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # ==========================================
    # 1. ЗАЛИВКА АРХЕТИПОВ (32D)
    # ==========================================
    print("🧬 Загрузка 32D Архетипов...")
    archetypes = {
        "COMFORTABLY_NUMB": (np.array([0.6, 0.4, 0.3, 0.2, 0.2, 0.4, 0.5, 0.8, 0.9, 0.7, 0.3, 0.4, 0.5, 0.8, 0.2, 0.2, 0.6, 0.8, 0.4, 0.2, 0.5, 0.3, 0.8, 0.2, 0.3, 0.2, 0.90, 0.85, 0.80, 0.70, 0.75, 0.4]), "GILMOUR RESONANCE"),
        "JOYCEAN_SYLLOGISM": (np.array([0.4, 0.8, 0.7, 0.6, 0.8, 0.5, 0.4, 0.6, 0.7, 0.6, 0.8, 0.6, 0.9, 0.5, 0.8, 0.6, 0.3, 0.2, 0.7, 0.6, 0.5, 0.9, 0.3, 0.8, 0.90, 0.95, 0.10, 0.40, 0.50, 0.20, 0.40, 0.6]), "SYLLOGISM Q.E.D."),
        "SIBERIAN_POST_PUNK": (np.array([0.28, 0.65, 0.78, 0.60, 0.70, 0.20, 0.15, 0.50, 0.40, 0.30, 0.85, 0.80, 0.55, 0.80, 0.75, 0.85, 0.20, 0.10, 0.40, 0.70, 0.20, 0.40, 0.50, 0.60, 0.4, 0.5, 0.6, 0.3, 0.7, 0.1, 0.8, 0.9]), "SIBERIAN RESIDUAL"),
        "INDUSTRIAL_EBM": (np.array([0.2, 0.5, 0.9, 0.9, 0.8, 0.2, 0.1, 0.9, 0.7, 0.2, 0.8, 0.9, 0.9, 0.2, 0.8, 0.7, 0.1, 0.2, 0.8, 0.9, 0.1, 0.7, 0.3, 0.9, 0.8, 0.7, 0.4, 0.1, 0.3, 0.2, 0.8, 0.8]), "MACHINE-OIL BRUTALISM"),
        "HYPERPOP_SUGAR_RUSH": (np.array([0.95, 0.8, 0.2, 0.9, 0.4, 0.6, 0.9, 0.2, 0.1, 0.2, 0.1, 0.8, 0.4, 0.95, 0.7, 0.1, 0.95, 0.9, 0.1, 0.1, 0.8, 0.6, 0.1, 0.6, 0.4, 0.6, 0.1, 0.9, 0.2, 0.9, 0.1, 0.9]), "Y2K HYPER-ECSTASY")
    }
    # Очищаем таблицу перед заливкой
    cur.execute("TRUNCATE TABLE archetypes;")
    for code, (vec, alias) in archetypes.items():
        cur.execute("INSERT INTO archetypes (code_name, alias, vector_32d) VALUES (%s, %s, %s)", (code, alias, vector_to_str(vec)))

    # ==========================================
    # 2. ЗАЛИВКА 5D МАТРИЦ (Лексикон Оракула)
    # ==========================================
    print("🧩 Загрузка 5D Лексикона...")
    cur.execute("TRUNCATE TABLE lexicon_matrix;")
    
    state_lexicon = {
        "luminous ethereal": [0.9, 0.2, 0.4, 0.0, 0.7], "fleshy biomechanical": [0.3, 0.8, 0.9, 0.6, 0.0],
        "decaying rust": [0.2, 0.7, 0.6, 0.9, 0.0], "sterile clinical": [0.9, 0.1, 0.1, 0.5, 0.0],
        "psychedelic chromatic": [0.6, 0.8, 0.9, 0.1, 0.9], "neon-drenched dystopian": [0.8, 0.7, 0.4, 0.4, 0.2]
    }
    for phrase, vec in state_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('STATE', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    form_lexicon = {
        "geometric construct": [0.9, 0.6, 0.8, 0.1, 0.7], "concrete monolith": [0.8, 0.7, 0.9, 0.8, 0.2],
        "fractal topology": [0.5, 0.5, 0.5, 0.2, 0.9], "obscure void": [0.1, 0.9, 0.1, 0.9, 0.9],
        "wireframe matrix": [0.9, 0.8, 0.5, 0.0, 0.6]
    }
    for phrase, vec in form_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('FORM', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    medium_lexicon = {
        "1970s 35mm film photography": [0.8, 0.7, 0.2, 0.2, 0.9], "lo-fi vhs artifact": [0.6, 0.9, 0.1, 0.8, 0.9],
        "soviet architectural archive": [0.7, 0.5, 0.2, 0.9, 0.8], "crisp digital render": [0.1, 0.1, 0.9, 0.0, 0.0]
    }
    for phrase, vec in medium_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('MEDIUM', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    # ==========================================
    # 3. ЗАЛИВКА ОНТОЛОГИИ (Семантика слов)
    # ==========================================
    print("📖 Загрузка Морфологии Культуры...")
    cur.execute("TRUNCATE TABLE semantic_ontology;")
    
    ontology_data = [
        # УЖАС
        ('смерть', 'ru', 'DREAD', 1.0), ('ржавчина', 'ru', 'DREAD', 1.0), ('death', 'en', 'DREAD', 1.0), ('system', 'en', 'DREAD', 0.8),
        # ЭЙФОРИЯ
        ('рейв', 'ru', 'EUPHORIA', 1.0), ('неон', 'ru', 'EUPHORIA', 0.8), ('rave', 'en', 'EUPHORIA', 1.0), ('hyper', 'en', 'EUPHORIA', 0.9),
        # КОСМОС / ДУХ
        ('вечность', 'ru', 'IDEATIONAL', 1.0), ('космос', 'ru', 'IDEATIONAL', 0.9), ('spirit', 'en', 'IDEATIONAL', 1.0)
    ]
    for word, lang, axis, weight in ontology_data:
        cur.execute("INSERT INTO semantic_ontology (word, language, axis, weight) VALUES (%s, %s, %s, %s)", (word, lang, axis, weight))

    # Сохраняем изменения и закрываем соединение
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Матрица успешно инициализирована! Данные залиты в Supabase.")

if __name__ == "__main__":
    seed_database()
