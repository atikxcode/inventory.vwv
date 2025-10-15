'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { useBranch } from '@/contexts/BranchContext'
import { 
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  ShoppingCart,
  Receipt,
  DollarSign,
  ClipboardList,
  Filter,
  Printer,
  FileSpreadsheet,
  Eye,
  Building,
  BarChart3,
  ChevronDown,
  Check,
  Smartphone,
  CreditCard
} from 'lucide-react'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

export default function ReportsPage() {
  const { selectedBranch, changeBranch } = useBranch()
  const [userInfo, setUserInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState(null)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [showSalesSubMenu, setShowSalesSubMenu] = useState(false)
  const [showMobileBankingSubMenu, setShowMobileBankingSubMenu] = useState(false)
  const [showCardSubMenu, setShowCardSubMenu] = useState(false)
  const [selectedSalesCategory, setSelectedSalesCategory] = useState(null)

  const reportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'View all sales transactions and revenue',
      icon: ShoppingCart,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'expenses',
      name: 'Expenses Report',
      description: 'Track all business expenses by category',
      icon: Receipt,
      color: 'from-red-500 to-rose-600',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Current stock levels for selected branch',
      icon: Package,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'orders',
      name: 'Orders Report',
      description: 'Customer orders and fulfillment status',
      icon: ClipboardList,
      color: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'profit',
      name: 'Profit & Loss Report',
      description: 'Revenue, expenses, and net profit analysis',
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
    id: 'combined',
    name: 'Combined Report',
    description: 'All reports in one - Sales, Expenses, Inventory, Orders, and Profit',
    icon: BarChart3,
    color: 'from-indigo-500 to-purple-600',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  }
  ]

  const salesCategories = [
    {
      id: 'total_sell',
      name: 'Total Sell',
      description: 'All sales transactions',
      icon: ShoppingCart,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'cash_sell',
      name: 'Cash Sell',
      description: 'Cash payment sales only',
      icon: DollarSign,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'mobile_banking',
      name: 'Mobile Banking',
      description: 'Mobile banking payment sales',
      icon: Smartphone,
      color: 'from-pink-500 to-rose-600',
      hasSubMenu: true
    },
    {
      id: 'card_sell',
      name: 'Card Sell',
      description: 'Card payment sales',
      icon: CreditCard,
      color: 'from-purple-500 to-violet-600',
      hasSubMenu: true
    }
  ]

  const mobileBankingOptions = [
    {
      id: 'bkash',
      name: 'Bkash',
      description: 'Bkash payment sales',
      icon: Smartphone,
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 'nagad',
      name: 'Nagad',
      description: 'Nagad payment sales',
      icon: Smartphone,
      color: 'from-orange-500 to-amber-600'
    },
    {
      id: 'rocket',
      name: 'Rocket',
      description: 'Rocket payment sales',
      icon: Smartphone,
      color: 'from-purple-500 to-violet-600'
    },
    {
      id: 'all',
      name: 'All Type',
      description: 'All mobile banking sales',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-600'
    }
  ]

  const cardOptions = [
    {
      id: 'credit_card',
      name: 'Credit Card',
      description: 'Credit card payment sales',
      icon: CreditCard,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'debit_card',
      name: 'Debit Card',
      description: 'Debit card payment sales',
      icon: CreditCard,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'american_express',
      name: 'American Express',
      description: 'American Express card sales',
      icon: CreditCard,
      color: 'from-slate-500 to-gray-600'
    },
    {
      id: 'all',
      name: 'All Type',
      description: 'All card payment sales',
      icon: CreditCard,
      color: 'from-purple-500 to-violet-600'
    }
  ]

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    if (storedUserInfo) {
      const parsed = JSON.parse(storedUserInfo)
      setUserInfo(parsed)
    }
    fetchBranches()
  }, [])

  useEffect(() => {
    if (reportData && selectedReport && userInfo) {
      const currentBranch = selectedBranch || userInfo?.branch
      console.log('🔄 Branch changed, regenerating report for:', currentBranch)
      
      if (selectedReport === 'sales' && selectedSalesCategory) {
        handleSalesReportGeneration(selectedSalesCategory)
      } else {
        generateReport(selectedReport)
      }
    }
  }, [selectedBranch])

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

  const generateReport = async (reportType) => {
    setIsLoading(true)
    setSelectedReport(reportType)
    
    try {
      const token = localStorage.getItem('auth-token')
      const currentBranch = selectedBranch || userInfo?.branch

      console.log('🔥 Generating report for branch:', currentBranch)

      switch (reportType) {
      case 'sales':
        setShowSalesSubMenu(true)
        setIsLoading(false)
        return
      case 'expenses':
        await generateExpensesReport(token, currentBranch)
        break
      case 'inventory':
        await generateInventoryReport(token, currentBranch)
        break
      case 'orders':
        await generateOrdersReport(token, currentBranch)
        break
      case 'profit':
        await generateProfitReport(token, currentBranch)
        break
      case 'combined':
        await generateCombinedReport(token, currentBranch)
        break
      default:
        throw new Error('Invalid report type')
    }


      Swal.fire({
        icon: 'success',
        title: 'Report Generated!',
        text: 'Your report is ready to view or download',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Report generation error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate report. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSalesReportGeneration = async (category) => {
    if (category === 'mobile_banking') {
      setShowMobileBankingSubMenu(true)
      return
    }
    if (category === 'card_sell') {
      setShowCardSubMenu(true)
      return
    }

    setIsLoading(true)
    setSelectedReport('sales')
    setSelectedSalesCategory(category)
    setShowSalesSubMenu(false)
    
    try {
      const token = localStorage.getItem('auth-token')
      const currentBranch = selectedBranch || userInfo?.branch

      console.log('🔥 Generating sales report for branch:', currentBranch, 'Category:', category)
      await generateSalesReport(token, currentBranch, category)

      Swal.fire({
        icon: 'success',
        title: 'Report Generated!',
        text: 'Your report is ready to view or download',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Report generation error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate report. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMobileBankingSelection = async (method) => {
    setIsLoading(true)
    setSelectedReport('sales')
    setSelectedSalesCategory(`mobile_banking_${method}`)
    setShowMobileBankingSubMenu(false)
    setShowSalesSubMenu(false)
    
    try {
      const token = localStorage.getItem('auth-token')
      const currentBranch = selectedBranch || userInfo?.branch

      console.log('🔥 Generating mobile banking sales report:', method)
      await generateSalesReport(token, currentBranch, 'mobile_banking', method)

      Swal.fire({
        icon: 'success',
        title: 'Report Generated!',
        text: 'Your mobile banking report is ready',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Report generation error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate report. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardSelection = async (method) => {
    setIsLoading(true)
    setSelectedReport('sales')
    setSelectedSalesCategory(`card_${method}`)
    setShowCardSubMenu(false)
    setShowSalesSubMenu(false)
    
    try {
      const token = localStorage.getItem('auth-token')
      const currentBranch = selectedBranch || userInfo?.branch

      console.log('🔥 Generating card sales report:', method)
      await generateSalesReport(token, currentBranch, 'card', method)

      Swal.fire({
        icon: 'success',
        title: 'Report Generated!',
        text: 'Your card sales report is ready',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Report generation error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate report. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateSalesReport = async (token, branch, category = 'total_sell', subMethod = null) => {
    const params = new URLSearchParams({
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 1000,
      branch: branch
    })

    // 🔥 FIXED: Send proper API params based on category and subMethod
    if (category === 'mobile_banking' && subMethod) {
      params.append('mobileBankingMethod', subMethod)
    } else if (category === 'card' && subMethod) {
      params.append('cardMethod', subMethod)
    } else if (category === 'cash_sell') {
      params.append('paymentType', 'cash')
    }

    console.log('🔍 API Request:', `/api/sales?${params.toString()}`)

    const response = await fetch(`/api/sales?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      let sales = data.sales || []
      
      console.log('✅ API Response: Received', sales.length, 'sales')
      console.log('🔍 Category:', category, 'SubMethod:', subMethod)
      
      // 🔥 CRITICAL FIX: DO NOT filter if subMethod is provided (backend already filtered)
      // ONLY filter on frontend for general categories without subMethod
            // 🔥 FIXED: Filter logic based on category
      if (!subMethod) {
        if (category === 'total_sell') {
          // ✅ NO FILTERING - Show ALL sales for this branch
          console.log('✅ Total Sell: Showing ALL sales =', sales.length)
        } else if (category === 'cash_sell') {
          sales = sales.filter(sale => sale.paymentType?.toLowerCase() === 'cash')
          console.log('✅ Frontend filter: Cash sales =', sales.length)
        } else if (category === 'card_sell') {
          sales = sales.filter(sale => sale.paymentType?.toLowerCase() === 'card')
          console.log('✅ Frontend filter: Card sales =', sales.length)
        } else if (category === 'mobile_banking') {
          sales = sales.filter(sale => sale.paymentType?.toLowerCase() === 'mobile_banking')
          console.log('✅ Frontend filter: Mobile banking sales =', sales.length)
        }
      } else {
        // Backend already filtered for specific method (rocket, credit_card, bkash, etc.)
        console.log('✅ Using backend-filtered data:', sales.length, 'sales for', subMethod)
      }

      
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.adjustedAmount || sale.totalAmount || 0), 0)
      const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0)
      const totalOrders = sales.length
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      const paymentBreakdown = sales.reduce((acc, sale) => {
        const method = sale.paymentType || 'unknown'
        acc[method] = (acc[method] || 0) + (sale.adjustedAmount || sale.totalAmount || 0)
        return acc
      }, {})

      setReportData({
        type: 'sales',
        category: subMethod ? `${category}_${subMethod}` : category,
        subMethod: subMethod,
        summary: {
          totalRevenue,
          totalDiscount,
          totalOrders,
          avgOrderValue,
          paymentBreakdown
        },
        details: sales,
        dateRange,
        branch
      })
    } else {
      const errorData = await response.json()
      console.error('❌ API Error:', errorData)
      throw new Error(errorData.error || 'Failed to fetch sales data')
    }
  }

  const getPaymentMethodName = (sale, subMethod) => {
    if (!sale.payment?.methods || sale.payment.methods.length === 0) {
      return sale.paymentType || 'Unknown'
    }

    if (subMethod && subMethod !== 'all') {
      const method = sale.payment.methods.find(m => m.id === subMethod)
      if (method) {
        return method.name || formatCategory(subMethod)
      }
    }

    if (sale.payment.methods.length === 1) {
      return sale.payment.methods[0].name || formatCategory(sale.payment.methods[0].id)
    } else {
      return sale.payment.methods.map(m => m.name || formatCategory(m.id)).join(', ')
    }
  }

  const generateExpensesReport = async (token, branch) => {
    const params = new URLSearchParams({
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 1000,
      branch: branch
    })

    console.log('🔍 Generating expenses report for branch:', branch)

    const response = await fetch(`/api/expenses?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const expenses = data.expenses || []
      
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      const categoryBreakdown = expenses.reduce((acc, exp) => {
        const cat = exp.category
        if (!acc[cat]) {
          acc[cat] = { total: 0, count: 0 }
        }
        acc[cat].total += exp.amount
        acc[cat].count += 1
        return acc
      }, {})

      const paymentBreakdown = expenses.reduce((acc, exp) => {
        const method = exp.paymentMethod || 'unknown'
        acc[method] = (acc[method] || 0) + exp.amount
        return acc
      }, {})

      setReportData({
        type: 'expenses',
        summary: {
          totalExpenses,
          transactionCount: expenses.length,
          categoryBreakdown,
          paymentBreakdown
        },
        details: expenses,
        dateRange,
        branch
      })
    }
  }

  const generateInventoryReport = async (token, branch) => {
    const params = new URLSearchParams({
      limit: 1000
    })

    console.log('🔍 Generating inventory report for branch:', branch)

    const response = await fetch(`/api/products?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const products = data.products || []
      
      const branchStockKey = `${branch}_stock`
      let totalProducts = 0
      let totalStockValue = 0
      let lowStockItems = 0
      const branchStock = { [branch]: { quantity: 0, value: 0, products: 0 } }

      const branchProducts = []

      products.forEach(product => {
        if (product.stock && product.stock[branchStockKey] !== undefined) {
          const qty = product.stock[branchStockKey] || 0
          
          branchProducts.push(product)
          totalProducts++
          
          branchStock[branch].quantity += qty
          branchStock[branch].value += qty * (product.price || 0)
          branchStock[branch].products++
          
          totalStockValue += qty * (product.price || 0)
          
          if (qty < 10) lowStockItems++
        }
      })

      console.log('✅ Branch inventory:', {
        branch,
        totalProducts,
        totalStockValue,
        lowStockItems,
        productsFound: branchProducts.length
      })

      setReportData({
        type: 'inventory',
        summary: {
          totalProducts,
          totalStockValue,
          lowStockItems,
          branchStock
        },
        details: branchProducts,
        dateRange,
        branch
      })
    }
  }

  const generateOrdersReport = async (token, branch) => {
    const params = new URLSearchParams({
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 1000,
      branch: branch
    })

    console.log('🔍 Generating orders report for branch:', branch)

    const response = await fetch(`/api/orders?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const orders = data.orders || []
      
      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0)
      
      const statusBreakdown = orders.reduce((acc, order) => {
        const status = order.status
        if (!acc[status]) {
          acc[status] = { count: 0, value: 0 }
        }
        acc[status].count += 1
        acc[status].value += order.totals?.total || 0
        return acc
      }, {})

      setReportData({
        type: 'orders',
        summary: {
          totalOrders,
          totalRevenue,
          statusBreakdown
        },
        details: orders,
        dateRange,
        branch
      })
    }
  }

  // 🔥 UPDATED: Profit report using stored buying prices (NO PRODUCT API CALLS!)
  const generateProfitReport = async (token, branch) => {
    const params = new URLSearchParams({
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 1000,
      branch: branch
    })

    console.log('🔍 Generating profit report for branch:', branch)

    const [salesRes, expensesRes] = await Promise.all([
      fetch(`/api/sales?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      }),
      fetch(`/api/expenses?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
    ])

    if (salesRes.ok && expensesRes.ok) {
      const salesData = await salesRes.json()
      const expensesData = await expensesRes.json()
      
      const sales = salesData.sales || []
      const expenses = expensesData.expenses || []
      
      // 🔥 Calculate total revenue from adjusted amounts
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.adjustedAmount || sale.totalAmount || 0), 0)
      
      // 🔥 NEW: Calculate total cost using stored buying prices (INSTANT!)
      let totalCost = 0
      
      for (const sale of sales) {
        if (!sale.items || sale.items.length === 0) continue
        
        for (const item of sale.items) {
          // 🔥 Use stored buying price from sale data (NO API CALL!)
          const buyingPrice = parseFloat(item.buyingPrice) || 0
          const quantity = parseInt(item.quantity) || 0
          const itemCost = buyingPrice * quantity
          
          totalCost += itemCost
          
          console.log(`📦 ${item.productName}: ৳${buyingPrice} × ${quantity} = ৳${itemCost}`)
        }
      }
      
      // 🔥 Calculate gross profit
      const grossProfit = totalRevenue - totalCost
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      // 🔥 Calculate net profit = gross profit - expenses
      const netProfit = grossProfit - totalExpenses
      
      // Calculate profit margin based on net profit
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      console.log('✅ Profit Report Calculated:')
      console.log('  Total Revenue:', totalRevenue)
      console.log('  Total Cost (COGS):', totalCost)
      console.log('  Gross Profit:', grossProfit)
      console.log('  Total Expenses:', totalExpenses)
      console.log('  Net Profit:', netProfit)
      console.log('  Profit Margin:', profitMargin.toFixed(2) + '%')

      setReportData({
        type: 'profit',
        summary: {
          totalRevenue,
          totalCost, // 🔥 NEW: Product cost
          grossProfit, // 🔥 NEW: Revenue - Cost
          totalExpenses,
          netProfit, // 🔥 UPDATED: Gross Profit - Expenses
          profitMargin, // 🔥 UPDATED: Based on net profit
          salesCount: sales.length,
          expensesCount: expenses.length
        },
        details: {
          sales,
          expenses
        },
        dateRange,
        branch
      })
    }
  }

    // 🔥 NEW: Combined Report - All reports in one!
  const generateCombinedReport = async (token, branch) => {
    console.log('🔍 Generating COMBINED report for branch:', branch)

    try {
      // Fetch all data in parallel for maximum speed
      const [salesData, expensesData, productsData, ordersData] = await Promise.all([
        // Sales
        fetch(`/api/sales?${new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
          limit: 1000,
          branch: branch
        })}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(res => res.json()),
        
        // Expenses
        fetch(`/api/expenses?${new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
          limit: 1000,
          branch: branch
        })}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(res => res.json()),
        
        // Inventory
        fetch(`/api/products?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(res => res.json()),
        
        // Orders
        fetch(`/api/orders?${new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
          limit: 1000,
          branch: branch
        })}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(res => res.json())
      ])

      const sales = salesData.sales || []
      const expenses = expensesData.expenses || []
      const products = productsData.products || []
      const orders = ordersData.orders || []

      // Calculate Sales Summary
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.adjustedAmount || sale.totalAmount || 0), 0)
      let totalCost = 0
      
      for (const sale of sales) {
        if (!sale.items || sale.items.length === 0) continue
        for (const item of sale.items) {
          const buyingPrice = parseFloat(item.buyingPrice) || 0
          const quantity = parseInt(item.quantity) || 0
          totalCost += buyingPrice * quantity
        }
      }
      
      const grossProfit = totalRevenue - totalCost

      // Calculate Expenses Summary
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const netProfit = grossProfit - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // Calculate Inventory Summary
      const branchStockKey = `${branch}_stock`
      let totalProducts = 0
      let totalStockValue = 0
      let lowStockItems = 0

      const branchProducts = products.filter(product => {
        if (product.stock && product.stock[branchStockKey] !== undefined) {
          const qty = product.stock[branchStockKey] || 0
          totalProducts++
          totalStockValue += qty * (product.price || 0)
          if (qty < 10) lowStockItems++
          return true
        }
        return false
      })

      // Calculate Orders Summary
      const totalOrders = orders.length
      const ordersRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0)

      console.log('✅ Combined Report Generated Successfully')

      setReportData({
        type: 'combined',
        summary: {
          // Sales
          totalRevenue,
          totalCost,
          grossProfit,
          salesCount: sales.length,
          
          // Expenses
          totalExpenses,
          expensesCount: expenses.length,
          
          // Profit
          netProfit,
          profitMargin,
          
          // Inventory
          totalProducts,
          totalStockValue,
          lowStockItems,
          
          // Orders
          totalOrders,
          ordersRevenue
        },
        details: {
          sales: sales.slice(0, 10), // Top 10 sales
          expenses: expenses.slice(0, 10), // Top 10 expenses
          products: branchProducts.slice(0, 10), // Top 10 products
          orders: orders.slice(0, 10) // Top 10 orders
        },
        dateRange,
        branch
      })
    } catch (error) {
      console.error('❌ Combined report generation error:', error)
      throw error
    }
  }


  const downloadPDF = async () => {
    if (!reportData) return

    try {
      Swal.fire({
        title: 'Generating PDF...',
        text: 'Please wait while we create your PDF report',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      const element = document.getElementById('report-content')
      
      if (!element) {
        throw new Error('Report content not found')
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pageHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10

      const scaledHeight = imgHeight * ratio
      let heightLeft = scaledHeight
      let position = imgY

      pdf.addImage(imgData, 'JPEG', imgX, position, imgWidth * ratio, scaledHeight)
      heightLeft -= (pageHeight - imgY)

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + imgY
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', imgX, position, imgWidth * ratio, scaledHeight)
        heightLeft -= pageHeight
      }
      
      const categoryName = reportData.category ? `_${reportData.category}` : ''
      const filename = `${reportData.type}${categoryName}_report_${reportData.branch}_${dateRange.start}_to_${dateRange.end}.pdf`
      pdf.save(filename)

      Swal.fire({
        icon: 'success',
        title: 'PDF Downloaded!',
        text: 'Your report has been downloaded successfully',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      Swal.fire({
        icon: 'error',
        title: 'PDF Generation Failed',
        text: 'Failed to generate PDF. Please try again.',
        confirmButtonColor: '#7c3aed'
      })
    }
  }

  const downloadExcel = () => {
    if (!reportData) return

    let csvContent = ''
    const categoryName = reportData.category ? `_${reportData.category}` : ''
    let filename = `${reportData.type}${categoryName}_report_${reportData.branch}_${dateRange.start}_to_${dateRange.end}.csv`

    switch (reportData.type) {
      case 'sales':
        csvContent = generateSalesCSV(reportData)
        break
      case 'expenses':
        csvContent = generateExpensesCSV(reportData)
        break
      case 'inventory':
        csvContent = generateInventoryCSV(reportData)
        break
      case 'orders':
        csvContent = generateOrdersCSV(reportData)
        break
      case 'profit':
        csvContent = generateProfitCSV(reportData)
        break
      case 'combined':
        csvContent = generateCombinedCSV(reportData)
        break
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    Swal.fire({
      icon: 'success',
      title: 'Downloaded!',
      text: 'CSV file has been downloaded',
      confirmButtonColor: '#7c3aed',
      timer: 2000,
      showConfirmButton: false
    })
  }

  const generateSalesCSV = (data) => {
    let csv = 'Sales Report\n'
    csv += `Branch: ${data.branch}\n`
    if (data.category) {
      csv += `Category: ${data.category}\n`
    }
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Revenue,${data.summary.totalRevenue}\n`
    csv += `Total Orders,${data.summary.totalOrders}\n`
    csv += `Average Order Value,${data.summary.avgOrderValue}\n\n`
    csv += 'Sale ID,Customer,Items,Amount,Payment Type,Date\n'
    
    data.details.forEach(sale => {
      const paymentMethodName = getPaymentMethodName(sale, data.subMethod)
      csv += `${sale.saleId},${sale.customer?.name || 'N/A'},${sale.items?.length || 0},${sale.adjustedAmount || sale.totalAmount},${paymentMethodName},${new Date(sale.createdAt).toLocaleDateString()}\n`
    })
    
    return csv
  }

  const generateExpensesCSV = (data) => {
    let csv = 'Expenses Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Expenses,${data.summary.totalExpenses}\n`
    csv += `Transaction Count,${data.summary.transactionCount}\n\n`
    csv += 'Expense ID,Description,Category,Amount,Payment Method,Date\n'
    
    data.details.forEach(expense => {
      csv += `${expense.expenseId},${expense.description},${expense.category},${expense.amount},${expense.paymentMethod},${new Date(expense.expenseDate).toLocaleDateString()}\n`
    })
    
    return csv
  }

  const generateInventoryCSV = (data) => {
    let csv = 'Inventory Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Generated on: ${new Date().toLocaleDateString()}\n\n`
    csv += 'Summary\n'
    csv += `Total Products,${data.summary.totalProducts}\n`
    csv += `Total Stock Value,${data.summary.totalStockValue}\n`
    csv += `Low Stock Items,${data.summary.lowStockItems}\n\n`
    csv += `Product Name,Category,Price,${data.branch} Stock,Stock Value\n`
    
    const branchStockKey = `${data.branch}_stock`
    data.details.forEach(product => {
      const branchStock = product.stock?.[branchStockKey] || 0
      csv += `${product.name},${product.category},${product.price},${branchStock},${branchStock * product.price}\n`
    })
    
    return csv
  }

  const generateOrdersCSV = (data) => {
    let csv = 'Orders Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Orders,${data.summary.totalOrders}\n`
    csv += `Total Revenue,${data.summary.totalRevenue}\n\n`
    csv += 'Order ID,Customer,Email,Items,Total,Status,Date\n'
    
    data.details.forEach(order => {
      csv += `${order.orderId},${order.customerInfo?.fullName},${order.customerInfo?.email},${order.totals?.itemCount},${order.totals?.total},${order.status},${new Date(order.createdAt).toLocaleDateString()}\n`
    })
    
    return csv
  }

  // 🔥 UPDATED: CSV export with cost breakdown
  const generateProfitCSV = (data) => {
    let csv = 'Profit & Loss Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Revenue,${data.summary.totalRevenue}\n`
    csv += `Product Cost (COGS),${data.summary.totalCost}\n` // 🔥 NEW
    csv += `Gross Profit,${data.summary.grossProfit}\n` // 🔥 NEW
    csv += `Operating Expenses,${data.summary.totalExpenses}\n`
    csv += `Net Profit,${data.summary.netProfit}\n`
    csv += `Profit Margin,${data.summary.profitMargin}%\n`
    
    return csv
  }

  // Combined csv report
    const generateCombinedCSV = (data) => {
    let csv = 'Combined Business Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    
    csv += '=== FINANCIAL SUMMARY ===\n'
    csv += `Total Revenue,${data.summary.totalRevenue}\n`
    csv += `Product Cost (COGS),${data.summary.totalCost}\n`
    csv += `Gross Profit,${data.summary.grossProfit}\n`
    csv += `Operating Expenses,${data.summary.totalExpenses}\n`
    csv += `Net Profit,${data.summary.netProfit}\n`
    csv += `Profit Margin,${data.summary.profitMargin}%\n\n`
    
    csv += '=== SALES SUMMARY ===\n'
    csv += `Total Sales,${data.summary.salesCount}\n\n`
    
    csv += '=== EXPENSES SUMMARY ===\n'
    csv += `Total Expenses,${data.summary.expensesCount}\n\n`
    
    csv += '=== INVENTORY SUMMARY ===\n'
    csv += `Total Products,${data.summary.totalProducts}\n`
    csv += `Stock Value,${data.summary.totalStockValue}\n`
    csv += `Low Stock Items,${data.summary.lowStockItems}\n\n`
    
    csv += '=== ORDERS SUMMARY ===\n'
    csv += `Total Orders,${data.summary.totalOrders}\n`
    csv += `Orders Revenue,${data.summary.ordersRevenue}\n`
    
    return csv
  }


  const printReport = () => {
    window.print()
  }

  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatCategory = (category) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (userInfo?.role === 'admin' && !selectedBranch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <Building className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Branch</h2>
            <p className="text-gray-600 mb-6">Please select a branch from the sidebar to generate reports</p>
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

  const currentBranch = selectedBranch || userInfo?.branch

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-600" />
                Reports & Analytics
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-500">Generate and download business reports</p>
                
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

                {userInfo?.role === 'pos' && userInfo?.branch && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium capitalize flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {userInfo.branch} Branch
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">Select Date Range</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <div
                key={report.id}
                className={`${report.bgColor} border-2 ${report.borderColor} rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all ${
                  selectedReport === report.id ? 'ring-4 ring-purple-300 scale-105' : ''
                }`}
                onClick={() => generateReport(report.id)}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${report.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`text-lg font-bold ${report.textColor} mb-2`}>
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                <button
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    isLoading && selectedReport === report.id
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : `bg-gradient-to-r ${report.color} text-white hover:opacity-90`
                  }`}
                  disabled={isLoading && selectedReport === report.id}
                >
                  {isLoading && selectedReport === report.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </span>
                  ) : (
                    report.id === 'sales' ? 'Select Category' : 'Generate Report'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Sales Sub-Menu Modal - KEEPING SAME */}
        {showSalesSubMenu && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSalesSubMenu(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-7 h-7 text-green-600" />
                        Select Sales Report Category
                      </h2>
                      <p className="text-gray-600 mt-1">Choose the type of sales report you want to generate</p>
                    </div>
                    <button
                      onClick={() => setShowSalesSubMenu(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {salesCategories.map((category) => {
                    const CategoryIcon = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleSalesReportGeneration(category.id)}
                        disabled={isLoading}
                        className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <CategoryIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        {category.hasSubMenu && (
                          <p className="text-xs text-purple-600 mt-2 font-medium">Click to see options →</p>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowSalesSubMenu(false)}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Mobile Banking Modal - KEEPING SAME */}
        {showMobileBankingSubMenu && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowMobileBankingSubMenu(false)
                setShowSalesSubMenu(true)
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Smartphone className="w-7 h-7 text-pink-600" />
                        Select Mobile Banking Method
                      </h2>
                      <p className="text-gray-600 mt-1">Choose mobile banking payment method</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowMobileBankingSubMenu(false)
                        setShowSalesSubMenu(true)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mobileBankingOptions.map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleMobileBankingSelection(option.id)}
                        disabled={isLoading}
                        className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-pink-400 hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${option.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <OptionIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{option.name}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowMobileBankingSubMenu(false)
                      setShowSalesSubMenu(true)
                    }}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Card Sub-Menu Modal - KEEPING SAME */}
        {showCardSubMenu && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowCardSubMenu(false)
                setShowSalesSubMenu(true)
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CreditCard className="w-7 h-7 text-purple-600" />
                        Select Card Type
                      </h2>
                      <p className="text-gray-600 mt-1">Choose card payment method</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCardSubMenu(false)
                        setShowSalesSubMenu(true)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cardOptions.map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleCardSelection(option.id)}
                        disabled={isLoading}
                        className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${option.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <OptionIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{option.name}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowCardSubMenu(false)
                      setShowSalesSubMenu(true)
                    }}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Report Display Area - Continue with existing code... */}
        {reportData && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden" id="report-content">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {reportTypes.find(r => r.id === reportData.type)?.name}
                    {reportData.category && reportData.category !== 'total_sell' && (
                      <span className="text-lg text-purple-600 ml-2">
                        ({formatCategory(reportData.category)})
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Branch: <span className="font-medium capitalize">{reportData.branch}</span> | 
                    Period: {new Date(reportData.dateRange.start).toLocaleDateString()} - {new Date(reportData.dateRange.end).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 no-print">
                  <button
                    onClick={printReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Sales Report Display - KEEPING SAME */}
              {reportData.type === 'sales' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalRevenue)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.totalOrders}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(reportData.summary.avgOrderValue)}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-sm text-gray-600 mb-1">Total Discount</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(reportData.summary.totalDiscount)}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Breakdown</h3>
                  <div className="space-y-2 mb-6">
                    {Object.entries(reportData.summary.paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="capitalize font-medium">{method.replace('_', ' ')}</span>
                        <span className="font-bold text-gray-900">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Transactions ({reportData.details.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Sale ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Customer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Items</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Payment</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.details.slice(0, 20).map((sale) => (
                          <tr key={sale._id}>
                            <td className="px-4 py-2 text-sm">{sale.saleId}</td>
                            <td className="px-4 py-2 text-sm">{sale.customer?.name || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm">{sale.items?.length || 0}</td>
                            <td className="px-4 py-2 text-sm font-bold">{formatCurrency(sale.adjustedAmount || sale.totalAmount)}</td>
                            <td className="px-4 py-2 text-sm capitalize">{getPaymentMethodName(sale, reportData.subMethod)}</td>
                            <td className="px-4 py-2 text-sm">{new Date(sale.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expenses Report - KEEPING SAME (code continues...) */}
              {reportData.type === 'expenses' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(reportData.summary.totalExpenses)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.transactionCount}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Category Breakdown</h3>
                  <div className="space-y-2 mb-6">
                    {Object.entries(reportData.summary.categoryBreakdown)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([category, data]) => (
                        <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium capitalize">{formatCategory(category)}</span>
                            <span className="text-xs text-gray-500 ml-2">({data.count} transactions)</span>
                          </div>
                          <span className="font-bold text-gray-900">{formatCurrency(data.total)}</span>
                        </div>
                      ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Expenses ({reportData.details.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Expense ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.details.slice(0, 20).map((expense) => (
                          <tr key={expense._id}>
                            <td className="px-4 py-2 text-sm">{expense.expenseId}</td>
                            <td className="px-4 py-2 text-sm">{expense.description}</td>
                            <td className="px-4 py-2 text-sm capitalize">{formatCategory(expense.category)}</td>
                            <td className="px-4 py-2 text-sm font-bold">{formatCurrency(expense.amount)}</td>
                            <td className="px-4 py-2 text-sm">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Inventory Report - KEEPING SAME */}
              {reportData.type === 'inventory' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Total Products</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.totalProducts}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Stock Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalStockValue)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reportData.summary.lowStockItems}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">{reportData.branch.charAt(0).toUpperCase() + reportData.branch.slice(1)} Branch Stock</h3>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                    {Object.entries(reportData.summary.branchStock).map(([branch, data]) => (
                      <div key={branch} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-sm text-gray-600 mb-1 capitalize">{branch} Branch</p>
                        <p className="text-xl font-bold text-purple-600 mb-1">
                          {data.quantity} units
                        </p>
                        <p className="text-sm text-gray-600">
                          Value: {formatCurrency(data.value)} | Products: {data.products}
                        </p>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Product List ({reportData.details.length} items)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Product Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 capitalize">{reportData.branch} Stock</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Stock Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.details.map((product) => {
                          const branchStockKey = `${reportData.branch}_stock`
                          const branchStock = product.stock?.[branchStockKey] || 0
                          return (
                            <tr key={product._id}>
                              <td className="px-4 py-2 text-sm font-medium">{product.name}</td>
                              <td className="px-4 py-2 text-sm">{product.category}</td>
                              <td className="px-4 py-2 text-sm">{formatCurrency(product.price)}</td>
                              <td className="px-4 py-2 text-sm font-bold">{branchStock}</td>
                              <td className="px-4 py-2 text-sm font-bold text-green-600">
                                {formatCurrency(branchStock * product.price)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Orders Report - KEEPING SAME */}
              {reportData.type === 'orders' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {reportData.summary.totalOrders}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalRevenue)}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Status Breakdown</h3>
                  <div className="space-y-2 mb-6">
                    {Object.entries(reportData.summary.statusBreakdown).map(([status, data]) => (
                      <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium capitalize">{status}</span>
                          <span className="text-xs text-gray-500 ml-2">({data.count} orders)</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(data.value)}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-4">Order Details ({reportData.details.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Order ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Customer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Items</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.details.slice(0, 20).map((order) => (
                          <tr key={order._id}>
                            <td className="px-4 py-2 text-sm">{order.orderId}</td>
                            <td className="px-4 py-2 text-sm">{order.customerInfo?.fullName}</td>
                            <td className="px-4 py-2 text-sm">{order.totals?.itemCount}</td>
                            <td className="px-4 py-2 text-sm font-bold">{formatCurrency(order.totals?.total)}</td>
                            <td className="px-4 py-2 text-sm capitalize">{order.status}</td>
                            <td className="px-4 py-2 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 🔥 UPDATED: Profit & Loss Report with Cost Breakdown */}
              
              {reportData.type === 'profit' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.salesCount} sales</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600 mb-1">Product Cost</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(reportData.summary.totalCost)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">COGS</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 mb-1">Operating Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(reportData.summary.totalExpenses)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.expensesCount} expenses</p>
                    </div>
                    <div className={`${reportData.summary.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} p-4 rounded-lg border`}>
                      <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                      <p className={`text-2xl font-bold ${reportData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(reportData.summary.netProfit)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {reportData.summary.profitMargin.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Revenue margin</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Financial Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white rounded">
                        <span className="font-medium text-gray-700">Revenue</span>
                        <span className="font-bold text-green-600">{formatCurrency(reportData.summary.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded">
                        <span className="font-medium text-gray-700">Product Cost (COGS)</span>
                        <span className="font-bold text-orange-600">-{formatCurrency(reportData.summary.totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border-l-4 border-blue-400">
                        <span className="font-bold text-gray-800">Gross Profit</span>
                        <span className="font-bold text-blue-600">{formatCurrency(reportData.summary.grossProfit)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded">
                        <span className="font-medium text-gray-700">Operating Expenses</span>
                        <span className="font-bold text-red-600">-{formatCurrency(reportData.summary.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border-t-2 border-purple-300">
                        <span className="font-bold text-gray-800">Net Profit/Loss</span>
                        <span className={`font-bold text-xl ${reportData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(reportData.summary.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                            {/* 🔥 NEW: Combined Report Display */}
              {reportData.type === 'combined' && (
                <div>
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.salesCount} sales</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(reportData.summary.totalExpenses)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.expensesCount} expenses</p>
                    </div>
                    <div className={`${reportData.summary.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} p-4 rounded-lg border`}>
                      <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                      <p className={`text-2xl font-bold ${reportData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(reportData.summary.netProfit)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.profitMargin.toFixed(1)}% margin</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Stock Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(reportData.summary.totalStockValue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{reportData.summary.totalProducts} products</p>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg border border-purple-200 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      Financial Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <h4 className="font-bold text-gray-700 mb-2">Income</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Sales Revenue</span>
                            <span className="font-bold text-green-600">{formatCurrency(reportData.summary.totalRevenue)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <h4 className="font-bold text-gray-700 mb-2">Expenses</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Product Cost</span>
                            <span className="font-bold text-orange-600">{formatCurrency(reportData.summary.totalCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Operating Expenses</span>
                            <span className="font-bold text-red-600">{formatCurrency(reportData.summary.totalExpenses)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Report Sections */}
                  <div className="space-y-6">
                    {/* Sales Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                        Sales Summary
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Sale ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Customer</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reportData.details.sales.map((sale) => (
                              <tr key={sale._id}>
                                <td className="px-4 py-2 text-sm">{sale.saleId}</td>
                                <td className="px-4 py-2 text-sm">{sale.customer?.name || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm font-bold">{formatCurrency(sale.adjustedAmount || sale.totalAmount)}</td>
                                <td className="px-4 py-2 text-sm">{new Date(sale.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-red-600" />
                        Expenses Summary
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Expense ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reportData.details.expenses.map((expense) => (
                              <tr key={expense._id}>
                                <td className="px-4 py-2 text-sm">{expense.expenseId}</td>
                                <td className="px-4 py-2 text-sm capitalize">{formatCategory(expense.category)}</td>
                                <td className="px-4 py-2 text-sm font-bold">{formatCurrency(expense.amount)}</td>
                                <td className="px-4 py-2 text-sm">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Inventory Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Inventory Summary
                      </h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Total Products</p>
                          <p className="text-xl font-bold text-blue-600">{reportData.summary.totalProducts}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Stock Value</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.summary.totalStockValue)}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Low Stock</p>
                          <p className="text-xl font-bold text-red-600">{reportData.summary.lowStockItems}</p>
                        </div>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                        Orders Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Total Orders</p>
                          <p className="text-xl font-bold text-purple-600">{reportData.summary.totalOrders}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Orders Revenue</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.summary.ordersRevenue)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {!reportData && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">No Report Generated</p>
            <p className="text-gray-400 text-sm">
              Select a report type above and click "Generate Report" to view data for {currentBranch} branch
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
