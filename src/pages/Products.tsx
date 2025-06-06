import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit, Trash, Download, Filter, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Card from '../components/ui/Card';
import { Product, Category } from '../types';
import { productsApi, categoriesApi, exportToCsv } from '../services/api';
import { useToast } from '../context/ToastContext';

const Products: React.FC = () => {
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [sortField, setSortField] = useState<keyof Product>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    categoryId: 1,
    imageUrl: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          productsApi.getAll(),
          categoriesApi.getAll(),
        ]);
        setProducts(productsData);
        setFilteredProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        addToast('Failed to fetch data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  useEffect(() => {
    let result = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== '') {
      result = result.filter((product) => product.categoryId === categoryFilter);
    }

    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, searchQuery, categoryFilter, sortField, sortDirection]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (field: keyof Product) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else if (name === 'categoryId') {
      setFormData({ ...formData, [name]: parseInt(value) || 1 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, imageUrl: e.target.files[0] });
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      categoryId: categories[0]?.id || 1,
      imageUrl: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    if (selectedProducts.length === 0) {
      addToast('No products selected', 'warning');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || formData.price === undefined || formData.price < 0) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAddModalOpen) {
        const newProduct = await productsApi.create(formData as Omit<Product, 'id'>);
        setProducts([...products, newProduct]);
        addToast('Product created successfully', 'success');
        setIsAddModalOpen(false);
      } else if (isEditModalOpen && selectedProduct) {
        const updatedProduct = await productsApi.update(selectedProduct.id, formData);
        setProducts(products.map((p) => (p.id === selectedProduct.id ? updatedProduct : p)));
        addToast('Product updated successfully', 'success');
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      addToast('Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsDeleting(true);
    try {
      await productsApi.delete(selectedProduct.id);
      setProducts(products.filter((p) => p.id !== selectedProduct.id));
      addToast('Product deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting product:', error);
      addToast('Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    setIsDeleting(true);
    try {
      const ids = selectedProducts.map((p) => p.id);
      await productsApi.deleteMany(ids);
      setProducts(products.filter((p) => !ids.includes(p.id)));
      setSelectedProducts([]);
      addToast(`${ids.length} products deleted successfully`, 'success');
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting products:', error);
      addToast('Failed to delete products', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredProducts.map((product) => ({
      ID: product.id,
      Name: product.name,
      Description: product.description,
      Price: `TND ${product.price.toFixed(2)}`,
      Category: product.category?.name || '',
    }));
    exportToCsv(exportData, 'products.csv');
    addToast('Products exported to CSV', 'success');
  };

  const columns = [
    {
      id: 'id',
      header: 'ID',
      accessor: (product: Product) => `#${product.id}`,
      sortable: true,
    },
    {
      id: 'imageUrl',
      header: 'Image',
      accessor: (product: Product) => (
        <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
          {product.imageUrl && typeof product.imageUrl === 'string' ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              No image
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessor: (product: Product) => product.name,
      sortable: true,
    },
    {
      id: 'categoryId',
      header: 'Category',
      accessor: (product: Product) => (
        <span>{product.category?.name || `Category ${product.categoryId}`}</span>
      ),
      sortable: true,
    },
    {
      id: 'price',
      header: 'Price',
      accessor: (product: Product) => `TND ${product.price.toFixed(2)}`,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (product: Product) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(product);
            }}
            aria-label={`Edit ${product.name}`}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(product);
            }}
            aria-label={`Delete ${product.name}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Products">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                fullWidth
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearch}
                leftIcon={<Search size={18} className="text-gray-400" />}
                aria-label="Search products"
              />
            </div>
            <div className="w-40 hidden sm:block">
              <Select
                id="category-filter"
                label=""
                fullWidth
                value={categoryFilter === '' ? '' : categoryFilter.toString()}
                onChange={(value) => setCategoryFilter(value === '' ? '' : parseInt(value))}
                options={[{ value: '', label: 'All Categories' }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {selectedProducts.length > 0 && (
              <Button
                variant="danger"
                leftIcon={<Trash size={18} />}
                onClick={openBulkDeleteModal}
              >
                Delete ({selectedProducts.length})
              </Button>
            )}
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
              Add Product
            </Button>
          </div>
        </div>
        <div className="block sm:hidden">
          <Select
            id="category-filter-mobile"
            label="Filter by category"
            fullWidth
            value={categoryFilter === '' ? '' : categoryFilter.toString()}
            onChange={(value) => setCategoryFilter(value === '' ? '' : parseInt(value))}
            options={[{ value: '', label: 'All Categories' }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]}
          />
        </div>
        <Card>
          <Table
            columns={columns}
            data={filteredProducts}
            keyExtractor={(product) => product.id}
            isSelectable
            selectedItems={selectedProducts}
            onSelectedItemsChange={setSelectedProducts}
            isPaginated
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Product">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Product Name"
              value={formData.name || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Textarea
              id="description"
              name="description"
              label="Description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              fullWidth
              required
            />
            <Input
              id="price"
              name="price"
              label="Price (TND)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price?.toString() || '0'}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Select
              id="categoryId"
              name="categoryId"
              label="Category"
              value={formData.categoryId?.toString() || ''}
              onChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              fullWidth
              required
            />
            <Input
              id="image"
              name="image"
              label="Product Image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              fullWidth
            />
            {formData.imageUrl && typeof formData.imageUrl === 'string' && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Image Preview:</p>
                <div className="h-32 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+Image';
                    }}
                  />
                </div>
              </div>
            )}
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
              leftIcon={<CheckCircle size={18} />}
            >
              Create Product
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Product: ${selectedProduct?.name}`}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="name-edit"
              name="name"
              label="Product Name"
              value={formData.name || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Textarea
              id="description-edit"
              name="description"
              label="Description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              fullWidth
              required
            />
            <Input
              id="price-edit"
              name="price"
              label="Price (TND)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price?.toString() || '0'}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Select
              id="categoryId-edit"
              name="categoryId"
              label="Category"
              value={formData.categoryId?.toString() || ''}
              onChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              fullWidth
              required
            />
            <Input
              id="image-edit"
              name="image"
              label="Product Image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              fullWidth
            />
            {formData.imageUrl && typeof formData.imageUrl === 'string' && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Image Preview:</p>
                <div className="h-32 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+Image';
                    }}
                  />
                </div>
              </div>
            )}
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
              leftIcon={<CheckCircle size={18} />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Products"
        message={`Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default Products;