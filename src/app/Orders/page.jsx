'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Settings
} from 'lucide-react'
import Swal from 'sweetalert2'

export default function OrdersPage() {
  const [userInfo, setUserInfo] = useState(null)
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0
  })

  // Load user info
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    if (storedUserInfo) {
      const parsed = JSON.parse(storedUserInfo)
      setUserInfo(parsed)
    }
  }, [])

  // Fetch orders when filters change
  useEffect(() => {
    if (userInfo) {
      fetchOrders()
    }
  }, [userInfo, currentPage, statusFilter, branchFilter, searchQuery])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('auth-token')
      
      // Build query params
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (branchFilter !== 'all') params.append('branch', branchFilter)
      if (searchQuery.trim()) params.append('orderId', searchQuery.trim())

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setPagination(data.pagination)
        calculateStats(data.orders || [])
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load orders. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (ordersData) => {
    const stats = {
      total: ordersData.length,
      pending: ordersData.filter(o => o.status === 'pending').length,
      confirmed: ordersData.filter(o => o.status === 'confirmed').length,
      processing: ordersData.filter(o => o.status === 'processing').length,
      shipped: ordersData.filter(o => o.status === 'shipped').length,
      delivered: ordersData.filter(o => o.status === 'delivered').length
    }
    setStats(stats)
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await Swal.fire({
      title: `Update Order Status`,
      html: `
        <div class="text-left">
          <p class="mb-4">Change order status to <strong>${newStatus}</strong>?</p>
          ${newStatus === 'shipped' ? '<input id="tracking" class="swal2-input" placeholder="Tracking Number (optional)">' : ''}
        </div>
      `,
      icon: 'question',
      input: 'textarea',
      inputPlaceholder: 'Add notes (optional)...',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, update',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const trackingInput = document.getElementById('tracking')
        return {
          notes: document.querySelector('.swal2-textarea').value,
          tracking: trackingInput ? trackingInput.value : null
        }
      }
    })

    if (!result.isConfirmed) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          notes: result.value?.notes || '',
          trackingInfo: result.value?.tracking || null
        })
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Order status updated successfully',
          confirmButtonColor: '#7c3aed',
          timer: 2000,
          showConfirmButton: false
        })
        fetchOrders()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update order status',
        confirmButtonColor: '#7c3aed'
      })
    }
  }

  const handleCancelOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: 'This action cannot be undone. The order will be marked as cancelled.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel order',
      cancelButtonText: 'No, keep it'
    })

    if (!result.isConfirmed) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/orders?orderId=${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Cancelled!',
          text: 'Order has been cancelled successfully',
          confirmButtonColor: '#7c3aed',
          timer: 2000,
          showConfirmButton: false
        })
        fetchOrders()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel order')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to cancel order',
        confirmButtonColor: '#7c3aed'
      })
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'Confirmed' },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Package, label: 'Processing' },
      shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck, label: 'Shipped' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Delivered' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Cancelled' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', icon: RefreshCw, label: 'Refunded' }
    }

    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const viewOrderDetails = (order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toFixed(2)}`
  }

  // 🆕 NEW: Format option key to readable text
  const formatOptionKey = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim()
  }

  // 🆕 NEW: Check if item has selected options
  const hasSelectedOptions = (item) => {
    return item.selectedOptions && 
           typeof item.selectedOptions === 'object' && 
           Object.keys(item.selectedOptions).length > 0
  }

  if (isLoading && !orders.length) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-purple-600" />
            Orders Management
          </h1>
          <p className="text-gray-500 mt-1">
            Track and manage customer orders
            {userInfo?.branch && (
              <span className="ml-2 text-purple-600 font-medium">
                • {userInfo.branch.charAt(0).toUpperCase() + userInfo.branch.slice(1)} Branch
              </span>
            )}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-gray-800">{pagination?.totalOrders || 0}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Confirmed</p>
                <p className="text-2xl font-bold text-gray-800">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Processing</p>
                <p className="text-2xl font-bold text-gray-800">{stats.processing}</p>
              </div>
              <Package className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Shipped</p>
                <p className="text-2xl font-bold text-gray-800">{stats.shipped}</p>
              </div>
              <Truck className="w-8 h-8 text-indigo-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Delivered</p>
                <p className="text-2xl font-bold text-gray-800">{stats.delivered}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Order ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Enter order ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Branch Filter - Only for admin/manager */}
            {['admin', 'manager'].includes(userInfo?.role) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Branches</option>
                  <option value="main">Main</option>
                  <option value="mirpur">Mirpur</option>
                  <option value="bashundhara">Bashundhara</option>
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  Status: {statusFilter}
                </span>
              )}
              {branchFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Branch: {branchFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Search: {searchQuery}
                </span>
              )}
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setBranchFilter('all')
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No orders found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery || statusFilter !== 'all' || branchFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Orders will appear here once customers place them'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-sm font-medium text-purple-600">
                                {order.orderId}
                              </div>
                              {order.orderType === 'guest' && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Guest
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customerInfo.fullName}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {order.customerInfo.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {order.totals.itemCount} item{order.totals.itemCount !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {order.totals.totalQuantity}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(order.totals.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            via {order.paymentInfo.method}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {order.availableBranches?.map((branch, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                                {branch}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {/* View Details */}
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>

                            {/* Status Update Dropdown - For POS/Moderator/Admin */}
                            {['admin', 'manager', 'moderator', 'pos'].includes(userInfo?.role) && 
                             order.status !== 'cancelled' && 
                             order.status !== 'delivered' && (
                              <div className="relative group">
                                <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                  <RefreshCw className="w-5 h-5" />
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  {order.status === 'pending' && (
                                    <button
                                      onClick={() => handleUpdateStatus(order.orderId, 'confirmed')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Confirm
                                    </button>
                                  )}
                                  {['pending', 'confirmed'].includes(order.status) && (
                                    <button
                                      onClick={() => handleUpdateStatus(order.orderId, 'processing')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 text-purple-600 flex items-center gap-2"
                                    >
                                      <Package className="w-4 h-4" />
                                      Processing
                                    </button>
                                  )}
                                  {['confirmed', 'processing'].includes(order.status) && (
                                    <button
                                      onClick={() => handleUpdateStatus(order.orderId, 'shipped')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 text-indigo-600 flex items-center gap-2"
                                    >
                                      <Truck className="w-4 h-4" />
                                      Ship
                                    </button>
                                  )}
                                  {order.status === 'shipped' && (
                                    <button
                                      onClick={() => handleUpdateStatus(order.orderId, 'delivered')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Deliver
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCancelOrder(order.orderId)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 border-t flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Showing page {pagination.currentPage} of {pagination.totalPages}</span>
                    <span className="text-gray-400">•</span>
                    <span>{pagination.totalOrders} total orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!pagination.hasNextPage}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-violet-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="w-6 h-6 text-purple-600" />
                    Order Details
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-purple-600 font-medium">{selectedOrder.orderId}</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Customer Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{selectedOrder.customerInfo.fullName}</p>
                          {selectedOrder.orderType === 'guest' && (
                            <span className="text-xs text-orange-600 font-medium">Guest Order</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{selectedOrder.customerInfo.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{selectedOrder.customerInfo.phone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p>{selectedOrder.customerInfo.address}</p>
                          <p>{selectedOrder.customerInfo.city}, {selectedOrder.customerInfo.postalCode}</p>
                          <p>{selectedOrder.customerInfo.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Order Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Payment: {selectedOrder.paymentInfo.method}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700">
                        <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Branches:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedOrder.availableBranches.map((branch, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                                {branch}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {selectedOrder.trackingInfo && (
                        <div className="flex items-center gap-2 text-gray-700 pt-2 border-t">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Tracking Number:</p>
                            <p className="font-mono font-medium">{selectedOrder.trackingInfo}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                    Order Items ({selectedOrder.totals.itemCount})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        {item.product.images?.[0]?.url && (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded border flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            <p className="text-sm text-gray-500">•</p>
                            <p className="text-sm text-gray-500">Price: {formatCurrency(item.product.price)}</p>
                          </div>
                          {item.product.brand && (
                            <p className="text-xs text-gray-400 mt-1">Brand: {item.product.brand}</p>
                          )}
                          
                          {/* 🆕 NEW: Display Selected Options */}
                          {hasSelectedOptions(item) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-semibold text-gray-700 uppercase">Selected Options:</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(item.selectedOptions).map(([key, value]) => (
                                  <div key={key} className="bg-purple-50 px-3 py-1.5 rounded border border-purple-100">
                                    <p className="text-xs text-gray-600 font-medium">{formatOptionKey(key)}</p>
                                    <p className="text-sm text-purple-700 font-semibold">{value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-purple-600 text-lg">{formatCurrency(item.itemTotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Totals */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-lg border border-purple-200 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.totals.subtotal)}</span>
                    </div>
                    {selectedOrder.totals.deliveryCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Charge:</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.totals.deliveryCharge)}</span>
                      </div>
                    )}
                    {selectedOrder.totals.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.totals.tax)}</span>
                      </div>
                    )}
                    {selectedOrder.totals.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-{formatCurrency(selectedOrder.totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-3 border-t border-purple-300">
                      <span>Total:</span>
                      <span className="text-purple-600">{formatCurrency(selectedOrder.totals.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.orderNotes && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Order Notes
                    </h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {selectedOrder.orderNotes}
                    </p>
                  </div>
                )}

                {/* Order History */}
                {selectedOrder.orderHistory && selectedOrder.orderHistory.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      Order History
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.orderHistory.map((history, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(history.status)}
                              <span className="text-xs text-gray-500">
                                by {history.updatedByRole}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(history.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                {['admin', 'manager', 'moderator', 'pos'].includes(userInfo?.role) && 
                 selectedOrder.status !== 'cancelled' && 
                 selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      // Open status update
                      const nextStatus = 
                        selectedOrder.status === 'pending' ? 'confirmed' :
                        selectedOrder.status === 'confirmed' ? 'processing' :
                        selectedOrder.status === 'processing' ? 'shipped' :
                        selectedOrder.status === 'shipped' ? 'delivered' : null
                      
                      if (nextStatus) {
                        handleUpdateStatus(selectedOrder.orderId, nextStatus)
                      }
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
