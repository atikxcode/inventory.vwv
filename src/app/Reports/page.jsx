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
  Check
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

  // 🔥 NEW: Auto-regenerate report when branch changes
  useEffect(() => {
    if (reportData && selectedReport && userInfo) {
      const currentBranch = selectedBranch || userInfo?.branch
      console.log('🔄 Branch changed, regenerating report for:', currentBranch)
      
      // Regenerate the current report with new branch
      generateReport(selectedReport)
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
          await generateSalesReport(token, currentBranch)
          break
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

  const generateSalesReport = async (token, branch) => {
    const params = new URLSearchParams({
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 1000,
      branch: branch
    })

    console.log('🔍 Generating sales report for branch:', branch)

    const response = await fetch(`/api/sales?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const sales = data.sales || []
      
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
      
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.adjustedAmount || sale.totalAmount || 0), 0)
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      setReportData({
        type: 'profit',
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
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
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      const imgData = canvas.toDataURL('image/png', 1.0)
      
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

      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, scaledHeight)
      heightLeft -= (pageHeight - imgY)

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + imgY
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, scaledHeight)
        heightLeft -= pageHeight
      }
      
      const filename = `${reportData.type}_report_${reportData.branch}_${dateRange.start}_to_${dateRange.end}.pdf`
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
    let filename = `${reportData.type}_report_${reportData.branch}_${dateRange.start}_to_${dateRange.end}.csv`

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
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Revenue,${data.summary.totalRevenue}\n`
    csv += `Total Orders,${data.summary.totalOrders}\n`
    csv += `Average Order Value,${data.summary.avgOrderValue}\n\n`
    csv += 'Sale ID,Customer,Items,Amount,Payment Type,Date\n'
    
    data.details.forEach(sale => {
      csv += `${sale.saleId},${sale.customer?.name || 'N/A'},${sale.items?.length || 0},${sale.adjustedAmount || sale.totalAmount},${sale.paymentType},${new Date(sale.createdAt).toLocaleDateString()}\n`
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

  const generateProfitCSV = (data) => {
    let csv = 'Profit & Loss Report\n'
    csv += `Branch: ${data.branch}\n`
    csv += `Date Range: ${data.dateRange.start} to ${data.dateRange.end}\n\n`
    csv += 'Summary\n'
    csv += `Total Revenue,${data.summary.totalRevenue}\n`
    csv += `Total Expenses,${data.summary.totalExpenses}\n`
    csv += `Net Profit,${data.summary.netProfit}\n`
    csv += `Profit Margin,${data.summary.profitMargin}%\n`
    
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-600" />
                Reports & Analytics
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-500">Generate and download business reports</p>
                
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
          </div>
        </div>

        {/* Date Range Filter */}
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

        {/* Report Type Selection */}
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
                    'Generate Report'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden" id="report-content">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {reportTypes.find(r => r.id === reportData.type)?.name}
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

            {/* Report Content */}
            <div className="p-6">
              {/* Sales Report */}
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
                            <td className="px-4 py-2 text-sm capitalize">{sale.paymentType}</td>
                            <td className="px-4 py-2 text-sm">{new Date(sale.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expenses Report */}
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

              {/* Inventory Report */}
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

              {/* Orders Report */}
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

              {/* Profit & Loss Report */}
              {reportData.type === 'profit' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                        <span className="font-medium text-gray-700">Expenses</span>
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
            </div>
          </div>
        )}

        {/* Empty State */}
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

      {/* Add print styles */}
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
