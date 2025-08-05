import React from 'react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 space-y-4 px-4">
      <div className="text-center">
        <i className="fas fa-exclamation-triangle text-6xl text-error mb-4"></i>
        <h3 className="text-2xl font-bold text-error mb-2">Oops! Something went wrong</h3>
        <p className="text-base-content/70 max-w-md mx-auto">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="btn btn-primary btn-outline"
        >
          <i className="fas fa-redo mr-2"></i>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;