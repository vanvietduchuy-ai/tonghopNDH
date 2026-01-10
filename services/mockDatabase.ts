import { User, UserRole, Task, TaskStatus, TaskPriority, RecurringType } from '../types';

// Default password for everyone
const DEFAULT_PASS = '123123';

const MOCK_USERS: User[] = [
  // --- BAN LÃNH ĐẠO (Managers) ---
  { id: 'u1', username: 'ldthang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Đình Thắng', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Le+Dinh+Thang&background=ef4444&color=fff' }, 
  { id: 'u2', username: 'lqtuan', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Quốc Tuấn', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Le+Quoc+Tuan&background=f97316&color=fff' },
  { id: 'u3', username: 'nthao', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Hảo', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Hao&background=f97316&color=fff' },

  // --- CÁN BỘ (Officers) ---
  { id: 'u4', username: 'ptadao', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Phan Thị Anh Đào', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Phan+Thi+Anh+Dao&background=059669&color=fff' },
  { id: 'u5', username: 'nthuong', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Hường', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Huong&background=059669&color=fff' },
  { id: 'u6', username: 'nqtrang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Quỳnh Trang', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Quynh+Trang&background=059669&color=fff' },
  { id: 'u7', username: 'cphang', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Cao Phương Hằng', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Cao+Phuong+Hang&background=059669&color=fff' },
  { id: 'u8', username: 'nttsuong', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Thu Sương', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Thu+Suong&background=059669&color=fff' },
  { id: 'u9', username: 'ndnguyen', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Đình Nguyên', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Dinh+Nguyen&background=059669&color=fff' },
  { id: 'u10', username: 'hhquynh', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Hoàng Hương Quỳnh', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Hoang+Huong+Quynh&background=059669&color=fff' },
  { id: 'u11', username: 'nklinh', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Khánh Linh', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Khanh+Linh&background=059669&color=fff' },
  { id: 'u12', username: 'hphai', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Hoàng Phi Hải', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Hoang+Phi+Hai&background=059669&color=fff' },
  { id: 'u13', username: 'nthue', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Nguyễn Thị Như Huế', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Nguyen+Thi+Nhu+Hue&background=059669&color=fff' },
  { id: 'u14', username: 'vvdhuy', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Văn Viết Đức Huy', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Van+Viet+Duc+Huy&background=059669&color=fff' },
  { id: 'u15', username: 'lqchung', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Lê Quang Chung', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Le+Quang+Chung&background=059669&color=fff' },
  { id: 'u16', username: 'dvtdat', password: DEFAULT_PASS, isFirstLogin: true, fullName: 'Dương Văn Tiến Đạt', role: UserRole.OFFICER, avatarUrl: 'https://ui-avatars.com/api/?name=Duong+Van+Tien+Dat&background=059669&color=fff' },
];

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
    aiSuggestedSteps: ['Thu thập hồ sơ quy hoạch cũ', 'Khảo sát hiện trạng', 'Lập báo cáo so sánh']
  },
  {
    id: 't2',
    title: 'Báo cáo số liệu đền bù GPMB định kỳ tháng',
    description: 'Tổng hợp số liệu và báo cáo phòng Kế hoạch.',
    dispatchNumber: '45/KH-TNMT',
    issuingAuthority: 'Sở TN&MT',
    issueDate: '2024-05-20',
    assigneeId: 'u15',
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
    // In a real app, use bcrypt. Here simple string comparison.
    return users.find(u => u.username === username && u.password === passwordAttempt) || null;
  }
};