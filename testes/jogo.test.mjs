import { carregarDados } from '../src/dados/salvamento.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Jogo,
  Inventario,
  SorteioPonderado,
  Monstro,
  Espada,
  Mina,
  Picareta,
  SEGUNDOS_ATAQUE,
  SEGUNDOS_MINERACAO,
  INIMIGOS,
} from '../src/jogo.mjs';
function simularDuelo(nivel, espada) {
  const jogo = new Jogo();
  jogo.niveisVencidos = new Set(
    Array.from(
      {
        length: nivel - 1,
      },
      (_, n) => n + 1,
    ),
  );
  jogo.monstro = new Monstro(nivel);
  jogo.guerreiro.espada = new Espada(espada);
  jogo.selecionarAtividade('fight');
  let turnos = 0;
  while (
    !jogo.niveisVencidos.has(nivel) &&
    jogo.atividade === 'fight' &&
    turnos < 200
  ) {
    jogo.avancarTempo(SEGUNDOS_ATAQUE);
    turnos++;
  }
  return jogo;
}
test('fronteiras do sorteio 70/25/5 e complementar de eventos independentes', () => {
  for (const [numeroSorteado, esperado] of [
    [0, 'pedra'],
    [0.699999, 'pedra'],
    [0.7, 'ouro'],
    [0.949999, 'ouro'],
    [0.95, 'diamante'],
    [0.999999, 'diamante'],
  ]) {
    assert.equal(
      new SorteioPonderado(undefined, () => numeroSorteado).sortear(),
      esperado,
    );
  }
  assert.throws(() => new SorteioPonderado(undefined, () => 1).sortear());
  assert.ok(
    Math.abs(SorteioPonderado.probabilidadeDeAoMenosUm(0.05, 20) - 0.6415140775914581) <
      1e-12,
  );
});
test('conjuntos verificam tipos; quantidades são uma condição adicional e pagamento não é parcial', () => {
  const inventario = new Inventario({
    pedra: 50,
    ouro: 1,
  });
  const ouro = inventario.compararConjuntos({
    pedra: 50,
    ouro: 15,
  });
  assert.deepEqual([...ouro.a], ['pedra', 'ouro']);
  assert.equal(ouro.contido, true);
  assert.equal(
    inventario.pagar({
      pedra: 50,
      ouro: 15,
    }),
    false,
  );
  assert.equal(inventario.quantidades.pedra, 50);
  const diamante = inventario.compararConjuntos({
    ouro: 45,
    diamante: 6,
  });
  assert.deepEqual([...diamante.uniao], ['pedra', 'ouro', 'diamante']);
  assert.deepEqual([...diamante.intersecao], ['ouro']);
  assert.deepEqual([...diamante.diferenca], ['pedra']);
  assert.deepEqual([...diamante.tiposFaltantes], ['diamante']);
  assert.equal(diamante.contido, false);
});
test('forja gasta minério, preserva frequência, equipa melhoria e recusa retorno', () => {
  const jogo = new Jogo(new SorteioPonderado(undefined, () => 0));
  for (let n = 0; n < 20; n++) jogo.minerar();
  assert.equal(jogo.fabricarEspada('pedra'), true);
  assert.equal(jogo.inventario.quantidades.pedra, 0);
  assert.equal(jogo.sorteios.pedra, 20);
  assert.equal(jogo.totalSorteios, 20);
  assert.equal(jogo.guerreiro.espada.dano, 12);
  assert.equal(jogo.fabricarEspada('madeira'), false);
  assert.equal(jogo.fabricarEspada('ouro'), false);
});
test('madeira só vence nível 1, pedra chega ao 4, ouro ao 7 e diamante vence os dez', () => {
  for (const [espada, lastViable] of [
    ['madeira', 1],
    ['pedra', 4],
    ['ouro', 7],
    ['diamante', 10],
  ]) {
    for (let nivel = 1; nivel <= 10; nivel++) {
      const actual = simularDuelo(nivel, espada);
      assert.equal(
        actual.niveisVencidos.has(nivel),
        nivel <= lastViable,
        `${espada}, nível ${nivel}`,
      );
      assert.equal(actual.preverCombate(nivel, espada).viavel, nivel <= lastViable);
    }
  }
});
test('vitória repete o alvo escolhido, não cura o guerreiro e libera próximo', () => {
  const jogo = simularDuelo(1, 'madeira');
  assert.equal(jogo.guerreiro.vida, 60);
  assert.equal(jogo.monstro.nivel, 1);
  assert.equal(jogo.monstro.vida, 24);
  assert.equal(jogo.nivelLiberado, 2);
  assert.equal(jogo.atividade, 'fight');
  assert.equal(jogo.encontroAtivo, true);
  assert.equal(jogo.selecionarMonstro(3), false);
  assert.equal(jogo.selecionarMonstro(2), true);
  assert.equal(jogo.guerreiro.vida, 60);
  assert.equal(jogo.atividade, 'idle');
});
test('pausa congela; minerar ou descansar após pausa abandona e restaura o inimigo', () => {
  for (const atividade of ['mine', 'rest']) {
    const jogo = new Jogo();
    jogo.selecionarAtividade('fight');
    jogo.avancarTempo(SEGUNDOS_ATAQUE);
    assert.equal(jogo.monstro.vida, 20);
    assert.equal(jogo.guerreiro.vida, 92);
    jogo.selecionarAtividade('fight');
    assert.equal(jogo.encontroAtivo, true);
    for (let n = 0; n < 20; n++) jogo.avancarTempo(1);
    assert.equal(jogo.monstro.vida, 20);
    assert.equal(jogo.guerreiro.vida, 92);
    jogo.selecionarAtividade(atividade);
    assert.equal(jogo.monstro.vida, 24);
    assert.equal(jogo.encontroAtivo, false);
  }
});
test('derrota apaga dano adversário e descanso não permite vitória por desgaste', () => {
  const jogo = simularDuelo(2, 'madeira');
  assert.equal(jogo.guerreiro.vida, 0);
  assert.equal(jogo.monstro.vida, 70);
  assert.equal(jogo.encontroAtivo, false);
  assert.equal(jogo.atividade, 'rest');
  for (let n = 0; n < 10; n++) jogo.avancarTempo(1);
  assert.equal(jogo.guerreiro.vida, 100);
  assert.equal(jogo.atividade, 'idle');
  jogo.selecionarAtividade('fight');
  for (let n = 0; n < 15; n++) jogo.avancarTempo(SEGUNDOS_ATAQUE);
  assert.equal(jogo.niveisVencidos.has(2), false);
  assert.equal(jogo.monstro.vida, 70);
});
test('selecionar alvo reinicia encontro sem curar; selecionar o mesmo não muda vida', () => {
  const jogo = new Jogo();
  jogo.niveisVencidos.add(1);
  jogo.selecionarAtividade('fight');
  jogo.avancarTempo(SEGUNDOS_ATAQUE);
  assert.equal(jogo.selecionarMonstro(1), false);
  assert.equal(jogo.guerreiro.vida, 92);
  assert.equal(jogo.monstro.vida, 20);
  jogo.selecionarAtividade('fight');
  jogo.selecionarMonstro(2);
  assert.equal(jogo.monstro.vida, 70);
  assert.equal(jogo.guerreiro.vida, 92);
  assert.equal(jogo.encontroAtivo, false);
  jogo.selecionarMonstro(1);
  assert.equal(jogo.monstro.vida, 24);
  assert.equal(jogo.guerreiro.vida, 92);
});
test('restaurar duelo parcial conserva encontro pendente; descanso após reload reinicia adversário', () => {
  const jogo = new Jogo();
  jogo.selecionarAtividade('fight');
  jogo.avancarTempo(SEGUNDOS_ATAQUE);
  const saved = carregarDados(jogo.salvar()),
    restaurado = Jogo.restaurar(saved);
  assert.deepEqual(carregarDados(restaurado.salvar()), saved);
  assert.equal(restaurado.atividade, 'idle');
  assert.equal(restaurado.encontroAtivo, true);
  restaurado.selecionarAtividade('rest');
  assert.equal(restaurado.monstro.vida, 24);
  assert.equal(restaurado.guerreiro.vida, 92);
  for (const invalid of [
    {
      ...saved,
      versao: 4,
    },
    {
      ...saved,
      vida: -1,
    },
    {
      ...saved,
      espada: '__proto__',
    },
    {
      ...saved,
      niveisVencidos: [2],
    },
    {
      ...saved,
      encontroAtivo: false,
    },
    {
      ...saved,
      vidaMonstro: 0,
    },
    {
      ...saved,
      quantidades: {
        pedra: 999,
        ouro: 0,
        diamante: 0,
      },
    },
  ])
    assert.throws(() => Jogo.restaurar(invalid));
});
test('migração v1 preserva material, espada, histórico e vitórias com aviso explícito', () => {
  const dados = {
    versao: 1,
    quantidades: {
      pedra: 4,
      ouro: 2,
      diamante: 1,
    },
    sorteios: {
      pedra: 10,
      ouro: 2,
      diamante: 1,
    },
    vida: 30,
    espada: 'pedra',
    nivel: 3,
    vidaMonstro: 10,
    quantidadeVencidos: 2,
    vitoria: false,
  };
  const restaurado = Jogo.restaurar(dados);
  assert.deepEqual(restaurado.inventario.quantidades, dados.quantidades);
  assert.equal(restaurado.totalSorteios, 13);
  assert.equal(restaurado.guerreiro.espada.tipo, 'pedra');
  assert.equal(restaurado.guerreiro.vida, 30);
  assert.equal(restaurado.niveisVencidos.size, 2);
  assert.equal(restaurado.monstro.vida, 96);
  assert.equal(restaurado.encontroAtivo, false);
  assert.match(restaurado.aviso, /preservados/);
  assert.equal(
    Jogo.restaurar(carregarDados(restaurado.salvar())).niveisVencidos.size,
    2,
  );
});
test('tempo de mineração e atividade única não geram ganho de combate simultâneo', () => {
  const jogo = new Jogo();
  jogo.selecionarAtividade('mine');
  for (let n = 0; n < SEGUNDOS_MINERACAO - 1; n++) jogo.avancarTempo(1);
  assert.equal(jogo.totalSorteios, 0);
  jogo.avancarTempo(1);
  assert.equal(jogo.totalSorteios, 1);
  jogo.selecionarAtividade('fight');
  jogo.avancarTempo(SEGUNDOS_ATAQUE);
  assert.equal(jogo.totalSorteios, 1);
  assert.equal(jogo.monstro.vida, 20);
});
test('vencer dragão encerra repetição e mantém save final válido', () => {
  const jogo = simularDuelo(10, 'diamante');
  assert.equal(jogo.vitoria, true);
  assert.equal(jogo.niveisVencidos.size, 10);
  assert.equal(jogo.atividade, 'idle');
  assert.equal(jogo.encontroAtivo, false);
  assert.equal(jogo.monstro.vida, 0);
  assert.equal(Jogo.restaurar(carregarDados(jogo.salvar())).vitoria, true);
});
test('moedas só entram por vitória real; intervalos e boss parado impedem pagamentos duplicados', () => {
  const jogo = new Jogo();
  jogo.guerreiro.espada = new Espada('ouro');
  jogo.selecionarAtividade('fight');
  jogo.avancarTempo(0.75);
  assert.equal(jogo.moedas, 0);
  jogo.avancarTempo(0.75);
  assert.equal(jogo.moedas, 10);
  for (let n = 0; n < 10; n++) jogo.avancarTempo(0);
  assert.equal(jogo.moedas, 10);
  jogo.avancarTempo(0.5);
  assert.equal(jogo.moedas, 10);
  jogo.avancarTempo(1);
  assert.equal(jogo.moedas, 20);
  jogo.selecionarAtividade('fight');
  jogo.avancarTempo(1.5);
  assert.equal(jogo.moedas, 20);
  const boss = simularDuelo(10, 'diamante'),
    reward = boss.moedas;
  boss.combater();
  boss.avancarTempo(1.5);
  assert.equal(boss.moedas, reward);
  const loser = simularDuelo(2, 'madeira');
  assert.equal(loser.moedas, 0);
});
test('pagamento da picareta é atômico, níveis limitados e +20% velocidade não é −20% tempo', () => {
  const jogo = new Jogo();
  jogo.moedas = 99;
  assert.equal(jogo.melhorarPicareta(), false);
  assert.equal(jogo.moedas, 99);
  assert.equal(jogo.picareta.nivel, 1);
  jogo.moedas = 100;
  assert.equal(jogo.melhorarPicareta(), true);
  assert.equal(jogo.moedas, 0);
  assert.equal(jogo.picareta.velocidade, 1.2);
  assert.ok(Math.abs(jogo.intervalo - 1) < 1e-12);
  assert.ok(Math.abs(jogo.minaAtual.segundos(jogo.picareta) - 4 / 1.2) < 1e-12);
  jogo.moedas = 400;
  assert.equal(jogo.melhorarPicareta(), true);
  assert.equal(jogo.moedas, 0);
  jogo.moedas = 999;
  assert.equal(jogo.melhorarPicareta(), false);
  assert.equal(jogo.moedas, 999);
  assert.equal(jogo.picareta.nivel, 3);
});
test('profunda exige vitória nível3 e usa chances/estatísticas próprias sem contaminar área I', () => {
  const jogo = new Jogo(() => 0.8);
  assert.equal(jogo.selecionarMina('deep'), false);
  assert.equal(jogo.minaAtual.tipo, 'surface');
  assert.equal(jogo.minerar(), 'ouro');
  jogo.niveisVencidos = new Set([1, 2, 3]);
  assert.equal(jogo.selecionarMina('deep'), true);
  assert.equal(jogo.minerar(), 'ouro');
  jogo.geradorAleatorio = () => 0.9;
  assert.equal(jogo.minerar(), 'diamante');
  assert.equal(jogo.sorteiosPorArea.surface.ouro, 1);
  assert.equal(jogo.sorteiosPorArea.surface.diamante, 0);
  assert.equal(jogo.sorteiosPorArea.deep.ouro, 1);
  assert.equal(jogo.sorteiosPorArea.deep.diamante, 1);
  assert.equal(jogo.sorteios.ouro, 2);
  assert.equal(jogo.totalSorteios, 3);
  assert.equal(jogo.totalSorteiosDaArea, 2);
  for (const [numeroSorteado, esperado] of [
    [0.449999, 'pedra'],
    [0.45, 'ouro'],
    [0.849999, 'ouro'],
    [0.85, 'diamante'],
  ]) {
    assert.equal(
      new SorteioPonderado(
        new Mina('deep').probabilidades,
        () => numeroSorteado,
      ).sortear(),
      esperado,
    );
  }
});
test('melhorar ferramenta mantém fração de escavação e trocar área não concede material instantâneo', () => {
  const jogo = new Jogo();
  jogo.moedas = 100;
  jogo.selecionarAtividade('mine');
  jogo.avancarTempo(2);
  jogo.melhorarPicareta();
  assert.ok(Math.abs(jogo.tempoDecorrido / jogo.intervalo - 0.5) < 1e-12);
  jogo.niveisVencidos = new Set([1, 2, 3]);
  jogo.selecionarMina('deep');
  assert.equal(jogo.tempoDecorrido, 0);
  jogo.avancarTempo(2);
  assert.equal(jogo.totalSorteios, 0);
});
test('migração v2 preserva encontro, sem inventar moedas ou atribuir sorteios antigos a uma área', () => {
  const original = new Jogo();
  original.minerar();
  original.selecionarAtividade('fight');
  original.avancarTempo(1.5);
  const v2 = {
    ...carregarDados(original.salvar()),
    versao: 2,
  };
  delete v2.moedas;
  delete v2.nivelPicareta;
  delete v2.area;
  delete v2.sorteiosPorArea;
  delete v2.sorteiosSemArea;
  const migrado = Jogo.restaurar(v2);
  assert.equal(migrado.encontroAtivo, true);
  assert.equal(migrado.monstro.vida, 20);
  assert.equal(migrado.moedas, 0);
  assert.equal(migrado.picareta.nivel, 1);
  assert.deepEqual(migrado.sorteiosSemArea, original.sorteios);
  assert.equal(migrado.totalSorteiosDaArea, 0);
  migrado.selecionarAtividade('rest');
  assert.equal(migrado.monstro.vida, 24);
  assert.equal(
    Jogo.restaurar(carregarDados(migrado.salvar())).sorteiosSemArea.pedra,
    migrado.sorteiosSemArea.pedra,
  );
});
test('save v3 mantém economia/áreas e rejeita moedas negativas, níveis ou histórico impossíveis', () => {
  const jogo = new Jogo();
  jogo.niveisVencidos = new Set([1, 2, 3]);
  jogo.moedas = 100;
  jogo.melhorarPicareta();
  jogo.selecionarMina('deep');
  jogo.minerar();
  const saved = carregarDados(jogo.salvar()),
    restaurado = Jogo.restaurar(saved);
  assert.deepEqual(carregarDados(restaurado.salvar()), saved);
  for (const invalid of [
    {
      ...saved,
      moedas: -1,
    },
    {
      ...saved,
      nivelPicareta: 4,
    },
    {
      ...saved,
      area: 'secreta',
    },
    {
      ...saved,
      sorteiosSemArea: {
        pedra: 999,
        ouro: 0,
        diamante: 0,
      },
    },
  ])
    assert.throws(() => Jogo.restaurar(invalid));
  assert.throws(() =>
    Jogo.restaurar({
      ...new Jogo().salvar(),
      area: 'deep',
    }),
  );
});
test('alvos fortes oferecem rendimento por tempo melhor que gosma com o equipamento da etapa', () => {
  const jogo = new Jogo();
  function rate(nivel, espada) {
    const preverCombate = jogo.preverCombate(nivel, espada);
    return (
      INIMIGOS[nivel - 1].moedas /
      (preverCombate.ataques * SEGUNDOS_ATAQUE +
        Math.ceil(preverCombate.danoRecebido / 10))
    );
  }
  for (const [espada, nivel] of [
    ['pedra', 4],
    ['ouro', 7],
    ['diamante', 10],
  ]) {
    assert.ok(
      rate(nivel, espada) > rate(1, espada),
      `${espada}: nível${nivel} precisa valer mais por tempo total`,
    );
  }
  assert.ok(rate(2, 'pedra') / rate(1, 'pedra') < 2);
});
