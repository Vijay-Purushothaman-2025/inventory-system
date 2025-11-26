import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Package, AlertTriangle, DollarSign, LogOut } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function InventoryApp() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ items: {}, total_value: 0, low_stock: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: 0,
    min_stock: 0,
    price: 0,
    supplier: ''
  });
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (token) {
      fetchItems();
      fetchStats();
    }
  }, [token]);

  const apiCall = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  };

  const handleRegister = async () => {
    try {
      await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      alert('Registration successful! Please login.');
      setView('login');
      setAuthForm({ username: '', email: '', password: '' });
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setItems([]);
  };

  const fetchItems = async () => {
    try {
      const data = await apiCall('/items');
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiCall('/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const saveItem = async () => {
    if (!formData.name || !formData.sku) {
      alert('Please fill in required fields (Name and SKU)');
      return;
    }

    try {
      if (editingItem) {
        await apiCall(`/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiCall('/items', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      await fetchItems();
      await fetchStats();
      resetForm();
    } catch (error) {
      alert('Failed to save item: ' + error.message);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await apiCall(`/items/${itemId}`, { method: 'DELETE' });
      await fetchItems();
      await fetchStats();
    } catch (error) {
      alert('Failed to delete item: ' + error.message);
    }
  };

  const editItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      min_stock: item.min_stock,
      price: item.price,
      supplier: item.supplier
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      quantity: 0,
      min_stock: 0,
      price: 0,
      supplier: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auth Views
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Package className="w-12 h-12 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Inventory Pro</h1>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView('login')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                view === 'login' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setView('register')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                view === 'register' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            {view === 'register' && (
              <input
                type="text"
                placeholder="Username"
                value={authForm.username}
                onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              onKeyPress={(e) => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={view === 'login' ? handleLogin : handleRegister}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all"
            >
              {view === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-10 h-10 text-blue-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">Inventory Management</h1>
                <p className="text-gray-300 text-sm">Welcome, {user?.username}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-gray-300 text-sm">Total Items</p>
                  <p className="text-2xl font-bold text-white">{stats.items.total_quantity || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-gray-300 text-sm">Total Value</p>
                  <p className="text-2xl font-bold text-white">${(stats.total_value || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-gray-300 text-sm">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-white">{stats.low_stock || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Product Name *"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="SKU *"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Minimum Stock Level"
                value={formData.min_stock}
                onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={saveItem}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 mb-6 border border-white/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/20">
                  <tr>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Name</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">SKU</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Category</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Quantity</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Price</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Value</th>
                    <th className="text-left px-6 py-4 text-gray-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-gray-300">{item.sku}</td>
                      <td className="px-6 py-4 text-gray-300">{item.category || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${item.quantity <= item.min_stock ? 'text-red-400' : 'text-green-400'}`}>
                          {item.quantity}
                          {item.quantity <= item.min_stock && (
                            <AlertTriangle className="inline w-4 h-4 ml-1" />
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">${item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-white font-semibold">
                        ${(item.quantity * item.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editItem(item)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}