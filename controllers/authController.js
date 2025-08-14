const { TxHash, TokenPool, Withdrawal, User, Staking, Transaction, AdminSetting, StakingPackage, RankPlan, CommissionPlan, TotalToken } = require('../db/models');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { validateEmail, validateString } = require('../utils/validation');
const crypto = require('crypto');
const { Op, where } = require('sequelize');
const { getCreatedDate } = require('../utils/common');

// Import calculateStakingProgress from common utils
const { calculateStakingProgress } = require('../utils/common');

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name, referral_code, phone, wallet_address, parent_leg = 'left' } = req.body;

    // Validate input
    try {
      validateEmail(email, 'Email');
      validateString(password, 'Password', 3);
      validateString(name, 'Name', 1);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Generate unique referral code with protection against infinite loop
    let newReferralCode;
    let attempts = 0;
    const maxAttempts = 10;
    let codeExists = true;
    
    while (codeExists && attempts < maxAttempts) {
      newReferralCode = crypto.randomBytes(4).toString('hex');
      codeExists = await User.findOne({ where: { referral_code: newReferralCode } });
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique referral code' });
    }

    // Find referrer if referral code provided
    let referrerId = 1; // Default to admin (ID 1)

    if (referral_code) {
      const referrer = await User.findOne({ where: { referral_code } });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user with referral information
    const user = await User.create({
      email,
      password,
      name,
      phone,
      wallet_address,
      referral_code: newReferralCode,
      referred_by: referrerId,
      parent_leg
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(8).toString('hex');
    const verificationExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.update({
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, `${process.env.FRONTEND_URL || 'https://greendash.io'}/register?ref=${user.referral_code}`);
    return res.json({ success: true, message: "Please check your email inbox now!" });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    try {
      validateEmail(email, 'Email');
      validateString(password, 'Password', 3);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Find user
    const user = await User.findOne({ where: { email }});
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    
    // Check email verified
    if (!user.is_email_verified) {
      if (user.email_verification_token) {
        await sendVerificationEmail(user.email, user.email_verification_token, `${process.env.FRONTEND_URL}/register?ref=${user.referral_code}`);
      }
      return res.status(401).json({ success: false, message: 'You should pass the email verification. We sent a new email verification token. Please check your email inbox now' });
    }
    
    if (!user.is_active) return res.status(401).json({ success: false, message: 'You are disabled' });
    
    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    
    // Update last login
    await user.update({ last_login: new Date() });
    const now_user = {}
    for(item of ['id', 'name', 'email', 'referral_code', 'is_admin', 'phone', 'wallet_address', 'egd_balance', 'withdrawals', 'referred_by', 'parent_leg', 'left_volume', 'right_volume', 'rank_goal', 'benefit_overflow']) now_user[item] = user[item]
    now_user.created_at = getCreatedDate(user)
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    // Get user dashboard data
    const user_base_data = await getDashboard(user.id);
    
    // Calculate staking progress percentage
    const staking_progress = await calculateStakingProgress(user.id);
    
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      user: now_user, 
      user_base_data, 
      staking_progress,
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    
    const user = await User.findOne({
      where: {
        email_verification_token: token,
        email_verification_expires: { [Op.gt]: new Date() }
      }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }
    
    await user.update({
      is_active: true,
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires: null
    });
    
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    try {
      validateEmail(email, 'Email');
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(8).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.update({
      password_reset_token: resetToken,
      password_reset_expires: resetExpires
    });

    await sendPasswordResetEmail(user.email, resetToken);
    res.json({ success: true, message: 'Password reset message sent to your email box' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    try {
      validateString(password, 'New Password', 3);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const user = await User.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: { [Op.gt]: new Date() }
      }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    await user.update({
      password: password,
      password_reset_token: null,
      password_reset_expires: null
    });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

const logout = async (req, res) => {
  try {
    // Update last login for tracking
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.update({ last_login: new Date() });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const getLandingData = async (req, res) => {
  try {
    const [admin_settings, staking_packages, rank_plans, commission_plans, total_tokens, token_pools] = await Promise.all([
      AdminSetting.findAll(),
      StakingPackage.findAll(),
      RankPlan.findAll(),
      CommissionPlan.findAll(),
      TotalToken.findAll(),
      TokenPool.findAll()
    ]);

    res.json({
      success: true,
      data: {
        admin_settings,
        staking_packages,
        rank_plans,
        commission_plans,
        total_tokens,
        token_pools
      }
    });
  } catch (error) {
    console.error('Landing page data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch landing page data' });
  }
};

async function getDashboard(user_id) {
  try {
    const max_level = await CommissionPlan.count();
    // Get user's referral network (all levels from commission plans)
    const getReferralNetwork = async (referrerId, level = 1) => {
      if (level > max_level) return [];
      // Find direct referrals using the new User model structure
      const referrals = await User.findAll({
        where: { referred_by: referrerId, is_admin: false },
        attributes: ['id', 'name', 'email', 'created_at', 'parent_leg'],
      });

      const result = [];
      for (const referredUser of referrals) {
        const sub_referrals = await getReferralNetwork(referredUser.id, level + 1);
        result.push({ level, referredUser, sub_referrals });
      }
      return result;
    };

    // Get upline users (sponsors) up to commission depth
    const getUplineUsers = async (userId, maxLevel = 9) => {
      let currentUserId = userId;
      let level = 1;
      const uplines = [];

      while (level <= 1) {
        // Find the user who referred this user
        const currentUser = await User.findByPk(currentUserId);
        if (!currentUser || !currentUser.referred_by || currentUser.referred_by === 1) break; // Stop at admin
        const uplineUser = await User.findByPk(currentUser.referred_by, { attributes: ['id', 'name', 'email', 'parent_leg', 'created_at'] });
        if (!uplineUser) break;
        uplines.push({ level, uplineUser });
        currentUserId = uplineUser.id;
        level++;
      }
      return uplines;
    };

    const upline_users = await getUplineUsers(user_id, max_level);
    const referral_network = await getReferralNetwork(user_id, 1);

    // Get active stakings with package details
    const recent_stakings = await Staking.findAll({ 
      where: { user_id }, 
      include: [{ model: StakingPackage, as: 'package' }], 
      order: [['created_at', 'DESC']]
    });
    const recent_transactions = await Transaction.findAll({ where: { user_id }, order: [['created_at', 'DESC']], limit: 100 });
    const recent_withdrawals = await Withdrawal.findAll({ where: { user_id }, order: [['created_at', 'DESC']], limit: 100 })

    return {
      upline_users,
      referral_network,
      recent_stakings,
      recent_transactions,
      recent_withdrawals,
    };
  } catch (error) {
    console.error('Get dashboard error:', error);
    throw error; // Let the calling function handle the error
  }
}

const currentUser = async (req, res) => {
  try {
    const { id } = req.user
    const user = await User.findByPk(id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.is_email_verified) return res.status(401).json({ success: false, message: 'You should pass the email verification.' });
    if (!user.is_active) return res.status(401).json({ success: false, message: 'You are disabled' });

    await user.update({ last_login: new Date() });
    const now_user = {}
    for(item of ['id', 'name', 'email', 'referral_code', 'is_admin', 'phone', 'wallet_address', 'egd_balance', 'withdrawals', 'referred_by', 'parent_leg', 'left_volume', 'right_volume', 'rank_goal', 'benefit_overflow']) now_user[item] = user[item]
    now_user.created_at = getCreatedDate(user)
    // Generate JWT token
    const token = generateToken(user.id);
    // Get user dashboard data
    const user_base_data = await getDashboard(id);
    
    // Calculate staking progress percentage
    const staking_progress = await calculateStakingProgress(id);
    
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      user: now_user, 
      user_base_data, 
      staking_progress,
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
}

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logout,
  getLandingData,
  currentUser
};