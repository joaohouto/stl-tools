# Guia do Desenvolvedor & LLM: Como Criar Novos Modelos Paramétricos no STLTools

Este documento contém todas as especificações técnicas, padrões de arquitetura e exemplos de código para criar e plugar novos geradores paramétricos de produtos 3D no **STLTools**.

---

## 1. Arquitetura dos Modelos Paramétricos

Cada produto paramétrico do catálogo é um módulo TypeScript isolado que implementa a interface `ProductModule` de `@/engine/types`.

Um módulo exporta um objeto com:
- **`schema`**: Metadados do modelo, formulário dinâmico de parâmetros (`params`) e definição das partes para fatiador (`parts`).
- **`generate(params)`**: Função assíncrona que executa as operações booleanas e de extrusão 2D/3D no cliente/servidor e retorna as geometrias `THREE.BufferGeometry` acompanhadas da ficha técnica.

### Localização no Projeto
- Cada modelo vive em `src/models/<slug-do-modelo>/index.ts`.
- Todos os modelos são registrados no array `PRODUCT_MODULES` em `src/models/registry.ts`.

---

## 2. Estrutura Padrão de um `ProductModule`

```typescript
import * as THREE from 'three';
import { ProductModule, GeneratedPartMesh } from '@/engine/types';
import {
  textToPolygons,
  shapeGalleryToPolygons,
  offsetPolygons,
  unionPolygons,
  subtractPolygons,
  extrudePolygons,
  getBounds2D,
} from '@/engine/cad';

export const meuProdutoModule: ProductModule = {
  schema: {
    id: 'meu-produto',
    name: 'Nome do Produto',
    shortDescription: 'Descrição curta de uma linha para o card.',
    description: 'Explicação detalhada exibida na página de customização.',
    categories: ['chaveiros', 'acessorios'],
    featured: false,
    free: true,
    creditCost: 1,
    addedAt: '2026-10-31',
    params: [
      {
        name: 'texto',
        label: 'Nome / Texto',
        type: 'string',
        default: 'JOÃO',
        maxLength: 20,
        group: 'Personalização',
      },
      {
        name: 'fonte',
        label: 'Fonte',
        type: 'font',
        default: 'Lilita One',
        group: 'Personalização',
      },
      {
        name: 'altura',
        label: 'Altura (mm)',
        type: 'number',
        default: 20,
        min: 10,
        max: 60,
        step: 1,
        group: 'Medidas',
      },
      {
        name: 'cor_base',
        label: 'Cor da Base',
        type: 'color',
        default: '#1e293b',
        previewOnly: true,
      },
      {
        name: 'cor_texto',
        label: 'Cor do Texto',
        type: 'color',
        default: '#ffffff',
        previewOnly: true,
      },
    ],
    parts: [
      { name: 'base', label: 'Base Principal', colorParam: 'cor_base' },
      { name: 'texto', label: 'Texto em Relevo', colorParam: 'cor_texto' },
    ],
  },

  async generate(params) {
    const texto = String(params.texto || 'JOÃO');
    const fonte = String(params.fonte || 'Lilita One');
    const altura = Number(params.altura || 20);
    const corBase = String(params.cor_base || '#1e293b');
    const corTexto = String(params.cor_texto || '#ffffff');

    // 1. Gera geometria 2D do texto
    const textPolys = await textToPolygons(texto, fonte, altura);

    // 2. Gera contorno/base
    const basePolys = offsetPolygons(textPolys, 3.0, 'round');

    // 3. Extruda em 3D
    const baseGeom = extrudePolygons(basePolys, { height: 3.0, zOffset: 0 });
    const textGeom = extrudePolygons(textPolys, { height: 1.5, zOffset: 3.0 });

    const bounds = getBounds2D(basePolys);

    const parts: GeneratedPartMesh[] = [
      { name: 'base', label: 'Base Principal', geometry: baseGeom, color: corBase },
      { name: 'texto', label: 'Texto em Relevo', geometry: textGeom, color: corTexto },
    ];

    return {
      parts,
      fichaTecnica: {
        title: 'Medidas Finais',
        items: [
          { label: 'Largura', value: `${bounds.width.toFixed(1)} mm` },
          { label: 'Altura', value: `${bounds.height.toFixed(1)} mm` },
          { label: 'Espessura', value: '4.5 mm' },
        ],
      },
    };
  },
};
```

---

## 3. Tipos de Parâmetros Suportados no `schema.params`

