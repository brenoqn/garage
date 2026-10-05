import express from 'express';
import type { ErrorRequestHandler, Express, RequestHandler } from 'express';
import type { Pool } from 'pg';
import { GarageError } from '../../../shared/validation';
import { GarageService } from '../application/garage-service';
import { GarageRepository } from '../persistence/repositories';

type WriteAction = (key: string, body: unknown) => Promise<unknown>;

export interface AppDependencies {
  readonly pool: Pool;
  readonly expectedUser: string;
  readonly expectedDatabase: string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const service = new GarageService(dependencies.pool);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use((request, response, next) => {
    const started = performance.now();
    response.on('finish', () => {
      process.stdout.write(
        JSON.stringify({
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Math.round(performance.now() - started),
        }) + '\n',
      );
    });
    next();
  });

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/ready', async (_request, response) => {
    let client;
    try {
      client = await dependencies.pool.connect();
      const ready = await new GarageRepository(client).readiness(
        dependencies.expectedUser,
        dependencies.expectedDatabase,
      );
      response.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    } finally {
      client?.release();
    }
  });
  app.get('/api/garage', async (_request, response) => {
    response.json(await service.getGarage());
  });

  const write = (path: string, action: WriteAction): void => {
    const handler: RequestHandler = async (request, response) => {
      const key = request.get('Idempotency-Key');
      if (!key) {
        throw new GarageError('VALIDATION', 'Idempotency-Key is required', 428);
      }
      if (!/^[A-Za-z0-9._:-]{1,200}$/.test(key)) {
        throw new GarageError('VALIDATION', 'Valid Idempotency-Key is required', 400);
      }
      response.json(await action(key, request.body));
    };
    app.post(path, handler);
  };
  write('/api/garage/setup', service.setupGarage.bind(service));
  write('/api/garage/motorcycle', service.updateMotorcycle.bind(service));
  write('/api/garage/odometer', service.recordOdometer.bind(service));
  write('/api/garage/services', service.createService.bind(service));
  write('/api/garage/fuel', service.createFuelRecord.bind(service));
  write('/api/garage/expenses', service.createExpense.bind(service));
  write('/api/garage/occurrences', service.createOccurrence.bind(service));
  write('/api/garage/safety-checks', service.createSafetyCheck.bind(service));
  write('/api/garage/procedures/start', service.startProcedureExecution.bind(service));
  write('/api/garage/procedures/update', service.updateProcedureExecution.bind(service));
  write('/api/garage/procedures/finish', service.finishProcedureExecution.bind(service));
  write('/api/garage/procedures/cancel', service.cancelProcedureExecution.bind(service));
  write('/api/garage/procedures/restart', service.restartProcedureExecution.bind(service));
  write('/api/garage/settings', service.updateSettings.bind(service));

  app.use((_request, response) =>
    response.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }),
  );
  const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) return next(error);
    if (error instanceof GarageError) {
      response.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      response.status(413).json({ code: 'VALIDATION', message: 'Request body is too large' });
      return;
    }
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 400) {
      response.status(400).json({ code: 'VALIDATION', message: 'Invalid request body' });
      return;
    }
    process.stderr.write('Garage request failed\n');
    response
      .status(503)
      .json({ code: 'PERSISTENCE_UNAVAILABLE', message: 'Garage is temporarily unavailable' });
  };
  app.use(handleError);
  return app;
}
