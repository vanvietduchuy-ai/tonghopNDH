import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Button, Input, Select } from './UI';
import { MockDB } from '../services/mockDatabase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onUsersUpdated: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
  isOpen, onClose, users, onUsersUpdated 
}) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.OFFICER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView('LIST');
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setRole(UserRole.OFFICER);
    setEditingUser(null);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.fullName);
    setRole(user.role);
    setPassword(''); // Don't show current password
    setView('FORM');
  };

  const handleAddClick = () => {
    resetForm();
    setView('FORM');
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cán bộ này khỏi hệ thống?')) {
      await MockDB.deleteUser(id);
      onUsersUpdated();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        const updatedUser: User = {
          ...editingUser,
          username,
          fullName,
          role,
          // Only update password if provided, else keep old
          password: password ? password : editingUser.password,
          // If password changed by admin, force first login again? Maybe not for now.
          avatarUrl: editingUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`
        };
        await MockDB.updateUser(updatedUser);
      } else {
        // Create new user
        // Basic check for unique username
        if (users.some(u => u.username === username)) {
          alert('Tên đăng nhập đã tồn tại!');
          setIsSubmitting(false);
          return;
        }

        const newUser: User = {
          id: `u${Date.now()}`,
          username,
          password: password || '123123', // Default if empty
          isFirstLogin: true,
          fullName,
          role,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`
        };
        await MockDB.addUser(newUser);
      }
      onUsersUpdated();
      setView('LIST');
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border-t-4 border-blue-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-blue-900 uppercase tracking-wide">
              {view === 'LIST' ? 'Quản lý Nhân sự' : (editingUser ? 'Cập nhật thông tin' : 'Thêm cán bộ mới')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Quản trị viên hệ thống</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {view === 'LIST' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">Tổng số: <b>{users.length}</b> tài khoản</div>
                <Button onClick={handleAddClick} icon={<span>+</span>}>Thêm cán bộ mới</Button>
              </div>
              
              <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Họ và tên</th>
                      <th className="px-4 py-3">Tên đăng nhập</th>
                      <th className="px-4 py-3">Chức vụ</th>
                      <th className="px-4 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-3">
                          <img src={u.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                          {u.fullName}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">{u.username}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.MANAGER ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {u.role === UserRole.MANAGER ? 'Lãnh đạo' : 'Cán bộ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                           <button onClick={() => handleEditClick(u)} className="text-blue-600 hover:underline font-medium">Sửa</button>
                           <button onClick={() => handleDeleteClick(u.id)} className="text-red-600 hover:underline font-medium">Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="col-span-2">
                   <Input 
                     label="Họ và tên" 
                     value={fullName} 
                     onChange={e => setFullName(e.target.value)} 
                     required 
                     placeholder="Nhập họ và tên đầy đủ"
                   />
                 </div>
                 
                 <Input 
                   label="Tên đăng nhập" 
                   value={username} 
                   onChange={e => setUsername(e.target.value)} 
                   required 
                   placeholder="Viết liền không dấu"
                   disabled={!!editingUser} // Prevent changing username for simplicity
                 />
                 
                 <Select
                   label="Chức vụ"
                   value={role}
                   onChange={e => setRole(e.target.value as UserRole)}
                   options={[
                     { value: UserRole.OFFICER, label: 'Cán bộ' },
                     { value: UserRole.MANAGER, label: 'Lãnh đạo / Quản lý' }
                   ]}
                 />

                 <div className="col-span-2 border-t pt-4 mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      {editingUser ? 'Đổi mật khẩu (Để trống nếu không đổi)' : 'Mật khẩu khởi tạo'}
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-inner bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={editingUser ? '******' : 'Mặc định: 123123'}
                    />
                    {!editingUser && <p className="text-xs text-gray-500 mt-1">Mặc định là 123123 nếu để trống.</p>}
                 </div>
               </div>

               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                 <Button type="button" variant="secondary" onClick={() => setView('LIST')}>Hủy bỏ</Button>
                 <Button type="submit" isLoading={isSubmitting}>
                   {editingUser ? 'Lưu thay đổi' : 'Thêm mới'}
                 </Button>
               </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};