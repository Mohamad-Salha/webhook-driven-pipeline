import type { InferSelectModel } from 'drizzle-orm';

import { pipelines, subscribers } from '../db/schema.js';

export type Pipeline = InferSelectModel<typeof pipelines>;
export type Subscriber = InferSelectModel<typeof subscribers>;

export type PipelineWithSubscribers = Pipeline & {
	subscribers: Subscriber[];
};
