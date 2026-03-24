import type { InferSelectModel } from 'drizzle-orm';

import { deliveries } from '../db/schema.js';

export type Delivery = InferSelectModel<typeof deliveries>;
