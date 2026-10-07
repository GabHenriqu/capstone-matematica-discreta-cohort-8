// Este módulo liga botões e DOM às regras. Ele não define a matemática.
// IDs HTML e nomes das imagens ficam como estão para preservar a interface.
import {
  Jogo,
  MATERIAIS,
  RECEITAS,
  MINAS,
  INIMIGOS,
  SorteioPonderado,
  SEGUNDOS_ATAQUE,
} from '../jogo.mjs';
const CHAVE_SALVAMENTO = 'forja-do-acaso.v1';
const obterElemento = (id) => document.getElementById(id);
const formatarNumero = (valor) =>
  valor.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });
const formatarPorcentagem = (valor) => formatarNumero(valor * 100) + '%';
const formatarSegundos = (valor) =>
  valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }) + ' s';
const mostrarTexto = (id, valor) => {
  const elemento = obterElemento(id);
  if (elemento.textContent !== String(valor)) {
    elemento.textContent = valor;
  }
};
const formatarConjunto = (conjunto) =>
  conjunto.size ? `{${[...conjunto].join(', ')}}` : '∅';
const imagensInimigos = [
  'slime',
  'bat',
  'wolf',
  'stone-golem',
  'skeleton',
  'iron-golem',
  'sentinel',
  'serpent',
  'spider',
  'dragon',
];
const imagensMinerios = {
  pedra: 'stone',
  ouro: 'gold',
  diamante: 'diamond',
};
const imagensGuerreiro = {
  madeira: 'wood',
  pedra: 'stone',
  ouro: 'gold',
  diamante: 'diamond',
};
let jogo;
let textoSalvo;
let salvamentoInvalido = false;
try {
  textoSalvo = localStorage.getItem(CHAVE_SALVAMENTO);
} catch {
  jogo = new Jogo();
  jogo.aviso =
    'Armazenamento bloqueado neste navegador. O jogo funciona nesta página, mas o progresso pode não persistir.';
}
if (!jogo) {
  try {
    if (textoSalvo) {
      jogo = Jogo.restaurar(JSON.parse(textoSalvo));
    } else {
      jogo = new Jogo();
    }
  } catch {
    // Preserve o texto inválido; só Recomeçar pode substituí-lo após confirmação.
    jogo = new Jogo();
    salvamentoInvalido = true;
    jogo.aviso =
      'Save não validado: o original foi preservado. Esta aventura é temporária; Recomeçar confirma a substituição.';
  }
}

/** A View apresenta o domínio. Elementos interativos permanecem estáveis durante o relógio. */
class TelaDoJogo {
  constructor() {
    this.botoesInimigos = new Map();
    INIMIGOS.forEach((inimigo, indice) => {
      const nivel = indice + 1;
      const botao = document.createElement('button');
      botao.className = 'target';
      const imagem = document.createElement('img');
      imagem.src = `assets/${imagensInimigos[indice]}.svg`;
      imagem.alt = '';
      const rotulo = document.createElement('span');
      rotulo.className = 'target-number';
      rotulo.textContent = nivel;
      botao.append(imagem, rotulo);
      botao.title = `${inimigo.nome}: ${inimigo.vida} vida, ${inimigo.dano} dano, ${inimigo.moedas} moedas/vitória.`;
      botao.setAttribute(
        'aria-label',
        `Selecionar ${inimigo.nome}, nível ${nivel}. ${inimigo.moedas} moedas por vitória.`,
      );
      botao.addEventListener('click', () => {
        if (jogo.selecionarMonstro(nivel)) {
          atualizarESalvar();
        }
      });
      obterElemento('enemy-list').append(botao);
      this.botoesInimigos.set(nivel, botao);
    });
    for (const material of MATERIAIS) {
      const linha = document.createElement('div');
      linha.className = 'prob-row';
      // Fragmento constante do projeto; nenhum HTML vem dos saves.
      linha.innerHTML = `<div class="prob-row-header"><span>${material[0].toUpperCase() + material.slice(1)}</span><span id="freq-${material}"></span></div><div class="prob-bar"><i id="bar-${material}"></i><b id="theory-${material}" title="Chance teórica"></b></div>`;
      obterElemento('probability-rows').append(linha);
    }
    this.selecionarProximaReceita();
  }