| Tipo | Descrição | Exemplo |
| :--- | :--- | :--- |
| `'string'` | Campo de texto (ou textarea se `maxLength >= 35`) | `{ name: 'texto', type: 'string', default: 'Maria' }` |
| `'number'` | Slider interativo com input numérico síncrono | `{ name: 'altura', type: 'number', min: 10, max: 50, step: 1 }` |
| `'enum'` | Dropdown `<select>` de opções | `{ name: 'modo', type: 'enum', options: [{ value: 'a', label: 'Opção A' }] }` |
| `'boolean'` | Checkbox liga/desliga | `{ name: 'borda', type: 'boolean', default: true }` |
| `'font'` | Dropdown `<select>` de fontes tipográficas | `{ name: 'fonte', type: 'font', default: 'Pacifico' }` |
| `'shape'` | Grade de formas da galeria de ícones | `{ name: 'icone', type: 'shape', default: 'coracao' }` |
| `'svg'` | Upload de arquivo SVG ou conversão automática de PNG/JPG | `{ name: 'desenho_svg', type: 'svg', default: '' }` |
| `'color'` | Paleta de cor de filamento para visualização e exportação 3MF | `{ name: 'cor_base', type: 'color', default: '#3b82f6', previewOnly: true }` |

### Condições de Visibilidade (`visibleIf`)
- **Igualdade**: `visibleIf: 'tipo_conteudo=apenas_icone'`
- **Múltiplos valores (OU)**: `visibleIf: 'tipo_conteudo=texto_icone|apenas_texto'`
- **Desigualdade**: `visibleIf: 'tipo_conteudo!=apenas_icone'`
- **Condições Compostas (E)**: `visibleIf: 'tipo_conteudo=texto_icone&tipo_icone=galeria'`

---

## 4. Biblioteca de Operações CAD (`@/engine/cad`)

O arquivo `src/engine/cad.ts` fornece utilitários robustos de geometria 2D e 3D:

1. **`textToPolygons(text, fontId, heightMm)`**:
   - Converte texto (inclusive acentuado e multilinha) em contornos 2D normalizados.
2. **`shapeGalleryToPolygons(shapeId, sizeMm)`**:
   - Retorna polígonos de formas nativas (`coracao`, `estrela`, `osso`, `circulo`, `hexágono`, `escudo`, `patinha`, `ursinho`, `gatinho`, `coroa`, `gamer`, `raio`).
3. **`svgToPolygons(svgContent, targetSizeMm)`**:
   - Parser SVG com suporte a curvas cúbicas/quadráticas e arcos elípticos (`A`/`a`).
4. **`offsetPolygons(polys, deltaMm, join)`**:
   - Expansão (`delta > 0`) ou contração (`delta < 0`) suave de polígonos via Clipper2.
5. **`unionPolygons(...polys)` / `subtractPolygons(subj, clip)` / `intersectPolygons(subj, clip)`**:
   - Operações booleanas 2D perfeitas e normalizadas.
6. **`extrudePolygons(polys, { height, zOffset })`**:
   - Extruda anéis 2D para malha tridimensional fechada (*manifold*) com paredes laterais e tampas superior/inferior trianguladas por earcut.
7. **`mergeGeometries(geometries)` / `transformGeometry(geometry, opts)`**:
   - Combina e transforma malhas do Three.js (rotações, translações e escalas).

---

## 5. Boas Práticas e Regras Críticas para Impressão 3D (FDM)

1. **Malhas Fechadas (Manifold)**:
   - Todas as geometrias geradas devem ser sólidas, sem faces abertas, buracos ou vértices duplicados não conectados.
2. **Evite Double-Offsets Consecutivos em Texto**:
   - Aplicar `offset(+D)` seguido imediatamente de `offset(-D)` em fontes cursivas (como Pacifico) corta curvas bezier e gera serrilhados/dentes. Em vez disso, use a geometria de texto limpa diretamente ou um único offset positivo uniforme.
3. **Orientação de Mesa de Impressão**:
   - Desenhe as peças para apoiar com a face mais ampla na mesa ($Z = 0$), minimizando a necessidade de suportes de impressão.
4. **Tolerâncias de Encaixe**:
   - Para partes impressas que se encaixam (ex: tampa e caixa, ou nome encaixado em letra), use folgas entre $0.20\text{ mm}$ e $0.35\text{ mm}$.
5. **Registro Obrigatório**:
   - Sempre adicione o novo módulo em `src/models/registry.ts` dentro do array `PRODUCT_MODULES`.
