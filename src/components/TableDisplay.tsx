import React from 'react';

interface TableDisplayProps {
  headers: string[];
  rows: any[][];
}

const TableDisplay: React.FC<TableDisplayProps> = ({ headers, rows }) => {
  console.log('TableDisplay Props:', { headers, rows }); // Add logging
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            {headers.map((header, index) => (
              <th key={index} className="border border-gray-300 dark:border-gray-600 p-2 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-600">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-gray-300 dark:border-gray-600 p-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableDisplay;