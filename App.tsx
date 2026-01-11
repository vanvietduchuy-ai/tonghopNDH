import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, UserRole, TaskStatus, RecurringType } from './types';
import { TTLSync as MockDB } from './services/ttlSyncService';
import { Button, Input, StatusBadge, PriorityBadge, RecurringBadge } from './components/UI';
import { TaskModal } from './components/TaskModal';
import { UserManagementModal } from './components/UserManagementModal';
import { GeminiService } from './services/geminiService';

const LOGO_URL = "https://i.imgur.com/w1i8Z9S.png"; 

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState('ldthang');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

 const reloadData = async () => {
  const [fetchedUsers, fetchedTasks] = await Promise.all([
    MockDB.getUsers(),
    MockDB.getTasks()
  ]);
  setUsers(fetchedUsers);
  setTasks(fetchedTasks);
  return { users: fetchedUsers, tasks: fetchedTasks };
  };
  const refreshCacheStats = () => {
  const stats = MockDB.getSyncStats();
  setCacheStats(stats);
  };
  <button 
  onClick={async () => {
    setIsLoading(true);
    await MockDB.forceSync();
    await reloadData();
    refreshCacheStats();
    setIsLoading(false);
    alert('✅ Synced with cloud!');
  }}
  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-bold"
>
  🔄 Force Sync
</button>

// Clear cache giờ là clear local:
<button 
  onClick={() => {
    MockDB.clearLocal();
    refreshCacheStats();
    alert('🗑️ Local data cleared! Reload page to re-sync.');
  }}
  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-bold"
>
  🗑️ Clear Local
