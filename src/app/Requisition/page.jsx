'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { useBranch } from '@/contexts/BranchContext'
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package,
  Eye,
  X,
  Minus,
  ShoppingCart,
  Building,
  ChevronDown,
  Check
} from 'lucide-react'
import Swal from 'sweetalert2'

export default function RequisitionPage() {
  const { selectedBranch, changeBranch } = useBranch()
  const [userInfo, setUserInfo] = useState(null)
  const [requisitions, setRequisitions] = useState([])
  const [filteredRequisitions, setFilteredRequisitions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)

  // Create requisition form states
  const [products, setProducts] = useState([])
  const [selectedSourceBranch, setSelectedSourceBranch] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('normal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load user info and data
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserInfo = localStorage.getItem('user-info')
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo)
          setUserInfo(parsedUserInfo)
          await fetchBranches()
          await fetchProducts()
        }
      } catch (error) {
        console.error('Error loading data:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load data. Please try again.',
          confirmButtonColor: '#7c3aed',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Fetch requisitions when branch changes
  useEffect(() => {
    const currentBranch = selectedBranch || userInfo?.branch
    if (currentBranch && userInfo) {
      fetchRequisitions(userInfo, currentBranch)
    }
  }, [selectedBranch, userInfo])

  // Filter requisitions
  useEffect(() => {
    let filtered = requisitions

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(req =>
        req.requisitionNumber.toLowerCase().includes(query) ||
        req.requestedBy.name.toLowerCase().includes(query) ||
        req.items.some(item => item.productName.toLowerCase().includes(query))
      )
    }

    setFilteredRequisitions(filtered)
  }, [requisitions, statusFilter, searchQuery])

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  // Fetch products
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/products?limit=500', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  // 🔥 UPDATED: Fetch requisitions filtered by branch
  const fetchRequisitions = async (user, branch) => {
    try {
      const token = localStorage.getItem('auth-token')
      const params = new URLSearchParams({
        limit: 100,
        branch: branch // 🔥 Filter by branch
      })

      console.log('🔍 Fetching requisitions for branch:', branch)

      const response = await fetch(`/api/requisitions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Fetched requisitions:', data.requisitions?.length)
        setRequisitions(data.requisitions || [])
        setFilteredRequisitions(data.requisitions || [])
      } else {
        throw new Error('Failed to fetch requisitions')
      }
    } catch (error) {
      console.error('Error fetching requisitions:', error)
    }
  }

  // Handle branch change from dropdown
  const handleBranchChange = (branch) => {
    changeBranch(branch)
    setIsBranchDropdownOpen(false)
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Switched to ${branch.charAt(0).toUpperCase() + branch.slice(1)} Branch`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    })
  }

  // Add item to requisition
  const handleAddItem = (product) => {
    const existingItem = selectedItems.find(item => item.productId === product._id)
    
    if (existingItem) {
      setSelectedItems(selectedItems.map(item =>
        item.productId === product._id
          ? { ...item, requestedQty: item.requestedQty + 1 }
          : item
      ))
    } else {
      setSelectedItems([...selectedItems, {
        productId: product._id,
        productName: product.name,
        requestedQty: 1,
        image: product.images?.[0]?.url || null,
        options: null
      }])
    }
  }

  // Update item quantity
  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      setSelectedItems(selectedItems.filter(item => item.productId !== productId))
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.productId === productId
          ? { ...item, requestedQty: parseInt(newQty) }
          : item
      ))
    }
  }

  // Remove item
  const handleRemoveItem = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId))
  }

  // Submit requisition
  const handleSubmitRequisition = async () => {
    if (!selectedSourceBranch) {
      Swal.fire({
        icon: 'warning',
        title: 'Source Branch Required',
        text: 'Please select a source branch.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }

    if (selectedItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Items Selected',
        text: 'Please add at least one item to the requisition.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: selectedItems,
          sourceBranch: selectedSourceBranch,
          notes: notes,
          priority: priority
        })
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Requisition Created!',
          text: 'Your requisition has been submitted for approval.',
          confirmButtonColor: '#7c3aed',
        })
        
        // Reset form
        setShowCreateModal(false)
        setSelectedSourceBranch('')
        setSelectedItems([])
        setNotes('')
        setPriority('normal')
        
        // Refresh requisitions
        const currentBranch = selectedBranch || userInfo?.branch
        await fetchRequisitions(userInfo, currentBranch)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create requisition')
      }
    } catch (error) {
      console.error('Error creating requisition:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create requisition.',
        confirmButtonColor: '#7c3aed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle approve requisition
  const handleApprove = async (requisitionId) => {
    const result = await Swal.fire({
      title: 'Approve Requisition',
      text: 'Do you want to approve this requisition?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/requisitions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requisitionId,
          action: 'approve'
        })
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Approved!',
          text: 'Requisition has been approved.',
          confirmButtonColor: '#7c3aed',
        })
        const currentBranch = selectedBranch || userInfo?.branch
        await fetchRequisitions(userInfo, currentBranch)
      } else {
        throw new Error('Failed to approve requisition')
      }
    } catch (error) {
      console.error('Error approving requisition:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to approve requisition.',
        confirmButtonColor: '#7c3aed',
      })
    }
  }

  // Handle reject requisition
  const handleReject = async (requisitionId) => {
    const result = await Swal.fire({
      title: 'Reject Requisition',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, reject',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason!'
        }
      }
    })

    if (!result.isConfirmed) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/requisitions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requisitionId,
          action: 'reject',
          rejectionReason: result.value
        })
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Rejected!',
          text: 'Requisition has been rejected.',
          confirmButtonColor: '#7c3aed',
        })
        const currentBranch = selectedBranch || userInfo?.branch
        await fetchRequisitions(userInfo, currentBranch)
      } else {
        throw new Error('Failed to reject requisition')
      }
    } catch (error) {
      console.error('Error rejecting requisition:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to reject requisition.',
        confirmButtonColor: '#7c3aed',
      })
    }
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' },
      'in-transit': { color: 'bg-blue-100 text-blue-800', icon: Truck, text: 'In Transit' },
      received: { color: 'bg-purple-100 text-purple-800', icon: Package, text: 'Received' }
    }

    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  // Filter products for search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Get stats
  const stats = {
    total: requisitions.length,
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    inTransit: requisitions.filter(r => r.status === 'in-transit').length,
  }

  // Show branch selection prompt for admin if no branch selected
  if (userInfo?.role === 'admin' && !selectedBranch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <Building className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Branch</h2>
            <p className="text-gray-600 mb-6">Please select a branch from the sidebar to view requisitions</p>
            <div className="space-y-2">
              {availableBranches.map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleBranchChange(branch)}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors capitalize font-medium"
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requisitions for {selectedBranch || userInfo?.branch}...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentBranch = selectedBranch || userInfo?.branch

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">Stock Requisitions</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-500">Manage stock transfer requests</p>
                
                {/* Admin Branch Selector */}
                {userInfo?.role === 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      <Building className="w-4 h-4" />
                      <span className="capitalize">{currentBranch}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBranchDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsBranchDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-purple-200 z-50 min-w-[200px]">
                          <div className="py-1">
                            {availableBranches.map((branch) => (
                              <button
                                key={branch}
                                onClick={() => handleBranchChange(branch)}
                                className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors flex items-center justify-between ${
                                  selectedBranch === branch ? 'bg-purple-100' : ''
                                }`}
                              >
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {branch}
                                </span>
                                {selectedBranch === branch && (
                                  <Check className="w-4 h-4 text-purple-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* POS Branch Display */}
                {userInfo?.role === 'pos' && userInfo?.branch && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium capitalize flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {userInfo.branch} Branch
                  </span>
                )}
              </div>
            </div>

            {(userInfo?.role === 'pos' || userInfo?.role === 'admin') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Requisition
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Total Requisitions</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">In Transit</p>
            <p className="text-2xl font-bold text-gray-800">{stats.inTransit}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="in-transit">In Transit</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by requisition number or product..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Requisitions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredRequisitions.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No requisitions found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : `No requisitions for ${currentBranch} branch`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Req. Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Requested By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      From → To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
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
                  {filteredRequisitions.map((req) => (
                    <tr key={req._id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-purple-600">
                          {req.requisitionNumber}
                        </div>
                        {req.priority === 'urgent' && (
                          <span className="text-xs text-red-600 font-medium">URGENT</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {req.requestedBy.name}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {req.requestedBy.branch}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {req.items.length} item{req.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium capitalize">{req.sourceBranch}</span>
                          {' → '}
                          <span className="font-medium capitalize">{req.destinationBranch}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {/* View details */}}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {userInfo?.role === 'admin' && req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(req._id)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(req._id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Requisition Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Create New Requisition</h2>
                  <p className="text-sm text-gray-500 mt-1">Request stock transfer from another branch</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Source Branch Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Branch *
                  </label>
                  <select
                    value={selectedSourceBranch}
                    onChange={(e) => setSelectedSourceBranch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select source branch...</option>
                    {availableBranches
                      .filter(branch => branch !== currentBranch)
                      .map((branch) => (
                        <option key={branch} value={branch}>
                          {branch.charAt(0).toUpperCase() + branch.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="normal"
                        checked={priority === 'normal'}
                        onChange={(e) => setPriority(e.target.value)}
                        className="mr-2"
                      />
                      Normal
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="urgent"
                        checked={priority === 'urgent'}
                        onChange={(e) => setPriority(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-red-600 font-medium">Urgent</span>
                    </label>
                  </div>
                </div>

                {/* Product Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Products
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Product List */}
                {productSearch && (
                  <div className="mb-6 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <div
                        key={product._id}
                        onClick={() => handleAddItem(product)}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        {product.images?.[0]?.url && (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.barcode}</p>
                        </div>
                        <Plus className="w-5 h-5 text-purple-600" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Items */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Items ({selectedItems.length})
                  </label>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">No items selected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.requestedQty - 1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={item.requestedQty}
                              onChange={(e) => handleUpdateQuantity(item.productId, e.target.value)}
                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                              min="1"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.requestedQty + 1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes or reasons for this requisition..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRequisition}
                  disabled={isSubmitting || selectedItems.length === 0 || !selectedSourceBranch}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Requisition
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
