import {
  MATERIAIS,
  SEGUNDOS_ATAQUE,
  MINAS,
  RECEITAS,
  INIMIGOS,
} from '../dados/configuracao.mjs';
import { Picareta, Mina } from './ferramentas.mjs';
import { Inventario } from './inventario.mjs';
import { Guerreiro, Espada, Monstro } from './personagens.mjs';
import { SorteioPonderado } from '../matematica/sorteio-ponderado.mjs';
import { carregarDados, serializarDados } from '../dados/salvamento.mjs';
function inteiroValido(numero) {
  return Number.isSafeInteger(numero) && numero >= 0 && numero <= 100000000;
}

function recursosValidos(dados) {
  if (!dados.quantidades || !dados.sorteios) {
    return false;
  }
  for (const material of MATERIAIS) {
    const quantidade = dados.quantidades[material];
    const totalSorteado = dados.sorteios[material];
    if (!inteiroValido(quantidade) || !inteiroValido(totalSorteado)) {
      return false;
    }
    if (quantidade > totalSorteado) {
      return false;
    }
  }
  return true;
}

function sorteiosVazios() {
  return Object.fromEntries(MATERIAIS.map((material) => [material, 0]));
}
/** Coordena mineração, combate, descanso e progresso; não conhece o DOM. */
export class Jogo {
  constructor(geradorAleatorio = Math.random) {
    // Injete uma fonte [0,1) para testes; cada área continua com seus próprios pesos.
    this.geradorAleatorio =
      geradorAleatorio instanceof SorteioPonderado
        ? geradorAleatorio.geradorAleatorio
        : geradorAleatorio;
    this.inventario = new Inventario();
    this.guerreiro = new Guerreiro();
    this.monstro = new Monstro();
    this.sorteios = Object.fromEntries(MATERIAIS.map((material) => [material, 0]));
    this.minaAtual = new Mina();
    this.picareta = new Picareta();
    this.moedas = 0;
    this.sorteiosPorArea = {
      surface: sorteiosVazios(),
      deep: sorteiosVazios(),
    };
    this.sorteiosSemArea = sorteiosVazios();
    this.niveisVencidos = new Set();
    this.vitoria = false;
    this.atividade = 'idle';
    this.encontroAtivo = false;
    this.tempoDecorrido = 0;
    this.numeroEvento = 0;
    this.ultimoEvento = 'start';
    this.eventos = ['Espada de madeira equipada. Selecione uma atividade.'];
    this.aviso = '';
  }

  registrarEvento(texto, evento = 'info') {
    this.eventos.unshift(texto);
    this.eventos = this.eventos.slice(0, 5);
    this.ultimoEvento = evento;
    this.numeroEvento++;
  }

  get totalSorteios() {
    return Object.values(this.sorteios).reduce(
      (soma, quantidade) => soma + quantidade,
      0,
    );
  }

  get nivelLiberado() {
    return Math.min(10, this.niveisVencidos.size + 1);
  }

  get intervalo() {
    if (this.atividade === 'mine') {
      return this.minaAtual.segundos(this.picareta);
    }
    if (this.atividade === 'fight') {
      return SEGUNDOS_ATAQUE;
    }
    return 1;
  }

  get totalSorteiosDaArea() {
    return Object.values(this.sorteiosPorArea[this.minaAtual.tipo]).reduce(
      (soma, quantidade) => soma + quantidade,
      0,
    );
  }

  podeSelecionarMina(tipo) {
    return (
      Object.hasOwn(MINAS, tipo) &&
      (!MINAS[tipo].nivelDesbloqueio ||
        this.niveisVencidos.has(MINAS[tipo].nivelDesbloqueio))
    );
  }

  // Escolhas e melhorias
  selecionarMina(tipo) {
    if (!this.podeSelecionarMina(tipo) || tipo === this.minaAtual.tipo) {
      return false;
    }
    this.minaAtual = new Mina(tipo);
    if (this.atividade === 'mine') {
      this.tempoDecorrido = 0;
    }
    this.registrarEvento(`Área de mineração selecionada: ${this.minaAtual.nome}.`);
    return true;
  }

