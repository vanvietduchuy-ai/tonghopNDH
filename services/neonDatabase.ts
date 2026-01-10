import { User, Task } from '../types';

const API_URL = '/.netlify/functions/db';

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

// Initialize database with default data
async function seedDefaultData() {
  try {
    const users = await callAPI('getUsers');
    if (users.length === 0) {
      // Add default users
      const defaultUsers = [
        { id: 'u1', username: 'ldthang', password: '123123', isFirstLogin: true, fullName: 'Lê Đình Thắng', role: 'MANAGER', avatarUrl: 'https://ui-avatars.com/api/?name=Le+Dinh+Thang&background=ef4444&color=fff' },
        { id: 'u2', username: 'lqtuan', password: '123123', isFirstLogin: true, fullName: 'Lê Quốc Tuấn', role: 'MANAGER', avatarUrl: 'https://ui-avatars.com/api/?name=Le+Quoc+Tuan&background=f97316&color=fff' },
        { id: 'u3', username: 'nthao', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Hảo', role: 'MANAGER', avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Hao&background=f97316&color=fff' },
        { id: 'u4', username: 'ptadao', password: '123123', isFirstLogin: true, fullName: 'Phan Thị Anh Đào', role: 'OFFICER', avatarUrl: 'https://ui-avatars.com/api/?name=Phan+Thi+Anh+Dao&background=059669&color=fff' },
        { id: 'u5', username: 'nthuong', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Hương', role: 'OFFICER', avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Huong&background=059669&color=fff' },
      ];
      
      for (const user of defaultUsers) {
        await callAPI('addUser', user);
      }

      // Add sample tasks
      const sampleTasks = [
        {
          id: 't1',
          title: 'V/v Rà soát quy hoạch phân khu B tại quận Liên Chiểu',
          description: 'Thực hiện rà soát theo chỉ đạo của UBND TP. Báo cáo kết quả trước ngày 25.',
          dispatchNumber: '128/UBND-QLĐT',
          issuingAuthority: 'UBND Thành Phố',
          issueDate: '2024-05-15',
          assigneeId: 'u4',
          creatorId: 'u1',
          recurring: 'NONE',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          createdAt: Date.now(),
        },
      ];

      for (const task of sampleTasks) {
        await callAPI('saveTask', task);
      }
    }
  } catch (error) {
    console.error('Seed data error:', error);
  }
}

export const NeonDB = {
  initialize: async () => {
    await callAPI('init');
    await seedDefaultData();
  },

  getUsers: async (): Promise<User[]> => {
    const users = await callAPI('getUsers');
    return users.map((u: any) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      isFirstLogin: u.is_first_login,
      fullName: u.full_name,
      role: u.role,
      avatarUrl: u.avatar_url,
    }));
  },

  updateUser: async (user: User): Promise<void> => {
    await callAPI('updateUser', {
      id: user.id,
      password: user.password,
      isFirstLogin: user.isFirstLogin,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  },

  addUser: async (user: User): Promise<User> => {
    await callAPI('addUser', {
      id: user.id,
      username: user.username,
      password: user.password,
      isFirstLogin: user.isFirstLogin,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
    return user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await callAPI('deleteUser', { id });
  },

  getTasks: async (): Promise<Task[]> => {
    const tasks = await callAPI('getTasks');
    return tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      dispatchNumber: t.dispatch_number,
      issuingAuthority: t.issuing_authority,
      issueDate: t.issue_date,
      recurring: t.recurring,
      assigneeId: t.assignee_id,
      creatorId: t.creator_id,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      createdAt: t.created_at,
    }));
  },

  saveTask: async (task: Task): Promise<Task> => {
    const result = await callAPI('saveTask', {
      id: task.id,
      title: task.title,
      description: task.description,
      dispatchNumber: task.dispatchNumber,
      issuingAuthority: task.issuingAuthority,
      issueDate: task.issueDate,
      recurring: task.recurring,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    });
    return result.task;
  },

  deleteTask: async (id: string): Promise<void> => {
    await callAPI('deleteTask', { id });
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const user = await callAPI('login', { username, password });
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      isFirstLogin: user.is_first_login,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    };
  },
};
