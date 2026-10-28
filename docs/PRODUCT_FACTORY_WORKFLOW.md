# Fábrica Interna de Produtos (`Product Factory Workflow`)

Este documento descreve o fluxo oficial para criarmos, testarmos e publicarmos novos produtos 3D paramétricos dentro do **STLTools**.

> **Objetivo do Processo**: Permitir que um novo produto personalizável (ex: *Suporte de Headset com Nome*, *Caixa Organizadora Gridfinity*, *Marcador de Página 3D*, *Troféu Personalizado*) seja criado em **menos de 10 minutos**, sem tocar em nenhuma linha de código da interface (React), visualizador 3D ou calculadora de custos.

---

## 1. Visão Geral da Arquitetura Plug-and-Play

Na nossa plataforma, **todo produto é um módulo isolado** dentro de `src/models/<slug>/` que exporta um objeto `ProductModule`:

```text
src/models/<slug>/
└── index.ts       # Contém o Schema (parâmetros, partes, metadados) + a função generate(params)
```

Quando você registra esse módulo em `src/models/registry.ts`, o sistema faz **automaticamente**:
1. Cria o card na Vitrine Principal (`/`) com categoria, busca, badge de destaque e preço em créditos.
2. Cria a rota dedicada `/models/<slug>` com SEO configurável.
3. Lê a lista `schema.params` e constrói todos os sliders, caixas de texto, seletores de fontes, seletores de ícones, upload de SVG e regras condicionais (`visible_if`).
4. Lê a lista `schema.parts` e cria os seletores de cor de filamento para cada parte da peça (ex: `Cor do Corpo`, `Cor do Nome`).
5. Executa a função `generate(params)` a cada alteração do usuário, renderiza as peças coloridas no **Visualizador 3D** (`ModelViewport`), calcula o **Volume ($\text{cm}^3$), Área ($\text{cm}^2$), Peso ($g$) e Preço de Venda** na **Calculadora de Custos** e habilita o download em **`.STL`**, **`.ZIP` (peças separadas)** e **`.3MF` (multimaterial)**.

---

## 2. Como Criar um Novo Modelo (Passo a Passo)

### Passo 1: Rodar o Gerador CLI Interno
No terminal, na raiz do projeto, execute:

```bash
npm run new:model <slug-do-produto> "Nome do Produto" "categoria"
# Exemplo:
npm run new:model suporte-controle "Suporte de Controle Gamer" "suportes"
```

