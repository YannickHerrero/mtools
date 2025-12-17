export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: 'left' | 'center' | 'right';
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface Cell {
  value: string | number | boolean | null;
  style?: CellStyle;
  merged?: boolean;
}

export interface Row {
  height?: number;
  cells: Cell[];
}

export interface Sheet {
  name: string;
  rows: Row[];
  columnWidths?: number[];
  frozenRows?: number;
  frozenColumns?: number;
}

export interface ParsedExcelFile {
  fileName: string;
  sheets: Sheet[];
  uploadedAt: Date;
}

// File size limit: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.macroEnabled.12',
];

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb'];