  selecionarProximaReceita() {
    const ordemEspadas = Object.keys(RECEITAS);
    const indiceAtual = ordemEspadas.indexOf(jogo.guerreiro.espada.tipo);
    obterElemento('forge-select').value = ordemEspadas[Math.min(3, indiceAtual + 1)];
  }

  atualizar() {
    const guerreiro = jogo.guerreiro;
    const inimigo = jogo.monstro;
    mostrarTexto('hero-hp', `${guerreiro.vida} / 100`);
    obterElemento('hero-health').style.width = `${guerreiro.vida}%`;
    mostrarTexto('coins', jogo.moedas);
    mostrarTexto(
      'activity',
      {
        idle: jogo.encontroAtivo ? 'Duelo pausado' : 'Parado',
        mine: `Minerando · ${jogo.minaAtual.nome}`,
        fight: 'Combatendo',
        rest: 'Descansando',
      }[jogo.atividade],
    );
    mostrarTexto('campaign-progress', `${jogo.niveisVencidos.size} / 10 vencidos`);
    mostrarTexto('sword-name', `Espada de ${guerreiro.espada.tipo}`);
    mostrarTexto('sword-damage', guerreiro.espada.dano);
    const imagemGuerreiro = `assets/hero-${imagensGuerreiro[guerreiro.espada.tipo]}.svg`;
    if (obterElemento('warrior-art').getAttribute('src') !== imagemGuerreiro) {
      obterElemento('warrior-art').src = imagemGuerreiro;
    }
    const imagemMonstro = `assets/${imagensInimigos[inimigo.nivel - 1]}.svg`;
    if (obterElemento('monster-art').getAttribute('src') !== imagemMonstro) {
      obterElemento('monster-art').src = imagemMonstro;
    }
    mostrarTexto('monster-level', `Nível ${inimigo.nivel}`);
    mostrarTexto('monster-name', inimigo.nome);
    mostrarTexto('monster-hp', `${inimigo.vida} / ${inimigo.vidaMaxima}`);
    obterElemento('monster-health').style.width =
      `${(inimigo.vida / inimigo.vidaMaxima) * 100}%`;
    mostrarTexto('monster-damage', `${inimigo.dano} de dano`);
    mostrarTexto('monster-speed', `${formatarSegundos(inimigo.velocidade)} / ataque`);
    mostrarTexto('monster-coins', inimigo.moedas);
    for (const [nivel, botao] of this.botoesInimigos) {
      botao.disabled = nivel > jogo.nivelLiberado;
      botao.classList.toggle('selected', nivel === inimigo.nivel);
      botao.classList.toggle('completed', jogo.niveisVencidos.has(nivel));
      botao.setAttribute('aria-pressed', String(nivel === inimigo.nivel));
    }
    for (const [tipo, idBotao] of [
      ['surface', 'mine-surface'],
      ['deep', 'mine-deep'],
    ]) {
      const selecionada = jogo.minaAtual.tipo === tipo;
      const botao = obterElemento(idBotao);
      botao.disabled = !jogo.podeSelecionarMina(tipo);
      botao.classList.toggle('selected', selecionada);
      botao.setAttribute('aria-pressed', String(selecionada));
    }
    mostrarTexto(
      'surface-time',
      `${formatarSegundos(MINAS.surface.segundosBase / jogo.picareta.velocidade)} / escavação`,
    );
    mostrarTexto(
      'deep-time',
      jogo.podeSelecionarMina('deep')
        ? `${formatarSegundos(MINAS.deep.segundosBase / jogo.picareta.velocidade)} / escavação`
        : 'Vença o nível 3',
    );
    for (const material of MATERIAIS) {
      mostrarTexto(`count-${material}`, jogo.inventario.quantidades[material]);
      mostrarTexto(
        `chance-${material}`,
        formatarPorcentagem(jogo.minaAtual.probabilidades[material]),
      );
    }
    mostrarTexto(
      'mine-note',
      jogo.minaAtual.tipo === 'surface'
        ? 'Superfície: mais pedra e ouro por minuto. Sorteios independentes.'
        : 'Profunda: mais diamante por minuto; menos pedra e ouro. Sorteios independentes.',
    );
    mostrarTexto(
      'mine-label',
      jogo.atividade === 'mine' ? 'Pausar mineração' : 'Minerar',
    );
    document
      .querySelector('.mine-panel')
      .classList.toggle('minerando', jogo.atividade === 'mine');
    mostrarTexto(
      'fight-label',
      jogo.atividade === 'fight'
        ? 'Pausar combate'
        : jogo.encontroAtivo
          ? 'Retomar duelo'
          : 'Combater',
    );
    obterElemento('fight').disabled = guerreiro.vida <= 0;
    mostrarTexto(
      'rest-label',
      jogo.atividade === 'rest' ? 'Pausar descanso' : 'Descansar',
    );
    obterElemento('rest').disabled =
      guerreiro.vida === 100 && jogo.atividade !== 'rest' && !jogo.encontroAtivo;
    const preverCombate = jogo.preverCombate();
    const riscoVidaAtual =
      !jogo.encontroAtivo && guerreiro.vida <= preverCombate.danoRecebido;
    mostrarTexto(
      'forecast',
      !preverCombate.viavel
        ? `Espada insuficiente: ${preverCombate.danoRecebido} de dano recebido antes de vencer. Forje uma melhoria.`
        : riscoVidaAtual
          ? `Descanse antes do duelo: este alvo cheio causa ${preverCombate.danoRecebido} de dano até ser vencido.`
          : `${preverCombate.ataques} golpes para vencer o alvo cheio · ${preverCombate.danoRecebido} de dano recebido · +${inimigo.moedas} moedas.`,
    );
    obterElemento('forecast').classList.toggle(
      'risky',
      !preverCombate.viavel || riscoVidaAtual,
    );
    mostrarTexto(
      'battle-message',
      jogo.vitoria && jogo.atividade === 'idle' && !jogo.encontroAtivo
        ? 'Campanha concluída. Os alvos continuam disponíveis.'
        : {
            idle: jogo.encontroAtivo
              ? 'Pausado. Descansar ou minerar abandona este duelo.'
              : 'Vitória repete o alvo. Derrota ou abandono restaura a vida do inimigo.',
            mine: 'Minerando. O combate está parado.',
            fight:
              'Combate automático · moedas por vitória · alvo selecionado se repete.',
            rest: 'Descansando · +10 de vida por segundo.',
          }[jogo.atividade],
    );
    this.atualizarForja();
    this.atualizarPicareta();
    this.atualizarMatematica();
    this.atualizarTemporizadores();
    this.atualizarEventos();
    obterElemento('notice').hidden = !jogo.aviso;
    if (jogo.aviso) {
      mostrarTexto('notice-text', jogo.aviso);
    }
  }

