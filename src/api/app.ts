import express from 'express';

import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { jobRouter } from './routes/job.routes.js';
import { pipelineRouter } from './routes/pipeline.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';

export function createApp() {
	const app = express();

	app.use(express.json());

	app.use(healthRouter);
	app.use(authRouter);
	app.use(pipelineRouter);
	app.use(webhookRouter);
	app.use(jobRouter);

	return app;
}
