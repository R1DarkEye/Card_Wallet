'use client';

export function CardSkeleton() {
  return (
    <div className="skeleton-row glass-card">
      <div className="skeleton-visual"></div>
      <div className="skeleton-details">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line subtitle"></div>
        <div className="skeleton-badge"></div>
      </div>
      <style jsx>{`
        .skeleton-row {
          display: flex;
          padding: 18px 20px;
          gap: 20px;
          align-items: center;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }
        .skeleton-row::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.05),
            transparent
          );
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .skeleton-visual {
          width: 150px;
          height: 90px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
        }
        .skeleton-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-line {
          height: 14px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .skeleton-line.title { width: 40%; height: 18px; }
        .skeleton-line.subtitle { width: 60%; }
        .skeleton-badge {
          width: 100px;
          height: 24px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-actions"></div>
      </div>
      <div className="skeleton-grid">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <style jsx>{`
        .skeleton-container {
          max-width: 980px;
          margin: 0 auto;
          width: 100%;
        }
        .skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .skeleton-title {
          width: 200px;
          height: 40px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .skeleton-actions {
          width: 120px;
          height: 40px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }
        .skeleton-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
      `}</style>
    </div>
  );
}
