import type { InsertExpense } from "@shared/schema";

export interface CsvRow {
  [key: string]: string;
}

export function parseCsvFile(file: File): Promise<InsertExpense[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const expenses = parseCsvText(csvText);
        resolve(expenses);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCsvText(csvText: string): InsertExpense[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSVファイルにデータが含まれていません');
  }
  
  // Remove BOM if present
  const cleanedCsvText = csvText.replace(/^\uFEFF/, '');
  const cleanedLines = cleanedCsvText.trim().split('\n');
  
  const headers = parseCSVLine(cleanedLines[0]);
  const dataLines = cleanedLines.slice(1);
  
  // Validate headers
  const requiredHeaders = ['日付', '科目', '金額', '使用者'];
  const hasRequiredHeaders = requiredHeaders.every(header => 
    headers.some(h => h.includes(header))
  );
  
  if (!hasRequiredHeaders) {
    throw new Error(`CSVファイルのヘッダーが正しくありません。必要な列: ${requiredHeaders.join(', ')}`);
  }
  
  const expenses: InsertExpense[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      const rowData: CsvRow = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      const expense = convertRowToExpense(rowData, i + 2); // +2 for header and 0-based index
      if (expense) {
        expenses.push(expense);
      }
    } catch (error) {
      console.warn(`行 ${i + 2} をスキップしました:`, error);
    }
  }
  
  return expenses;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function convertRowToExpense(row: CsvRow, lineNumber: number): InsertExpense | null {
  try {
    // Find column values with flexible header matching
    const date = findColumnValue(row, ['日付', 'date']);
    const category = findColumnValue(row, ['科目', 'category']);  
    const amountStr = findColumnValue(row, ['金額', 'amount']);
    const user = findColumnValue(row, ['使用者', 'user']);
    const description = findColumnValue(row, ['説明', 'description', '備考']) || '';
    
    if (!date || !category || !amountStr || !user) {
      throw new Error('必須項目が不足しています');
    }
    
    // Parse and validate date
    const parsedDate = parseDate(date);
    if (!parsedDate) {
      throw new Error(`無効な日付形式: ${date}`);
    }
    
    // Parse amount (remove currency symbols and commas)
    const cleanAmountStr = amountStr.replace(/[¥,$\s]/g, '');
    const amount = parseInt(cleanAmountStr);
    
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`無効な金額: ${amountStr}`);
    }
    
    return {
      date: parsedDate,
      category: category.trim(),
      amount,
      user: user.trim(),
      description: description.trim(),
    };
  } catch (error) {
    throw new Error(`行 ${lineNumber}: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

function findColumnValue(row: CsvRow, possibleKeys: string[]): string | undefined {
  for (const key of possibleKeys) {
    // Exact match
    if (row[key]) return row[key];
    
    // Partial match (case insensitive)
    const foundKey = Object.keys(row).find(k => 
      k.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(k.toLowerCase())
    );
    
    if (foundKey && row[foundKey]) {
      return row[foundKey];
    }
  }
  return undefined;
}

function parseDate(dateStr: string): string | null {
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD  
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      
      if (format.source.startsWith('^(\\d{4})')) {
        // Year first
        [, year, month, day] = match;
      } else {
        // Month/Day first  
        [, month, day, year] = match;
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Validate date
      if (date.getFullYear() == parseInt(year) &&
          date.getMonth() == parseInt(month) - 1 &&
          date.getDate() == parseInt(day)) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return null;
}
