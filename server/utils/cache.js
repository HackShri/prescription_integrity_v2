const Redis = require('ioredis');

// Use REDIS_URL env var if provided, otherwise default to localhost
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Lightweight in-memory fallback cache used when Redis is not available
function createFallbackCache() {
    const map = new Map();
    return {
        async get(key) {
            const entry = map.get(key);
            if (!entry) return null;
            if (entry.expires && Date.now() > entry.expires) {
                map.delete(key);
                return null;
            }
            return entry.value;
        },
        async setex(key, ttlSeconds, value) {
            const expires = Date.now() + ttlSeconds * 1000;
            map.set(key, { value, expires });
            // schedule cleanup
            setTimeout(() => { if (map.get(key)?.expires === expires) map.delete(key); }, ttlSeconds * 1000 + 1000);
        },
        async set(key, value) {
            map.set(key, { value, expires: null });
        }
    };
}

// Attempt to create a Redis client with conservative retry settings so failures are quick
let client;
try {
    client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        // disable offline queue so commands fail fast when not connected
        enableOfflineQueue: false,
        // short reconnect delay
        reconnectOnError: () => false,
    });

    client.on('error', (err) => {
        console.error('Redis error:', err && err.message ? err.message : err);
    });

    client.on('connect', () => {
        console.log('Redis client connecting to', redisUrl);
    });

    client.on('ready', () => {
        console.log('Redis client ready');
    });
} catch (e) {
    console.error('Failed to initialize Redis client, using in-memory fallback:', e && e.message ? e.message : e);
    client = null;
}

// If Redis cannot be connected to, export the fallback cache
const fallback = createFallbackCache();

// If client isn't connected within a short timeout, use fallback to avoid long retries
let exported = fallback;
if (client) {
    // switch to Redis client once ready
    const switchToRedis = () => { exported = client; };
    client.once('ready', switchToRedis);

    // if not ready after 2s, stick with fallback (but keep the redis instance running in background)
    setTimeout(() => {
        if (exported === fallback) {
            console.warn('Redis did not become ready in 2s, using in-memory cache fallback');
        }
    }, 2000);
}

module.exports = exported;
