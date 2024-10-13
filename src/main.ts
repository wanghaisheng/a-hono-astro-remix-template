import 'dotenv/config';
import { ServerBuild } from '@remix-run/node';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { remix as createRequestHandler } from 'remix-hono/handler';
import { Hono } from 'hono';
import { trimTrailingSlash } from 'hono/trailing-slash';

import { IS_PROD } from './config/server';
import { httpLogger, logger as parentLogger } from './utils/logger';
import { auth } from './lib/auth';
import { cache } from './middlewares/cache';
import {
  authMiddleware,
  authRouter,
  bullBoardAuthMiddleware,
} from './middlewares/auth';
import { paymentRouter } from './middlewares/payment';
import { apiRouter } from './api';
import { bullboardServerAdapter } from './queues';
import { workers } from './workers/register';

const logger = parentLogger.child({ component: 'main' });

logger.info(`imported workers: ${workers.map((w) => w.name).join(', ')}`);

const viteDevServer = IS_PROD
  ? undefined
  : await import('vite').then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
        appType: 'custom',
      }),
    );

const remixHandler = createRequestHandler({
  getLoadContext: (c) => ({
    user: c.var.user,
    session: c.var.session,
  }),
  // @ts-ignore
  build: viteDevServer
    ? () =>
        viteDevServer.ssrLoadModule(
          'virtual:remix/server-build',
        ) as Promise<ServerBuild>
    : await import('../build/server/index.js'),
});

const app = new Hono();

app.use(trimTrailingSlash());

// TODO: https://github.com/honojs/node-server/issues/39#issuecomment-1521589561
// app.use(compress());

// if (IS_PROD) {
//   app.use(httpLogger);
// }

// handle asset requests
app.use(
  '/assets/*',
  cache(60 * 60 * 24 * 365), // 1 year
  serveStatic({ root: './build/client' }),
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(
  '*',
  cache(60 * 60), // 1 hour
  serveStatic({
    root: IS_PROD ? './build/client' : './public',
  }),
);

// auth middleware (injects user and session into req)
app.use(authMiddleware);

// handle server-side auth redirects
app.route('/api/auth', authRouter);

// handle stripe webhook
app.route('/api/payment', paymentRouter);

// api routes
app.route('/api', apiRouter);

// handle bull-board requests
app.use('/ctrls', bullBoardAuthMiddleware);
app.route('/ctrls', bullboardServerAdapter.registerPlugin());

// health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// handle SSR requests
app.all('*', remixHandler);

const port = Number(process.env.PORT ?? 3000);

if (IS_PROD) {
  serve(
    {
      ...app,
      port,
    },
    async () => {
      await auth.deleteExpiredSessions();
      logger.trace('Deleted expired sessions');
      logger.info(`Hono server listening at http://localhost:${port}`);
    },
  );
}

export default app;
