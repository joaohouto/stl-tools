# Backlog de Tarefas — STLTools (TODOS)

Status do Projeto: Ativo — Catálogo com 14 modelos paramétricos funcionais, Calculadora de Custos Pro, Vetorizador e novos workflows em desenvolvimento.

---

## Entregas Recentes Concluídas (v0.3 - v0.5)

- [x] **Enfeite de Lápis / Caneta (`ponteira-lapis`)**:
  - Furo passante contínuo de ponta a ponta com geometria lisa analítica (`extrudeProfileAlongX`) para formatos circular, sextavado (grafite tradicional) e triangular.
- [x] **Suporte de Celular Flutuante (`suporte-celular-marca`)**:
  - Design arquitetônico em V invertido / trapézio aberto com berço suspenso, slider de controle de altura do gancho frontal, saída traseira ergonômica para passagem de cabo USB-C e cantos arredondados contínuos.
- [x] **Keycard Holder / Porta-Crachá Rígido (`keycard-holder`)**:
  - Modelo para cartões padrão CR80 com travas elásticas anguladas, argola configurável (topo ou lateral) e relevo de texto/logo no fundo.
- [x] **Carimbo Marcador com Handle / Cabo Encaixável (`cortador-carimbo`)**:
  - Remoção de orelhas e adição de cabo ergonômico separado com pino sextavado de encaixe firme para suporte de pressão em massas, biscoitos e argila.
- [x] **Caixa Organizadora com Tampa (`caixa-com-tampa`)**:
  - Caixa paramétrica (retangular, cilíndrica ou hexagonal) com tampa de encaixe calibrada (`folga` de impressão) e personalização.
- [x] **Personalização de Tampa de Stanley Jug (`tampa-stanley-jug`)**:
  - Coroa bipartida (superior/inferior) com diâmetro milimétrico calibrado para a tampa original da garrafa e gerador de texto circular paramétrico com raio e curvatura ajustáveis.
- [x] **Chaveiro com Contorno & QR Code (`chaveiro-contorno`)**:
  - Integração de QR Code 3D escaneável com alto/baixo relevo e contorno suave ("bolha") com cantos harmônicos.
- [x] **Tipografia & Fontes Expandidas**:
  - Inclusão da fonte **Montserrat** e controles de kerning (letter-spacing), line-height e pesos de fonte para textos paramétricos.
- [x] **Padronização Visual & Ícones**:
  - Migração de todos os ícones para **Phosphor Icons (`@phosphor-icons/react`)**.
  - Brand color atualizada para **Laranja Vibrante (`#f97316` / `#ea580c`)** com modelos com base laranja e detalhes em branco por padrão.
  - Redesenho da Home: remoção de footer dos cards, tags de categoria de palavra única e previews Z-buffer 3D realistas sem drop shadow artificial.
- [x] **Calculadora de Custos Integrada**:
  - UX aprimorada nos inputs numéricos permitindo apagar valores livremente sem coerção imediata para 0.
  - Widget compacto inserido na coluna lateral direita da página de personalização do modelo com botão de expansão para a calculadora completa.
- [x] **SEO & Estrutura Web**:
  - Metadados completos para o domínio `joaocouto.com` (`stl.joaocouto.com`), geração dinâmica de `icon.tsx`, `sitemap.xml` e `robots.txt`.

---

## 12. [NOVO] Workflow / Gerador de Letreiros Gigantes para Parede (Multi-Placas / Ender 3 & Bambu)

> **Contexto & Visão**:
> Utilizar o know-how acumulado no app em manipulação poligonal (`clipper2-js`), tipografia com OpenType e exportação 3D para criar um gerador/workflow dedicado a **Letreiros Grandes de Parede** (nomes de bebês, logotipos corporativos, frases decorativas, placas de consultório e numerais de fachada).
> 
> Uma única letra (ex: letra "A") poderá ocupar a área útil inteira da mesa de impressão de uma **Ender 3 (220×220mm)** ou de impressoras similares (256×256mm). O usuário digita a frase ou palavra, define o tamanho total na parede (ou altura por letra), e a aplicação decompõe, gera as geometrias individuais com encaixes/gabarito e exporta tudo separado para impressão imediata.

### Especificações & Arquitetura Proposta:

