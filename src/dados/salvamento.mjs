// A conversão é apenas de nomes: não altera números, tipos nem versões.
// As chaves antigas continuam no localStorage para ler saves v1, v2 e v3.
const nomesInternos = {
  hp: 'vida',
  counts: 'quantidades',
  draws: 'sorteios',
  level: 'nivel',
  coins: 'moedas',
  sword: 'espada',
  monsterHp: 'vidaMonstro',
  cleared: 'niveisVencidos',
  victory: 'vitoria',
  encounter: 'encontroAtivo',
  pickaxeLevel: 'nivelPicareta',
  areaDraws: 'sorteiosPorArea',
  unknownDraws: 'sorteiosSemArea',
  version: 'versao',
  defeated: 'quantidadeVencidos',
};
const nomesAntigos = Object.fromEntries(
  Object.entries(nomesInternos).map(([antigo, interno]) => [interno, antigo]),
);
function converterObjeto(valor, mapa) {
  if (Array.isArray(valor)) return valor.map((item) => converterObjeto(item, mapa));
  if (valor === null || typeof valor !== 'object') return valor;
  return Object.fromEntries(
    Object.entries(valor).map(([chave, item]) => [
      mapa[chave] ?? chave,
      converterObjeto(item, mapa),
    ]),
  );
}
export function carregarDados(dados) {
  return converterObjeto(dados, nomesInternos);
}
export function serializarDados(dados) {
  return converterObjeto(dados, nomesAntigos);
}
