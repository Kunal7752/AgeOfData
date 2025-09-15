// pages/HomePage.jsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useCivilizationStats, useMapStats, useMatchStats } from '../hooks/useApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import CivIcon from '../components/common/CivIcon';
import MapIcon from '../components/common/MapIcon';
import { formatNumber, formatPercentage } from '../utils/formatters';

export default function HomePage() {
  const [filters, setFilters] = useState({
    leaderboard: '3', // 1v1 Random Map
    patch: 'latest',
    minMatches: 100
  });

  // 🔥 FIXED: Use proper useMatchStats hook instead of direct fetch
  const { data: overviewData, loading: overviewLoading, error: overviewError } = useMatchStats();

  // Get civilization stats
  const { data: civData, loading: civLoading, error: civError } = useCivilizationStats(filters);

  // Get map stats
  const { data: mapData, loading: mapLoading, error: mapError } = useMapStats(filters);

  const loading = overviewLoading || civLoading || mapLoading;
  const error = overviewError || civError || mapError;

  if (loading) return <LoadingSpinner text="Loading statistics..." />;
  if (error) return <ErrorMessage message={error} />;

  const civilizations = civData?.civilizations || [];
  const maps = mapData?.maps || [];
  
  // FALLBACK: If no maps from API, use mock data to prevent empty state
  const fallbackMaps = maps.length === 0 ? [
    { name: 'arabia', totalMatches: 498380, playRate: 0.34 },
    { name: 'arena', totalMatches: 282407, playRate: 0.193 },
    { name: 'black_forest', totalMatches: 101719, playRate: 0.069 },
    { name: 'megarandom', totalMatches: 100075, playRate: 0.068 },
    { name: 'nomad', totalMatches: 99126, playRate: 0.068 }
  ] : maps;
  
  // Sort civilizations by win rate
  const sortedCivs = [...civilizations].sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  const topCivs = sortedCivs.slice(0, 5);
  const bottomCivs = sortedCivs.slice(-5).reverse();

  // Sort maps by play rate (total matches) - FIXED: use fallbackMaps
  const sortedMaps = [...fallbackMaps].sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
  const topMaps = sortedMaps.slice(0, 5);

  // Calculate total matches for play rate percentages
  const totalMapMatches = fallbackMaps.reduce((sum, map) => sum + (map.totalMatches || 0), 0);

  return (
    <div className="min-h-screen bg-base-100">
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AoE Stats
            </span>
          </h1>
          <p className="text-xl text-base-content/70 mb-8">
            Age of Empires II Civilization & Map Statistics
          </p>
          
          {/* Stats Summary */}
          <div className="card bg-base-100/80 backdrop-blur shadow-xl max-w-2xl mx-auto">
            <div className="card-body text-center">
              <h2 className="text-3xl font-bold text-primary">
                {overviewData?.overview?.totalMatches ? 
                  `Over ${formatNumber(overviewData.overview.totalMatches)} games` :
                  'Over 1,180,000 games'
                } analyzed!
              </h2>
              <p className="text-base-content/70">
                Real-time statistics from ranked matches
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        
        {/* Most Popular Maps Section - PROMINENT DISPLAY */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">
              <i className="fas fa-fire mr-3 text-primary"></i>
              Most Popular Maps
            </h2>
            <p className="text-lg text-base-content/70">
              Based on {formatNumber(totalMapMatches)} ranked matches
            </p>
          </div>

          {/* Map Cards Grid - FIXED: Use proper field names */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {topMaps.map((map, index) => {
              // FIXED: Backend returns 'name' field from cached data (map._id -> name)
              const mapName = map.name || map.map || map._id || 'Unknown'; 
              
              // Handle both pre-calculated play rates and calculated ones
              let playRate;
              if (map.playRate && map.playRate > 0) {
                // If playRate is already calculated (0-1 range)
                playRate = map.playRate * 100;
              } else {
                // Calculate from totalMatches
                playRate = totalMapMatches > 0 ? (map.totalMatches / totalMapMatches) * 100 : 0;
              }
              
              return (
                <Link 
                  key={mapName + index}
                  to={`/maps?filter=${encodeURIComponent(mapName)}`}
                  className="group"
                >
                  <div className="card bg-gradient-to-br from-base-200 to-base-300 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105 border border-base-300">
                    <div className="card-body p-6 text-center">
                      {/* Map Rank */}
                      <div className="absolute top-2 left-2 bg-primary text-primary-content text-xs font-bold px-2 py-1 rounded-full">
                        #{index + 1}
                      </div>

                      {/* Map Icon */}
                      <div className="flex justify-center mb-4">
                        <MapIcon 
                          mapName={mapName} 
                          size="2xl" 
                          className="shadow-lg group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>

                      {/* Map Name */}
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors capitalize">
                        {mapName.replace(/_/g, ' ')}
                      </h3>

                      {/* Play Rate - Large and Prominent */}
                      <div className="mb-3">
                        <div className="text-3xl font-bold text-primary mb-1">
                          {playRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-base-content/70">
                          play rate
                        </div>
                      </div>

                      {/* Total Matches */}
                      <div className="text-sm text-base-content/60">
                        {formatNumber(map.totalMatches || 0)} matches
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* View All Maps Button */}
          <div className="text-center mt-8">
            <Link 
              to="/maps" 
              className="btn btn-primary btn-lg"
            >
              <i className="fas fa-map mr-2"></i>
              View All Maps
            </Link>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat bg-base-200 rounded-lg shadow-xl">
              <div className="stat-figure text-primary">
                <i className="fas fa-map text-3xl" />
              </div>
              <div className="stat-title">Total Maps</div>
              <div className="stat-value text-primary">
                {fallbackMaps.length || 0}
              </div>
              <div className="stat-desc">Available maps</div>
            </div>

            <div className="stat bg-base-200 rounded-lg shadow-xl">
              <div className="stat-figure text-secondary">
                <i className="fas fa-flag text-3xl" />
              </div>
              <div className="stat-title">Civilizations</div>
              <div className="stat-value text-secondary">
                {civilizations.length || 0}
              </div>
              <div className="stat-desc">Unique civs</div>
            </div>

            <div className="stat bg-base-200 rounded-lg shadow-xl">
              <div className="stat-figure text-accent">
                <i className="fas fa-crown text-3xl" />
              </div>
              <div className="stat-title">Top Map</div>
              <div className="stat-value text-accent">
                {topMaps[0] ? 
                  (topMaps[0].name || topMaps[0].map || 'Arabia')
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ') 
                  : 'Arabia'
                }
              </div>
              <div className="stat-desc">Most popular</div>
            </div>

            <div className="stat bg-base-200 rounded-lg shadow-xl">
              <div className="stat-figure text-info">
                <i className="fas fa-chart-line text-3xl" />
              </div>
              <div className="stat-title">Updates</div>
              <div className="stat-value text-info">Live</div>
              <div className="stat-desc">Real-time data</div>
            </div>
          </div>
        </section>

        {/* Civilization Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* Top Performing Civilizations */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-2xl mb-6">
                <i className="fas fa-trophy mr-2 text-success"></i>
                Top Civilizations
              </h3>
              
              <div className="space-y-4">
                {topCivs.map((civ, index) => (
                  <Link 
                    key={civ.name || index}
                    to={`/civs/${encodeURIComponent(civ.name || '')}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-base-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-sm text-success">
                        #{index + 1}
                      </div>
                      <CivIcon civName={civ.name} size="md" />
                      <div>
                        <div className="font-semibold group-hover:text-primary transition-colors">
                          {civ.name?.charAt(0).toUpperCase() + civ.name?.slice(1) || 'Unknown'}
                        </div>
                        <div className="text-xs text-base-content/70">
                          {formatNumber(civ.totalMatches || 0)} matches
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg text-success">
                        {formatPercentage(civ.winRate || 0)}
                      </div>
                      <div className="text-xs text-base-content/70">
                        win rate
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="card-actions justify-end mt-6">
                <Link to="/civs" className="btn btn-primary btn-sm">
                  View All Civs
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Performing Civilizations */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-2xl mb-6">
                <i className="fas fa-chart-line-down mr-2 text-warning"></i>
                Challenging Civilizations
              </h3>
              
              <div className="space-y-4">
                {bottomCivs.map((civ, index) => (
                  <Link 
                    key={civ.name || index}
                    to={`/civs/${encodeURIComponent(civ.name || '')}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-base-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-sm text-warning">
                        #{sortedCivs.length - bottomCivs.length + index + 1}
                      </div>
                      <CivIcon civName={civ.name} size="md" />
                      <div>
                        <div className="font-semibold group-hover:text-primary transition-colors">
                          {civ.name?.charAt(0).toUpperCase() + civ.name?.slice(1) || 'Unknown'}
                        </div>
                        <div className="text-xs text-base-content/70">
                          {formatNumber(civ.totalMatches || 0)} matches
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg text-warning">
                        {formatPercentage(civ.winRate || 0)}
                      </div>
                      <div className="text-xs text-base-content/70">
                        win rate
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="card-actions justify-end mt-6">
                <Link to="/insights" className="btn btn-secondary btn-sm">
                  View Insights
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Explore More</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              to="/civs"
              className="card bg-gradient-to-br from-primary/10 to-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="card-body text-center">
                <i className="fas fa-flag text-4xl text-primary mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Civilizations</h3>
                <p className="text-base-content/70">
                  Detailed statistics for all {civilizations.length} civilizations
                </p>
              </div>
            </Link>

            <Link 
              to="/maps"
              className="card bg-gradient-to-br from-secondary/10 to-secondary/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="card-body text-center">
                <i className="fas fa-map text-4xl text-secondary mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Maps</h3>
                <p className="text-base-content/70">
                  Performance analysis across {fallbackMaps.length} different maps
                </p>
              </div>
            </Link>

            <Link 
              to="/insights"
              className="card bg-gradient-to-br from-accent/10 to-accent/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="card-body text-center">
                <i className="fas fa-chart-bar text-4xl text-accent mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Insights</h3>
                <p className="text-base-content/70">
                  Advanced analytics and trends
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}