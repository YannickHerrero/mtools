import * as XLSX from 'xlsx';
import type { ParsedExcelFile, Sheet, Row, Cell, CellStyle } from './types';

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
  // Standard Excel theme colors
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

  // Handle theme color
  if (fill.theme !== undefined) {
    return getColorFromTheme(fill.theme);
  }

  // Handle RGB color
  if (fill.rgb) {
    const rgb = fill.rgb.toString(16).padStart(8, '0');
    if (rgb.startsWith('FF')) {
      return '#' + rgb.substring(2);
    }
    return '#' + rgb;
  }

  // Handle indexed color
  if (fill.index !== undefined) {
    return COLOR_MAP[fill.index.toString()] || undefined;
  }

  return undefined;
}

function extractCellStyle(cell: XLSX.CellObject): CellStyle | undefined {
  if (!cell.s) return undefined;

  const style: CellStyle = {};
  const cellStyle = cell.s as any;

  // Font properties
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

  // Fill/background color
  if (cellStyle.fill) {
    style.bgColor = extractColor(cellStyle.fill);
  }

  // Alignment
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

  // Return undefined if no style properties were found
  return Object.keys(style).length > 0 ? style : undefined;
}

export function parseExcelFile(file: File): Promise<ParsedExcelFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          cellFormula: false,
          cellHTML: false,
          cellStyles: true,
          dateNF: 'yyyy-mm-dd',
        });

        const sheets: Sheet[] = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

          const rows: Row[] = [];

          for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
            const cells: Cell[] = [];

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

          return {
            name: sheetName,
            rows,
            columnWidths: worksheet['!cols']?.map((col: any) => col?.wch || 10),
          };
        });

        resolve({
          fileName: file.name,
          sheets,
          uploadedAt: new Date(),
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Get display value for a cell (formatted string)
export function getCellDisplayValue(cell: Cell): string {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'boolean') return cell.value ? 'TRUE' : 'FALSE';
  if (typeof cell.value === 'number') {
    // Format numbers with reasonable precision
    if (Number.isInteger(cell.value)) return cell.value.toString();
    return cell.value.toFixed(4).replace(/\.?0+$/, '');
  }
  return String(cell.value);
}
