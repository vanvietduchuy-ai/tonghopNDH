import { User, Task } from '../types';
import { NeonDB } from './neonDatabase';

/**
 * SYNC SERVICE WITH TTL
 * 
 * Chiến lược:
 * - LocalStorage: Nguồn dữ liệu chính cho Tasks (lưu vĩnh viễn)
 * - Neon Cloud: Backup + Sync giữa các thiết bị
 * - TTL: Tasks trên Neon tự động xóa sau 3 ngày
 * - Users: Luôn lưu trên Neon (không có TTL)
 */

const STORAGE_KEYS = {
  TASKS: 'app_tasks_v2',
  USERS: 'app_users_v2',
  LAST_SYNC: 'app_last_sync_v2',
  DEVICE_ID: 'app_device_id',
};

const TTL_DAYS = 3; // Tasks xóa sau 3 ngày trên Neon
const SYNC_INTERVAL = 2 * 60 * 1000; // Sync mỗi 2 phút
const MAX_OFFLINE_DAYS = 7; // Cảnh báo nếu offline quá 7 ngày

class SyncService {
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * Tạo hoặc lấy Device ID duy nhất
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  /**
   * Lưu data vào localStorage
   */
  private saveToLocal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ LocalStorage full:', error);
      // Xóa tasks cũ nếu localStorage đầy
      this.cleanupOldLocalTasks();
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Đọc data từ localStorage
   */
  private getFromLocal<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ LocalStorage read error:', error);
      return null;
    }
  }

  /**
   * Xóa tasks cũ hơn 90 ngày khỏi localStorage
   */
  private cleanupOldLocalTasks(): void {
    const tasks = this.getFromLocal<Task[]>(STORAGE_KEYS.TASKS) || [];
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 ngày
    
    const cleaned = tasks.filter(task => task.createdAt > cutoffDate);
    
    if (cleaned.length < tasks.length) {
      console.log(`🗑️ Cleaned ${tasks.length - cleaned.length} old tasks from localStorage`);
      this.saveToLocal(STORAGE_KEYS.TASKS, cleaned);
    }
  }

  /**
   * ============================================
   * USERS MANAGEMENT (Lưu trên Neon vĩnh viễn)
   * ============================================
   */

  /**
   * Lấy tất cả users từ Neon (cache trong 5 phút)
   */
  async getUsers(): Promise<User[]> {
    try {
      // Kiểm tra cache
      const cached = this.getFromLocal<{ data: User[]; timestamp: number }>(STORAGE_KEYS.USERS);
      const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
      
      // Nếu cache còn mới (< 5 phút), dùng cache
      if (cached && cacheAge < 5 * 60 * 1000) {
        console.log('📦 Using cached users');
        return cached.data;
      }

      // Fetch từ Neon
      console.log('🔄 Fetching users from Neon...');
      const users = await NeonDB.getUsers();
      
      // Lưu cache
      this.saveToLocal(STORAGE_KEYS.USERS, {
        data: users,
        timestamp: Date.now()
      });
      
      return users;
    } catch (error) {
      console.error('❌ Get users error:', error);
      
      // Fallback to cache nếu có
      const cached = this.getFromLocal<{ data: User[] }>(STORAGE_KEYS.USERS);
      if (cached) {
        console.log('⚠️ Using stale cache due to error');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Cập nhật user trên Neon
   */
  async updateUser(user: User): Promise<void> {
    await NeonDB.updateUser(user);
    
    // Invalidate cache
    localStorage.removeItem(STORAGE_KEYS.USERS);
  }

  /**
   * Thêm user mới
   */
  async addUser(user: User): Promise<User> {
    const result = await NeonDB.addUser(user);
    
    // Invalidate cache
    localStorage.removeItem(STORAGE_KEYS.USERS);
    
    return result;
  }

  /**
   * Xóa user
   */
  async deleteUser(id: string): Promise<void> {
    await NeonDB.deleteUser(id);
    
    // Invalidate cache
    localStorage.removeItem(STORAGE_KEYS.USERS);
  }

  /**
   * ============================================
   * TASKS MANAGEMENT (LocalStorage primary + Neon sync)
   * ============================================
   */

  /**
   * Lấy tất cả tasks từ LocalStorage
   */
  getTasks(): Task[] {
    const tasks = this.getFromLocal<Task[]>(STORAGE_KEYS.TASKS) || [];
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Lưu task vào LocalStorage và đồng bộ lên Neon
   */
  async saveTask(task: Task): Promise<Task> {
    // 1. Lưu vào LocalStorage trước (nguồn chính)
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    
    if (index !== -1) {
      tasks[index] = task;
    } else {
      tasks.unshift(task);
    }
    
    this.saveToLocal(STORAGE_KEYS.TASKS, tasks);
    console.log('💾 Task saved to localStorage');

    // 2. Đồng bộ lên Neon (background, không chờ)
    this.syncTaskToCloud(task).catch(error => {
      console.warn('⚠️ Cloud sync failed (will retry):', error);
    });

    return task;
  }

  /**
   * Đồng bộ 1 task lên Neon (background)
   */
  private async syncTaskToCloud(task: Task): Promise<void> {
    try {
      await NeonDB.saveTask(task);
      console.log('☁️ Task synced to cloud:', task.id);
    } catch (error) {
      // Không throw error, để không block UI
      console.error('❌ Cloud sync error:', error);
    }
  }

  /**
   * Xóa task khỏi LocalStorage và Neon
   */
  async deleteTask(id: string): Promise<void> {
    // 1. Xóa khỏi LocalStorage
    const tasks = this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    this.saveToLocal(STORAGE_KEYS.TASKS, filtered);
    console.log('🗑️ Task deleted from localStorage');

    // 2. Xóa khỏi Neon (background)
    try {
      await NeonDB.deleteTask(id);
      console.log('☁️ Task deleted from cloud');
    } catch (error) {
      console.warn('⚠️ Cloud delete failed:', error);
    }
  }

  /**
   * ============================================
   * SYNC OPERATIONS
   * ============================================
   */

  /**
   * Đồng bộ từ Neon về LocalStorage
   * (Pull từ cloud về local)
   */
  async pullFromCloud(): Promise<{ tasksAdded: number; tasksUpdated: number }> {
    try {
      console.log('⬇️ Pulling tasks from cloud...');
      
      // Lấy tasks từ Neon
      const cloudTasks = await NeonDB.getTasks();
      const localTasks = this.getTasks();
      
      let tasksAdded = 0;
      let tasksUpdated = 0;
      
      // Merge với local tasks
      const localTasksMap = new Map(localTasks.map(t => [t.id, t]));
      
      for (const cloudTask of cloudTasks) {
        const localTask = localTasksMap.get(cloudTask.id);
        
        if (!localTask) {
          // Task mới từ cloud
          localTasks.push(cloudTask);
          tasksAdded++;
        } else if (cloudTask.createdAt > localTask.createdAt) {
          // Task từ cloud mới hơn
          const index = localTasks.findIndex(t => t.id === cloudTask.id);
          if (index !== -1) {
            localTasks[index] = cloudTask;
            tasksUpdated++;
          }
        }
      }
      
      // Lưu lại
      if (tasksAdded > 0 || tasksUpdated > 0) {
        this.saveToLocal(STORAGE_KEYS.TASKS, localTasks);
        console.log(`✅ Pulled: ${tasksAdded} new, ${tasksUpdated} updated`);
      }
      
      return { tasksAdded, tasksUpdated };
    } catch (error) {
      console.error('❌ Pull from cloud failed:', error);
      throw error;
    }
  }

  /**
   * Đồng bộ từ LocalStorage lên Neon
   * (Push từ local lên cloud)
   */
  async pushToCloud(): Promise<{ tasksSynced: number }> {
    try {
      console.log('⬆️ Pushing tasks to cloud...');
      
      const localTasks = this.getTasks();
      let tasksSynced = 0;
      
      // Push từng task lên cloud (batch)
      const pushPromises = localTasks.map(async (task) => {
        try {
          await NeonDB.saveTask(task);
          tasksSynced++;
        } catch (error) {
          console.warn(`Failed to sync task ${task.id}:`, error);
        }
      });
      
      await Promise.all(pushPromises);
      
      console.log(`✅ Pushed ${tasksSynced}/${localTasks.length} tasks to cloud`);
      
      return { tasksSynced };
    } catch (error) {
      console.error('❌ Push to cloud failed:', error);
      throw error;
    }
  }

  /**
   * Đồng bộ 2 chiều (pull + push)
   */
  async bidirectionalSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress...');
      return;
    }

    this.isSyncing = true;
    
    try {
      console.log('🔄 Starting bidirectional sync...');
      
      // 1. Pull từ cloud về (để lấy tasks từ thiết bị khác)
      const pullResult = await this.pullFromCloud();
      
      // 2. Push lên cloud (để backup)
      const pushResult = await this.pushToCloud();
      
      // 3. Cập nhật last sync time
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      
      console.log('✅ Sync completed:', {
        pulled: pullResult,
        pushed: pushResult,
        time: new Date().toLocaleTimeString()
      });
      
    } catch (error) {
      console.error('❌ Bidirectional sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * ============================================
   * AUTO SYNC & INITIALIZATION
   * ============================================
   */

  /**
   * Khởi tạo service
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Sync Service...');
    
    // 1. Khởi tạo Neon database
    await NeonDB.initialize();
    
    // 2. Sync ban đầu
    await this.bidirectionalSync();
    
    // 3. Bắt đầu auto sync
    this.startAutoSync();
    
    console.log('✅ Sync Service initialized');
  }

  /**
   * Bắt đầu auto sync
   */
  private startAutoSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    const autoSync = async () => {
      await this.bidirectionalSync();
      this.syncTimeout = setTimeout(autoSync, SYNC_INTERVAL);
    };

    this.syncTimeout = setTimeout(autoSync, SYNC_INTERVAL);
    console.log(`⏰ Auto sync started (every ${SYNC_INTERVAL / 1000 / 60} minutes)`);
  }

  /**
   * Dừng auto sync
   */
  stopAutoSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
      console.log('⏸️ Auto sync stopped');
    }
  }

  /**
   * ============================================
   * UTILITIES
   * ============================================
   */

  /**
   * Login
   */
  async login(username: string, password: string): Promise<User | null> {
    return await NeonDB.login(username, password);
  }

  /**
   * Lấy thống kê sync
   */
  getSyncStats() {
    const tasks = this.getTasks();
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    
    return {
      deviceId: this.deviceId,
      localTasksCount: tasks.length,
      lastSyncTime: lastSync ? new Date(parseInt(lastSync)) : null,
      nextSyncIn: lastSync 
        ? Math.max(0, SYNC_INTERVAL - (Date.now() - parseInt(lastSync)))
        : 0,
      isOfflineTooLong: lastSync 
        ? (Date.now() - parseInt(lastSync)) > (MAX_OFFLINE_DAYS * 24 * 60 * 60 * 1000)
        : false,
    };
  }

  /**
   * Force refresh (xóa cache và sync lại)
   */
  async forceRefresh(): Promise<void> {
    console.log('🔄 Force refreshing...');
    
    // Xóa cache users
    localStorage.removeItem(STORAGE_KEYS.USERS);
    
    // Sync lại tasks
    await this.bidirectionalSync();
    
    console.log('✅ Force refresh completed');
  }

  /**
   * Clear all local data
   */
  clearLocalData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ All local data cleared');
  }
}

// Export singleton
export const SyncDB = new SyncService();