  // Fabricação e ferramentas
  atualizarForja() {
    const tipo = obterElemento('forge-select').value;
    const receita = RECEITAS[tipo];
    mostrarTexto('recipe-title', `Espada de ${tipo}`);
    mostrarTexto(
      'recipe-damage',
      `${jogo.guerreiro.espada.dano} → ${receita.dano} de dano`,
    );
    obterElemento('recipe-art').src = `assets/ore-${imagensMinerios[tipo]}.svg`;
    const chave = `${tipo}:${MATERIAIS.map((material) => jogo.inventario.quantidades[material]).join(':')}`;
    if (chave !== this.chaveReceita) {
      obterElemento('recipe-costs').replaceChildren(
        ...Object.entries(receita.custos).map(([material, quantidade]) => {
          const rotulo = document.createElement('span');
          const quantidadeFaltante = Math.max(
            0,
            quantidade - jogo.inventario.quantidades[material],
          );
          rotulo.className = 'cost' + (quantidadeFaltante ? '' : ' enough');
          rotulo.textContent = `${quantidade} ${material}${
            quantidadeFaltante
              ? ` · faltam ${quantidadeFaltante}
        `
              : ' · pronto'
          }`;
          return rotulo;
        }),
      );
      this.chaveReceita = chave;
    }
    const ordemEspadas = Object.keys(RECEITAS);
    const receitaSuperada =
      ordemEspadas.indexOf(tipo) <= ordemEspadas.indexOf(jogo.guerreiro.espada.tipo);
    obterElemento('craft').disabled =
      receitaSuperada || !jogo.inventario.podePagar(receita.custos);
    mostrarTexto(
      'craft',
      tipo === jogo.guerreiro.espada.tipo
        ? 'Já equipada'
        : receitaSuperada
          ? 'Melhoria superada'
          : 'Forjar espada',
    );
    mostrarTexto(
      'craft-note',
      receitaSuperada
        ? 'Receita superada pelo equipamento atual.'
        : 'Consome os materiais e equipa a espada.',
    );
  }

