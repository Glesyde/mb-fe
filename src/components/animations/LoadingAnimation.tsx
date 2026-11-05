import React from 'react';
import './LoadingAnimation.css';

const LoadingAnimation: React.FC = () => {
  return (
    <div className="loading-animation-container">
      <div className="loading-content">
        <div className="spinner-ring"></div>
        <div className="logo-g">G</div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
