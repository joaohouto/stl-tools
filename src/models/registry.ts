import { ProductModule, ProductCategory } from '@/engine/types';
import { suporteCelularMarcaModule } from './suporte-celular-marca';
import { chaveiroSuporteCelularModule } from './chaveiro-suporte-celular';
import { chaveiroContornoModule } from './chaveiro-contorno';
import { letraComNomeModule } from './letra-com-nome';
import { letreiro3dMesaModule } from './letreiro-3d-mesa';
import { letraCaixaLedModule } from './letra-caixa-led';
import { cortadorCarimboModule } from './cortador-carimbo';
import { placaPersonalizadaModule } from './placa-personalizada';
import { tagPetModule } from './tag-pet';
import { organizadorMesaModule } from './organizador-mesa';

export const PRODUCT_MODULES: ProductModule[] = [
  suporteCelularMarcaModule,
  chaveiroSuporteCelularModule,
  chaveiroContornoModule,
  letraComNomeModule,
  letraCaixaLedModule,
  cortadorCarimboModule,
  placaPersonalizadaModule,
  letreiro3dMesaModule,
  tagPetModule,
  organizadorMesaModule,
];

export const CATEGORY_LABELS: Record<ProductCategory | 'all', string> = {
  all: 'Todos os Produtos',
  suportes: 'Suportes & Celular',
  chaveiros: 'Chaveiros & Brindes',
  letreiros: 'Letreiros & Topos',
  cortadores: 'Cortadores & Carimbos',
  placas: 'Placas & QR Pix',
  pets: 'Linha Pet',
  organizacao: 'Organização',
};

export function getProductBySlug(slug: string): ProductModule | undefined {
  return PRODUCT_MODULES.find((m) => m.schema.id === slug);
}

export function getDefaultParams(mod: ProductModule): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const p of mod.schema.params) {
    defaults[p.name] = p.default;
  }
  return defaults;
}