  melhorarPicareta() {
    const custo = this.picareta.custoMelhoria;
    if (custo === null || this.moedas < custo) {
      return false;
    }
    const progress =
      this.atividade === 'mine' ? this.tempoDecorrido / this.intervalo : 0;
    this.moedas -= custo;
    this.picareta.nivel++;
    if (this.atividade === 'mine') {
      this.tempoDecorrido = progress * this.intervalo;
    }
    this.registrarEvento(
      `Picareta nível ${this.picareta.nivel}: velocidade +20%. −${custo} moedas.`,
      'upgrade',
    );
    return true;
  }

  abandonarEncontro() {
    if (!this.encontroAtivo) {
      return;
    }
    this.monstro.vida = this.monstro.vidaMaxima;
    this.encontroAtivo = false;
    this.registrarEvento(
      'Encontro abandonado. O inimigo recuperou toda a vida.',
      'retreat',
    );
  }

  selecionarAtividade(atividade) {
    if (!['idle', 'mine', 'fight', 'rest'].includes(atividade)) {
      return;
    }
    if (atividade === 'fight' && this.guerreiro.vida <= 0) {
      return;
    }
    if (this.atividade === atividade) {
      this.atividade = 'idle';
      this.tempoDecorrido = 0;
      this.registrarEvento(
        this.encontroAtivo
          ? 'Combate pausado. A vida dos dois ficou congelada.'
          : 'Atividade pausada.',
      );
      return;
    }
    if (atividade === 'mine' || atividade === 'rest') {
      this.abandonarEncontro();
    }
    if (atividade === 'fight') {
      if (!this.encontroAtivo) {
        this.monstro.vida = this.monstro.vidaMaxima;
      }
      this.encontroAtivo = true;
    }
    this.atividade = atividade;
    this.tempoDecorrido = 0;
  }

  selecionarMonstro(nivel) {
    if (
      !Number.isInteger(nivel) ||
      nivel < 1 ||
      nivel > this.nivelLiberado ||
      nivel === this.monstro.nivel
    ) {
      return false;
    }
    this.abandonarEncontro();
    this.monstro = new Monstro(nivel);
    this.atividade = 'idle';
    this.tempoDecorrido = 0;
    this.registrarEvento(`Alvo selecionado: ${this.monstro.nome}, nível ${nivel}.`);
    return true;
  }

  // Mineração e fabricação
  minerar() {
    const material = new SorteioPonderado(
      this.minaAtual.probabilidades,
      this.geradorAleatorio,
    ).sortear();
    this.inventario.adicionar(material);
    this.sorteios[material]++;
    this.sorteiosPorArea[this.minaAtual.tipo][material]++;
    this.registrarEvento(`+1 ${material} extraído da mina.`, 'mine');
    return material;
  }

  fabricarEspada(tipo) {
    const ordemEspadas = Object.keys(RECEITAS);
    if (
      !Object.hasOwn(RECEITAS, tipo) ||
      ordemEspadas.indexOf(tipo) <= ordemEspadas.indexOf(this.guerreiro.espada.tipo)
    ) {
      return false;
    }
    if (!this.inventario.pagar(RECEITAS[tipo].custos)) {
      return false;
    }
    this.guerreiro.espada = new Espada(tipo);
    this.registrarEvento(`Espada de ${tipo} forjada e equipada.`, 'forge');
    return true;
  }

  // Combate e relógio
  combater() {
    if (!this.encontroAtivo || this.guerreiro.vida <= 0) {
      return;
    }
    this.monstro.vida = Math.max(0, this.monstro.vida - this.guerreiro.espada.dano);
    if (this.monstro.vida === 0) {
      const primeiraVitoria = !this.niveisVencidos.has(this.monstro.nivel);
      this.niveisVencidos.add(this.monstro.nivel);
      this.encontroAtivo = false;
      this.moedas += this.monstro.moedas;
      if (this.monstro.nivel === 10) {
        this.vitoria = true;
        this.atividade = 'idle';
        this.registrarEvento(
          `Dragão vencido. +${this.monstro.moedas} moedas. Campanha concluída!`,
          'victory',
        );
      } else {
        this.registrarEvento(
          `${this.monstro.nome} vencido. +${this.monstro.moedas} moedas.${
            primeiraVitoria
              ? ` Nível ${this.nivelLiberado}
        liberado.`
              : ' Alvo repetido.'
          }${primeiraVitoria && this.monstro.nivel === 3 ? ' Mina profunda liberada.' : ''}`,
          'kill',
        );
        // Repetição mantém o alvo escolhido; só a seleção manual troca de inimigo.
        this.monstro.vida = this.monstro.vidaMaxima;
        this.encontroAtivo = true;
      }
      return;
    }
    this.guerreiro.vida = Math.max(0, this.guerreiro.vida - this.monstro.dano);
    if (this.guerreiro.vida === 0) {
      this.monstro.vida = this.monstro.vidaMaxima;
      this.encontroAtivo = false;
      this.atividade = 'rest';
      this.tempoDecorrido = 0;
      this.registrarEvento(
        'Derrota. Inimigo restaurado; descanso automático iniciado.',
        'defeat',
      );
    } else
      this.registrarEvento(
        `Golpe: −${this.guerreiro.espada.dano} no inimigo; resposta: −${this.monstro.dano} em você.`,
        'attack',
      );
  }

