import clientPromise from '../../../../lib/mongodb'
import { NextResponse } from 'next/server'
import { verifyApiToken, createAuthError, checkRateLimit } from '../../../../lib/auth'
import { ObjectId } from 'mongodb'

// 🔐 SECURITY CONSTANTS
const MAX_DESCRIPTION_LENGTH = 500
const MAX_CATEGORY_LENGTH = 50
const MAX_CUSTOM_CATEGORY_LENGTH = 50 // 🆕 NEW: Max length for custom categories
const MAX_NOTES_LENGTH = 1000
const MIN_AMOUNT = 0.01
const MAX_AMOUNT = 1000000 // 1 million BDT
const MAX_REQUEST_BODY_SIZE = 50000 // 50KB

// 🆕 UPDATED: Predefined expense categories (suggestions)
const PREDEFINED_CATEGORIES = [
  'utilities',           // Electricity, water, gas, internet
  'rent',               // Store/office rent
  'salaries',           // Employee wages
  'inventory',          // Stock purchases
  'maintenance',        // Repairs, upkeep
  'transportation',     // Fuel, vehicle costs
  'marketing',          // Advertising, promotions
  'office_supplies',    // Stationery, equipment
  'food_beverage',      // Staff meals, refreshments
  'miscellaneous',      // Other expenses
  'petty_cash',         // Small daily expenses
  'packaging',          // Boxes, bags, wrapping materials
  'cleaning',           // Cleaning supplies, services
  'security',           // Security services, systems
  'communication',      // Phone bills, postage
  'professional_fees',  // Accounting, legal fees
  'insurance',          // Business insurance
  'taxes',              // Government taxes, fees
  'bank_charges',       // Transaction fees
  'other'               // Uncategorized
]

// Payment methods
const PAYMENT_METHODS = ['cash', 'card', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'cheque']

// Rate limiting per role
const RATE_LIMITS = {
  POS: { requests: 100, windowMs: 60000 },
  MODERATOR: { requests: 200, windowMs: 60000 },
  MANAGER: { requests: 300, windowMs: 60000 },
  ADMIN: { requests: 500, windowMs: 60000 },
}

// Enhanced error handling
function handleApiError(error, context = '') {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return NextResponse.json(
    {
      error: isDevelopment ? error.message : 'Internal server error',
      context: isDevelopment ? context : undefined,
      timestamp: new Date().toISOString(),
    },
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>"'%;()&+${}]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload/gi, '')
    .replace(/onclick/gi, '')
    .trim()
    .substring(0, 1000)
}

// Get user IP
function getUserIP(req) {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  return cfConnectingIP || 
         (forwarded && forwarded.split(',')[0]) || 
         realIP || 
         'unknown'
}

// Enhanced user authentication
async function getUserInfo(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No valid authorization header provided')
    }
    
    const token = authHeader.slice(7)
    
    // Development token
    if (process.env.NODE_ENV === 'development' && token === 'temp-admin-token-for-development') {
      return { 
        role: 'admin', 
        branch: 'main', 
        userId: 'temp-admin', 
        email: 'temp@admin.dev',
        name: 'Temp Admin',
        isAuthenticated: true 
      }
    }
    
    const user = await verifyApiToken(req)
    
    if (!user) {
      throw new Error('Token verification failed')
    }
    
    return { 
      role: user.role || 'user', 
      branch: user.branch || null, 
      userId: user.userId || user.id,
      email: user.email,
      name: user.name,
      isAuthenticated: true 
    }
  } catch (authError) {
    throw authError
  }
}

// Request logging
function logRequest(req, method, userInfo = null) {
  const timestamp = new Date().toISOString()
  const ip = getUserIP(req)
  
  console.log(`[${timestamp}] ${method} /api/expenses`)
  console.log(`  User: ${userInfo?.email || 'anonymous'} (${userInfo?.role || 'none'})`)
  console.log(`  Branch: ${userInfo?.branch || 'none'}`)
  console.log(`  IP: ${ip}`)
}

// Generate unique expense ID
function generateExpenseId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `EXP${timestamp}${random}`.toUpperCase()
}

// Validate expense amount
function validateAmount(amount) {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount < MIN_AMOUNT || numAmount > MAX_AMOUNT) {
    throw new Error(`Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT} BDT`)
  }
  return Math.round(numAmount * 100) / 100 // Round to 2 decimals
}

