import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit, Trash, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Card from '../components/ui/Card';
import { Category } from '../types';
import { categoriesApi, exportToCsv } from '../services/api';
import { useToast } from '../context/ToastContext';

const Categories: React.FC = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // Categories data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
  });
  
  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch categories
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await categoriesApi.getAll();
        setCategories(data);
        setFilteredCategories(data);
      } catch (error: any) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          addToast('Session expired. Please log in again.', 'error');
          return;
        }
        console.error('Error fetching categories:', error);
        addToast('Failed to fetch categories', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [addToast, navigate]);
  
  // Filter categories when search changes
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = categories.filter(
        category => category.name.toLowerCase().includes(query)
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
    
    setCurrentPage(1); // Reset to first page when filters change
  }, [categories, searchQuery]);
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Open add category modal
  const openAddModal = () => {
    setFormData({
      name: '',
    });
    setIsAddModalOpen(true);
  };
  
  // Open edit category modal
  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
    });
    setIsEditModalOpen(true);
  };
  
  // Open delete category modal
  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      addToast('Please enter a category name', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isAddModalOpen) {
        const newCategory = await categoriesApi.create(formData as Omit<Category, 'id'>);
        setCategories([...categories, newCategory]);
        addToast('Category created successfully', 'success');
        setIsAddModalOpen(false);
      } else if (isEditModalOpen && selectedCategory) {
        const updatedCategory = await categoriesApi.update(selectedCategory.id, formData);
        setCategories(categories.map(c => c.id === selectedCategory.id ? updatedCategory : c));
        addToast('Category updated successfully', 'success');
        setIsEditModalOpen(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        addToast('Session expired. Please log in again.', 'error');
        return;
      }
      console.error('Error saving category:', error);
      addToast('Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    setIsDeleting(true);
    
    try {
      await categoriesApi.delete(selectedCategory.id);
      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      addToast('Category deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        addToast('Session expired. Please log in again.', 'error');
        return;
      }
      console.error('Error deleting category:', error);
      if (error.message && error.message.includes('in use')) {
        addToast('Cannot delete category that is in use by products', 'error');
      } else {
        addToast('Failed to delete category', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle export to CSV
  const handleExport = () => {
    const exportData = filteredCategories.map(category => ({
      ID: category.id,
      Name: category.name,
    }));
    
    exportToCsv(exportData, 'categories.csv');
    addToast('Categories exported to CSV', 'success');
  };
  
  // Table columns
  const columns = [
    {
      id: 'id',
      header: 'ID',
      accessor: (category: Category) => `#${category.id}`,
      sortable: true,
    },
    {
      id: 'name',
      header: 'Name',
      accessor: (category: Category) => category.name,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (category: Category) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(category);
            }}
            aria-label={`Edit ${category.name}`}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(category);
            }}
            aria-label={`Delete ${category.name}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <Layout title="Categories">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Input
              fullWidth
              placeholder="Search categories..."
              value={searchQuery}
              onChange={handleSearch}
              leftIcon={<Search size={18} className="text-gray-400" />}
              aria-label="Search categories"
            />
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="secondary"
              leftIcon={<Download size={18} />}
              onClick={handleExport}
            >
              Export
            </Button>
            
            <Button
              variant="primary"
              leftIcon={<PlusCircle size={18} />}
              onClick={openAddModal}
            >
              Add Category
            </Button>
          </div>
        </div>
        
        {/* Categories table */}
        <Card>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={filteredCategories}
              keyExtractor={(category) => category.id}
              isPaginated
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              totalItems={filteredCategories.length}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      </div>
      
      {/* Add Category Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Category Name"
              value={formData.name || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Edit Category Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Category: ${selectedCategory?.name}`}
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="name-edit"
              name="name"
              label="Category Name"
              value={formData.name || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Update Category
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default Categories;