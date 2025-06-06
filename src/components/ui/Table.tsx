import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  isSelectable?: boolean;
  selectedItems?: T[];
  onSelectedItemsChange?: (items: T[]) => void;
  isPaginated?: boolean;
  itemsPerPage?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isSelectable,
  selectedItems = [],
  onSelectedItemsChange,
  isPaginated,
  itemsPerPage = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [localSelectedItems, setLocalSelectedItems] = useState<T[]>(selectedItems);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedItems(selectedItems);
  }, [selectedItems]);

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectAll) {
      setLocalSelectedItems([]);
    } else {
      // When selecting all, only select items on the current page if paginated internally
      const itemsToSelect = isPaginated && !onPageChange // Check if table handles pagination internally
        ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : [...data];
      setLocalSelectedItems(itemsToSelect);
    }
    setSelectAll(!selectAll);

    if (onSelectedItemsChange) {
      // When selecting all, send only items on the current page if paginated internally
       const itemsToSelect = isPaginated && !onPageChange // Check if table handles pagination internally
        ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : [...data];
      onSelectedItemsChange(selectAll ? [] : itemsToSelect);
    }
  };

  const handleSelectItem = (item: T) => {
    const isSelected = localSelectedItems.some(
      selectedItem => keyExtractor(selectedItem) === keyExtractor(item)
    );

    let newSelectedItems: T[];

    if (isSelected) {
      newSelectedItems = localSelectedItems.filter(
        selectedItem => keyExtractor(selectedItem) !== keyExtractor(item)
      );
    } else {
      newSelectedItems = [...localSelectedItems, item];
    }

    setLocalSelectedItems(newSelectedItems);
    // Check selectAll status based on *all* data if external pagination, otherwise current page
    const totalItemsOnCurrentPage = isPaginated && !onPageChange ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length : data.length;
    setSelectAll(newSelectedItems.length === totalItemsOnCurrentPage);

    if (onSelectedItemsChange) {
      onSelectedItemsChange(newSelectedItems);
    }
  };

  // Handle pagination - internal if onPageChange is not provided
   const [internalCurrentPage, setInternalCurrentPage] = useState(currentPage);

   useEffect(() => {
     // Sync internal page if external page changes
     if (onPageChange) {
       setInternalCurrentPage(currentPage);
     }
   }, [currentPage, onPageChange]);

   const handleInternalPageChange = (page: number) => {
     if (page < 1 || page > totalPages) return;
     setInternalCurrentPage(page);
     if (onPageChange) {
       onPageChange(page);
     }
   };

  // Calculate pagination details
  const effectiveCurrentPage = onPageChange ? currentPage : internalCurrentPage; // Use external page if available
  const totalItemsCount = totalItems !== undefined ? totalItems : data.length;
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage);

  // Determine data to display: slice if paginated, otherwise use all data
  const displayData = isPaginated
    ? data.slice((effectiveCurrentPage - 1) * itemsPerPage, effectiveCurrentPage * itemsPerPage)
    : data;

  // Determine pagination control handler
  const paginationHandler = onPageChange || handleInternalPageChange;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {isSelectable && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
              )}

              {columns.map(column => (
                <th
                  key={column.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      className="group flex items-center space-x-1 focus:outline-none"
                      onClick={() => requestSort(column.id)}
                    >
                      <span>{column.header}</span>
                      <span className="flex flex-col">
                        {sortConfig && sortConfig.key === column.id ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )
                        ) : (
                          <span className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100">
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        )}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayData.length > 0 ? (
              displayData.map(item => {
                const isSelected = localSelectedItems.some(
                  selectedItem => keyExtractor(selectedItem) === keyExtractor(item)
                );

                return (
                  <tr
                    key={keyExtractor(item)}
                    className={`
                      ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {isSelectable && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item)}
                        />
                      </td>
                    )}

                    {columns.map(column => (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {column.accessor(item)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={isSelectable ? columns.length + 1 : columns.length}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPaginated && totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{(effectiveCurrentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(effectiveCurrentPage * itemsPerPage, totalItemsCount)}
                </span>{' '}
                of <span className="font-medium">{totalItemsCount}</span> results
              </p>
            </div>

            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginationHandler(1)}
                  disabled={effectiveCurrentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">First page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={() => paginationHandler(effectiveCurrentPage - 1)}
                  disabled={effectiveCurrentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page numbers - simplified rendering */}
                {[...Array(totalPages)].map((_, i) => {
                   const pageNum = i + 1;
                    // Render only a limited number of page buttons around the current page
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= effectiveCurrentPage - 2 && pageNum <= effectiveCurrentPage + 2)) {
                       return (
                         <button
                           key={pageNum}
                           onClick={() => paginationHandler(pageNum)}
                           aria-current={effectiveCurrentPage === pageNum ? 'page' : undefined}
                           className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${effectiveCurrentPage === pageNum ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-800 dark:border-blue-700 dark:text-blue-300' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                         >
                           {pageNum}
                         </button>
                       );
                    } else if (pageNum === effectiveCurrentPage - 3 || pageNum === effectiveCurrentPage + 3) {
                       return (
                         <span
                           key={pageNum}
                           className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
                         >
                           ...
                         </span>
                       );
                    }
                    return null;
                 }).filter(Boolean) /* Filter out null values */}

                <button
                  onClick={() => paginationHandler(effectiveCurrentPage + 1)}
                  disabled={effectiveCurrentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => paginationHandler(totalPages)}
                  disabled={effectiveCurrentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;