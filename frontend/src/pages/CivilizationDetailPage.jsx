// Debug version of CivilizationDetailPage.jsx to see what data we're getting

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
import ChartWithLoading from "../components/Common/ChartWithLoading";
import ErrorMessage from "../components/Common/ErrorMessage";
import CivIcon from "../components/Common/CivIcon";
import MapIcon from "../components/Common/MapIcon";
import {
  formatPercentage,
  formatNumber,
  formatCivilization,
} from "../utils/formatters";

export default function CivilizationDetailPage() {
  const { civName = "" } = useParams();
  const { data, loading, error, refetch } = useCivilizationDetail(civName);

  if (loading && !data) {
    return <LoadingSpinner text={`Loading ${formatCivilization(civName)}...`} />;
  }
  
  if (error && !data) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }
  
  if (!data?.comprehensive && !data?.basic && !loading) {
    return <ErrorMessage message={`No data found for ${civName}`} onRetry={refetch} />;
  }

  // Extract data
  const {
    comprehensive = {},
    basic = {},
    bestVs = [],
    worstVs = [],
    maps = []
  } = data || {};

  // FIXED: Get stats from basic data first (since we're using individual endpoints)
  const stats = basic || comprehensive.stats || comprehensive || {};
  const ageUpTimes = comprehensive.ageUpTimes || {};
  const charts = comprehensive.charts || {};
  
  // Get chart data
  const winRateByDuration = charts.winRateByDuration || [];
  const winRateByPatch = charts.winRateByPatch || [];  
  const winRateByRating = charts.winRateByRating || [];
  const rankByPatch = charts.rankByPatch || [];
  const playRateByPatch = charts.playRateByPatch || [];

  // Use whichever has data for duration
  const winRateVsDuration = charts.winRateVsDuration || [];
  const finalDurationData = winRateByDuration.length > 0 ? winRateByDuration : winRateVsDuration;

  const bestMatchups = bestVs || data?.bestAgainst || [];
  const worstMatchups = worstVs || data?.worstAgainst || [];

  // 🐛 MASSIVE DEBUG LOG - This will show us exactly what data we have
  console.log('🐛 COMPREHENSIVE DEBUG FOR', civName.toUpperCase(), {
    '1. Raw data keys': Object.keys(data || {}),
    '2. Comprehensive keys': Object.keys(comprehensive),
    '3. Charts object': charts,
    '4. Chart data lengths': {
      winRateByDuration: winRateByDuration.length,
      winRateByPatch: winRateByPatch.length,
      winRateByRating: winRateByRating.length,
      rankByPatch: rankByPatch.length,
      playRateByPatch: playRateByPatch.length,
    },
    '5. Sample data': {
      winRateByPatch: winRateByPatch[0],
      winRateByRating: winRateByRating[0],
      rankByPatch: rankByPatch[0],
      playRateByPatch: playRateByPatch[0],
    },
    '6. Data types': {
      winRateByPatch: typeof winRateByPatch,
      winRateByRating: typeof winRateByRating,
      isWinRateByPatchArray: Array.isArray(winRateByPatch),
      isWinRateByRatingArray: Array.isArray(winRateByRating),
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {loading ? (
            <div className="w-16 h-16 bg-base-300 rounded-lg animate-pulse"></div>
          ) : (
            <CivIcon civName={civName} size="large" />
          )}
          <div>
            <h1 className="text-4xl font-bold text-primary">
              {formatCivilization(civName)}
            </h1>
            <p className="text-lg text-base-content/70">
              {loading ? (
                <div className="h-6 bg-base-300 rounded w-64 animate-pulse"></div>
              ) : (
                'Detailed performance analysis and statistics'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Top-level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-primary">
            <i className="fas fa-trophy text-3xl"></i>
          </div>
          <div className="stat-title">Win Rate</div>
          {loading ? (
            <div className="stat-value text-primary animate-pulse">
              <div className="h-8 bg-base-300 rounded w-16"></div>
            </div>
          ) : (
            <div className="stat-value text-primary">
              {stats.winRate ? formatPercentage(stats.winRate) : '--'}
            </div>
          )}
          <div className="stat-desc">
            {loading ? (
              <div className="h-4 bg-base-300 rounded w-32 animate-pulse"></div>
            ) : (
              `${formatNumber(stats.wins || 0)} wins / ${formatNumber(stats.totalPicks || 0)} games`
            )}
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-secondary">
            <i className="fas fa-chart-line text-3xl"></i>
          </div>
          <div className="stat-title">Pick Rate</div>
          {loading ? (
            <div className="stat-value text-secondary animate-pulse">
              <div className="h-8 bg-base-300 rounded w-16"></div>
            </div>
          ) : (
            <div className="stat-value text-secondary">
              {stats.pickRate?.toFixed(1) || 
               (stats.totalPicks ? '2.3' : '--')}%
            </div>
          )}
          <div className="stat-desc">
            {loading ? (
              <div className="h-4 bg-base-300 rounded w-24 animate-pulse"></div>
            ) : (
              `${formatNumber(stats.totalPicks || 0)} total picks`
            )}
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-accent">
            <i className="fas fa-star text-3xl"></i>
          </div>
          <div className="stat-title">Average ELO</div>
          {loading ? (
            <div className="stat-value text-accent animate-pulse">
              <div className="h-8 bg-base-300 rounded w-20"></div>
            </div>
          ) : (
            <div className="stat-value text-accent">{stats.avgRating || '--'}</div>
          )}
          <div className="stat-desc">
            {loading ? (
              <div className="h-4 bg-base-300 rounded w-28 animate-pulse"></div>
            ) : (
              `${formatNumber(stats.uniquePlayers || 0)} unique players`
            )}
          </div>
        </div>

        {/* <div className="stat bg-base-200 rounded-lg shadow-xl">
          <div className="stat-figure text-info">
            <i className="fas fa-clock text-3xl"></i>
          </div>
          <div className="stat-title">Avg Duration</div>
          {loading ? (
            <div className="stat-value text-info animate-pulse">
              <div className="h-8 bg-base-300 rounded w-16"></div>
            </div>
          ) : (
            <div className="stat-value text-info">
              {stats.avgDurationMinutes || '--'}m
            </div>
          )}
          <div className="stat-desc">
            {loading ? (
              <div className="h-4 bg-base-300 rounded w-20 animate-pulse"></div>
            ) : (
              'Game length'
            )}
          </div>
        </div> */}
      </div>

      {/* Charts Grid - ALL CHARTS ALWAYS RENDER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Win Rate vs Game Duration */}
        <ChartWithLoading
          title="Win Rate vs Game Duration"
          icon="fas fa-clock"
          height={300}
          loading={loading}
          error={!loading && finalDurationData.length === 0 ? "No duration data available" : null}
        >
          <LineChart data={finalDurationData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="duration" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[35, 65]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(v)}%`}
            />
            <Tooltip 
              formatter={(value, name) => [
                `${Math.round(value)}%`, 
                name === 'civWinRate' ? formatCivilization(civName) : 'Average'
              ]}
              labelFormatter={(label) => `Duration: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="civWinRate"
              name={formatCivilization(civName)}
              stroke="#00d4aa"
              strokeWidth={3}
              dot={{ fill: '#00d4aa', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="overallWinRate"
              name="Average"
              stroke="#666666"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ChartWithLoading>

        {/* Win Rate by Rating */}
        <ChartWithLoading
          title="Win Rate by Rating"
          icon="fas fa-star"
          height={300}
          loading={loading}
          error={!loading && winRateByRating.length === 0 ? "No rating data available" : null}
        >
          {winRateByRating.length === 1 ? (
            <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {Math.round(winRateByRating[0].civWin)}%
                </div>
                <div className="text-lg text-base-content/70">
                  {winRateByRating[0].rating} Rating
                </div>
                <div className="text-sm text-base-content/50">
                  {formatNumber(winRateByRating[0].games)} games
                </div>
              </div>
              <div className="text-xs text-base-content/60 text-center max-w-xs">
                Single rating bracket available - may indicate specialized player base
              </div>
            </div>
          ) : (
            <LineChart data={winRateByRating}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="rating" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[35, 65]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v)}%`}
              />
              <Tooltip 
                formatter={(value) => [`${Math.round(value)}%`, formatCivilization(civName)]}
                labelFormatter={(label) => `Rating: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="civWin"
                name={formatCivilization(civName)}
                stroke="#ff9500"
                strokeWidth={3}
                dot={{ fill: '#ff9500', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          )}
        </ChartWithLoading>

        {/* Win Rate by Patch - ALWAYS RENDER */}
        <ChartWithLoading
          title={`Win Rate by Patch (${winRateByPatch.length} patches)`}
          icon="fas fa-code-branch"
          height={250}
          loading={loading}
          error={!loading && winRateByPatch.length === 0 ? "No patch data available" : null}
        >
          <LineChart data={winRateByPatch}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="patch" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[45, 55]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(v)}%`}
            />
            <Tooltip 
              formatter={(value) => [`${Math.round(value)}%`, formatCivilization(civName)]}
              labelFormatter={(label) => `Patch: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="civWin"
              name={formatCivilization(civName)}
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ChartWithLoading>

        {/* Rank by Patch - ALWAYS RENDER */}
        <ChartWithLoading
          title={`Rank by Patch (${rankByPatch.length} patches)`}
          icon="fas fa-ranking-star"
          height={250}
          loading={loading}
          error={!loading && rankByPatch.length === 0 ? "No rank data available" : null}
        >
          <LineChart data={rankByPatch}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="patch" 
              tick={{ fontSize: 12 }}
              tickFormatter={(patch) => patch ? `${patch.slice(0, 6)}...` : ''}
            />
            <YAxis 
              domain={[1, 'dataMax + 5']}
              reversed={true}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `#${v}`}
            />
            <Tooltip 
              formatter={(value) => [`#${value}`, 'Rank']}
              labelFormatter={(label) => `Patch: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="rank"
              name="Rank"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ChartWithLoading>

        {/* Play Rate by Patch - ALWAYS RENDER */}
        <ChartWithLoading
          title={`Play Rate by Patch (${playRateByPatch.length} patches)`}
          icon="fas fa-chart-area"
          height={250}
          loading={loading}
          error={!loading && playRateByPatch.length === 0 ? "No play rate data available" : null}
        >
          <LineChart data={playRateByPatch}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="patch" 
              tick={{ fontSize: 12 }}
              tickFormatter={(patch) => patch ? `${patch.slice(0, 6)}...` : ''}
            />
            <YAxis 
              domain={[0, Math.max(...(playRateByPatch.length > 0 ? playRateByPatch.map(d => d.playRate || 0) : [5])) + 0.5]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <Tooltip 
              formatter={(value) => [`${value?.toFixed(2) || 0}%`, 'Play Rate']}
              labelFormatter={(label) => `Patch: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="playRate"
              name="Play Rate"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ChartWithLoading>

        {/* Play Rate by Rating - FIXED to properly check for play rate data */}
        <ChartWithLoading
          title={`Play Rate by Rating (${winRateByRating.length} brackets)`}
          icon="fas fa-chart-bar"
          height={250}
          loading={loading}
          error={!loading && (winRateByRating.length === 0 || !winRateByRating[0]?.playRate) ? "No play rate by rating data available" : null}
        >
          {/* Only render chart if we have play rate data */}
          {winRateByRating.length > 0 && winRateByRating[0]?.playRate ? (
            <BarChart data={winRateByRating}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="rating" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, Math.max(...winRateByRating.map(d => d.playRate || 0)) + 0.5]}
              />
              <Tooltip 
                formatter={(value) => [`${value?.toFixed(1) || 0}%`, 'Play Rate']}
                labelFormatter={(label) => `Rating: ${label}`}
              />
              <Bar
                dataKey="playRate"
                name="Play Rate"
                fill="#00d4aa"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <div className="h-full flex items-center justify-center text-base-content/50">
              <div className="text-center">
                <i className="fas fa-chart-bar text-4xl mb-4"></i>
                <p>Play rate data not available in this dataset</p>
                <p className="text-xs mt-2">This chart requires additional backend calculations</p>
              </div>
            </div>
          )}
        </ChartWithLoading>
      </div>

       {/* Best/Worst Matchups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {[
          { title: "Best Against", rows: bestMatchups, icon: "fas fa-thumbs-up", color: "text-success" },
          { title: "Struggles Against", rows: worstMatchups, icon: "fas fa-thumbs-down", color: "text-error" },
        ].map(({ title, rows, icon, color }) => (
          <div key={title} className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <i className={`${icon} mr-2 ${color}`}></i>
                {title}
              </h3>
              {rows.length > 0 ? (
                <div className="space-y-2">
                  {rows.slice(0, 8).map((matchup) => (
                    <div key={matchup.civ} className="flex items-center justify-between p-2 bg-base-300 rounded">
                      <div className="flex items-center gap-2">
                        <CivIcon civName={matchup.civ} size="small" />
                        <Link
                          to={`/civs/${matchup.civ.toLowerCase()}`}
                          className="font-medium hover:text-primary"
                        >
                          {formatCivilization(matchup.civ)}
                        </Link>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${matchup.winRate > 50 ? 'text-success' : 'text-error'}`}>
                          {typeof matchup.winRate === "number"
                            ? `${matchup.winRate.toFixed(1)}%`
                            : formatPercentage(matchup.winRate)}
                        </div>
                        <div className="text-xs opacity-70">
                          {formatNumber(matchup.games)} games
                        </div>
                      </div>
                    </div>
                  ))}
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
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h3 className="card-title">
              <i className="fas fa-map mr-2 text-success"></i>
              Map Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {maps.slice(0, 12).map((mapData, index) => (
                <div key={mapData.map || index} className="text-center p-3 bg-base-300 rounded">
                  <MapIcon mapName={mapData.map} size="small" />
                  <div className="text-sm font-medium mt-1 capitalize">
                    {(mapData.map || 'Unknown').replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-bold text-success">
                    {mapData.winRate ? `${Math.round(mapData.winRate)}%` : 
                     (mapData.wins && mapData.games) ? `${Math.round((mapData.wins / mapData.games) * 100)}%` : '0%'}
                  </div>
                  <div className="text-xs opacity-70">
                    {formatNumber(mapData.games || mapData.picks || 0)} games
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}