# STLTools — Catálogo Paramétrico 3D & Calculadora de Custos

Plataforma web em **Next.js (App Router) + TypeScript + Tailwind CSS + Three.js (`@react-three/fiber`)** para geração instantânea de produtos 3D personalizados prontos para impressão (`.STL`, `.ZIP` por cor e `.3MF` multimaterial) com **Calculadora de Custos e Precificação Integrada**.

---

## Documentação do Projeto

Toda a arquitetura, engenharia reversa e processos internos estão documentados nos arquivos abaixo:

1. **[`/PLAN.md`](file:///home/joao/Documents/www/stltools/PLAN.md)**: Plano mestre de arquitetura, síntese da engenharia reversa e especificação técnica dos motores.
2. **[`/docs/PRODUCT_FACTORY_WORKFLOW.md`](file:///home/joao/Documents/www/stltools/docs/PRODUCT_FACTORY_WORKFLOW.md)**: Manual completo da **Fábrica Interna de Produtos** (como criar novos modelos em minutos via CLI `pnpm run new:model` ou na página `/oficina`, e como usar as Super-Primitivas 2D/3D em `src/engine/cad.ts`).
3. **[`/docs/PROCESS_AND_IDEAS.md`](file:///home/joao/Documents/www/stltools/docs/PROCESS_AND_IDEAS.md)**: Documento vivo com todas as **"Ideias de Processo"** (fórmula matemática da calculadora de custos com Casca + Infill, cálculo reverso de comissões Shopee/Mercado Livre, padrões DFAM para impressão sem suporte e roadmap de monetização/SEO).

---

## Como Executar

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Criar um novo modelo de produto no catálogo automaticamente
pnpm run new:model <slug-do-produto> "Nome do Produto" "categoria"
```

---

## Geradores Paramétricos Incluídos no Catálogo (`src/models/`)

1. **`suporte-celular-marca`**: Suporte de Mesa para Celular Personalizado (Clássico em L ou Encaixe em X desmontável, com Texto, Fonte, Logo SVG/PNG, ajuste de ângulo, vão para capinha e passagem de cabo carregador).
2. **`chaveiro-suporte-celular`**: Chaveiro Apoio de Celular de Bolso personalizado com nome/marca.
3. **`chaveiro-contorno`**: Chaveiro Personalizado com contorno automático ("bolha"), ícone da galeria ou SVG próprio e furo de argola.
4. **`letra-com-nome`**: Inicial grande de mesa com nome atravessado na frente e rebaixo de encaixe sem cola (`folga` ajustável).
5. **`letra-caixa-led`**: Letra-Caixa Luminosa com corpo oco, furo para fio LED, tampa difusora de encaixe e **Ficha Técnica automática de metros de fita LED**.
6. **`cortador-carimbo`**: Fábrica de Cortadores de Biscoito/Argila com lâmina chanfrada, aba de pressão (flange) e Carimbo Marcador com pegador.
7. **`placa-personalizada`**: Plaquinhas de Porta, Sinalização e Display de Balcão com **QR Code 3D real escaneável (Pix / Wi-Fi / Instagram)**.
8. **`letreiro-3d-mesa`**: Nome 3D com fundo contornado, pedestal de mesa ou hastes para **Topo de Bolo**.
9. **`tag-pet`**: Pingente de identificação Pet nos formatos Osso, Coração, Medalha e Escudo com nome e telefone.
10. **`organizador-mesa`**: Caixa organizadora sob medida com grade configurável de divisórias (colunas × linhas) e etiqueta frontal em relevo.
