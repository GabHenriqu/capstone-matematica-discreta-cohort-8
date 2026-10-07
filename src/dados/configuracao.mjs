// Valores das regras do jogo, centralizados para estudar e ajustar.
// As chances de cada mina somam 1; as receitas exigem quantidades de cada tipo.
/** Domínio puro: nenhuma regra depende da tela, dos timers ou do navegador. */
export const MATERIAIS = Object.freeze(['pedra', 'ouro', 'diamante']);
export const PROBABILIDADES_SUPERFICIE = Object.freeze({
  pedra: 0.7,
  ouro: 0.25,
  diamante: 0.05,
});
export const SEGUNDOS_MINERACAO = 4;
export const SEGUNDOS_ATAQUE = 1.5;
export const MINAS = Object.freeze({
  surface: Object.freeze({
    nome: 'Superfície',
    segundosBase: 4,
    probabilidades: PROBABILIDADES_SUPERFICIE,
    nivelDesbloqueio: 0,
  }),
  deep: Object.freeze({
    nome: 'Profunda',
    segundosBase: 7,
    probabilidades: Object.freeze({
      pedra: 0.45,
      ouro: 0.4,
      diamante: 0.15,
    }),
    nivelDesbloqueio: 3,
  }),
});
export const RECEITAS = Object.freeze({
  madeira: Object.freeze({
    nome: 'Madeira',
    dano: 4,
    custos: Object.freeze({}),
  }),
  pedra: Object.freeze({
    nome: 'Pedra',
    dano: 12,
    custos: Object.freeze({
      pedra: 20,
    }),
  }),
  ouro: Object.freeze({
    nome: 'Ouro',
    dano: 28,
    custos: Object.freeze({
      pedra: 50,
      ouro: 15,
    }),
  }),
  diamante: Object.freeze({
    nome: 'Diamante',
    dano: 60,
    custos: Object.freeze({
      ouro: 45,
      diamante: 16,
    }),
  }),
});
export const INIMIGOS = Object.freeze(
  [
    {
      nome: 'Gosma',
      vida: 24,
      dano: 8,
      aparencia: 'slime',
    },
    {
      nome: 'Morcego',
      vida: 70,
      dano: 7,
      aparencia: 'bat',
    },
    {
      nome: 'Lobo',
      vida: 96,
      dano: 10,
      aparencia: 'wolf',
    },
    {
      nome: 'Golem de pedra',
      vida: 120,
      dano: 10,
      aparencia: 'golem',
    },
    {
      nome: 'Esqueleto',
      vida: 170,
      dano: 9,
      aparencia: 'skeleton',
    },
    {
      nome: 'Golem de ferro',
      vida: 210,
      dano: 11,
      aparencia: 'golem',
    },
    {
      nome: 'Sentinela',
      vida: 250,
      dano: 12,
      aparencia: 'skeleton',
    },
    {
      nome: 'Serpente',
      vida: 340,
      dano: 10,
      aparencia: 'serpent',
    },
    {
      nome: 'Aranha gigante',
      vida: 430,
      dano: 12,
      aparencia: 'spider',
    },
    {
      nome: 'Dragão',
      vida: 540,
      dano: 12,
      aparencia: 'dragon',
    },
  ].map((inimigo, indice) =>
    Object.freeze({
      ...inimigo,
      velocidade: SEGUNDOS_ATAQUE,
      moedas: [10, 36, 56, 72, 114, 150, 195, 280, 440, 550][indice],
    }),
  ),
);
