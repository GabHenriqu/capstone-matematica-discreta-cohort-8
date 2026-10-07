import test from 'node:test';
import assert from 'node:assert/strict';
import { Jogo } from '../src/jogo.mjs';
// DOM mínimo: verifica ligação dos eventos e renderização dos valores em Node.
// Não substitui inspeção visual em um navegador real.
class ElementoSimulado {
  get textContent() {
    return this.texto ?? '';
  }
  set textContent(valor) {
    this.texto = String(valor);
  }
  constructor() {
    this.textContent = '';
    this.value = '';
    this.style = {};
    this.children = [];
    this.atributos = {};
    this.eventos = {};
    this.classList = {
      toggle() {},
      remove() {},
      add() {},
    };
  }
  append(...elementos) {
    this.children.push(...elementos);
  }
  replaceChildren(...elementos) {
    this.children = elementos;
  }
  setAttribute(chave, valor) {
    this.atributos[chave] = valor;
  }
  getAttribute(chave) {
    return this.atributos[chave];
  }
  addEventListener(evento, funcao) {
    this.eventos[evento] = funcao;
  }
  clicar() {
    this.eventos.click?.();
  }
}
test('interface conecta mineração, forja, combate, área e restauração ao domínio', async () => {
  const elementos = new Map();
  const obter = (id) => {
    if (!elementos.has(id)) elementos.set(id, new ElementoSimulado());
    return elementos.get(id);
  };
  obter('recipe-select').value = 'ouro';
  obter('draw-count').value = '20';
  const armazenamento = new Map();
  let relogio = 0;
  let atualizarRelogio;
  globalThis.document = {
    hidden: false,
    getElementById: obter,
    createElement: () => new ElementoSimulado(),
    querySelector: obter,
    addEventListener() {},
  };
  globalThis.window = {
    confirm: () => true,
    addEventListener() {},
  };
  globalThis.localStorage = {
    getItem: (chave) => armazenamento.get(chave) ?? null,
    setItem: (chave, valor) => armazenamento.set(chave, valor),
  };
  const intervaloOriginal = globalThis.setInterval;
  const desempenhoOriginal = globalThis.performance;
  const sorteioOriginal = Math.random;
  globalThis.setInterval = (funcao) => {
    atualizarRelogio = funcao;
  };
  globalThis.performance = {
    now: () => relogio,
  };
  Math.random = () => 0.1;
  const avancar = (segundos) => {
    for (let i = 0; i < segundos; i++) {
      relogio += 1000;
      atualizarRelogio();
    }
  };
  try {
    await import('../src/interface/tela.mjs?teste=inicial');
    obter('mine').clicar();
    assert.match(obter('activity').textContent, /Minerando/);
    avancar(80);
    assert.equal(obter('count-pedra').textContent, '20');
    obter('craft').clicar();
    assert.equal(obter('sword-name').textContent, 'Espada de pedra');
    assert.equal(obter('count-pedra').textContent, '0');
    obter('fight').clicar();
    assert.equal(obter('activity').textContent, 'Combatendo');
    avancar(4);
    assert.equal(obter('coins').textContent, '10');
    const salvo = JSON.parse(armazenamento.get('forja-do-acaso.v1'));
    assert.equal(salvo.sword, 'pedra');
    assert.equal(salvo.draws.pedra, 20);
    await import('../src/interface/tela.mjs?teste=restaurado');
    assert.equal(obter('sword-name').textContent, 'Espada de pedra');
    assert.equal(obter('coins').textContent, '10');
    // Estado válido com vitórias até o nível 3 permite testar a outra mina.
    const preparado = Jogo.restaurar(salvo);
    preparado.niveisVencidos = new Set([1, 2, 3]);
    preparado.moedas = 100;
    armazenamento.set('forja-do-acaso.v1', JSON.stringify(preparado.salvar()));
    await import('../src/interface/tela.mjs?teste=profunda');
    obter('mine-deep').clicar();
    assert.match(obter('probability-title').textContent, /profunda/);
    assert.match(obter('diamond-formula').textContent, /0,15/);
    obter('upgrade-pickaxe').clicar();
    assert.match(obter('pickaxe-level').textContent, /nível 2/);
    assert.equal(JSON.parse(armazenamento.get('forja-do-acaso.v1')).pickaxeLevel, 2);
    assert.equal(obter('save-status').textContent, 'Salvo localmente');
  } finally {
    globalThis.setInterval = intervaloOriginal;
    globalThis.performance = desempenhoOriginal;
    Math.random = sorteioOriginal;
  }
});
