'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    // Visual feedback for 600ms even if refresh is instant
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        padding: '6px 12px',
        fontSize: 13,
        border: '1px solid #e5e5ea',
        background: loading ? '#f5f5f7' : '#fff',
        borderRadius: 8,
        cursor: loading ? 'wait' : 'pointer',
        color: '#1D1D1F',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!loading) e.currentTarget.style.background = '#f5f5f7';
      }}
      onMouseLeave={(e) => {
        if (!loading) e.currentTarget.style.background = '#fff';
      }}
    >
      <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>↻</span>
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
