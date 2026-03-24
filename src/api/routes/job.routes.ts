import { Router } from 'express';

import { listDeliveriesByJobId } from '../../services/delivery.service.js';
import { getJobById, listJobs } from '../../services/job.service.js';
import { requireAuth } from '../middleware/auth.js';
import { parsePositiveInt, sendError } from '../utils/http.js';

export const jobRouter = Router();

jobRouter.get('/jobs', requireAuth, async (_req, res) => {
	try {
		const jobs = await listJobs();
		res.status(200).json(jobs);
	} catch (error) {
		console.error(error);
		sendError(res, 500, 'failed to list jobs');
	}
});

jobRouter.get('/jobs/:id', requireAuth, async (req, res) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
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

jobRouter.get('/jobs/:id/deliveries', requireAuth, async (req, res) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
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