  atualizarPicareta() {
    const picareta = jogo.picareta;
    const custo = picareta.custoMelhoria;
    mostrarTexto('pickaxe-level', `Picareta · nível ${picareta.nivel}`);
    mostrarTexto(
      'pickaxe-next',
      custo === null
        ? 'Nível máximo · velocidade +44% sobre a base'
        : `Próximo: nível ${picareta.nivel + 1} · velocidade +20%`,
    );
    mostrarTexto('pickaxe-cost', custo === null ? 'Concluída' : `${custo} moedas`);
    obterElemento('upgrade-pickaxe').disabled = custo === null || jogo.moedas < custo;
    mostrarTexto(
      'upgrade-pickaxe',
      custo === null ? 'Picareta no máximo' : 'Melhorar picareta',
    );
    const segundosAtuais = jogo.minaAtual.segundos(picareta);
    mostrarTexto(
      'pickaxe-effect',
      custo === null
        ? `${jogo.minaAtual.nome}: ${formatarSegundos(segundosAtuais)} / escavação. Moedas extras ficam guardadas.`
        : `${jogo.minaAtual.nome}: ${formatarSegundos(segundosAtuais)} → ${formatarSegundos(segundosAtuais / 1.2)} / escavação. Chances não mudam.`,
    );
  }

  // Painel didático: dados do jogo e fórmulas
  atualizarMatematica() {
    const area = jogo.minaAtual;
    const sorteiosDaArea = jogo.sorteiosPorArea[area.tipo];
    mostrarTexto('probability-title', `Probabilidade · ${area.nome.toLowerCase()}`);
    mostrarTexto(
      'sample-space',
      'Ω = {pedra, ouro, diamante}. As chances desta área somam 100%.',
    );
    for (const material of MATERIAIS) {
      const frequenciaObservada = jogo.totalSorteiosDaArea
        ? sorteiosDaArea[material] / jogo.totalSorteiosDaArea
        : 0;
      mostrarTexto(
        `freq-${material}`,
        `teórica ${formatarPorcentagem(area.probabilidades[material])} · observada ${jogo.totalSorteiosDaArea ? formatarPorcentagem(frequenciaObservada) : '—'} (${sorteiosDaArea[material]})`,
      );
      obterElemento(`bar-${material}`).style.width = `${frequenciaObservada * 100}%`;
      obterElemento(`theory-${material}`).style.left =
        `${area.probabilidades[material] * 100}%`;
    }
    mostrarTexto('area-draw-total', jogo.totalSorteiosDaArea);
    mostrarTexto('total-draws', `${jogo.totalSorteios} sorteios em todo o histórico.`);
    const sorteiosSemArea = Object.values(jogo.sorteiosSemArea).reduce(
      (soma, quantidade) => soma + quantidade,
      0,
    );
    obterElemento('legacy-history').hidden = sorteiosSemArea === 0;
    if (sorteiosSemArea) {
      mostrarTexto(
        'legacy-history',
        `${sorteiosSemArea} sorteios anteriores à atualização não têm área conhecida. Foram preservados no histórico total e não participam das frequências desta área.`,
      );
    }
    const intervalo = area.segundos(jogo.picareta);
    mostrarTexto(
      'production-rate',
      `Média teórica com esta picareta: ${MATERIAIS.map(
        (m) => `${formatarNumero((60 / intervalo) * area.probabilidades[m])}
    ${m}
    `,
      ).join(' · ')} por minuto. Não é uma garantia.`,
    );
    this.atualizarProbabilidade();
    this.atualizarConjuntos();
  }

