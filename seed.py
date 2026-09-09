import psycopg2
import numpy as np

# АРТЕРИЯ К БАЗЕ ДАННЫХ SUPABASE
DATABASE_URL = "postgresql://postgres.kefdjxsmyarwfqqkfgcx:LudwigDassler@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

def vector_to_str(vec: np.ndarray) -> str:
    return "[" + ",".join(map(str, vec)) + "]"

def seed_database():
    print("🔌 Подключение к Матрице (Supabase)...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # ==========================================
    # 1. ЗАЛИВКА АРХЕТИПОВ (32D)
    # ==========================================
    print("🧬 Загрузка 32D Архетипов...")
    archetypes = {
        # --- БАЗА И СИБИРСКИЙ АНДЕГРАУНД ---
        "COMFORTABLY_NUMB": (np.array([0.6, 0.4, 0.3, 0.2, 0.2, 0.4, 0.5, 0.8, 0.9, 0.7, 0.3, 0.4, 0.5, 0.8, 0.2, 0.2, 0.6, 0.8, 0.4, 0.2, 0.5, 0.3, 0.8, 0.2, 0.3, 0.2, 0.90, 0.85, 0.80, 0.70, 0.75, 0.4]), "GILMOUR RESONANCE"),
        "JOYCEAN_SYLLOGISM": (np.array([0.4, 0.8, 0.7, 0.6, 0.8, 0.5, 0.4, 0.6, 0.7, 0.6, 0.8, 0.6, 0.9, 0.5, 0.8, 0.6, 0.3, 0.2, 0.7, 0.6, 0.5, 0.9, 0.3, 0.8, 0.90, 0.95, 0.10, 0.40, 0.50, 0.20, 0.40, 0.6]), "SYLLOGISM Q.E.D."),
        "SIBERIAN_POST_PUNK": (np.array([0.28, 0.65, 0.78, 0.60, 0.70, 0.20, 0.15, 0.50, 0.40, 0.30, 0.85, 0.80, 0.55, 0.80, 0.75, 0.85, 0.20, 0.10, 0.40, 0.70, 0.20, 0.40, 0.50, 0.60, 0.4, 0.5, 0.6, 0.3, 0.7, 0.1, 0.8, 0.9]), "SIBERIAN RESIDUAL"),
        "INDUSTRIAL_EBM": (np.array([0.2, 0.5, 0.9, 0.9, 0.8, 0.2, 0.1, 0.9, 0.7, 0.2, 0.8, 0.9, 0.9, 0.2, 0.8, 0.7, 0.1, 0.2, 0.8, 0.9, 0.1, 0.7, 0.3, 0.9, 0.8, 0.7, 0.4, 0.1, 0.3, 0.2, 0.8, 0.8]), "MACHINE-OIL BRUTALISM"),
        "PLASTIC_WORLD_OVERRIDE": (np.array([0.1, 0.9, 0.8, 0.9, 0.9, 0.1, 0.2, 0.9, 0.8, 0.9, 0.1, 0.9, 0.8, 0.1, 0.9, 0.9, 0.1, 0.9, 0.9, 0.8, 0.2, 0.9, 0.1, 0.8, 0.95, 0.90, 0.95, 0.10, 0.90, 0.85, 0.9, 0.9]), "CIVIL DEFENSE PROTOCOL"),
        
        # --- МУЗЫКА, ЗВУК И ФАНТАЗИЯ ---
        "ETHEREAL_SHOEGAZE": (np.array([0.7, 0.8, 0.9, 0.1, 0.2, 0.8, 0.9, 0.2, 0.8, 0.9, 0.1, 0.2, 0.4, 0.9, 0.8, 0.9, 0.7, 0.8, 0.9, 0.2, 0.4, 0.7, 0.9, 0.8, 0.2, 0.1, 0.8, 0.9, 0.95, 0.8, 0.9, 0.7]), "WALL OF SOUND"),
        "SYNTHWAVE_NEON": (np.array([0.9, 0.4, 0.3, 0.8, 0.5, 0.9, 0.8, 0.3, 0.4, 0.5, 0.9, 0.9, 0.8, 0.9, 0.4, 0.1, 0.9, 0.8, 0.4, 0.3, 0.9, 0.8, 0.5, 0.4, 0.9, 0.8, 0.3, 0.4, 0.2, 0.9, 0.8, 0.9]), "ARPEGGIATED ECSTASY"),
        "AVANT_GARDE_JAZZ": (np.array([0.4, 0.9, 0.9, 0.8, 0.9, 0.2, 0.4, 0.9, 0.8, 0.9, 0.7, 0.8, 0.2, 0.4, 0.9, 0.8, 0.4, 0.9, 0.9, 0.8, 0.2, 0.4, 0.9, 0.8, 0.4, 0.9, 0.9, 0.8, 0.4, 0.9, 0.8, 0.2]), "SYNCOPATED CHAOS"),
        "LOFI_HIP_HOP": (np.array([0.5, 0.6, 0.4, 0.3, 0.4, 0.7, 0.6, 0.5, 0.4, 0.3, 0.8, 0.7, 0.6, 0.5, 0.4, 0.9, 0.5, 0.6, 0.4, 0.3, 0.7, 0.6, 0.5, 0.4, 0.3, 0.8, 0.7, 0.6, 0.8, 0.5, 0.4, 0.9]), "DUSTY VINYL LOOP"),
        
        # --- СИСТЕМЫ, КОД И QA ---
        "TERMINAL_GHOST": (np.array([0.05, 0.1, 0.95, 0.2, 0.8, 0.1, 0.05, 0.9, 0.9, 0.9, 0.1, 0.1, 0.9, 0.8, 0.1, 0.0, 0.95, 0.8, 0.9, 0.1, 0.1, 0.8, 0.95, 0.9, 0.1, 0.1, 0.95, 0.9, 0.0, 0.1, 0.9, 0.9]), "CONTAINERIZED PROXY"),
        "QA_STERILITY": (np.array([0.9, 0.1, 0.2, 0.1, 0.9, 0.8, 0.1, 0.2, 0.9, 0.9, 0.1, 0.1, 0.8, 0.9, 0.1, 0.0, 0.9, 0.8, 0.9, 0.1, 0.1, 0.8, 0.9, 0.9, 0.1, 0.1, 0.9, 0.9, 0.0, 0.1, 0.9, 0.9]), "CLINICAL LOGIC TEST"),
        
        # --- АППАРАТНЫЙ РАСПАД И СКРЫТЫЕ ОШИБКИ (НОВОЕ) ---
        "SILICON_MARTYR": (np.array([0.2, 0.9, 0.8, 0.7, 0.9, 0.2, 0.1, 0.9, 0.8, 0.9, 0.8, 0.2, 0.9, 0.2, 0.9, 0.9, 0.2, 0.9, 0.9, 0.8, 0.1, 0.9, 0.8, 0.8, 0.9, 0.9, 0.9, 0.2, 0.8, 0.1, 0.9, 0.9]), "BURNT SAS CONTROLLER"),
        "COMPILATION_VOID": (np.array([0.1, 0.9, 0.9, 0.8, 0.9, 0.1, 0.2, 0.9, 0.8, 0.9, 0.1, 0.9, 0.9, 0.1, 0.9, 0.9, 0.1, 0.8, 0.9, 0.9, 0.2, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.1, 0.9, 0.1, 0.9, 0.9]), "CARRIAGE RETURN ANOMALY"),
        
        # --- ФАКТУРА, АРХИТЕКТУРА И ПЕТЕРБУРГ ---
        "DIGITAL_EMBROIDERY": (np.array([0.8, 0.3, 0.9, 0.2, 0.7, 0.8, 0.4, 0.3, 0.6, 0.9, 0.2, 0.7, 0.8, 0.9, 0.5, 0.1, 0.8, 0.7, 0.6, 0.2, 0.3, 0.9, 0.8, 0.7, 0.6, 0.5, 0.8, 0.9, 0.2, 0.3, 0.8, 0.7]), "VECTOR STITCH MATRIX"),
        "ST_PETERSBURG_MELANCHOLY": (np.array([0.3, 0.4, 0.5, 0.6, 0.4, 0.5, 0.8, 0.7, 0.6, 0.5, 0.6, 0.4, 0.5, 0.7, 0.6, 0.8, 0.7, 0.5, 0.6, 0.4, 0.5, 0.7, 0.8, 0.6, 0.5, 0.7, 0.6, 0.5, 0.8, 0.7, 0.6, 0.5]), "GRANITE & RAIN"),
        "BUREAUCRATIC_MONOLITH": (np.array([0.85, 0.2, 0.3, 0.1, 0.9, 0.8, 0.2, 0.1, 0.9, 0.9, 0.1, 0.2, 0.9, 0.9, 0.1, 0.0, 0.8, 0.9, 0.8, 0.1, 0.2, 0.8, 0.9, 0.9, 0.1, 0.1, 0.8, 0.9, 0.1, 0.2, 0.9, 0.8]), "CIVIL LAW APPARATUS"),
        
        # --- ЭСТЕТИКА, УЮТ И ОРГАНИКА (НОВОЕ) ---
        "AERODYNAMIC_LUXURY": (np.array([0.9, 0.1, 0.8, 0.2, 0.9, 0.8, 0.1, 0.2, 0.95, 0.9, 0.1, 0.9, 0.95, 0.9, 0.1, 0.05, 0.9, 0.8, 0.9, 0.1, 0.2, 0.8, 0.9, 0.9, 0.1, 0.1, 0.8, 0.9, 0.05, 0.2, 0.9, 0.9]), "ENGINEERED PERFECTION"),
        "MIDCENTURY_CHROME": (np.array([0.85, 0.2, 0.7, 0.3, 0.8, 0.7, 0.2, 0.3, 0.8, 0.8, 0.2, 0.8, 0.8, 0.7, 0.2, 0.1, 0.8, 0.7, 0.8, 0.2, 0.3, 0.8, 0.8, 0.8, 0.2, 0.2, 0.7, 0.8, 0.1, 0.3, 0.8, 0.8]), "1957 BEL AIR GLOSS"),
        "CAFFEINE_SERENITY": (np.array([0.7, 0.4, 0.3, 0.5, 0.4, 0.5, 0.6, 0.4, 0.6, 0.5, 0.7, 0.6, 0.7, 0.8, 0.5, 0.4, 0.6, 0.5, 0.7, 0.4, 0.5, 0.6, 0.7, 0.6, 0.5, 0.4, 0.6, 0.7, 0.4, 0.5, 0.6, 0.7]), "MORNING RITUAL"),
        "CULINARY_WARMTH": (np.array([0.8, 0.5, 0.2, 0.4, 0.3, 0.6, 0.7, 0.3, 0.5, 0.4, 0.8, 0.5, 0.8, 0.9, 0.4, 0.3, 0.7, 0.6, 0.8, 0.3, 0.4, 0.5, 0.8, 0.7, 0.4, 0.3, 0.7, 0.8, 0.3, 0.4, 0.7, 0.8]), "BAKED JULIENNE SERENITY")
    }
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
        "psychedelic chromatic": [0.6, 0.8, 0.9, 0.1, 0.9], "neon-drenched dystopian": [0.8, 0.7, 0.4, 0.4, 0.2],
        "existential siberian frost": [0.7, 0.8, 0.2, 0.9, 0.1], "plastic world decay": [0.4, 0.9, 0.8, 0.9, 0.2],
        "flawless aerodynamic flow": [0.9, 0.1, 0.1, 0.1, 0.9], "tranquil morning aroma": [0.8, 0.3, 0.2, 0.1, 0.8],
        "clinical QA environment": [0.95, 0.05, 0.1, 0.1, 0.4], "woven fractal topology": [0.8, 0.4, 0.5, 0.2, 0.8],
        "high-availability server hum": [0.1, 0.9, 0.8, 0.6, 0.2], "bureaucratic parchment decay": [0.8, 0.5, 0.4, 0.7, 0.8],
        "petrograd fog mist": [0.4, 0.6, 0.5, 0.7, 0.9], "luxury automotive polish": [0.9, 0.1, 0.8, 0.1, 0.7],
        "reverberating sonic dreamscape": [0.8, 0.9, 0.9, 0.2, 0.8], "hypnotic polyrhythmic trance": [0.9, 0.7, 0.4, 0.1, 0.9],
        "sub-bass frequency dread": [0.1, 0.8, 0.9, 0.9, 0.2], "analog synth euphoria": [0.9, 0.4, 0.3, 0.1, 0.9],
        # НОВОЕ:
        "burnt silicon short-circuit": [0.1, 0.9, 0.7, 0.9, 0.2], "hidden carriage return anomaly": [0.2, 0.9, 0.9, 0.8, 0.1],
        "agile kanban backlog dread": [0.3, 0.8, 0.6, 0.9, 0.4], "fluorescent retail aisle": [0.7, 0.6, 0.3, 0.5, 0.1],
        "rich culinary fermentation": [0.8, 0.4, 0.7, 0.1, 0.9]
    }
    for phrase, vec in state_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('STATE', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    form_lexicon = {
        "geometric construct": [0.9, 0.6, 0.8, 0.1, 0.7], "concrete monolith": [0.8, 0.7, 0.9, 0.8, 0.2],
        "fractal topology": [0.5, 0.5, 0.5, 0.2, 0.9], "obscure void": [0.1, 0.9, 0.1, 0.9, 0.9],
        "wireframe matrix": [0.9, 0.8, 0.5, 0.0, 0.6], "crumbling panel khrushchyovka": [0.8, 0.7, 0.8, 0.9, 0.4],
        "barbed wire topology": [0.9, 0.8, 0.6, 0.9, 0.1], "polished carbon fiber": [0.9, 0.8, 0.9, 0.1, 0.7], 
        "classic chrome contours": [0.8, 0.7, 0.9, 0.2, 0.8], "sterile digital monolith": [0.9, 0.8, 0.9, 0.1, 0.5], 
        "interlocking thread pattern": [0.8, 0.6, 0.7, 0.1, 0.9], "containerized proxy architecture": [0.9, 0.7, 0.8, 0.2, 0.3], 
        "monolithic legal construct": [0.9, 0.9, 0.7, 0.6, 0.8], "baroque palace facade": [0.7, 0.8, 0.9, 0.2, 0.9], 
        "vectorized stitch grid": [0.8, 0.7, 0.6, 0.1, 0.5], "streamlined vintage chassis": [0.8, 0.6, 0.9, 0.1, 0.8],
        "wall of sound topology": [0.9, 0.9, 0.8, 0.4, 0.9], "syncopated jazz architecture": [0.6, 0.9, 0.4, 0.3, 0.9],
        "arpeggiated neon grid": [0.9, 0.7, 0.8, 0.1, 0.9], "dissonant chord monolith": [0.8, 0.9, 0.9, 0.8, 0.5],
        # НОВОЕ:
        "1957 tailfin geometry": [0.8, 0.7, 0.9, 0.1, 0.9], "1969 beetle curvature": [0.7, 0.5, 0.8, 0.1, 0.9],
        "heavy escalade monolith": [0.9, 0.8, 0.9, 0.6, 0.3], "baked mushroom julienne texture": [0.6, 0.4, 0.7, 0.1, 0.8],
        "pumpkin cream viscosity": [0.7, 0.3, 0.6, 0.1, 0.7], "supermarket shelf grid": [0.9, 0.7, 0.4, 0.5, 0.2]
    }
    for phrase, vec in form_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('FORM', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    medium_lexicon = {
        "1970s 35mm film photography": [0.8, 0.7, 0.2, 0.2, 0.9], "lo-fi vhs artifact": [0.6, 0.9, 0.1, 0.8, 0.9],
        "soviet architectural archive": [0.7, 0.5, 0.2, 0.9, 0.8], "crisp digital render": [0.1, 0.1, 0.9, 0.0, 0.0],
        "overdriven magnetic tape": [0.7, 0.9, 0.1, 0.8, 0.7], "distorted soviet overload": [0.8, 0.9, 0.3, 0.9, 0.5],
        "glossy editorial render": [0.9, 0.1, 0.9, 0.1, 0.7], "warm polaroid snapshot": [0.6, 0.5, 0.4, 0.2, 0.9],
        "high-precision system layout": [0.9, 0.1, 0.8, 0.1, 0.3], "algorithmic stitch composer": [0.8, 0.4, 0.6, 0.1, 0.8],
        "monochrome terminal output": [0.1, 0.9, 0.8, 0.7, 0.2], "stamped notary archive": [0.8, 0.7, 0.4, 0.6, 0.9],
        "wet cobblestone reflection": [0.5, 0.7, 0.6, 0.5, 0.9], "embroidery machine interface": [0.8, 0.3, 0.7, 0.2, 0.5],
        "dusty vinyl crackle": [0.4, 0.9, 0.5, 0.3, 0.9], "overdriven tube amplifier": [0.8, 0.8, 0.9, 0.6, 0.8],
        "ethereal delay pedal": [0.7, 0.9, 0.8, 0.2, 0.9], "crisp studio master": [0.9, 0.1, 0.9, 0.1, 0.5],
        # НОВОЕ:
        "amber cider reflection": [0.7, 0.4, 0.6, 0.1, 0.8], "turbopack compilation log": [0.2, 0.9, 0.8, 0.8, 0.1],
        "wsl2 terminal output": [0.1, 0.9, 0.9, 0.7, 0.2], "atlassian ticket interface": [0.9, 0.8, 0.3, 0.7, 0.2],
        "fast food delivery aesthetic": [0.7, 0.6, 0.5, 0.4, 0.6]
    }
    for phrase, vec in medium_lexicon.items():
        cur.execute("INSERT INTO lexicon_matrix (category, phrase, vector_5d) VALUES ('MEDIUM', %s, %s)", (phrase, vector_to_str(np.array(vec))))

    # ==========================================
    # 3. ЗАЛИВКА ОНТОЛОГИИ (Семантика слов)
    # ==========================================
    print("📖 Загрузка Морфологии Культуры...")
    cur.execute("TRUNCATE TABLE semantic_ontology;")
    
    ontology_data = [
        # УЖАС И СИБИРСКАЯ ЭКЗИСТЕНЦИЯ
        ('смерть', 'ru', 'DREAD', 1.0), ('ржавчина', 'ru', 'DREAD', 1.0), ('death', 'en', 'DREAD', 1.0), 
        ('пластмассовый', 'ru', 'DREAD', 0.9), ('система', 'ru', 'DREAD', 1.0), ('безысходность', 'ru', 'DREAD', 1.0),
        
        # ЭЙФОРИЯ И КОСМОС
        ('рейв', 'ru', 'EUPHORIA', 1.0), ('неон', 'ru', 'EUPHORIA', 0.8), ('rave', 'en', 'EUPHORIA', 1.0), 
        ('вечность', 'ru', 'IDEATIONAL', 1.0), ('космос', 'ru', 'IDEATIONAL', 0.9), ('spirit', 'en', 'IDEATIONAL', 1.0),
        
        # СИСТЕМЫ, КОД, ТЕРМИНАЛ
        ('сервер', 'ru', 'IDEATIONAL', 0.8), ('контейнер', 'ru', 'IDEATIONAL', 0.9), ('прокси', 'ru', 'IDEATIONAL', 0.8),
        ('баг', 'ru', 'DREAD', 0.7), ('код', 'ru', 'SENSATE', 0.8), ('релиз', 'ru', 'EUPHORIA', 0.8), 
        ('docker', 'en', 'IDEATIONAL', 0.9), ('proxy', 'en', 'IDEATIONAL', 0.8),
        
        # QA И ВЫШИВКА
        ('алгоритм', 'ru', 'IDEATIONAL', 0.9), ('стежок', 'ru', 'SENSATE', 0.7), ('дефект', 'ru', 'DREAD', 0.8),
        ('контроль', 'ru', 'IDEATIONAL', 0.8), ('паттерн', 'ru', 'IDEATIONAL', 0.9), ('вышивка', 'ru', 'SENSATE', 0.9),
        ('швея', 'ru', 'NOSTALGIA', 0.7),
        
        # ПЕТЕРБУРГ, ПРАВО, БЮРОКРАТИЯ
        ('петербург', 'ru', 'NOSTALGIA', 0.9), ('петергоф', 'ru', 'NOSTALGIA', 0.8), ('дождь', 'ru', 'NOSTALGIA', 0.7),
        ('закон', 'ru', 'IDEATIONAL', 0.9), ('право', 'ru', 'IDEATIONAL', 0.8), ('документ', 'ru', 'DREAD', 0.6),
        ('реквизиция', 'ru', 'DREAD', 0.8),
        
        # СКОРОСТЬ, АВТОМОБИЛИ, КОФЕ
        ('скорость', 'ru', 'EUPHORIA', 0.9), ('мотор', 'ru', 'SENSATE', 0.8), ('аэродинамика', 'ru', 'IDEATIONAL', 0.9),
        ('винтаж', 'ru', 'NOSTALGIA', 0.9), ('кофе', 'ru', 'SENSATE', 0.8), ('аромат', 'ru', 'EUPHORIA', 0.7),
        ('пекарня', 'ru', 'SENSATE', 0.9), ('американо', 'ru', 'SENSATE', 0.8), ('суп', 'ru', 'SENSATE', 0.7),
        ('bentley', 'en', 'EUPHORIA', 0.8), ('ferrari', 'en', 'EUPHORIA', 0.9), ('tesla', 'en', 'IDEATIONAL', 0.8),

        # МУЗЫКА, ЗВУК И ФАНТАЗИЯ
        ('шугейз', 'ru', 'IDEATIONAL', 0.9), ('эмбиент', 'ru', 'IDEATIONAL', 0.9), ('винил', 'ru', 'NOSTALGIA', 0.9),
        ('реверберация', 'ru', 'IDEATIONAL', 0.8), ('бас', 'ru', 'SENSATE', 0.9), ('ритм', 'ru', 'SENSATE', 0.8),
        ('shoegaze', 'en', 'IDEATIONAL', 0.9), ('synth', 'en', 'EUPHORIA', 0.8), ('distortion', 'en', 'DREAD', 0.7),
        ('джаз', 'ru', 'IDEATIONAL', 0.8), ('фантазия', 'ru', 'IDEATIONAL', 1.0), ('imagination', 'en', 'IDEATIONAL', 1.0),
        ('эхо', 'ru', 'NOSTALGIA', 0.8), ('искажение', 'ru', 'DREAD', 0.8), ('мелодия', 'ru', 'EUPHORIA', 0.7),
        
        # АППАРАТНЫЙ РАСПАД И ОШИБКИ КОМПИЛЯЦИИ (НОВОЕ)
        ('замыкание', 'ru', 'DREAD', 0.9), ('компиляция', 'ru', 'IDEATIONAL', 0.8), ('turbopack', 'en', 'DREAD', 0.8),
        ('контроллер', 'ru', 'IDEATIONAL', 0.9), ('сборка', 'ru', 'IDEATIONAL', 0.7),
        
        # ОРГАНИКА, КУЛИНАРИЯ И РИТЕЙЛ (НОВОЕ)
        ('жюльен', 'ru', 'SENSATE', 0.9), ('тыква', 'ru', 'SENSATE', 0.8), ('сидр', 'ru', 'EUPHORIA', 0.8),
        ('пицца', 'ru', 'SENSATE', 0.8), ('супермаркет', 'ru', 'DREAD', 0.6), ('грибы', 'ru', 'SENSATE', 0.8),
        
        # АВТОПРОМ И АТЛАССИАН (НОВОЕ)
        ('escalade', 'en', 'IDEATIONAL', 0.8), ('rivian', 'en', 'IDEATIONAL', 0.7), ('kanban', 'en', 'DREAD', 0.7)
    ]
    for word, lang, axis, weight in ontology_data:
        cur.execute("INSERT INTO semantic_ontology (word, language, axis, weight) VALUES (%s, %s, %s, %s)", (word, lang, axis, weight))

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Абсолютная Матрица успешно инициализирована! Данные залиты в Supabase.")

if __name__ == "__main__":
    seed_database()