// 🆕 NEW: Validate and sanitize category (accepts custom categories)
function validateCategory(category) {
  if (!category || typeof category !== 'string') {
    throw new Error('Category is required and must be a string')
  }
  
  const sanitized = sanitizeInput(category.toLowerCase().trim())
  
  if (sanitized.length === 0) {
    throw new Error('Category cannot be empty')
  }
  
  if (sanitized.length > MAX_CUSTOM_CATEGORY_LENGTH) {
    throw new Error(`Category cannot exceed ${MAX_CUSTOM_CATEGORY_LENGTH} characters`)
  }
  
  // Replace spaces with underscores for consistency
  return sanitized.replace(/\s+/g, '_')
}

// 🆕 NEW: Get all unique categories used in the system
async function getAllCategories(db, userBranch = null) {
  try {
    const query = userBranch ? { branch: userBranch } : {}
    
    const categories = await db.collection('expenses')
      .distinct('category', query)
    
    // Combine predefined and custom categories, remove duplicates
    const allCategories = [...new Set([...PREDEFINED_CATEGORIES, ...categories])]
    
    return allCategories.sort()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return PREDEFINED_CATEGORIES
  }
}

// GET: Retrieve expenses with filtering
export async function GET(req) {
  const ip = getUserIP(req)

  try {
    // Authentication required
    const userInfo = await getUserInfo(req)
    logRequest(req, 'GET', userInfo)

    // Rate limiting
    const rateLimit = RATE_LIMITS[userInfo.role?.toUpperCase()] || RATE_LIMITS.POS
    if (typeof checkRateLimit === 'function') {
      try {
        checkRateLimit(req, rateLimit)
      } catch (rateLimitError) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const { searchParams } = new URL(req.url)
    
    // 🆕 NEW: Check if requesting categories list
    const getCategoriesOnly = searchParams.get('categoriesOnly') === 'true'
    
    const client = await clientPromise
    const db = client.db('VWV')
    
    // 🆕 NEW: Return only categories if requested
    if (getCategoriesOnly) {
      const userBranch = userInfo.role === 'pos' || userInfo.role === 'moderator' ? userInfo.branch : null
      const categories = await getAllCategories(db, userBranch)
      
      return NextResponse.json(
        {
          success: true,
          categories: {
            predefined: PREDEFINED_CATEGORIES,
            all: categories
          }
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=300', // 5 minutes cache
          }
        }
      )
    }
    
    // Extract query parameters
    const expenseId = sanitizeInput(searchParams.get('expenseId'))
    const category = sanitizeInput(searchParams.get('category'))
    const branch = sanitizeInput(searchParams.get('branch'))
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 500)
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1)
    const sortBy = searchParams.get('sortBy') || 'expenseDate'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    // Build query with role-based access control
    let query = {}

    // Apply filters
    if (expenseId) {
      query.expenseId = expenseId
    }

    // 🆕 UPDATED: Category filter now accepts any valid category
    if (category) {
      query.category = category.toLowerCase().replace(/\s+/g, '_')
    }

    // Date range filter
    if (startDate || endDate) {
      query.expenseDate = {}
      if (startDate) query.expenseDate.$gte = new Date(startDate)
      if (endDate) query.expenseDate.$lte = new Date(endDate)
    }

    // Branch filter with role-based access
    if (branch) {
      query.branch = branch
    }

    // Role-based filtering
    if (userInfo.role === 'pos') {
      // POS can only see their own branch expenses
      if (userInfo.branch) {
        query.branch = userInfo.branch
      }
    } else if (userInfo.role === 'moderator') {
      // Moderators can see their branch expenses
      if (userInfo.branch) {
        query.branch = userInfo.branch
      }
    }
    // Admin and Manager can see all expenses

    // Get total count
    const totalExpenses = await db.collection('expenses').countDocuments(query)

    // Build sort object
    const allowedSortFields = ['expenseDate', 'amount', 'category', 'createdAt']
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'expenseDate'
    const sortObject = { [finalSortBy]: sortOrder }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch expenses
    const expenses = await db
      .collection('expenses')
      .find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray()

    // Calculate totals for current query
    const totalAmount = await db.collection('expenses')
      .aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
      .toArray()

    const queryTotal = totalAmount.length > 0 ? totalAmount[0].total : 0

    // 🆕 NEW: Get category breakdown
    const categoryBreakdown = await db.collection('expenses')
      .aggregate([
        { $match: query },
        { 
          $group: { 
            _id: '$category', 
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          } 
        },
        { $sort: { total: -1 } }
      ])
      .toArray()

    // Create audit log
    setImmediate(async () => {
      try {
        await db.collection('audit_logs').insertOne({
          action: 'EXPENSES_ACCESSED',
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userRole: userInfo.role,
          userBranch: userInfo.branch,
          queryParams: { category, branch, startDate, endDate, limit, page },
          resultCount: expenses.length,
          totalAvailable: totalExpenses,
          timestamp: new Date(),
          ipAddress: ip
        })
      } catch (auditError) {
        // Silent error
      }
    })

    return NextResponse.json(
      {
        success: true,
        expenses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalExpenses / limit),
          totalExpenses,
          hasNextPage: skip + expenses.length < totalExpenses,
          hasPrevPage: page > 1,
          itemsPerPage: limit
        },
        summary: {
          totalAmount: Math.round(queryTotal * 100) / 100,
          expenseCount: expenses.length,
          categoryBreakdown: categoryBreakdown.map(cat => ({
            category: cat._id,
            total: Math.round(cat.total * 100) / 100,
            count: cat.count
          }))
        },
        userPermissions: {
          canCreate: ['admin', 'manager', 'moderator', 'pos'].includes(userInfo.role),
          canEdit: ['admin', 'manager'].includes(userInfo.role),
          canDelete: ['admin', 'manager'].includes(userInfo.role),
          branch: userInfo.branch
        }
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    )

  } catch (error) {
    if (error.message.includes('Authentication') || error.message.includes('Token')) {
      return createAuthError(error.message, 401)
    }
    return handleApiError(error, 'GET /api/expenses')
  }
}