  atualizarProbabilidade() {
    const numeroEscavacoes = Number(obterElemento('draw-count').value);
    if (
      !Number.isInteger(numeroEscavacoes) ||
      numeroEscavacoes < 1 ||
      numeroEscavacoes > 10000
    ) {
      mostrarTexto('diamond-chance', '—');
      mostrarTexto('diamond-formula', 'Digite um inteiro entre 1 e 10.000.');
      return;
    }
    const probabilidade = jogo.minaAtual.probabilidades.diamante;
    const chance = SorteioPonderado.probabilidadeDeAoMenosUm(
      probabilidade,
      numeroEscavacoes,
    );
    mostrarTexto(
      'diamond-chance',
      chance > 0.9999 ? '> 99,99%' : formatarPorcentagem(chance),
    );
    mostrarTexto(
      'diamond-formula',
      `P(≥ 1 diamante) = 1 − (1 − ${formatarNumero(probabilidade)})^${numeroEscavacoes} = 1 − ${formatarNumero(1 - probabilidade)}^${numeroEscavacoes}`,
    );
  }

  atualizarConjuntos() {
    const receita = RECEITAS[obterElemento('recipe-select').value];
    const comparacao = jogo.inventario.compararConjuntos(receita.custos);
    for (const [id, chave] of [
      ['set-a', 'a'],
      ['set-b', 'b'],
      ['set-union', 'uniao'],
      ['set-intersection', 'intersecao'],
      ['set-difference', 'diferenca'],
      ['set-missing', 'tiposFaltantes'],
    ]) {
      mostrarTexto(id, formatarConjunto(comparacao[chave]));
    }
    mostrarTexto(
      'set-subset',
      comparacao.contido
        ? `B ⊆ A: sim, todos os tipos estão presentes. ${jogo.inventario.podePagar(receita.custos) ? 'As quantidades também bastam.' : 'Ainda faltam quantidades para fabricar.'}`
        : 'B ⊆ A: não. Ainda faltam tipos desta receita.',
    );
  }

  // Temporizadores e eventos visuais
  atualizarTemporizadores() {
    const minerando = jogo.atividade === 'mine';
    const combatendo = jogo.atividade === 'fight';
    const descansando = jogo.atividade === 'rest';
    const mineSeconds = jogo.minaAtual.segundos(jogo.picareta);
    obterElemento('mine-progress').style.width =
      `${minerando ? (jogo.tempoDecorrido / mineSeconds) * 100 : 0}%`;
    mostrarTexto(
      'mine-timer',
      formatarSegundos(
        minerando ? Math.max(0, mineSeconds - jogo.tempoDecorrido) : mineSeconds,
      ),
    );
    const turnSeconds = descansando ? 1 : SEGUNDOS_ATAQUE;
    obterElemento('fight-progress').style.width =
      `${combatendo || descansando ? (jogo.tempoDecorrido / turnSeconds) * 100 : 0}%`;
    mostrarTexto('turn-label', descansando ? 'Próxima recuperação' : 'Próximo turno');
    mostrarTexto(
      'fight-timer',
      formatarSegundos(
        combatendo || descansando
          ? Math.max(0, turnSeconds - jogo.tempoDecorrido)
          : turnSeconds,
      ),
    );
  }

