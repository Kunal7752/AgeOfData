import React, { useState } from 'react';
import { usePlayerRankings } from '../hooks/useApi';
import { formatNumber, formatElo, formatLeaderboard, getEloColor, formatRelativeTime } from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const PlayersPage = () => {
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('2'); // Default to 1v1 RM
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50
  });

  const { data, loading, error, refetch } = usePlayerRankings(selectedLeaderboard, filters);

  const handleLeaderboardChange = (leaderboard) => {
    setSelectedLeaderboard(leaderboard);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  if (loading) return <LoadingSpinner text="Loading player rankings..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const players = data?.rankings || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-users mr-3 text-primary"></i>
          Player Rankings
        </h1>
        <p className="text-lg text-base-content/70">
          Top players across all Age of Empires II competitive leaderboards
        </p>
      </div>

      {/* Leaderboard Selector */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-trophy mr-2"></i>
            Select Leaderboard
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { id: '2', name: '1v1 Random Map', icon: 'fa-user' },
              { id: '3', name: 'Team Random Map', icon: 'fa-users' },
              { id: '4', name: '1v1 Death Match', icon: 'fa-skull' },
              { id: '13', name: '1v1 Empire Wars', icon: 'fa-crown' },
              { id: '14', name: 'Team Empire Wars', icon: 'fa-crown' }
            ].map((lb) => (
              <button
                key={lb.id}
                onClick={() => handleLeaderboardChange(lb.id)}
                className={`btn ${selectedLeaderboard === lb.id ? 'btn-primary' : 'btn-outline'} h-auto py-4`}
              >
                <div className="text-center">
                  <i className={`fas ${lb.icon} text-2xl mb-2`}></i>
                  <div className="text-sm font-medium">{lb.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Leaderboard Info */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">
              {formatLeaderboard(selectedLeaderboard)}
            </h3>
            <p className="text-base-content/70">
              Showing top {players.length} players
            </p>
          </div>
          
          <div className="form-control">
            <select
              className="select select-bordered"
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: e.target.value, page: 1 }))}
            >
              <option value="25">Top 25</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-300">
                  <th className="text-center">Rank</th>
                  <th>Player</th>
                  <th className="text-center">Rating</th>
                  <th className="text-center">Matches</th>
                  <th className="text-center">Win Rate</th>
                  <th className="text-center">Last Played</th>
                </tr>
              </thead>
              <tbody>
                {players.length > 0 ? (
                  players.map((player, index) => (
                    <tr key={player._id || index} className="hover">
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          {index < 3 && (
                            <i className={`fas fa-medal mr-2 ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-400' :
                              'text-amber-600'
                            }`}></i>
                          )}
                          <span className="font-bold text-lg">
                            #{((filters.page - 1) * filters.limit) + index + 1}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-lg w-10 h-10">
                              <i className="fas fa-user"></i>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">Player #{player._id}</div>
                            <div className="text-sm text-base-content/70">
                              Profile ID: {player._id}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="text-center">
                        <span className={`font-bold text-lg ${getEloColor(player.latestRating)}`}>
                          {formatElo(player.latestRating)}
                        </span>
                      </td>
                      
                      <td className="text-center">
                        <span className="font-medium">
                          {formatNumber(player.totalMatches)}
                        </span>
                      </td>
                      
                      <td className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${
                            player.winRate >= 0.6 ? 'text-success' :
                            player.winRate >= 0.5 ? 'text-warning' :
                            'text-error'
                          }`}>
                            {(player.winRate * 100).toFixed(1)}%
                          </span>
                          <div className="text-xs text-base-content/70">
                            {player.wins}W / {player.totalMatches - player.wins}L
                          </div>
                        </div>
                      </td>
                      
                      <td className="text-center text-sm">
                        {formatRelativeTime(player.lastPlayed)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="text-base-content/50">
                        <i className="fas fa-users text-4xl mb-4"></i>
                        <p>No player data available for this leaderboard</p>
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
      {data?.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="join">
            <button
              className="join-item btn"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <span className="join-item btn btn-disabled">
              Page {filters.page} of {data.totalPages}
            </span>
            
            <button
              className="join-item btn"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= data.totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Player Stats Info */}
      <div className="mt-12 card bg-gradient-to-r from-info/10 to-primary/10 border border-info/20">
        <div className="card-body">
          <h3 className="card-title text-info">
            <i className="fas fa-info-circle mr-2"></i>
            Understanding Player Rankings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold mb-2">Rating System</h4>
              <p className="text-sm text-base-content/70">
                Player ratings use the Elo system. Higher ratings indicate stronger players. Ratings change based on match results and opponent strength.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Win Rate</h4>
              <p className="text-sm text-base-content/70">
                Percentage of matches won. A 60%+ win rate is excellent, 50-60% is good, and below 50% indicates room for improvement.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Activity</h4>
              <p className="text-sm text-base-content/70">
                "Last Played" shows when the player was most recently active. Regular play helps maintain accurate ratings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Leaderboards</h4>
              <p className="text-sm text-base-content/70">
                Different game modes have separate rankings. 1v1 Random Map is the most competitive, while team games emphasize cooperation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayersPage;