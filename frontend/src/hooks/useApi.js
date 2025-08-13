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

// export const useCivilizationDetail = (civName, params = {}) => {
//   return useApi(
//     () => apiService.getCivilizationDetail(civName, params),
//     [civName, JSON.stringify(params)],
//     !!civName
//   );
// };

export const useCivilizationDetail = (civName) => {
  // 1) summary (totalPicks, wins, winRate, pickRate, avgRating, ageUpTimes…)
  const summary    = useApi(
    () => apiService.getCivilizationDetail(civName),
    [civName],
    !!civName
  );

  // 2) chart‐specific calls
  const byLength   = useApi(
    () => apiService.getCivGameLength(civName),
    [civName],
    !!civName
  );

  const byDuration = useApi(
    () => apiService.getCivWinRateByDuration(civName),
    [civName],
    !!civName
  );

  const byPatch    = useApi(
    () => apiService.getCivWinRateByPatch(civName),
    [civName],
    !!civName
  );
  const byRating   = useApi(
    () => apiService.getCivWinRateByRating(civName),
    [civName],
    !!civName
  );
  const byRank     = useApi(
    () => apiService.getCivRankByPatch(civName),
    [civName],
    !!civName
  );
  const playRtRate = useApi(
    () => apiService.getCivPlayRateByRating(civName),
    [civName],
    !!civName
  );
  const playRtPatch= useApi(
    () => apiService.getCivPlayRateByPatch(civName),
    [civName],
    !!civName
  );
  const bestVs     = useApi(
    () => apiService.getCivBestAgainst(civName),
    [civName],
    !!civName
  );
  const worstVs    = useApi(
    () => apiService.getCivWorstAgainst(civName),
    [civName],
    !!civName
  );
  const maps       = useApi(
    () => apiService.getCivMaps(civName),
    [civName],
    !!civName
  );

  // Combined loading & error
  const loading = [
    summary.loading,
    byLength.loading,
    byPatch.loading,
    byDuration.loading,
    byRating.loading,
    byRank.loading,
    playRtRate.loading,
    playRtPatch.loading,
    bestVs.loading,
    worstVs.loading,
    maps.loading
  ].some(Boolean);

  const error = summary.error ||
                byLength.error ||
                byDuration.error ||
                byPatch.error ||
                byRating.error ||
                byRank.error ||
                playRtRate.error ||
                playRtPatch.error ||
                bestVs.error ||
                worstVs.error ||
                maps.error;

  // Merge everything into one `data` object for your page to consume
  const data = {
    ...summary.data,
    winRateVsGameLength: byLength.data    || [],
    winRateVsDuration: byDuration.data?.durationAnalysis || [],
    winRateByPatch:      byPatch.data     || [],
    winRateByRating:     byRating.data    || [],
    rankByPatch:         byRank.data      || [],
    playRateByRating:    playRtRate.data  || [],
    playRateByPatch:     playRtPatch.data || [],
    bestVs:              bestVs.data      || [],
    worstVs:             worstVs.data     || [],
    maps:                maps.data        || []
  };

  return {
    data,
    loading,
    error,
    refetch: summary.refetch
  };
};

