import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { jobs } from '../db/schema.js';
import type { Job } from '../models/job.js';

export async function enqueueJob(input: {
	pipelineId: number;
	payload: Record<string, unknown>;
}): Promise<Job> {
	const [job] = await db
		.insert(jobs)
		.values({
			pipelineId: input.pipelineId,
			inputPayload: input.payload,
			status: 'pending',
			attempts: 0,
		})
		.returning();

	return job;
}

export async function listJobs(limit = 50): Promise<Job[]> {
	return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
}

export async function getJobById(id: number): Promise<Job | null> {
	const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
	return job ?? null;
}

export async function getNextPendingJob(): Promise<Job | null> {
	const [job] = await db.select().from(jobs).where(eq(jobs.status, 'pending')).orderBy(desc(jobs.createdAt)).limit(1);

	if (!job) {
		return null;
	}

	const [claimed] = await db
		.update(jobs)
		.set({
			status: 'processing',
			attempts: job.attempts + 1,
			updatedAt: new Date(),
		})
		.where(eq(jobs.id, job.id))
		.returning();

	return claimed ?? null;
}

export async function markJobCompleted(input: {
	jobId: number;
	processedPayload: Record<string, unknown>;
}): Promise<void> {
	await db
		.update(jobs)
		.set({
			status: 'completed',
			processedPayload: input.processedPayload,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(jobs.id, input.jobId));
}

export async function markJobFailed(input: {
	jobId: number;
	errorMessage: string;
}): Promise<void> {
	await db
		.update(jobs)
		.set({
			status: 'failed',
			lastError: input.errorMessage,
			updatedAt: new Date(),
		})
		.where(eq(jobs.id, input.jobId));
}
