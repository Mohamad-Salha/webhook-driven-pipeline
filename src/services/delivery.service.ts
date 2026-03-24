import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { deliveries } from '../db/schema.js';
import type { Delivery } from '../models/delivery.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function listDeliveriesByJobId(jobId: number): Promise<Delivery[]> {
  return db.select().from(deliveries).where(eq(deliveries.jobId, jobId)).orderBy(desc(deliveries.createdAt));
}

export async function createAndSendDelivery(input: {
  jobId: number;
  subscriberId: number;
  targetUrl: string;
  payload: Record<string, unknown>;
}): Promise<Delivery> {
  const [created] = await db
    .insert(deliveries)
    .values({
      jobId: input.jobId,
      subscriberId: input.subscriberId,
      status: 'pending',
      attempts: 0,
    })
    .returning();

  let attempts = 0;
  let responseCode: number | null = null;
  let lastError: string | null = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;

    try {
      const response = await fetch(input.targetUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jobId: input.jobId,
          deliveryId: created.id,
          payload: input.payload,
        }),
      });

      responseCode = response.status;

      if (response.ok) {
        const [updated] = await db
          .update(deliveries)
          .set({
            status: 'sent',
            attempts,
            responseCode,
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(deliveries.id, created.id))
          .returning();

        return updated;
      }

      lastError = `non-2xx response: ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'delivery request failed';
    }

    if (attempts < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS * attempts);
    }
  }

  const [failed] = await db
    .update(deliveries)
    .set({
      status: 'failed',
      attempts,
      responseCode,
      lastError,
      updatedAt: new Date(),
    })
    .where(eq(deliveries.id, created.id))
    .returning();

  return failed;
}
