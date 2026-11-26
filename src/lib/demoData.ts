import Papa from 'papaparse';
import type { Dataset } from './types';
import { detectColumnType } from './parser';

const RAW = `Employee ID,Name,Email,Department,Status,Join Date,Salary,Performance Score,Notes
E001,  john smith ,john.smith@gmail.com,Engineering,Present,2023-03-15,85000,4.2,
E002,SARAH JONES,sarah.jones@gmail,Marketing,Present,15/03/2023,72000,3.8,
E003,Michael Lee,michael.lee@yahoo.com,engineering,present,2023-04-01,NaN,4.5,
E004,Emma Watson,emma.watson@outlook.com,HR,Late,2022-11-23,68000,4.1,
E004,Emma Watson,emma.watson@outlook.com,HR,late,23-11-2022,68000,4.1,
E005,Robert Chen,robert.chen@gmail.com,Engineering,Absent,2021-07-19,95000,4.8,Senior engineer
E006,,linda.kim@gmail.com,Sales,presnt,2024-01-05,61000,3.2,
E007,David Okafor,david.okafor@gmail.com,Sales,Present,2023-09-30,63000,three,
E008, Priya Patel ,priya.patel@gmail.com,Marketing,PRESENT,2022-05-12,74000,3.9,
E009,James Wong,james.wong@gmail.com,Finance,Present,2020-08-25,102000,4.6,
E010,Ana Garcia,ana.garcia@gmail.com,HR,Absent,2023-12-01,58000,3.5,
E011,Thomas Muller,thomas.muller@gmail.com,Engineering,Present,2023-03-15,1500000,4.4,
E012,Lisa Brown,,Marketing,Present,2024-02-14,70000,3.7,
E013,Omar Hassan,omar.hassan@gmail.com,sales,Present,2023-06-18,65000,4.0,
E014,Grace Liu,grace.liu@gmail.com,Engineering,Late,2021-10-02,88000,4.3,
E015,Peter Novak,peter.novak@gmail.com,Finance,present,2022-08-08,79000,3.6,`;

export function buildDemoDataset(): Dataset {
  const result = Papa.parse<Record<string, string>>(RAW, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h, i) => h.trim() || `column_${i + 1}`,
  });
  const columns = result.meta.fields ?? [];
  const rows = result.data.map((r) => {
    const out: Record<string, string | null> = {};
    for (const c of columns) out[c] = r[c] === undefined || r[c] === '' || r[c] === null ? null : r[c];
    return out;
  });
  const columnTypes: Record<string, Dataset['columnTypes'][string]> = {};
  for (const c of columns) columnTypes[c] = detectColumnType(rows.map((r) => r[c]), c);
  return {
    id: crypto.randomUUID(),
    filename: 'demo_employee_dataset.csv',
    fileSize: RAW.length,
    columns,
    rows,
    columnTypes,
    uploadedAt: new Date().toISOString(),
  };
}
