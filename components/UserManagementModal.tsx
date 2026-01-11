import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Button, Input } from './UI';
import { HybridDB } from '../services/hybridCache';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onUsersUpdated: () => Promise<any>;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
  isOpen, 
  onClose, 
  users,
  onUsersUpdated 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    role: UserRole.OFFICER,
    password: '123123'
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.username.length < 3) {
      alert('Tên đăng nhập phải có ít nhất 3 ký tự');
      return;
    }
    
    if (newUser.fullName.length < 3) {
      alert('Họ tên phải có ít nhất 3 ký tự');
      return;
    }

    if (users.some(u => u.username === newUser.username)) {
      alert('Tên đăng nhập đã tồn tại!');
      return;
    }

    setIsProcessing(true);
    
    try {
      const user: User = {
        id: `u${Date.now()}`,
        username: newUser.username.toLowerCase().trim(),
        password: newUser.password,
        isFirstLogin: true,
        fullName: newUser.fullName.trim(),
        role: newUser.role,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.fullName)}&background=${newUser.role === UserRole.MANAGER ? 'ef4444' : '059669'}&color=fff&size=128`
      };

      await HybridDB.addUser(user);
      await onUsersUpdated();
      
      setNewUser({ username: '', fullName: '', role: UserRole.OFFICER, password: '123123' });
      setShowAddForm(false);
      alert('✅ Thêm người dùng thành công!');
    } catch (error) {
      console.error('Add user error:', error);
      alert('❌ Lỗi khi thêm người dùng.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.fullName.length < 3) {
      alert('Họ tên phải có ít nhất 3 ký tự');
      return;
    }

    setIsProcessing(true);
    try {
      const updatedUser = {
        ...editingUser,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(editingUser.fullName)}&background=${editingUser.role === UserRole.MANAGER ? 'ef4444' : '059669'}&color=fff&size=128`
      };
      await HybridDB.updateUser(updatedUser);
      await onUsersUpdated();
      setEditingUser(null);
      alert('✅ Cập nhật thông tin thành công!');
    } catch (error) {
      console.error('Update user error:', error);
      alert('❌ Lỗi khi cập nhật thông tin.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!window.confirm(`⚠️ Xóa người dùng "${user.fullName}"?\n\nTất cả công việc liên quan sẽ bị xóa!`)) return;
    
    setIsProcessing(true);
    try {
      await HybridDB.deleteUser(userId);
      await onUsersUpdated();
      alert('✅ Đã xóa người dùng!');
    } catch (error) {
      console.error('Delete user error:', error);
      alert('❌ Lỗi khi xóa người dùng.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`🔄 Đặt lại mật khẩu về "123123" cho:\n${user.fullName}?`)) return;
    
    setIsProcessing(true);
    try {
      const updatedUser = { ...user, password: '123123', isFirstLogin: true };
      await HybridDB.updateUser(updatedUser);
      await onUsersUpdated();
      alert('✅ Đã đặt lại mật khẩu!\n\nMật khẩu mới: 123123');
    } catch (error) {
      console.error('Reset password error:', error);
      alert('❌ Lỗi khi đặt lại mật khẩu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const managers = users.filter(u => u.role === UserRole.MANAGER);
  const officers = users.filter(u => u.role === UserRole.OFFICER);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-4">
        <div className="sticky top-0 bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 rounded-t-xl flex justify-between items-center z-10 shadow-md">
          <div>
            <h2 className="text-xl font-bold uppercase flex items-center gap-2">👥 Quản lý nhân sự</h2>
            <p className="text-blue-200 text-sm mt-1">Thêm, xóa, sửa thông tin cán bộ và lãnh đạo</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
        </div>
        
        <div className="p-6">
          {/* Edit User Form */}
          {editingUser ? (
            <form onSubmit={handleEditUser} className="mb-6 p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-200 space-y-4 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-yellow-900 text-lg">✏️ Chỉnh sửa thông tin: {editingUser.fullName}</h3>
                <button type="button" onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Tên đăng nhập" value={editingUser.username} onChange={() => {}} disabled className="bg-gray-100" />
                <Input label="Họ và tên *" value={editingUser.fullName} onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })} placeholder="vd: Nguyễn Văn A" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vai trò *</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white">
                    <option value={UserRole.OFFICER}>👤 Cán bộ</option>
                    <option value={UserRole.MANAGER}>👔 Tổ trưởng/Tổ phó</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                <strong>💡 Lưu ý:</strong> Không thể thay đổi tên đăng nhập. Để đặt lại mật khẩu, sử dụng nút "Reset MK".
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-700" isLoading={isProcessing}>{isProcessing ? 'Đang xử lý...' : 'Lưu thay đổi'}</Button>
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} className="flex-1">Hủy</Button>
              </div>
            </form>
          ) : !showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="mb-6 w-full md:w-auto" icon={<span className="text-lg">➕</span>}>Thêm người dùng mới</Button>
          ) : (
            <form onSubmit={handleAddUser} className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 space-y-4 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-blue-900 text-lg">➕ Thêm người dùng mới</h3>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Tên đăng nhập *" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="vd: nguyenvana" required />
                <Input label="Họ và tên *" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder="vd: Nguyễn Văn A" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vai trò *</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value={UserRole.OFFICER}>👤 Cán bộ</option>
                    <option value={UserRole.MANAGER}>👔 Tổ trưởng/Tổ phó</option>
                  </select>
                </div>
                <Input label="Mật khẩu mặc định *" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mật khẩu đăng nhập" required />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>💡 Lưu ý:</strong> Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" isLoading={isProcessing}>{isProcessing ? 'Đang xử lý...' : 'Thêm người dùng'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} className="flex-1">Hủy</Button>
              </div>
            </form>
          )}

          {/* User Lists */}
          <div className="space-y-6">
            {/* Managers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-red-700 uppercase flex items-center gap-2">👔 Tổ trưởng & Tổ phó <span className="text-sm font-normal text-gray-500">({managers.length})</span></h3>
              </div>
              
              {managers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">Chưa có lãnh đạo nào.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {managers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-500 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <img src={user.avatarUrl} className="w-12 h-12 rounded-full border-2 border-red-300 shadow-sm" alt="" />
                        <div>
                          <p className="font-bold text-gray-800 text-base">{user.fullName}</p>
                          <p className="text-sm text-gray-600"><span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">@{user.username}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingUser(user)} disabled={isProcessing} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-bold disabled:opacity-50" title="Chỉnh sửa">✏️ Sửa</button>
                        <button onClick={() => handleResetPassword(user)} disabled={isProcessing} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-bold disabled:opacity-50" title="Đặt lại mật khẩu">🔄 Reset MK</button>
                        <button onClick={() => handleDeleteUser(user.id)} disabled={isProcessing} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-bold disabled:opacity-50" title="Xóa">🗑️ Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Officers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-green-700 uppercase flex items-center gap-2">👤 Cán bộ <span className="text-sm font-normal text-gray-500">({officers.length})</span></h3>
              </div>
              
              {officers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">Chưa có cán bộ nào.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {officers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <img src={user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-green-300 shadow-sm" alt="" />
                        <div>
                          <p className="font-bold text-sm text-gray-800">{user.fullName}</p>
                          <p className="text-xs text-gray-600"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">@{user.username}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingUser(user)} disabled={isProcessing} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-bold disabled:opacity-50" title="Sửa">✏️</button>
                        <button onClick={() => handleResetPassword(user)} disabled={isProcessing} className="px-2 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors text-xs font-bold disabled:opacity-50" title="Reset MK">🔄</button>
                        <button onClick={() => handleDeleteUser(user.id)} disabled={isProcessing} className="px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs font-bold disabled:opacity-50" title="Xóa">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200"><p className="text-2xl font-bold text-blue-700">{users.length}</p><p className="text-xs text-blue-600 font-bold uppercase mt-1">Tổng số</p></div>
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200"><p className="text-2xl font-bold text-red-700">{managers.length}</p><p className="text-xs text-red-600 font-bold uppercase mt-1">Lãnh đạo</p></div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200"><p className="text-2xl font-bold text-green-700">{officers.length}</p><p className="text-xs text-green-600 font-bold uppercase mt-1">Cán bộ</p></div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200"><p className="text-2xl font-bold text-yellow-700">{users.filter(u => u.isFirstLogin).length}</p><p className="text-xs text-yellow-600 font-bold uppercase mt-1">Chưa đổi MK</p></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button variant="secondary" onClick={onClose} className="w-full">Đóng</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
