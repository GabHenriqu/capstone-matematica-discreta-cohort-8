import { MATERIAIS } from '../dados/configuracao.mjs';

// O estoque guarda quantidades. Os conjuntos abaixo guardam somente os tipos.
export class Inventario {
  constructor(quantidades = {}) {
    this.quantidades = {};
    for (const material of MATERIAIS) {
      this.quantidades[material] = quantidades[material] ?? 0;
    }
  }

  adicionar(material) {
    if (!MATERIAIS.includes(material)) {
      throw new Error('Material desconhecido.');
    }
    this.quantidades[material]++;
  }

  get tiposPresentes() {
    const materiaisComEstoque = MATERIAIS.filter(
      (material) => this.quantidades[material] > 0,
    );
    return new Set(materiaisComEstoque);
  }

  podePagar(custos) {
    for (const [material, quantidadeNecessaria] of Object.entries(custos)) {
      if (this.quantidades[material] < quantidadeNecessaria) {
        return false;
      }
    }
    return true;
  }

  pagar(custos) {
    // Valida tudo antes de descontar: uma receita incompleta não gasta nada.
    if (!this.podePagar(custos)) {
      return false;
    }
    for (const [material, quantidadeNecessaria] of Object.entries(custos)) {
      this.quantidades[material] -= quantidadeNecessaria;
    }
    return true;
  }

  compararConjuntos(custos) {
    // A = tipos no inventário; B = tipos da receita. Set não repete elementos.
    const conjuntoInventario = this.tiposPresentes;
    const conjuntoReceita = new Set(Object.keys(custos));
    const uniao = new Set([...conjuntoInventario, ...conjuntoReceita]);
    const intersecao = new Set(
      [...conjuntoInventario].filter((material) => conjuntoReceita.has(material)),
    );
    const diferenca = new Set(
      [...conjuntoInventario].filter((material) => !conjuntoReceita.has(material)),
    );
    const tiposFaltantes = new Set(
      [...conjuntoReceita].filter((material) => !conjuntoInventario.has(material)),
    );
    const contido = [...conjuntoReceita].every((material) =>
      conjuntoInventario.has(material),
    );

    // B ⊆ A verifica tipos; podePagar verifica as quantidades separadamente.
    return {
      a: conjuntoInventario,
      b: conjuntoReceita,
      uniao,
      intersecao,
      diferenca,
      tiposFaltantes,
      contido,
    };
  }
}
