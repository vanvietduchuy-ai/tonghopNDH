/**
 * MIGRATION SCRIPT
 * Chuyển đổi từ HybridCache sang SyncService
 */

import { HybridDB } from './services/hybridCache';
import { SyncDB } from './services/syncService';
import { Task, User } from './types';

interface MigrationResult {
  success: boolean;
  tasksMigrated: number;
  usersMigrated: number;
  errors: string[];
}

export async function migrateToSyncService(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    tasksMigrated: 0,
    usersMigrated: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting migration from HybridCache to SyncService...');

    // Step 1: Backup existing data
    console.log('📦 Creating backup...');
    const backupData = createBackup();
    
    if (!backupData.success) {
      throw new Error('Failed to create backup');
    }

    // Step 2: Initialize new SyncDB
    console.log('🚀 Initializing SyncService...');
    await SyncDB.initialize();

    // Step 3: Migrate tasks
    console.log('📝 Migrating tasks...');
    const oldTasks = getOldTasks();
    
    for (const task of oldTasks) {
      try {
        await SyncDB.saveTask(task);
        result.tasksMigrated++;
      } catch (error) {
        console.error(`Failed to migrate task ${task.id}:`, error);
        result.errors.push(`Task ${task.id}: ${error}`);
      }
    }

    // Step 4: Verify migration
    console.log('✅ Verifying migration...');
    const newTasks = SyncDB.getTasks();
    
    if (newTasks.length !== oldTasks.length) {
      console.warn(`⚠️ Task count mismatch: ${oldTasks.length} → ${newTasks.length}`);
    }

    // Step 5: Clean up old cache (optional - commented out for safety)
    // console.log('🗑️ Cleaning up old cache...');
    // HybridDB.clearCache();

    result.success = true;
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Results: ${result.tasksMigrated} tasks migrated`);
    
    return result;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.errors.push(`Critical error: ${error}`);
    result.success = false;
    
    // Attempt to restore from backup
    console.log('🔙 Attempting to restore from backup...');
    restoreFromBackup();
    
    return result;
  }
}

/**
 * Create backup of current data
 */
function createBackup(): { success: boolean; timestamp: number } {
  try {
    const timestamp = Date.now();
    
    // Backup old cache data
    const oldData = {
      users: localStorage.getItem('cache_users_v1'),
      tasks: localStorage.getItem('cache_tasks_v1'),
      lastSync: localStorage.getItem('cache_last_sync_v1'),
      timestamp
    };

    localStorage.setItem('backup_migration', JSON.stringify(oldData));
    
    console.log('✅ Backup created:', new Date(timestamp).toISOString());
    return { success: true, timestamp };
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return { success: false, timestamp: 0 };
  }
}

/**
 * Get tasks from old cache
 */
function getOldTasks(): Task[] {
  try {
    const cached = localStorage.getItem('cache_tasks_v1');
    if (!cached) return [];
    
    const tasks = JSON.parse(cached);
    console.log(`📦 Found ${tasks.length} tasks in old cache`);
    return tasks;
    
  } catch (error) {
    console.error('❌ Failed to read old tasks:', error);
    return [];
  }
}

/**
 * Restore from backup
 */
function restoreFromBackup(): boolean {
  try {
    const backup = localStorage.getItem('backup_migration');
    if (!backup) {
      console.error('❌ No backup found');
      return false;
    }

    const data = JSON.parse(backup);
    
    // Restore old cache
    if (data.users) localStorage.setItem('cache_users_v1', data.users);
    if (data.tasks) localStorage.setItem('cache_tasks_v1', data.tasks);
    if (data.lastSync) localStorage.setItem('cache_last_sync_v1', data.lastSync);

    console.log('✅ Backup restored from:', new Date(data.timestamp).toISOString());
    return true;
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return false;
  }
}

/**
 * Compare old and new data
 */
export function compareMigration(): {
  oldTasks: number;
  newTasks: number;
  match: boolean;
  missing: string[];
} {
  const oldTasks = getOldTasks();
  const newTasks = SyncDB.getTasks();
  
  const oldIds = new Set(oldTasks.map(t => t.id));
  const newIds = new Set(newTasks.map(t => t.id));
  
  const missing = oldTasks
    .filter(t => !newIds.has(t.id))
    .map(t => t.id);

  return {
    oldTasks: oldTasks.length,
    newTasks: newTasks.length,
    match: oldTasks.length === newTasks.length && missing.length === 0,
    missing
  };
}

/**
 * Clean up after successful migration
 */
export function cleanupAfterMigration(): void {
  if (confirm('Bạn có chắc muốn xóa dữ liệu cũ? Hành động này không thể hoàn tác.')) {
    // Remove old cache
    localStorage.removeItem('cache_users_v1');
    localStorage.removeItem('cache_tasks_v1');
    localStorage.removeItem('cache_last_sync_v1');
    
    // Keep backup for safety
    console.log('✅ Old cache cleaned up. Backup still available.');
  }
}

/**
 * Auto migration on app start
 */
export async function autoMigrateIfNeeded(): Promise<boolean> {
  // Check if old cache exists
  const hasOldCache = localStorage.getItem('cache_tasks_v1') !== null;
  const hasNewCache = localStorage.getItem('app_tasks_v2') !== null;
  
  // Skip if already migrated
  if (!hasOldCache || hasNewCache) {
    console.log('ℹ️ No migration needed');
    return false;
  }

  console.log('🔄 Detecting old cache, starting auto-migration...');
  
  const result = await migrateToSyncService();
  
  if (result.success) {
    console.log('✅ Auto-migration successful!');
    
    // Show success message to user
    if (typeof window !== 'undefined') {
      alert(`✅ Đã tự động chuyển đổi ${result.tasksMigrated} nhiệm vụ sang hệ thống mới!`);
    }
    
    return true;
  } else {
    console.error('❌ Auto-migration failed:', result.errors);
    
    // Show error to user
    if (typeof window !== 'undefined') {
      alert('❌ Không thể tự động chuyển đổi dữ liệu. Vui lòng liên hệ hỗ trợ.');
    }
    
    return false;
  }
}

// Export for manual use
export const MigrationTools = {
  migrate: migrateToSyncService,
  compare: compareMigration,
  cleanup: cleanupAfterMigration,
  autoMigrate: autoMigrateIfNeeded
};
