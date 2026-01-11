import { User, Task, UserRole } from '../types';

const API_URL = '/.netlify/functions/db-v2';

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

// Hàm tạo avatar URL ngắn gọn
const getAvatar = (name: string, role: UserRole) => {
  const bg = role === UserRole.MANAGER ? 'ef4444' : '059669';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128`;
};

// Danh sách cán bộ đầy đủ - CHỈ SEED 1 LẦN
async function seedDefaultData() {
  try {
    const users = await callAPI('getUsers');
    if (users.length > 0) {
      console.log('✅ Database already seeded, skipping...');
      return; // Đã có dữ liệu, không seed nữa
    }

    console.log('🌱 Seeding database with default data...');

    const defaultUsers = [
      // Lãnh đạo
      { id: 'u1', username: 'ldthang', password: '123123', isFirstLogin: true, fullName: 'Lê Đình Thắng', role: 'MANAGER', avatarUrl: getAvatar('Lê Đình Thắng', UserRole.MANAGER) },
      { id: 'u2', username: 'lqtuan', password: '123123', isFirstLogin: true, fullName: 'Lê Quốc Tuấn', role: 'MANAGER', avatarUrl: getAvatar('Lê Quốc Tuấn', UserRole.MANAGER) },
      { id: 'u3', username: 'nthao', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Hảo', role: 'MANAGER', avatarUrl: getAvatar('Nguyễn Thị Hảo', UserRole.MANAGER) },

      // Cán bộ
      { id: 'u4', username: 'ptadao', password: '123123', isFirstLogin: true, fullName: 'Phan Thị Anh Đào', role: 'OFFICER', avatarUrl: getAvatar('Phan Thị Anh Đào', UserRole.OFFICER) },
      { id: 'u5', username: 'nqtrang', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Quỳnh Trang', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Quỳnh Trang', UserRole.OFFICER) },
      { id: 'u6', username: 'cphang', password: '123123', isFirstLogin: true, fullName: 'Cao Phương Hằng', role: 'OFFICER', avatarUrl: getAvatar('Cao Phương Hằng', UserRole.OFFICER) },
      { id: 'u7', username: 'ntsuong', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Thu Sương', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Thị Thu Sương', UserRole.OFFICER) },
      { id: 'u8', username: 'ndnguyen', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Đình Nguyên', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Đình Nguyên', UserRole.OFFICER) },
      { id: 'u9', username: 'hhquynh', password: '123123', isFirstLogin: true, fullName: 'Hoàng Hương Quỳnh', role: 'OFFICER', avatarUrl: getAvatar('Hoàng Hương Quỳnh', UserRole.OFFICER) },
      { id: 'u10', username: 'nklinh', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Khánh Linh', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Khánh Linh', UserRole.OFFICER) },
      { id: 'u11', username: 'hphai', password: '123123', isFirstLogin: true, fullName: 'Hoàng Phi Hải', role: 'OFFICER', avatarUrl: getAvatar('Hoàng Phi Hải', UserRole.OFFICER) },
      { id: 'u12', username: 'nthue', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Như Huế', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Thị Như Huế', UserRole.OFFICER) },
      { id: 'u13', username: 'vvdhuy', password: '123123', isFirstLogin: true, fullName: 'Văn Viết Đức Huy', role: 'OFFICER', avatarUrl: getAvatar('Văn Viết Đức Huy', UserRole.OFFICER) },
      { id: 'u14', username: 'lqchung', password: '123123', isFirstLogin: true, fullName: 'Lê Quang Chung', role: 'OFFICER', avatarUrl: getAvatar('Lê Quang Chung', UserRole.OFFICER) },
      { id: 'u15', username: 'dvtdat', password: '123123', isFirstLogin: true, fullName: 'Dương Văn Tiến Đạt', role: 'OFFICER', avatarUrl: getAvatar('Dương Văn Tiến Đạt', UserRole.OFFICER) },
      { id: 'u16', username: 'nttnguyen', password: '123123', isFirstLogin: true, fullName: 'Nguyễn Thị Trí Nguyên', role: 'OFFICER', avatarUrl: getAvatar('Nguyễn Thị Trí Nguyên', UserRole.OFFICER) },
    ];
    
    // Seed users in batch
    for (const user of defaultUsers) {
      await callAPI('addUser', user);
    }

    // Chỉ seed 2 task mẫu để tiết kiệm
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
      {
        id: 't2',
        title: 'Báo cáo số liệu đền bù GPMB định kỳ tháng',
        description: 'Tổng hợp số liệu và báo cáo phòng Kế hoạch.',
        dispatchNumber: '45/KH-TNMT',
        issuingAuthority: 'Sở TN&MT',
        issueDate: '2024-05-20',
        assigneeId: 'u14',
        creatorId: 'u2',
        recurring: 'MONTHLY',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        createdAt: Date.now() - 100000,
      }
    ];

    for (const task of sampleTasks) {
      await callAPI('saveTask', task);
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seed data error:', error);
  }
}

export const NeonDB = {
  initialize: async () => {
    await callAPI('init');
    await seedDefaultData(); // Chỉ seed nếu chưa có data
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

  // Cleanup tasks cũ hơn TTL
  cleanup: async (): Promise<number> => {
    const result = await callAPI('cleanup');
    return result.deletedCount || 0;
  },

  // Batch save tasks (để sync nhanh hơn)
  batchSaveTasks: async (tasks: Task[]): Promise<void> => {
    await callAPI('batchSaveTasks', { tasks });
  },

  // Get sync statistics
  getSyncStats: async (): Promise<any> => {
    return await callAPI('getSyncStats');
  },
};
