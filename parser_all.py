import subprocess
import json
import time
import random
import urllib.request
import urllib.parse
import re
from datetime import datetime

# ============================================================
# НАСТРОЙКИ
# ============================================================

SUPABASE_URL = "https://kefdjxsmyarwfqqkfgcx.supabase.co"
SUPABASE_KEY = "sb_publishable_DHa5G0bhPLWJWNrACLVEUw_2GZS4BMc"

# Ключи для API
UNSPLASH_KEY = "_69IV3HDkFCXBXL7CQapxjfygVVtsNr-QUUTMUVR-0Y"
PEXELS_KEY = "cUWG1Ljcq5MZKPZCdgIDk0JRvhS7ept2Kg0AlbOmosp9dDzaklJfJCCE"
PIXABAY_KEY = "56418849-ca0e6712154d147d1a5c18e9a"

# ============================================================
# КАТЕГОРИИ (300+)
# ============================================================

CATEGORIES = [
    # Природа
    "nature", "forest", "ocean", "mountain", "lake", "river", "waterfall",
    "sunset", "sunrise", "sky", "clouds", "rain", "snow", "storm", "aurora",
    "desert", "canyon", "valley", "meadow", "garden", "flowers", "trees",
    "leaves", "seasons", "spring", "summer", "autumn", "winter", "ice",
    "glacier", "volcano", "beach", "island", "reef", "coral", "waves",
    
    # Города и архитектура
    "city", "street", "skyscraper", "bridge", "castle", "temple", "church",
    "cathedral", "mosque", "pagoda", "museum", "library", "park", "fountain",
    "square", "alley", "village", "town", "metropolis", "skyline", "nightlife",
    "architecture", "modern", "ancient", "ruins", "monument", "statue",
    
    # Животные
    "animals", "wildlife", "birds", "cats", "dogs", "horses", "elephants",
    "tigers", "lions", "bears", "foxes", "wolves", "deer", "rabbits",
    "squirrels", "owls", "eagles", "hawks", "parrots", "butterflies",
    "bees", "dolphins", "whales", "sharks", "octopus", "jellyfish",
    "snakes", "lizards", "frogs", "turtles", "penguins", "polar bears",
    
    # Еда
    "food", "pizza", "pasta", "sushi", "cake", "coffee", "tea", "wine",
    "fruit", "vegetables", "bread", "cheese", "chocolate", "ice cream",
    "dessert", "breakfast", "lunch", "dinner", "barbecue", "seafood",
    "steak", "burger", "fries", "tacos", "burrito", "ramen", "curry",
    
    # Искусство
    "art", "painting", "sculpture", "drawing", "sketch", "graffiti",
    "street art", "modern art", "classic art", "renaissance", "impressionism",
    "cubism", "surrealism", "abstract", "portrait", "landscape art",
    "digital art", "watercolor", "oil painting", "charcoal", "pastel",
    
    # Музыка
    "music", "musician", "guitar", "piano", "drums", "violin", "trumpet",
    "saxophone", "bass", "band", "orchestra", "concert", "festival",
    "rock", "jazz", "classical", "hiphop", "electronic", "acoustic",
    
    # Кино
    "movies", "cinema", "film", "hollywood", "actor", "actress", "director",
    "movie poster", "film scene", "animation", "documentary", "oscars",
    
    # Знаменитости
    "celebrity", "athlete", "musician", "actor", "artist", "inventor",
    "scientist", "leader", "royalty", "historical figure", "icon",
    
    # Мода
    "fashion", "style", "outfit", "runway", "model", "fashion photography",
    "vintage", "street fashion", "haute couture", "accessories",
    
    # Технологии
    "technology", "computer", "phone", "robot", "drone", "car", "train",
    "plane", "ship", "spacecraft", "innovation", "future", "coding",
    
    # Космос
    "space", "astronaut", "planet", "star", "galaxy", "nebula", "nasa",
    "universe", "black hole", "telescope", "moon", "mars",
    
    # Культура
    "culture", "traditional", "tribal", "ethnic", "ceremony", "festival",
    "celebration", "dance", "costume", "mask", "ritual",
    
    # Религия
    "religion", "buddha", "jesus", "hindu", "temple", "church", "mosque",
    "meditation", "prayer", "sacred", "spiritual",
    
    # Мемы и юмор
    "memes", "funny", "comedy", "comic", "cartoon", "humor",
    
    # Аниме
    "anime", "manga", "cosplay", "japanese", "studio ghibli",
    
    # Люди
    "people", "smile", "eyes", "hands", "dance", "yoga", "run", "swim",
    "portrait", "street portrait", "family", "couple", "child", "elder",
    
    # Путешествия
    "travel", "adventure", "destination", "tourism", "vacation",
    "road trip", "camping", "hiking", "explore", "wanderlust"
]

# ============================================================
# ИСТОЧНИКИ
# ============================================================

