import React from "react";
import { useMatchStats, useLeaderboardStats, useTrends } from "../hooks/useApi";
import {
  formatNumber,
  formatPercentage,
  formatRelativeTime,
} from "../utils/formatters";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import ErrorMessage from "../components/Common/ErrorMessage";

const HomePage = () => {
  const {
    data: matchStats,
    loading: matchStatsLoading,
    error: matchStatsError,
  } = useMatchStats();
  const { data: leaderboardStats, loading: leaderboardLoading } =
    useLeaderboardStats();
  const { data: trends, loading: trendsLoading } = useTrends({ timeframe: 30 });

  if (matchStatsLoading || leaderboardLoading || trendsLoading) {
    return <LoadingSpinner />;
  }

  if (matchStatsError) {
    return <ErrorMessage message={matchStatsError} />;
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <div className="hero min-h-96 bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-secondary/30"></div>

        <div className="hero-content text-center text-white relative z-10">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
              <i className="fas fa-crown mr-4 text-yellow-300"></i>
              Age of Empires II Statistics
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
              Comprehensive match analysis, player rankings, and civilization
              statistics for AoE2 competitive scene
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="stats stats-vertical lg:stats-horizontal shadow-2xl bg-black/20 backdrop-blur-sm border border-white/10">
                <div className="stat">
                  <div className="stat-title text-white/70">Total Matches</div>
                  <div className="stat-value text-white">
                    {matchStats?.overview?.totalMatches
                      ? formatNumber(matchStats.overview.totalMatches)
                      : "---"}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title text-white/70">Average ELO</div>
                  <div className="stat-value text-white">
                    {matchStats?.overview?.averages?.avgElo
                      ? Math.round(matchStats.overview.averages.avgElo)
                      : "---"}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title text-white/70">Active Players</div>
                  <div className="stat-value text-white">
                    {trends?.trends?.length > 0
                      ? formatNumber(
                          trends.trends.reduce(
                            (sum, day) => sum + day.totalPlayers,
                            0
                          )
                        )
                      : "---"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="container mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-primary">
                    {matchStats?.overview?.totalMatches
                      ? formatNumber(matchStats.overview.totalMatches)
                      : "1,111,073"}
                  </h3>
                  <p className="text-base-content/70">Total Matches</p>
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
                    {matchStats?.overview?.averages?.avgElo
                      ? Math.round(matchStats.overview.averages.avgElo)
                      : "1,200"}
                  </h3>
                  <p className="text-base-content/70">Average ELO</p>
                </div>
                <div className="text-3xl text-secondary">
                  <i className="fas fa-trophy"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-accent">
                    {matchStats?.overview?.averages?.avgDuration
                      ? Math.round(
                          matchStats.overview.averages.avgDuration / 60
                        )
                      : "35"}
                    m
                  </h3>
                  <p className="text-base-content/70">Avg Duration</p>
                </div>
                <div className="text-3xl text-accent">
                  <i className="fas fa-clock"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-info">
                    {leaderboardStats?.leaderboards?.length || "5"}
                  </h3>
                  <p className="text-base-content/70">Leaderboards</p>
                </div>
                <div className="text-3xl text-info">
                  <i className="fas fa-list"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">
                  <i className="fas fa-chart-line mr-2 text-primary"></i>
                  Recent Activity
                </h2>
                {trends?.activity && trends.activity.length > 0 ? (
                  <div className="space-y-3">
                    {trends.activity.slice(0, 7).map((day, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-base-100 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium">{day.date}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-base-content/70">
                            {formatNumber(day.matches)} matches
                          </span>
                          <span className="badge badge-primary">
                            {day.avgElo} avg ELO
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    <i className="fas fa-chart-line text-4xl mb-4"></i>
                    <p>Loading activity data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Leaderboards */}
          <div>
            <div className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">
                  <i className="fas fa-trophy mr-2 text-secondary"></i>
                  Leaderboards
                </h2>
                {leaderboardStats?.leaderboards &&
                leaderboardStats.leaderboards.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboardStats.leaderboards
                      .slice(0, 5)
                      .map((lb, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                        >
                          <div>
                            <h3 className="font-semibold">
                              {lb.name || `Leaderboard ${lb.id}`}
                            </h3>
                            <p className="text-sm text-base-content/70">
                              {formatNumber(lb.totalMatches)} matches
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {Math.round(lb.avgElo)}
                            </div>
                            <div className="text-xs text-base-content/50">
                              avg ELO
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    <i className="fas fa-trophy text-4xl mb-4"></i>
                    <p>Loading leaderboards...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Popular Maps */}
        <div className="card bg-base-200 shadow-xl border border-base-300 mb-12">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <i className="fas fa-map mr-2 text-accent"></i>
              Popular Maps
            </h2>
            {matchStats?.distributions?.maps &&
            matchStats.distributions.maps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {matchStats.distributions.maps
                  .slice(0, 10)
                  .map((map, index) => (
                    <div
                      key={index}
                      className="bg-base-100 p-4 rounded-lg border border-base-300 hover:border-accent transition-colors"
                    >
                      <h3 className="font-semibold text-center mb-2">
                        {map._id || "Unknown"}
                      </h3>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">
                          {formatNumber(map.count)}
                        </div>
                        <div className="text-sm text-base-content/70">
                          matches
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <i className="fas fa-map text-4xl mb-4"></i>
                <p>Loading map data...</p>
              </div>
            )}
          </div>
        </div>

        {/* Popular Civilizations */}
        <div className="card bg-base-200 shadow-xl border border-base-300 mb-12">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <i className="fas fa-flag mr-2 text-secondary"></i>
              Popular Civilizations
            </h2>
            {matchStats?.distributions?.civilizations &&
            matchStats.distributions.civilizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {matchStats.distributions.civilizations
                  .slice(0, 10)
                  .map((civ, index) => (
                    <div
                      key={index}
                      className="bg-base-100 p-4 rounded-lg border border-base-300 hover:border-secondary transition-colors cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/civs/${civ._id.toLowerCase()}`)
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-center">{civ._id}</h3>
                        <div className="badge badge-secondary badge-sm">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary">
                          {formatNumber(civ.count)}
                        </div>
                        <div className="text-sm text-base-content/70">
                          picks
                        </div>
                        {civ.winRate && (
                          <div className="mt-1">
                            <div className="text-sm font-medium text-success">
                              {(civ.winRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-base-content/70">
                              win rate
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <i className="fas fa-flag text-4xl mb-4"></i>
                <p>Loading civilization data...</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 shadow-xl mb-12">
          <div className="card-body text-center">
            <h2 className="card-title text-2xl justify-center mb-6">
              <i className="fas fa-rocket mr-2"></i>
              Explore AoE Stats
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Dive deep into Age of Empires II statistics with comprehensive
              match analysis, player profiles, and civilization performance
              data.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => (window.location.href = "/matches")}
              >
                <i className="fas fa-search mr-2"></i>
                Browse Matches
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => (window.location.href = "/civs")}
              >
                <i className="fas fa-flag mr-2"></i>
                Civilization Stats
              </button>
              <button
                className="btn btn-accent btn-lg"
                onClick={() => (window.location.href = "/players")}
              >
                <i className="fas fa-users mr-2"></i>
                Player Rankings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