  avancarTempo(segundos) {
    if (this.atividade === 'idle') {
      return;
    }
    this.tempoDecorrido += Math.min(Math.max(segundos, 0), 2);
    while (this.tempoDecorrido >= this.intervalo) {
      this.tempoDecorrido -= this.intervalo;
      if (this.atividade === 'mine') {
        this.minerar();
      } else if (this.atividade === 'fight') {
        this.combater();
      } else if (this.atividade === 'rest') {
        this.guerreiro.recuperarVida(10);
        if (this.guerreiro.vida === 100) {
          this.atividade = 'idle';
          this.tempoDecorrido = 0;
          this.registrarEvento(
            'Vida recuperada. Escolha sua próxima atividade.',
            'rested',
          );
        }
      } else break;
    }
  }
  /** Diagnóstico de um duelo começando com vida cheia; sem probabilidades no dano. */
  preverCombate(nivel = this.monstro.nivel, espada = this.guerreiro.espada.tipo) {
    const inimigo = INIMIGOS[nivel - 1];
    const ataques = Math.ceil(inimigo.vida / RECEITAS[espada].dano);
    const danoRecebido = (ataques - 1) * inimigo.dano;
    return {
      ataques,
      danoRecebido,
      viavel: danoRecebido < this.guerreiro.vidaMaxima,
    };
  }

  // Persistência e compatibilidade
  salvar() {
    return serializarDados({
      versao: 3,
      quantidades: {
        ...this.inventario.quantidades,
      },
      sorteios: {
        ...this.sorteios,
      },
      vida: this.guerreiro.vida,
      espada: this.guerreiro.espada.tipo,
      nivel: this.monstro.nivel,
      vidaMonstro: this.monstro.vida,
      niveisVencidos: [...this.niveisVencidos].sort(
        (primeiroNivel, segundoNivel) => primeiroNivel - segundoNivel,
      ),
      vitoria: this.vitoria,
      encontroAtivo: this.encontroAtivo,
      moedas: this.moedas,
      nivelPicareta: this.picareta.nivel,
      area: this.minaAtual.tipo,
      sorteiosPorArea: {
        surface: {
          ...this.sorteiosPorArea.surface,
        },
        deep: {
          ...this.sorteiosPorArea.deep,
        },
      },
      sorteiosSemArea: {
        ...this.sorteiosSemArea,
      },
    });
  }

