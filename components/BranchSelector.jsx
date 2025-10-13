'use client'

import { useState, useEffect } from 'react'
import { Building, Check, ChevronDown } from 'lucide-react'
import { useBranch } from '../src/contexts/BranchContext'
import Swal from 'sweetalert2'

export default function BranchSelector() {
  const { selectedBranch, changeBranch, userInfo } = useBranch()
  const [isOpen, setIsOpen] = useState(false)
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      
      // 🔥 FIXED: Add cache busting timestamp and no-cache headers
      const timestamp = Date.now()
      const response = await fetch(`/api/branches?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        console.log('✅ Branches fetched:', data)
        
        // Your API returns { branches: [...], userRole: '...', userBranch: '...' }
        if (data.branches && Array.isArray(data.branches)) {
          setBranches(data.branches)
          console.log('✅ Branches set:', data.branches)
        } else {
          // Fallback to default branches
          console.log('⚠️ No branches in response, using defaults')
          setBranches(['bashundhara', 'mirpur'])
        }
      } else {
        console.error('❌ Failed to fetch branches:', response.status)
        // Fallback to default branches
        setBranches(['bashundhara', 'mirpur'])
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error)
      // Fallback to default branches
      setBranches(['bashundhara', 'mirpur'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchChange = (branch) => {
    changeBranch(branch)
    setIsOpen(false)
    
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

  // Don't show selector for non-admin users
  if (!userInfo || userInfo.role !== 'admin') {
    console.log('🔍 BranchSelector: Not showing for non-admin user:', userInfo?.role)
    return null
  }

  console.log('🔍 BranchSelector: Showing for admin user')

  if (isLoading) {
    return (
      <div className="px-3 py-2 bg-gradient-to-r from-purple-700/50 to-violet-700/50 rounded-lg border border-purple-600/30">
        <p className="text-xs text-purple-200">Loading branches...</p>
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className="px-3 py-2 bg-gradient-to-r from-red-700/50 to-rose-700/50 rounded-lg border border-red-600/30">
        <p className="text-xs text-red-200">No branches available</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-gradient-to-r from-purple-700/50 to-violet-700/50 rounded-lg border border-purple-600/30 cursor-pointer hover:from-purple-700/70 hover:to-violet-700/70 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-200 mb-1 flex items-center gap-1">
              <Building className="w-3 h-3" />
              Selected Branch
            </p>
            <p className="text-sm font-medium capitalize truncate">
              {selectedBranch || 'Select a branch'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-purple-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-purple-200 z-50 overflow-hidden">
            <div className="py-1 max-h-60 overflow-y-auto">
              {branches.map((branch) => (
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
  )
}
