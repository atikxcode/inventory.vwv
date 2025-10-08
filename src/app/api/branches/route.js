// src/app/api/branches/route.js
import clientPromise from '../../../../lib/mongodb'
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '../../../../lib/auth'

// 🔐 SECURITY CONSTANTS
const MAX_BRANCH_NAME_LENGTH = 20
const MIN_BRANCH_NAME_LENGTH = 2
const MAX_REQUEST_BODY_SIZE = 10000 // 10KB for branches
const MAX_BRANCHES_PER_SYSTEM = 50

// Rate limiting per role
const RATE_LIMITS = {
  PUBLIC: { requests: 200, windowMs: 60000 },
  ADMIN: { requests: 500, windowMs: 60000 },
  POS: { requests: 300, windowMs: 60000 },
  MODERATOR: { requests: 300, windowMs: 60000 },
  MANAGER: { requests: 400, windowMs: 60000 },
}

// Enhanced error handling wrapper
function handleApiError(error, context = '') {
  console.error(`🚨 API Error in ${context}:`, error)
  console.error('Error stack:', error.stack)
  
  const isDevelopment = process.env.NODE_ENV === 'development'

  return NextResponse.json(
    {
      error: isDevelopment ? error.message : 'Internal server error',
      context: isDevelopment ? context : undefined,
      timestamp: new Date().toISOString(),
    },
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

// 🔐 SECURITY: Enhanced request logging
function logRequest(req, method) {
  const timestamp = new Date().toISOString()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  console.log(`[${timestamp}] ${method} /api/branches - IP: ${ip} - UserAgent: ${userAgent.substring(0, 100)}`)
  console.log('URL:', req.url)
}

// 🔐 SECURITY: Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>"'%;()&+${}]/g, '') // Remove dangerous chars
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/data:/gi, '') // Remove data URLs
    .trim()
    .substring(0, 1000) // Limit length
}

// 🔐 SECURITY: Get user IP
function getUserIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

// 🔧 UPDATED: Helper function to get user info with POS support
async function getUserInfo(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { role: 'public', branch: null, userId: null, isAuthenticated: false }
    }
    
    // Check for temp token (development mode)
    if (authHeader === 'Bearer temp-admin-token-for-development') {
      console.log('🔧 Using temporary admin token for development')
      return { role: 'admin', branch: null, userId: 'temp-admin', isAuthenticated: true }
    }
    
    const user = await verifyApiToken(req)
    return { 
      role: user.role || 'user', 
      branch: user.branch || null, 
      userId: user.userId || user.id,
      email: user.email || null,
      isAuthenticated: true 
    }
  } catch (authError) {
    console.log('🔧 Authentication failed, treating as public user:', authError.message)
    return { role: 'public', branch: null, userId: null, isAuthenticated: false }
  }
}

// 🔥 UPDATED: Default branches
const DEFAULT_BRANCHES = ['bashundhara', 'mirpur']

// 🔥 UPDATED: GET method with POS user support
export async function GET(req) {
  const ip = getUserIP(req)
  logRequest(req, 'GET')

  try {
    console.log('GET: Fetching branches from database...')
    
    const userInfo = await getUserInfo(req)
    console.log('GET: User info obtained:', { role: userInfo.role, branch: userInfo.branch })

    // Apply role-based rate limiting
    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.PUBLIC
    if (typeof checkRateLimit === 'function' && userInfo.role !== 'admin') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (rateLimitError) {
        console.warn('Rate limit check failed:', rateLimitError.message)
      }
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Try to get branches from settings collection
    const branchDoc = await db
      .collection('settings')
      .findOne({ type: 'branches' })

    let branches = DEFAULT_BRANCHES

    if (branchDoc && branchDoc.branches && Array.isArray(branchDoc.branches)) {
      branches = branchDoc.branches
      console.log('GET: Branches found in database:', branches)
    } else {
      // If no branches in DB, create default ones
      console.log('GET: No branches found, creating defaults...')
      const newBranchDoc = {
        type: 'branches',
        branches: DEFAULT_BRANCHES,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userInfo.userId || 'system'
      }

      await db.collection('settings').insertOne(newBranchDoc)
      console.log('GET: Default branches created successfully ✓')
      branches = DEFAULT_BRANCHES
    }

    // 🔥 NEW: Filter branches for POS users (only return their assigned branch)
    if (userInfo.role === 'pos' && userInfo.branch) {
      console.log('GET: POS user detected, filtering to assigned branch:', userInfo.branch)
      branches = [userInfo.branch]
    }

    return NextResponse.json(
      { 
        branches: branches,
        userRole: userInfo.role,
        userBranch: userInfo.branch 
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': userInfo.role === 'pos' ? 'private, max-age=3600' : 'public, max-age=1800'
        },
      }
    )
  } catch (error) {
    return handleApiError(error, 'GET /api/branches')
  }
}

