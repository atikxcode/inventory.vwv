'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { useBranch } from '@/contexts/BranchContext'
import { 
  DollarSign,
  Plus,
  Search,
  Calendar,
  Filter,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Tag,
  Building,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Check,
  ChevronDown
} from 'lucide-react'
import Swal from 'sweetalert2'

export default function ExpensesPage() {
  const { selectedBranch, changeBranch } = useBranch()
  const [userInfo, setUserInfo] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [summary, setSummary] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)

  // Create expense form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    customCategory: '',
    paymentMethod: 'cash',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    vendor: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Predefined categories
  const predefinedCategories = [
    { value: 'utilities', label: '⚡ Utilities', icon: '⚡' },
    { value: 'rent', label: '🏢 Rent', icon: '🏢' },
    { value: 'salaries', label: '💰 Salaries', icon: '💰' },
    { value: 'inventory', label: '📦 Inventory', icon: '📦' },
    { value: 'maintenance', label: '🔧 Maintenance', icon: '🔧' },
    { value: 'transportation', label: '🚗 Transportation', icon: '🚗' },
    { value: 'marketing', label: '📢 Marketing', icon: '📢' },
    { value: 'office_supplies', label: '📎 Office Supplies', icon: '📎' },
    { value: 'food_beverage', label: '🍽️ Food & Beverage', icon: '🍽️' },
    { value: 'petty_cash', label: '💵 Petty Cash', icon: '💵' },
    { value: 'packaging', label: '📦 Packaging', icon: '📦' },
    { value: 'cleaning', label: '🧹 Cleaning', icon: '🧹' },
    { value: 'security', label: '🔒 Security', icon: '🔒' },
    { value: 'communication', label: '📞 Communication', icon: '📞' },
    { value: 'professional_fees', label: '💼 Professional Fees', icon: '💼' },
    { value: 'insurance', label: '🛡️ Insurance', icon: '🛡️' },
    { value: 'taxes', label: '📝 Taxes', icon: '📝' },
    { value: 'bank_charges', label: '🏦 Bank Charges', icon: '🏦' },
    { value: 'miscellaneous', label: '📋 Miscellaneous', icon: '📋' },
    { value: 'custom', label: '✏️ Custom Category', icon: '✏️' }
  ]

  const paymentMethods = [
    { value: 'cash', label: '💵 Cash' },
    { value: 'card', label: '💳 Card' },
    { value: 'bkash', label: '📱 bKash' },
    { value: 'nagad', label: '📱 Nagad' },
    { value: 'rocket', label: '🚀 Rocket' },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'cheque', label: '📝 Cheque' }
  ]

  // Load user info
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    if (storedUserInfo) {
      const parsed = JSON.parse(storedUserInfo)
      setUserInfo(parsed)
    }
    fetchBranches()
  }, [])

  // Fetch expenses when filters change or branch changes
  useEffect(() => {
    const currentBranch = selectedBranch || userInfo?.branch
    if (userInfo && currentBranch) {
      fetchExpenses(currentBranch)
      fetchCategories()
    }
  }, [userInfo, selectedBranch, currentPage, categoryFilter, dateRange])

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

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/expenses?categoriesOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories.all || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchExpenses = async (branch) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('auth-token')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy: 'expenseDate',
        sortOrder: 'desc',
        branch: branch
      })
      
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      console.log('🔍 Fetching expenses for branch:', branch)

      const response = await fetch(`/api/expenses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Fetched expenses:', data.expenses?.length)
        setExpenses(data.expenses || [])
        setPagination(data.pagination)
        setSummary(data.summary)
      } else {
        throw new Error('Failed to fetch expenses')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load expenses. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateExpense = async (e) => {
    e.preventDefault()
    
    if (!formData.description || !formData.amount || !formData.category) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please fill in all required fields',
        confirmButtonColor: '#7c3aed'
      })
      return
    }

    const finalCategory = formData.category === 'custom' 
      ? formData.customCategory 
      : formData.category

    if (formData.category === 'custom' && !formData.customCategory) {
      Swal.fire({
        icon: 'warning',
        title: 'Custom Category Required',
        text: 'Please enter a custom category name',
        confirmButtonColor: '#7c3aed'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          category: finalCategory,
          amount: parseFloat(formData.amount)
        })
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Expense recorded successfully',
          confirmButtonColor: '#7c3aed',
          timer: 2000,
          showConfirmButton: false
        })
        
        setShowCreateModal(false)
        resetForm()
        const currentBranch = selectedBranch || userInfo?.branch
        fetchExpenses(currentBranch)
        fetchCategories()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create expense')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create expense',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    const result = await Swal.fire({
      title: 'Delete Expense?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/expenses?expenseId=${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Expense deleted successfully',
          confirmButtonColor: '#7c3aed',
          timer: 2000,
          showConfirmButton: false
        })
        const currentBranch = selectedBranch || userInfo?.branch
        fetchExpenses(currentBranch)
      } else {
        throw new Error('Failed to delete expense')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete expense',
        confirmButtonColor: '#7c3aed'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: '',
      customCategory: '',
      paymentMethod: 'cash',
      expenseDate: new Date().toISOString().split('T')[0],
      receiptNumber: '',
      vendor: '',
      notes: ''
    })
  }

  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toFixed(2)}`
  }

  const formatCategory = (category) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getCategoryIcon = (category) => {
    const found = predefinedCategories.find(c => c.value === category)
    return found ? found.icon : '📋'
  }

  if (userInfo?.role === 'admin' && !selectedBranch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <Building className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Branch</h2>
            <p className="text-gray-600 mb-6">Please select a branch from the sidebar to view expenses</p>
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

  if (isLoading && !expenses.length) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading expenses for {selectedBranch || userInfo?.branch}...</p>
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
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-600" />
                Expense Management
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-500">Track and manage daily expenses</p>
                
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

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm font-medium">Total Expenses</p>
                <TrendingUp className="w-6 h-6 text-purple-200" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalAmount)}</p>
              <p className="text-purple-100 text-xs mt-1">{summary.expenseCount} transactions</p>
            </div>

            {summary.categoryBreakdown?.slice(0, 3).map((cat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium flex items-center gap-2">
                    <span>{getCategoryIcon(cat.category)}</span>
                    {formatCategory(cat.category)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(cat.total)}</p>
                <p className="text-gray-500 text-xs mt-1">{cat.count} expenses</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value })
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value })
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCategoryFilter('all')
                  setDateRange({ start: '', end: '' })
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No expenses recorded</p>
              <p className="text-gray-400 text-sm mt-2">
                {categoryFilter !== 'all' || dateRange.start || dateRange.end
                  ? 'Try adjusting your filters'
                  : `No expenses for ${currentBranch} branch`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense._id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {expense.expenseId}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {expense.description}
                          </div>
                          {expense.receiptNumber && (
                            <div className="text-xs text-gray-500">
                              Receipt: {expense.receiptNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                            <span>{getCategoryIcon(expense.category)}</span>
                            {formatCategory(expense.category)}
                          </span>
                          {expense.isCustomCategory && (
                            <span className="text-xs text-orange-600 mt-1 block">Custom</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-purple-600">
                            {formatCurrency(expense.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {expense.paymentMethod.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {expense.vendor || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedExpense(expense)
                                setShowDetailsModal(true)
                              }}
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {['admin', 'manager'].includes(userInfo?.role) && (
                              <button
                                onClick={() => handleDeleteExpense(expense.expenseId)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
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
                  <div className="text-sm text-gray-600">
                    Showing page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!pagination.hasNextPage}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

        {/* Create Expense Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Add New Expense</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Office supplies purchase"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Amount & Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (৳) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.expenseDate}
                        onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select category...</option>
                      {predefinedCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Category Input */}
                  {formData.category === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customCategory}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        placeholder="e.g., marketing_campaign"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Spaces will be replaced with underscores
                      </p>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Receipt Number & Vendor */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        value={formData.receiptNumber}
                        onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor/Supplier
                      </label>
                      <input
                        type="text"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes (optional)"
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </form>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateExpense}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Expense
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-violet-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Expense Details</h2>
                  <p className="text-sm text-purple-600 font-mono mt-1">{selectedExpense.expenseId}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {formatCurrency(selectedExpense.amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date</p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Category</p>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium inline-flex items-center gap-1">
                        <span>{getCategoryIcon(selectedExpense.category)}</span>
                        {formatCategory(selectedExpense.category)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedExpense.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                      <p className="text-base font-semibold text-gray-900 capitalize">
                        {selectedExpense.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Branch</p>
                      <p className="text-base font-semibold text-gray-900 capitalize">
                        {selectedExpense.branch}
                      </p>
                    </div>
                  </div>

                  {selectedExpense.receiptNumber && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedExpense.receiptNumber}
                      </p>
                    </div>
                  )}

                  {selectedExpense.vendor && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Vendor/Supplier</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedExpense.vendor}
                      </p>
                    </div>
                  )}

                  {selectedExpense.notes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Notes</p>
                      <p className="text-base text-gray-700 bg-gray-50 p-3 rounded">
                        {selectedExpense.notes}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-1">Created By</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedExpense.createdByName} ({selectedExpense.createdByRole})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedExpense.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
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
