import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useApi = (apiCall, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API call failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch
  };
};

// Specific hooks for common API calls
export const useMatches = (params = {}) => {
  return useApi(
    () => apiService.getMatches(params),
    [JSON.stringify(params)]
  );
};

export const useMatchStats = (params = {}) => {
  return useApi(
    () => apiService.getMatchStats(params),
    [JSON.stringify(params)]
  );
};

export const usePlayer = (profileId) => {
  return useApi(
    () => apiService.getPlayerProfile(profileId),
    [profileId],
    !!profileId
  );
};

export const useCivilizationStats = (params = {}) => {
  return useApi(
    () => apiService.getCivilizationStats(params),
    [JSON.stringify(params)]
  );
};

export const useMapStats = (params = {}) => {
  return useApi(
    () => apiService.getMapStats(params),
    [JSON.stringify(params)]
  );
};

export const useLeaderboardStats = () => {
  return useApi(() => apiService.getLeaderboardStats(), []);
};

export const usePlayerRankings = (leaderboard, params = {}) => {
  return useApi(
    () => apiService.getPlayerRankings(leaderboard, params),
    [leaderboard, JSON.stringify(params)],
    !!leaderboard
  );
};

export const useTrends = (params = {}) => {
  return useApi(
    () => apiService.getTrends(params),
    [JSON.stringify(params)]
  );
};

export const useEloDistribution = (params = {}) => {
  return useApi(
    () => apiService.getEloDistribution(params),
    [JSON.stringify(params)]
  );
};

export const useOpeningStats = (params = {}) => {
  return useApi(
    () => apiService.getOpeningStats(params),
    [JSON.stringify(params)]
  );
};

export const usePatchStats = (params = {}) => {
  return useApi(
    () => apiService.getPatchStats(params),
    [JSON.stringify(params)]
  );
};

export const usePerformanceAnalytics = (params = {}) => {
  return useApi(
    () => apiService.getPerformanceAnalytics(params),
    [JSON.stringify(params)]
  );
};