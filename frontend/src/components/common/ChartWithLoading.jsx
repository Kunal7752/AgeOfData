// components/Common/ChartWithLoading.jsx - Reusable chart component with loading state
import React from 'react';
import { ResponsiveContainer } from 'recharts';

const ChartSkeleton = ({ height = 250 }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="h-6 bg-base-300 rounded w-1/3 mb-4"></div>
    <div className="h-full bg-base-300 rounded flex items-end justify-around p-4">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i}
          className="bg-base-200 w-8 rounded-t"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
);

export default function ChartWithLoading({ 
  loading, 
  error, 
  title, 
  subtitle,
  height = 320,
  children,
  icon,
  emptyMessage = "No data available",
  className = ""
}) {
  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="card-title text-xl mb-4">
          {icon && <i className={`${icon} mr-2`}></i>}
          {title}
        </h3>
        {subtitle && <p className="text-sm text-base-content/60 -mt-2 mb-4">{subtitle}</p>}
        
        <div style={{ height }}>
          {loading ? (
            <ChartSkeleton height={height} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50">
              <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
              <p className="text-center">Failed to load chart data</p>
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}