# STLTools — Catálogo Paramétrico 3D & Calculadora de Custos

Plataforma web profissional em **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Three.js (`@react-three/fiber`)** para modelagem paramétrica instantânea no navegador e geração de arquivos prontos para manufatura aditiva (`.STL`, `.ZIP` por componentes e `.3MF` multimaterial) com **Calculadora de Custos e Precificação Integrada** e **Vetorizador de Imagem para SVG**.

---

## Identidade Visual & UX

- **Tema Dark Moderno**: Paleta em preto fosco com cor de destaque **Laranja Vibrante (`#f97316` / `#ea580c`)** e peças em contraste branco.
- **Ícones**: Padronização completa com **Phosphor Icons (`@phosphor-icons/react`)**.
- **Controles Avançados de Tipografia**: Ajuste de kerning (espaçamento entre caracteres), line-height, escala e peso de fonte em todos os modelos com texto.
- **Renders 3D Realistas**: Previews gerados via Z-buffer sem dependência de canvas externo, iluminação de estúdio e sem artefatos de sombreamento artificial.
- **SEO & Performance**: OpenGraph completo, metadados dinâmicos para subdomínio (`stl.joaocouto.com`), `sitemap.xml`, `robots.txt` e favicon dinâmico via `icon.tsx`.

---

## Catálogo de Modelos Paramétricos (`src/models/`)

1. **`suporte-celular-marca`**: Suporte Minimalista Flutuante para Celular com perfil em V invertido/trapézio suspenso, berço com gancho de altura ajustável, passagem de cabo USB-C e personalização em alto/baixo-relevo.
2. **`chaveiro-contorno`**: Chaveiro com contorno suave contínuo ("bolha"), ícones Phosphor ou upload de imagem/SVG, opção de QR Code 3D escaneável e posicionamento de argola em 7 pontos.
3. **`keycard-holder`**: Porta-Crachá & Cartão Rígido (padrão CR80/RFID) de perfil tático com travas angulares, alça para cordão (topo ou lateral) e fundo customizável com texto/logo.
4. **`caixa-com-tampa`**: Caixa Organizadora Paramétrica com tampa de encaixe calibrada e personalizável (retangular, redonda ou hexagonal).
5. **`tampa-stanley-jug`**: Coroa Bipartida para Tampa de Stanley Jug com texto circular paramétrico com raio, espaçamento e curvatura ajustáveis.
6. **`cortador-carimbo`**: Carimbo Marcador com placa limpa e handle/cabo ergonômico sextavado desmontável para encaixe firme e apoio de pressão em massas, biscoitos e argila.
7. **`placa-personalizada`**: Plaquinhas de balcão e sinalização com **QR Code 3D real escaneável** (Pix, Wi-Fi, Redes Sociais).
8. **`letreiro-3d-mesa`**: Nome 3D com fundo contornado, pedestal de mesa ou hastes para topo de bolo.
9. **`letra-com-nome`**: Inicial decorativa de mesa em grande escala com nome em relevo atravessado na frente e encaixes sob medida.
10. **`letra-caixa-led`**: Letra-Caixa Luminosa com corpo oco, canais para fita LED, tampa difusora de encaixe e cálculo de metragem de LED.
11. **`ponteira-lapis`**: Enfeite de lápis/caneta com nome em relevo e furo passante horizontal de ponta a ponta com seção transversal exata (redonda, sextavada ou triangular).
12. **`tag-pet`**: Pingente de identificação pet nos formatos Osso, Coração, Medalha e Escudo com nome e telefone.
13. **`anel-personalizado`**: Anel anatômico paramétrico nas medidas da tabela oficial brasileira (aros 10 a 35) com brasão, monograma ou baixo-relevo entalhado.
14. **`organizador-mesa`**: Gaveteiro/organizador de mesa com divisórias ajustáveis em colunas e linhas.

---

## Ferramentas Integradas

- **Calculadora de Custos de Impressão 3D (`/calculadora`)**:
  - Cálculo exato de massa por Decomposição Casca + Infill.
  - Custos de energia, desgaste da impressora, depreciação, mão de obra e taxa de falhas.
  - Precificação com margem de lucro e reversão de taxas de marketplace (Shopee e Mercado Livre).
  - Inputs amigáveis com edição fluida sem coerção forçada para zero.
  - Widget compacto integrado na coluna lateral de todos os modelos do catálogo.
- **Vetorizador de Imagem para SVG (`/imagem-para-svg`)**:
  - Conversão instantânea de PNG/JPG/WebP em traçados SVG limpos para uso direto nos modelos 3D.

---

## Documentação Técnica & Arquitetura

1. **[`/docs/PRODUCT_FACTORY_WORKFLOW.md`](file:///home/joao/Documents/www/stltools/docs/PRODUCT_FACTORY_WORKFLOW.md)**: Manual da Fábrica de Modelos e uso das Super-Primitivas CAD (`src/engine/cad.ts`).
2. **[`/docs/PROCESS_AND_IDEAS.md`](file:///home/joao/Documents/www/stltools/docs/PROCESS_AND_IDEAS.md)**: Fórmulas matemáticas, cálculo de comissões e padrões DFAM (Design for Additive Manufacturing).
3. **[`/TODOS.md`](file:///home/joao/Documents/www/stltools/TODOS.md)**: Registro de entregas concluídas e backlog das próximas inovações (incluindo o Workflow de Letreiros Gigantes de Parede).

---

## Como Executar Localmente

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Executar build de produção
pnpm build

# Criar um novo modelo de produto no catálogo automaticamente
pnpm run new:model <slug-do-produto> "Nome do Produto" "categoria"
```
