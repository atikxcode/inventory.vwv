'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useContext } from 'react'
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  ShoppingCart, 
  DollarSign, 
  FileText,
  LogOut,
  User
} from 'lucide-react'
import { AuthContext } from '../Provider/AuthProvider'
import Swal from 'sweetalert2'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logOut } = useContext(AuthContext)
  
  const [userInfo, setUserInfo] = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Load user info from localStorage on component mount
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo)
        setUserInfo(parsedUserInfo)
      } catch (error) {
        console.error('Error parsing user info:', error)
      }
    }
  }, [])

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/Dashboard' },
    { name: 'Stock', icon: Package, path: '/Inventory' },
    { name: 'Requisition', icon: ClipboardList, path: '/Requisition' },
    { name: 'Order', icon: ShoppingCart, path: '/Orders' },
    { name: 'Expenses', icon: DollarSign, path: '/Expenses' },
    { name: 'Reports', icon: FileText, path: '/reports' },
  ]

  // Handle logout
  const handleLogout = async () => {
    try {
      const result = await Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
      })

      if (result.isConfirmed) {
        setIsLoggingOut(true)

        // Sign out from Firebase
        if (logOut) {
          await logOut()
        }

        // Clear localStorage
        localStorage.removeItem('auth-token')
        localStorage.removeItem('user-info')

        // Show success message
        await Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Logged out successfully',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        })

        // Redirect to login page
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      
      Swal.fire({
        icon: 'error',
        title: 'Logout Failed',
        text: 'An error occurred while logging out. Please try again.',
        confirmButtonColor: '#7c3aed',
      })
      
      setIsLoggingOut(false)
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (userInfo?.name) {
      const nameParts = userInfo.name.split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      }
      return userInfo.name.substring(0, 2).toUpperCase()
    }
    if (userInfo?.email) {
      return userInfo.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Get display name
  const getDisplayName = () => {
    if (userInfo?.name) {
      return userInfo.name
    }
    if (userInfo?.role) {
      return userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)
    }
    return 'User'
  }

  // Get display email
  const getDisplayEmail = () => {
    if (userInfo?.email) {
      return userInfo.email
    }
    if (user?.email) {
      return user.email
    }
    return 'user@vwv.com'
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-purple-900 via-purple-800 to-violet-900 min-h-screen text-white flex flex-col shadow-2xl">
      {/* Footer/User Section */}
      <div className="p-4 border-t border-purple-700 space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-800/40">
          {userInfo?.profilePicture ? (
            <img
              src={userInfo.profilePicture}
              alt="User profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-400"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-sm font-semibold">{getUserInitials()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getDisplayName()}</p>
            <p className="text-xs text-purple-200 truncate">{getDisplayEmail()}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>

        {/* Branch Badge (if assigned) */}
        {userInfo?.branch && (
          <div className="px-3 py-2 bg-gradient-to-r from-purple-700/50 to-violet-700/50 rounded-lg border border-purple-600/30">
            <p className="text-xs text-purple-200 mb-1">Branch</p>
            <p className="text-sm font-medium capitalize">{userInfo.branch}</p>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'text-purple-100 hover:bg-purple-700/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      
    </aside>
  )
}
