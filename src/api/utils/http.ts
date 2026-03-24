import type { Response } from 'express';

export function sendError(res: Response, status: number, message: string): void {
	res.status(status).json({ error: message });
}

export function parsePositiveInt(value: string | string[] | undefined): number | null {
	const normalized = Array.isArray(value) ? value[0] : value;
	if (typeof normalized !== 'string') {
		return null;
	}

	const parsed = Number(normalized);
	if (!Number.isInteger(parsed) || parsed < 1) {
		return null;
	}

	return parsed;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
