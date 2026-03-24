import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../../services/auth.service.js';
import { sendError } from '../utils/http.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
	const authorization = req.header('authorization');
	if (!authorization || !authorization.startsWith('Bearer ')) {
		sendError(res, 401, 'missing or invalid authorization header');
		return;
	}

	const token = authorization.slice('Bearer '.length).trim();
	const claims = verifyAccessToken(token);
	if (!claims) {
		sendError(res, 401, 'invalid or expired token');
		return;
	}

	next();
}
