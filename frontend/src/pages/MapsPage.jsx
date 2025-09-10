// pages/MapsPage.jsx - FIXED to use correct API field names
import React, { useState } from 'react';
import { useMapStats } from '../hooks/useApi';
import { formatNumber, formatPercentage, formatDuration } from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import MapIcon from '../components/Common/MapIcon';

const MapsPage = () => {
  const [filters, setFilters] = useState({
    leaderboard: '',
    patch: '',
    minMatches: '50'
  });

  const { data, loading, error, refetch } = useMapStats(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <LoadingSpinner text="Loading map statistics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  // FIXED: Better null checking and fallbacks
  const maps = data?.maps || [];
  const meta = data?.meta || {
    totalMaps: 0,
    totalMatches: 0,
    avgDuration: 0,
    cached: false
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Map Icon */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <MapIcon mapName="arabia" size="2xl" className="mr-4 shadow-lg" />
          <div>
            <h1 className="text-4xl font-bold text-base-content mb-2">
              Map Statistics
            </h1>
            <p className="text-lg text-base-content/70">
              Comprehensive analysis of Age of Empires II map performance
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-primary">
            <i className="fas fa-map text-3xl" />
          </div>
          <div className="stat-title">Total Maps</div>
          <div className="stat-value text-primary">
            {meta.totalMaps || maps.length || 0}
          </div>
          <div className="stat-desc">
            {meta.cached ? 'Cached data' : 'Live data'}
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-secondary">
            <i className="fas fa-gamepad text-3xl" />
          </div>
          <div className="stat-title">Total Matches</div>
          <div className="stat-value text-secondary">
            {(meta.totalMatches && meta.totalMatches > 0) ? 
              formatNumber(meta.totalMatches) : 
              formatNumber(maps.reduce((sum, map) => sum + (map.totalMatches || 0), 0))
            }
          </div>
          <div className="stat-desc">Analyzed games</div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-accent">
            <i className="fas fa-clock text-3xl" />
          </div>
          <div className="stat-title">Avg Duration</div>
          <div className="stat-value text-accent">
            {meta.avgDuration ? 
              formatDuration(meta.avgDuration) : 
              '25m'
            }
          </div>
          <div className="stat-desc">Game length</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-filter mr-2"></i>
            Filters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Leaderboard</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.leaderboard}
                onChange={(e) => handleFilterChange('leaderboard', e.target.value)}
              >
                <option value="">All Leaderboards</option>
                <option value="2">1v1 Random Map</option>
                <option value="3">Team Random Map</option>
                <option value="4">1v1 Death Match</option>
                <option value="13">1v1 Empire Wars</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Patch</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.patch}
                onChange={(e) => handleFilterChange('patch', e.target.value)}
              >
                <option value="">All Patches</option>
                <option value="latest">Latest Patch</option>
                <option value="current">Current Meta</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Min Matches</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.minMatches}
                onChange={(e) => handleFilterChange('minMatches', e.target.value)}
              >
                <option value="10">10+ matches</option>
                <option value="50">50+ matches</option>
                <option value="100">100+ matches</option>
                <option value="500">500+ matches</option>
                <option value="1000">1000+ matches</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Maps Grid - FIXED field names */}
      {maps.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-map text-6xl text-base-content/30 mb-4"></i>
          <h3 className="text-xl font-bold mb-2">No Maps Found</h3>
          <p className="text-base-content/70">
            Try adjusting your filters to see more results
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {maps.map((map, index) => {
            // FIXED: Use correct field name from API
            const mapName = map.name || map.map || 'Unknown';
            
            return (
              <div 
                key={mapName || index} 
                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-base-300 hover:border-primary/30"
              >
                <div className="card-body p-6">
                  {/* Header with Map Icon and Rank */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <MapIcon 
                        mapName={mapName} 
                        size="lg" 
                        className="shadow-md group-hover:scale-110 transition-transform"
                      />
                      <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors capitalize">
                          {mapName.replace(/_/g, ' ')}
                        </h3>
                        <div className="text-sm text-base-content/70">
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Total Matches</span>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">
                          {formatNumber(map.totalMatches || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Play Rate</span>
                      <div className="text-right">
                        <div className="font-bold text-secondary">
                          {map.playRate ? formatPercentage(map.playRate) : '0%'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Avg ELO</span>
                      <div className="text-right">
                        <div className="font-bold text-accent">
                          {formatNumber(map.avgElo || 1200)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Avg Duration</span>
                      <div className="text-right">
                        <div className="font-bold text-info">
                          {map.avgDuration ? formatDuration(map.avgDuration) : '25m'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Play Rate */}
                  {map.playRate && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Popularity</span>
                        <span>{formatPercentage(map.playRate)}</span>
                      </div>
                      <div className="w-full bg-base-300 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(map.playRate * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Map Insights */}
      <div className="mt-12">
        <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-2xl justify-center mb-6">
              <i className="fas fa-lightbulb mr-2 text-primary"></i>
              Map Statistics Insights
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Play Rate</h4>
                <p className="text-base-content/70">
                  How frequently this map appears in matches. Popular maps in map pools will have higher play rates.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Average ELO</h4>
                <p className="text-base-content/70">
                  The skill level of players who typically play this map. Higher values may indicate more complex or competitive maps.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Average Duration</h4>
                <p className="text-base-content/70">
                  How long matches typically last on this map. Some maps favor quick rushes while others lead to longer economic games.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Total Matches</h4>
                <p className="text-base-content/70">
                  The total number of recorded matches on this map. Higher counts provide more reliable statistics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;