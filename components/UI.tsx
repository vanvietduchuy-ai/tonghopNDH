import React from 'react';
import { TaskPriority, TaskStatus, RecurringType } from '../types';

// --- Badges ---
export const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const styles = {
    [TaskStatus.PENDING]: 'bg-gray-100 text-gray-700 border-gray-300 shadow-sm',
    [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm',
    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-300 shadow-sm',
    [TaskStatus.CANCELLED]: 'bg-red-50 text-red-700 border-red-200 shadow-sm',
  };
  
  const labels = {
    [TaskStatus.PENDING]: 'Chờ xử lý',
    [TaskStatus.IN_PROGRESS]: 'Đang thực hiện',
    [TaskStatus.COMPLETED]: 'Hoàn thành',
    [TaskStatus.CANCELLED]: 'Đã hủy',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const RecurringBadge: React.FC<{ type?: RecurringType }> = ({ type }) => {
  if (!type || type === RecurringType.NONE) return null;
  
  const labels = {
    [RecurringType.WEEKLY]: 'Hàng tuần',
    [RecurringType.MONTHLY]: 'Hàng tháng',
    [RecurringType.QUARTERLY]: 'Hàng quý',
    [RecurringType.NONE]: '',
  };

  return (
    <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-800 border border-purple-200 shadow-sm flex items-center gap-1">
      <span>🔄</span> {labels[type]}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const styles = {
    [TaskPriority.LOW]: 'text-gray-600 bg-gray-50 border-gray-200',
    [TaskPriority.MEDIUM]: 'text-blue-700 bg-blue-50 border-blue-200',
    [TaskPriority.HIGH]: 'text-orange-700 bg-orange-50 border-orange-200',
    [TaskPriority.URGENT]: 'text-red-700 bg-red-50 border-red-200 font-extrabold',
  };
  
  const labels = {
    [TaskPriority.LOW]: 'Thấp',
    [TaskPriority.MEDIUM]: 'Trung bình',
    [TaskPriority.HIGH]: 'Cao',
    [TaskPriority.URGENT]: 'Khẩn cấp',
  };

  return (
    <span className={`text-xs uppercase px-2 py-0.5 rounded border ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', className = '', isLoading, icon, ...props 
}) => {
  // 3D effect: shadow + active press
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none transform active:translate-y-0.5 active:shadow-none";
  
  const variants = {
    // Red/Gold Theme Primary
    primary: "bg-gradient-to-b from-red-700 to-red-800 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 border-b-2 border-red-900",
    secondary: "bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 hover:shadow border-b-2 border-gray-200",
    outline: "border-2 border-red-700 text-red-700 hover:bg-red-50",
    danger: "bg-gradient-to-b from-gray-700 to-gray-800 text-white shadow-md hover:from-gray-600 hover:to-gray-700 border-b-2 border-gray-900",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} disabled={isLoading} {...props}>
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="mr-2 -ml-1">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-2 border rounded-lg shadow-inner bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${error ? 'border-red-300' : 'border-gray-300'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
      <select
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};