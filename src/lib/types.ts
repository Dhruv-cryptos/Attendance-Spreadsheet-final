export type CellValue = string | number | null;

export interface Dataset {
  id: string;
  filename: string;
  fileSize: number;
  columns: string[];
  rows: Record<string, CellValue>[];
  columnTypes: Record<string, ColumnType>;
  uploadedAt: string;
}

export type ColumnType = 'number' | 'date' | 'email' | 'text' | 'categorical';

export type Severity = 'critical' | 'warning' | 'info';

export type IssueType =
  | 'missing_value'
  | 'duplicate_row'
  | 'duplicate_id'
  | 'invalid_email'
  | 'invalid_date'
  | 'inconsistent_date_format'
  | 'inconsistent_text_format'
  | 'invalid_numeric'
  | 'outlier'
  | 'inconsistent_category'
  | 'empty_column'
  | 'whitespace'
  | 'inconsistent_status';

export interface Issue {
  id: string;
  type: IssueType;
  column: string;
  rowIndex: number; // -1 for dataset-level issues
  originalValue: CellValue | null;
  suggestedValue?: CellValue | null;
  reason: string;
  severity: Severity;
  confidence: number; // 0-1
  autoFixable: boolean;
}

export interface QualityScore {
  overall: number;
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
  explanation: string;
}

export interface AnalysisResult {
  datasetId: string;
  issues: Issue[];
  score: QualityScore;
  severityCounts: Record<Severity, number>;
  typeCounts: Record<IssueType, number>;
  analyzedAt: string;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  score: number;
  issueCount: number;
  resolvedCount: number;
  isDemo: boolean;
  analyzedAt: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  label: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  fallback?: boolean;
}
