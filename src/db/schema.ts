import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const pipelines = pgTable(
	'pipelines',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		sourcePath: text('source_path').notNull(),
		actionType: text('action_type').notNull(),
		actionConfig: jsonb('action_config').$type<Record<string, unknown>>().notNull().default({}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex('pipelines_source_path_idx').on(table.sourcePath)],
);

export const subscribers = pgTable('subscribers', {
	id: serial('id').primaryKey(),
	pipelineId: integer('pipeline_id')
		.notNull()
		.references(() => pipelines.id, { onDelete: 'cascade' }),
	targetUrl: text('target_url').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable('jobs', {
	id: serial('id').primaryKey(),
	pipelineId: integer('pipeline_id')
		.notNull()
		.references(() => pipelines.id, { onDelete: 'cascade' }),
	status: text('status').notNull().default('pending'),
	inputPayload: jsonb('input_payload').$type<Record<string, unknown>>().notNull(),
	processedPayload: jsonb('processed_payload').$type<Record<string, unknown>>(),
	attempts: integer('attempts').notNull().default(0),
	lastError: text('last_error'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deliveries = pgTable('deliveries', {
	id: serial('id').primaryKey(),
	jobId: integer('job_id')
		.notNull()
		.references(() => jobs.id, { onDelete: 'cascade' }),
	subscriberId: integer('subscriber_id')
		.notNull()
		.references(() => subscribers.id, { onDelete: 'cascade' }),
	status: text('status').notNull().default('pending'),
	attempts: integer('attempts').notNull().default(0),
	responseCode: integer('response_code'),
	lastError: text('last_error'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