  static restaurar(dados) {
    dados = carregarDados(dados);
    if (
      !dados ||
      !recursosValidos(dados) ||
      !Number.isInteger(dados.vida) ||
      dados.vida < 0 ||
      dados.vida > 100 ||
      !Object.hasOwn(RECEITAS, dados.espada) ||
      !Number.isInteger(dados.nivel) ||
      dados.nivel < 1 ||
      dados.nivel > 10
    ) {
      throw new Error('Progresso inválido.');
    }
    if (dados.versao === 1) {
      return Jogo.migrar(dados);
    }
    const niveisVencidos = dados.niveisVencidos;
    if (
      ![2, 3].includes(dados.versao) ||
      !Array.isArray(niveisVencidos) ||
      niveisVencidos.length > 10 ||
      !niveisVencidos.every((nivel, indice) => nivel === indice + 1) ||
      dados.nivel > Math.min(10, niveisVencidos.length + 1) ||
      typeof dados.encontroAtivo !== 'boolean' ||
      typeof dados.vitoria !== 'boolean' ||
      dados.vitoria !== niveisVencidos.includes(10) ||
      !Number.isInteger(dados.vidaMonstro) ||
      dados.vidaMonstro < 0 ||
      dados.vidaMonstro > INIMIGOS[dados.nivel - 1].vida ||
      (dados.encontroAtivo && (dados.vidaMonstro === 0 || dados.vida === 0)) ||
      (!dados.encontroAtivo &&
        dados.vidaMonstro !== INIMIGOS[dados.nivel - 1].vida &&
        !(dados.nivel === 10 && dados.vitoria && dados.vidaMonstro === 0))
    ) {
      throw new Error('Progresso incoerente.');
    }
    const jogo = Jogo.comRecursos(dados);
    jogo.niveisVencidos = new Set(niveisVencidos);
    jogo.vitoria = dados.vitoria;
    jogo.encontroAtivo = dados.encontroAtivo;
    jogo.monstro = new Monstro(dados.nivel, dados.vidaMonstro);
    if (dados.versao === 2) {
      jogo.sorteiosSemArea = {
        ...dados.sorteios,
      };
      jogo.aviso =
        'Atualização v3: materiais, espada, vida, vitórias e encontro preservados. Moedas começam em zero e picareta no nível 1. Sorteios antigos permanecem no histórico sem área conhecida.';
    } else {
      if (
        !inteiroValido(dados.moedas) ||
        !Number.isInteger(dados.nivelPicareta) ||
        dados.nivelPicareta < 1 ||
        dados.nivelPicareta > 3 ||
        !jogo.podeSelecionarMina(dados.area) ||
        !dados.sorteiosPorArea?.surface ||
        !dados.sorteiosPorArea?.deep ||
        !dados.sorteiosSemArea ||
        !MATERIAIS.every(
          (material) =>
            inteiroValido(dados.sorteiosPorArea.surface[material]) &&
            inteiroValido(dados.sorteiosPorArea.deep[material]) &&
            inteiroValido(dados.sorteiosSemArea[material]) &&
            dados.sorteios[material] ===
              dados.sorteiosPorArea.surface[material] +
                dados.sorteiosPorArea.deep[material] +
                dados.sorteiosSemArea[material],
        )
      ) {
        throw new Error('Economia ou histórico inválido.');
      }
      jogo.moedas = dados.moedas;
      jogo.picareta = new Picareta(dados.nivelPicareta);
      jogo.minaAtual = new Mina(dados.area);
      jogo.sorteiosPorArea = {
        surface: {
          ...dados.sorteiosPorArea.surface,
        },
        deep: {
          ...dados.sorteiosPorArea.deep,
        },
      };
      jogo.sorteiosSemArea = {
        ...dados.sorteiosSemArea,
      };
    }
    jogo.registrarEvento(
      dados.encontroAtivo
        ? 'Encontro salvo recuperado em pausa. Descansar ou minerar o abandona.'
        : 'Progresso recuperado. Atividades pausadas.',
    );
    return jogo;
  }

  static comRecursos(dados) {
    const jogo = new Jogo();
    jogo.inventario = new Inventario(dados.quantidades);
    jogo.sorteios = {
      ...dados.sorteios,
    };
    jogo.guerreiro.vida = dados.vida;
    jogo.guerreiro.espada = new Espada(dados.espada);
    return jogo;
  }

  static migrar(dados) {
    if (
      typeof dados.vitoria !== 'boolean' ||
      dados.quantidadeVencidos !== (dados.vitoria ? 10 : dados.nivel - 1) ||
      !Number.isInteger(dados.vidaMonstro) ||
      dados.vidaMonstro < 0 ||
      dados.vidaMonstro > 20 + dados.nivel * 15 ||
      (dados.vitoria && (dados.nivel !== 10 || dados.vidaMonstro !== 0)) ||
      (!dados.vitoria && dados.vidaMonstro === 0)
    ) {
      throw new Error('Progresso antigo inválido.');
    }
    const jogo = Jogo.comRecursos(dados);
    jogo.niveisVencidos = new Set(
      Array.from(
        {
          length: dados.quantidadeVencidos,
        },
        (_, indice) => indice + 1,
      ),
    );
    jogo.vitoria = dados.vitoria;
    jogo.monstro = new Monstro(dados.nivel);
    jogo.sorteiosSemArea = {
      ...dados.sorteios,
    };
    jogo.aviso =
      'Atualização v3: materiais, espada, sorteios e vitórias preservados. O encontro v1 foi reiniciado com os novos atributos. Moedas começam em zero, picareta no nível 1 e histórico antigo sem área conhecida.';
    jogo.registrarEvento(jogo.aviso);
    return jogo;
  }
}
