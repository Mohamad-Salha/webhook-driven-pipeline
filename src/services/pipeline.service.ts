import { and, desc, eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { pipelines, subscribers } from '../db/schema.js';
import type { PipelineWithSubscribers } from '../models/pipeline.js';

export type CreatePipelineInput = {
	name: string;
	sourcePath: string;
	actionType: string;
	actionConfig?: Record<string, unknown>;
	subscribers: string[];
};

export async function createPipeline(input: CreatePipelineInput): Promise<PipelineWithSubscribers> {
	const created = await db.transaction(async (tx) => {
		const [pipeline] = await tx
			.insert(pipelines)
			.values({
				name: input.name,
				sourcePath: input.sourcePath,
				actionType: input.actionType,
				actionConfig: input.actionConfig ?? {},
			})
			.returning();

		if (input.subscribers.length > 0) {
			await tx.insert(subscribers).values(
				input.subscribers.map((url) => ({
					pipelineId: pipeline.id,
					targetUrl: url,
				})),
			);
		}

		const subscriberRows = await tx
			.select()
			.from(subscribers)
			.where(eq(subscribers.pipelineId, pipeline.id));

		return {
			...pipeline,
			subscribers: subscriberRows,
		};
	});

	return created;
}

export async function listPipelines(): Promise<PipelineWithSubscribers[]> {
	const pipelineRows = await db.select().from(pipelines).orderBy(desc(pipelines.createdAt));

	if (pipelineRows.length === 0) {
		return [];
	}

	const allSubscribers = await db.select().from(subscribers);

	return pipelineRows.map((pipeline) => ({
		...pipeline,
		subscribers: allSubscribers.filter((row) => row.pipelineId === pipeline.id),
	}));
}

export async function getPipelineById(id: number): Promise<PipelineWithSubscribers | null> {
	const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id)).limit(1);

	if (!pipeline) {
		return null;
	}

	const subscriberRows = await db
		.select()
		.from(subscribers)
		.where(eq(subscribers.pipelineId, pipeline.id));

	return {
		...pipeline,
		subscribers: subscriberRows,
	};
}

export async function deletePipeline(id: number): Promise<boolean> {
	const [existing] = await db.select({ id: pipelines.id }).from(pipelines).where(eq(pipelines.id, id)).limit(1);

	if (!existing) {
		return false;
	}

	await db.delete(subscribers).where(eq(subscribers.pipelineId, id));
	await db.delete(pipelines).where(eq(pipelines.id, id));

	return true;
}

export async function getPipelineBySourcePath(sourcePath: string): Promise<PipelineWithSubscribers | null> {
	const [pipeline] = await db
		.select()
		.from(pipelines)
		.where(and(eq(pipelines.sourcePath, sourcePath), eq(pipelines.isActive, true)))
		.limit(1);

	if (!pipeline) {
		return null;
	}

	const subscriberRows = await db
		.select()
		.from(subscribers)
		.where(eq(subscribers.pipelineId, pipeline.id));

	return {
		...pipeline,
		subscribers: subscriberRows,
	};
}

export async function getPipelineByIdWithSubscribers(id: number): Promise<PipelineWithSubscribers | null> {
	const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id)).limit(1);

	if (!pipeline) {
		return null;
	}

	const subscriberRows = await db
		.select()
		.from(subscribers)
		.where(eq(subscribers.pipelineId, pipeline.id));

	return {
		...pipeline,
		subscribers: subscriberRows,
	};
}
