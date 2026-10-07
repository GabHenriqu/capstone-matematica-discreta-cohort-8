/** Simulação reproduzível: estima ritmo e custo de escolhas, não diversão humana. */
import { Jogo, RECEITAS, MINAS, INIMIGOS, SEGUNDOS_ATAQUE } from '../src/jogo.mjs';
function geradorComSemente(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}
function simularCampanha(semente) {
  const jogo = new Jogo(geradorComSemente(semente)),
    ordemEspadas = Object.keys(RECEITAS);
  const marcos = {},
    contagemPorArea = {
      surface: 0,
      deep: 0,
    };
  let segundos = 0;
  for (let nivel = 1; nivel <= 10; nivel++) {
    if (nivel > 1) jogo.selecionarMonstro(nivel);
    // Compra com moedas das vitórias obrigatórias, sem farm extra nesta estratégia.
    if (jogo.melhorarPicareta()) marcos[`pickaxe${jogo.picareta.nivel}`] = segundos;
    while (!jogo.preverCombate().viavel) {
      const proximaEspada =
        ordemEspadas[ordemEspadas.indexOf(jogo.guerreiro.espada.tipo) + 1];
      while (!jogo.inventario.podePagar(RECEITAS[proximaEspada].custos)) {
        // Estimativa simples: usa a área cujo recurso limitante demora menos em média.
        const minasDisponiveis = Object.keys(MINAS).filter((tipo) =>
          jogo.podeSelecionarMina(tipo),
        );
        minasDisponiveis.sort((a, b) => {
          const estimarTempo = (tipo) =>
            Math.max(
              ...Object.entries(RECEITAS[proximaEspada].custos).map(
                ([material, quantidadeNecessaria]) =>
                  ((Math.max(
                    0,
                    quantidadeNecessaria - jogo.inventario.quantidades[material],
                  ) /
                    MINAS[tipo].probabilidades[material]) *
                    MINAS[tipo].segundosBase) /
                  jogo.picareta.velocidade,
              ),
            );
          return estimarTempo(a) - estimarTempo(b);
        });
        jogo.selecionarMina(minasDisponiveis[0]);
        segundos += jogo.minaAtual.segundos(jogo.picareta);
        jogo.minerar();
        contagemPorArea[jogo.minaAtual.tipo]++;
        if (segundos > 100000) throw new Error('Simulação excedeu limite.');
      }
      jogo.fabricarEspada(proximaEspada);
      marcos[proximaEspada] = segundos;
    }
    segundos += Math.ceil((100 - jogo.guerreiro.vida) / 10);
    jogo.guerreiro.recuperarVida(100);
    jogo.selecionarAtividade('fight');
    while (!jogo.niveisVencidos.has(nivel)) {
      jogo.avancarTempo(SEGUNDOS_ATAQUE);
      segundos += SEGUNDOS_ATAQUE;
    }
    if (jogo.atividade === 'fight') jogo.selecionarAtividade('fight');
  }
  return {
    segundos,
    ...marcos,
    deepDraws: contagemPorArea.deep,
    surfaceDraws: contagemPorArea.surface,
  };
}
const quantidade = 1000,
  resultados = Array.from(
    {
      length: quantidade,
    },
    (_, n) => simularCampanha(n + 1),
  );
function resumir(campo) {
  const valores = resultados.map((resultado) => resultado[campo]).sort((a, b) => a - b);
  return {
    medianMinutes: +(valores[Math.floor(quantidade * 0.5)] / 60).toFixed(2),
    p10Minutes: +(valores[Math.floor(quantidade * 0.1)] / 60).toFixed(2),
    p90Minutes: +(valores[Math.floor(quantidade * 0.9)] / 60).toFixed(2),
  };
}
const jogo = new Jogo();
const rendimentosMoedas = ['madeira', 'pedra', 'ouro', 'diamante'].map((espada) => ({
  espada,
  targets: INIMIGOS.flatMap((inimigo, indice) => {
    const simularDuelo = jogo.preverCombate(indice + 1, espada);
    if (!simularDuelo.viavel) return [];
    const totalSeconds =
      simularDuelo.ataques * SEGUNDOS_ATAQUE +
      Math.ceil(simularDuelo.danoRecebido / 10);
    return [
      {
        nivel: indice + 1,
        coinsPerVictory: inimigo.moedas,
        secondsAttackAndRest: totalSeconds,
        coinsPerMinute: +((inimigo.moedas / totalSeconds) * 60).toFixed(2),
      },
    ];
  }),
}));
console.log(
  JSON.stringify(
    {
      simulations: quantidade,
      strategy:
        'Vitórias obrigatórias rendem moedas; melhora picareta quando possível; escolhe área por déficit esperado; descansa antes de cada duelo; sem decisões ou farm extra.',
      simularCampanha: resumir('segundos'),
      stoneCraft: resumir('pedra'),
      goldCraft: resumir('ouro'),
      diamondCraft: resumir('diamante'),
      pickaxe2: resumir('pickaxe2'),
      pickaxe3: resumir('pickaxe3'),
      medianDeepDraws: resultados.map((r) => r.deepDraws).sort((a, b) => a - b)[500],
      rendimentosMoedas,
    },
    null,
    2,
  ),
);
