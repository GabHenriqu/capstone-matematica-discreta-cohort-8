# Forja do Acaso

Projeto de Matemática Discreta — cohort 8. Jogo de mineração, fabricação de espadas e combate que aplica conjuntos e probabilidade.

## Jogar online

[Jogue Forja do Acaso no navegador](https://capstone-matematica-discreta-cohort.vercel.app).

## Estrutura

- `index.html`: elementos da tela.
- `src/principal.mjs`: entrada da aplicação.
- `src/interface`: botões, renderização e relógio.
- `src/modelos`: inventário, personagens, ferramentas e regras do jogo.
- `src/matematica`: sorteio ponderado e cálculo de probabilidades.
- `src/dados`: configuração e leitura/escrita do progresso.
- `estilos` e `assets`: CSS e imagens SVG.
- `testes`: regras do jogo e eventos da interface com DOM simulado.
- `scripts`: servidor local e simulação de campanhas.

Para acompanhar a execução, comece em `src/principal.mjs`, siga para `src/interface/tela.mjs` e depois para as classes em `src/modelos`.

## Matemática do jogo

O inventário e as receitas formam conjuntos de tipos de materiais. União, interseção, diferença e inclusão mostram o que está disponível e o que falta; a fabricação também verifica as quantidades necessárias.

A mineração usa sorteios ponderados. A tela compara probabilidade teórica e frequência relativa por mina e calcula a chance de ao menos um diamante em escavações independentes: `1 − (1 − p)^n`.

A velocidade da picareta segue `1,2^(nível − 1)`; o intervalo de mineração é o tempo-base dividido pela velocidade. Melhorias mudam o intervalo, sem mudar a chance de cada material.

O progresso é salvo no navegador. Mineração, combate e descanso acontecem uma atividade por vez; a aba oculta não progride.
