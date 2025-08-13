import React from 'react';
import { useLeaderboardStats, usePerformanceAnalytics } from '../hooks/useApi';
import { formatNumber, formatLeaderboard, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const LeaderboardsPage = () => {
  const { data: leaderboardStats, loading: statsLoading, error: statsError } = useLeaderboardStats();
  const { data: analytics, loading: analyticsLoading } = usePerformanceAnalytics({ timeframe: 30 });

  if (statsLoading || analyticsLoading) {
    return <LoadingSpinner text="Loading leaderboard statistics..." />;
  }

  if (statsError) {
    return <ErrorMessage message={statsError} />;
  }

  const leaderboards = leaderboardStats?.leaderboards || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-trophy mr-3 text-primary"></i>
          Leaderboards Overview
        </h1>
        <p className="text-lg text-base-content/70">
          Complete analysis of all Age of Empires II competitive leaderboards
        </p>
      </div>

      {/* Quick Stats */}
      {analytics?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-primary">
                    {formatNumber(analytics.overview.totalMatches)}
                  </h3>
                  <p className="text-base-content/70">Total Matches</p>
                  <p className="text-xs text-base-content/50">Last 30 days</p>
                </div>
                <div className="text-3xl text-primary">
                  <i className="fas fa-sword"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-secondary">
                    {formatNumber(analytics.overview.totalPlayers)}
                  </h3>
                  <p className="text-base-content/70">Active Players</p>
                  <p className="text-xs text-base-content/50">Last 30 days</p>
                </div>
                <div className="text-3xl text-secondary">
                  <i className="fas fa-users"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-accent">
                    {Math.round(analytics.overview.avgElo || 0)}
                  </h3>
                  <p className="text-base-content/70">Average ELO</p>
                  <p className="text-xs text-base-content/50">All leaderboards</p>
                </div>
                <div className="text-3xl text-accent">
                  <i className="fas fa-chart-line"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-info">
                    {Math.round((analytics.overview.avgDuration || 0) / 60)}m
                  </h3>
                  <p className="text-base-content/70">Avg Duration</p>
                  <p className="text-xs text-base-content/50">All matches</p>
                </div>
                <div className="text-3xl text-info">
                  <i className="fas fa-clock"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {leaderboards.map((lb, index) => (
          <div key={lb.id || index} className="card bg-base-200 shadow-xl border border-base-300 hover:border-primary transition-colors">
            <div className="card-body">
              {/* Leaderboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-lg w-12 h-12">
                      <i className={`fas ${
                        lb.name?.includes('1v1') ? 'fa-user' :
                        lb.name?.includes('Team') ? 'fa-users' :
                        lb.name?.includes('Death') ? 'fa-skull' :
                        lb.name?.includes('Empire') ? 'fa-crown' :
                        'fa-trophy'
                      } text-xl`}></i>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {formatLeaderboard(lb.id) || lb.name || `Leaderboard ${lb.id}`}
                    </h2>
                    <p className="text-sm text-base-content/70">
                      Competitive ranking system
                    </p>
                  </div>
                </div>
                <div className="badge badge-outline badge-lg">
                  #{index + 1}
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-base-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(lb.totalMatches)}
                  </div>
                  <div className="text-xs text-base-content/70">Total Matches</div>
                </div>

                <div className="bg-base-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {Math.round(lb.avgElo || 0)}
                  </div>
                  <div className="text-xs text-base-content/70">Average ELO</div>
                </div>

                <div className="bg-base-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-accent">
                    {lb.avgDurationMinutes || 0}m
                  </div>
                  <div className="text-xs text-base-content/70">Avg Duration</div>
                </div>

                <div className="bg-base-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-info">
                    {Math.round(lb.avgPlayers || 0)}
                  </div>
                  <div className="text-xs text-base-content/70">Players/Match</div>
                </div>
              </div>

              {/* ELO Range */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm">ELO Range</h4>
                <div className="flex justify-between text-xs mb-1">
                  <span>Min: {Math.round(lb.minElo || 0)}</span>
                  <span>Avg: {Math.round(lb.avgElo || 0)}</span>
                  <span>Max: {Math.round(lb.maxElo || 0)}</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={lb.avgElo || 0} 
                  max={lb.maxElo || 3000}
                ></progress>
              </div>

              {/* Activity Level */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm">Activity Level</h4>
                <div className="flex items-center space-x-2">
                  <progress 
                    className="progress progress-success flex-1" 
                    value={Math.min(lb.totalMatches / 1000, 100)} 
                    max="100"
                  ></progress>
                  <span className="text-xs text-base-content/70">
                    {lb.totalMatches > 10000 ? 'Very High' :
                     lb.totalMatches > 5000 ? 'High' :
                     lb.totalMatches > 1000 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card-actions justify-end">
                <button className="btn btn-primary btn-sm btn-outline">
                  <i className="fas fa-list mr-2"></i>
                  View Rankings
                </button>
                <button className="btn btn-secondary btn-sm btn-outline">
                  <i className="fas fa-chart-bar mr-2"></i>
                  Statistics
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Chart */}
      {analytics?.hourlyActivity && (
        <div className="card bg-base-200 shadow-xl border border-base-300 mb-12">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <i className="fas fa-clock mr-2 text-primary"></i>
              Daily Activity Pattern
            </h2>
            
            <div className="grid grid-cols-12 gap-1 mb-4">
              {analytics.hourlyActivity.map((hour, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="bg-primary rounded-t mb-1"
                    style={{ 
                      height: `${Math.max(4, (hour.matches / Math.max(...analytics.hourlyActivity.map(h => h.matches))) * 60)}px` 
                    }}
                  ></div>
                  <div className="text-xs text-base-content/70">
                    {hour.hour.toString().padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-sm text-base-content/70">
              <span>Midnight</span>
              <span>Noon</span>
              <span>Midnight</span>
            </div>
            
            <p className="text-center text-sm text-base-content/70 mt-4">
              Peak activity: {analytics.hourlyActivity.reduce((max, hour) => 
                hour.matches > max.matches ? hour : max
              ).hour}:00 with {formatNumber(Math.max(...analytics.hourlyActivity.map(h => h.matches)))} matches
            </p>
          </div>
        </div>
      )}

      {/* ELO Distribution */}
      {analytics?.durationByElo && (
        <div className="card bg-base-200 shadow-xl border border-base-300 mb-12">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <i className="fas fa-chart-bar mr-2 text-secondary"></i>
              Match Duration by ELO Bracket
            </h2>
            
            <div className="space-y-4">
              {analytics.durationByElo.map((bracket, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium">
                    {bracket.eloBracket === 'High' ? '2500+' : 
                     typeof bracket.eloBracket === 'number' ? 
                     `${bracket.eloBracket}-${bracket.eloBracket + 200}` : 
                     bracket.eloBracket}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{bracket.avgDurationMinutes}m avg</span>
                      <span>{formatNumber(bracket.matches)} matches</span>
                    </div>
                    <progress 
                      className="progress progress-accent w-full" 
                      value={bracket.avgDurationMinutes} 
                      max={Math.max(...analytics.durationByElo.map(b => b.avgDurationMinutes))}
                    ></progress>
                  </div>
                  
                  <div className="text-sm text-base-content/70">
                    {bracket.durationRange.min}m - {bracket.durationRange.max}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Competitive Insights */}
      <div className="card bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
        <div className="card-body">
          <h3 className="card-title text-secondary">
            <i className="fas fa-brain mr-2"></i>
            Competitive Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold mb-2">Most Popular Format</h4>
              <p className="text-sm text-base-content/70">
                {leaderboards.length > 0 && 
                  formatLeaderboard(leaderboards.reduce((max, lb) => 
                    lb.totalMatches > max.totalMatches ? lb : max
                  ).id)
                } dominates with the highest match count, indicating its popularity in the competitive scene.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Skill Distribution</h4>
              <p className="text-sm text-base-content/70">
                Average ELO across all leaderboards is {Math.round(analytics?.overview?.avgElo || 0)}, 
                showing a healthy distribution of skill levels in the competitive community.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Match Length Trends</h4>
              <p className="text-sm text-base-content/70">
                Higher ELO brackets tend to have {analytics?.durationByElo?.length > 2 &&
                analytics.durationByElo[analytics.durationByElo.length - 1].avgDurationMinutes >
                analytics.durationByElo[0].avgDurationMinutes ? 'longer' : 'shorter'} matches, 
                reflecting different strategic approaches.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Peak Activity</h4>
              <p className="text-sm text-base-content/70">
                Most matches occur during {analytics?.hourlyActivity && 
                  analytics.hourlyActivity.reduce((max, hour) => 
                    hour.matches > max.matches ? hour : max
                  ).hour}:00, helping players find matches more quickly during these hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsPage;