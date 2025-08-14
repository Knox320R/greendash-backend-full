# GreenDash API Documentation

## Overview
GreenDash is a sustainable mobility platform with staking, referral, and reward systems. This API provides comprehensive access to all platform features including user management, staking packages, rewards distribution, and administrative functions.

## Base URL
```
https://api.greendash.io
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "referral_code": "REF123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "referral_code": "REF123",
      "referred_by": 1,
      "parent_leg": "left",
      "is_active": false,
      "is_email_verified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "egd_balance": 1000.00,
    "withdrawals": 500.00,
    "benefit_overflow": false
  },
  "user_base_data": {
    "upline_users": [
      {
        "level": 1,
        "uplinkUser": {
          "id": 2,
          "name": "Sponsor User",
          "email": "sponsor@example.com",
          "parent_leg": "left"
        }
      }
    ],
    "referral_network": [
      {
        "level": 1,
        "referredUser": {
          "id": 3,
          "name": "Referred User",
          "email": "referred@example.com",
          "parent_leg": "right"
        },
        "sub_referrals": []
      }
    ],
    "recent_staking": {
      "id": 1,
      "status": "active",
      "package": {
        "id": 3,
        "name": "Business Fleet",
        "stake_amount": 5000,
        "daily_yield_percentage": 0.40
      }
    },
    "recent_transactions": [
      {
        "id": 1,
        "type": "staking",
        "amount": 5000,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "recent_withdrawals": [
      {
        "id": 1,
        "status": "completed",
        "amount": 1000,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/verify-email
Verify user's email address.

**Request Body:**
```json
{
  "token": "email_verification_token_here"
}
```

### POST /auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### POST /auth/reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "new_password": "newsecurepassword123"
}
```

---

## 📊 Dashboard Data Structure

The `user_base_data` object is returned with authentication responses and contains comprehensive user dashboard information.

### Structure Overview
```json
{
  "user_base_data": {
    "upline_users": [...],        // User's sponsors/uplines
    "referral_network": [...],    // User's referral network
    "recent_staking": {...},      // Most recent staking record
    "recent_transactions": [...], // Recent transaction history
    "recent_withdrawals": [...]   // Recent withdrawal history
  }
}
```

### Field Details

#### `upline_users` (Array)
Contains the user's direct sponsor and upline users in the referral hierarchy.
- **level**: Hierarchical level (1 = direct sponsor)
- **uplinkUser**: Sponsor user object with basic profile information

#### `referral_network` (Array)
Contains the user's referral network organized by levels.
- **level**: Hierarchical level (1 = direct referrals)
- **referredUser**: Referred user object with basic profile information
- **sub_referrals**: Array of sub-referrals for this level

#### `recent_staking` (Object)
**Important**: Contains only the **most recent** staking record, not all staking history.
- **id**: Staking record ID
- **status**: Current staking status (`active`, `free_staking`, `completed`, etc.)
- **package**: Associated staking package details
  - **id**: Package ID
  - **name**: Package name
  - **stake_amount**: Required stake amount
  - **daily_yield_percentage**: Daily reward percentage

#### `recent_transactions` (Array)
Recent transaction history (limited to 100 records).
- **id**: Transaction ID
- **type**: Transaction type (`staking`, `daily_reward`, `withdrawal`, etc.)
- **amount**: Transaction amount
- **created_at**: Transaction timestamp

#### `recent_withdrawals` (Array)
Recent withdrawal history (limited to 100 records).
- **id**: Withdrawal ID
- **status**: Withdrawal status (`pending`, `completed`, `rejected`, etc.)
- **amount**: Withdrawal amount
- **created_at**: Withdrawal timestamp

### Business Rules
- **Single Recent Staking**: Only the most recent staking record is returned (not an array)
- **Limited History**: Transactions and withdrawals are limited to 100 most recent records
- **Real-time Data**: All data is fetched fresh on each authentication request
- **Hierarchical Structure**: Referral network maintains proper level-based organization

---

## 👤 User Profile Endpoints

