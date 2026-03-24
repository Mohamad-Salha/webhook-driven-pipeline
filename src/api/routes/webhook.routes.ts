import { Router } from 'express';

import { enqueueJob } from '../../services/job.service.js';
import { getPipelineById, getPipelineBySourcePath } from '../../services/pipeline.service.js';
import { webhookIngressLimiter } from '../middleware/rate-limit.js';
import { verifyWebhookSignature } from '../middleware/webhook-signature.js';
import { isPlainObject, parsePositiveInt, sendError } from '../utils/http.js';

export const webhookRouter = Router();

webhookRouter.post('/webhook/:pipelineId', webhookIngressLimiter, async (req, res) => {
	if (!verifyWebhookSignature(req, res)) {
		return;
	}

	const pipelineId = parsePositiveInt(req.params.pipelineId);
	if (!pipelineId) {
		sendError(res, 400, 'pipelineId must be a positive integer');
		return;
	}

	if (!isPlainObject(req.body)) {
		sendError(res, 400, 'webhook payload must be a JSON object');
		return;
	}

	try {
		const pipeline = await getPipelineById(pipelineId);
		if (!pipeline || !pipeline.isActive) {
			sendError(res, 404, 'pipeline not found or inactive');
			return;
		}

		const job = await enqueueJob({
			pipelineId,
			payload: req.body,
		});

		res.status(202).json({
			message: 'webhook accepted',
			jobId: job.id,
			status: job.status,
			pipelineId,
		});
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to accept webhook');
	}
});

webhookRouter.post('/webhook/source/:sourcePath', webhookIngressLimiter, async (req, res) => {
	if (!verifyWebhookSignature(req, res)) {
		return;
	}

	const sourcePathParam = req.params.sourcePath;
	const sourcePath = Array.isArray(sourcePathParam) ? sourcePathParam[0] : sourcePathParam;

	if (!sourcePath || sourcePath.trim().length === 0) {
		sendError(res, 400, 'sourcePath is required');
		return;
	}

	if (!isPlainObject(req.body)) {
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
			payload: req.body,
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
