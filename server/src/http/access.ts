import { createPublicKey, verify, type JsonWebKey, type KeyObject } from 'node:crypto';
import type { Request, RequestHandler } from 'express';

/**
 * Barreira de acesso das rotas de dados.
 *
 * Em produção o Garage fica atrás do Cloudflare Access. Toda requisição que chega pela borda
 * traz o JWT `Cf-Access-Jwt-Assertion`; a API valida assinatura, emissor, audiência e validade
 * e, opcionalmente, o e-mail. Isso evita que a API aceite dados se a rota for exposta por outro
 * caminho (porta publicada, proxy mal configurado) sem passar pelo Access.
 */
export type AccessConfig =
  | {
      readonly mode: 'cloudflare';
      readonly teamDomain: string;
      readonly audience: string;
      readonly allowedEmails: readonly string[];
    }
  | { readonly mode: 'disabled-local' };

export interface AccessIdentity {
  readonly email?: string;
}

export type KeyResolver = (kid: string) => Promise<KeyObject | undefined>;

const CLOCK_SKEW_SECONDS = 60;
const KEY_CACHE_MS = 10 * 60_000;
const MIN_REFRESH_INTERVAL_MS = 30_000;

function base64UrlJson(segment: string): Record<string, unknown> {
  const value: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid JWT segment');
  }
  return value as Record<string, unknown>;
}

function denied(): never {
  throw new Error('Access denied');
}

/** Busca e guarda em cache as chaves públicas do time no Cloudflare Access. */
export function cloudflareKeyResolver(
  teamDomain: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): KeyResolver {
  let keys = new Map<string, KeyObject>();
  let fetchedAt = 0;
  let pending: Promise<void> | undefined;
  const refresh = async (): Promise<void> => {
    const response = await fetchImpl(`https://${teamDomain}/cdn-cgi/access/certs`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Unable to fetch Access certificates');
    const body = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const next = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (jwk.kid && jwk.kty === 'RSA')
        next.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    }
    keys = next;
    fetchedAt = now();
  };
  return async (kid) => {
    const stale = now() - fetchedAt > KEY_CACHE_MS;
    const unknownKid = !keys.has(kid) && now() - fetchedAt > MIN_REFRESH_INTERVAL_MS;
    if (stale || unknownKid) {
      pending ??= refresh().finally(() => {
        pending = undefined;
      });
      try {
        await pending;
      } catch {
        // Mantém as chaves anteriores; sem chave válida a requisição é negada.
      }
    }
    return keys.get(kid);
  };
}

/** Valida um JWT RS256 do Cloudflare Access e devolve a identidade. Lança 403 em qualquer falha. */
export async function verifyAccessToken(
  token: string,
  config: Extract<AccessConfig, { mode: 'cloudflare' }>,
  resolveKey: KeyResolver,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<AccessIdentity> {
  const parts = token.split('.');
  if (parts.length !== 3) denied();
  const [headerSegment, payloadSegment, signatureSegment] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = base64UrlJson(headerSegment);
    payload = base64UrlJson(payloadSegment);
  } catch {
    return denied();
  }
  if (header['alg'] !== 'RS256' || typeof header['kid'] !== 'string') denied();
  const key = await resolveKey(header['kid']);
  if (!key) denied();
  const signed = verify(
    'RSA-SHA256',
    Buffer.from(`${headerSegment}.${payloadSegment}`),
    key,
    Buffer.from(signatureSegment, 'base64url'),
  );
  if (!signed) denied();

  const audience = payload['aud'];
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(config.audience)) denied();
  if (payload['iss'] !== `https://${config.teamDomain}`) denied();
  const exp = payload['exp'];
  if (typeof exp !== 'number' || exp + CLOCK_SKEW_SECONDS < nowSeconds) denied();
  const nbf = payload['nbf'];
  if (typeof nbf === 'number' && nbf - CLOCK_SKEW_SECONDS > nowSeconds) denied();
  const email = typeof payload['email'] === 'string' ? payload['email'].toLowerCase() : undefined;
  if (config.allowedEmails.length > 0 && (!email || !config.allowedEmails.includes(email))) {
    denied();
  }
  return { email };
}

function tokenFrom(request: Request): string | undefined {
  const header = request.get('Cf-Access-Jwt-Assertion');
  if (header) return header;
  const cookie = request.get('Cookie');
  const match = cookie?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match?.[1];
}

/** Middleware das rotas `/api`. No modo `disabled-local` não valida nada (somente loopback). */
export function accessMiddleware(config: AccessConfig, resolveKey?: KeyResolver): RequestHandler {
  if (config.mode === 'disabled-local') return (_request, _response, next) => next();
  const resolver = resolveKey ?? cloudflareKeyResolver(config.teamDomain);
  return (request, response, next) => {
    const token = tokenFrom(request);
    if (!token) {
      response.status(401).json({ code: 'UNAUTHENTICATED', message: 'Access required' });
      return;
    }
    verifyAccessToken(token, config, resolver).then(
      (identity) => {
        response.locals['accessIdentity'] = identity;
        next();
      },
      () => {
        response.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
      },
    );
  };
}
