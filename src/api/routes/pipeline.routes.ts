import { Router } from 'express';

import { createPipeline, deletePipeline, getPipelineById, listPipelines } from '../../services/pipeline.service.js';
import { requireAuth } from '../middleware/auth.js';
import { pipelineWriteLimiter } from '../middleware/rate-limit.js';
import { parsePositiveInt, sendError } from '../utils/http.js';
import { normalizeSourcePath, validateCreatePipelineBody } from '../utils/pipeline-validation.js';

export const pipelineRouter = Router();

pipelineRouter.post('/pipelines', requireAuth, pipelineWriteLimiter, async (req, res) => {
	const parsed = validateCreatePipelineBody(req.body);

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
		});

		res.status(201).json({
			...created,
			webhookUrl: `/webhook/source/${sourcePath}`,
			webhookByIdUrl: `/webhook/${created.id}`,
		});
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to create pipeline');
	}
});

pipelineRouter.get('/pipelines', requireAuth, async (_req, res) => {
	try {
		const rows = await listPipelines();
		res.status(200).json(rows);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to list pipelines');
	}
});

pipelineRouter.get('/pipelines/:id', requireAuth, async (req, res) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
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

pipelineRouter.delete('/pipelines/:id', requireAuth, async (req, res) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
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
