import { User, UserRole, Task, TaskStatus, TaskPriority, RecurringType } from '../types';

const DEFAULT_PASS = '123123';

// Hàm tạo avatar URL ngắn gọn
const getAvatar = (name: string, role: UserRole) => {
  const bg = role === UserRole.MANAGER ? 'ef4444' : '059669';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128`;
};

const MOCK_USERS: User[] = [
  // Lãnh đạo (3 người)
  { id: 'u1', username: 'ldthang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Đình Thắng', role: UserRole.MANAGER, avatarUrl: getAvatar('Lê Đình Thắng', UserRole.MANAGER) },
  { id: 'u2', username: 'lqtuan', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Quốc Tuấn', role: UserRole.MANAGER, avatarUrl: getAvatar('Lê Quốc Tuấn', UserRole.MANAGER) },
  { id: 'u3', username: 'nthao', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Hảo', role: UserRole.MANAGER, avatarUrl: getAvatar('Nguyễn Thị Hảo', UserRole.MANAGER) },

  // Cán bộ (17 người)
  { id: 'u4', username: 'ptadao', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Phan Thị Anh Đào', role: UserRole.OFFICER, avatarUrl: getAvatar('Phan Thị Anh Đào', UserRole.OFFICER) },
  { id: 'u5', username: 'nqtrang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Quỳnh Trang', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Quỳnh Trang', UserRole.OFFICER) },
  { id: 'u6', username: 'cphang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Cao Phương Hằng', role: UserRole.OFFICER, avatarUrl: getAvatar('Cao Phương Hằng', UserRole.OFFICER) },
  { id: 'u7', username: 'ntsuong', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Thu Sương', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Thị Thu Sương', UserRole.OFFICER) },
  { id: 'u8', username: 'ndnguyen', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Đình Nguyên', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Đình Nguyên', UserRole.OFFICER) },
  { id: 'u9', username: 'hhquynh', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Hoàng Hương Quỳnh', role: UserRole.OFFICER, avatarUrl: getAvatar('Hoàng Hương Quỳnh', UserRole.OFFICER) },
  { id: 'u10', username: 'nklinh', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Khánh Linh', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Khánh Linh', UserRole.OFFICER) },
  { id: 'u11', username: 'hphai', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Hoàng Phi Hải', role: UserRole.OFFICER, avatarUrl: getAvatar('Hoàng Phi Hải', UserRole.OFFICER) },
  { id: 'u12', username: 'nthue', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Như Huế', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Thị Như Huế', UserRole.OFFICER) },
  { id: 'u13', username: 'vvdhuy', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Văn Viết Đức Huy', role: UserRole.OFFICER, avatarUrl: getAvatar('Văn Viết Đức Huy', UserRole.OFFICER) },
  { id: 'u14', username: 'lqchung', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Quang Chung', role: UserRole.OFFICER, avatarUrl: getAvatar('Lê Quang Chung', UserRole.OFFICER) },
  { id: 'u15', username: 'dvtdat', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Dương Văn Tiến Đạt', role: UserRole.OFFICER, avatarUrl: getAvatar('Dương Văn Tiến Đạt', UserRole.OFFICER) },
  { id: 'u16', username: 'nttnguyen', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Trí Nguyên', role: UserRole.OFFICER, avatarUrl: getAvatar('Nguyễn Thị Trí Nguyên', UserRole.OFFICER) },
];

// Chỉ lưu 2 task mẫu để tiết kiệm dữ liệu
const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'V/v Rà soát quy hoạch phân khu B tại quận Liên Chiểu',
    description: 'Thực hiện rà soát theo chỉ đạo của UBND TP. Báo cáo kết quả trước ngày 25.',
    dispatchNumber: '128/UBND-QLĐT',
    issuingAuthority: 'UBND Thành Phố',
    issueDate: '2024-05-15',
    assigneeId: 'u4',
    creatorId: 'u1',
    recurring: RecurringType.NONE,
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
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
    recurring: RecurringType.MONTHLY,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: Date.now() - 100000,
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockDB = {
  getUsers: async (): Promise<User[]> => {
    await delay(300);
    const stored = localStorage.getItem('users');
    if (!stored) {
      localStorage.setItem('users', JSON.stringify(MOCK_USERS));
      return MOCK_USERS;
    }
    return JSON.parse(stored);
  },

  updateUser: async (user: User): Promise<void> => {
    const users = await MockDB.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      localStorage.setItem('users', JSON.stringify(users));
    }
  },

  addUser: async (user: User): Promise<User> => {
    await delay(300);
    const users = await MockDB.getUsers();
    const newUsers = [...users, user];
    localStorage.setItem('users', JSON.stringify(newUsers));
    return user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await delay(300);
    const users = await MockDB.getUsers();
    const newUsers = users.filter(u => u.id !== id);
    localStorage.setItem('users', JSON.stringify(newUsers));
  },

  getTasks: async (): Promise<Task[]> => {
    await delay(300);
    const stored = localStorage.getItem('tasks');
    if (!stored) {
      localStorage.setItem('tasks', JSON.stringify(MOCK_TASKS));
      return MOCK_TASKS;
    }
    return JSON.parse(stored);
  },

  saveTask: async (task: Task): Promise<Task> => {
    await delay(400);
    const tasks = await MockDB.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    let newTasks;
    if (index >= 0) {
      newTasks = [...tasks];
      newTasks[index] = task;
    } else {
      newTasks = [task, ...tasks];
    }
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    return task;
  },

  deleteTask: async (id: string): Promise<void> => {
    await delay(300);
    const tasks = await MockDB.getTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  },

  login: async (username: string, passwordAttempt: string): Promise<User | null> => {
    await delay(500);
    const users = await MockDB.getUsers();
    return users.find(u => u.username === username && u.password === passwordAttempt) || null;
  }
};
