import crypto from 'crypto';
import type { Request, Response } from 'express';

import { sendError } from '../utils/http.js';

const webhookSigningSecret = process.env.WEBHOOK_SIGNING_SECRET;

export function verifyWebhookSignature(req: Request, res: Response): boolean {
	if (!webhookSigningSecret) {
		return true;
	}

	const signatureHeader = req.header('x-webhook-signature');
	if (!signatureHeader) {
		sendError(res, 401, 'missing x-webhook-signature header');
		return false;
	}

	const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
	const expected = crypto
		.createHmac('sha256', webhookSigningSecret)
		.update(rawBody)
		.digest('hex');

	const provided = signatureHeader.replace('sha256=', '').trim();
	const isValid = provided.length === expected.length
		&& crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

	if (!isValid) {
		sendError(res, 401, 'invalid webhook signature');
		return false;
	}

	return true;
}
