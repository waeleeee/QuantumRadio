import React, { useState, useEffect } from 'react';
import { Search, Download, User, UserPlus, Mail, Phone, Edit, Trash, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { User as UserType } from '../types';
import { usersApi, exportToCsv } from '../services/api';
import { useToast } from '../context/ToastContext';

const Users: React.FC = () => {
  const { addToast } = useToast();

  // Users data state
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<Partial<UserType> & { password?: string }>({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    role: 'auditeur',
    photo_profil: '',
    genre: null,
    password: '',
  });

  // Selected user states
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await usersApi.getAll();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        addToast('Failed to fetch users', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [addToast]);

  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user =>
          user.prenom.toLowerCase().includes(query) ||
          user.nom.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchQuery, roleFilter]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle role filter change
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle file upload
  const uploadPhoto = async (file: File): Promise<string> => {
    try {
      const url = await usersApi.uploadPhoto(file);
      return url;
    } catch (error) {
      addToast('Failed to upload photo', 'error');
      throw error;
    }
  };

  // Handle file input for profile photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addToast('File size must be under 2MB', 'error');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        addToast('Only JPEG and PNG files are allowed', 'error');
        return;
      }
      try {
        const url = await uploadPhoto(file);
        setFormData({ ...formData, photo_profil: url });
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }
  };

  // Open modals
  const openAddModal = () => {
    setFormData({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      role: 'auditeur',
      photo_profil: '',
      genre: null,
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    setFormData({
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      photo_profil: user.photo_profil || '',
      genre: user.genre || null,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    if (selectedUsers.length === 0) {
      addToast('No users selected', 'warning');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prenom || !formData.nom || !formData.email || !formData.telephone) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    if (isAddModalOpen && !formData.password) {
      addToast('Password is required for new users', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAddModalOpen) {
        const newUser = await usersApi.create({
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
          role: formData.role as 'auditeur' | 'dmj',
          photo_profil: formData.photo_profil || '',
          genre: formData.genre || null,
          password: formData.password!,
        });
        setUsers([...users, newUser]);
        addToast('User created successfully', 'success');
        setIsAddModalOpen(false);
      } else if (isEditModalOpen && selectedUser) {
        const updatedUser = await usersApi.update(selectedUser.id, {
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
          role: formData.role as 'auditeur' | 'dmj',
          photo_profil: formData.photo_profil || '',
          genre: formData.genre || null,
          password: formData.password || undefined,
        });
        setUsers(users.map(u => (u.id === selectedUser.id ? updatedUser : u)));
        addToast('User updated successfully', 'success');
        setIsEditModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      addToast(error.message || 'Failed to save user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      await usersApi.delete(selectedUser.id);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      addToast('User deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addToast(error.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    setIsDeleting(true);
    try {
      await usersApi.deleteMany(selectedUsers.map(u => u.id));
      setUsers(users.filter(u => !selectedUsers.some(su => su.id === u.id)));
      setSelectedUsers([]);
      addToast('Users deleted successfully', 'success');
      setIsBulkDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting users:', error);
      addToast(error.message || 'Failed to delete users', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle export to CSV
  const handleExport = () => {
    const exportData = filteredUsers.map(user => ({
      ID: user.id,
      'First Name': user.prenom,
      'Last Name': user.nom,
      Email: user.email,
      Phone: user.telephone,
      Role: user.role,
      Genre: user.genre || 'N/A',
    }));
    exportToCsv(exportData, 'users.csv');
    addToast('Users exported to CSV', 'success');
  };

  // Table columns
  const columns = [
    {
      id: 'id',
      header: 'ID',
      accessor: (user: UserType) => `#${user.id}`,
      sortable: true,
    },
    {
      id: 'user',
      header: 'User',
      accessor: (user: UserType) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            {user.photo_profil ? (
              <img
                src={user.photo_profil}
                alt={`${user.prenom} ${user.nom}`}
                className="h-10 w-10 rounded-full"
                loading="lazy"
              />
            ) : (
              <div className="h-10 w-10 flex items-center justify-center">
                <User size={20} className="text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user.prenom} {user.nom}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessor: (user: UserType) => (
        <div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Phone size={14} className="mr-1" /> {user.telephone}
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      accessor: (user: UserType) => (
        <Badge
          variant={user.role === 'dmj' ? 'primary' : 'default'}
          size="md"
        >
          {user.role === 'dmj' ? 'DMJ' : 'Auditeur'}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (user: UserType) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(user);
            }}
            aria-label={`Edit ${user.prenom} ${user.nom}`}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(user);
            }}
            aria-label={`Delete ${user.prenom} ${user.nom}`}
          >
            Delete
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Mail size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`mailto:${user.email}`);
            }}
            aria-label={`Email ${user.prenom} ${user.nom}`}
          >
            Email
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Users">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                fullWidth
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearch}
                leftIcon={<Search size={18} className="text-gray-400" />}
                aria-label="Search users"
              />
            </div>
            <div className="w-40 hidden sm:block">
              <Select
                id="role-filter"
                label=""
                fullWidth
                value={roleFilter}
                onChange={handleRoleFilterChange}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'dmj', label: 'DMJ' },
                  { value: 'auditeur', label: 'Auditeur' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {selectedUsers.length > 0 && (
              <Button
                variant="danger"
                leftIcon={<Trash size={18} />}
                onClick={openBulkDeleteModal}
              >
                Delete ({selectedUsers.length})
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
              leftIcon={<UserPlus size={18} />}
              onClick={openAddModal}
            >
              Add User
            </Button>
          </div>
        </div>

        {/* Mobile role filter */}
        <div className="block sm:hidden">
          <Select
            id="role-filter-mobile"
            label="Filter by role"
            fullWidth
            value={roleFilter}
            onChange={handleRoleFilterChange}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'dmj', label: 'DMJ' },
              { value: 'auditeur', label: 'Auditeur' },
            ]}
          />
        </div>

        {/* Users table */}
        <Card>
          <Table
            columns={columns}
            data={filteredUsers}
            keyExtractor={(user) => user.id}
            isSelectable
            selectedItems={selectedUsers}
            onSelectedItemsChange={setSelectedUsers}
            isPaginated
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New User">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="prenom"
              name="prenom"
              label="First Name"
              value={formData.prenom || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="nom"
              name="nom"
              label="Last Name"
              value={formData.nom || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="telephone"
              name="telephone"
              label="Phone"
              type="tel"
              value={formData.telephone || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Select
              id="genre"
              name="genre"
              label="Genre (optional)"
              value={formData.genre || ''}
              onChange={(value) => setFormData({ ...formData, genre: value || null })}
              options={[
                { value: '', label: 'Select Genre' },
                { value: 'homme', label: 'Homme' },
                { value: 'femme', label: 'Femme' },
              ]}
              fullWidth
            />
            <Select
              id="role"
              name="role"
              label="Role"
              value={formData.role || 'auditeur'}
              onChange={(value) => setFormData({ ...formData, role: value })}
              options={[
                { value: 'auditeur', label: 'Auditeur' },
                { value: 'dmj', label: 'DMJ' },
              ]}
              fullWidth
              required
            />
            <Input
              id="photo"
              name="photo"
              label="Profile Photo (optional)"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              fullWidth
            />
            {formData.photo_profil && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Photo Preview:</p>
                <img
                  src={formData.photo_profil}
                  alt="Profile preview"
                  className="h-24 w-24 rounded-full object-cover"
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<CheckCircle size={18} />}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="prenom-edit"
              name="prenom"
              label="First Name"
              value={formData.prenom || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="nom-edit"
              name="nom"
              label="Last Name"
              value={formData.nom || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="email-edit"
              name="email"
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="telephone-edit"
              name="telephone"
              label="Phone"
              type="tel"
              value={formData.telephone || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Input
              id="password-edit"
              name="password"
              label="Password (leave blank to keep unchanged)"
              type="password"
              value={formData.password || ''}
              onChange={handleInputChange}
              fullWidth
            />
            <Select
              id="genre-edit"
              name="genre"
              label="Genre (optional)"
              value={formData.genre || ''}
              onChange={(value) => setFormData({ ...formData, genre: value || null })}
              options={[
                { value: '', label: 'Select Genre' },
                { value: 'homme', label: 'Homme' },
                { value: 'femme', label: 'Femme' },
              ]}
              fullWidth
            />
            <Select
              id="role-edit"
              name="role"
              label="Role"
              value={formData.role || 'auditeur'}
              onChange={(value) => setFormData({ ...formData, role: value })}
              options={[
                { value: 'auditeur', label: 'Auditeur' },
                { value: 'dmj', label: 'DMJ' },
              ]}
              fullWidth
              required
            />
            <Input
              id="photo-edit"
              name="photo"
              label="Profile Photo (optional)"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              fullWidth
            />
            {formData.photo_profil && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Photo Preview:</p>
                <img
                  src={formData.photo_profil}
                  alt="Profile preview"
                  className="h-24 w-24 rounded-full object-cover"
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<CheckCircle size={18} />}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.prenom} ${selectedUser?.nom}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Selected Users"
        message={`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default Users;