### GET /users/profile
Get current user's profile with active staking information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
  "phone": "+1234567890",
      "wallet_address": "0x1234...",
      "egd_balance": 1000.00,
      "withdrawals": 500.00,
      "benefit_overflow": false,
      "stakings": [
        {
          "id": 1,
          "status": "active",
          "package": {
            "name": "Business Fleet",
            "stake_amount": 5000,
            "daily_yield_percentage": 0.40
          }
        }
      ]
    }
  }
}
```

### PUT /users/profile
Update user profile information.

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567891",
  "wallet_address": "0x5678...",
  "is_active": true
}
```

### POST /users/change-password
Change user password.

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

### GET /auth/current-user
Get current authenticated user's information with dashboard data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "egd_balance": 1000.00,
    "withdrawals": 500.00,
    "benefit_overflow": false
  },
  "user_base_data": {
    "upline_users": [...],
    "referral_network": [...],
    "recent_staking": {...},
    "recent_transactions": [...],
    "recent_withdrawals": [...]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: This endpoint returns the same structure as the login endpoint, including `user_base_data` with the most recent staking record.

---

## 💰 Staking Endpoints

### POST /users/stake
Start a new staking package. Users can only have 1 active package at a time. Upgrades are allowed by replacing current package with a bigger one.

**Request Body:**
```json
{
  "tx_hash": "0x1234567890abcdef...",
  "package_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "success to stake",
  "newTransaction": {
    "id": 1,
    "type": "staking",
    "amount": 1000,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "newStaking": {
    "id": 1,
    "user_id": 1,
    "package_id": 3,
    "status": "active",
    "tx_hash": "0x1234567890abcdef..."
  }
}
```

**Business Rules:**
- **One Active Package**: Users can only have 1 active staking package at a time
- **Upgrade Logic**: Current package must be completed before starting new one
- **Package Size**: New package must be bigger than current package for upgrades
- **Balance Transfer**: Current balances are transferred to old balance fields
- **Withdrawal Achievement**: All completed withdrawals are marked as "achieved"

### POST /users/convert-to-usdt
Convert EGD tokens to USDT for withdrawal.

**Request Body:**
```json
{
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "success to exchange your token, EGD -> USDT",
  "egd": 500.00,
  "withd": 750.00
}
```

**Business Rules:**
- **Deduction Priority**: First from `new_egd_balance`, then from `old_egd_balance`
- **Conversion Rate**: Uses current seed token price
- **Withdrawal Credit**: Converted amount added to `new_withdrawals`

---

## 🏦 Withdrawal Endpoints

### POST /users/withdrawal-request
Request withdrawal of USDT funds.

**Request Body:**
```json
{
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your request is pending for admin check. please wait till admin admit it.",
  "withdrawal": {
    "id": 1,
    "user_id": 1,
    "amount": 100,
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Business Rules:**
- **Benefit Requirement**: User must have achieved 300% benefits (`benefit_overflow = true`)
- **Available Balance**: Amount must not exceed available withdrawal balance
- **Deduction Priority**: First from `new_withdrawals`, then from `old_withdrawals`

### POST /users/confirm-withdrawal
Confirm withdrawal status updates.

**Request Body:**
```json
{
  "withdrawal_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your withdrawal request has been fully processed."
}
```

---

## 🎁 Reward Distribution Endpoints

### POST /users/universal-cashback
Distribute platform fee pool to all active stakers (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Fee pool distributed successfully.",
  "total_distributed": 10000,
  "staker_count": 50,
  "user_distributions": [
    {
      "user_id": 1,
      "staked": 1000,
      "share": 100
    }
  ]
}
```

**Business Rules:**
- **Active Stakers Only**: Only users with active staking packages receive rewards
- **Benefit Overflow Check**: Users with `benefit_overflow = true` are excluded
- **Proportional Distribution**: Based on user's staked amount relative to total supply
- **EGD Payment**: Rewards are paid in EGD tokens to `new_egd_balance`

---

## 👨‍💼 Admin Endpoints

### GET /admin/dashboard
Get comprehensive dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 800,
      "verified": 750,
      "new_today": 25
    },
    "staking": {
      "total": 500,
      "active": 300,
      "total_staked": 500000,
      "total_rewards_paid": 50
    },
    "financial": {
      "total_invested": 1000000,
      "total_earned": 500000,
      "total_withdrawn": 200000
    },
    "transactions": {
      "total": 2500,
      "staking": 500,
      "withdrawals": 200
    },
    "withdrawals": {
      "pending": 15,
      "pending_amount": 5000
    }
  }
}
```

### PUT /admin/users/:id
Update user information (Admin only).

**Request Body:**
```json
{
  "is_active": true,
  "is_admin": false,
  "is_email_verified": true,
  "egd_balance": 2000
}
```

**Business Rules:**
- **EGD Balance**: Sets `new_egd_balance` field
- **Admin Rights**: Only admin users can modify these fields

### POST /admin/withdrawals/approve
Approve user withdrawal request (Admin only).

**Request Body:**
```json
{
  "id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "success to approve user withdrawal"
}
```

**Business Rules:**
- **Platform Fee**: Applies platform fee to withdrawal amount
- **Transaction Creation**: Creates withdrawal transaction record
- **Status Update**: Changes withdrawal status to "approved"

### POST /admin/withdrawals/reject
Reject user withdrawal request (Admin only).

**Request Body:**
```json
{
  "id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": " successfully refund to the user "
}
```

**Business Rules:**
- **Refund Processing**: Returns amount to user's `new_withdrawals`
- **Status Update**: Changes withdrawal status to "rejected"

### POST /admin/stake/force
Create free staking package for user (Admin only).

**Request Body:**
```json
{
  "user_id": 1,
  "package_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "successfully staked!"
}
```

**Business Rules:**
- **One Active Package**: Enforces single active package rule
- **Upgrade Logic**: Allows upgrades to bigger packages
- **Balance Transfer**: Transfers current balances to old balance fields
- **Withdrawal Achievement**: Marks completed withdrawals as "achieved"

### DELETE /admin/stake/:id
Cancel staking package (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "successfully canceled"
}
```

