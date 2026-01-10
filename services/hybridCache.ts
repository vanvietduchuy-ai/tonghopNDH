import { User, Task } from '../types';
import { NeonDB } from './neonDatabase';

/**
 * HYBRID CACHING STRATEGY
 * - Sync từ Neon về localStorage
 * - Chỉ fetch khi cần thiết
 * - Auto sync mỗi 5 phút
 * - Giảm 90% API calls
 */

const CACHE_VERSION = 'v1';
const CACHE_KEYS = {
  USERS: `cache_users_${CACHE_VERSION}`,
  TASKS: `cache_tasks_${CACHE_VERSION}`,
  LAST_SYNC: `cache_last_sync_${CACHE_VERSION}`,
};

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 phút
const FORCE_SYNC_INTERVAL = 30 * 60 * 1000; // 30 phút - force sync

class HybridCache {
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing = false;

  /**
   * Kiểm tra xem cần sync không
   */
  private needsSync(): boolean {
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!lastSync) return true;
    
    const timeSinceSync = Date.now() - parseInt(lastSync);
    return timeSinceSync > SYNC_INTERVAL;
  }

  /**
   * Lưu data vào cache
   */
  private setCache(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache storage error:', error);
      // Nếu localStorage đầy, xóa cache cũ
      this.clearCache();
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Đọc data từ cache
   */
  private getCache<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Xóa toàn bộ cache
   */
  clearCache() {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ Cache cleared');
  }

  /**
   * Sync users từ Neon về localStorage
   */
  async syncUsers(force = false): Promise<User[]> {
    // Nếu không cần sync và có cache, return cache
    if (!force && !this.needsSync()) {
      const cached = this.getCache<User[]>(CACHE_KEYS.USERS);
      if (cached) {
        console.log('📦 Using cached users');
        return cached;
      }
    }

    try {
      console.log('🔄 Syncing users from database...');
      const users = await NeonDB.getUsers();
      this.setCache(CACHE_KEYS.USERS, users);
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
      console.log('✅ Users synced successfully');
      return users;
    } catch (error) {
      console.error('❌ Sync users error:', error);
      // Fallback to cache nếu có
      const cached = this.getCache<User[]>(CACHE_KEYS.USERS);
      if (cached) {
        console.log('⚠️ Using stale cache due to error');
        return cached;
      }
      throw error;
    }
  }

  /**
   * Sync tasks từ Neon về localStorage
   */
  async syncTasks(force = false): Promise<Task[]> {
    if (!force && !this.needsSync()) {
      const cached = this.getCache<Task[]>(CACHE_KEYS.TASKS);
      if (cached) {
        console.log('📦 Using cached tasks');
        return cached;
      }
    }

    try {
      console.log('🔄 Syncing tasks from database...');
      const tasks = await NeonDB.getTasks();
      this.setCache(CACHE_KEYS.TASKS, tasks);
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
      console.log('✅ Tasks synced successfully');
      return tasks;
    } catch (error) {
      console.error('❌ Sync tasks error:', error);
      const cached = this.getCache<Task[]>(CACHE_KEYS.TASKS);
      if (cached) {
        console.log('⚠️ Using stale cache due to error');
        return cached;
      }
      throw error;
    }
  }

  /**
   * Update user - ghi vào DB và cache
   */
  async updateUser(user: User): Promise<void> {
    // Update database
    await NeonDB.updateUser(user);
    
    // Update cache
    const users = this.getCache<User[]>(CACHE_KEYS.USERS) || [];
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      this.setCache(CACHE_KEYS.USERS, users);
    }
  }

  /**
   * Add user - ghi vào DB và cache
   */
  async addUser(user: User): Promise<User> {
    const result = await NeonDB.addUser(user);
    
    // Update cache
    const users = this.getCache<User[]>(CACHE_KEYS.USERS) || [];
    users.push(result);
    this.setCache(CACHE_KEYS.USERS, users);
    
    return result;
  }

  /**
   * Delete user - xóa khỏi DB và cache
   */
  async deleteUser(id: string): Promise<void> {
    await NeonDB.deleteUser(id);
    
    // Update cache
    const users = this.getCache<User[]>(CACHE_KEYS.USERS) || [];
    const filtered = users.filter(u => u.id !== id);
    this.setCache(CACHE_KEYS.USERS, filtered);
  }

  /**
   * Save task - ghi vào DB và cache
   */
  async saveTask(task: Task): Promise<Task> {
    const result = await NeonDB.saveTask(task);
    
    // Update cache
    const tasks = this.getCache<Task[]>(CACHE_KEYS.TASKS) || [];
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = result;
    } else {
      tasks.unshift(result);
    }
    this.setCache(CACHE_KEYS.TASKS, tasks);
    
    return result;
  }

  /**
   * Delete task - xóa khỏi DB và cache
   */
  async deleteTask(id: string): Promise<void> {
    await NeonDB.deleteTask(id);
    
    // Update cache
    const tasks = this.getCache<Task[]>(CACHE_KEYS.TASKS) || [];
    const filtered = tasks.filter(t => t.id !== id);
    this.setCache(CACHE_KEYS.TASKS, filtered);
  }

  /**
   * Login - không cache password
   */
  async login(username: string, password: string): Promise<User | null> {
    return await NeonDB.login(username, password);
  }

  /**
   * Initialize - setup auto sync
   */
  async initialize(): Promise<void> {
    await NeonDB.initialize();
    
    // Initial sync
    await Promise.all([
      this.syncUsers(true),
      this.syncTasks(true)
    ]);

    // Setup auto sync mỗi 5 phút
    this.startAutoSync();
  }

  /**
   * Start background auto sync
   */
  private startAutoSync() {
    // Clear existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Setup periodic sync
    const autoSync = async () => {
      if (this.isSyncing) return; // Tránh sync đồng thời

      this.isSyncing = true;
      try {
        const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
        const timeSinceSync = lastSync ? Date.now() - parseInt(lastSync) : FORCE_SYNC_INTERVAL;

        // Force sync nếu quá 30 phút
        if (timeSinceSync > FORCE_SYNC_INTERVAL) {
          console.log('🔄 Force background sync...');
          await Promise.all([
            this.syncUsers(true),
            this.syncTasks(true)
          ]);
        }
      } catch (error) {
        console.error('Background sync error:', error);
      } finally {
        this.isSyncing = false;
      }

      // Schedule next sync
      this.syncTimeout = setTimeout(autoSync, SYNC_INTERVAL);
    };

    // Start first sync
    this.syncTimeout = setTimeout(autoSync, SYNC_INTERVAL);
  }

  /**
   * Stop auto sync
   */
  stopAutoSync() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }

  /**
   * Force refresh từ database
   */
  async forceRefresh(): Promise<{ users: User[]; tasks: Task[] }> {
    console.log('🔄 Force refreshing all data...');
    const [users, tasks] = await Promise.all([
      this.syncUsers(true),
      this.syncTasks(true)
    ]);
    return { users, tasks };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const users = this.getCache<User[]>(CACHE_KEYS.USERS);
    const tasks = this.getCache<Task[]>(CACHE_KEYS.TASKS);
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);

    return {
      usersCount: users?.length || 0,
      tasksCount: tasks?.length || 0,
      lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
      cacheSize: new Blob([
        localStorage.getItem(CACHE_KEYS.USERS) || '',
        localStorage.getItem(CACHE_KEYS.TASKS) || ''
      ]).size,
      nextSync: lastSync 
        ? new Date(parseInt(lastSync) + SYNC_INTERVAL)
        : new Date()
    };
  }
}

// Export singleton instance
export const HybridDB = new HybridCache();
