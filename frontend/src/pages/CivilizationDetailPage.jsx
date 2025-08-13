import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { useCivilizationDetail } from "../hooks/useApi";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import ErrorMessage from "../components/Common/ErrorMessage";
import {
  formatPercentage,
  formatNumber,
  formatCivilization,
} from "../utils/formatters";

export default function CivilizationDetailPage() {
  const { civName = "" } = useParams();
  const { data, loading, error, refetch } = useCivilizationDetail(civName);

  if (loading) return <LoadingSpinner text={`Loading ${civName}…`} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data?.stats) return <p className="p-4">No data for "{civName}"</p>;

  const {
    stats,
    ageUpTimes,
    winRateVsGameLength = [],
    winRateByPatch = [],
    winRateByRating = [],
    rankByPatch = [],
    bestVs,
    worstVs,
    bestAgainst,
    worstAgainst,
    maps = [],
  } = data;

  const bestMatchups = bestVs || bestAgainst || [];
  const worstMatchups = worstVs || worstAgainst || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <i className="fas fa-shield-alt mr-3 text-primary"></i>
          {formatCivilization(civName)}
        </h1>
        <p className="text-lg text-base-content/70">
          Detailed performance analysis and statistics
        </p>
      </div>

      {/* Top-level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-primary">
            <i className="fas fa-trophy text-3xl"></i>
          </div>
          <div className="stat-title">Win Rate</div>
          <div className="stat-value text-primary">
            {formatPercentage(stats.winRate)}
          </div>
          <div className="stat-desc">
            {formatNumber(stats.wins)} wins / {formatNumber(stats.totalPicks)}{" "}
            games
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-secondary">
            <i className="fas fa-chart-line text-3xl"></i>
          </div>
          <div className="stat-title">Pick Rate</div>
          <div className="stat-value text-secondary">
            {stats.pickRate?.toFixed(1)}%
          </div>
          <div className="stat-desc">
            {formatNumber(stats.totalPicks)} total picks
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-accent">
            <i className="fas fa-star text-3xl"></i>
          </div>
          <div className="stat-title">Average ELO</div>
          <div className="stat-value text-accent">{stats.avgRating}</div>
          <div className="stat-desc">
            {formatNumber(stats.uniquePlayers)} unique players
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-info">
            <i className="fas fa-clock text-3xl"></i>
          </div>
          <div className="stat-title">Avg Duration</div>
          <div className="stat-value text-info">
            {stats.avgDurationMinutes}m
          </div>
          <div className="stat-desc">Game length</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {winRateVsGameLength.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Win Rate vs Game Length</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={winRateVsGameLength}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="civWin"
                    name={formatCivilization(civName)}
                    stroke="#3b82f6"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWin"
                    name="Average"
                    stroke="#ef4444"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {winRateByPatch.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Win Rate by Patch</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={winRateByPatch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="patch" />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="civWin"
                    name={formatCivilization(civName)}
                    stroke="#3b82f6"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWin"
                    name="Average"
                    stroke="#ef4444"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {winRateByRating.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Win Rate by Rating</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={winRateByRating}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                  <Bar
                    dataKey="civWin"
                    name={formatCivilization(civName)}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rankByPatch.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Rank by Patch</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={rankByPatch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="patch" />
                  <YAxis reversed domain={[1, "dataMax"]} />
                  <Tooltip formatter={(v) => [`#${v}`, "Rank"]} />
                  <Line
                    type="monotone"
                    dataKey="civRank"
                    name="Rank"
                    stroke="#10b981"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Win Rate vs Game Duration - ADD THIS */}
        {data.winRateVsDuration && data.winRateVsDuration.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Win Rate vs Game Duration</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.winRateVsDuration}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="duration"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${(value * 100).toFixed(1)}%`,
                      name === "civWinRate"
                        ? formatCivilization(civName)
                        : "Average",
                    ]}
                    labelFormatter={(label) => `Duration: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="civWinRate"
                    name={formatCivilization(civName)}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="overallWinRate"
                    name="Average (All Civs)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Additional info below the chart */}
              <div className="mt-4 text-sm text-base-content/70">
                <p>
                  <i className="fas fa-info-circle mr-2"></i>
                  This chart shows how {formatCivilization(civName)} performs in
                  games of different lengths compared to the average.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {data.winRateVsDuration.map(
                    (bucket, index) =>
                      bucket.games > 0 && (
                        <div
                          key={index}
                          className="bg-base-100 p-2 rounded text-xs"
                        >
                          <div className="font-medium">{bucket.duration}</div>
                          <div>{bucket.games} games</div>
                          <div
                            className={
                              bucket.civWinRate > bucket.overallWinRate
                                ? "text-success"
                                : "text-error"
                            }
                          >
                            {bucket.civWinRate > bucket.overallWinRate
                              ? "+"
                              : ""}
                            {(
                              (bucket.civWinRate - bucket.overallWinRate) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Best/Worst Matchups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { title: "Highest Win Rates Against", rows: bestMatchups },
          { title: "Lowest Win Rates Against", rows: worstMatchups },
        ].map(({ title, rows }) => (
          <div key={title} className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">{title}</h3>
              {rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Civilization</th>
                        <th>Games</th>
                        <th>Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.civ}>
                          <td>
                            <Link
                              to={`/civs/${r.civ.toLowerCase()}`}
                              className="link link-primary hover:link-secondary"
                            >
                              {formatCivilization(r.civ)}
                            </Link>
                          </td>
                          <td>{formatNumber(r.games)}</td>
                          <td>
                            <span
                              className={
                                r.winRate > 50 ? "text-success" : "text-error"
                              }
                            >
                              {typeof r.winRate === "number"
                                ? `${r.winRate.toFixed(1)}%`
                                : formatPercentage(r.winRate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-base-content/60">
                  <i className="fas fa-chart-bar text-4xl mb-4"></i>
                  <p>No matchup data available</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Map Performance */}
      {maps.length > 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Map Performance</h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Map</th>
                    <th>Picks</th>
                    <th>Play Rate</th>
                    <th>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {maps.map((m) => (
                    <tr key={m.slug || m.map}>
                      <td className="flex items-center space-x-2">
                        {m.imgUrl && (
                          <img
                            src={m.imgUrl}
                            alt={m.map}
                            className="w-6 h-6 rounded"
                          />
                        )}
                        <Link
                          to={`/maps/${
                            m.slug || m.map.toLowerCase().replace(/\s+/g, "-")
                          }`}
                          className="link link-primary hover:link-secondary"
                        >
                          {m.map}
                        </Link>
                      </td>
                      <td>{formatNumber(m.picks)}</td>
                      <td>{formatPercentage(m.playRate)}</td>
                      <td>
                        <span
                          className={
                            m.winRate > 0.5 ? "text-success" : "text-error"
                          }
                        >
                          {formatPercentage(m.winRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Average Age Up Times */}
      {ageUpTimes &&
        (ageUpTimes.feudal > 0 ||
          ageUpTimes.castle > 0 ||
          ageUpTimes.imperial > 0) && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <i className="fas fa-clock mr-2"></i>
                Average Age Up Times
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ageUpTimes.feudal > 0 && (
                  <div className="stat bg-base-100 rounded-lg">
                    <div className="stat-figure text-warning">
                      <i className="fas fa-home text-2xl"></i>
                    </div>
                    <div className="stat-title">Feudal Age</div>
                    <div className="stat-value text-warning">
                      {Math.floor(ageUpTimes.feudal / 60)}:
                      {String(ageUpTimes.feudal % 60).padStart(2, "0")}
                    </div>
                  </div>
                )}
                {ageUpTimes.castle > 0 && (
                  <div className="stat bg-base-100 rounded-lg">
                    <div className="stat-figure text-info">
                      <i className="fas fa-fort-awesome text-2xl"></i>
                    </div>
                    <div className="stat-title">Castle Age</div>
                    <div className="stat-value text-info">
                      {Math.floor(ageUpTimes.castle / 60)}:
                      {String(ageUpTimes.castle % 60).padStart(2, "0")}
                    </div>
                  </div>
                )}
                {ageUpTimes.imperial > 0 && (
                  <div className="stat bg-base-100 rounded-lg">
                    <div className="stat-figure text-success">
                      <i className="fas fa-crown text-2xl"></i>
                    </div>
                    <div className="stat-title">Imperial Age</div>
                    <div className="stat-value text-success">
                      {Math.floor(ageUpTimes.imperial / 60)}:
                      {String(ageUpTimes.imperial % 60).padStart(2, "0")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
