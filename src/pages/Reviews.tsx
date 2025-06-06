import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Star, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';

// Types
interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  type: 'product' | 'shop';
  productId?: number;
  productName?: string;
}

const Reviews: React.FC = () => {
  const { addToast } = useToast();
  
  // Reviews data state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  
  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        // Fetch product reviews
        const productReviewsResponse = await fetch('http://localhost/quantum_radio_api/index.php/avis_produit', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const productReviews = await productReviewsResponse.json();
        
        // Fetch shop reviews
        const shopReviewsResponse = await fetch('http://localhost/quantum_radio_api/index.php/avis_shop', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const shopReviews = await shopReviewsResponse.json();
        
        // Combine and format reviews
        const formattedReviews = [
          ...productReviews.map((review: any) => ({
            id: review.id || review.avis_produit_id || review.avis_id,
            userId: review.dmj_id,
            userName: `${review.prenom_dmj || ''} ${review.nom_dmj || ''}`.trim() || 'Unknown User',
            rating: review.note || 0,
            comment: review.commentaire || '',
            type: 'product' as const,
            productId: review.produit_id,
            productName: review.nom_produit || `Product ${review.produit_id}`
          })),
          ...shopReviews.map((review: any) => ({
            id: review.id || review.avis_shop_id || review.avis_id,
            userId: review.dmj_id,
            userName: `${review.prenom_dmj || ''} ${review.nom_dmj || ''}`.trim() || 'Unknown User',
            rating: review.note || 0,
            comment: review.commentaire || '',
            type: 'shop' as const
          }))
        ];
        
        setReviews(formattedReviews);
        setFilteredReviews(formattedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        addToast('Failed to fetch reviews', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [addToast]);
  
  // Filter reviews when search or filters change
  useEffect(() => {
    let result = [...reviews];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        review => 
          review.userName.toLowerCase().includes(query) ||
          review.comment.toLowerCase().includes(query) ||
          (review.productName && review.productName.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (typeFilter) {
      result = result.filter(review => review.type === typeFilter);
    }
    
    // Apply rating filter
    if (ratingFilter) {
      result = result.filter(review => review.rating.toString() === ratingFilter);
    }
    
    setFilteredReviews(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [reviews, searchQuery, typeFilter, ratingFilter]);
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle type filter change
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
  };
  
  // Handle rating filter change
  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value);
  };
  
  // Open view review modal
  const openViewModal = (review: Review) => {
    setSelectedReview(review);
    setIsViewModalOpen(true);
  };
  
  // Handle delete review
  const handleDeleteReview = async (review: Review) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const endpoint = review.type === 'product' 
        ? `http://localhost/quantum_radio_api/index.php/avis_produit/${review.id}`
        : `http://localhost/quantum_radio_api/index.php/avis_shop/${review.id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setReviews(reviews.filter(r => r.id !== review.id));
        addToast('Review deleted successfully', 'success');
      } else {
        throw new Error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      addToast('Failed to delete review', 'error');
    }
  };
  
  // Handle export to CSV
  const handleExport = () => {
    const exportData = filteredReviews.map(review => ({
      'Review ID': review.id,
      'Type': review.type === 'product' ? 'Product Review' : 'Shop Review',
      'User': review.userName,
      'Rating': review.rating,
      'Comment': review.comment,
      'Date': new Date(review.createdAt).toLocaleDateString(),
      'Product': review.productName || 'N/A'
    }));
    
    // Convert to CSV and download
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(exportData[0]).join(",") + "\n"
      + exportData.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reviews.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addToast('Reviews exported to CSV', 'success');
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
  
  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            size={16}
            className={index < rating ? "text-yellow-400 fill-current" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };
  
  // Table columns
  const columns = [
    {
      id: 'id',
      header: 'Review ID',
      accessor: (review: Review) => {
        const id = review.id;
        return id ? `#${id}` : 'N/A';
      },
      sortable: true,
    },
    {
      id: 'type',
      header: 'Type',
      accessor: (review: Review) => (
        <Badge variant={review.type === 'product' ? 'primary' : 'secondary'}>
          {review.type === 'product' ? 'Product' : 'Shop'}
        </Badge>
      ),
    },
    {
      id: 'user',
      header: 'User',
      accessor: (review: Review) => review.userName || 'Unknown User',
      sortable: true,
    },
    {
      id: 'rating',
      header: 'Rating',
      accessor: (review: Review) => renderStars(review.rating || 0),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (review: Review) => (
        <div className="flex space-x-2">
          <Button
            variant="info"
            size="sm"
            leftIcon={<Eye size={16} />}
            onClick={() => openViewModal(review)}
            aria-label={`View review #${review.id}`}
          >
            View
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={16} />}
            onClick={() => handleDeleteReview(review)}
            aria-label={`Delete review #${review.id}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <Layout title="Reviews">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                fullWidth
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={handleSearch}
                leftIcon={<Search size={18} className="text-gray-400" />}
                aria-label="Search reviews"
              />
            </div>
            
            <div className="w-40 hidden sm:block">
              <Select
                id="type-filter"
                label=""
                fullWidth
                value={typeFilter}
                onChange={handleTypeFilterChange}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'product', label: 'Product Reviews' },
                  { value: 'shop', label: 'Shop Reviews' },
                ]}
              />
            </div>
            
            <div className="w-40 hidden sm:block">
              <Select
                id="rating-filter"
                label=""
                fullWidth
                value={ratingFilter}
                onChange={handleRatingFilterChange}
                options={[
                  { value: '', label: 'All Ratings' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4 Stars' },
                  { value: '3', label: '3 Stars' },
                  { value: '2', label: '2 Stars' },
                  { value: '1', label: '1 Star' },
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
        
        {/* Mobile filters */}
        <div className="block sm:hidden space-y-3">
          <Select
            id="type-filter-mobile"
            label="Filter by type"
            fullWidth
            value={typeFilter}
            onChange={handleTypeFilterChange}
            options={[
              { value: '', label: 'All Types' },
              { value: 'product', label: 'Product Reviews' },
              { value: 'shop', label: 'Shop Reviews' },
            ]}
          />
          
          <Select
            id="rating-filter-mobile"
            label="Filter by rating"
            fullWidth
            value={ratingFilter}
            onChange={handleRatingFilterChange}
            options={[
              { value: '', label: 'All Ratings' },
              { value: '5', label: '5 Stars' },
              { value: '4', label: '4 Stars' },
              { value: '3', label: '3 Stars' },
              { value: '2', label: '2 Stars' },
              { value: '1', label: '1 Star' },
            ]}
          />
        </div>
        
        {/* Reviews table */}
        <Card>
          <Table
            columns={columns}
            data={filteredReviews}
            keyExtractor={(review) => review.id}
            isPaginated
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalItems={filteredReviews.length}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
      
      {/* View Review Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)}
        title={`Review #${selectedReview?.id}`}
        size="lg"
      >
        {selectedReview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Review Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Type:</span> 
                    <Badge variant={selectedReview.type === 'product' ? 'primary' : 'secondary'} className="ml-2">
                      {selectedReview.type === 'product' ? 'Product Review' : 'Shop Review'}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Rating:</span>
                    <span className="ml-2">{renderStars(selectedReview.rating)}</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">User Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">User:</span> {selectedReview.userName}
                  </p>
                  {selectedReview.type === 'product' && selectedReview.productName && (
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">Product:</span> {selectedReview.productName}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Comment</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {selectedReview.comment || 'No comment provided'}
                </p>
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
    </Layout>
  );
};

export default Reviews; 