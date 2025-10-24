'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { useBranch } from '@/contexts/BranchContext'
import { 
  ShoppingCart, 
  Eye,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CreditCard,
  Package,
  Receipt,
  Wallet,
  Banknote,
  Smartphone,
  User,
  Building,
  X,
  ChevronDown,
  Check
} from 'lucide-react'
import Swal from 'sweetalert2'

export default function SalesPage() {
  const { selectedBranch, changeBranch } = useBranch()
  const [userInfo, setUserInfo] = useState(null)
  const [sales, setSales] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [phoneQuery, setPhoneQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedSale, setSelectedSale] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)

  // Load user info and branches
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserInfo = localStorage.getItem('user-info')
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo)
          setUserInfo(parsedUserInfo)
          await fetchBranches()
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

  // Fetch sales when branch or filters change
  useEffect(() => {
    const currentBranch = selectedBranch || userInfo?.branch
    if (currentBranch && userInfo) {
      fetchSales(currentBranch)
    }
  }, [selectedBranch, userInfo, currentPage, phoneQuery])

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

  // Fetch sales filtered by branch
  const fetchSales = async (branch) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('auth-token')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        branch: branch
      })
      
      if (phoneQuery.trim()) params.append('phone', phoneQuery.trim())

      console.log('🔍 Fetching sales for branch:', branch)

      const response = await fetch(`/api/sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Fetched sales:', data.sales?.length)
        setSales(data.sales || [])
        setPagination(data.pagination)
      } else {
        throw new Error('Failed to fetch sales')
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load sales. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle branch change from dropdown
  const handleBranchChange = (branch) => {
    changeBranch(branch)
    setIsBranchDropdownOpen(false)
    setCurrentPage(1)
    
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

  const getPaymentBadge = (paymentType) => {
    const badges = {
      cash: { bg: 'bg-green-100', text: 'text-green-800', icon: Wallet, label: 'Cash' },
      mobile_banking: { bg: 'bg-pink-100', text: 'text-pink-800', icon: Smartphone, label: 'bKash' },
      bank_transfer: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Banknote, label: 'Bank' }
    }

    const badge = badges[paymentType] || badges.cash
    const Icon = badge.icon

    return (
      <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' }
    }

    const badge = badges[status] || badges.completed

    return (
      <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    )
  }

  const viewSaleDetails = (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }

  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toFixed(2)}`
  }

  // Show branch selection prompt for admin if no branch selected
  if (userInfo?.role === 'admin' && !selectedBranch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <Building className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Branch</h2>
            <p className="text-gray-600 mb-6">Please select a branch from the sidebar to view sales</p>
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

  if (isLoading && !sales.length) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sales for {selectedBranch || userInfo?.branch}...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentBranch = selectedBranch || userInfo?.branch

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header with Branch Selector and Phone Filter */}
        <div className="mb-6 flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-purple-600" />
              Sales Management
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-500">Track and manage POS sales</p>
              
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
            
            {/* Sales Stats */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">
                  Total: <span className="font-bold text-gray-900">{pagination?.totalCount || 0}</span>
                </span>
              </div>
              <div className="w-1 h-4 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page: <span className="font-bold text-gray-900">{currentPage}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Phone Filter - Top Right */}
          <div className="w-80">
            <div className="bg-white rounded-lg shadow-md p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-800">Search by Phone</h3>
              </div>
              
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => {
                    setPhoneQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                {phoneQuery && (
                  <button
                    onClick={() => {
                      setPhoneQuery('')
                      setCurrentPage(1)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {phoneQuery && (
                <div className="mt-2 px-2 py-1 bg-purple-50 rounded text-xs text-purple-700 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></div>
                  Filtering by: {phoneQuery}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table - Full Width */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {sales.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No sales found</p>
              <p className="text-gray-400 text-sm mt-2">
                {phoneQuery ? `No sales for phone: ${phoneQuery}` : `No sales for ${currentBranch} branch`}
              </p>
              {phoneQuery && (
                <button
                  onClick={() => {
                    setPhoneQuery('')
                    setCurrentPage(1)
                  }}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Sale ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Cashier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-purple-600">
                            {sale.saleId}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.customer?.name || 'Walk-in'}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {sale.customer?.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {sale.items?.length || 0} item{sale.items?.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(sale.adjustedAmount || sale.totalAmount)}
                          </div>
                          {sale.discount > 0 && (
                            <div className="text-xs text-green-600">
                              -৳{sale.discount}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentBadge(sale.paymentType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(sale.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{sale.cashier || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 capitalize">{sale.cashierRole || 'pos'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => viewSaleDetails(sale)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
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
                    <span>{pagination.totalCount} total sales</span>
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
                    <span className="text-sm text-gray-600 px-3">
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

        {/* Sale Details Modal */}
        {showDetailsModal && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-violet-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-purple-600" />
                    Sale Details
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-purple-600 font-medium">{selectedSale.saleId}</p>
                    {getStatusBadge(selectedSale.status)}
                    {getPaymentBadge(selectedSale.paymentType)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{selectedSale.customer?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Sale Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Cashier: {selectedSale.cashier || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="capitalize">Branch: {selectedSale.items?.[0]?.branch || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Items ({selectedSale.items?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {selectedSale.items?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span>Price: {formatCurrency(item.unitPrice)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600 text-lg">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(selectedSale.totalAmount)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-{formatCurrency(selectedSale.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-3 border-t border-purple-300">
                      <span>Total Paid:</span>
                      <span className="text-purple-600">{formatCurrency(selectedSale.adjustedAmount || selectedSale.totalAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Payment: {selectedSale.payment?.methods?.[0]?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
