'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { useBranch } from '@/contexts/BranchContext'
import { Search, Package, AlertCircle, X, Building, ChevronDown, Check } from 'lucide-react'
import Swal from 'sweetalert2'

export default function InventoryPage() {
  const { selectedBranch, changeBranch } = useBranch()
  const [userInfo, setUserInfo] = useState(null)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Load user info and branches on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserInfo = localStorage.getItem('user-info')
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo)
          setUserInfo(parsedUserInfo)

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
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load user data. Please try again.',
          confirmButtonColor: '#7c3aed',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [])

  // 🔥 UPDATED: Fetch products when branch changes
  useEffect(() => {
    const currentBranch = selectedBranch || userInfo?.branch
    if (currentBranch) {
      fetchProductsByBranch(currentBranch)
    }
  }, [selectedBranch, userInfo])

  // Real-time search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = products.filter((product) => {
      return (
        product.productName.toLowerCase().includes(query) ||
        product.serial.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.branchOptionsText?.toLowerCase().includes(query)
      )
    })

    setFilteredProducts(filtered)
  }, [searchQuery, products])

  // Helper function to get branch options organized by type
  const getBranchOptionsStructured = (branchSpecifications, branchName) => {
    if (!branchSpecifications || !branchName) return null

    const possibleKeys = [
      branchName,
      branchName.toLowerCase(),
      branchName.toUpperCase(),
      branchName.charAt(0).toUpperCase() + branchName.slice(1).toLowerCase(),
    ]

    let branchSpec = null
    for (const key of possibleKeys) {
      if (branchSpecifications[key]) {
        branchSpec = branchSpecifications[key]
        break
      }
    }

    if (!branchSpec) return null

    const options = {
      nicotineStrength: [],
      vgPgRatio: [],
      colors: []
    }

    if (branchSpec.nicotineStrength && Array.isArray(branchSpec.nicotineStrength) && branchSpec.nicotineStrength?.length > 0) {
      options.nicotineStrength = branchSpec.nicotineStrength
    }

    if (branchSpec.vgPgRatio && Array.isArray(branchSpec.vgPgRatio) && branchSpec.vgPgRatio.length > 0) {
      options.vgPgRatio = branchSpec.vgPgRatio
    }

    if (branchSpec.colors && Array.isArray(branchSpec.colors) && branchSpec.colors.length > 0) {
      options.colors = branchSpec.colors.map(color => color.charAt(0).toUpperCase() + color.slice(1))
    }

    const hasOptions = options.nicotineStrength.length > 0 || options.vgPgRatio.length > 0 || options.colors.length > 0

    return hasOptions ? options : null
  }

  // 🔥 UPDATED: Fetch products by branch
  const fetchProductsByBranch = async (branch, token = null) => {
    if (!branch) return

    setIsLoading(true)
    try {
      const authToken = token || localStorage.getItem('auth-token')
      
      console.log('🔍 Fetching products for branch:', branch)
      
      const response = await fetch(`/api/products?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Fetched products:', data.products.length)
        
        const processedProducts = data.products.map((product, index) => {
          const branchStockKey = `${branch}_stock`
          const stockQty = product.stock?.[branchStockKey] || 0
          const branchOptions = getBranchOptionsStructured(product.branchSpecifications, branch)

          let branchOptionsText = ''
          if (branchOptions) {
            const parts = []
            if (branchOptions.nicotineStrength.length > 0) parts.push(branchOptions.nicotineStrength.join(' '))
            if (branchOptions.vgPgRatio.length > 0) parts.push(branchOptions.vgPgRatio.join(' '))
            if (branchOptions.colors.length > 0) parts.push(branchOptions.colors.join(' '))
            branchOptionsText = parts.join(' ')
          }

          return {
            id: index + 1,
            _id: product._id,
            productName: product.name,
            branchOptions: branchOptions,
            branchOptionsText: branchOptionsText,
            serial: product.barcode || 'N/A',
            qty: stockQty,
            price: product.price,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            image: product.images?.[0]?.url || null,
            branchSpecifications: product.branchSpecifications,
          }
        })

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
        console.log('✅ Processed products for branch:', branch, processedProducts.length)
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load products. Please try again.',
        confirmButtonColor: '#7c3aed',
      })
      setProducts([])
      setFilteredProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // 🔥 UPDATED: Handle branch change from dropdown
  const handleBranchChange = (branch) => {
    changeBranch(branch)
    setIsBranchDropdownOpen(false)
    setSearchQuery('')
    
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

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
  }

  // Show branch selection prompt for admin if no branch selected
  if (userInfo?.role === 'admin' && !selectedBranch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <Building className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Branch</h2>
            <p className="text-gray-600 mb-6">Please select a branch from the sidebar to view inventory</p>
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
            <p className="text-gray-600">Loading inventory for {selectedBranch || userInfo?.branch}...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentBranch = selectedBranch || userInfo?.branch

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header with Branch Selector */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">Current Stock</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-500">Manage your inventory</p>
                
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

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Product
              {searchQuery && (
                <span className="ml-2 text-xs text-purple-600">
                  ({filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''})
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search by name, serial, or brand..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-2xl font-bold text-gray-800">{filteredProducts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-600">In Stock</p>
            <p className="text-2xl font-bold text-gray-800">
              {filteredProducts.filter((p) => p.qty > 0).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-800">
              {filteredProducts.filter((p) => p.qty === 0).length}
            </p>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery 
                  ? `No results for "${searchQuery}". Try a different search term.`
                  : `No products available for ${currentBranch} branch`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Available Options
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Serial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Stock Qty
                    </th>
                    {userInfo?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((item) => (
                    <tr key={item._id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.id}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            {item.brand && (
                              <p className="text-xs text-gray-500">{item.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {!item.branchOptions ? (
                          <span className="text-gray-400 italic text-xs">No options available</span>
                        ) : (
                          <div className="space-y-1">
                            {item.branchOptions.nicotineStrength.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Nicotine Strength:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.branchOptions.nicotineStrength.map((option, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.branchOptions.vgPgRatio.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">VG/PG:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.branchOptions.vgPgRatio.map((option, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium"
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.branchOptions.colors.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700">Colors:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.branchOptions.colors.map((option, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.serial}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.qty === 0 ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="font-bold text-red-600">Out of Stock</span>
                          </div>
                        ) : (
                          <span className="font-bold text-green-600">{item.qty}</span>
                        )}
                      </td>
                      {userInfo?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md transition-colors shadow-sm hover:shadow-md">
                            Update
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
