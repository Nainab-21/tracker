export type TaskStatus = 'In Progress' | 'Pending' | 'Completed' | 'Blocked' | 'Under Review' | 'Delayed';

export interface PlanningTask {
  id: number;
  block: string;
  project: string;
  category: string;
  task: string;
  description: string;
  team: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  days: number;
  progress: number;  // 0–100
  status: TaskStatus;
  notes: string | null;
  updated: string;
}

export interface PlanningData {
  tasks: PlanningTask[];
  lastFetched: string;
  snapshotDate?: string; // present only on previous-week responses
}

export type IssueStatus = 'Open' | 'Done';
export type IssueSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Issue {
  issueId: string;
  module: string;
  featureArea: string;
  component: string;
  issueType: string;
  issueGroup: IssueGroup;
  priority: number;
  severity: string;
  status: IssueStatus;
  description: string;
  progress: number;
  dateReported: string;
  reference: string | null;
  platform: string;
  tracking: string;
  requester: string;
  approval: boolean;
}

export type IssueGroup =
  | 'Issues and Bugs'
  | 'Current Feature Enhancement'
  | 'New Feature/Product Request';

export interface IssuesData {
  issues: Issue[];
  lastFetched: string;
  snapshotDate?: string; // present only on previous-week responses
}
