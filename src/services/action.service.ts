type ActionContext = {
	actionType: string;
	actionConfig: Record<string, unknown>;
};

function asObject(payload: Record<string, unknown>): Record<string, unknown> {
	return { ...payload };
}

function uppercaseText(payload: Record<string, unknown>, config: Record<string, unknown>): Record<string, unknown> {
	const field = typeof config.field === 'string' ? config.field : 'text';
	const value = payload[field];

	if (typeof value !== 'string') {
		return asObject(payload);
	}

	return {
		...payload,
		[field]: value.toUpperCase(),
	};
}

function filterField(payload: Record<string, unknown>, config: Record<string, unknown>): Record<string, unknown> {
	const field = typeof config.field === 'string' ? config.field : '';

	if (!field) {
		return asObject(payload);
	}

	if (!(field in payload)) {
		return {};
	}

	return {
		[field]: payload[field],
	};
}

function addTimestamp(payload: Record<string, unknown>, config: Record<string, unknown>): Record<string, unknown> {
	const key = typeof config.field === 'string' ? config.field : 'processedAt';
	return {
		...payload,
		[key]: new Date().toISOString(),
	};
}

export function applyPipelineAction(
	payload: Record<string, unknown>,
	context: ActionContext,
): Record<string, unknown> {
	switch (context.actionType) {
		case 'uppercase_text':
			return uppercaseText(payload, context.actionConfig);
		case 'filter_field':
			return filterField(payload, context.actionConfig);
		case 'add_timestamp':
			return addTimestamp(payload, context.actionConfig);
		default:
			return asObject(payload);
	}
}
