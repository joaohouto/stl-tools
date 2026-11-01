# Backlog de Tarefas — STLTools (TODOS)

Status: Concluído (100% dos itens implementados e verificados).

---

## 1. Ponteira de Lápis (`ponteira-lapis`) — Eliminação do Pixelamento no Túnel Interno
- [x] **Geometria 100% Lisa sem Fatiamento Stepped**:
  - Eliminado o fatiamento discreto em camadas que criava efeito pixelado / escadinha nas paredes internas do recorte.
  - Implementada geometria lisa contínua através de prisma analítico longitudinal (`extrudeProfileAlongX`) para recorte circular (`cilindro`), sextavado (`hexagono`) e `triangulo`, garantindo paredes internas 100% lisas.

---

## 2. Chaveiro com Contorno (`chaveiro-contorno`) — Lapidação Completa do Algoritmo de Contorno
- [x] **Refatoração Estrutural do Contorno "Bolha"**:
  - Corrigido bug na comparação de vértices duplicados (`Clipper.stripDuplicates`) do `clipper2-js` e adicionada deduplicação estrita (`cleanRing64` / `pushPtDedup`), eliminando 100% das rachaduras internas ("Maria") e espigões ("JOÃO").
  - Geração de contorno suave, uniforme e esteticamente harmonioso em todas as fontes (serifadas, cursivas e geométricas).

---

## 3. Posicionamento da Argola (Chaveiros e Pingente Pet)
- [x] **Chaveiro com Contorno (`chaveiro-contorno`)**:
  - Corrigido o posicionamento da argola via raycasting real na silhueta externa (`intersectHorizontalLine` / `intersectVerticalLine`) e união com cápsula arredondada (`capsulePolygon`), eliminando cantos quadrados soltos nos 4 cantos e centralizando verticalmente na letra externa em `esquerda`/`direita`.
- [x] **Tag / Pingente Pet (`tag-pet`)**:
  - Argola centralizada em `x = 0` no topo do pingente com ponte capsular suave até o vale central do osso/coração.

---

## 4. Biblioteca de Ícones com Phosphor Icons
- [x] **Integração de SVGs do Phosphor Icons**:
  - Substituídos todos os ícones da galeria de formas (`PHOSPHOR_SHAPE_SVGS`, `BUILTIN_SHAPES`, `ShapeSelect`) pelos SVGs oficiais do Phosphor Icons (`viewBox="0 0 256 256"`), sem emojis.

---

## 5. Padronização Global de Selects (Padrão Shadcn UI)
- [x] **Substituição de Todos os `<select>` Nativos**:
  - Criado `CustomSelect.tsx` no padrão Shadcn UI e substituídos todos os `<select>` nativos em `SchemaForm.tsx`, `CostSummaryWidget.tsx` e `calculadora/page.tsx`.

---

## 6. Cor de Base Padrão: Azul em Todos os Modelos
- [x] **Paleta Padrão Unificada**:
  - Atualizado o valor default da cor de base em todos os 11 modelos do catálogo para azul (`#2563eb`).

---

## 7. Remoção de Modelo do Catálogo
- [x] **Remover Chaveiro Apoio Celular de Bolso (`chaveiro-suporte-celular`)**:
  - Removido do catálogo, `registry.ts`, diretórios de modelos e previews estáticos.

---

## 8. Carimbo Marcador de Biscoito / Pasta Americana (`cortador-carimbo`)
- [x] **Transformar em Apenas Carimbo Marcador (Remodelação Completa)**:
  - Remodelado exclusivamente como Carimbo Marcador com corpo ergonômico em 3 níveis (cintura côncava), abas laterais de extração, borda de enquadramento opcional e espelhamento automático para impressão em massas.

---

## 9. Suporte de Celular (`suporte-celular-marca`) — Novo Design Moderno
- [x] **Remodelação Visual**:
  - Remodelado como Dock Unibody Arquitetônico em L com berço elevado para passagem do cabo USB-C, chanfros suaves e suporte real a `baixo_relevo` e `alto_relevo` na fachada frontal.

---

## 10. Anel Paramétrico (`anel-personalizado`) — Fatiamento e Baixo-Relevo
- [x] **Correção da Malha para Fatiadores (Slicers)**:
  - Malha reconstruída como não-indexada, 100% soldada na costura (`(t + 1) % numTheta`), apoiada em `Z >= 0`, com soldagem de vértices no exportador `.3MF` e cálculo exato de normais no `.STL`.
- [x] **Correção do Baixo-Relevo**:
  - Entalhe booleano real (`subtractPolygons`) na mesa superior do anel.

---

## 11. Importação de SVGs Complexos (`logo-curso.svg`)
- [x] **Parser de SVG Multi-Caminhos Aprimorado (`svgToPolygons`)**:
  - Limpeza de blocos invisíveis (`<clipPath>`, `<defs>`, `<mask>`, `<style>`), suporte a até 600 elementos `<path>` com arcos elípticos (`A`/`a`) e curvas quadráticas suaves (`T`/`t`), normalização individual `EvenOdd` + união global `NonZero` e simplificação RDP invariante à escala.
