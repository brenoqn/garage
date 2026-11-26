import { inject, Injectable, InjectionToken } from '@angular/core';
import type {
  GarageErrorCode,
  GarageSnapshot,
  ImportPreview,
  WriteResult,
} from '../../../../shared/garage';

/** `fetch` injetável para testes. */
export const GARAGE_FETCH = new InjectionToken<typeof fetch>('GarageFetch', {
  providedIn: 'root',
  factory: () => globalThis.fetch.bind(globalThis),
});

export type ApiFailureKind =
  'unauthenticated' | 'network' | 'conflict' | 'rejected' | 'not-found' | 'unavailable';

export interface ApiFailure {
  readonly kind: ApiFailureKind;
  readonly message: string;
  readonly code?: GarageErrorCode | 'UNAUTHENTICATED' | 'FORBIDDEN';
}

export type ApiResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly failure: ApiFailure };

export type CommandResult = WriteResult<{ readonly ids: readonly string[] }>;

const MESSAGES: Readonly<Record<ApiFailureKind, string>> = {
  unauthenticated:
    'Sua sessão de acesso expirou ou não foi iniciada. Recarregue a página e entre novamente.',
  network: 'Sem conexão com o servidor do Garage. Nada foi salvo.',
  conflict: 'Os dados mudaram no servidor desde a última leitura. Revise e tente de novo.',
  rejected: 'O servidor recusou a alteração.',
  'not-found': 'O registro não foi encontrado no servidor.',
  unavailable: 'O servidor do Garage está indisponível no momento. Nada foi salvo.',
};

/** Remove `undefined` e textos vazios: a API recusa campos vazios em vez de ignorá-los. */
export function compactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactPayload);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined && !(typeof item === 'string' && !item.trim()))
        .map(([key, item]) => [key, compactPayload(item)]),
    );
  }
  return value;
}

function newIdempotencyKey(): string {
  return `garage-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

/**
 * Cliente HTTP mínimo da Garage API, na mesma origem (`/api`). Não guarda segredo: a
 * autenticação é o cookie do Cloudflare Access, enviado pelo navegador.
 */
@Injectable({ providedIn: 'root' })
export class GarageApiClient {
  private readonly fetchImpl = inject(GARAGE_FETCH);

  snapshot(): Promise<ApiResult<GarageSnapshot>> {
    return this.request<GarageSnapshot>('GET', '/api/garage');
  }

  command(
    path: string,
    payload: unknown,
    expectedRevision: string,
  ): Promise<ApiResult<CommandResult>> {
    return this.request<CommandResult>(
      'POST',
      path,
      { expectedRevision, payload: compactPayload(payload) },
      newIdempotencyKey(),
    );
  }

  previewImport(backup: unknown): Promise<ApiResult<ImportPreview>> {
    return this.request<ImportPreview>('POST', '/api/garage/import/preview', { backup });
  }

  importBackup(
    backup: unknown,
    digest: string,
    expectedRevision: string,
  ): Promise<ApiResult<CommandResult>> {
    return this.request<CommandResult>(
      'POST',
      '/api/garage/import',
      { expectedRevision, payload: { backup, digest } },
      `garage-import-${digest}`,
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    let response: Response;
    try {
      response = await this.fetchImpl(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        // Uma sessão expirada do Access responde com redirecionamento para outra origem.
        redirect: 'manual',
        cache: 'no-store',
      });
    } catch {
      return this.failure('network');
    }
    if (response.type === 'opaqueredirect' || response.status === 401 || response.status === 403) {
      return this.failure('unauthenticated');
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return this.failure(response.ok ? 'unavailable' : 'unavailable');
    }
    if (response.ok) return { ok: true, value: parsed as T };
    const error = (parsed ?? {}) as { code?: ApiFailure['code']; message?: string };
    if (error.code === 'REVISION_CONFLICT' || error.code === 'IDEMPOTENCY_CONFLICT') {
      return this.failure('conflict', error);
    }
    if (response.status === 404 || error.code === 'NOT_FOUND')
      return this.failure('not-found', error);
    if (response.status >= 500 || error.code === 'PERSISTENCE_UNAVAILABLE') {
      return this.failure('unavailable', error);
    }
    return this.failure('rejected', error);
  }

  private failure(
    kind: ApiFailureKind,
    error?: { code?: ApiFailure['code']; message?: string },
  ): { ok: false; failure: ApiFailure } {
    const detail = kind === 'rejected' && error?.message ? ` Detalhe: ${error.message}.` : '';
    return {
      ok: false,
      failure: { kind, message: `${MESSAGES[kind]}${detail}`, code: error?.code },
    };
  }
}
