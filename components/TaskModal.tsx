import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskStatus, User, UserRole, RecurringType } from '../types';
import { Button, Input, Select } from './UI';
import { GeminiService } from '../services/geminiService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
  users: User[];
  currentUser: User;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, onClose, onSave, initialTask, users, currentUser 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dispatchNumber, setDispatchNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [recurring, setRecurring] = useState<RecurringType>(RecurringType.NONE);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isImageScanning, setIsImageScanning] = useState(false);
  const [aiSuggestedSteps, setAiSuggestedSteps] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setDispatchNumber(initialTask.dispatchNumber || '');
      setIssuingAuthority(initialTask.issuingAuthority || '');
      setIssueDate(initialTask.issueDate || '');
      setAssigneeId(initialTask.assigneeId);
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate.split('T')[0]);
      setStatus(initialTask.status);
      setRecurring(initialTask.recurring || RecurringType.NONE);
      setAiSuggestedSteps(initialTask.aiSuggestedSteps || []);
    } else {
      resetForm();
    }
  }, [initialTask, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDispatchNumber('');
    setIssuingAuthority('');
    setIssueDate('');
    // Default assignee: Try to pick first Officer, fallback to anyone but me
    const defaultAssignee = users.find(u => u.role === UserRole.OFFICER)?.id || users[0]?.id;
    setAssigneeId(defaultAssignee);
    setPriority(TaskPriority.MEDIUM);
    setDueDate(new Date().toISOString().split('T')[0]);
    setStatus(TaskStatus.PENDING);
    setRecurring(RecurringType.NONE);
    setAiSuggestedSteps([]);
  };

  const handleGenerateAI = async () => {
    if (!title) return;
    setIsAiLoading(true);
    const result = await GeminiService.suggestTaskDetails(title);
    setDescription(prev => prev || result.description);
    setAiSuggestedSteps(result.steps);
    if (result.dueDate) {
      setDueDate(result.dueDate);
    }
    setIsAiLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImageScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await GeminiService.extractDocumentDetails(base64String, file.type);
        
        if (result.abstract) setTitle(result.abstract);
        if (result.dispatchNumber) setDispatchNumber(result.dispatchNumber);
        if (result.issuingAuthority) setIssuingAuthority(result.issuingAuthority);
        if (result.issueDate) setIssueDate(result.issueDate);
        if (result.summary) setDescription(result.summary);
        if (result.deadline) setDueDate(result.deadline);

        setIsImageScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsImageScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const task: Task = {
      id: initialTask ? initialTask.id : Date.now().toString(),
      title,
      description,
      dispatchNumber,
      issuingAuthority,
      issueDate,
      assigneeId,
      creatorId: initialTask ? initialTask.creatorId : currentUser.id,
      status,
      priority,
      recurring,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: initialTask ? initialTask.createdAt : Date.now(),
      aiSuggestedSteps
    };
    onSave(task);
  };

  if (!isOpen) return null;

  const isManager = currentUser.role === UserRole.MANAGER;

  // Generate options for Assignee Select
  // Sort: Managers first, then Officers.
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === b.role) return a.fullName.localeCompare(b.fullName);
    return a.role === UserRole.MANAGER ? -1 : 1;
  });

  const assigneeOptions = sortedUsers.map(u => ({
    value: u.id,
    label: `${u.role === UserRole.MANAGER ? '⭐ Lãnh đạo:' : '👤 Cán bộ:'} ${u.fullName}`
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] border-t-4 border-red-700">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-red-800 uppercase tracking-wide">
              {initialTask ? (isManager ? 'Cập nhật Công việc' : 'Chi tiết văn bản') : 'Giao việc / Xử lý văn bản'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Hệ thống hỗ trợ trích xuất thông tin tự động từ AI</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
             <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-red-900">Trích yếu văn bản / Tên công việc <span className="text-red-500">*</span></label>
                {isManager && (
                 <>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImageScanning}
                    className="text-xs flex items-center gap-1.5 text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-medium px-3 py-1.5 rounded-md shadow-md transition-all active:scale-95"
                  >
                    {isImageScanning ? '⏳ Đang quét...' : '📷 Quét ảnh văn bản'}
                  </button>
                 </>
               )}
             </div>
             <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-20 text-gray-800 font-medium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: V/v Thực hiện báo cáo..."
                required
                disabled={!isManager}
             />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-1">Thông tin văn bản gốc</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Số hiệu" value={dispatchNumber} onChange={(e) => setDispatchNumber(e.target.value)} disabled={!isManager} />
              <Input label="Cơ quan ban hành" value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} disabled={!isManager} />
              <Input type="date" label="Ngày ban hành" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={!isManager} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Người thực hiện"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={!isManager}
              options={assigneeOptions}
            />
            
            <Select
              label="Tính chất công việc"
              value={recurring}
              onChange={(e) => setRecurring(e.target.value as RecurringType)}
              disabled={!isManager}
              className="bg-purple-50 border-purple-200 text-purple-900"
              options={[
                { value: RecurringType.NONE, label: 'Công việc một lần' },
                { value: RecurringType.WEEKLY, label: 'Định kỳ Hàng Tuần' },
                { value: RecurringType.MONTHLY, label: 'Định kỳ Hàng Tháng' },
                { value: RecurringType.QUARTERLY, label: 'Định kỳ Hàng Quý' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Độ khẩn"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              disabled={!isManager}
              options={[
                { value: TaskPriority.LOW, label: 'Thường' },
                { value: TaskPriority.MEDIUM, label: 'Trung bình' },
                { value: TaskPriority.HIGH, label: 'Cao' },
                { value: TaskPriority.URGENT, label: 'Hỏa tốc' },
              ]}
            />
            <Input 
              type="date" 
              label="Hạn hoàn thành" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!isManager}
              required
              className="font-bold text-red-800"
            />
            <Select
              label="Trạng thái"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              options={[
                { value: TaskStatus.PENDING, label: 'Chờ xử lý' },
                { value: TaskStatus.IN_PROGRESS, label: 'Đang thực hiện' },
                { value: TaskStatus.COMPLETED, label: 'Hoàn thành' },
                { value: TaskStatus.CANCELLED, label: 'Trả lại/Hủy' },
              ]}
            />
          </div>

          <div>
            <div className="flex gap-2 items-center mb-1">
               <label className="block text-sm font-bold text-gray-700">Nội dung chỉ đạo / Ghi chú</label>
               {isManager && (
                 <button 
                  type="button" 
                  onClick={handleGenerateAI}
                  disabled={isAiLoading || !title} 
                  className="text-xs text-red-600 hover:text-red-800 font-bold uppercase tracking-wider"
                >
                  {isAiLoading ? '...' : '✨ AI Gợi ý nội dung & hạn'}
                </button>
               )}
            </div>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isManager}
              placeholder="Nhập nội dung chỉ đạo thực hiện..."
            />
          </div>

          {aiSuggestedSteps.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
              <h4 className="text-sm font-bold text-yellow-800 mb-2 flex items-center">
                <span className="mr-2">💡</span> Gợi ý các bước xử lý
              </h4>
              <ul className="list-disc list-inside text-sm text-yellow-900 space-y-1">
                {aiSuggestedSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          {(isManager || initialTask) && (
            <Button onClick={handleSubmit}>{initialTask ? 'Lưu cập nhật' : 'Giao việc'}</Button>
          )}
        </div>
      </div>
    </div>
  );
};