import React, { useState } from 'react';
import { useMapStats } from '../hooks/useApi';
import { formatNumber, formatMap, formatCivilization, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const MapsPage = () => {
  const [filters, setFilters] = useState({
    leaderboard: '',
    patch: '',
    minMatches: '100'
  });

  const { data, loading, error, refetch } = useMapStats(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <LoadingSpinner text="Loading map statistics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const maps = data?.maps || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-map mr-3 text-primary"></i>
          Map Statistics
        </h1>
        <p className="text-lg text-base-content/70">
          Comprehensive analysis of Age of Empires II maps and civilization performance
        </p>
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
                <option value="14">Team Empire Wars</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Min Matches</span>
              </label>
              <input
                type="number"
                placeholder="100"
                className="input input-bordered"
                value={filters.minMatches}
                onChange={(e) => handleFilterChange('minMatches', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text opacity-0">Clear</span>
              </label>
              <button
                className="btn btn-outline"
                onClick={() => setFilters({
                  leaderboard: '',
                  patch: '',
                  minMatches: '100'
                })}
              >
                <i className="fas fa-times mr-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {data?.meta && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-primary">
              <i className="fas fa-map text-3xl"></i>
            </div>
            <div className="stat-title">Total Maps</div>
            <div className="stat-value text-primary">{data.meta.totalMaps}</div>
            <div className="stat-desc">Analyzed with current filters</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-secondary">
              <i className="fas fa-chart-bar text-3xl"></i>
            </div>
            <div className="stat-title">Filter Settings</div>
            <div className="stat-value text-secondary text-lg">
              {filters.leaderboard ? `LB ${filters.leaderboard}` : 'All LBs'}
            </div>
            <div className="stat-desc">Min {filters.minMatches} matches</div>
          </div>
        </div>
      )}

      {/* Maps Grid */}
      <div className="space-y-8">
        {maps.map((mapData, index) => (
          <div key={mapData.map || index} className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              {/* Map Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-lg w-16 h-16">
                      <i className="fas fa-mountain text-2xl"></i>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{formatMap(mapData.map)}</h2>
                    <div className="flex items-center space-x-4 text-sm text-base-content/70">
                      <span>
                        <i className="fas fa-sword mr-1"></i>
                        {formatNumber(mapData.stats.totalMatches)} matches
                      </span>
                      <span>
                        <i className="fas fa-trophy mr-1"></i>
                        {mapData.stats.avgElo} avg ELO
                      </span>
                      <span>
                        <i className="fas fa-clock mr-1"></i>
                        {mapData.stats.avgDurationMinutes}m avg
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="badge badge-outline badge-lg">
                  Rank #{index + 1}
                </div>
              </div>

              {/* Map Statistics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-base-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(mapData.stats.totalMatches)}
                  </div>
                  <div className="text-sm text-base-content/70">Total Matches</div>
                </div>

                <div className="bg-base-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {mapData.stats.avgElo}
                  </div>
                  <div className="text-sm text-base-content/70">Average ELO</div>
                </div>

                <div className="bg-base-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-accent">
                    {mapData.stats.avgDurationMinutes}m
                  </div>
                  <div className="text-sm text-base-content/70">Avg Duration</div>
                </div>

                <div className="bg-base-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-info">
                    {mapData.stats.avgPlayers}
                  </div>
                  <div className="text-sm text-base-content/70">Avg Players</div>
                </div>
              </div>

              {/* ELO Range */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">ELO Distribution</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Min ELO: {mapData.stats.eloRange.min}</span>
                      <span>Max ELO: {mapData.stats.eloRange.max}</span>
                    </div>
                    <progress 
                      className="progress progress-primary w-full" 
                      value={mapData.stats.avgElo} 
                      max={mapData.stats.eloRange.max}
                    ></progress>
                  </div>
                </div>
              </div>

              {/* Top Civilizations */}
              {mapData.topCivilizations && mapData.topCivilizations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">
                    <i className="fas fa-flag mr-2 text-primary"></i>
                    Top Performing Civilizations
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {mapData.topCivilizations.map((civ, civIndex) => (
                      <div key={civIndex} className="bg-base-100 p-4 rounded-lg hover:bg-base-300 transition-colors">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <i className="fas fa-shield-alt text-primary mr-2"></i>
                            <span className="font-semibold text-sm">
                              {formatCivilization(civ.name)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-lg font-bold text-success">
                                {formatPercentage(civ.winRate)}
                              </div>
                              <div className="text-xs text-base-content/70">Win Rate</div>
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium">
                                {formatNumber(civ.picks)}
                              </div>
                              <div className="text-xs text-base-content/70">Picks</div>
                            </div>

                            <div>
                              <div className="text-sm font-medium">
                                {formatNumber(civ.wins)}
                              </div>
                              <div className="text-xs text-base-content/70">Wins</div>
                            </div>
                          </div>

                          {/* Win Rate Progress Bar */}
                          <div className="mt-3">
                            <progress 
                              className={`progress progress-sm w-full ${
                                civ.winRate >= 0.55 ? 'progress-success' : 
                                civ.winRate >= 0.50 ? 'progress-warning' : 'progress-error'
                              }`} 
                              value={civ.winRate * 100} 
                              max="100"
                            ></progress>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {mapData.topCivilizations.length === 0 && (
                    <div className="text-center py-8 text-base-content/50">
                      <i className="fas fa-flag text-3xl mb-2"></i>
                      <p>No civilization data available for this map</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {maps.length === 0 && (
        <div className="text-center py-16">
          <i className="fas fa-map text-6xl text-base-content/30 mb-4"></i>
          <h3 className="text-2xl font-bold text-base-content/70 mb-2">No Maps Found</h3>
          <p className="text-base-content/50 mb-6">
            No map data available with the current filters. Try adjusting your search criteria.
          </p>
          <button 
            className="btn btn-primary btn-outline"
            onClick={() => setFilters({
              leaderboard: '',
              patch: '',
              minMatches: '50'
            })}
          >
            <i className="fas fa-redo mr-2"></i>
            Reset Filters
          </button>
        </div>
      )}

      {/* Map Analysis Info */}
      <div className="mt-12 card bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
        <div className="card-body">
          <h3 className="card-title text-primary">
            <i className="fas fa-lightbulb mr-2"></i>
            Understanding Map Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold mb-2">Average ELO</h4>
              <p className="text-sm text-base-content/70">
                The mean skill level of players on this map. Higher values may indicate more complex or competitive maps.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Average Duration</h4>
              <p className="text-sm text-base-content/70">
                How long matches typically last on this map. Some maps favor quick rushes while others lead to longer economic games.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Civilization Performance</h4>
              <p className="text-sm text-base-content/70">
                Different civilizations excel on different maps due to their unique bonuses and the map's characteristics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Match Frequency</h4>
              <p className="text-sm text-base-content/70">
                Popular maps see more play and have more reliable statistics. Less common maps may show more variance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;