---

## 📊 Data Retrieval Endpoints

### GET /admin/table-pagination
Get paginated data for admin tables.

**Query Parameters:**
- `table_name`: Table to query (users, stakings, withdrawals, transactions)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term (optional)
- `sort_by`: Sort field (optional)
- `sort_order`: Sort direction (asc/desc, optional)

### GET /admin/financial-statistics
Get financial statistics for date range (Admin only).

**Request Body:**
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2024-01-01T00:00:00.000Z",
      "end_date": "2024-01-31T23:59:59.999Z"
    },
    "transactions": [...],
    "withdrawals": [...],
    "stakings": [...],
    "summary": {
      "total_transactions": 150,
      "total_withdrawals": 25,
      "total_stakings": 30
    }
  }
}
```

---

## 🔧 Admin Settings Endpoints

### GET /admin/settings
Get all admin settings.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "platform_fee",
      "value": "10",
      "description": "Platform fee percentage"
    },
    {
      "id": 2,
      "title": "platform_wallet_address",
      "value": "0x3148c5c8178f340ed7f18d1B81E926C83d2B765e",
      "description": "Platform wallet for receiving payments"
    }
  ]
}
```

### POST /admin/settings
Create new admin setting (Admin only).

**Request Body:**
```json
{
  "title": "daily_bonus_time",
  "value": "09:00",
  "description": "Time for daily bonus distribution"
}
```

### PUT /admin/settings/:id
Update admin setting (Admin only).

**Request Body:**
```json
{
  "value": "10:00",
  "description": "Updated daily bonus time"
}
```

### DELETE /admin/settings/:id
Delete admin setting (Admin only).

---

## 📋 Data Models

### User Model
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "phone": "+1234567890",
  "wallet_address": "0x1234...",
  "referral_code": "REF123",
  "referred_by": 1,
  "parent_leg": "left",
  "left_volume": 1000,
  "right_volume": 800,
  "rank_goal": 1,
  "new_egd_balance": 1000.00,
  "old_egd_balance": 500.00,
  "new_withdrawals": 200.00,
  "old_withdrawals": 100.00,
  "egd_balance": 1500.00,        // Virtual field: old + new
  "withdrawals": 300.00,         // Virtual field: old + new
  "is_active": true,
  "is_admin": false,
  "is_email_verified": true,
  "benefit_overflow": false,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Staking Model