def fetch_unsplash(query, limit=5):
    """Unsplash API"""
    try:
        url = f"https://api.unsplash.com/search/photos?query={urllib.parse.quote(query)}&per_page={limit}&client_id={UNSPLASH_KEY}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode())
            return [p['urls']['regular'] for p in data.get('results', [])]
    except:
        return []

def fetch_pexels(query, limit=5):
    """Pexels API"""
    try:
        url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(query)}&per_page={limit}"
        req = urllib.request.Request(url, headers={"Authorization": PEXELS_KEY})
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode())
            return [p['src']['large'] for p in data.get('photos', [])]
    except:
        return []

def fetch_pixabay(query, limit=5):
    """Pixabay API"""
    try:
        url = f"https://pixabay.com/api/?key={PIXABAY_KEY}&q={urllib.parse.quote(query)}&per_page={limit}&image_type=photo"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode())
            return [p['largeImageURL'] for p in data.get('hits', [])]
    except:
        return []

def fetch_pinterest(query, limit=5):
    """Pinterest парсинг"""
    try:
        url = f"https://www.pinterest.com/search/pins/?q={urllib.parse.quote(query)}"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            html = res.read().decode()
        images = re.findall(r'https://i\.pinimg\.com/[^"\']+\.(?:jpg|jpeg|png)', html)
        unique = []
        for img in images:
            if '150x150' not in img and '236x' not in img and img not in unique:
                unique.append(img)
        return unique[:limit]
    except:
        return []

def fetch_wikimedia(query, limit=5):
    """Wikimedia Commons"""
    try:
        url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&srwhat=image&srlimit={limit}&format=json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode())
            results = data.get('query', {}).get('search', [])
            urls = []
            for item in results:
                title = urllib.parse.quote(item['title'].replace(' ', '_'))
                urls.append(f"https://commons.wikimedia.org/wiki/Special:FilePath/{title}")
            return urls
    except:
        return []

def fetch_picsum(query, limit=5):
    """Picsum заглушки"""
    urls = []
    for i in range(limit):
        urls.append(f"https://picsum.photos/seed/{query}_{i}_{int(time.time())}/400/300")
    return urls

# ============================================================
# ПРОВЕРКА ДУБЛИКАТОВ
# ============================================================

def check_duplicate(src):
    """Проверяет, есть ли уже такая картинка в базе"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/images?src=eq.{urllib.parse.quote(src)}&select=id"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        })
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            return len(data) > 0
    except:
        return False

# ============================================================
# СОХРАНЕНИЕ В SUPABASE
# ============================================================

def save_image(src, title, category, source):
    """Сохраняет картинку в Supabase (без дубликатов)"""
    try:
        # Проверяем дубликат
        if check_duplicate(src):
            return False
        
        data = json.dumps({
            "src": src,
            "title": title,
            "category": category,
            "source": source,
            "author": source,
            "author_avatar": "",
            "created_at": datetime.now().isoformat()
        })
        
        cmd = [
            "curl", "-X", "POST",
            f"{SUPABASE_URL}/rest/v1/images",
            "-H", f"apikey: {SUPABASE_KEY}",
            "-H", f"Authorization: Bearer {SUPABASE_KEY}",
            "-H", "Content-Type: application/json",
            "-H", "Prefer: return=minimal",
            "-d", data,
            "--insecure", "-s"
        ]
        
        subprocess.run(cmd, capture_output=True)
        return True
    except:
        return False

# ============================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================================

def main():
    print("=" * 60)
    print("🚀 СУПЕР-ПАРСЕР — 6 ИСТОЧНИКОВ (БЕЗ ДУБЛИКАТОВ)")
    print("=" * 60)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📂 Категорий: {len(CATEGORIES)}")
    print(f"📸 Источников: 6 (Unsplash, Pexels, Pixabay, Pinterest, Wikimedia, Picsum)")
    print("=" * 60)
    
    total = 0
    skipped = 0
    sources = [
        ("unsplash", fetch_unsplash),
        ("pexels", fetch_pexels),
        ("pixabay", fetch_pixabay),
        ("pinterest", fetch_pinterest),
        ("wikimedia", fetch_wikimedia),
        ("picsum", fetch_picsum)
    ]
    
    for category in CATEGORIES:
        print(f"\n📸 КАТЕГОРИЯ: {category}")
        print("-" * 40)
        
        for source_name, fetcher in sources:
            try:
                urls = fetcher(category, limit=3)
                for url in urls:
                    if url and url.startswith('http'):
                        if save_image(url, category, category, source_name):
                            total += 1
                            print(f"  ✅ {source_name}: {url[:60]}...")
                        else:
                            skipped += 1
                time.sleep(0.3)
            except Exception as e:
                print(f"  ❌ {source_name}: ошибка")
        
        time.sleep(random.uniform(1, 3))
        print(f"  ⏳ Пауза...")
    
    print("\n" + "=" * 60)
    print(f"✅ ГОТОВО!")
    print(f"   📊 Сохранено: {total} новых картинок")
    print(f"   ⏩ Пропущено (дубликаты): {skipped}")
    print("=" * 60)

if __name__ == "__main__":
    main()