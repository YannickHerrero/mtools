import type { ParsedExcelFile, Sheet, Cell } from './types';

// Lazy parsing using Web Worker
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./excel-worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

export function parseExcelFile(file: File): Promise<ParsedExcelFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result as ArrayBuffer;
        
        // Parse only metadata using worker
        const worker = getWorker();
        
        worker.onmessage = (event) => {
          if (event.data.type === 'metadata') {
            resolve({
              fileName: file.name,
              fileData: fileData.slice(0), // Clone the buffer
              sheetMetadata: event.data.sheetMetadata,
              uploadedAt: new Date(),
            });
          } else if (event.data.type === 'error') {
            reject(new Error(event.data.error));
          }
        };

        worker.onerror = (error) => {
          reject(error);
        };

        worker.postMessage({
          type: 'parseMetadata',
          data: fileData,
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

// Parse a specific sheet lazily
export function parseSheet(fileData: ArrayBuffer, sheetName: string): Promise<Sheet> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sheet') {
        worker.removeEventListener('message', handleMessage);
        resolve(event.data.sheet);
      } else if (event.data.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error));
      }
    };

    worker.addEventListener('message', handleMessage);

    worker.onerror = (error) => {
      worker.removeEventListener('message', handleMessage);
      reject(error);
    };

    worker.postMessage({
      type: 'parseSheet',
      data: fileData,
      sheetName,
    });
  });
}

// Cleanup worker
export function cleanupWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
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
