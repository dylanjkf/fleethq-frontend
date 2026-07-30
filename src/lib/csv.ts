import Papa from 'papaparse';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parses a CSV file client-side — no file bytes are ever sent to the API, only the already-mapped row data. */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({ headers: results.meta.fields ?? [], rows: results.data });
      },
      error: (error: Error) => reject(error),
    });
  });
}
