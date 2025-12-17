import * as XLSX from 'xlsx';
import type { Sheet, SheetMetadata } from './types';

// Color mapping utilities
const COLOR_MAP: Record<string, string> = {
  '0': '#000000',
  '1': '#FFFFFF',
  '2': '#FF0000',
  '3': '#00B050',
  '4': '#0070C0',
  '5': '#FFFF00',
  '6': '#FF00FF',
  '7': '#00FFFF',
  '8': '#000000',
  '9': '#FFFFFF',
  '10': '#9C0006',
  '11': '#FFC7CE',
  '12': '#9C6500',
  '13': '#FFEB9C',
  '14': '#9C0076',
  '15': '#C65911',
};

function getColorFromTheme(theme: number): string {
  const themeColors: Record<number, string> = {
    0: '#000000',
    1: '#FFFFFF',
    2: '#1F497D',
    3: '#EBEBEB',
    4: '#4472C4',
    5: '#ED7D31',
    6: '#A5A5A5',
    7: '#FFC7CE',
    8: '#C00000',
    9: '#FF6B6B',
  };
  return themeColors[theme] || '#000000';
}

function extractColor(fill: any): string | undefined {
  if (!fill) return undefined;

  if (fill.theme !== undefined) {
    return getColorFromTheme(fill.theme);
  }

  if (fill.rgb) {
    const rgb = fill.rgb.toString(16).padStart(8, '0');
    if (rgb.startsWith('FF')) {
      return '#' + rgb.substring(2);
    }
    return '#' + rgb;
  }

  if (fill.index !== undefined) {
    return COLOR_MAP[fill.index.toString()] || undefined;
  }

  return undefined;
}

function extractCellStyle(cell: XLSX.CellObject): any {
  if (!cell.s) return undefined;

  const style: any = {};
  const cellStyle = cell.s as any;

  if (cellStyle.font) {
    const font = cellStyle.font;
    if (font.b) style.bold = true;
    if (font.i) style.italic = true;
    if (font.u) style.underline = true;
    if (font.sz) style.fontSize = font.sz;
    if (font.name) style.fontFamily = font.name;
    if (font.color) {
      style.textColor = extractColor(font.color);
    }
  }

  if (cellStyle.fill) {
    style.bgColor = extractColor(cellStyle.fill);
  }

  if (cellStyle.alignment) {
    const alignment = cellStyle.alignment.horizontal;
    if (alignment === 'left' || alignment === 'general') {
      style.alignment = 'left';
    } else if (alignment === 'center') {
      style.alignment = 'center';
    } else if (alignment === 'right') {
      style.alignment = 'right';
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

// Worker message types
export interface ParseMetadataMessage {
  type: 'parseMetadata';
  data: ArrayBuffer;
}

export interface ParseSheetMessage {
  type: 'parseSheet';
  data: ArrayBuffer;
  sheetName: string;
}

export interface MetadataResponse {
  type: 'metadata';
  sheetMetadata: SheetMetadata[];
}

export interface SheetResponse {
  type: 'sheet';
  sheet: Sheet;
}

export interface ErrorResponse {
  type: 'error';
  error: string;
}

// Handle messages in worker context
self.onmessage = (e: MessageEvent<ParseMetadataMessage | ParseSheetMessage>) => {
  try {
    const { type } = e.data;

    if (type === 'parseMetadata') {
      const { data } = e.data as ParseMetadataMessage;
      const workbook = XLSX.read(new Uint8Array(data), {
        cellFormula: false,
        cellHTML: false,
        cellStyles: false, // Don't parse styles for metadata
        sheetRows: 1, // Only read first row to get structure
      });

      const sheetMetadata: SheetMetadata[] = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        return {
          name: sheetName,
          rowCount: range.e.r - range.s.r + 1,
          columnCount: range.e.c - range.s.c + 1,
        };
      });

      const response: MetadataResponse = {
        type: 'metadata',
        sheetMetadata,
      };

      self.postMessage(response);
    } else if (type === 'parseSheet') {
      const { data, sheetName } = e.data as ParseSheetMessage;
      const workbook = XLSX.read(new Uint8Array(data), {
        cellFormula: false,
        cellHTML: false,
        cellStyles: true,
        dateNF: 'yyyy-mm-dd',
        sheets: [sheetName], // Only parse the requested sheet
      });

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rows = [];

      for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
        const cells = [];

        for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
          const cellRef = XLSX.utils.encode_col(colIdx) + XLSX.utils.encode_row(rowIdx);
          const cellObj = worksheet[cellRef];

          let value: string | number | boolean | null = null;
          if (cellObj) {
            if (cellObj.t === 'd') {
              value = cellObj.v instanceof Date ? cellObj.v.toISOString() : cellObj.v;
            } else if (cellObj.t === 'b') {
              value = cellObj.v;
            } else if (cellObj.t === 'n') {
              value = cellObj.v;
            } else {
              value = cellObj.w || cellObj.v || null;
            }
          }

          const style = cellObj ? extractCellStyle(cellObj) : undefined;

          cells.push({
            value,
            style,
          });
        }

        rows.push({
          cells,
        });
      }

      const sheet: Sheet = {
        name: sheetName,
        rows,
        columnWidths: worksheet['!cols']?.map((col: any) => col?.wch || 10),
      };

      const response: SheetResponse = {
        type: 'sheet',
        sheet,
      };

      self.postMessage(response);
    }
  } catch (error) {
    const response: ErrorResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};
