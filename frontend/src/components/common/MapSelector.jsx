// components/Common/MapSelector.jsx - Interactive map selection component
import React, { useState, useMemo } from 'react';
import MapIcon from './MapIcon';
import { getTopMapsByCategory, processMapData, MAP_TYPES } from '../../utils/mapUtils';

const MapSelector = ({ 
  maps = [], 
  selectedMap = null, 
  onMapSelect = () => {}, 
  showCategories = true,
  maxMapsPerCategory = 6,
  className = '',
  size = 'md'
}) => {
  const [activeCategory, setActiveCategory] = useState(MAP_TYPES.LAND);
  const [showAll, setShowAll] = useState(false);

  // Process and categorize maps
  const categorizedMaps = useMemo(() => {
    if (!showCategories) {
      return { 'All Maps': processMapData(maps).slice(0, showAll ? maps.length : maxMapsPerCategory * 2) };
    }
    
    const topMaps = getTopMapsByCategory(maps, showAll ? 20 : maxMapsPerCategory);
    return topMaps;
  }, [maps, showCategories, showAll, maxMapsPerCategory]);

  // Get maps for active category
  const activeMaps = useMemo(() => {
    if (!showCategories) {
      return categorizedMaps['All Maps'] || [];
    }
    return categorizedMaps[activeCategory] || [];
  }, [categorizedMaps, activeCategory, showCategories]);

  // Category icons
  const categoryIcons = {
    [MAP_TYPES.LAND]: 'fas fa-mountain',
    [MAP_TYPES.WATER]: 'fas fa-water',
    [MAP_TYPES.HYBRID]: 'fas fa-island-tropical',
    [MAP_TYPES.SPECIAL]: 'fas fa-dice'
  };

  const handleMapClick = (map) => {
    // FIXED: Handle both field formats
    const mapName = map.name || map.map || map.mapName || 'Unknown';
    onMapSelect(mapName, map);
  };

  return (
    <div className={`${className}`}>
      {/* Category Tabs (if enabled) */}
      {showCategories && (
        <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
          {Object.keys(categorizedMaps).map((category) => (
            <button
              key={category}
              className={`tab tab-sm sm:tab-md ${activeCategory === category ? 'tab-active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              <i className={`${categoryIcons[category]} mr-2 text-sm`}></i>
              <span className="hidden sm:inline">{category}</span>
              <span className="sm:hidden">{category.split(' ')[0]}</span>
              <div className="badge badge-sm ml-2 opacity-75">
                {(categorizedMaps[category] || []).length}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Maps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {activeMaps.map((map, index) => {
          const mapName = map.map || map.name;
          const isSelected = selectedMap === mapName;
          
          return (
            <div
              key={mapName || index}
              className={`
                group cursor-pointer rounded-lg p-3 transition-all duration-200
                ${isSelected 
                  ? 'bg-primary/20 border-2 border-primary shadow-lg scale-105' 
                  : 'bg-base-200 border-2 border-transparent hover:border-primary/30 hover:bg-base-300'
                }
              `}
              onClick={() => handleMapClick(map)}
            >
              {/* Map Icon */}
              <div className="flex justify-center mb-2">
                <MapIcon 
                  mapName={mapName}
                  size={size}
                  className={`
                    transition-transform duration-200
                    ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                  `}
                />
              </div>

              {/* Map Name */}
              <div className="text-center">
                <h4 className={`
                  text-xs sm:text-sm font-medium mb-1 transition-colors
                  ${isSelected ? 'text-primary font-bold' : 'text-base-content group-hover:text-primary'}
                `}>
                  {map.displayName || map.map || 'Unknown'}
                </h4>

                {/* Play Rate */}
                {map.formattedPlayRate && (
                  <div className={`
                    text-xs transition-colors
                    ${isSelected ? 'text-primary' : 'text-base-content/70 group-hover:text-base-content'}
                  `}>
                    {map.formattedPlayRate}
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <i className="fas fa-check text-xs text-primary-content"></i>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {!showCategories && maps.length > maxMapsPerCategory * 2 && (
        <div className="text-center mt-6">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <i className="fas fa-chevron-up mr-2"></i>
                Show Less
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down mr-2"></i>
                Show All {maps.length} Maps
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Stats for Active Category */}
      {showCategories && activeMaps.length > 0 && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">
                {activeMaps.length}
              </div>
              <div className="text-xs text-base-content/70">Maps</div>
            </div>
            
            <div>
              <div className="text-lg font-bold text-secondary">
                {activeMaps.reduce((sum, map) => sum + (map.totalMatches || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-base-content/70">Matches</div>
            </div>
            
            <div>
              <div className="text-lg font-bold text-accent">
                {(activeMaps.reduce((sum, map) => sum + (map.playRatePercent || 0), 0)).toFixed(1)}%
              </div>
              <div className="text-xs text-base-content/70">Total Share</div>
            </div>
            
            <div>
              <div className="text-lg font-bold text-info">
                {activeMaps[0]?.displayName || 'N/A'}
              </div>
              <div className="text-xs text-base-content/70">Most Popular</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeMaps.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-map text-4xl text-base-content/30 mb-4"></i>
          <p className="text-base-content/70">
            No maps found in this category
          </p>
        </div>
      )}
    </div>
  );
};

export default MapSelector;