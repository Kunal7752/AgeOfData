import React, { useState, useEffect } from 'react';
import { useMatches } from '../hooks/useApi';
import { formatDateTime, formatDuration, formatElo, formatMap, getEloColor } from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const MatchesPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    map: '',
    leaderboard: '',
    minElo: '',
    maxElo: '',
    gameType: '',
    playerCount: ''
  });

  const { data, loading, error, refetch } = useMatches(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  if (loading) return <LoadingSpinner text="Loading matches..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const matches = data?.matches || [];
  const pagination = data?.pagination || {};

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-sword mr-3 text-primary"></i>
          Match Browser
        </h1>
        <p className="text-lg text-base-content/70">
          Explore thousands of Age of Empires II matches with advanced filtering
        </p>
      </div>

      {/* Filters */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-filter mr-2"></i>
            Filters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Map Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Map</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Arabia, Arena"
                className="input input-bordered"
                value={filters.map}
                onChange={(e) => handleFilterChange('map', e.target.value)}
              />
            </div>

            {/* Leaderboard Filter */}
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

            {/* ELO Range */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Min ELO</span>
              </label>
              <input
                type="number"
                placeholder="1000"
                className="input input-bordered"
                value={filters.minElo}
                onChange={(e) => handleFilterChange('minElo', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Max ELO</span>
              </label>
              <input
                type="number"
                placeholder="2000"
                className="input input-bordered"
                value={filters.maxElo}
                onChange={(e) => handleFilterChange('maxElo', e.target.value)}
              />
            </div>

            {/* Player Count */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Players</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.playerCount}
                onChange={(e) => handleFilterChange('playerCount', e.target.value)}
              >
                <option value="">All</option>
                <option value="2">1v1</option>
                <option value="4">2v2</option>
                <option value="6">3v3</option>
                <option value="8">4v4</option>
              </select>
            </div>

            {/* Game Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Game Type</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.gameType}
                onChange={(e) => handleFilterChange('gameType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="random_map">Random Map</option>
                <option value="death_match">Death Match</option>
                <option value="regicide">Regicide</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="form-control">
              <label className="label">
                <span className="label-text opacity-0">Clear</span>
              </label>
              <button
                className="btn btn-outline"
                onClick={() => setFilters({
                  page: 1,
                  limit: 20,
                  map: '',
                  leaderboard: '',
                  minElo: '',
                  maxElo: '',
                  gameType: '',
                  playerCount: ''
                })}
              >
                <i className="fas fa-times mr-2"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-lg">
            Showing <span className="font-bold text-primary">{matches.length}</span> matches
            {pagination.totalMatches && (
              <span> of <span className="font-bold">{pagination.totalMatches.toLocaleString()}</span></span>
            )}
          </p>
        </div>
        <div className="form-control">
          <select
            className="select select-bordered select-sm"
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', e.target.value)}
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Matches Table */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-300">
                  <th>Match ID</th>
                  <th>Map</th>
                  <th>Players</th>
                  <th>Average ELO</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.length > 0 ? (
                  matches.map((match) => (
                    <tr key={match.game_id} className="hover">
                      <td>
                        <div className="font-mono text-sm">
                          {match.game_id?.substring(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-map text-accent"></i>
                          <span className="font-medium">{formatMap(match.map)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-users text-info"></i>
                          <span>{match.num_players || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-bold ${getEloColor(match.avg_elo)}`}>
                          {formatElo(match.avg_elo)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-clock text-warning"></i>
                          <span>{match.durationMinutes}m</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm">
                          {formatDateTime(match.started_timestamp)}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary btn-outline">
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="text-base-content/50">
                        <i className="fas fa-search text-4xl mb-4"></i>
                        <p>No matches found with current filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="join">
            <button
              className="join-item btn"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = Math.max(1, pagination.currentPage - 2) + i;
              if (page > pagination.totalPages) return null;
              
              return (
                <button
                  key={page}
                  className={`join-item btn ${page === pagination.currentPage ? 'btn-active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              className="join-item btn"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;