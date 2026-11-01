import opentype from 'opentype.js';

export interface FontMeta {
  id: string;
  name: string;
  file: string;
  styleNote: string;
}

export const AVAILABLE_FONTS: FontMeta[] = [
  { id: 'Montserrat', name: 'Montserrat', file: '/fonts/Montserrat-Bold.ttf', styleNote: 'Geométrica Moderna Limpa (Ideal para Marcas e Nomes)' },
  { id: 'Bebas Neue', name: 'Bebas Neue', file: '/fonts/BebasNeue-Regular.ttf', styleNote: 'Alta e Forte (Ideal para Suportes e Placas)' },
  { id: 'Righteous', name: 'Righteous', file: '/fonts/Righteous-Regular.ttf', styleNote: 'Geométrica Arredondada (Ideal para Chaveiros)' },
  { id: 'Anton', name: 'Anton', file: '/fonts/Anton-Regular.ttf', styleNote: 'Impacto Ultra Espessa (Ideal para Letra-Caixa)' },
  { id: 'Pacifico', name: 'Pacifico', file: '/fonts/Pacifico-Regular.ttf', styleNote: 'Cursiva Conectada (Ideal para Nomes e Topos de Bolo)' },
  { id: 'Lobster', name: 'Lobster', file: '/fonts/Lobster-Regular.ttf', styleNote: 'Caligráfica Clássica (Ideal para Letra com Nome)' },
  { id: 'Lilita One', name: 'Lilita One', file: '/fonts/LilitaOne-Regular.ttf', styleNote: 'Cartoon Gordinha (Ideal para Cortadores e Pets)' },
  { id: 'Bangers', name: 'Bangers', file: '/fonts/Bangers-Regular.ttf', styleNote: 'Quadrinhos / Gamer' },
  { id: 'Cinzel', name: 'Cinzel', file: '/fonts/Cinzel-Bold.ttf', styleNote: 'Romana Imperial Elegante (Ideal para Anéis e Monogramas)' },
  { id: 'Fredoka', name: 'Fredoka', file: '/fonts/Fredoka-Bold.ttf', styleNote: 'Amigável & Infantil (Ideal para Ponteiras e Lápis)' },
  { id: 'Oswald', name: 'Oswald', file: '/fonts/Oswald-Bold.ttf', styleNote: 'Industrial Condensada (Robusta para Engenharia)' },
  { id: 'Permanent Marker', name: 'Permanent Marker', file: '/fonts/PermanentMarker-Regular.ttf', styleNote: 'Marcador Manual Urbano / Street' },
  { id: 'Press Start 2P', name: 'Press Start 2P', file: '/fonts/PressStart2P-Regular.ttf', styleNote: 'Retro Pixel 8-Bit (Gamer & Geek)' },
];

const fontCache = new Map<string, opentype.Font>();

export async function loadFont(fontId: string): Promise<opentype.Font> {
  const found = AVAILABLE_FONTS.find((f) => f.id === fontId) || AVAILABLE_FONTS[0];
  if (fontCache.has(found.id)) {
    return fontCache.get(found.id)!;
  }

  let buffer: ArrayBuffer;
  if (typeof window === 'undefined') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', found.file);
    const nodeBuf = await fs.readFile(filePath);
    buffer = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);
  } else {
    const res = await fetch(found.file);
    if (!res.ok) {
      throw new Error(`Falha ao carregar a fonte ${found.name}`);
    }
    buffer = await res.arrayBuffer();
  }

  const font = opentype.parse(buffer);
  fontCache.set(found.id, font);
  return font;
}
