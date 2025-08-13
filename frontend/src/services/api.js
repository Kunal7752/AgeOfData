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
    const qs = new URLSearchParams(params).toString();
    return this.request(`/matches${qs ? `?${qs}` : ''}`);
  }

  async getMatchById(gameId) {
    return this.request(`/matches/${gameId}`);
  }

  async getMatchStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/matches/stats/overview${qs ? `?${qs}` : ''}`);
  }

  async getLeaderboardStats() {
    return this.request('/matches/stats/leaderboards');
  }

  async searchMatches(query, params = {}) {
    const allParams = { q: query, ...params };
    const qs = new URLSearchParams(allParams).toString();
    return this.request(`/matches/search?${qs}`);
  }

  async getMatchesByDateRange(startDate, endDate, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(
      `/matches/range/${startDate}/${endDate}${qs ? `?${qs}` : ''}`
    );
  }

  async getTopMatches(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/matches/top/elo${qs ? `?${qs}` : ''}`);
  }

  // Players API
  async getPlayerProfile(profileId) {
    return this.request(`/players/${profileId}`);
  }

  async getPlayerMatches(profileId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(
      `/players/${profileId}/matches${qs ? `?${qs}` : ''}`
    );
  }

  async getPlayerRankings(leaderboard, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(
      `/players/rankings/${leaderboard}${qs ? `?${qs}` : ''}`
    );
  }

  async getMapStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/stats/maps${qs ? `?${qs}` : ''}`);
  }

  async getTrends(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/stats/trends${qs ? `?${qs}` : ''}`);
  }

  async getEloDistribution(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/stats/elo-distribution${qs ? `?${qs}` : ''}`);
  }

  async getOpeningStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/stats/openings${qs ? `?${qs}` : ''}`);
  }

  async getPatchStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/stats/patches${qs ? `?${qs}` : ''}`);
  }

  async getPerformanceAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(
      `/stats/analytics/performance${qs ? `?${qs}` : ''}`
    );
  }

  // Civilization‐detail summary (still useful if you need it)
  async getCivilizationDetail(civName, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(
      `/stats/civilizations/${civName}${qs ? `?${qs}` : ''}`
    );
  }

  // ───── New, chart‐specific civilization endpoints ─────

  /** Win Rate vs Game Length */
  async getCivGameLength(civName) {
    return this.request(`/stats/civilizations/${civName}/length`);
  }

  /** Win Rate by Patch */
  async getCivWinRateByPatch(civName) {
    return this.request(`/stats/civilizations/${civName}/patch`);
  }

  /** Win Rate by Rating buckets */
  async getCivWinRateByRating(civName) {
    return this.request(`/stats/civilizations/${civName}/rating`);
  }

  /** Rank of this civ per patch */
  async getCivRankByPatch(civName) {
    return this.request(`/stats/civilizations/${civName}/rank`);
  }

  /** Play Rate by Rating buckets */
  async getCivPlayRateByRating(civName) {
    return this.request(`/stats/civilizations/${civName}/playrate/rating`);
  }

  /** Play Rate by Patch */
  async getCivPlayRateByPatch(civName) {
    return this.request(`/stats/civilizations/${civName}/playrate/patch`);
  }

  /** Highest Win Rates Against other civs */
  async getCivBestAgainst(civName) {
    return this.request(`/stats/civilizations/${civName}/best-against`);
  }

  /** Lowest Win Rates Against other civs */
  async getCivWorstAgainst(civName) {
    return this.request(`/stats/civilizations/${civName}/worst-against`);
  }

  /** Maps-specific stats for this civ */
  async getCivMaps(civName) {
    return this.request(`/stats/civilizations/${civName}/maps`);
  }

  async getCivilizationStats(params = {}) {
    return this.request('/stats/civilizations'); // Remove -fast suffix and params
  }

  async getCivWinRateByDuration(civName) {
    return this.request(`/stats/civilizations/${civName}/duration`);
  }

}

export default new ApiService();
