import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined
}

export const redis =
    globalForRedis.redis ??
    new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000)
            return delay
        }
    })

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis
}

export default redis
