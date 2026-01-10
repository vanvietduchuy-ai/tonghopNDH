import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, UserRole, TaskStatus, RecurringType } from './types';
import { MockDB } from './services/mockDatabase';
import { Button, Input, StatusBadge, PriorityBadge, RecurringBadge } from './components/UI';
import { TaskModal } from './components/TaskModal';
import { UserManagementModal } from './components/UserManagementModal';
import { GeminiService } from './services/geminiService';

const LOGO_URL = "https://i.imgur.com/w1i8Z9S.png"; 

const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false); // NEW: Manage Users Modal
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [aiBriefing, setAiBriefing] = useState<string>('');
  
  // Login State
  const [usernameInput, setUsernameInput] = useState('ldthang');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Change Pass State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initial Data Load
  const reloadData = async () => {
    // Helper to reload data, useful after user updates
    const [fetchedUsers, fetchedTasks] = await Promise.all([
      MockDB.getUsers(),
      MockDB.getTasks()
    ]);
    setUsers(fetchedUsers);
    setTasks(fetchedTasks);
    return { users: fetchedUsers, tasks: fetchedTasks };
  };

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const user = await MockDB.login(usernameInput, passwordInput);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setAiBriefing('');
      if (user.isFirstLogin) {
        setShowChangePassModal(true);
      }
    } else {
      alert('Đăng nhập thất bại. Kiểm tra lại thông tin. Mật khẩu mặc định là 123123');
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
    
    // Officer only sees their own tasks
    if (currentUser.role === UserRole.OFFICER) {
      result = result.filter(t => t.assigneeId === currentUser.id);
    } 
    // Manager can filter by specific assignee
    else if (filterAssignee !== 'ALL') {
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

  // --- Change Password Modal ---
  if (showChangePassModal) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full border-t-8 border-yellow-500">
           <div className="text-center mb-6">
             <div className="w-20 h-20 mx-auto mb-4">
               <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
             </div>
             <h2 className="text-2xl font-bold text-red-800 uppercase">Yêu cầu đổi mật khẩu</h2>
             <p className="text-gray-600 text-sm mt-2">Vì lý do bảo mật, vui lòng đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
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

  // --- Login Screen ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-800 to-red-900 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-yellow-500 blur-[100px]"></div>
           <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-500 blur-[100px]"></div>
        </div>

        <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 border border-white/50 relative z-10">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 drop-shadow-xl hover:scale-105 transition-transform duration-300">
              <img src={LOGO_URL} alt="Quốc Huy" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-red-800 uppercase tracking-wide">Hệ Thống Quản Lý</h1>
            <p className="text-red-600 font-semibold text-sm mt-1 uppercase">Giao việc & Theo dõi văn bản</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <Input 
              label="Tên đăng nhập" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
            />
            <Input 
              type="password"
              label="Mật khẩu" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
            />
            <Button type="submit" className="w-full py-3.5 text-base font-bold shadow-lg uppercase" isLoading={isLoading}>
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

  // --- Main App ---
  return (
    <div className="min-h-screen bg-yellow-50/50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-gradient-to-b from-red-900 to-red-800 text-white md:h-screen sticky top-0 md:flex flex-col hidden z-20 shadow-2xl overflow-y-auto custom-scrollbar">
        <div className="p-6 flex flex-col items-center border-b border-red-700/50 bg-red-950/30 shrink-0">
          <img src={LOGO_URL} alt="Logo" className="w-16 h-16 mb-3 drop-shadow-md" />
          <h2 className="text-lg font-bold uppercase text-center leading-tight text-yellow-400">
            Quản Lý Công Việc
          </h2>
          <span className="text-[10px] text-red-200 uppercase tracking-widest mt-1">Cơ quan hành chính</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* Main Filter */}
          <button onClick={() => { setFilterStatus('ALL'); setFilterAssignee('ALL'); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${filterStatus === 'ALL' && filterAssignee === 'ALL' ? 'bg-white/10 text-yellow-300 font-bold border-l-4 border-yellow-400' : 'text-red-100 hover:bg-white/5'}`}>
            <span className="text-xl">📊</span> Tổng quan
          </button>
          
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase tracking-widest border-b border-white/10 mb-2">Trạng thái xử lý</div>
          
          {/* Status Filters */}
          {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED].map(st => {
             let label = 'Chờ xử lý';
             let colorClass = 'bg-gray-300';
             if (st === TaskStatus.IN_PROGRESS) { label = 'Đang thực hiện'; colorClass = 'bg-yellow-400'; }
             if (st === TaskStatus.COMPLETED) { label = 'Hoàn thành'; colorClass = 'bg-green-400'; }
             
             return (
              <button key={st} onClick={() => setFilterStatus(st)} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-all ${filterStatus === st ? 'bg-white/10 font-bold' : 'text-red-100 hover:bg-white/5'}`}>
                <span className={`w-2 h-2 rounded-full ${colorClass} shadow`}></span> {label}
              </button>
             );
          })}

          {/* Manager Controls */}
          {currentUser.role === UserRole.MANAGER && (
            <>
               <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase tracking-widest border-b border-white/10 mb-2">Quản trị</div>
               
               {/* Personnel Management Button */}
               <button onClick={() => setShowUserModal(true)} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-white bg-blue-900/40 hover:bg-blue-800/50 border border-blue-800/30 mb-2">
                 <span className="text-lg">👥</span> Quản lý nhân sự
               </button>

               <div className="pt-2 pb-2 px-4 text-[10px] font-bold text-red-300 uppercase tracking-widest border-b border-white/10 mb-2">Theo dõi Cán bộ</div>
               <div className="space-y-1">
                 {users.filter(u => u.role === UserRole.OFFICER).map(user => (
                   <button 
                      key={user.id} 
                      onClick={() => setFilterAssignee(user.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 transition-all ${filterAssignee === user.id ? 'bg-yellow-500 text-red-900 font-bold shadow-lg transform scale-105' : 'text-red-100 hover:bg-white/5'}`}
                   >
                      <img src={user.avatarUrl} className="w-5 h-5 rounded-full border border-white/30" alt="" />
                      <span className="truncate">{user.fullName}</span>
                   </button>
                 ))}
               </div>
            </>
          )}
        </nav>

        <div className="p-4 bg-red-950/40 shrink-0">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-black/10">
            <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-yellow-500 shadow-sm" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
              <p className="text-[10px] font-medium text-yellow-400 truncate uppercase">{currentUser.role === UserRole.MANAGER ? 'Lãnh đạo đơn vị' : 'Cán bộ'}</p>
            </div>
          </div>
          <Button variant="danger" className="w-full text-xs font-bold border-none bg-red-700 hover:bg-red-600" onClick={handleLogout}>Đăng xuất</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-900 tracking-tight uppercase">
              Chào đồng chí, {currentUser.fullName.split(' ').pop()}
            </h1>
            <p className="text-gray-600 mt-1 font-medium text-sm">
              <span className="inline-block mr-2">📅</span>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {currentUser.role === UserRole.MANAGER && (
            <Button 
              onClick={openNewTaskModal} 
              icon={<span className="text-lg font-bold">+</span>}
              className="px-6 py-3 text-sm shadow-xl hover:translate-y-[-2px] transition-transform"
            >
              Giao việc / Nhập văn bản
            </Button>
          )}
        </div>
        
        {/* Recurring Tasks Alert */}
        {recurringAlerts.length > 0 && (
          <div className="mb-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r shadow-md flex items-start gap-3 animate-fade-in-down">
             <div className="text-purple-600 text-xl mt-0.5">🗓️</div>
             <div>
                <h4 className="font-bold text-purple-900 text-sm uppercase">Lưu ý công việc định kỳ</h4>
                <p className="text-purple-700 text-sm mt-1">
                   Có <strong>{recurringAlerts.length}</strong> công việc định kỳ (Hàng tuần/tháng) đang diễn ra. Vui lòng kiểm tra tiến độ.
                </p>
             </div>
          </div>
        )}

        {/* AI Briefing Card */}
        {aiBriefing && (
          <div className="mb-8 bg-white border-l-4 border-yellow-500 rounded-r-xl p-6 relative overflow-hidden shadow-lg transform transition-all hover:scale-[1.01]">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-yellow-600 text-9xl -mt-4 -mr-4">⚠</div>
             <h3 className="text-red-900 font-bold mb-3 flex items-center gap-2 uppercase text-sm tracking-wider">
               <span className="text-xl">⚡</span> Tổng hợp nhanh tình hình
             </h3>
             <p className="text-gray-800 text-sm md:text-base leading-relaxed font-medium text-justify">{aiBriefing}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-md border-b-4 border-gray-400 hover:shadow-lg transition-shadow">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Tổng văn bản/việc</p>
            <p className="text-3xl font-extrabold text-gray-700">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-md border-b-4 border-gray-300 hover:shadow-lg transition-shadow">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Chờ xử lý</p>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
               <p className="text-3xl font-extrabold text-gray-700">{stats.pending}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-md border-b-4 border-yellow-400 hover:shadow-lg transition-shadow">
            <p className="text-yellow-700 text-[10px] font-bold uppercase tracking-wider mb-2">Đang thực hiện</p>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
               <p className="text-3xl font-extrabold text-yellow-600">{stats.inProgress}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-md border-b-4 border-green-500 hover:shadow-lg transition-shadow">
            <p className="text-green-700 text-[10px] font-bold uppercase tracking-wider mb-2">Đã hoàn thành</p>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
               <p className="text-3xl font-extrabold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Task List Header */}
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-4 border-b border-gray-200 pb-2 gap-2">
             <h3 className="text-lg font-bold text-red-900 uppercase">
                {filterAssignee !== 'ALL' 
                  ? `Công việc của: ${users.find(u => u.id === filterAssignee)?.fullName}`
                  : 'Danh sách văn bản / Công việc'}
             </h3>
             {filterAssignee !== 'ALL' && (
               <button onClick={() => setFilterAssignee('ALL')} className="text-xs font-bold text-blue-600 hover:underline">
                 ← Quay lại xem tất cả
               </button>
             )}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-inner">
              <div className="text-4xl mb-3 opacity-20 grayscale">📂</div>
              <p className="text-gray-500 font-medium">Chưa có dữ liệu.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map(task => {
                const assignee = users.find(u => u.id === task.assigneeId);
                const isOverdue = new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED;

                return (
                  <div key={task.id} 
                    className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all cursor-pointer group relative overflow-hidden transform hover:-translate-y-1 duration-200"
                    onClick={() => openEditTaskModal(task)}
                  >
                    {/* Decorative side bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        task.status === TaskStatus.COMPLETED ? 'bg-green-500' : 
                        task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}></div>

                    <div className="flex justify-between items-start pl-2">
                      <div className="flex-1">
                        {/* Meta Badge Header */}
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <StatusBadge status={task.status} />
                          <PriorityBadge priority={task.priority} />
                          <RecurringBadge type={task.recurring} />
                          
                          {task.dispatchNumber && (
                             <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                               Số: {task.dispatchNumber}
                             </span>
                          )}
                          {isOverdue && <span className="text-[10px] text-white font-bold bg-red-600 px-2 py-0.5 rounded shadow-sm animate-pulse">QUÁ HẠN</span>}
                        </div>

                        {/* Document Title */}
                        <h4 className="text-lg font-bold text-gray-800 group-hover:text-red-700 transition-colors leading-snug">
                          {task.title}
                        </h4>
                        
                        {/* Meta info if available */}
                        {task.issuingAuthority && (
                          <div className="mt-1 text-xs text-gray-500 font-bold uppercase tracking-wide">
                             {task.issuingAuthority} • Ngày BH: {task.issueDate || '...'}
                          </div>
                        )}

                        <p className="text-gray-600 text-sm mt-3 line-clamp-2 leading-relaxed border-l-2 border-gray-200 pl-3 italic">
                          "{task.description}"
                        </p>
                        
                        <div className="flex items-center gap-6 mt-4 text-xs font-bold text-gray-500">
                           <div className="flex items-center gap-1.5 text-red-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                             Hạn hoàn thành: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                           </div>
                           {currentUser.role === UserRole.MANAGER && assignee && (
                             <div className="flex items-center gap-2 bg-gray-50 pl-1 pr-3 py-1 rounded-full border border-gray-200 shadow-sm">
                               <span className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                                  <img src={assignee.avatarUrl} alt="" className="w-full h-full object-cover"/>
                               </span>
                               <span>{assignee.fullName}</span>
                             </div>
                           )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors shadow-sm border border-gray-100">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                        {currentUser.role === UserRole.MANAGER && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors mt-2"
                            title="Xóa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

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