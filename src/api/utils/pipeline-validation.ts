export type CreatePipelineRequest = {
	name?: unknown;
	actionType?: unknown;
	actionConfig?: unknown;
	subscribers?: unknown;
};

export type ValidatedCreatePipeline = {
	name: string;
	actionType: string;
	actionConfig: Record<string, unknown>;
	subscribers: string[];
};

export function normalizeSourcePath(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function validateCreatePipelineBody(
	body: CreatePipelineRequest,
):
	| { ok: true; value: ValidatedCreatePipeline }
	| { ok: false; message: string } {
	if (typeof body.name !== 'string' || body.name.trim().length < 3) {
		return { ok: false, message: 'name must be a string with at least 3 characters' };
	}

	if (typeof body.actionType !== 'string' || body.actionType.trim().length === 0) {
		return { ok: false, message: 'actionType is required' };
	}

	const actionConfig = body.actionConfig;
	if (
		actionConfig !== undefined
		&& (typeof actionConfig !== 'object' || actionConfig === null || Array.isArray(actionConfig))
	) {
		return { ok: false, message: 'actionConfig must be an object' };
	}

	if (!Array.isArray(body.subscribers) || body.subscribers.length === 0) {
		return { ok: false, message: 'subscribers must be a non-empty array of URLs' };
	}

	const subscribers = body.subscribers;
	const areValidUrls = subscribers.every(
		(url) => typeof url === 'string' && /^https?:\/\//.test(url),
	);
	if (!areValidUrls) {
		return { ok: false, message: 'each subscriber must be a valid http/https URL' };
	}

	return {
		ok: true,
		value: {
			name: body.name.trim(),
			actionType: body.actionType.trim(),
			actionConfig: (actionConfig ?? {}) as Record<string, unknown>,
			subscribers,
		},
	};
}