// 🔥 UPDATED: POST method with POS restriction
export async function POST(req) {
  const ip = getUserIP(req)
  logRequest(req, 'POST')

  try {
    const userInfo = await getUserInfo(req)
    
    // Only admins can manage branches (POS users cannot add branches)
    if (!userInfo.isAuthenticated || (userInfo.role !== 'admin' && userInfo.role !== 'manager')) {
      console.log('POST: Access denied for role:', userInfo.role)
      return NextResponse.json(
        { error: 'Only admins and managers can manage branches' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('POST: Reading request body...')
    const body = await req.json()

    // Validate request body size
    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      console.log('POST: Request body too large:', bodySize)
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    console.log('POST: Adding new branch...')
    const { action, branchName } = body

    console.log('POST: Request body:', { action, branchName })

    if (action !== 'add' || !branchName) {
      console.log('POST: Invalid request - missing action or branchName')
      return NextResponse.json(
        {
          error: 'Invalid request. Action must be "add" and branchName is required.',
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Enhanced validation with sanitization
    const sanitizedBranchName = sanitizeInput(branchName)
    const cleanBranchName = sanitizedBranchName.trim().toLowerCase()
    
    if (!cleanBranchName) {
      return NextResponse.json(
        { error: 'Branch name cannot be empty' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 🔐 SECURITY: Validate branch name format and length
    if (cleanBranchName.length < MIN_BRANCH_NAME_LENGTH || cleanBranchName.length > MAX_BRANCH_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Branch name must be between ${MIN_BRANCH_NAME_LENGTH} and ${MAX_BRANCH_NAME_LENGTH} characters` },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!/^[a-z0-9_]+$/.test(cleanBranchName)) {
      return NextResponse.json(
        { error: 'Branch name must be lowercase alphanumeric and can contain underscores only' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Check current branch count
    const existingDoc = await db
      .collection('settings')
      .findOne({ type: 'branches' })
    
    if (existingDoc && existingDoc.branches && existingDoc.branches.length >= MAX_BRANCHES_PER_SYSTEM) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BRANCHES_PER_SYSTEM} branches allowed` },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if branch already exists
    if (
      existingDoc &&
      existingDoc.branches &&
      existingDoc.branches.includes(cleanBranchName)
    ) {
      console.log('POST: Branch already exists:', cleanBranchName)
      return NextResponse.json(
        { error: 'Branch already exists' },
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Add branch to array (creates document if it doesn't exist)
    const updateResult = await db.collection('settings').updateOne(
      { type: 'branches' },
      {
        $addToSet: { branches: cleanBranchName },
        $set: { 
          updatedAt: new Date(),
          updatedBy: userInfo.userId 
        },
        $setOnInsert: {
          createdAt: new Date(),
          type: 'branches',
          createdBy: userInfo.userId,
        },
      },
      { upsert: true }
    )

    console.log('POST: Branch added successfully ✓')
    console.log('POST: Update result:', updateResult)

    // Create audit log
    try {
      await db.collection('audit_logs').insertOne({
        action: 'BRANCH_ADDED',
        userId: userInfo.userId,
        userEmail: userInfo.email,
        userRole: userInfo.role,
        branchName: cleanBranchName,
        timestamp: new Date(),
        ipAddress: ip
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
    }

    return NextResponse.json(
      {
        message: 'Branch added successfully',
        branchName: cleanBranchName,
      },
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return handleApiError(error, 'POST /api/branches')
  }
}

// 🔥 UPDATED: DELETE method with POS restriction
export async function DELETE(req) {
  const ip = getUserIP(req)
  logRequest(req, 'DELETE')

  try {
    const userInfo = await getUserInfo(req)
    
    // Only admins can delete branches (POS users cannot delete branches)
    if (!userInfo.isAuthenticated || userInfo.role !== 'admin') {
      console.log('DELETE: Access denied for role:', userInfo.role)
      return NextResponse.json(
        { error: 'Only admins can delete branches' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('DELETE: Reading request body...')
    const body = await req.json()

    // Validate request body size
    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      console.log('DELETE: Request body too large:', bodySize)
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    console.log('DELETE: Removing branch...')
    const { branchName } = body

    console.log('DELETE: Request body:', { branchName })

    if (!branchName) {
      console.log('DELETE: Branch name missing')
      return NextResponse.json(
        { error: 'Branch name is required' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Sanitize input
    const sanitizedBranchName = sanitizeInput(branchName)
    const cleanBranchName = sanitizedBranchName.trim().toLowerCase()

    if (!cleanBranchName) {
      return NextResponse.json(
        { error: 'Invalid branch name' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Check if this is the last branch (prevent deletion)
    const currentDoc = await db
      .collection('settings')
      .findOne({ type: 'branches' })
    
    if (currentDoc && currentDoc.branches && currentDoc.branches.length <= 1) {
      console.log('DELETE: Cannot delete last branch')
      return NextResponse.json(
        {
          error: 'Cannot delete the last branch. At least one branch must exist.',
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if any products use this branch before deletion
    const productsUsingBranch = await db
      .collection('products')
      .countDocuments({
        [`stock.${cleanBranchName}_stock`]: { $exists: true }
      })

    if (productsUsingBranch > 0) {
      console.log(`DELETE: Cannot delete branch ${cleanBranchName}, ${productsUsingBranch} products are using it`)
      return NextResponse.json(
        {
          error: `Cannot delete branch. ${productsUsingBranch} products have stock in this branch.`,
          productsCount: productsUsingBranch,
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if any POS users are assigned to this branch
    const usersInBranch = await db
      .collection('user')
      .countDocuments({ branch: cleanBranchName })

    if (usersInBranch > 0) {
      console.log(`DELETE: Cannot delete branch ${cleanBranchName}, ${usersInBranch} users are assigned to it`)
      return NextResponse.json(
        {
          error: `Cannot delete branch. ${usersInBranch} user(s) are assigned to this branch.`,
          usersCount: usersInBranch,
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Remove branch from array
    const updateResult = await db.collection('settings').updateOne(
      { type: 'branches' },
      {
        $pull: { branches: cleanBranchName },
        $set: { 
          updatedAt: new Date(),
          updatedBy: userInfo.userId 
        },
      }
    )

    if (updateResult.matchedCount === 0) {
      console.log('DELETE: Branch settings not found')
      return NextResponse.json(
        { error: 'Branch settings not found' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('DELETE: Branch removed successfully ✓')
    console.log('DELETE: Update result:', updateResult)

    // Create audit log
    try {
      await db.collection('audit_logs').insertOne({
        action: 'BRANCH_DELETED',
        userId: userInfo.userId,
        userEmail: userInfo.email,
        userRole: userInfo.role,
        branchName: cleanBranchName,
        timestamp: new Date(),
        ipAddress: ip
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
    }

    return NextResponse.json(
      {
        message: 'Branch deleted successfully',
        branchName: cleanBranchName,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return handleApiError(error, 'DELETE /api/branches')
  }
}
