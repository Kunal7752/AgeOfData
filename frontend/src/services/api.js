// services/api.js - API service for backend communication
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Matches API
  async getMatches(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/matches${queryString ? `?${queryString}` : ''}`);
  }

  async getMatchById(gameId) {
    return this.request(`/matches/${gameId}`);
  }

  async getMatchStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/matches/stats/overview${queryString ? `?${queryString}` : ''}`);
  }

  async getLeaderboardStats() {
    return this.request('/matches/stats/leaderboards');
  }

  async searchMatches(query, params = {}) {
    const allParams = { q: query, ...params };
    const queryString = new URLSearchParams(allParams).toString();
    return this.request(`/matches/search?${queryString}`);
  }

  async getMatchesByDateRange(startDate, endDate, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/matches/range/${startDate}/${endDate}${queryString ? `?${queryString}` : ''}`);
  }

  async getTopMatches(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/matches/top/elo${queryString ? `?${queryString}` : ''}`);
  }

  // Players API
  async getPlayerProfile(profileId) {
    return this.request(`/players/${profileId}`);
  }

  async getPlayerMatches(profileId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/players/${profileId}/matches${queryString ? `?${queryString}` : ''}`);
  }

  async getPlayerRankings(leaderboard, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/players/rankings/${leaderboard}${queryString ? `?${queryString}` : ''}`);
  }

  // Statistics API
  async getCivilizationStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/civilizations${queryString ? `?${queryString}` : ''}`);
  }

  async getMapStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/maps${queryString ? `?${queryString}` : ''}`);
  }

  async getTrends(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/trends${queryString ? `?${queryString}` : ''}`);
  }

  async getEloDistribution(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/elo-distribution${queryString ? `?${queryString}` : ''}`);
  }

  async getOpeningStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/openings${queryString ? `?${queryString}` : ''}`);
  }

  async getPatchStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/patches${queryString ? `?${queryString}` : ''}`);
  }

  async getPerformanceAnalytics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/stats/analytics/performance${queryString ? `?${queryString}` : ''}`);
  }
}

export default new ApiService();