</button>

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        await MockDB.initialize();
      } catch (error) {
        console.error('Database initialization error:', error);
      }
      await reloadData();
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.isFirstLogin) setShowChangePassModal(true);
      }
      setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (currentUser && tasks.length > 0 && !aiBriefing) {
       const relevantTasks = currentUser.role === UserRole.MANAGER 
         ? tasks 
         : tasks.filter(t => t.assigneeId === currentUser.id);
       GeminiService.generateBriefing(relevantTasks).then(setAiBriefing);
    }
  }, [currentUser, tasks, aiBriefing]); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const user = await MockDB.login(usernameInput, passwordInput);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setAiBriefing('');
      if (user.isFirstLogin) setShowChangePassModal(true);
    } else {
      alert('Đăng nhập thất bại. Mật khẩu mặc định là 123123');
    }
    setIsLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    if (currentUser) {
      const updatedUser = { ...currentUser, password: newPassword, isFirstLogin: false };
      await MockDB.updateUser(updatedUser);
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setShowChangePassModal(false);
      alert('Đổi mật khẩu thành công!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setAiBriefing('');
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleSaveTask = async (task: Task) => {
    setIsLoading(true);
    const updatedTask = await MockDB.saveTask(task);
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === updatedTask.id);
      if (idx >= 0) {
        const newTasks = [...prev];
        newTasks[idx] = updatedTask;
        return newTasks;
      }
      return [updatedTask, ...prev];
    });
    setShowTaskModal(false);
    setEditingTask(null);
    setIsLoading(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;
    setIsLoading(true);
    await MockDB.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setIsLoading(false);
  };

  const openNewTaskModal = () => { setEditingTask(null); setShowTaskModal(true); };
  const openEditTaskModal = (task: Task) => { setEditingTask(task); setShowTaskModal(true); };

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    let result = tasks;
    if (currentUser.role === UserRole.OFFICER) {
      result = result.filter(t => t.assigneeId === currentUser.id);
    } else if (filterAssignee !== 'ALL') {
      result = result.filter(t => t.assigneeId === filterAssignee);
    }
    if (filterStatus !== 'ALL') {
      result = result.filter(t => t.status === filterStatus);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, currentUser, filterStatus, filterAssignee]);

  const stats = useMemo(() => {
    const base = currentUser?.role === UserRole.OFFICER 
      ? tasks.filter(t => t.assigneeId === currentUser?.id)
      : tasks;
    return {
      total: base.length,
      pending: base.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: base.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: base.filter(t => t.status === TaskStatus.COMPLETED).length,
    };
  }, [tasks, currentUser]);

  const recurringAlerts = useMemo(() => {
     if (currentUser?.role !== UserRole.MANAGER) return [];
     return tasks.filter(t => 
       t.recurring !== RecurringType.NONE && 
       t.status !== TaskStatus.COMPLETED &&
       t.status !== TaskStatus.CANCELLED
     );
  }, [tasks, currentUser]);

  if (showChangePassModal) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 max-w-md w-full border-t-8 border-yellow-500">
           <div className="text-center mb-6">
             <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4">
               <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
             </div>
             <h2 className="text-xl md:text-2xl font-bold text-red-800 uppercase">Yêu cầu đổi mật khẩu</h2>
             <p className="text-gray-600 text-xs md:text-sm mt-2">Vui lòng đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
           </div>
           <form onSubmit={handleChangePassword} className="space-y-4">
             <Input type="password" label="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
             <Input type="password" label="Xác nhận mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
             <Button type="submit" className="w-full mt-4">Cập nhật mật khẩu</Button>
           </form>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-800 to-red-900 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-yellow-500 blur-[100px]"></div>
           <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-red-500 blur-[100px]"></div>
        </div>

        <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 border border-white/50 relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 drop-shadow-xl">
              <img src={LOGO_URL} alt="Quốc Huy" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-red-800 uppercase tracking-wide">Hệ Thống Quản Lý</h1>
            <p className="text-red-600 font-semibold text-xs md:text-sm mt-1 uppercase">Giao việc & Theo dõi văn bản</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
            <Input 
              label="Tên đăng nhập" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
            />
            <Input 
              type="password"
              label="Mật khẩu" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Nhập mật khẩu..."
            />
            <Button type="submit" className="w-full py-3 md:py-3.5 text-sm md:text-base font-bold shadow-lg uppercase" isLoading={isLoading}>
              Đăng nhập
            </Button>
            <div className="text-xs text-center text-gray-400 mt-4">
               Mật khẩu mặc định: <span className="font-mono bg-gray-100 px-1 rounded">123123</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-gradient-to-r from-red-900 to-red-800 text-white shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Logo" className="w-9 h-9" />
            <div>
              <h1 className="text-xs font-bold uppercase leading-tight">Quản Lý Công Việc</h1>
              <p className="text-[9px] text-red-200">Cơ quan hành chính</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 active:bg-white/20 transition-colors"
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
        </div>

        {showMobileMenu && (
          <div className="border-t border-red-700/50 bg-red-950/30 p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
            <button onClick={() => { setFilterStatus('ALL'); setFilterAssignee('ALL'); setShowMobileMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm ${filterStatus === 'ALL' && filterAssignee === 'ALL' ? 'bg-white/20 text-yellow-300 font-bold' : 'text-red-100'}`}>
              <span>📊</span> Tổng quan
            </button>
            
            <div className="pt-2 pb-1 px-2 text-[9px] font-bold text-red-300 uppercase">Trạng thái</div>
            
            {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED].map(st => {
               let label = 'Chờ xử lý';
               if (st === TaskStatus.IN_PROGRESS) label = 'Đang thực hiện';
               if (st === TaskStatus.COMPLETED) label = 'Hoàn thành';
               
               return (
                <button key={st} onClick={() => { setFilterStatus(st); setShowMobileMenu(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${filterStatus === st ? 'bg-white/20 font-bold' : 'text-red-100'}`}>
                  {label}
                </button>
               );
            })}

            {currentUser.role === UserRole.MANAGER && (
              <>
                <div className="pt-2 pb-1 px-2 text-[9px] font-bold text-red-300 uppercase border-t border-white/10 mt-2">Quản trị</div>
                <button onClick={() => { setShowUserModal(true); setShowMobileMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-white bg-blue-900/40 text-sm">
                  <span>👥</span> Quản lý nhân sự
                </button>

                <div className="pt-2 pb-1 px-2 text-[9px] font-bold text-red-300 uppercase">Cán bộ</div>
                {users.filter(u => u.role === UserRole.OFFICER).slice(0, 5).map(user => (
                  <button 
                     key={user.id} 
                     onClick={() => { setFilterAssignee(user.id); setShowMobileMenu(false); }}
                     className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${filterAssignee === user.id ? 'bg-yellow-500 text-red-900 font-bold' : 'text-red-100'}`}
                  >
                     <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                     <span className="truncate">{user.fullName}</span>
                  </button>
                ))}
              </>
            )}

            <div className="pt-2 border-t border-white/10 mt-2">
              <button onClick={handleLogout} className="w-full px-3 py-2.5 rounded-lg bg-red-700 active:bg-red-600 font-bold text-sm">
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Sidebar */}
      <div className="flex flex-1">
        <aside className="hidden md:flex md:w-72 bg-gradient-to-b from-red-900 to-red-800 text-white md:h-screen sticky top-0 flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
          <div className="p-6 flex flex-col items-center border-b border-red-700/50 bg-red-950/30">
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16 mb-3" />
            <h2 className="text-lg font-bold uppercase text-center text-yellow-400">Quản Lý Công Việc</h2>
            <span className="text-[10px] text-red-200 uppercase mt-1">Cơ quan hành chính</span>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2">
            <button onClick={() => { setFilterStatus('ALL'); setFilterAssignee('ALL'); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${filterStatus === 'ALL' && filterAssignee === 'ALL' ? 'bg-white/10 text-yellow-300 font-bold border-l-4 border-yellow-400' : 'text-red-100 hover:bg-white/5'}`}>
              <span className="text-xl">📊</span> Tổng quan
            </button>
            
            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase border-b border-white/10">Trạng thái</div>
            
            {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED].map(st => {
               let label = 'Chờ xử lý';
               let colorClass = 'bg-gray-300';
               if (st === TaskStatus.IN_PROGRESS) { label = 'Đang thực hiện'; colorClass = 'bg-yellow-400'; }
               if (st === TaskStatus.COMPLETED) { label = 'Hoàn thành'; colorClass = 'bg-green-400'; }
               
               return (
                <button key={st} onClick={() => setFilterStatus(st)} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 ${filterStatus === st ? 'bg-white/10 font-bold' : 'text-red-100 hover:bg-white/5'}`}>
                  <span className={`w-2 h-2 rounded-full ${colorClass}`}></span> {label}
                </button>
               );
            })}

            {currentUser.role === UserRole.MANAGER && (
              <>
                 <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase border-b border-white/10">Quản trị</div>
                 <button onClick={() => setShowUserModal(true)} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-white bg-blue-900/40 hover:bg-blue-800/50">
                   <span className="text-lg">👥</span> Quản lý nhân sự
                 </button>

                 <div className="pt-2 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase border-b border-white/10">Cán bộ</div>
                 <div className="space-y-1">
                   {users.filter(u => u.role === UserRole.OFFICER).map(user => (
                     <button 
                        key={user.id} 
                        onClick={() => setFilterAssignee(user.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 ${filterAssignee === user.id ? 'bg-yellow-500 text-red-900 font-bold' : 'text-red-100 hover:bg-white/5'}`}
                     >
                        <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                        <span className="truncate">{user.fullName}</span>
                     </button>
                   ))}
                 </div>
              </>
            )}
          </nav>

          <div className="p-4 bg-red-950/40">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-black/10">
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-yellow-500" />
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
                <p className="text-[10px] text-yellow-400 truncate uppercase">{currentUser.role === UserRole.MANAGER ? 'Lãnh đạo' : 'Cán bộ'}</p>
              </div>
            </div>
            <Button variant="danger" className="w-full text-xs font-bold bg-red-700 hover:bg-red-600" onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-10 overflow-y-auto pb-20 md:pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-3">
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-red-900 uppercase">
                Chào, {currentUser.fullName.split(' ').pop()}
              </h1>
              <p className="text-gray-600 mt-1 text-xs md:text-sm">
                <span className="mr-1">📅</span>
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {currentUser.role === UserRole.MANAGER && (
              <Button 
                onClick={openNewTaskModal} 
                icon={<span className="font-bold">+</span>}
                className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm shadow-xl w-full md:w-auto"
              >
                Giao việc mới
              </Button>
            )}
          </div>
          
          {recurringAlerts.length > 0 && (
            <div className="mb-4 bg-purple-50 border-l-4 border-purple-500 p-3 md:p-4 rounded-r shadow-md flex gap-2">
               <div className="text-purple-600 text-lg">🗓️</div>
               <div>
                  <h4 className="font-bold text-purple-900 text-xs md:text-sm uppercase">Công việc định kỳ</h4>
                  <p className="text-purple-700 text-xs mt-1">Có <strong>{recurringAlerts.length}</strong> công việc định kỳ đang diễn ra.</p>
               </div>
            </div>
          )}

          {aiBriefing && (
            <div className="mb-4 md:mb-8 bg-white border-l-4 border-yellow-500 rounded-r-xl p-4 md:p-6 shadow-lg">
               <h3 className="text-red-900 font-bold mb-2 flex items-center gap-2 uppercase text-xs md:text-sm">
                 <span className="text-base md:text-xl">⚡</span> Tổng hợp nhanh
               </h3>
               <p className="text-gray-800 text-xs md:text-base leading-relaxed">{aiBriefing}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
            <div className="bg-white p-3 md:p-5 rounded-xl shadow-md border-b-4 border-gray-400">
              <p className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1">Tổng số</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-700">{stats.total}</p>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-xl shadow-md border-b-4 border-gray-300">
              <p className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1">Chờ</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-700">{stats.pending}</p>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-xl shadow-md border-b-4 border-yellow-400">
              <p className="text-yellow-700 text-[9px] md:text-[10px] font-bold uppercase mb-1">Đang làm</p>
              <p className="text-2xl md:text-3xl font-extrabold text-yellow-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-xl shadow-md border-b-4 border-green-500">
              <p className="text-green-700 text-[9px] md:text-[10px] font-bold uppercase mb-1">Xong</p>
              <p className="text-2xl md:text-3xl font-extrabold text-green-600">{stats.completed}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
               <h3 className="text-sm md:text-lg font-bold text-red-900 uppercase">
                  {filterAssignee !== 'ALL' 
                    ? `CV: ${users.find(u => u.id === filterAssignee)?.fullName.split(' ').pop()}`
                    : 'Danh sách công việc'}
               </h3>
               {filterAssignee !== 'ALL' && (
                 <button onClick={() => setFilterAssignee('ALL')} className="text-xs font-bold text-blue-600">
                   ← Tất cả
                 </button>
               )}
          </div>

          <div className="space-y-3 md:space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 md:py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-3xl mb-3 opacity-20">📂</div>
                <p className="text-gray-500 text-sm">Chưa có dữ liệu.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const assignee = users.find(u => u.id === task.assigneeId);
                const isOverdue = new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED;

                return (
                  <div key={task.id} 
                    className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer relative"
                    onClick={() => openEditTaskModal(task)}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        task.status === TaskStatus.COMPLETED ? 'bg-green-500' : 
                        task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}></div>

                    <div className="flex justify-between pl-2">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <StatusBadge status={task.status} />
                          <PriorityBadge priority={task.priority} />
                          <RecurringBadge type={task.recurring} />
                          {task.dispatchNumber && (
                             <span className="bg-blue-50 text-blue-800 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                               Số: {task.dispatchNumber}
                             </span>
                          )}
                          {isOverdue && <span className="text-[9px] text-white font-bold bg-red-600 px-1.5 py-0.5 rounded">QUÁ HẠN</span>}
                        </div>

                        <h4 className="text-sm md:text-lg font-bold text-gray-800 leading-snug mb-1">
                          {task.title}
                        </h4>
                        
                        {task.issuingAuthority && (
                          <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-2">
                             {task.issuingAuthority} • {task.issueDate || '...'}
                          </div>
                        )}

                        <p className="text-gray-600 text-xs md:text-sm line-clamp-2 border-l-2 border-gray-200 pl-2 italic mb-2">
                          "{task.description}"
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs font-bold text-gray-500">
                           <div className="flex items-center gap-1 text-red-600">
                             <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                             {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                           </div>
                           {currentUser.role === UserRole.MANAGER && assignee && (
                             <div className="flex items-center gap-1.5 bg-gray-50 pl-1 pr-2 py-0.5 rounded-full border border-gray-200">
                               <img src={assignee.avatarUrl} alt="" className="w-4 h-4 rounded-full"/>
                               <span className="text-[9px] md:text-xs">{assignee.fullName.split(' ').pop()}</span>
                             </div>
                           )}
                        </div>
                      </div>
                      
                      <div className="ml-2 flex flex-col items-end gap-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                        {currentUser.role === UserRole.MANAGER && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="text-gray-300 hover:text-red-500 p-1.5 rounded-full"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {currentUser.role === UserRole.MANAGER && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40 safe-area-inset-bottom">
          <div className="grid grid-cols-3 gap-1 p-2">
            <button 
              onClick={() => { setFilterStatus('ALL'); setFilterAssignee('ALL'); }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg ${filterStatus === 'ALL' ? 'bg-red-50 text-red-700' : 'text-gray-600'}`}
            >
              <span className="text-xl">📊</span>
              <span className="text-[10px] font-bold mt-0.5">Tổng quan</span>
            </button>
            <button 
              onClick={openNewTaskModal}
              className="flex flex-col items-center justify-center py-2 rounded-lg bg-red-600 text-white shadow-lg active:scale-95"
            >
              <span className="text-2xl font-bold">+</span>
              <span className="text-[10px] font-bold mt-0.5">Giao việc</span>
            </button>
            <button 
              onClick={() => setShowUserModal(true)}
              className="flex flex-col items-center justify-center py-2 rounded-lg text-gray-600"
            >
              <span className="text-xl">👥</span>
              <span className="text-[10px] font-bold mt-0.5">Nhân sự</span>
            </button>
          </div>
        </div>
      )}

      <TaskModal 
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        users={users}
        currentUser={currentUser}
      />

      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        users={users}
        onUsersUpdated={reloadData}
      />
    </div>
  );
};

export default App;
