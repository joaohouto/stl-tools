import { ProductModule, ProductCategory, ParamDefinition } from '@/engine/types';
import { setTypographyContext } from '@/engine/cad';
import { suporteCelularMarcaModule } from './suporte-celular-marca';
import { chaveiroContornoModule } from './chaveiro-contorno';
import { letraComNomeModule } from './letra-com-nome';
import { letreiro3dMesaModule } from './letreiro-3d-mesa';
import { letraCaixaLedModule } from './letra-caixa-led';
import { cortadorCarimboModule } from './cortador-carimbo';
import { placaPersonalizadaModule } from './placa-personalizada';
import { tagPetModule } from './tag-pet';
import { organizadorMesaModule } from './organizador-mesa';
import { anelPersonalizadoModule } from './anel-personalizado';
import { ponteiraLapisModule } from './ponteira-lapis';
import { portaCartaoModule } from './porta-cartao';
import { caixaComTampaModule } from './caixa-com-tampa';
import { tampaStanleyJugModule } from './tampa-stanley-jug';

function withTypographyControls(mod: ProductModule): ProductModule {
  const fontParamIdx = mod.schema.params.findIndex((p) => p.type === 'font');
  if (fontParamIdx === -1) return mod;

  const fontParam = mod.schema.params[fontParamIdx];
  const existingNames = new Set(mod.schema.params.map((p) => p.name));
  const extraParams: ParamDefinition[] = [];

  if (!existingNames.has('peso_fonte')) {
    extraParams.push({
      name: 'peso_fonte',
      label: 'Peso / Espessura da Fonte (mm)',
      type: 'number',
      default: 0,
      min: -0.3,
      max: 0.8,
      step: 0.05,
      group: fontParam.group,
      visibleIf: fontParam.visibleIf,
    });
  }

  if (!existingNames.has('kerning_fonte') && !existingNames.has('espacamento_letras')) {
    extraParams.push({
      name: 'kerning_fonte',
      label: 'Kerning / Espaçamento Letras (mm)',
      type: 'number',
      default: 0,
      min: -2.0,
      max: 5.0,
      step: 0.2,
      group: fontParam.group,
      visibleIf: fontParam.visibleIf,
    });
  }

  if (
    !existingNames.has('altura_linha_fonte') &&
    mod.schema.id !== 'tampa-stanley-jug' &&
    mod.schema.id !== 'anel-personalizado'
  ) {
    extraParams.push({
      name: 'altura_linha_fonte',
      label: 'Altura de Linha (Line Height)',
      type: 'number',
      default: 1.15,
      min: 0.8,
      max: 1.8,
      step: 0.05,
      group: fontParam.group,
      visibleIf: fontParam.visibleIf,
    });
  }

  const enrichedParams = [
    ...mod.schema.params.slice(0, fontParamIdx + 1),
    ...extraParams,
    ...mod.schema.params.slice(fontParamIdx + 1),
  ];

  const origGenerate = mod.generate.bind(mod);

  return {
    ...mod,
    schema: {
      ...mod.schema,
      params: enrichedParams,
    },
    async generate(params) {
      setTypographyContext({
        kerning: Number(params.kerning_fonte ?? 0),
        weight: Number(params.peso_fonte ?? 0),
        lineHeight: Number(params.altura_linha_fonte ?? 1.15),
      });
      try {
        return await origGenerate(params);
      } finally {
        setTypographyContext({ kerning: 0, weight: 0, lineHeight: 1.15 });
      }
    },
  };
}

const RAW_PRODUCT_MODULES: ProductModule[] = [
  suporteCelularMarcaModule,
  tampaStanleyJugModule,
  chaveiroContornoModule,
  portaCartaoModule,
  caixaComTampaModule,
  anelPersonalizadoModule,
  ponteiraLapisModule,
  letraComNomeModule,
  letraCaixaLedModule,
  cortadorCarimboModule,
  placaPersonalizadaModule,
  letreiro3dMesaModule,
  tagPetModule,
  organizadorMesaModule,
];

export const PRODUCT_MODULES: ProductModule[] = RAW_PRODUCT_MODULES.map(withTypographyControls);

export const CATEGORY_LABELS: Record<ProductCategory | 'all', string> = {
  all: 'Todos',
  suportes: 'Suportes',
  chaveiros: 'Chaveiros',
  acessorios: 'Acessórios',
  letreiros: 'Letreiros',
  cortadores: 'Carimbos',
  placas: 'Placas',
  pets: 'Pets',
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
