// pages/InsightsPage.jsx - Fixed with Real Data and Proper Analytics
import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useCivilizationStats } from '../hooks/useApi';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import CivIcon from '../components/Common/CivIcon';
import { formatPercentage, formatNumber } from '../utils/formatters';

// Simple color scheme
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

const InsightsPage = () => {
  const { data, loading, error, refetch } = useCivilizationStats({});

  // Process civilization data with safe fallbacks
  const processedData = useMemo(() => {
    if (!data?.civilizations) return [];
    
    return data.civilizations
      .map(civ => {
        // Safe data extraction with proper fallbacks
        const winRate = (civ.winRate ?? civ.stats?.winRate ?? 0) * 100;
        const playRate = (civ.playRate ?? civ.stats?.playRate ?? 0) * 100;
        const totalMatches = civ.totalMatches ?? civ.totalPicks ?? 0;
        const avgRating = civ.avgRating ?? civ.stats?.avgRating ?? 1200;
        
        return {
          name: civ.name || civ.civilization || 'Unknown',
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
          playRate: Math.round(playRate * 10) / 10, // Round to 1 decimal
          totalMatches,
          avgRating: Math.round(avgRating),
          civilization: civ.civilization || civ.name?.toLowerCase() || 'unknown'
        };
      })
      .filter(civ => civ.name !== 'Unknown' && civ.totalMatches > 0)
      .sort((a, b) => b.winRate - a.winRate); // Sort by win rate descending
  }, [data]);

  // Real analytics based on actual data
  const analytics = useMemo(() => {
    if (processedData.length === 0) return null;

    const totalMatches = processedData.reduce((sum, civ) => sum + civ.totalMatches, 0);
    const avgWinRate = processedData.reduce((sum, civ) => sum + civ.winRate, 0) / processedData.length;

    // Real classifications based on actual thresholds
    const topPerformers = processedData.filter(civ => civ.winRate >= 52); // Win rate 52%+
    const underPerformers = processedData.filter(civ => civ.winRate <= 48); // Win rate 48%-
    const balanced = processedData.filter(civ => civ.winRate > 48 && civ.winRate < 52); // Between 48-52%
    
    // Hidden gems: good win rate but low play rate
    const hiddenGems = processedData.filter(civ => civ.winRate >= 50 && civ.playRate <= 3);
    
    // Popular picks: high play rate regardless of win rate
    const popularPicks = processedData.filter(civ => civ.playRate >= 5);

    return {
      totalMatches,
      avgWinRate: Math.round(avgWinRate * 10) / 10,
      topPerformers,
      underPerformers,
      balanced,
      hiddenGems,
      popularPicks,
      civilizationCount: processedData.length
    };
  }, [processedData]);

  if (loading) return <LoadingSpinner text="Loading civilization insights..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (processedData.length === 0) return <ErrorMessage message="No civilization data available" onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Civilization Insights</h1>
        <p className="text-lg text-base-content/70">
          Performance analysis and trends for Age of Empires II civilizations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat bg-gradient-to-br from-success/20 to-success/5 rounded-lg shadow-lg">
          <div className="stat-figure text-success">
            <i className="fas fa-trophy text-3xl" />
          </div>
          <div className="stat-title">Top Performers</div>
          <div className="stat-value text-success">{analytics?.topPerformers.length || 0}</div>
          <div className="stat-desc">Win rate ≥ 52%</div>
        </div>

        <div className="stat bg-gradient-to-br from-info/20 to-info/5 rounded-lg shadow-lg">
          <div className="stat-figure text-info">
            <i className="fas fa-gem text-3xl" />
          </div>
          <div className="stat-title">Hidden Gems</div>
          <div className="stat-value text-info">{analytics?.hiddenGems.length || 0}</div>
          <div className="stat-desc">Strong but unpopular</div>
        </div>

        <div className="stat bg-gradient-to-br from-warning/20 to-warning/5 rounded-lg shadow-lg">
          <div className="stat-figure text-warning">
            <i className="fas fa-balance-scale text-3xl" />
          </div>
          <div className="stat-title">Balanced</div>
          <div className="stat-value text-warning">{analytics?.balanced.length || 0}</div>
          <div className="stat-desc">Win rate 48-52%</div>
        </div>

        <div className="stat bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg shadow-lg">
          <div className="stat-figure text-primary">
            <i className="fas fa-star text-3xl" />
          </div>
          <div className="stat-title">Popular Picks</div>
          <div className="stat-value text-primary">{analytics?.popularPicks.length || 0}</div>
          <div className="stat-desc">Pick rate ≥ 5%</div>
        </div>
      </div>

      {/* Win Rate vs Pick Rate Scatter Plot */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-chart-scatter mr-2 text-primary" />
            Win Rate vs Pick Rate Analysis
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={processedData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="playRate" 
                  name="Pick Rate"
                  type="number"
                  domain={[0, 'dataMax + 1']}
                  label={{ value: 'Pick Rate (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  dataKey="winRate" 
                  name="Win Rate"
                  type="number"
                  domain={['dataMin - 2', 'dataMax + 2']}
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-base-100 p-3 rounded shadow-lg border">
                          <div className="flex items-center space-x-2 mb-2">
                            <CivIcon civName={data.civilization} size="sm" />
                            <span className="font-bold">{data.name}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>Win Rate: <span className="font-bold text-success">{data.winRate}%</span></div>
                            <div>Pick Rate: <span className="font-bold text-info">{data.playRate}%</span></div>
                            <div>Matches: <span className="font-bold">{data.totalMatches.toLocaleString()}</span></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  dataKey="winRate" 
                  fill="#3b82f6"
                  fillOpacity={0.7}
                  stroke="#1e40af"
                  strokeWidth={1}
                  r={6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <h4 className="font-semibold text-success mb-2">Top-Right Quadrant (Ideal)</h4>
              <p className="text-base-content/70">High win rate + reasonable pick rate = well-balanced civilizations</p>
            </div>
            <div>
              <h4 className="font-semibold text-info mb-2">Top-Left Quadrant (Hidden Gems)</h4>
              <p className="text-base-content/70">High win rate + low pick rate = undervalued civilizations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Performers */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title mb-4">
              <i className="fas fa-trophy mr-2 text-success" />
              Top Performers (52%+ Win Rate)
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {analytics?.topPerformers.slice(0, 10).map((civ, index) => (
                <div key={civ.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="badge badge-success">{index + 1}</span>
                    <CivIcon civName={civ.civilization} size="sm" />
                    <span className="font-medium">{civ.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-success font-bold">{civ.winRate}%</div>
                    <div className="text-base-content/60">{civ.playRate}% pick</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden Gems */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title mb-4">
              <i className="fas fa-gem mr-2 text-info" />
              Hidden Gems (Strong but Unpopular)
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {analytics?.hiddenGems.slice(0, 10).map((civ, index) => (
                <div key={civ.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="badge badge-info">{index + 1}</span>
                    <CivIcon civName={civ.civilization} size="sm" />
                    <span className="font-medium">{civ.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-info font-bold">{civ.winRate}%</div>
                    <div className="text-base-content/60">{civ.playRate}% pick</div>
                  </div>
                </div>
              ))}
            </div>
            {analytics?.hiddenGems.length === 0 && (
              <p className="text-base-content/60 text-center py-4">
                No hidden gems found with current criteria
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Win Rate Distribution */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <i className="fas fa-chart-bar mr-2 text-secondary" />
            Win Rate Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={processedData.slice(0, 15)} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, 'Win Rate']}
                  labelFormatter={(label) => `Civilization: ${label}`}
                />
                <Bar 
                  dataKey="winRate" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="alert alert-info">
        <div>
          <i className="fas fa-info-circle mr-2" />
          <div>
            <h4 className="font-bold">Analysis Summary</h4>
            <p className="text-sm">
              Analyzed <strong>{analytics?.civilizationCount}</strong> civilizations from{' '}
              <strong>{formatNumber(analytics?.totalMatches || 0)}</strong> total matches.
              Average win rate across all civilizations: <strong>{analytics?.avgWinRate}%</strong>.
              Data reflects current competitive meta and updates automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;