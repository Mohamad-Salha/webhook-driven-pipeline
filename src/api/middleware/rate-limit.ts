import rateLimit from 'express-rate-limit';

export const pipelineWriteLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: Number(process.env.RATE_LIMIT_PIPELINES_PER_MINUTE ?? 20),
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'too many pipeline write requests, try again in a minute' },
});

export const webhookIngressLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: Number(process.env.RATE_LIMIT_WEBHOOKS_PER_MINUTE ?? 120),
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'too many webhook requests, try again in a minute' },
});

export const authLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: Number(process.env.RATE_LIMIT_AUTH_PER_MINUTE ?? 20),
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'too many auth requests, try again in a minute' },
});
