# Documento de Processos, Regras de Negócio & Ideias Evolutivas (`PROCESS_AND_IDEAS.md`)

Este documento registra todas as **"ideias de processo"**, fórmulas matemáticas, convenções de engenharia e decisões de negócio da plataforma **STLTools**.
Ele foi estruturado para que possamos revisar, calibrar ou alterar qualquer processo no futuro com total clareza de onde cada regra vive no código.

---

## 1. Processo de Cálculo de Custos e Precificação 3D

**Onde mora no código**: [`src/engine/meshMetrics.ts`](file:///home/joao/Documents/www/stltools/src/engine/meshMetrics.ts) e [`src/components/calculator/`](file:///home/joao/Documents/www/stltools/src/components/calculator/)

### 1.1. Como funciona hoje (Processo Atual)
1. **Extração Geométrica Real**:
   - Toda peça gerada (ou arquivo `.stl` enviado pelo usuário) tem seu **Volume Sólido Total ($V_{\text{total}}$ em $\text{cm}^3$)** e **Área Superficial ($A_{\text{total}}$ em $\text{cm}^2$)** calculados diretamente dos triângulos da malha 3D.
2. **Modelo Físico de Fatiamento (Casca + Infill)**:
   - Como uma peça impressa em FDM não é 100% maciça, usamos um modelo de duas zonas:
     - **Zona 1 — Casca Sólida (Paredes + Camadas de Topo/Base)**:
       Calculada como $V_{\text{casca}} = \min(V_{\text{total}}, A_{\text{cm}^2} \times (\text{Perímetros} \times 0,04\text{ cm}) \times 0,82)$.
     - **Zona 2 — Preenchimento Interno (Infill)**:
       Calculada sobre o volume restante: $V_{\text{infill}} = \max(0, V_{\text{total}} - V_{\text{casca}}) \times (\text{Infill\%} / 100)$.
   - **Peso Estimado ($g$)**: $(V_{\text{casca}} + V_{\text{infill}}) \times \text{Densidade do Material}$.
3. **Estimativa Automática de Tempo de Impressão**:
   - Quando o usuário está personalizando um modelo ao vivo (antes de abrir no fatiador), estimamos o tempo pela **Vazão Volumétrica Efetiva Média** (considerando retrações, viagens e primeira camada lenta):
     - Perfil *Rápida (CoreXY - Bambu A1/P1S, Creality K1)*: $\approx 9,5\text{ mm}^3/\text{s}$ efetivos.
     - Perfil *Padrão (Ender 3 V3 / Prusa MK4)*: $\approx 5,5\text{ mm}^3/\text{s}$ efetivos.
     - Perfil *Detalhada / Chaveiros Finos (Bico 0.2/0.4 lento)*: $\approx 3,5\text{ mm}^3/\text{s}$ efetivos.
4. **Fórmula de Precificação Multi-Canal**:
   - $\text{Custo Base} = \text{Filamento} + \text{Energia} + \text{Depreciação Máquina} + \text{Taxa de Falha} + \text{Embalagem/Argola}$.
   - **Preço Venda Direta**: $\text{Custo Base} \times (1 + \text{Markup\%})$.
   - **Preço Marketplace (Shopee / Mercado Livre)**:
     $$\text{Preço Marketplace} = \frac{\text{Preço Venda Direta} + \text{Taxa Fixa por Item}}{1 - \text{Comissão\%}}$$
     *(Isso garante que, após o marketplace descontar a porcentagem e a taxa fixa de R$ 4,00 ou R$ 6,00, sobre exatamente o mesmo lucro líquido da venda direta!)*

### 1.2. Como podemos evoluir/alterar depois
- **Ideia A (Calibração por Tipo de Produto)**: Adicionar um fator `printSpeedMultiplier` no `schema` de cada produto (ex: cortadores de biscoito imprimem apenas paredes contínuas rápidas, enquanto chaveiros multi-cor têm trocas de filamento no AMS).
- **Ideia B (Custo de Troca de Cor / Torre de Purga AMS)**: Quando o produto tiver mais de 1 parte colorida (`parts.length > 1`), adicionar na calculadora um toggle *"Impressão Multicor (AMS) vs. Troca por Altura de Camada"*, somando o peso do *poop/purga* de filamento!
- **Ideia C (Parser de G-Code / `.gcode.3mf`)**: Permitir arrastar o arquivo `.gcode` já fatiado no Bambu Studio/OrcaSlicer para ler o peso e o tempo exatos do cabeçalho do G-Code.

---

## 2. Processo de Design para Impressão Sem Suporte (DFAM — *Design for Additive Manufacturing*)

**Onde mora no código**: Dentro de cada gerador em [`src/models/<slug>/index.ts`](file:///home/joao/Documents/www/stltools/src/models/)

### 2.1. Regras de Ouro que seguimos nos nossos Modelos
1. **Zero Suportes (*Support-Free*)**:
   - Todo modelo do catálogo deve ser projetado para sair da mesa de impressão pronto para uso, sem suportes que deixam marcas feias.
   - **Exemplo Prático (`suporte-celular-marca`)**: No modo `"Montado"`, o suporte aparece em pé no visualizador 3D para o usuário admirar seu logo. Mas no modo `"Como Imprime"` (ou no STL individual), a peça pode ser impressa deitada de lado (extrusão em X) ou com encosto angulado autoportante!
2. **Folga Paramétrica Exposta (`folga` / Clearance)**:
   - Impressoras diferentes têm calibrações de fluxo diferentes (uma Bambu Lab A1 encaixa peças com `0.18mm` de folga, enquanto uma Ender 3 pode precisar de `0.30mm`).
   - **Processo**: Todo modelo que tiver encaixe de peças (como `letra-com-nome`, `letra-caixa-led` ou `suporte-celular-marca` no estilo encaixe em X) **sempre expõe um slider `folga` (padrão `0.25mm`)** para o usuário ter controle total sem precisar remodelar a peça!
3. **Separação de Cores por Peça (`parts`)**:
   - Mesmo quem tem impressora de 1 única cor consegue imprimir nossos modelos em 2 cores:
     - **Por Pausa em Camada (Color Change at Layer)**: Em chaveiros, placas e suportes, a base vai de $Z = 0$ até $Z = \text{espessura\_base}$, e o texto/logo vai de $Z = \text{espessura\_base}$ até o topo.
     - **Por Encaixe Separado**: Em letras com nome e letras-caixa, cada cor é um arquivo STL independente que se encaixa mecanicamente.

---

## 3. Processo de Fontes Tipográficas e Vetorização de Imagens

**Onde mora no código**: [`public/fonts/`](file:///home/joao/Documents/www/stltools/public/fonts/), [`src/engine/fontManager.ts`](file:///home/joao/Documents/www/stltools/src/engine/fontManager.ts) e [`src/app/imagem-para-svg/`](file:///home/joao/Documents/www/stltools/src/app/imagem-para-svg/)

### 3.1. Curadoria de Fontes para Impressão 3D
Nem toda fonte serve para impressão 3D (fontes com serifas finíssimas de `< 0.4mm` não são fatiadas por um bico de `0.4mm`).
- **Processo Atual**: Mantemos uma lista de fontes homologadas em `public/fonts/` com traços fortes e excelente geometria para extrusão 3D (`Bebas Neue`, `Anton`, `Righteous`, `Pacifico`, `Lobster`, `Lilita One`, `Orbitron`, `Roboto Mono`).
- **Como adicionar novas fontes depois**: Basta colocar o arquivo `.ttf` em `public/fonts/` e adicionar o nome no array `AVAILABLE_FONTS` em `src/engine/fontManager.ts`. Todos os produtos do catálogo passam a ter a nova fonte instantaneamente!

### 3.2. Conversão de Imagem / Logo (PNG/JPG → SVG → 3D)
- **Processo Atual**: Construímos um motor de vetorização client-side (`/imagem-para-svg` e integrado ao upload de qualquer produto) que recebe qualquer imagem ou logo, aplica limiarização adaptativa (threshold), remoção de fundo claro/escuro, suavização e extração de contornos (`marching squares` + simplificação Douglas-Peucker) convertendo para `<svg>` limpo na hora.
- **Como podemos evoluir depois**: Podemos plugar um modelo ONNX (`@imgly/background-removal`) ou `vtracer-wasm` caso queiramos vetorização multicor de fotos complexas com separação automática em até 8 camadas.

---

## 4. Ideias de Processo para Monetização, SEO e Crescimento Futuro

Embora o sistema atual rode 100% liberado para uso e criação, a arquitetura já foi pensada para plugar os seguintes processos de negócio quando você decidir monetizar:

1. **SEO Programático de Templates (`/templates/[hash]`)**:
   - Cada combinação de parâmetros de um produto pode ser salva num JSON curto (ou querystring Base64 URL-safe `?p=...`).
   - Podemos gerar centenas de landing pages automáticas no Sitemap (ex: *"Cortador de Biscoito Formato Dinossauro"*, *"Suporte de Celular Personalizado para Restaurante"*, *"Letra com Nome Maria para Decoração"*, *"Placa QR Code Pix Balcão"*).
2. **Geração de "Kit de Venda" para Makers (`/models/[slug]/kit`)**:
   - Muitos usuários da plataforma são donos de lojas na Shopee/Eelo7/Instagram que vendem peças impressas, mas não têm tempo de fotografar cada nome.
   - **Ideia de Processo**: Criar um botão **"Baixar Foto para Anúncio (Mockup)"** que tira um snapshot em alta resolução do canvas Three.js com fundo de madeira/estúdio para o maker postar direto no catálogo dele!
3. **Sistema de Créditos / Planos (Freemium)**:
   - O preview 3D e a calculadora de custos continuam 100% gratuitos (como isca de tráfego e retenção).
   - O botão de download verifica o plano do usuário (com idempotência por hash dos parâmetros: se o usuário baixar o mesmo chaveiro duas vezes, só desconta 1 vez).
