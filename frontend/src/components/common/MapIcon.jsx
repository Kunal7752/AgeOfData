// components/Common/MapIcon.jsx - Reusable map icon component
import React, { useState } from 'react';
import { getMapIcon, hasMapIcon, formatMapName, FALLBACK_MAP_ICON } from '../../utils/mapIcons';

const MapIcon = ({ 
  mapName, 
  size = 'md', 
  className = '', 
  showFallback = true,
  showName = false,
  onClick = null,
  rounded = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const iconUrl = getMapIcon(mapName);
  const hasIcon = hasMapIcon(mapName);
  
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8', 
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // If no icon exists and showFallback is false, return null
  if (!hasIcon && !showFallback) {
    return null;
  }

  // Determine what to render
  const shouldShowImage = hasIcon && !imageError;
  const shouldShowFallback = (!hasIcon || imageError) && showFallback;
  const shouldShowPlaceholder = !shouldShowImage && !shouldShowFallback;

  const baseClasses = `
    ${sizeClass} 
    ${rounded ? 'rounded-lg' : ''} 
    ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
    ${className}
  `.trim();

  const containerClasses = showName 
    ? 'flex items-center space-x-2' 
    : '';

  const renderIcon = () => {
    if (shouldShowImage) {
      return (
        <div className="relative">
          {/* Loading skeleton */}
          {!imageLoaded && (
            <div className={`${baseClasses} bg-gray-200 animate-pulse flex items-center justify-center`}>
              <i className="fas fa-map text-gray-400 text-xs"></i>
            </div>
          )}
          
          {/* Actual image */}
          <img
            src={iconUrl}
            alt={`${formatMapName(mapName)} map`}
            className={`${baseClasses} object-cover border border-base-300 shadow-sm ${!imageLoaded ? 'opacity-0 absolute inset-0' : ''}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </div>
      );
    }

    if (shouldShowFallback) {
      return (
        <img
          src={FALLBACK_MAP_ICON}
          alt={`${formatMapName(mapName)} map`}
          className={`${baseClasses} object-cover border border-base-300 shadow-sm`}
          loading="lazy"
        />
      );
    }

    if (shouldShowPlaceholder) {
      return (
        <div className={`${baseClasses} bg-primary/10 border border-primary/20 flex items-center justify-center`}>
          <i className="fas fa-map text-primary/60"></i>
        </div>
      );
    }

    return null;
  };

  const content = (
    <div className={containerClasses}>
      {renderIcon()}
      {showName && (
        <span className="font-medium text-base-content">
          {formatMapName(mapName)}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <div 
        onClick={() => onClick(mapName)}
        className="inline-block"
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && onClick(mapName)}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default MapIcon;