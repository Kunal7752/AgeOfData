// services/api.js - Browser-safe API service with comprehensive filter support

// Browser-safe way to get API base URL
const getApiBaseUrl = () => {
  // For development, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  
  // 🔥 PRODUCTION: Always use Railway backend URL
  return 'https://ageofdata-production.up.railway.app/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('🌐 API Service initialized with base URL:', this.baseURL);
    
    // 🚨 ALERT: If this shows wrong URL, check deployment
    if (!this.baseURL.includes('ageofdata-production.up.railway.app')) {
      console.error('🚨 WRONG API URL! Should be Railway backend, not Vercel!');
      console.error('🚨 Current URL:', this.baseURL);
      console.error('🚨 Expected URL: https://ageofdata-production.up.railway.app/api');
    }
  }

  // Enhanced request method with caching and retry logic
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log('🎯 Using cached data for:', endpoint);
        return cached.data;
      }
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('🌐 API Request:', url);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful responses
      if (options.useCache !== false) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      return data;
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
  }

  // Enhanced civilization stats with comprehensive filtering
  async getCivilizationStats(params = {}) {
    try {
      console.log('🏛️ Fetching civilization stats with params:', params);
      
      // Build query string from parameters, only including non-empty values
      const filteredParams = {};
      
      // Basic filters
      if (params.leaderboard && params.leaderboard !== '') {
        filteredParams.leaderboard = params.leaderboard;
      }
      if (params.patch && params.patch !== '') {
        filteredParams.patch = params.patch;
      }
      if (params.timeframe && params.timeframe !== 'all' && params.timeframe !== '') {
        filteredParams.timeframe = params.timeframe;
      }
      
      // ELO filters
      if (params.minElo && params.minElo !== '') {
        filteredParams.minElo = parseInt(params.minElo);
      }
      if (params.maxElo && params.maxElo !== '') {
        filteredParams.maxElo = parseInt(params.maxElo);
      }
      
      // Match filters
      if (params.minMatches && params.minMatches !== '') {
        filteredParams.minMatches = parseInt(params.minMatches);
      }
      if (params.gameType && params.gameType !== '') {
        filteredParams.gameType = params.gameType;
      }
      if (params.matchType && params.matchType !== '') {
        filteredParams.matchType = params.matchType;
      }
      if (params.map && params.map !== '') {
        filteredParams.map = params.map;
      }
      
      // Additional filters for better granularity
      if (params.startingAge && params.startingAge !== '') {
        filteredParams.startingAge = params.startingAge;
      }
      if (params.gameSpeed && params.gameSpeed !== '') {
        filteredParams.gameSpeed = params.gameSpeed;
      }
      if (params.playerCount && params.playerCount !== '') {
        filteredParams.playerCount = parseInt(params.playerCount);
      }
      
      const qs = new URLSearchParams(filteredParams).toString();
      const url = `/stats/civilizations${qs ? `?${qs}` : ''}`;
      
      console.log('🔗 Requesting:', url);
      
      const result = await this.request(url);
      
      console.log('✅ Received civilization data:', {
        civilizations: result.civilizations?.length || 0,
        totalMatches: result.meta?.totalMatches || 0,
        appliedFilters: result.meta?.appliedFilters,
        cached: result.meta?.cached,
        queryTime: result.meta?.queryTime
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch civilization stats:', error);
      
      // Return fallback data structure to prevent crashes
      return {
        civilizations: [],
        meta: {
          totalCivilizations: 0,
          totalMatches: 0,
          error: error.message,
          fallback: true,
          appliedFilters: params
        }
      };
    }
  }

  // Enhanced matches endpoint with better filtering
  async getMatches(params = {}) {
    try {
      const filteredParams = {};
      
      // Pagination
      if (params.page) filteredParams.page = parseInt(params.page);
      if (params.limit) filteredParams.limit = parseInt(params.limit);
      
      // Basic filters
      if (params.map && params.map !== '') filteredParams.map = params.map;
      if (params.leaderboard && params.leaderboard !== '') filteredParams.leaderboard = params.leaderboard;
      if (params.gameType && params.gameType !== '') filteredParams.gameType = params.gameType;
      
      // ELO filters
      if (params.minElo && params.minElo !== '') filteredParams.minElo = parseInt(params.minElo);
      if (params.maxElo && params.maxElo !== '') filteredParams.maxElo = parseInt(params.maxElo);
      
      // Player count
      if (params.playerCount && params.playerCount !== '') {
        filteredParams.playerCount = parseInt(params.playerCount);
      }
      
      // Date filters
      if (params.startDate && params.startDate !== '') filteredParams.startDate = params.startDate;
      if (params.endDate && params.endDate !== '') filteredParams.endDate = params.endDate;
      
      // Advanced filters
      if (params.patch && params.patch !== '') filteredParams.patch = params.patch;
      if (params.duration && params.duration !== '') filteredParams.duration = params.duration;
      if (params.civilization && params.civilization !== '') filteredParams.civilization = params.civilization;
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/matches${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch matches:', error);
      throw error;
    }
  }

  // Map stats with filtering
  async getMapStats(params = {}) {
    try {
      const filteredParams = {};
      
      if (params.leaderboard && params.leaderboard !== '') {
        filteredParams.leaderboard = params.leaderboard;
      }
      if (params.patch && params.patch !== '') {
        filteredParams.patch = params.patch;
      }
      if (params.minMatches && params.minMatches !== '') {
        filteredParams.minMatches = parseInt(params.minMatches);
      }
      if (params.timeframe && params.timeframe !== 'all' && params.timeframe !== '') {
        filteredParams.timeframe = params.timeframe;
      }
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/stats/maps${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch map stats:', error);
      throw error;
    }
  }

  // Player rankings with enhanced filtering
  async getPlayerRankings(leaderboard, params = {}) {
    try {
      const filteredParams = {};
      
      // Pagination
      if (params.page) filteredParams.page = parseInt(params.page);
      if (params.limit) filteredParams.limit = parseInt(params.limit);
      
      // Filters
      if (params.minRating && params.minRating !== '') filteredParams.minRating = parseInt(params.minRating);
      if (params.maxRating && params.maxRating !== '') filteredParams.maxRating = parseInt(params.maxRating);
      if (params.country && params.country !== '') filteredParams.country = params.country;
      if (params.search && params.search !== '') filteredParams.search = params.search;
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/players/rankings/${leaderboard}${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch player rankings:', error);
      throw error;
    }
  }

  // Enhanced match stats
  async getMatchStats(params = {}) {
    try {
      const filteredParams = {};
      
      if (params.timeframe && params.timeframe !== 'all') {
        filteredParams.timeframe = params.timeframe;
      }
      if (params.leaderboard && params.leaderboard !== '') {
        filteredParams.leaderboard = params.leaderboard;
      }
      if (params.patch && params.patch !== '') {
        filteredParams.patch = params.patch;
      }
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/matches/stats/overview${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch match stats:', error);
      throw error;
    }
  }

  // Get single match by ID
  async getMatchById(gameId) {
    try {
      return this.request(`/matches/${gameId}`);
    } catch (error) {
      console.error(`❌ Failed to fetch match ${gameId}:`, error);
      throw error;
    }
  }

  // Player profile
  async getPlayerProfile(profileId) {
    try {
      return this.request(`/players/${profileId}`);
    } catch (error) {
      console.error(`❌ Failed to fetch player ${profileId}:`, error);
      throw error;
    }
  }

  // Player matches
  async getPlayerMatches(profileId, params = {}) {
    try {
      const filteredParams = {};
      
      if (params.page) filteredParams.page = parseInt(params.page);
      if (params.limit) filteredParams.limit = parseInt(params.limit);
      if (params.leaderboard && params.leaderboard !== '') {
        filteredParams.leaderboard = params.leaderboard;
      }
      if (params.civilization && params.civilization !== '') {
        filteredParams.civilization = params.civilization;
      }
      if (params.map && params.map !== '') filteredParams.map = params.map;
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/players/${profileId}/matches${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error(`❌ Failed to fetch matches for player ${profileId}:`, error);
      throw error;
    }
  }

  // Search matches
  async searchMatches(query, params = {}) {
    try {
      const allParams = { q: query, ...params };
      const qs = new URLSearchParams(allParams).toString();
      return this.request(`/matches/search?${qs}`);
    } catch (error) {
      console.error('❌ Failed to search matches:', error);
      throw error;
    }
  }

  // Get matches by date range
  async getMatchesByDateRange(startDate, endDate, params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/matches/range/${startDate}/${endDate}${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch matches by date range:', error);
      throw error;
    }
  }

  // Get top matches
  async getTopMatches(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/matches/top/elo${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch top matches:', error);
      throw error;
    }
  }

  // Leaderboard stats
  async getLeaderboardStats() {
    try {
      return this.request('/matches/stats/leaderboards');
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard stats:', error);
      throw error;
    }
  }

  // Trends with filtering
  async getTrends(params = {}) {
    try {
      const filteredParams = {};
      
      if (params.timeframe && params.timeframe !== 'all') {
        filteredParams.timeframe = params.timeframe;
      }
      if (params.leaderboard && params.leaderboard !== '') {
        filteredParams.leaderboard = params.leaderboard;
      }
      if (params.metric && params.metric !== '') {
        filteredParams.metric = params.metric;
      }
      
      const qs = new URLSearchParams(filteredParams).toString();
      return this.request(`/stats/trends${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch trends:', error);
      throw error;
    }
  }

  // ELO distribution
  async getEloDistribution(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/stats/elo-distribution${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch ELO distribution:', error);
      throw error;
    }
  }

  // Opening stats
  async getOpeningStats(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/stats/openings${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch opening stats:', error);
      throw error;
    }
  }

  // Patch stats
  async getPatchStats(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/stats/patches${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch patch stats:', error);
      throw error;
    }
  }

  // Performance analytics
  async getPerformanceAnalytics(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/stats/analytics/performance${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to fetch performance analytics:', error);
      throw error;
    }
  }

  // ===================================================================
  // CIVILIZATION DETAIL ENDPOINTS
  // ===================================================================

  // Comprehensive civilization data
  async getCivilizationComplete(civName) {
    try {
      return this.request(`/stats/civilizations/${civName}/complete`);
    } catch (error) {
      console.error(`❌ Failed to fetch complete data for ${civName}:`, error);
      throw error;
    }
  }

  // Civilization vs civilization matchups
  async getCivBestAgainst(civName) {
    try {
      return this.request(`/stats/civilizations/${civName}/best-against`);
    } catch (error) {
      console.error(`❌ Failed to fetch best matchups for ${civName}:`, error);
      return [];
    }
  }

  async getCivWorstAgainst(civName) {
    try {
      return this.request(`/stats/civilizations/${civName}/worst-against`);
    } catch (error) {
      console.error(`❌ Failed to fetch worst matchups for ${civName}:`, error);
      return [];
    }
  }

  // Civilization performance by rating
  async getCivWinRateByRating(civName) {
    try {
      const response = await this.request(`/stats/civilizations/${civName}/rating`);
      // Backend returns direct array for rating endpoint
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(`❌ Failed to fetch rating performance for ${civName}:`, error);
      return [];
    }
  }

  // Civilization performance by patch
  async getCivWinRateByPatch(civName) {
    try {
      const response = await this.request(`/stats/civilizations/${civName}/patch`);
      console.log(`🔧 PATCH API Response for ${civName}:`, response);
      
      // Backend returns: { patchData: [...], meta: {...} }
      // We need to extract the patchData array
      if (response && response.patchData && Array.isArray(response.patchData)) {
        return response.patchData;
      }
      
      // Fallback: if response is already an array (for compatibility)
      if (Array.isArray(response)) {
        return response;
      }
      
      console.warn(`⚠️ Unexpected patch response format for ${civName}:`, response);
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch patch performance for ${civName}:`, error);
      return [];
    }
  }
  // Civilization performance by game duration
   async getCivWinRateByDuration(civName) {
    try {
      const response = await this.request(`/stats/civilizations/${civName}/duration`);
      console.log(`🔧 DURATION API Response for ${civName}:`, response);
      
      // Backend might return: { durationData: [...], meta: {...} } or direct array
      if (response && response.durationData && Array.isArray(response.durationData)) {
        return response.durationData;
      }
      
      // Fallback: if response is already an array
      if (Array.isArray(response)) {
        return response;
      }
      
      // Check for alternative field names
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      console.warn(`⚠️ Unexpected duration response format for ${civName}:`, response);
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch duration analysis for ${civName}:`, error);
      return [];
    }
  }

  // Civilization map performance
  async getCivMaps(civName) {
    try {
      return this.request(`/stats/civilizations/${civName}/maps`);
    } catch (error) {
      console.error(`❌ Failed to fetch map stats for ${civName}:`, error);
      return [];
    }
  }

  // Legacy civilization detail endpoint
  async getCivilizationDetail(civName, params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/stats/civilizations/${civName}${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.error(`❌ Failed to fetch detail for ${civName}:`, error);
      // Fallback to complete endpoint
      return this.getCivilizationComplete(civName);
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  // Health check
  async healthCheck() {
    try {
      const response = await this.request('/health');
      return { healthy: true, ...response };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // Check if endpoint exists
  async checkEndpoint(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Batch request multiple endpoints
  async batchRequest(endpoints) {
    const promises = endpoints.map(endpoint => 
      this.request(endpoint).catch(error => ({ error: error.message, endpoint }))
    );
    return Promise.all(promises);
  }

  // Get API documentation
  async getApiInfo() {
    try {
      return this.request('/');
    } catch (error) {
      console.error('❌ Failed to fetch API info:', error);
      return { 
        name: 'AoE Stats API',
        error: 'Could not fetch API documentation'
      };
    }
  }

  // ===================================================================
  // PERFORMANCE OPTIMIZATION METHODS
  // ===================================================================

  // Preload common data
  async preloadCommonData() {
    try {
      console.log('🚀 Preloading common data...');
      
      const commonRequests = [
        this.getLeaderboardStats(),
        this.getCivilizationStats({ minMatches: 100 }),
        this.getMapStats({ minMatches: 100 })
      ];
      
      await Promise.allSettled(commonRequests);
      console.log('✅ Common data preloaded');
    } catch (error) {
      console.error('❌ Failed to preload common data:', error);
    }
  }

  // Invalidate cache for specific patterns
  invalidateCache(pattern) {
    const keys = Array.from(this.cache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      this.cache.delete(key);
    });
    
    console.log(`🗑️ Invalidated ${matchingKeys.length} cache entries matching: ${pattern}`);
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values())
      .filter(entry => (now - entry.timestamp) < this.cacheTimeout);
    
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      cacheHitRate: validEntries.length / this.cache.size || 0,
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(e => e.timestamp)),
      newestEntry: Math.max(...Array.from(this.cache.values()).map(e => e.timestamp))
    };
  }
}

export default new ApiService();