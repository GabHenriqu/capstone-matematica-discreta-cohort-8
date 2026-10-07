import { RECEITAS, INIMIGOS } from '../dados/configuracao.mjs';
export class Espada {
  constructor(tipo = 'madeira') {
    if (!Object.hasOwn(RECEITAS, tipo)) {
      throw new Error('Espada desconhecida.');
    }
    this.tipo = tipo;
  }

  get dano() {
    return RECEITAS[this.tipo].dano;
  }

  get nome() {
    return RECEITAS[this.tipo].nome;
  }
}
export class Guerreiro {
  constructor() {
    this.vidaMaxima = 100;
    this.vida = 100;
    this.espada = new Espada();
  }

  recuperarVida(quantidade) {
    this.vida = Math.min(this.vidaMaxima, this.vida + quantidade);
  }
}
export class Monstro {
  constructor(nivel = 1, vida) {
    const atributos = INIMIGOS[nivel - 1];
    if (!atributos) {
      throw new Error('Inimigo desconhecido.');
    }
    this.nivel = nivel;
    Object.assign(this, atributos);
    this.vidaMaxima = atributos.vida;
    this.vida = vida ?? atributos.vida;
  }
}
/** Uma atividade por vez. Um encontro pode ficar pausado, mas descanso o abandona. */
