// pages/CivilizationsPage.jsx - Fixed version with proper error handling
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCivilizationStats } from '../hooks/useApi';
import {
  formatNumber,
  formatPercentage,
  formatCivilization
} from '../utils/formatters';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import CivIcon from '../components/Common/CivIcon';

const CivilizationsPage = () => {
  const navigate = useNavigate();

  // Remove filter parameters - just fetch all civilizations
  const { data, loading, error, refetch } = useCivilizationStats({});

  if (loading) return <LoadingSpinner text="Loading civilization statistics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  if (data?.error) {
    const fullMessage = `${data.error}${data.suggestion ? ' ' + data.suggestion : ''}`;
    return <ErrorMessage message={fullMessage} onRetry={refetch} />;
  }

  const civilizations = data?.civilizations || [];

  // Helper function to safely get civilization data with defaults
  const getCivData = (civ) => {
    if (!civ) return null;
    
    // Handle different possible data structures
    const stats = civ.stats || civ || {};
    
    return {
      name: civ.name || civ.civilization || 'Unknown',
      winRate: civ.winRate ?? stats.winRate ?? 0,
      playRate: civ.playRate ?? stats.playRate ?? 0,
      totalPicks: civ.totalPicks ?? stats.totalPicks ?? civ.totalMatches ?? 0,
      avgRating: civ.avgRating ?? stats.avgRating ?? 0,
      ageUpTimes: civ.ageUpTimes || {},
      civilization: civ.civilization || civ.name || 'unknown'
    };
  };

  // Filter out invalid civilization data and process
  const validCivilizations = civilizations
    .map(getCivData)
    .filter(civ => civ && civ.name !== 'Unknown');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center">
          Civilization Statistics
        </h1>
        <p className="text-lg text-base-content/70">
          Comprehensive performance analysis of all Age of Empires II civilizations
        </p>
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
              {data.meta.totalCivilizations || validCivilizations.length}
            </div>
            <div className="stat-desc">
              {data.meta.cached ? 'Cached data' : 'Live data'}
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-secondary">
              <i className="fas fa-sword text-3xl" />
            </div>
            <div className="stat-title">Total Matches</div>
            <div className="stat-value text-secondary">
              {data.meta.totalMatches ? formatNumber(data.meta.totalMatches) : 'N/A'}
            </div>
            <div className="stat-desc">
              Query time: {data.meta.queryTime || 'N/A'}
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow-xl">
            <div className="stat-figure text-accent">
              <i className="fas fa-chart-line text-3xl" />
            </div>
            <div className="stat-title">Average Win Rate</div>
            <div className="stat-value text-accent">
              {validCivilizations.length > 0 ? 
                formatPercentage(
                  validCivilizations.reduce((sum, civ) => sum + (civ.winRate || 0), 0) / 
                  validCivilizations.length
                ) : 'N/A'
              }
            </div>
            <div className="stat-desc">Across all civilizations</div>
          </div>
        </div>
      )}

      {/* Debug info when no data */}
      {validCivilizations.length === 0 && civilizations.length > 0 && (
        <div className="alert alert-warning mb-8">
          <div>
            <h3 className="font-bold">Data Processing Issue</h3>
            <div className="text-sm">
              <p>Received {civilizations.length} civilizations but could not process them.</p>
              <details className="mt-2">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="text-xs mt-2 bg-base-200 p-2 rounded overflow-auto">
                  {JSON.stringify(civilizations[0], null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Civilization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {validCivilizations
          .sort((a, b) => (b.winRate || 0) - (a.winRate || 0)) // Safe sorting
          .map((civ, index) => (
          <div
            key={civ.name}
            className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={() => navigate(`/civs/${civ.civilization.toLowerCase()}`)}
          >
            <div className="card-body p-6">
              {/* Header with Icon and Name */}
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <CivIcon 
                    civName={civ.civilization} 
                    size="lg" 
                    className="shadow-md" 
                  />
                </div>
                <div className="flex-1">
                  <h3 className="card-title text-lg font-bold">
                    {formatCivilization(civ.name)}
                  </h3>
                  <div className="text-sm text-base-content/70">
                    Rank #{index + 1}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Win Rate</span>
                  <div className="text-right">
                    <div className="font-bold text-success">
                      {formatPercentage(civ.winRate)}
                    </div>
                  </div>
                </div>

                {civ.playRate > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/70">Pick Rate</span>
                    <div className="text-right">
                      <div className="font-bold text-info">
                        {formatPercentage(civ.playRate)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Matches</span>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatNumber(civ.totalPicks)}
                    </div>
                  </div>
                </div>

                {civ.avgRating > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/70">Avg Rating</span>
                    <div className="text-right">
                      <div className="font-bold text-warning">
                        {Math.round(civ.avgRating)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Age Up Times (if available) */}
              {civ.ageUpTimes && (civ.ageUpTimes.feudal > 0 || civ.ageUpTimes.castle > 0 || civ.ageUpTimes.imperial > 0) && (
                <div className="mt-4">
                  <div className="text-sm text-base-content/70 mb-2">Age Up Times</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {civ.ageUpTimes.feudal > 0 && (
                      <div className="bg-base-200 p-2 rounded text-center">
                        <div className="text-base-content/70">Feudal</div>
                        <div className="font-bold">
                          {Math.floor(civ.ageUpTimes.feudal / 60)}:
                          {String(civ.ageUpTimes.feudal % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    {civ.ageUpTimes.castle > 0 && (
                      <div className="bg-base-200 p-2 rounded text-center">
                        <div className="text-base-content/70">Castle</div>
                        <div className="font-bold">
                          {Math.floor(civ.ageUpTimes.castle / 60)}:
                          {String(civ.ageUpTimes.castle % 60).padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    {civ.ageUpTimes.imperial > 0 && (
                      <div className="bg-base-200 p-2 rounded text-center">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/civs/${civ.civilization.toLowerCase()}`);
                  }}
                  className="btn btn-primary btn-sm btn-outline hover:btn-primary"
                >
                  <i className="fas fa-chart-line mr-2" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {validCivilizations.length === 0 && (
          <div className="col-span-full text-center py-16">
            <CivIcon civName="unknown" size="2xl" className="mx-auto mb-4 opacity-30" />
            <h3 className="text-2xl font-bold text-base-content/70 mb-2">
              No Data Available
            </h3>
            <p className="text-base-content/50 mb-6">
              {data?.meta?.message || 'Unable to load civilization data. Please try refreshing the page.'}
            </p>
            <button
              onClick={refetch}
              className="btn btn-outline"
            >
              <i className="fas fa-refresh mr-2" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-12 card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <i className="fas fa-question-circle mr-2" />
            Understanding the Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Win Rate</h4>
              <p className="text-base-content/70">
                Percentage of matches won. Higher indicates stronger performance across all game types.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Pick Rate</h4>
              <p className="text-base-content/70">
                How often this civilization is chosen. Shows popularity in the competitive meta.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Average Rating</h4>
              <p className="text-base-content/70">
                Mean ELO of players using this civilization. Indicates skill level and complexity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Age Up Times</h4>
              <p className="text-base-content/70">
                Average time to reach each age. Faster times indicate economic advantages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CivilizationsPage;