import { Router } from 'express';

import { issueAccessToken, validateAdminCredentials } from '../../services/auth.service.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { sendError } from '../utils/http.js';

type LoginRequest = {
	username?: unknown;
	password?: unknown;
};

export const authRouter = Router();

authRouter.post('/auth/login', authLimiter, (req, res) => {
	const body = req.body as LoginRequest;

	if (typeof body.username !== 'string' || typeof body.password !== 'string') {
		sendError(res, 400, 'username and password are required');
		return;
	}

	if (!validateAdminCredentials(body.username, body.password)) {
		sendError(res, 401, 'invalid credentials');
		return;
	}

	const token = issueAccessToken(body.username);
	res.status(200).json({
		accessToken: token,
		tokenType: 'Bearer',
	});
});
