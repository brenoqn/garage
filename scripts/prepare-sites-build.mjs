import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const angularOutput = resolve(root, 'dist', 'garage', 'browser');
const sitesOutput = resolve(root, 'dist');
const clientOutput = resolve(sitesOutput, 'client');
const serverOutput = resolve(sitesOutput, 'server');

if (!existsSync(angularOutput)) {
  throw new Error(`Angular output not found at ${angularOutput}`);
}

rmSync(clientOutput, { recursive: true, force: true });
rmSync(serverOutput, { recursive: true, force: true });
mkdirSync(clientOutput, { recursive: true });
mkdirSync(serverOutput, { recursive: true });
cpSync(angularOutput, clientOutput, { recursive: true });

const worker = `const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    if (request.method === 'GET' && response.status === 404 && !url.pathname.split('/').at(-1)?.includes('.')) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    return response;
  },
};

export default worker;
`;

writeFileSync(resolve(serverOutput, 'index.js'), worker, 'utf8');
console.log('Sites build prepared in dist/client and dist/server.');