```json
{
  "id": 1,
  "user_id": 1,
  "package_id": 3,
  "status": "active",           // active, completed, free_staking, expired
  "tx_hash": "0x1234...",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### StakingPackage Model
```json
{
  "id": 1,
  "name": "Business Fleet",
  "stake_amount": 5000,
  "daily_yield_percentage": 0.40,
  "description": "Premium staking package",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Withdrawal Model
```json
{
  "id": 1,
  "user_id": 1,
  "amount": 100.00,
  "status": "pending",          // pending, approved, completed, rejected, achieved
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Transaction Model
```json
{
  "id": 1,
  "user_id": 1,
  "type": "staking",            // staking, daily_reward, unilevel_commission, universal_cashback, withdrawal
  "amount": 1000.00,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## 🎯 Business Rules & Logic

### 300% Benefit Cap System
- **Calculation**: `totalBenefit = new_egd_balance + (withdrawal_history_excluding_achieved + new_withdrawals) / seed_token_price`
- **Enforcement**: When 300% is reached, all active staking packages are automatically completed
- **User Status**: `benefit_overflow` flag is set to prevent further rewards
- **Package Lifecycle**: Completed packages cannot earn additional rewards

### One Active Package Rule
- **Enforcement**: Users can only have 1 active staking package at a time
- **Upgrade Logic**: Current package must be completed before starting new one
- **Size Requirement**: New package must be bigger than current package for upgrades
- **Automatic Completion**: Old package is automatically completed during upgrade
- **API Response**: `recent_staking` returns only the most recent staking record (single object, not array)

### Balance Management System
- **Field Structure**: 
  - `new_egd_balance` + `old_egd_balance` = total EGD balance
  - `new_withdrawals` + `old_withdrawals` = total withdrawal balance
- **Transfer Logic**: When starting new staking, current balances are transferred to old fields
- **Virtual Getters**: `egd_balance` and `withdrawals` automatically calculate sums

### Withdrawal Achievement System
- **Status Tracking**: Withdrawals progress through: pending → approved → completed → achieved
- **Achievement Logic**: All completed withdrawals are marked as "achieved" when starting new staking
- **Cap Calculation**: Only non-achieved withdrawals count toward 300% benefit cap

### Reward Distribution Rules
- **Active Stakers Only**: Only users with active staking packages receive rewards
- **Benefit Overflow Check**: Users with `benefit_overflow = true` are excluded from all rewards
- **Commission System**: Unilevel commissions up to 9 levels, paid in EGD
- **Daily Rewards**: Based on staking package daily yield percentage

---

## 🚀 System Features

### Automatic Processes
- **Daily Bonus Distribution**: Automatic daily reward distribution to active stakers
- **Benefit Monitoring**: Continuous monitoring of user benefit percentages
- **Package Completion**: Automatic completion when 300% cap is reached
- **Balance Transfers**: Automatic balance transfers during staking operations

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Blockchain Verification**: Transaction hash verification for staking
- **Admin Controls**: Comprehensive admin panel with role-based access
- **Data Validation**: Input validation and sanitization

### Performance Features
- **Database Indexing**: Optimized queries with proper indexing
- **Caching**: Efficient data retrieval and caching
- **Pagination**: Large dataset handling with pagination
- **Real-time Updates**: Live data updates for critical operations

---

## 📝 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

---

## 🔄 Webhook & Real-time Updates

### Webhook Endpoints (Future Implementation)
- **Staking Events**: Real-time notifications for staking operations
- **Reward Distribution**: Instant updates for reward payments
- **Withdrawal Status**: Real-time withdrawal status updates
- **System Alerts**: Critical system event notifications

---

## 📚 Additional Resources

### Rate Limits
- **Authentication**: 5 requests per minute
- **Staking Operations**: 10 requests per minute
- **Admin Operations**: 20 requests per minute
- **Data Retrieval**: 100 requests per minute

### API Versioning
- **Current Version**: v1
- **Version Header**: `X-API-Version: v1`
- **Deprecation Policy**: 6 months notice for breaking changes

### Support & Documentation
- **Developer Portal**: https://developers.greendash.io
- **API Status**: https://status.greendash.io
- **Support Email**: api-support@greendash.io
- **Documentation Updates**: Real-time updates via GitHub

---

*Last Updated: January 2024*
*API Version: v1*
*GreenDash Platform - Sustainable Mobility Solutions* 