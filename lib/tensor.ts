// lib/tensor.ts
// Архитектура Неизведанного: Перевод акустики в чистую математику.

export class SonicTensor {
  // Золотое сечение — основа эстетики и пропорций
  private readonly phi: number = 1.618033988749; 
  
  constructor(
    public energy: number,   // [0.0 - 1.0] Интенсивность (вычисляется из тегов/запроса)
    public valence: number,  // [0.0 - 1.0] Эмоциональный окрас (боль/радость)
    public bpm: number       // Темп
  ) {}

  private get angularFrequency(): number {
    return (this.bpm / 60) * Math.PI; 
  }

  // Генерация базовой палитры через тригонометрию
  public generateQuantumPalette(): [number, number, number] {
    const omega = this.angularFrequency;
    const t = this.energy * this.phi; 

    const r = 128 + 127 * Math.sin(omega * t + this.energy);
    const g = 128 + 127 * Math.sin(omega * t * this.phi + this.valence);
    const b = 128 + 127 * Math.sin(omega * t / this.phi - this.valence);

    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  public getHexColor(): string {
    const [r, g, b] = this.generateQuantumPalette();
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  public calculateEntropy(): number {
    return Number((this.energy * Math.abs(Math.cos(this.valence * Math.PI))).toFixed(4));
  }

  // Резонансная Глубина (Сходящийся бесконечный ряд)
  public calculateInfiniteResonance(harmonics: number = 12): number {
    let sum = 0;
    const x = this.valence * Math.PI;

    for (let n = 1; n <= harmonics; n++) {
      const term = (Math.pow(-1, n + 1) / n) * Math.sin(x * n * this.energy);
      sum += term;
    }
    
    return Number(Math.abs(sum).toFixed(4));
  }

  // Вектор Трансцендентности (The Page Gesture - Прорыв четвертой стены)
  public calculateTranscendenceVector(depth: number): number {
    const entropy = this.calculateEntropy();
    // Использование формулы Эйлера
    const T = (depth * entropy) / this.phi * Math.abs(Math.cos(Math.PI) + 2);
    return Number(T.toFixed(4));
  }
}

// Вспомогательная функция для генерации псевдослучайных, 
// но детерминированных значений на основе текстового запроса
export function generateHeuristicsFromText(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const absHash = Math.abs(hash);
  const energy = (absHash % 100) / 100; 
  const valence = ((absHash >> 2) % 100) / 100;
  const bpm = 60 + (absHash % 120); // от 60 до 180 BPM

  return { energy, valence, bpm };
}
