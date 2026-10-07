// A picareta muda o tempo da ação, nunca a chance de um material.
// Velocidade = 1,2^(nível - 1); intervalo = tempo-base / velocidade.
import { MINAS } from '../dados/configuracao.mjs';
export class Picareta {
  constructor(nivel = 1) {
    this.nivel = nivel;
  }

  get velocidade() {
    return 1.2 ** (this.nivel - 1);
  }

  get custoMelhoria() {
    return [100, 400][this.nivel - 1] ?? null;
  }
}
export class Mina {
  constructor(tipo = 'surface') {
    if (!Object.hasOwn(MINAS, tipo)) {
      throw new Error('Área de mineração desconhecida.');
    }
    this.tipo = tipo;
    Object.assign(this, MINAS[tipo]);
  }

  segundos(picareta) {
    return this.segundosBase / picareta.velocidade;
  }
}
