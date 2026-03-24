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
