import { PROBABILIDADES_SUPERFICIE } from '../dados/configuracao.mjs';

// A probabilidade de cada resultado é seu peso dividido pela soma dos pesos.
export class SorteioPonderado {
  constructor(pesos = PROBABILIDADES_SUPERFICIE, geradorAleatorio = Math.random) {
    this.resultadosEPesos = Object.entries(pesos);
    this.pesoTotal = this.resultadosEPesos.reduce((soma, [, peso]) => soma + peso, 0);
    const existePesoInvalido = this.resultadosEPesos.some(
      ([, peso]) => !Number.isFinite(peso) || peso <= 0,
    );

    if (this.resultadosEPesos.length === 0 || existePesoInvalido) {
      throw new Error('Pesos devem ser positivos.');
    }
    this.geradorAleatorio = geradorAleatorio;
  }

  sortear() {
    const numeroSorteado = this.geradorAleatorio();
    if (!Number.isFinite(numeroSorteado) || numeroSorteado < 0 || numeroSorteado >= 1) {
      throw new Error('Sorteio fora de [0, 1).');
    }

    const pontoSorteado = numeroSorteado * this.pesoTotal;
    let pesoAcumulado = 0;
    for (const [material, peso] of this.resultadosEPesos) {
      // Evita deslocar uma fronteira como 0,85 por arredondamento binário.
      pesoAcumulado = Number((pesoAcumulado + peso).toPrecision(15));
      if (pontoSorteado < pesoAcumulado) {
        return material;
      }
    }
    return this.resultadosEPesos.at(-1)[0];
  }

  static probabilidadeDeAoMenosUm(probabilidade, sorteios) {
    // Complementar de nenhum sucesso, com p fixo e sorteios independentes.
    return 1 - (1 - probabilidade) ** sorteios;
  }
}