#### A. Dimensionamento Bidirecional Inteligente
- [ ] **Modo 1: Por Altura de Letra (Base da Mesa de Impressão)**:
  - O usuário define a altura da letra maiúscula (ex: 180mm a 220mm, maximizando a mesa da Ender 3). O app calcula automaticamente o comprimento total do letreiro na parede.
- [ ] **Modo 2: Por Comprimento Total na Parede (Target Wall Width)**:
  - O usuário digita a medida que tem disponível na parede (ex: `120 cm` ou `1,5 metros`). O algoritmo calcula a escala exata e redimensiona cada caractere proporcionalmente.
- [ ] **Alerta de Mesa de Impressão**:
  - Seletor de impressora alvo (ex: *Creality Ender 3 / 220×220mm*, *Bambu Lab P1S/X1C / 256×256mm*, *Artillery / 300×300mm*).
  - Sinalização visual com bounding-box se alguma letra individual ou glifo ultrapassar os limites da mesa.

#### B. Curadoria de Fontes de Alta Fidelidade (Google Fonts para 3D)
- [ ] **Seleção de Tipografias Premium Estruturalmente Robustas**:
  - Fontes sem hastes ultrafinas que quebrem na parede ou fatiamento:
    - *Geométricas / Modernas*: Montserrat (Black / Extra Bold), Poppins (Bold), Inter (Black).
    - *Condensadas / Impacto*: Bebas Neue, Oswald, Anton.
    - *Serifadas Elegantes*: Playfair Display (Bold), Cinzel (Bold).
    - *Script / Cursivas Conectadas*: Pacifico, Great Vibes, Dancing Script (com algoritmo de união contínua booleana entre caracteres adjacentes para formar palavras em peça única).

#### C. Fatiamento Automático & Emendas (Dovetail / Puzzle Join)
- [ ] **Separação por Letra Solta**:
  - Exportação individual de cada letra apoiada perfeitamente na face traseira (Z=0) para dispensar qualquer suporte de impressão.
- [ ] **Divisão de Palavras Cursivas Longas que Excedem a Mesa**:
  - Para palavras cursivas unificadas que medem mais de 220mm, implementar corte inteligente com encaixe tipo macho-e-fêmea / rabo-de-andorinha (dovetail) ou pinos-guia ocultos na junção das letras para colagem sem emendas visíveis na face frontal.

#### D. Otimização de Peso & Consumo de Filamento (DFAM)
- [ ] **Alívio Traseiro Automático (Hollow Back)**:
  - Letras gigantes sólidas gastam muito filamento. Implementar casca traseira com alívio interno (ex: paredes de 2.0mm com fundo oco ou grade interna), economizando até 60% de material e reduzindo o peso na parede.
- [ ] **Sistemas de Fixação em Parede (Backing)**:
  - Opção de canal embutido na parte de trás para **fita dupla-face 3M Scotch** (rebaixo de 0.8mm para a fita ficar embutida e a letra encostar 100% rente à parede).
  - Opção de furo oculto formato **"buraco de fechadura" (keyhole slot)** para encaixe em pregos ou parafusos.

#### E. Gabarito de Instalação e Alinhamento (Jig / Template)
- [ ] **Gerador de Gabarito de Alinhamento 2D (PDF 1:1 Multipágina)**:
  - Exportar folha-guia em PDF tamanho A4 para imprimir na impressora comum de papel, com cruzetas de alinhamento e o contorno exato de onde colar cada letra com o kerning e espaçamento perfeitos.
- [ ] **Régua / Espaçador 3D Imprimível**:
  - Mini gabaritos de espaçamento entre letras impressos em poucas gramas para servir de guia de posicionamento horizontal durante a instalação.

#### F. Exportação em Lote & Integração com a Calculadora
- [ ] **Exportação em Pacote `.ZIP` Organizado**:
  - Nomenclatura ordenada para fatiamento: `01_letra_M.stl`, `02_letra_A.stl`, `03_letra_R.stl`, `04_letra_I.stl`, `05_letra_A.stl`.
- [ ] **Exportação em `.3MF` Multi-Placas (Multi-Plate)**:
  - Arquivo `.3MF` já distribuído em placas separadas prontas para fatiadores modernos (Bambu Studio, OrcaSlicer).
- [ ] **Cálculo de Custo do Conjunto Completo**:
  - Integração instantânea com a Calculadora de Custos para dar o orçamento fechado de filamento, horas de impressão e preço sugerido de venda para o cliente final.
