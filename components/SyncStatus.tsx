import React, { useState, useEffect } from 'react';
import { SyncDB } from '../services/syncService';

interface SyncStats {
  deviceId: string;
  localTasksCount: number;
  lastSyncTime: Date | null;
  nextSyncIn: number;
  isOfflineTooLong: boolean;
}

export function SyncStatusIndicator() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Update stats mỗi 5 giây
    const updateStats = () => {
      setStats(SyncDB.getSyncStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await SyncDB.bidirectionalSync();
      setStats(SyncDB.getSyncStats());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Chưa sync';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const formatNextSync = (ms: number) => {
    if (ms <= 0) return 'Đang sync...';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  if (!stats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact Status Badge */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
          transition-all duration-200 hover:scale-105
          ${stats.isOfflineTooLong 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'}
        `}
      >
        {/* Sync Icon */}
        <svg 
          className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        
        <span className="text-sm font-medium">
          {isSyncing ? 'Đang sync...' : formatTime(stats.lastSyncTime)}
        </span>
      </button>

      {/* Detailed Panel */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Trạng thái đồng bộ</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="space-y-3">
            {/* Device ID */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Device ID</div>
              <div className="text-sm font-mono text-gray-700 truncate">
                {stats.deviceId}
              </div>
            </div>

            {/* Local Tasks */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Nhiệm vụ trên máy</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.localTasksCount}
              </div>
            </div>

            {/* Last Sync */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Sync lần cuối</div>
              <div className="text-sm text-gray-700">
                {formatTime(stats.lastSyncTime)}
              </div>
            </div>

            {/* Next Sync */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Sync tiếp theo</div>
              <div className="text-sm text-gray-700">
                {formatNextSync(stats.nextSyncIn)}
              </div>
            </div>

            {/* Warning */}
            {stats.isOfflineTooLong && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-xs text-red-700">
                    Bạn chưa đồng bộ hơn 7 ngày. Hãy kết nối internet để đồng bộ dữ liệu.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className={`
                w-full px-4 py-2 rounded-lg font-medium text-sm
                transition-colors duration-200
                ${isSyncing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'}
              `}
            >
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>

            {/* Info about TTL */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Dữ liệu trên cloud tự động xóa sau 3 ngày
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini version for navbar
export function SyncStatusMini() {
  const [stats, setStats] = useState<SyncStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setStats(SyncDB.getSyncStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div 
        className={`w-2 h-2 rounded-full ${
          stats.isOfflineTooLong ? 'bg-red-500' : 'bg-green-500'
        }`}
      />
      <span className="text-gray-600">
        {stats.localTasksCount} nhiệm vụ
      </span>
    </div>
  );
}
