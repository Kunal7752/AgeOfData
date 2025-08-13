// src/pages/CivilizationsPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCivilizationStats } from '../hooks/useApi';
import {
  formatNumber,
  formatPercentage,
  formatCivilization
} from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const CivilizationsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    leaderboard: '',  // Empty = all data
    patch: '',
    timeframe: 'all', // Show all time by default
    minElo: '',       // No filter
    maxElo: '',       // No filter
    minMatches: '10'  // Reasonable minimum
  });

  const { data, loading, error, refetch } = useCivilizationStats(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <LoadingSpinner text="Loading civilization statistics..." />;
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />;

  if (data?.error) {
    const fullMessage = `${data.error}${data.suggestion ? ' – ' + data.suggestion : ''}`;
    return <ErrorMessage message={fullMessage} onRetry={refetch} />;
  }


  const civilizations = data?.civilizations || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-flag mr-3 text-primary" />
          Civilization Statistics
        </h1>
        <p className="text-lg text-base-content/70">
          Comprehensive performance analysis of all Age of Empires II civilizations
        </p>
      </div>

      {/* Filters */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-filter mr-2" />
            Filters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Leaderboard */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Leaderboard</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.leaderboard}
                onChange={e => handleFilterChange('leaderboard', e.target.value)}
              >
                <option value="">All Leaderboards</option>
                <option value="2">1v1 Random Map</option>
                <option value="3">Team Random Map</option>
                <option value="4">1v1 Death Match</option>
                <option value="13">1v1 Empire Wars</option>
                <option value="14">Team Empire Wars</option>
              </select>
            </div>

            {/* Timeframe */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Timeframe</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.timeframe}
                onChange={e => handleFilterChange('timeframe', e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Min ELO */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Min ELO</span>
              </label>
              <input
                type="number"
                placeholder="1000"
                className="input input-bordered"
                value={filters.minElo}
                onChange={e => handleFilterChange('minElo', e.target.value)}
              />
            </div>

            {/* Max ELO */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Max ELO</span>
              </label>
              <input
                type="number"
                placeholder="2000"
                className="input input-bordered"
                value={filters.maxElo}
                onChange={e => handleFilterChange('maxElo', e.target.value)}
              />
            </div>

            {/* Min Matches */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Min Matches</span>
              </label>
              <input
                type="number"
                placeholder="50"
                className="input input-bordered"
                value={filters.minMatches}
                onChange={e => handleFilterChange('minMatches', e.target.value)}
              />
            </div>

            {/* Clear Filters */}
            <div className="form-control">
              <label className="label">
                <span className="label-text opacity-0">Clear</span>
              </label>
              <button
                className="btn btn-outline"
                onClick={() =>
                  setFilters({
                    leaderboard: '',
                    patch: '',
                    timeframe: '30',
                    minElo: '',
                    maxElo: '',
                    minMatches: '50'
                  })
                }
              >
                <i className="fas fa-times mr-2" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {data?.meta && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-primary">
              <i className="fas fa-flag text-3xl" />
            </div>
            <div className="stat-title">Total Civilizations</div>
            <div className="stat-value text-primary">
              {data.meta.totalCivilizations}
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-secondary">
              <i className="fas fa-sword text-3xl" />
            </div>
            <div className="stat-title">Total Matches</div>
            <div className="stat-value text-secondary">
              {formatNumber(data.meta.totalMatches)}
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-accent">
              <i className="fas fa-calendar text-3xl" />
            </div>
            <div className="stat-title">Data Range</div>
            <div className="stat-value text-accent text-lg">
              {filters.timeframe === 'all'
                ? 'All Time'
                : `${filters.timeframe} days`}
            </div>
          </div>
        </div>
      )}

      {/* Civilizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {civilizations.map((civ, index) => (
          <div
            key={civ.civilization || index}
            className="card bg-base-200 shadow-xl border border-base-300 hover:border-primary transition-colors"
          >
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-xl">
                  <i className="fas fa-shield-alt mr-2 text-primary" />
                  {formatCivilization(civ.civilization)}
                </h3>
                <div className="badge badge-outline badge-lg">
                  #{index + 1}
                </div>
              </div>

              {/* Win Rate */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Win Rate</span>
                  <span className="font-bold">
                    {formatPercentage(civ.stats.winRate)}
                  </span>
                </div>
                <progress
                  className={`progress w-full ${
                    civ.stats.winRate >= 0.55
                      ? 'progress-success'
                      : civ.stats.winRate >= 0.5
                      ? 'progress-warning'
                      : 'progress-error'
                  }`}
                  value={civ.stats.winRate * 100}
                  max="100"
                />
              </div>

              {/* Pick Rate */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Pick Rate</span>
                  <span className="font-bold">
                    {civ.stats.pickRate?.toFixed(1)}%
                  </span>
                </div>
                <progress
                  className="progress progress-info w-full"
                  value={civ.stats.pickRate || 0}
                  max="15"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-base-100 p-3 rounded-lg">
                  <div className="text-xs text-base-content/70 uppercase tracking-wide">
                    Total Picks
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatNumber(civ.stats.totalPicks)}
                  </div>
                </div>

                <div className="bg-base-100 p-3 rounded-lg">
                  <div className="text-xs text-base-content/70 uppercase tracking-wide">
                    Wins
                  </div>
                  <div className="text-lg font-bold text-success">
                    {formatNumber(civ.stats.wins)}
                  </div>
                </div>

                {/* Fixed Avg ELO section */}
                <div className="bg-base-100 p-3 rounded-lg">
                  <div className="text-xs text-base-content/70 uppercase tracking-wide">
                    Avg ELO
                  </div>
                  <div className="text-lg font-bold text-secondary">
                    {civ.stats.avgRating}
                  </div>
                </div>

                <div className="bg-base-100 p-3 rounded-lg">
                  <div className="text-xs text-base-content/70 uppercase tracking-wide">
                    Players
                  </div>
                  <div className="text-lg font-bold text-accent">
                    {formatNumber(civ.stats.uniquePlayers)}
                  </div>
                </div>
              </div>

              {/* Age Up Times */}
              {civ.ageUpTimes && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-sm">
                    Average Age Up Times
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {civ.ageUpTimes.feudal > 0 && (
                      <div className="bg-base-100 p-2 rounded text-center">
                        <div className="text-base-content/70">Feudal</div>
                        <div className="font-bold">
                          {Math.floor(civ.ageUpTimes.feudal / 60)}:
                          {String(civ.ageUpTimes.feudal % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    {civ.ageUpTimes.castle > 0 && (
                      <div className="bg-base-100 p-2 rounded text-center">
                        <div className="text-base-content/70">Castle</div>
                        <div className="font-bold">
                          {Math.floor(civ.ageUpTimes.castle / 60)}:
                          {String(civ.ageUpTimes.castle % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    {civ.ageUpTimes.imperial > 0 && (
                      <div className="bg-base-100 p-2 rounded text-center">
                        <div className="text-base-content/70">Imperial</div>
                        <div className="font-bold">
                          {Math.floor(civ.ageUpTimes.imperial / 60)}:
                          {String(civ.ageUpTimes.imperial % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View Details Button */}
              <div className="card-actions justify-end mt-4">
                <button
                  onClick={() => navigate(`/civs/${civ.civilization}`)}
                  className="btn btn-primary btn-sm btn-outline"
                >
                  <i className="fas fa-chart-line mr-2" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {civilizations.length === 0 && (
          <div className="text-center py-16">
            <i className="fas fa-flag text-6xl text-base-content/30 mb-4" />
            <h3 className="text-2xl font-bold text-base-content/70 mb-2">
              No Data Available
            </h3>
            <p className="text-base-content/50 mb-6">
              No civilization data found with the current filters. Try adjusting your search criteria.
            </p>
            <button
              className="btn btn-primary btn-outline"
              onClick={() =>
                setFilters({
                  leaderboard: '',
                  patch: '',
                  timeframe: '30',
                  minElo: '',
                  maxElo: '',
                  minMatches: '50'
                })
              }
            >
              <i className="fas fa-redo mr-2" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Statistics Info */}
      <div className="mt-12 card bg-gradient-to-r from-info/10 to-primary/10 border border-info/20">
        <div className="card-body">
          <h3 className="card-title text-info">
            <i className="fas fa-info-circle mr-2" />
            Understanding the Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold mb-2">Win Rate</h4>
              <p className="text-sm text-base-content/70">
                Percentage of matches won with this civilization. Higher values indicate stronger performance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Pick Rate</h4>
              <p className="text-sm text-base-content/70">
                How often this civilization is chosen relative to others. Popular civilizations have higher pick rates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Average ELO</h4>
              <p className="text-sm text-base-content/70">
                Mean skill level of players who choose this civilization. Indicates complexity or appeal at different skill levels.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Age Up Times</h4>
              <p className="text-sm text-base-content/70">
                Average time to reach each age. Faster times generally indicate economic advantages or strategic focus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CivilizationsPage;
