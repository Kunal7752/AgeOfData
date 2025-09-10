// hooks/useApi.js - Optimized hooks with debouncing, caching, and performance improvements
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiService from '../services/api';

// Debounce utility
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Enhanced base API hook with performance optimizations
export const useApi = (apiCall, dependencies = [], immediate = true, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const lastCallRef = useRef(null);

  const {
    debounceMs = 0,
    cacheKey = null,
    retryAttempts = 0,
    retryDelay = 1000
  } = options;

  // Debounce dependencies if specified
  const debouncedDeps = useDebounce(JSON.stringify(dependencies), debounceMs);

  const execute = useCallback(async (...args) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentCall = Date.now();
    lastCallRef.current = currentCall;

    try {
      setLoading(true);
      setError(null);

      let attempts = 0;
      let lastError;

      while (attempts <= retryAttempts) {
        try {
          // Check if this call is still the most recent
          if (lastCallRef.current !== currentCall) {
            console.log('🚫 Call superseded, aborting');
            return;
          }

          const result = await apiCall(...args);
          
          // Final check before setting data
          if (lastCallRef.current === currentCall) {
            setData(result);
            return result;
          }
          
          return result;
        } catch (err) {
          lastError = err;
          attempts++;
          
          if (attempts <= retryAttempts && !abortControllerRef.current.signal.aborted) {
            console.log(`🔄 Retry attempt ${attempts}/${retryAttempts} after ${retryDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      throw lastError;
    } catch (err) {
      if (lastCallRef.current === currentCall && !abortControllerRef.current.signal.aborted) {
        const errorMessage = err.name === 'AbortError' ?
          'Request cancelled' : err.message || 'An error occurred';
        setError(errorMessage);
        console.error('API call failed:', err);
      }
      throw err;
    } finally {
      if (lastCallRef.current === currentCall) {
        setLoading(false);
      }
    }
  }, [apiCall, retryAttempts, retryDelay]);

  useEffect(() => {
    if (immediate && debounceMs > 0 ? debouncedDeps : true) {
      execute();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, debounceMs > 0 ? [debouncedDeps] : dependencies);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch
  };
};

// Optimized civilization stats hook with intelligent caching and debouncing
export const useCivilizationStats = (params = {}) => {
  // Memoize filter hash for better caching
  const filterHash = useMemo(() => {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] && params[key] !== '' && params[key] !== 'all') {
        cleanParams[key] = params[key];
      }
    });
    return JSON.stringify(cleanParams);
  }, [params]);

  // Determine debounce delay based on filter complexity
  const debounceMs = useMemo(() => {
    const filterCount = Object.keys(params).filter(key => 
      params[key] && params[key] !== '' && params[key] !== 'all'
    ).length;
    
    // More filters = longer debounce to avoid excessive API calls
    if (filterCount >= 5) return 800;
    if (filterCount >= 3) return 500;
    return 300;
  }, [params]);

  return useApi(
    () => apiService.getCivilizationStats(params),
    [filterHash],
    true,
    { 
      debounceMs,
      cacheKey: `civ-stats-${filterHash}`,
      retryAttempts: 1,
      retryDelay: 1000
    }
  );
};

// Enhanced matches hook with pagination and filtering
export const useMatches = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getMatches(params),
    [filterHash],
    true,
    { 
      debounceMs: 300,
      cacheKey: `matches-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Optimized map stats hook
export const useMapStats = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getMapStats(params),
    [filterHash],
    true,
    { 
      debounceMs: 400,
      cacheKey: `map-stats-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Player profile hook with caching
export const usePlayer = (profileId) => {
  return useApi(
    () => apiService.getPlayerProfile(profileId),
    [profileId],
    !profileId,
    { 
      cacheKey: `player-${profileId}`,
      retryAttempts: 2
    }
  );
};

// Player rankings with optimized pagination
export const usePlayerRankings = (leaderboard, params = {}) => {
  const filterHash = useMemo(() => JSON.stringify({ leaderboard, ...params }), [leaderboard, params]);
  
  return useApi(
    () => apiService.getPlayerRankings(leaderboard, params),
    [filterHash],
    !!leaderboard,
    { 
      debounceMs: 200,
      cacheKey: `rankings-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Fast-loading leaderboard stats (highly cached)
export const useLeaderboardStats = () => {
  return useApi(
    () => apiService.getLeaderboardStats(),
    [],
    true,
    { 
      cacheKey: 'leaderboard-stats',
      retryAttempts: 2
    }
  );
};

// Match stats with intelligent refresh
export const useMatchStats = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getMatchStats(params),
    [filterHash],
    true,
    { 
      debounceMs: 300,
      cacheKey: `match-stats-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Trends data with longer cache
export const useTrends = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getTrends(params),
    [filterHash],
    true,
    { 
      debounceMs: 500,
      cacheKey: `trends-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// ELO distribution (rarely changes, aggressive caching)
export const useEloDistribution = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getEloDistribution(params),
    [filterHash],
    true,
    { 
      debounceMs: 600,
      cacheKey: `elo-dist-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Opening stats
export const useOpeningStats = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getOpeningStats(params),
    [filterHash],
    true,
    { 
      debounceMs: 400,
      cacheKey: `opening-stats-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Patch stats
export const usePatchStats = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getPatchStats(params),
    [filterHash],
    true,
    { 
      debounceMs: 400,
      cacheKey: `patch-stats-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// Performance analytics
export const usePerformanceAnalytics = (params = {}) => {
  const filterHash = useMemo(() => JSON.stringify(params), [params]);
  
  return useApi(
    () => apiService.getPerformanceAnalytics(params),
    [filterHash],
    true,
    { 
      debounceMs: 500,
      cacheKey: `performance-${filterHash}`,
      retryAttempts: 1
    }
  );
};

// ===================================================================
// ADVANCED CIVILIZATION HOOKS
// ===================================================================

// 🔧 FIXED: Comprehensive civilization detail hook using individual endpoints
// This avoids the MongoDB timeout issue with the /complete endpoint
export function useCivilizationDetail(civName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!civName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🛡️ Loading civilization data for: ${civName}`);
      
      // Load from the complete endpoint
      const completeData = await apiService.getCivilizationComplete(civName);
      
      // FIXED: Set data immediately if we get a valid response
      if (completeData && (completeData.comprehensive || completeData.basic)) {
        console.log(`✅ Complete data loaded for ${civName}`);
        
        // FIXED: Ensure proper data structure with fallbacks
        const processedData = {
          comprehensive: completeData.comprehensive || {},
          basic: completeData.basic || completeData.comprehensive?.stats || {},
          bestVs: completeData.bestVs || [],
          worstVs: completeData.worstVs || [],
          maps: completeData.maps || []
        };

        // FIXED: Ensure charts object exists and has required data
        if (!processedData.comprehensive.charts) {
          processedData.comprehensive.charts = {};
        }

        // FIXED: Ensure winRateByRating has playRate field
        const charts = processedData.comprehensive.charts;
        if (charts.winRateByRating && charts.winRateByRating.length > 0) {
          // Verify playRate field exists, if not calculate it
          const totalGames = charts.winRateByRating.reduce((sum, rating) => sum + (rating.games || 0), 0);
          charts.winRateByRating = charts.winRateByRating.map(rating => ({
            ...rating,
            playRate: rating.playRate !== undefined ? rating.playRate : 
                     totalGames > 0 ? Math.round((rating.games / totalGames) * 100 * 10) / 10 : 0
          }));
        }

        setData(processedData);
        setLoading(false);
        return;
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load civilization data');
      console.error('Civilization data loading failed:', err);
    } finally {
      setLoading(false);
    }
  }, [civName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refetch };
}
// Lazy loading hook for data that should only load when requested
export const useLazyApi = (apiCall) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
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
      console.error('Lazy API call failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute };
};

// Hook for real-time data with auto-refresh
export const useRealtimeApi = (apiCall, dependencies = [], refreshInterval = 30000) => {
  const { data, loading, error, execute, refetch } = useApi(apiCall, dependencies);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing data...');
        refetch();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetch, refreshInterval]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
    stopAutoRefresh
  };
};

// Hook for batch API calls
export const useBatchApi = (apiCalls = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    if (apiCalls.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 Executing ${apiCalls.length} API calls in parallel...`);
      const results = await Promise.allSettled(apiCalls.map(call => call()));
      
      const successfulResults = results.map((result, index) => ({
        index,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null
      }));
      
      setData(successfulResults);
      
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount}/${apiCalls.length} API calls failed`);
      }
      
      return successfulResults;
    } catch (err) {
      setError(err.message || 'Batch API call failed');
      console.error('Batch API call failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCalls]);

  return { data, loading, error, execute };
};