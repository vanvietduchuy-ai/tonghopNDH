import React from 'react';
import { TaskStatus, TaskPriority, RecurringType } from '../types';

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'danger' | 'secondary';
  className?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}> = ({ children, onClick, type = 'button', variant = 'primary', className = '', icon, isLoading }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 justify-center';
  const variantClasses = {
    primary: 'bg-red-700 hover:bg-red-800 text-white shadow-md hover:shadow-lg',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? '⏳' : icon}
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, required, disabled, className = '' }) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
      />
    </div>
  );
};

export const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const config = {
    [TaskStatus.PENDING]: { label: 'Chờ xử lý', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    [TaskStatus.IN_PROGRESS]: { label: 'Đang thực hiện', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    [TaskStatus.COMPLETED]: { label: 'Hoàn thành', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    [TaskStatus.CANCELLED]: { label: 'Đã hủy', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };
  const c = config[status];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>{c.label}</span>;
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const config = {
    [TaskPriority.LOW]: { label: 'Thấp', bg: 'bg-blue-50', text: 'text-blue-700' },
    [TaskPriority.MEDIUM]: { label: 'Trung bình', bg: 'bg-purple-50', text: 'text-purple-700' },
    [TaskPriority.HIGH]: { label: 'Cao', bg: 'bg-orange-50', text: 'text-orange-700' },
    [TaskPriority.URGENT]: { label: 'Khẩn cấp', bg: 'bg-red-50', text: 'text-red-700' }
  };
  const c = config[priority];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{c.label}</span>;
};

export const RecurringBadge: React.FC<{ type: RecurringType }> = ({ type }) => {
  if (type === RecurringType.NONE) return null;
  const config = {
    [RecurringType.WEEKLY]: { label: 'Hàng tuần', icon: '🔁' },
    [RecurringType.MONTHLY]: { label: 'Hàng tháng', icon: '📅' },
    [RecurringType.QUARTERLY]: { label: 'Hàng quý', icon: '📆' }
  };
  const c = config[type];
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">{c.icon} {c.label}</span>;
};
