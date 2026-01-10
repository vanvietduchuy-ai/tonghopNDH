import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Button, Input } from './UI';
import { MockDB } from '../services/mockDatabase';

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
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    role: UserRole.OFFICER,
    password: '123123'
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user: User = {
      id: `u${Date.now()}`,
      username: newUser.username,
      password: newUser.password,
      isFirstLogin: true,
      fullName: newUser.fullName,
      role: newUser.role,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.fullName)}&background=059669&color=fff`
    };

    await MockDB.addUser(user);
    await onUsersUpdated();
    
    setNewUser({
      username: '',
      fullName: '',
      role: UserRole.OFFICER,
      password: '123123'
    });
    setShowAddForm(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    await MockDB.deleteUser(userId);
    await onUsersUpdated();
  };

  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`Đặt lại mật khẩu về 123123 cho ${user.fullName}?`)) return;
    const updatedUser = { ...user, password: '123123', isFirstLogin: true };
    await MockDB.updateUser(updatedUser);
    await onUsersUpdated();
    alert('Đã đặt lại mật khẩu thành công!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-blue-800 text-white p-6 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase">👥 Quản lý nhân sự</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
        </div>
        
        <div className="p-6">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="mb-4">
              + Thêm người dùng mới
            </Button>
          ) : (
            <form onSubmit={handleAddUser} className="mb-6 p-4 bg-blue-50 rounded-lg space-y-3">
              <h3 className="font-bold text-blue-900">Thêm người dùng mới</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tên đăng nhập"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
                <Input
                  label="Họ và tên"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vai trò</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={UserRole.OFFICER}>Cán bộ</option>
                    <option value={UserRole.MANAGER}>Lãnh đạo</option>
                  </select>
                </div>
                <Input
                  label="Mật khẩu mặc định"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Thêm</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Hủy</Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">Danh sách người dùng</h3>
            
            {/* Managers */}
            <div>
              <h4 className="text-sm font-bold text-red-700 uppercase mb-2">Ban lãnh đạo</h4>
              <div className="space-y-2">
                {users.filter(u => u.role === UserRole.MANAGER).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full" alt="" />
                      <div>
                        <p className="font-bold text-gray-800">{user.fullName}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        🔄 Reset MK
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Officers */}
            <div>
              <h4 className="text-sm font-bold text-green-700 uppercase mb-2">Cán bộ</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {users.filter(u => u.role === UserRole.OFFICER).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                      <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                      <div>
                        <p className="font-bold text-sm text-gray-800">{user.fullName}</p>
                        <p className="text-[10px] text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button variant="secondary" onClick={onClose} className="w-full">
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
