import React from 'react';

const LoadingSpinner = ({ size = 'lg', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
      <span className={`loading loading-spinner ${sizeClasses[size]} text-primary`}></span>
      <p className="text-base-content/70 animate-pulse">{text}</p>
    </div>
  );
};

export default LoadingSpinner;