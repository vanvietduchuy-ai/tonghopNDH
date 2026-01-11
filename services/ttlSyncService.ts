import { User, Task } from '../types';

/**
 * TTL SYNC STRATEGY
 * - Cloud (Neon): Temporary sync storage, auto-delete after 3 days
 * - Local (localStorage): Permanent primary storage
 * - Cloud acts as "sync hub" for multi-device
 * - Saves 95%+ database costs
 */

const API_URL = '/.netlify/functions/db';
const TTL_DAYS = 3;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const STORAGE_KEYS = {
  USERS: 'ttl_users',
  TASKS: 'ttl_tasks',
  LAST_CLOUD_SYNC: 'ttl_last_cloud_sync',
  DEVICE_ID: 'ttl_device_id',
};

async function callAPI(action: string, data?: any) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}

class TTLSyncService {
  private deviceId: string;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Get or create device ID
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    this.deviceId = id;
  }

  /**
   * Get data from localStorage (primary source)
   */
  private getLocal<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Local storage read error:', error);
      return [];
    }
  }

  /**
   * Save data to localStorage (primary storage)
   */
  private setLocal<T>(key: string, data: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Local storage write error:', error);
    }
  }

  /**
   * Check if we need to sync with cloud
   */
  private needsCloudSync(): boolean {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_CLOUD_SYNC);
    if (!lastSync) return true;
    
    const timeSinceSync = Date.now() - parseInt(lastSync);
    return timeSinceSync > 60 * 60 * 1000; // 1 hour
  }

  /**
   * Upload local data to cloud (with TTL)
   */
  private async uploadToCloud() {
    try {
      console.log('☁️ Uploading to cloud...');
      
      const users = this.getLocal<User>(STORAGE_KEYS.USERS);
      const tasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
      
      // Upload with TTL timestamp
      const ttlData = {
        deviceId: this.deviceId,
        timestamp: Date.now(),
        ttl: TTL_MS,
        users,
        tasks
      };

      await callAPI('uploadWithTTL', ttlData);
      localStorage.setItem(STORAGE_KEYS.LAST_CLOUD_SYNC, Date.now().toString());
      
      console.log('✅ Upload to cloud completed');
    } catch (error) {
      console.error('❌ Upload to cloud failed:', error);
      // Continue with local data
    }
  }

  /**
   * Download and merge data from cloud
   */
  private async downloadFromCloud() {
    try {
      console.log('☁️ Downloading from cloud...');
      
      const cloudData = await callAPI('downloadWithTTL', { deviceId: this.deviceId });
      
      if (cloudData && cloudData.data) {
        const localUsers = this.getLocal<User>(STORAGE_KEYS.USERS);
        const localTasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
        
        // Merge cloud data with local (local takes priority)
        const mergedUsers = this.mergeData(localUsers, cloudData.data.users, 'id');
        const mergedTasks = this.mergeData(localTasks, cloudData.data.tasks, 'id');
        
        this.setLocal(STORAGE_KEYS.USERS, mergedUsers);
        this.setLocal(STORAGE_KEYS.TASKS, mergedTasks);
        
        console.log('✅ Download from cloud completed');
      }
    } catch (error) {
      console.error('❌ Download from cloud failed:', error);
      // Continue with local data
    }
  }

  /**
   * Merge data (local takes priority, add new items from cloud)
   */
  private mergeData<T extends { id: string }>(local: T[], cloud: T[], idKey: keyof T): T[] {
    const localIds = new Set(local.map(item => item[idKey]));
    const newFromCloud = cloud.filter(item => !localIds.has(item[idKey]));
    return [...local, ...newFromCloud];
  }

  /**
   * Initialize - setup database and sync
   */
  async initialize() {
    try {
      await callAPI('init');
      
      // Try to download from cloud first
      if (this.needsCloudSync()) {
        await this.downloadFromCloud();
      }
      
      // Start auto cleanup and sync
      this.startAutoCleanup();
      
      console.log('✅ TTL Sync Service initialized');
    } catch (error) {
      console.error('❌ Init error:', error);
    }
  }

  /**
   * Get users (from localStorage)
   */
  async getUsers(): Promise<User[]> {
    return this.getLocal<User>(STORAGE_KEYS.USERS);
  }

  /**
   * Get tasks (from localStorage)
   */
  async getTasks(): Promise<Task[]> {
    return this.getLocal<Task>(STORAGE_KEYS.TASKS);
  }

  /**
   * Update user (local + cloud)
   */
  async updateUser(user: User): Promise<void> {
    const users = this.getLocal<User>(STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      users[index] = user;
      this.setLocal(STORAGE_KEYS.USERS, users);
      
      // Upload to cloud in background
      this.uploadToCloud().catch(console.error);
    }
  }

  /**
   * Add user (local + cloud)
   */
  async addUser(user: User): Promise<User> {
    const users = this.getLocal<User>(STORAGE_KEYS.USERS);
    users.push(user);
    this.setLocal(STORAGE_KEYS.USERS, users);
    
    // Upload to cloud in background
    this.uploadToCloud().catch(console.error);
    
    return user;
  }

  /**
   * Delete user (local + cloud)
   */
  async deleteUser(id: string): Promise<void> {
    let users = this.getLocal<User>(STORAGE_KEYS.USERS);
    users = users.filter(u => u.id !== id);
    this.setLocal(STORAGE_KEYS.USERS, users);
    
    // Also delete related tasks
    let tasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
    tasks = tasks.filter(t => t.assigneeId !== id && t.creatorId !== id);
    this.setLocal(STORAGE_KEYS.TASKS, tasks);
    
    // Upload to cloud in background
    this.uploadToCloud().catch(console.error);
  }

  /**
   * Save task (local + cloud)
   */
  async saveTask(task: Task): Promise<Task> {
    const tasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
    const index = tasks.findIndex(t => t.id === task.id);
    
    if (index !== -1) {
      tasks[index] = task;
    } else {
      tasks.unshift(task);
    }
    
    this.setLocal(STORAGE_KEYS.TASKS, tasks);
    
    // Upload to cloud in background
    this.uploadToCloud().catch(console.error);
    
    return task;
  }

  /**
   * Delete task (local + cloud)
   */
  async deleteTask(id: string): Promise<void> {
    let tasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
    tasks = tasks.filter(t => t.id !== id);
    this.setLocal(STORAGE_KEYS.TASKS, tasks);
    
    // Upload to cloud in background
    this.uploadToCloud().catch(console.error);
  }

  /**
   * Login (from localStorage)
   */
  async login(username: string, password: string): Promise<User | null> {
    const users = this.getLocal<User>(STORAGE_KEYS.USERS);
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
  }

  /**
   * Force sync with cloud
   */
  async forceSync(): Promise<void> {
    await this.uploadToCloud();
    await this.downloadFromCloud();
  }

  /**
   * Start auto cleanup on cloud (runs every 6 hours)
   */
  private startAutoCleanup() {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Cleanup expired cloud data
    const cleanup = async () => {
      try {
        await callAPI('cleanupExpired', { ttl: TTL_MS });
        console.log('🧹 Cloud cleanup completed');
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    // Run cleanup every 6 hours
    this.syncInterval = setInterval(cleanup, 6 * 60 * 60 * 1000);
    
    // Also run once on start
    cleanup().catch(console.error);
  }

  /**
   * Stop auto cleanup
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    const users = this.getLocal<User>(STORAGE_KEYS.USERS);
    const tasks = this.getLocal<Task>(STORAGE_KEYS.TASKS);
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_CLOUD_SYNC);

    return {
      deviceId: this.deviceId,
      usersCount: users.length,
      tasksCount: tasks.length,
      lastCloudSync: lastSync ? new Date(parseInt(lastSync)) : null,
      ttlDays: TTL_DAYS,
      storageType: 'localStorage (permanent) + Neon (3-day TTL)'
    };
  }

  /**
   * Clear all local data
   */
  clearLocal() {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.LAST_CLOUD_SYNC);
    console.log('🗑️ Local data cleared');
  }
}

// Export singleton instance
export const TTLSync = new TTLSyncService();