O script [`scripts/new-model.mjs`](file:///home/joao/Documents/www/stltools/scripts/new-model.mjs) irá:
1. Criar a pasta `src/models/suporte-controle/index.ts` já preenchida com um template funcional documentado.
2. Registrar automaticamente o modelo no arquivo `src/models/registry.ts`.

### Passo 2: Definir os Parâmetros (`schema.params`)
No arquivo gerado `src/models/<slug>/index.ts`, você define os controles que aparecerão para o usuário:

| Tipo (`type`) | Controle Gerado na UI | Propriedades Principais |
| :--- | :--- | :--- |
| `'string'` | Input de texto (ex: Nome, Marca, Telefone) | `default`, `maxLength`, `placeholder`, `visibleIf` |
| `'number'` | Slider + Input numérico (mm, graus, etc.) | `default`, `min`, `max`, `step`, `unit`, `visibleIf` |
| `'enum'` | Botões segmentados ou Select dropdown | `default`, `options: [{ value, label }]`, `visibleIf` |
| `'font'` | Seletor visual de Fontes 3D | `default` (ex: `'Bebas Neue'`, `'Pacifico'`, `'Righteous'`) |
| `'boolean'` | Switch Liga/Desliga | `default`, `visibleIf` |
| `'svg'` | Galeria de Ícones + Upload de SVG/PNG | `default`, `visibleIf` |
| `'color'` | Seletor de Cor de Filamento (Preview) | `default`, `previewOnly: true` |

#### Regra Condicional (`visibleIf`):
Você pode mostrar um controle apenas quando outro tiver determinado valor:
- `visibleIf: "estilo=encaixe"` (mostra apenas se `estilo` for `encaixe`)
- `visibleIf: "arte=texto|ambos"` (mostra se `arte` for `texto` OU `ambos`)
- `visibleIf: "furo_carregador=true"` (mostra se o booleano `furo_carregador` estiver ativo)

---

### Passo 3: Escrever a Geometria usando as "Super-Primitivas" (`src/engine/`)
Em vez de lidar com vértices ou matemática bruta, nossa função `generate(params)` usa os blocos de montagem de alto nível em `src/engine/cad.ts`:

#### A. Operações 2D (Polígonos com Contornos e Furos)
- **`await textToPolygons(texto, fonte, alturaMm)`**: Converte qualquer texto usando a fonte `.ttf` escolhida em polígonos 2D centralizados na origem `(0, 0)`.
- **`svgToPolygons(svgString, targetSizeMm)`**: Converte qualquer `<svg>` em polígonos 2D escalados para `targetSizeMm`.
- **`shapeGalleryToPolygons(shapeName, sizeMm)`**: Retorna formas prontas da galeria (`'coracao'`, `'estrela'`, `'osso'`, `'circulo'`, `'escudo'`, `'urso'`, `'gato'`, `'patinha'`, `'seta'`, etc.).
- **`qrToPolygons(textoUrlOuPix, sizeMm)`**: Gera os quadradinhos 2D de um QR Code real e funcional.
- **`roundedRectPolygon(width, height, radius)`**: Retângulo com cantos arredondados.
- **`circlePolygon(radius, segments)`**: Círculo ou polígono regular (hexágono, octógono).

#### B. A Mágica do Offset e Booleanos 2D (`clipper2`)
- **`offsetPolygons(polys, deltaMm, joinType)`**:
  - `deltaMm > 0`: Expande o desenho criando uma borda suave ao redor (usado para base de chaveiros, topos de bolo, margem de cortadores).
  - `deltaMm < 0`: Encolhe o desenho (usado para esvaziar letras-caixa ou criar chanfros internos).
- **`unionPolygons(polyA, polyB)`**: Junta duas formas 2D (ex: junta a bolha do texto com a argola do chaveiro!).
- **`subtractPolygons(polyBase, polyCut)`**: Fura um polígono 2D (ex: cria o furo da argola, cria o rebaixo com folga `offsetPolygons(nome, +0.25)` na letra inicial, ou cria a parede fina do cortador de biscoito `subtractPolygons(offset(p, 1.2), p)`!).

#### C. Extrusão e Operações 3D
- **`extrudePolygons(polys, { height, zOffset, bevel })`**: Transforma qualquer conjunto de polígonos 2D (com furos internos preservados!) num sólido 3D `BufferGeometry` fechado (*manifold*).
- **`extrudeProfileAlongX(profile2D, widthX)`**: Extruda um perfil lateral 2D ao longo do eixo X (perfeito para criar **Suportes de Celular em L**, ganchos de parede, abraçadeiras e suportes de fone!).
- **`mergeGeometries([geom1, geom2, ...])`**: Combina múltiplos sólidos 3D numa única peça.
- **`transformGeometry(geom, { translate, rotate, scale })`**: Posiciona ou rotaciona a peça no espaço 3D (ex: inclinar o logo na face de 28° do suporte de celular!).

---

## 3. Usando IA para Gerar Novos Modelos (Prompt Padrão)

Sempre que você quiser criar um produto novo usando IA (aqui no Antigravity ou em qualquer LLM), basta usar o prompt abaixo:

```markdown
Crie um novo produto paramétrico no STLTools seguindo o padrão de `src/models/<slug>/index.ts`.
O produto é: [DESCREVA O PRODUTO, ex: Suporte de Parede para Headset com Nome e Logo].
Parâmetros desejados: [LISTE OS SLIDERS/TEXTOS].
Peças separadas por cor (`parts`): [ex: corpo, texto].
Use as funções de `src/engine/cad.ts` (`roundedRectPolygon`, `textToPolygons`, `offsetPolygons`, `subtractPolygons`, `extrudePolygons`, `extrudeProfileAlongX`, `transformGeometry`) e registre em `src/models/registry.ts`.
```

---

## 4. Oficina Visual Interna (`/oficina`)

Além do CLI, criamos uma página interna na plataforma chamada **Oficina de Modelos (`/oficina`)**:
- Mostra o inventário técnico de todos os modelos registrados no catálogo, quantidade de parâmetros, partes coloridas, status de validação da malha e um gerador interativo de código boilerplate (`index.ts`) para novos produtos.