  atualizarEventos() {
    mostrarTexto('journal', jogo.eventos[0]);
    if (this.ultimoEvento === jogo.numeroEvento) {
      return;
    }
    this.ultimoEvento = jogo.numeroEvento;
    const arena = obterElemento('battle-scene');
    arena.classList.remove('attack-animation', 'kill-animation', 'defeat-animation');
    if (['attack', 'kill', 'victory', 'defeat'].includes(jogo.ultimoEvento)) {
      // Reinicia o movimento somente quando um turno efetivamente ocorre.
      void arena.offsetWidth;
      arena.classList.add(
        jogo.ultimoEvento === 'attack'
          ? 'attack-animation'
          : jogo.ultimoEvento === 'defeat'
            ? 'defeat-animation'
            : 'kill-animation',
      );
      mostrarTexto('hero-damage-number', `−${jogo.monstro.dano}`);
      mostrarTexto('monster-damage-number', `−${jogo.guerreiro.espada.dano}`);
    }
  }
}
const tela = new TelaDoJogo();
function persistir() {
  if (salvamentoInvalido) {
    mostrarTexto('save-status', 'Save original preservado');
    return;
  }
  try {
    localStorage.setItem(CHAVE_SALVAMENTO, JSON.stringify(jogo.salvar()));
    mostrarTexto('save-status', 'Salvo localmente');
  } catch {
    mostrarTexto('save-status', 'Salvamento indisponível');
  }
}
function atualizarESalvar() {
  tela.atualizar();
  persistir();
}
for (const [id, atividade] of [
  ['mine', 'mine'],
  ['fight', 'fight'],
  ['rest', 'rest'],
])
  obterElemento(id).addEventListener('click', () => {
    jogo.selecionarAtividade(atividade);
    atualizarESalvar();
  });
for (const [id, area] of [
  ['mine-surface', 'surface'],
  ['mine-deep', 'deep'],
])
  obterElemento(id).addEventListener('click', () => {
    if (jogo.selecionarMina(area)) {
      atualizarESalvar();
    }
  });
obterElemento('craft').addEventListener('click', () => {
  if (jogo.fabricarEspada(obterElemento('forge-select').value)) {
    tela.selecionarProximaReceita();
    atualizarESalvar();
  }
});
obterElemento('upgrade-pickaxe').addEventListener('click', () => {
  if (jogo.melhorarPicareta()) {
    atualizarESalvar();
  }
});
obterElemento('forge-select').addEventListener('change', () => tela.atualizarForja());
obterElemento('recipe-select').addEventListener('change', () =>
  tela.atualizarConjuntos(),
);
obterElemento('draw-count').addEventListener('input', () =>
  tela.atualizarProbabilidade(),
);
obterElemento('dismiss-notice').addEventListener('click', () => {
  jogo.aviso = '';
  tela.atualizar();
});
obterElemento('restart').addEventListener('click', () => {
  if (
    !window.confirm(
      'Recomeçar? Materiais, espadas, moedas, picareta e vitórias deste navegador serão substituídos por uma nova aventura.',
    )
  ) {
    return;
  }
  jogo = new Jogo();
  salvamentoInvalido = false;
  tela.selecionarProximaReceita();
  atualizarESalvar();
});
// Um relógio para todo o jogo. Aba oculta não ganha recursos nem executa duelos.
let tempoAnterior = performance.now();
setInterval(() => {
  const tempoAtual = performance.now();
  const segundos = (tempoAtual - tempoAnterior) / 1000;
  tempoAnterior = tempoAtual;
  if (document.hidden || jogo.atividade === 'idle') {
    return;
  }
  const eventoAnterior = jogo.numeroEvento;
  const vidaAnterior = jogo.guerreiro.vida;
  jogo.avancarTempo(segundos);
  if (eventoAnterior !== jogo.numeroEvento || vidaAnterior !== jogo.guerreiro.vida) {
    atualizarESalvar();
  } else tela.atualizarTemporizadores();
}, 100);
document.addEventListener('visibilitychange', () => {
  tempoAnterior = performance.now();
  if (document.hidden) {
    persistir();
  }
});
window.addEventListener('pagehide', persistir);
tela.atualizar();
persistir();
