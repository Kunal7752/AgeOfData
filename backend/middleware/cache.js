const redis = require('redis');

// These variables track if Redis is working
let client = null;
let redisAvailable = false;

// This function tries to connect to Redis
const connectToRedis = async () => {
  try {
    console.log('🔄 Trying to connect to Redis...');
    
    // Create a Redis client (like opening a connection)
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000, // Wait 10 seconds for Docker to start
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries < 5) {
            console.log(`🔄 Redis reconnection attempt ${retries + 1}/5`);
            return Math.min(retries * 1000, 3000); // Wait longer each time
          }
          console.log('❌ Gave up reconnecting to Redis');
          return false; // Stop trying
        }
      }
    });

    // What to do when different things happen:
    
    client.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('');
        console.log('❌ Redis is not running!');
        console.log('💡 Fix this by running: npm run redis:start');
        console.log('');
      } else {
        console.warn('⚠️  Redis error:', err.message);
      }
      redisAvailable = false;
    });

    client.on('connect', () => {
      console.log('✅ Redis connected successfully!');
      console.log('🚀 Caching is now enabled - your app will be faster!');
      redisAvailable = true;
    });

    client.on('ready', () => {
      console.log('✅ Redis is ready to use');
      redisAvailable = true;
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    client.on('disconnect', () => {
      console.log('⚠️  Redis disconnected - caching disabled');
      redisAvailable = false;
    });

    // Actually connect to Redis
    await client.connect();
    redisAvailable = true;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('❌ Cannot connect to Redis!');
      console.log('💡 Start Redis by running: npm run redis:start');
      console.log('🔍 Check if it\'s running: npm run redis:status');
      console.log('');
    } else {
      console.warn('⚠️  Redis connection failed:', error.message);
    }
    client = null;
    redisAvailable = false;
  }
};

// Try to connect when this file loads
connectToRedis();

// This is the cache middleware your routes will use
const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests (not POST, PUT, DELETE)
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis isn't available
    if (!redisAvailable || !client) {
      console.log('⚠️  Cache skipped - Redis not available');
      return next();
    }

    // Create a unique key for this request
    const key = `cache:${req.originalUrl}`;

    try {
      // Try to get cached data
      const cachedData = await client.get(key);
      
      if (cachedData) {
        console.log('🎯 Cache hit! Returning cached data for:', req.originalUrl);
        return res.json(JSON.parse(cachedData));
      }

      console.log('💾 Cache miss - will cache this response:', req.originalUrl);

      // If no cached data, intercept the response to cache it
      const originalJson = res.json;
      
      res.json = function(data) {
        // Save this response to cache for next time
        const isError = data?.error || data?.success === false || this.statusCode >= 400;
  
          if (redisAvailable && client && !isError) {
            client.setEx(key, duration, JSON.stringify(data)).catch(err => {
              console.warn('⚠️  Failed to cache data:', err.message);
            });
            console.log(`💾 Caching successful response for: ${key}`);
          } else if (isError) {
            console.log(`🚫 Not caching error response for: ${key}`);
          }
          
          originalJson.call(this, data);
      };

      next();
      
    } catch (error) {
      console.warn('⚠️  Cache error (continuing without cache):', error.message);
      redisAvailable = false;
      next();
    }
  };
};

module.exports = cache;