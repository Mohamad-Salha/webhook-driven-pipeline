import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET ?? 'change-this-jwt-secret';
const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];

export type AuthClaims = {
	sub: string;
	role: 'admin';
};

export function validateAdminCredentials(username: string, password: string): boolean {
	return username === adminUsername && password === adminPassword;
}

export function issueAccessToken(username: string): string {
	return jwt.sign({ role: 'admin' }, jwtSecret, {
		subject: username,
		expiresIn: jwtExpiresIn,
	});
}

export function verifyAccessToken(token: string): AuthClaims | null {
	try {
		const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

		if (typeof decoded.sub !== 'string' || decoded.role !== 'admin') {
			return null;
		}

		return {
			sub: decoded.sub,
			role: 'admin',
		};
	} catch {
		return null;
	}
}
