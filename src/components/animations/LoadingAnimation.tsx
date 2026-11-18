import React from 'react';
import './LoadingAnimation.css';
import { i18n } from "../../i18n";

const LoadingAnimation: React.FC = () => {
  return (
    <div className="loading-animation-container">
      <div className="loading-content">
        <div className="spinner-ring"></div>
        <div className="logo-g">{i18n.t("G")}</div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
