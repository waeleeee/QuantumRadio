import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Package, Clock, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Order, OrderItem } from '../types';
import { ordersApi, exportToCsv, usersApi } from '../services/api';
import { useToast } from '../context/ToastContext';

const Orders: React.FC = () => {
  const { addToast } = useToast();
  
  // Orders data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dmjName, setDmjName] = useState<string>(''); // State to hold DMJ name
  const [newStatus, setNewStatus] = useState<'en_attente' | 'shipped' | 'delivered'>('en_attente');
  
  // Loading state
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await ordersApi.getAll();
        console.log('Fetched orders:', data); // Debug: Log the API response
        setOrders(data);
        setFilteredOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
        addToast('Failed to fetch orders', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [addToast]);
  
  // Fetch DMJ name when the View Order Modal opens
  useEffect(() => {
    const fetchDmjName = async () => {
      if (selectedOrder && isViewModalOpen) {
        try {
          const user = await usersApi.getById(selectedOrder.dmjId);
          const fullName = `${user.prenom} ${user.nom}`.trim();
          setDmjName(fullName || `User ${selectedOrder.dmjId}`);
        } catch (error) {
          console.error('Error fetching DMJ name:', error);
          setDmjName(`User ${selectedOrder.dmjId}`); // Fallback if user fetch fails
        }
      }
    };
    
    fetchDmjName();
  }, [selectedOrder, isViewModalOpen]);
  
  // Filter orders when search or status filter changes
  useEffect(() => {
    let result = [...orders];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        order => order.id.toString().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [orders, searchQuery, statusFilter]);
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };
  
  // Open view order modal
  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    console.log('Selected order for view:', order); // Debug: Log the selected order
    setIsViewModalOpen(true);
  };
  
  // Open status update modal
  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsStatusModalOpen(true);
  };
  
  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder) return;
    
    setIsUpdating(true);
    
    try {
      const updatedOrder = await ordersApi.updateStatus(selectedOrder.id, newStatus);
      
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      addToast('Order status updated successfully', 'success');
      setIsStatusModalOpen(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      addToast('Failed to update order status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle export to CSV
  const handleExport = () => {
    const exportData = filteredOrders.map(order => ({
      'Order ID': order.id,
      Date: new Date(order.date).toLocaleDateString(),
      Status: order.status,
      Total: `TND ${order.total.toFixed(2)}`,
    }));
    
    exportToCsv(exportData, 'orders.csv');
    addToast('Orders exported to CSV', 'success');
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate order total
  const calculateOrderTotal = (items: OrderItem[] = []) => {
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };
  
  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'warning';
      case 'shipped':
        return 'info';
      case 'delivered':
        return 'success';
      default:
        return 'default';
    }
  };
  
  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'Pending';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };
  
  // Table columns
  const columns = [
    {
      id: 'id',
      header: 'Order ID',
      accessor: (order: Order) => `#${order.id}`,
      sortable: true,
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (order: Order) => formatDate(order.date),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (order: Order) => (
        <Badge variant={getStatusVariant(order.status)}>
          {getStatusText(order.status)}
        </Badge>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      accessor: (order: Order) => `TND ${order.total.toFixed(2)}`,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (order: Order) => (
        <div className="flex space-x-2">
          <Button
            variant="info"
            size="sm"
            leftIcon={<Eye size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openViewModal(order);
            }}
            aria-label={`View order #${order.id}`}
          >
            View
          </Button>
          <Button
            variant={order.status === 'delivered' ? 'success' : 'warning'}
            size="sm"
            leftIcon={order.status === 'delivered' ? <CheckCircle size={16} /> : <Clock size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openStatusModal(order);
            }}
            aria-label={`Update status for order #${order.id}`}
          >
            Status
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <Layout title="Orders">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                fullWidth
                placeholder="Search by order ID..."
                value={searchQuery}
                onChange={handleSearch}
                leftIcon={<Search size={18} className="text-gray-400" />}
                aria-label="Search orders"
              />
            </div>
            
            <div className="w-40 hidden sm:block">
              <Select
                id="status-filter"
                label=""
                fullWidth
                value={statusFilter}
                onChange={handleStatusFilterChange}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'en_attente', label: 'Pending' },
                  { value: 'shipped', label: 'Shipped' },
                  { value: 'delivered', label: 'Delivered' },
                ]}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="secondary"
              leftIcon={<Download size={18} />}
              onClick={handleExport}
            >
              Export
            </Button>
          </div>
        </div>
        
        {/* Mobile status filter */}
        <div className="block sm:hidden">
          <Select
            id="status-filter-mobile"
            label="Filter by status"
            fullWidth
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'en_attente', label: 'Pending' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
            ]}
          />
        </div>
        
        {/* Orders table */}
        <Card>
          <Table
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            isPaginated
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
      
      {/* View Order Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => {
          setIsViewModalOpen(false);
          setDmjName(''); // Reset DMJ name when closing modal
        }}
        title={`Order #${selectedOrder?.id}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Date:</span> {formatDate(selectedOrder.date)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Status:</span> 
                    <Badge variant={getStatusVariant(selectedOrder.status)} className="ml-2">
                      {getStatusText(selectedOrder.status)}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Total:</span> TND {selectedOrder.total.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Admin Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Admin Name:</span> {dmjName || 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Order Items</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {item.product?.imageUrl && (
                                <img 
                                  src={item.product.imageUrl} 
                                  alt={item.product?.name || `Product ${item.productId}`}
                                  className="h-10 w-10 rounded object-cover mr-3"
                                  loading="lazy"
                                />
                              )}
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.product?.name || `Product ID: ${item.productId}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            TND {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            TND {(item.quantity * item.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No items found for this order
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                  <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-300">
                        Total:
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100">
                        TND {selectedOrder.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="primary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Update Status Modal */}
      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Order Status"
        size="sm"
      >
        {selectedOrder && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Update the status for order #{selectedOrder.id}
            </p>
            
            <div className="space-y-4">
              <Select
                id="status"
                label="Status"
                value={newStatus}
                onChange={(value) => setNewStatus(value as 'en_attente' | 'shipped' | 'delivered')}
                options={[
                  { value: 'en_attente', label: 'Pending' },
                  { value: 'shipped', label: 'Shipped' },
                  { value: 'delivered', label: 'Delivered' },
                ]}
                fullWidth
              />
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleStatusUpdate}
                  isLoading={isUpdating}
                  leftIcon={<CheckCircle size={18} />}
                >
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Orders;