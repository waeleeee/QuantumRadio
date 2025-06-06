import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  ShoppingBag,
  Tag,
  Users,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Package,
  Star,
  MessageSquare,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Chatbot from '../components/Chatbot';
import { productsApi, categoriesApi, usersApi, ordersApi } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    recentOrders: [],
    monthlyRevenue: Array(12).fill(0),
    monthlyRevenueBad: Array(12).fill(0),
    categories: [] as { name: string; percentage: number }[],
    reviews: {
      total: 0,
      averageRating: 0,
      productReviews: 0,
      shopReviews: 0,
      recentReviews: [] as any[],
    },
  });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/login';
      return;
    }

    const fetchStats = async () => {
      try {
        const [products, categories, users, orders, productReviews, shopReviews] = await Promise.all([
          productsApi.getAll().catch((err) => {
            console.error('Products API error:', err);
            return [];
          }),
          categoriesApi.getAll().catch((err) => {
            console.error('Categories API error:', err);
            return [];
          }),
          usersApi.getAll().catch((err) => {
            console.error('Users API error:', err);
            return [];
          }),
          ordersApi.getAll().catch((err) => {
            console.error('Orders API error:', err);
            return [];
          }),
          fetch('http://localhost/quantum_radio_api/index.php/avis_produit', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json()).catch(() => []),
          fetch('http://localhost/quantum_radio_api/index.php/avis_shop', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json()).catch(() => []),
        ]);

        const totalProducts = products.length;
        const totalCategories = categories.length;
        const totalUsers = users.length;
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = orders.filter((order) => order.status === 'en_attente').length;
        const recentOrders = [...orders]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        const monthlyRevenue = Array(12).fill(0);
        const monthlyRevenueBad = Array(12).fill(0);
        orders.forEach(order => {
          const month = new Date(order.date).getMonth();
          monthlyRevenue[month] += order.total;
          monthlyRevenueBad[month] += order.total * 0.5; // Simulate bad leads
        });

        // Calculate category distribution based on products per category
        const categoryCounts = categories.map(category => ({
          name: category.name,
          count: products.filter(p => p.category === category.name || (p.category && p.category.name === category.name)).length,
        }));

        const totalProductCount = totalProducts;
        let categoriesWithPercentage = categoryCounts.map(cat => ({
          name: cat.name,
          percentage: totalProductCount > 0 ? (cat.count / totalProductCount) * 100 : 0,
        }));

        // Sort categories by percentage (descending) and take the top 5 to match the image
        categoriesWithPercentage = categoriesWithPercentage
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5); // Adjusted to 5 based on the image

        // Calculate review statistics
        const allReviews = [...productReviews, ...shopReviews];
        const totalReviews = allReviews.length;
        const averageRating = totalReviews > 0
          ? allReviews.reduce((sum, review) => sum + review.note, 0) / totalReviews
          : 0;

        // Get recent reviews (last 5)
        const recentReviews = allReviews
          .sort((a, b) => b.avis_id - a.avis_id)
          .slice(0, 5)
          .map(review => ({
            id: review.avis_id || review.avis_shop_id,
            type: review.avis_id ? 'product' : 'shop',
            rating: review.note,
            comment: review.commentaire,
            userName: `${review.prenom_dmj || ''} ${review.nom_dmj || ''}`.trim(),
            productName: review.nom_produit,
          }));

        setStats(prevStats => ({
          ...prevStats,
          totalProducts,
          totalCategories,
          totalUsers,
          totalOrders,
          totalRevenue,
          pendingOrders,
          recentOrders,
          monthlyRevenue,
          monthlyRevenueBad,
          categories: categoriesWithPercentage,
          reviews: {
            total: totalReviews,
            averageRating,
            productReviews: productReviews.length,
            shopReviews: shopReviews.length,
            recentReviews,
          },
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          totalProducts: 0,
          totalCategories: 0,
          totalUsers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          recentOrders: [],
          monthlyRevenue: Array(12).fill(0),
          monthlyRevenueBad: Array(12).fill(0),
          categories: [],
          reviews: {
            total: 0,
            averageRating: 0,
            productReviews: 0,
            shopReviews: 0,
            recentReviews: [],
          },
        });
      }
    };

    fetchStats();
  }, []);

  const getRandomChange = () => {
    const value = (Math.random() * 30 - 15).toFixed(1);
    return {
      value: parseFloat(value),
      isPositive: parseFloat(value) >= 0,
    };
  };

  const productChange = getRandomChange();
  const revenueChange = getRandomChange();
  const userChange = getRandomChange();
  const orderChange = getRandomChange();

  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Monthly Revenue (TND)',
        data: stats.monthlyRevenue,
        borderColor: '#A855F7', // Violet for Monthly Revenue
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        pointBackgroundColor: '#A855F7',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Bad Leads (TND)',
        data: stats.monthlyRevenueBad,
        borderColor: '#10B981', // Green for Bad Leads
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#000000',
        },
      },
      title: {
        display: true,
        text: 'Monthly Revenue',
        color: '#000000',
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#4B5563',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Revenue (TND)',
          color: '#000000',
        },
        grid: {
          color: '#D1D5DB',
        },
        ticks: {
          color: '#4B5563',
          stepSize: 1000,
          callback: function(value) {
            return 'TND ' + value;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout title="Dashboard">
      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium flex items-center ${
                  productChange.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {productChange.isPositive ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(productChange.value)}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1.5">from last month</span>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  TND {stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium flex items-center ${
                  revenueChange.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {revenueChange.isPositive ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(revenueChange.value)}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1.5">from last month</span>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium flex items-center ${
                  userChange.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {userChange.isPositive ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(userChange.value)}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1.5">from last month</span>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Orders</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.pendingOrders}
                </p>
              </div>
              <div className="h-2-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium flex items-center ${
                  orderChange.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {orderChange.isPositive ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(orderChange.value)}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1.5">from last month</span>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reviews</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.reviews.total}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Average Rating</span>
                <div className="flex items-center">
                  {renderStars(Math.round(stats.reviews.averageRating))}
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stats.reviews.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Recent Orders" subtitle="Latest orders placed by customers">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${
                            order.status === 'en_attente'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                      >
                        {order.status === 'en_attente'
                          ? 'Pending'
                          : order.status === 'shipped'
                          ? 'Shipped'
                          : 'Delivered'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      TND {order.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Inventory Overview" subtitle="Categories distribution">
            <div className="space-y-4">
              {stats.categories.map((category, index) => (
                <div key={index}>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {category.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full" // Changed to purple-600 to match the design
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {stats.categories.length === 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  No categories found
                </p>
              )}
            </div>
          </Card>

          <Card title="Sales Statistics" subtitle="Monthly revenue">
            <div className="w-full h-64 bg-white rounded-lg p-4">
              <Line data={salesData} options={options} />
            </div>
          </Card>
        </div>

        <Card title="Recent Reviews" subtitle="Latest customer feedback">
          <div className="space-y-4">
            {stats.reviews.recentReviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {review.userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {review.type === 'product' ? 'Product Review' : 'Shop Review'}
                      {review.productName && ` - ${review.productName}`}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
            {stats.reviews.recentReviews.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                No reviews found
              </p>
            )}
          </div>
        </Card>

        <Card title="AI Assistant" subtitle="Ask me anything about your data">
          <div className="h-[600px]">
            <Chatbot />
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;