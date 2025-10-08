'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Receipt,
  Calendar,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Package,
  CreditCard
} from 'lucide-react'

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    end: new Date().toISOString().split('T')[0] // Today
  })
  
  // Dashboard data
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    totalSales: 0,
    avgOrderValue: 0,
    profitMargin: 0
  })

  const [salesData, setSalesData] = useState([])
  const [expensesData, setExpensesData] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [topExpenseCategories, setTopExpenseCategories] = useState([])

  // Quick date filters
  const quickFilters = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', type: 'month' },
    { label: 'Last Month', type: 'lastMonth' }
  ]

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    if (storedUserInfo) {
      const parsed = JSON.parse(storedUserInfo)
      setUserInfo(parsed)
    }
  }, [])

  useEffect(() => {
    if (userInfo) {
      fetchDashboardData()
    }
  }, [userInfo, dateRange])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchSales(),
        fetchExpenses()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 100
      })

      const response = await fetch(`/api/sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSalesData(data.sales || [])
        setRecentSales((data.sales || []).slice(0, 5))
        calculateSalesMetrics(data.sales || [])
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 100
      })

      const response = await fetch(`/api/expenses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setExpensesData(data.expenses || [])
        calculateExpensesMetrics(data.expenses || [], data.summary?.categoryBreakdown || [])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const calculateSalesMetrics = (sales) => {
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.adjustedAmount || sale.totalAmount || 0), 0)
    const totalOrders = sales.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    setSummary(prev => ({
      ...prev,
      totalRevenue,
      totalSales: totalOrders,
      totalOrders,
      avgOrderValue
    }))
  }

  const calculateExpensesMetrics = (expenses, categoryBreakdown) => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Set top expense categories
    setTopExpenseCategories(categoryBreakdown.slice(0, 5))

    setSummary(prev => {
      const netProfit = prev.totalRevenue - totalExpenses
      const profitMargin = prev.totalRevenue > 0 ? (netProfit / prev.totalRevenue) * 100 : 0

      return {
        ...prev,
        totalExpenses,
        netProfit,
        profitMargin
      }
    })
  }

  const applyQuickFilter = (filter) => {
    const today = new Date()
    let start, end

    if (filter.days !== undefined) {
      if (filter.days === 0) {
        // Today
        start = new Date(today)
        end = new Date(today)
      } else if (filter.days === 1) {
        // Yesterday
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        start = yesterday
        end = yesterday
      } else {
        // Last N days
        start = new Date(today)
        start.setDate(start.getDate() - filter.days)
        end = today
      }
    } else if (filter.type === 'month') {
      // This month
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
    } else if (filter.type === 'lastMonth') {
      // Last month
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatCategory = (category) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (isLoading && !salesData.length && !expensesData.length) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                Business Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Overview of sales, expenses, and revenue
                {userInfo?.branch && (
                  <span className="ml-2 text-purple-600 font-medium">
                    • {userInfo.branch.charAt(0).toUpperCase() + userInfo.branch.slice(1)} Branch
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
            {quickFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => applyQuickFilter(filter)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-100 text-sm font-medium">Total Revenue</p>
              <DollarSign className="w-6 h-6 text-green-200" />
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(summary.totalRevenue)}</p>
            <div className="flex items-center gap-1 text-green-100 text-xs">
              <ShoppingCart className="w-3 h-3" />
              {summary.totalSales} sales
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <Receipt className="w-6 h-6 text-red-200" />
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(summary.totalExpenses)}</p>
            <div className="flex items-center gap-1 text-red-100 text-xs">
              <TrendingDown className="w-3 h-3" />
              {expensesData.length} transactions
            </div>
          </div>

          {/* Net Profit */}
          <div className={`bg-gradient-to-br ${summary.netProfit >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'} text-white p-6 rounded-xl shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-sm font-medium">Net Profit</p>
              {summary.netProfit >= 0 ? (
                <ArrowUp className="w-6 h-6 text-blue-200" />
              ) : (
                <ArrowDown className="w-6 h-6 text-orange-200" />
              )}
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(summary.netProfit)}</p>
            <div className="flex items-center gap-1 text-blue-100 text-xs">
              {summary.netProfit >= 0 ? '📈 Profit' : '📉 Loss'}
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-purple-100 text-sm font-medium">Profit Margin</p>
              <TrendingUp className="w-6 h-6 text-purple-200" />
            </div>
            <p className="text-3xl font-bold mb-1">{summary.profitMargin.toFixed(1)}%</p>
            <div className="flex items-center gap-1 text-purple-100 text-xs">
              Avg: {formatCurrency(summary.avgOrderValue)}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue vs Expenses Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Revenue vs Expenses
            </h3>
            <div className="space-y-4">
              {/* Revenue Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Revenue</span>
                  <span className="font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-bold transition-all duration-500"
                    style={{ width: '100%' }}
                  >
                    100%
                  </div>
                </div>
              </div>

              {/* Expenses Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Expenses</span>
                  <span className="font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-rose-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-bold transition-all duration-500"
                    style={{ 
                      width: summary.totalRevenue > 0 
                        ? `${Math.min((summary.totalExpenses / summary.totalRevenue) * 100, 100)}%` 
                        : '0%' 
                    }}
                  >
                    {summary.totalRevenue > 0 
                      ? `${Math.min(((summary.totalExpenses / summary.totalRevenue) * 100), 100).toFixed(0)}%` 
                      : '0%'}
                  </div>
                </div>
              </div>

              {/* Profit Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Net Profit</span>
                  <span className={`font-bold ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(summary.netProfit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className={`${summary.netProfit >= 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-600'} h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-bold transition-all duration-500`}
                    style={{ 
                      width: summary.totalRevenue > 0 
                        ? `${Math.min(Math.abs(summary.netProfit / summary.totalRevenue) * 100, 100)}%` 
                        : '0%' 
                    }}
                  >
                    {summary.totalRevenue > 0 
                      ? `${Math.min((Math.abs(summary.netProfit) / summary.totalRevenue) * 100, 100).toFixed(0)}%` 
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Expense Categories */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Top Expense Categories
            </h3>
            {topExpenseCategories.length > 0 ? (
              <div className="space-y-3">
                {topExpenseCategories.map((cat, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium capitalize">{formatCategory(cat.category)}</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-violet-600 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: summary.totalExpenses > 0 
                            ? `${(cat.total / summary.totalExpenses) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              Recent Sales ({recentSales.length})
            </h3>
          </div>
          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sale ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-purple-600">
                        {sale.saleId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {sale.customer?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {sale.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {formatCurrency(sale.adjustedAmount || sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {sale.paymentType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No sales data available</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
