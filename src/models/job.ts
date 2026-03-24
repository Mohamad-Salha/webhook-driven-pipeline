import type { InferSelectModel } from 'drizzle-orm';

import { jobs } from '../db/schema.js';

export type Job = InferSelectModel<typeof jobs>;
