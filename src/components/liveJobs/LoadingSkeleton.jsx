import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="live-job-card skeleton-card" key={index}>
          <div className="skeleton-line wide"></div>
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-block"></div>
        </div>
      ))}
    </div>
  );
}