// POST: Create new expense
export async function POST(req) {
  const ip = getUserIP(req)

  try {
    const userInfo = await getUserInfo(req)
    logRequest(req, 'POST', userInfo)

    // Only POS, Moderator, Manager, and Admin can create expenses
    if (!['pos', 'moderator', 'manager', 'admin'].includes(userInfo.role)) {
      return createAuthError('Insufficient permissions to create expenses', 403)
    }

    const body = await req.json()

    // Validate body size
    const bodySize = JSON.stringify(body).length
    if (bodySize > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const {
      description,
      amount,
      category,
      paymentMethod,
      expenseDate,
      receiptNumber,
      vendor,
      notes,
      attachments
    } = body

    // Validate required fields
    if (!description || !amount || !category) {
      return NextResponse.json(
        { error: 'Description, amount, and category are required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 🆕 UPDATED: Validate category (accepts custom categories)
    let validatedCategory
    try {
      validatedCategory = validateCategory(category)
    } catch (categoryError) {
      return NextResponse.json(
        { error: categoryError.message },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate payment method
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${PAYMENT_METHODS.join(', ')}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate and sanitize amount
    let validatedAmount
    try {
      validatedAmount = validateAmount(amount)
    } catch (amountError) {
      return NextResponse.json(
        { error: amountError.message },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const client = await clientPromise
    const db = client.db('VWV')

    // Generate expense ID
    const expenseId = generateExpenseId()

    // Validate expense date
    const validatedExpenseDate = expenseDate ? new Date(expenseDate) : new Date()
    if (isNaN(validatedExpenseDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expense date' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 🆕 NEW: Check if custom category (not in predefined list)
    const isCustomCategory = !PREDEFINED_CATEGORIES.includes(validatedCategory)

    // Create expense object
    const newExpense = {
      expenseId,
      description: sanitizeInput(description).substring(0, MAX_DESCRIPTION_LENGTH),
      amount: validatedAmount,
      category: validatedCategory, // 🆕 UPDATED: Now accepts custom categories
      isCustomCategory, // 🆕 NEW: Flag to identify custom categories
      paymentMethod: paymentMethod || 'cash',
      expenseDate: validatedExpenseDate,
      
      // Optional fields
      receiptNumber: receiptNumber ? sanitizeInput(receiptNumber).substring(0, 50) : null,
      vendor: vendor ? sanitizeInput(vendor).substring(0, 100) : null,
      notes: notes ? sanitizeInput(notes).substring(0, MAX_NOTES_LENGTH) : null,
      attachments: attachments || [],
      
      // Branch info
      branch: userInfo.branch || 'main',
      
      // Creator info
      createdBy: userInfo.userId,
      createdByName: userInfo.name,
      createdByEmail: userInfo.email,
      createdByRole: userInfo.role,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Metadata
      status: 'recorded',
      approvedBy: null,
      approvedAt: null,
      
      // Audit
      clientIP: ip,
      userAgent: req.headers.get('user-agent')?.substring(0, 200) || 'unknown'
    }

    // Insert expense
    const result = await db.collection('expenses').insertOne(newExpense)

    if (!result.insertedId) {
      throw new Error('Failed to create expense')
    }

    // Create audit log
    setImmediate(async () => {
      try {
        await db.collection('audit_logs').insertOne({
          action: 'EXPENSE_CREATED',
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userRole: userInfo.role,
          userBranch: userInfo.branch,
          expenseId,
          amount: validatedAmount,
          category: validatedCategory,
          isCustomCategory, // 🆕 NEW: Track if custom category was used
          branch: userInfo.branch,
          timestamp: new Date(),
          ipAddress: ip
        })
      } catch (auditError) {
        // Silent error
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: isCustomCategory 
          ? 'Expense recorded successfully with custom category' 
          : 'Expense recorded successfully',
        expense: { ...newExpense, _id: result.insertedId }
      },
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    if (error.message.includes('Authentication') || error.message.includes('permissions')) {
      return createAuthError(error.message, 401)
    }
    return handleApiError(error, 'POST /api/expenses')
  }
}

// PUT: Update expense (Admin/Manager only)
export async function PUT(req) {
  const ip = getUserIP(req)

  try {
    const userInfo = await getUserInfo(req)
    logRequest(req, 'PUT', userInfo)

    // Only Admin and Manager can update expenses
    if (!['admin', 'manager'].includes(userInfo.role)) {
      return createAuthError('Only administrators and managers can update expenses', 403)
    }

    const body = await req.json()
    const { expenseId, ...updateFields } = body

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const client = await clientPromise
    const db = client.db('VWV')

    const existingExpense = await db.collection('expenses').findOne({ expenseId })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
      updatedBy: userInfo.userId,
      updatedByRole: userInfo.role
    }

    // Update allowed fields
    if (updateFields.description) {
      updateData.description = sanitizeInput(updateFields.description).substring(0, MAX_DESCRIPTION_LENGTH)
    }
    if (updateFields.amount) {
      updateData.amount = validateAmount(updateFields.amount)
    }
    // 🆕 UPDATED: Allow updating to custom categories
    if (updateFields.category) {
      const validatedCategory = validateCategory(updateFields.category)
      updateData.category = validatedCategory
      updateData.isCustomCategory = !PREDEFINED_CATEGORIES.includes(validatedCategory)
    }
    if (updateFields.paymentMethod && PAYMENT_METHODS.includes(updateFields.paymentMethod)) {
      updateData.paymentMethod = updateFields.paymentMethod
    }
    if (updateFields.notes) {
      updateData.notes = sanitizeInput(updateFields.notes).substring(0, MAX_NOTES_LENGTH)
    }
    if (updateFields.receiptNumber) {
      updateData.receiptNumber = sanitizeInput(updateFields.receiptNumber).substring(0, 50)
    }
    if (updateFields.vendor) {
      updateData.vendor = sanitizeInput(updateFields.vendor).substring(0, 100)
    }
    if (updateFields.status) {
      updateData.status = updateFields.status
    }

    // Update expense
    const result = await db.collection('expenses').updateOne(
      { expenseId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Expense not found for update' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Audit log
    setImmediate(async () => {
      try {
        await db.collection('audit_logs').insertOne({
          action: 'EXPENSE_UPDATED',
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userRole: userInfo.role,
          expenseId,
          updateFields: Object.keys(updateData),
          timestamp: new Date(),
          ipAddress: ip
        })
      } catch (auditError) {
        // Silent error
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Expense updated successfully',
        expenseId,
        updatedFields: Object.keys(updateData)
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    if (error.message.includes('Authentication') || error.message.includes('permissions')) {
      return createAuthError(error.message, 401)
    }
    return handleApiError(error, 'PUT /api/expenses')
  }
}

// DELETE: Delete expense (Admin only)
export async function DELETE(req) {
  const ip = getUserIP(req)

  try {
    const userInfo = await getUserInfo(req)
    logRequest(req, 'DELETE', userInfo)

    // Only Admin can delete expenses
    if (userInfo.role !== 'admin') {
      return createAuthError('Only administrators can delete expenses', 403)
    }

    const { searchParams } = new URL(req.url)
    const expenseId = sanitizeInput(searchParams.get('expenseId'))

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const client = await clientPromise
    const db = client.db('VWV')

    const existingExpense = await db.collection('expenses').findOne({ expenseId })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete expense
    const result = await db.collection('expenses').deleteOne({ expenseId })

    // Audit log
    setImmediate(async () => {
      try {
        await db.collection('audit_logs').insertOne({
          action: 'EXPENSE_DELETED',
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userRole: userInfo.role,
          expenseId,
          expenseAmount: existingExpense.amount,
          expenseCategory: existingExpense.category,
          timestamp: new Date(),
          ipAddress: ip
        })
      } catch (auditError) {
        // Silent error
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Expense deleted successfully',
        expenseId
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    if (error.message.includes('Authentication') || error.message.includes('permissions')) {
      return createAuthError(error.message, 401)
    }
    return handleApiError(error, 'DELETE /api/expenses')
  }
}
