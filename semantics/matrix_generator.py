import numpy as np
import os
import time

GLOVE_FILE = "glove.6B.100d.txt"

# 1. НАШ ФИЗИЧЕСКИЙ ЛЕКСИКОН (Матрица P: 5 x N)
# Формат: [Энергия, Хаос, Тон, Структура, Симметрия]
LEXICON = {
    'dark': np.array([0.2, 0.5, 0.6, 0.4, 0.5]),
    'noise': np.array([0.5, 0.8, 0.0, 0.8, 0.3]),
    'vintage': np.array([0.4, 0.7, 0.1, 0.5, 0.6]),
    'neon': np.array([0.6, 0.6, 0.8, 0.6, 0.5]),
    'minimal': np.array([0.8, 0.2, 0.0, 0.1, 0.8]),
    'aesthetic': np.array([0.6, 0.4, 0.5, 0.4, 0.6]),
    'grunge': np.array([0.3, 0.9, 0.15, 0.8, 0.4]),
    'cinematic': np.array([0.4, 0.5, 0.55, 0.5, 0.7]),
    'ethereal': np.array([0.8, 0.1, 0.7, 0.2, 0.6]),
    'portrait': np.array([0.5, 0.3, 0.1, 0.3, 0.9]),
    'architecture': np.array([0.6, 0.4, 0.0, 0.9, 0.9])
}

# Тестовые слова, которых нет в нашей базе. Алгоритм угадает их физику сам!
TEST_WORDS = ['vampire', 'technology', 'water', 'cyberpunk', 'melancholy']

def load_glove_subset(filepath, required_words, test_words):
    print(f"[*] Чтение файла {filepath} (может занять 5-10 секунд)...")
    embeddings = {}
    target_words = set(required_words).union(set(test_words))
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                values = line.split()
                word = values[0]
                if word in target_words:
                    # Собираем 100 координат для слова
                    embeddings[word] = np.asarray(values[1:], dtype='float32')
    except Exception as e:
        print(f"[!] Ошибка при чтении файла: {e}")
        return None
        
    print(f"[+] Найдено {len(embeddings)} нужных слов из {len(target_words)}.")
    return embeddings

def main():
    if not os.path.exists(GLOVE_FILE):
        print(f"[!] Ошибка: Файл '{GLOVE_FILE}' не найден.")
        print(f"Текущая папка: {os.getcwd()}")
        return

    start_time = time.time()
    glove_data = load_glove_subset(GLOVE_FILE, LEXICON.keys(), TEST_WORDS)
    
    if not glove_data:
        return

    # 2. ФОРМИРОВАНИЕ МАТРИЦ
    S_cols = []
    P_cols = []

    for word in LEXICON.keys():
        if word in glove_data:
            S_cols.append(glove_data[word])
            P_cols.append(LEXICON[word])
        else:
            print(f"[!] Внимание: Базовое слово '{word}' не найдено в словаре!")

    # Транспонируем векторы, чтобы они стали столбцами
    S = np.column_stack(S_cols) # Матрица 100 x 11
    P = np.column_stack(P_cols) # Матрица 5 x 11

    print(f"[*] Размерность матрицы Смысла (S): {S.shape}")
    print(f"[*] Размерность матрицы Физики (P): {P.shape}")

    # 3. ВЫЧИСЛЕНИЕ ПСЕВДООБРАТНОЙ МАТРИЦЫ (Moore-Penrose)
    print("[*] Вычисление проекции W = P * S^+ ...")
    S_plus = np.linalg.pinv(S)
    W = np.dot(P, S_plus) 

    print(f"[+] Матрица Проекции W успешно вычислена! Размерность: {W.shape}")
    
    # 4. ТЕСТИРОВАНИЕ МАГИИ (Zero-Shot Prediction)
    print("\n" + "="*40)
    print(" ТЕСТ: ИЗОМОРФИЗМ В ДЕЙСТВИИ")
    print("="*40)
    for word in TEST_WORDS:
        if word in glove_data:
            semantic_vector = glove_data[word]
            
            # Вся суть проекта в одной строке: умножаем 100D смысл на матрицу проекции
            predicted_tensor = np.dot(W, semantic_vector)
            
            # Обрезаем от 0.0 до 1.0 (законы физики Оракула)
            predicted_tensor = np.clip(predicted_tensor, 0.0, 1.0)
            
            print(f"Слово: '{word.upper()}'")
            print(f"Тензор: [E:{predicted_tensor[0]:.2f} C:{predicted_tensor[1]:.2f} H:{predicted_tensor[2]:.2f} ST:{predicted_tensor[3]:.2f} SY:{predicted_tensor[4]:.2f}]\n")
        else:
            print(f"Слово: '{word}' не найдено в словаре.\n")

    print("="*40)
    print(f"Время выполнения: {time.time() - start_time:.2f} сек.\n")

    # 5. ГЕНЕРАЦИЯ КОДА ДЛЯ ОРАКУЛА
    print("--- СКОПИРУЙ ЭТОТ КОД В oracle.py ---")
    np.set_printoptions(formatter={'float_kind':lambda x: f"{x:.4f}"})
    
    # Конвертируем в список для безопасного копирования без обрывов строк
    w_list = W.tolist()
    print("import numpy as np")
    print("PROJECTION_MATRIX = np.array([")
    for row in w_list:
        formatted_row = "[" + ", ".join([f"{val:.4f}" for val in row]) + "],"
        print(f"    {formatted_row}")
    print("])")

if __name__ == "__main__":
    main()