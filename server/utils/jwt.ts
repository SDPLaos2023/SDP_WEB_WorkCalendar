import jwt from 'jsonwebtoken'

/**
 * JWT Utility
 * Handles generation and verification of Access and Refresh tokens.
 */

const SECRET_KEY = process.env.SECRET_KEY || 'your-fallback-secret-key'

export interface JWTPayload {
    id: string
    username: string
    email: string
    role: string
    companyId: string
    departmentId?: string | null
}

/**
 * signAccessToken: Create a new access token
 */
export const signAccessToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '15m' })
}

/**
 * signRefreshToken: Create a new refresh token
 */
export const signRefreshToken = (payload: { id: string }): string => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' })
}

/**
 * verifyToken: Validate a JWT token and return decoded payload
 */
export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, SECRET_KEY)
    } catch (error: any) {
        throw createError({
            statusCode: 401,
            statusMessage: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
        })
    }
}

