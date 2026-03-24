import { pool } from '../db/client.js';
import { applyPipelineAction } from '../services/action.service.js';
import { createAndSendDelivery } from '../services/delivery.service.js';
import { getNextPendingJob, markJobCompleted, markJobFailed } from '../services/job.service.js';
import { getPipelineByIdWithSubscribers } from '../services/pipeline.service.js';

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 2000);
let keepRunning = true;

async function processOneJob(): Promise<void> {
	const job = await getNextPendingJob();
	if (!job) {
		return;
	}

	try {
		const pipeline = await getPipelineByIdWithSubscribers(job.pipelineId);

		if (!pipeline || !pipeline.isActive) {
			await markJobFailed({
				jobId: job.id,
				errorMessage: 'pipeline not found or inactive',
			});
			return;
		}

		const processedPayload = applyPipelineAction(job.inputPayload, {
			actionType: pipeline.actionType,
			actionConfig: pipeline.actionConfig,
		});

		for (const subscriber of pipeline.subscribers) {
			await createAndSendDelivery({
				jobId: job.id,
				subscriberId: subscriber.id,
				targetUrl: subscriber.targetUrl,
				payload: processedPayload,
			});
		}

		await markJobCompleted({
			jobId: job.id,
			processedPayload,
		});
	} catch (error) {
		await markJobFailed({
			jobId: job.id,
			errorMessage: error instanceof Error ? error.message : 'worker processing failed',
		});
	}
}

async function runWorkerLoop(): Promise<void> {
	while (keepRunning) {
		await processOneJob();
		await new Promise((resolve) => {
			setTimeout(resolve, POLL_INTERVAL_MS);
		});
	}
}

function setupSignalHandlers(): void {
	const shutdown = async () => {
		keepRunning = false;
		await pool.end();
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

setupSignalHandlers();
runWorkerLoop().catch(async (error) => {
	console.error('Worker crashed:', error);
	await pool.end();
	process.exit(1);
});
