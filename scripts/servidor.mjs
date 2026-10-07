/** Servidor local sem dependências. Execute npm start na raiz do projeto. */
import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path';

const pastaProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const porta = Number(process.env.PORT || 5182);
const tiposDeConteudo = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};

// Apenas arquivos do projeto com extensões conhecidas são servidos.
const servidor = http.createServer(async (requisicao, resposta) => {
  if (!['GET', 'HEAD'].includes(requisicao.method)) {
    resposta.writeHead(405, { Allow: 'GET, HEAD' });
    resposta.end();
    return;
  }

  try {
    const endereco = new URL(requisicao.url, 'http://localhost');
    const caminhoPedido = decodeURIComponent(endereco.pathname);
    const caminhoPagina = caminhoPedido === '/' ? '/index.html' : caminhoPedido;
    const arquivo = await realpath(resolve(pastaProjeto, '.' + caminhoPagina));
    const caminhoRelativo = relative(pastaProjeto, arquivo);
    const tipoConteudo = tiposDeConteudo[extname(arquivo)];

    if (
      caminhoRelativo.startsWith('..') ||
      isAbsolute(caminhoRelativo) ||
      !tipoConteudo
    ) {
      resposta.writeHead(403);
      resposta.end('Acesso negado');
      return;
    }

    const conteudo = await readFile(arquivo);
    resposta.writeHead(200, {
      'Content-Type': tipoConteudo,
      'Content-Length': conteudo.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'",
    });
    resposta.end(requisicao.method === 'HEAD' ? undefined : conteudo);
  } catch {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    resposta.end('Arquivo não encontrado');
  }
});

servidor.on('error', (erro) => {
  console.error(
    `Não foi possível iniciar: ${erro.message}. Escolha outra PORT se estiver ocupada.`,
  );
  process.exitCode = 1;
});
servidor.listen(porta, '127.0.0.1', () => {
  console.log(`Forja do Acaso: http://127.0.0.1:${porta}/\nCtrl+C encerra o servidor.`);
});
