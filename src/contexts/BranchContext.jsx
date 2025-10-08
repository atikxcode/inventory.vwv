'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const BranchContext = createContext()

export function BranchProvider({ children }) {
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [userInfo, setUserInfo] = useState(null)

  // Load user info and branch selection
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('user-info')
    const storedBranch = localStorage.getItem('selected-branch')
    
    if (storedUserInfo) {
      const parsed = JSON.parse(storedUserInfo)
      setUserInfo(parsed)
      
      // For POS users, auto-select their assigned branch
      if (parsed.role === 'pos' && parsed.branch) {
        setSelectedBranch(parsed.branch)
        localStorage.setItem('selected-branch', parsed.branch)
      } else if (parsed.role === 'admin' && storedBranch) {
        // For admin, use previously selected branch
        setSelectedBranch(storedBranch)
      }
    }
  }, [])

  const changeBranch = (branch) => {
    setSelectedBranch(branch)
    localStorage.setItem('selected-branch', branch)
  }

  const clearBranch = () => {
    setSelectedBranch(null)
    localStorage.removeItem('selected-branch')
  }

  return (
    <BranchContext.Provider value={{ selectedBranch, changeBranch, clearBranch, userInfo }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider')
  }
  return context
}
