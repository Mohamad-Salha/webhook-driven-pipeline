import express, { Request, Response } from 'express';

import { listDeliveriesByJobId } from '../services/delivery.service.js';
import { getJobById, listJobs, enqueueJob } from '../services/job.service.js';
import { createPipeline, deletePipeline, getPipelineById, getPipelineBySourcePath, listPipelines } from '../services/pipeline.service.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

type CreatePipelineRequest = {
	name?: unknown;
	actionType?: unknown;
	actionConfig?: unknown;
	subscribers?: unknown;
};

function sendError(res: Response, status: number, message: string): void {
	res.status(status).json({ error: message });
}

function normalizeSourcePath(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function validateCreatePipelineBody(body: CreatePipelineRequest): {
	ok: true;
	value: {
		name: string;
		actionType: string;
		actionConfig: Record<string, unknown>;
		subscribers: string[];
	};
} | {
	ok: false;
	message: string;
} {
	if (typeof body.name !== 'string' || body.name.trim().length < 3) {
		return { ok: false, message: 'name must be a string with at least 3 characters' };
	}

	if (typeof body.actionType !== 'string' || body.actionType.trim().length === 0) {
		return { ok: false, message: 'actionType is required' };
	}

	const actionConfig = body.actionConfig;
	if (actionConfig !== undefined && (typeof actionConfig !== 'object' || actionConfig === null || Array.isArray(actionConfig))) {
		return { ok: false, message: 'actionConfig must be an object' };
	}

	if (!Array.isArray(body.subscribers) || body.subscribers.length === 0) {
		return { ok: false, message: 'subscribers must be a non-empty array of URLs' };
	}

	const subscribers = body.subscribers;
	const areValidUrls = subscribers.every((url) => typeof url === 'string' && /^https?:\/\//.test(url));
	if (!areValidUrls) {
		return { ok: false, message: 'each subscriber must be a valid http/https URL' };
	}

	return {
		ok: true,
		value: {
			name: body.name.trim(),
			actionType: body.actionType.trim(),
			actionConfig: (actionConfig ?? {}) as Record<string, unknown>,
			subscribers,
		},
	};
}

app.get('/health', (_req: Request, res: Response) => {
	res.status(200).send('OK');
});

app.get('/', (_req: Request, res: Response) => {
	res.status(200).send('OK');
});

app.post('/pipelines', async (req: Request, res: Response) => {
	const parsed = validateCreatePipelineBody(req.body as CreatePipelineRequest);

	if (!parsed.ok) {
		sendError(res, 400, parsed.message);
		return;
	}

	try {
		const sourcePath = normalizeSourcePath(parsed.value.name);
		if (!sourcePath) {
			sendError(res, 400, 'name must include letters or numbers');
			return;
		}

		const created = await createPipeline({
			...parsed.value,
			sourcePath,
			actionConfig: {
				...parsed.value.actionConfig,
			},
			subscribers: parsed.value.subscribers,
		});

		res.status(201).json({
			...created,
			webhookUrl: `/webhook/${sourcePath}`,
		});
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to create pipeline');
	}
});

app.get('/pipelines', async (_req: Request, res: Response) => {
	try {
		const rows = await listPipelines();
		res.status(200).json(rows);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to list pipelines');
	}
});

app.get('/pipelines/:id', async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id) || id < 1) {
		sendError(res, 400, 'id must be a positive integer');
		return;
	}

	try {
		const pipeline = await getPipelineById(id);
		if (!pipeline) {
			sendError(res, 404, 'pipeline not found');
			return;
		}

		res.status(200).json(pipeline);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to fetch pipeline');
	}
});

app.delete('/pipelines/:id', async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id) || id < 1) {
		sendError(res, 400, 'id must be a positive integer');
		return;
	}

	try {
		const deleted = await deletePipeline(id);
		if (!deleted) {
			sendError(res, 404, 'pipeline not found');
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to delete pipeline');
	}
});

app.post('/webhook/:sourcePath', async (req: Request, res: Response) => {
	const sourcePathParam = req.params.sourcePath;
	const sourcePath = Array.isArray(sourcePathParam) ? sourcePathParam[0] : sourcePathParam;

	if (!sourcePath || sourcePath.trim().length === 0) {
		sendError(res, 400, 'sourcePath is required');
		return;
	}

	if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
		sendError(res, 400, 'webhook payload must be a JSON object');
		return;
	}

	try {
		const pipeline = await getPipelineBySourcePath(sourcePath);
		if (!pipeline) {
			sendError(res, 404, 'pipeline not found or inactive');
			return;
		}

		const job = await enqueueJob({
			pipelineId: pipeline.id,
			payload: req.body as Record<string, unknown>,
		});

		res.status(202).json({
			message: 'webhook accepted',
			jobId: job.id,
			status: job.status,
			pipelineId: pipeline.id,
		});
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to accept webhook');
	}
});

app.get('/jobs', async (_req: Request, res: Response) => {
	try {
		const jobs = await listJobs();
		res.status(200).json(jobs);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to list jobs');
	}
});

app.get('/jobs/:id', async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id) || id < 1) {
		sendError(res, 400, 'id must be a positive integer');
		return;
	}

	try {
		const job = await getJobById(id);
		if (!job) {
			sendError(res, 404, 'job not found');
			return;
		}

		res.status(200).json(job);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to fetch job');
	}
});

app.get('/jobs/:id/deliveries', async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id) || id < 1) {
		sendError(res, 400, 'id must be a positive integer');
		return;
	}

	try {
		const job = await getJobById(id);
		if (!job) {
			sendError(res, 404, 'job not found');
			return;
		}

		const deliveryRows = await listDeliveriesByJobId(id);
		res.status(200).json(deliveryRows);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to fetch deliveries');
	}
});


app.listen(port, () => {
	console.log(`API server listening on port ${port}`);
});
