import React, { useState, useEffect } from 'react';
import { Task, User, UserRole, TaskStatus, TaskPriority, RecurringType } from '../types';
import { Button, Input } from './UI';
import { GeminiService } from '../services/geminiService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask: Task | null;
  users: User[];
  currentUser: User;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask, users, currentUser }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dispatchNumber: '',
    issuingAuthority: '',
    issueDate: '',
    assigneeId: '',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    recurring: RecurringType.NONE,
    dueDate: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setFormData({
        title: initialTask.title,
        description: initialTask.description,
        dispatchNumber: initialTask.dispatchNumber || '',
        issuingAuthority: initialTask.issuingAuthority || '',
        issueDate: initialTask.issueDate || '',
        assigneeId: initialTask.assigneeId,
        status: initialTask.status,
        priority: initialTask.priority,
        recurring: initialTask.recurring || RecurringType.NONE,
        dueDate: initialTask.dueDate.split('T')[0],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        dispatchNumber: '',
        issuingAuthority: '',
        issueDate: '',
        assigneeId: users.find(u => u.role === UserRole.OFFICER)?.id || '',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        recurring: RecurringType.NONE,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      });
    }
  }, [initialTask, users]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      const mimeType = file.type;
      
      const extracted = await GeminiService.extractDocumentDetails(base64, mimeType);
      setFormData(prev => ({
        ...prev,
        title: extracted.abstract || prev.title,
        description: extracted.summary || prev.description,
        dispatchNumber: extracted.dispatchNumber || prev.dispatchNumber,
        issuingAuthority: extracted.issuingAuthority || prev.issuingAuthority,
        issueDate: extracted.issueDate || prev.issueDate,
        dueDate: extracted.deadline || prev.dueDate,
      }));
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAISuggest = async () => {
    if (!formData.title) return;
    setIsProcessing(true);
    const result = await GeminiService.suggestTaskDetails(formData.title);
    setFormData(prev => ({
      ...prev,
      description: result.description,
      dueDate: result.dueDate || prev.dueDate,
    }));
    setIsProcessing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const task: Task = {
      id: initialTask?.id || `t${Date.now()}`,
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString(),
      creatorId: currentUser.id,
      createdAt: initialTask?.createdAt || Date.now(),
    };
    onSave(task);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-red-800 text-white p-6 rounded-t-xl">
          <h2 className="text-xl font-bold uppercase">{initialTask ? 'Cập nhật công việc' : 'Giao việc mới'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {currentUser.role === UserRole.MANAGER && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-bold text-blue-900 mb-2">📷 Tải ảnh văn bản (AI tự động trích xuất)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
            </div>
          )}

          <Input
            label="Trích yếu / Tiêu đề công việc"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số hiệu"
              value={formData.dispatchNumber}
              onChange={(e) => setFormData({ ...formData, dispatchNumber: e.target.value })}
            />
            <Input
              label="Cơ quan ban hành"
              value={formData.issuingAuthority}
              onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngày ban hành"
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            />
            <Input
              label="Hạn hoàn thành"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung chỉ đạo</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
              required
            />
            {currentUser.role === UserRole.MANAGER && (
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={!formData.title || isProcessing}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                ✨ Gợi ý bằng AI
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Giao cho</label>
              <select
                value={formData.assigneeId}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                disabled={currentUser.role === UserRole.OFFICER}
              >
                {users.filter(u => u.role === UserRole.OFFICER).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Độ ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={TaskPriority.LOW}>Thấp</option>
                <option value={TaskPriority.MEDIUM}>Trung bình</option>
                <option value={TaskPriority.HIGH}>Cao</option>
                <option value={TaskPriority.URGENT}>Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Trạng thái</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={TaskStatus.PENDING}>Chờ xử lý</option>
                <option value={TaskStatus.IN_PROGRESS}>Đang thực hiện</option>
                <option value={TaskStatus.COMPLETED}>Hoàn thành</option>
                <option value={TaskStatus.CANCELLED}>Đã hủy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Lặp lại</label>
              <select
                value={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.value as RecurringType })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={currentUser.role === UserRole.OFFICER}
              >
                <option value={RecurringType.NONE}>Không</option>
                <option value={RecurringType.WEEKLY}>Hàng tuần</option>
                <option value={RecurringType.MONTHLY}>Hàng tháng</option>
                <option value={RecurringType.QUARTERLY}>Hàng quý</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" isLoading={isProcessing}>
              {initialTask ? 'Cập nhật' : 'Tạo công việc'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
