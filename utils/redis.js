import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// 🟢 Important: connect once when server starts
await redis.connect(); // or export a `connectRedis()` method and call it in server.js

export default redis;
