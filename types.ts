export enum UserRole {
  MANAGER = 'MANAGER',
  OFFICER = 'OFFICER'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum RecurringType {
  NONE = 'NONE',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY'
}

export interface User {
  id: string;
  username: string;
  password?: string; // New field
  isFirstLogin?: boolean; // New field
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  
  dispatchNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  
  recurring?: RecurringType; // New field for recurring tasks

  assigneeId: string;
  creatorId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: number;
  aiSuggestedSteps?: string[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}