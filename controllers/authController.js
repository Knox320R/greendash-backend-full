const { TxHash, Withdrawal, User, Staking, Transaction, AdminSetting, StakingPackage, RankPlan, CommissionPlan, TotalToken } = require('../db/models');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { validateEmail, validateString } = require('../utils/validation');
const crypto = require('crypto');
const { Op, where } = require('sequelize');
const { getCreatedDate } = require('../utils/common');

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

    // Generate unique referral code
    let newReferralCode;
    let codeExists = true;
    while (codeExists) {
      newReferralCode = crypto.randomBytes(4).toString('hex');
      codeExists = await User.findOne({ where: { referral_code: newReferralCode } });
    }

    // Find referrer if referral code provided
    let referrerId = 1; // Default to admin (ID 1)
    // let parentLeg = 'left'; // Default to left leg

    if (referral_code) {
      const referrer = await User.findOne({ where: { referral_code } });
      if (referrer) {
        referrerId = referrer.id;
        // Determine which leg to place the new user
        // parentLeg = referrer.getWeakerLeg();
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
    return res.send("Please check your email inbox now!")
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
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'You are disabled' });
    }

    // Check email verified
    if (!user.is_email_verified) {
      await sendVerificationEmail(user.email, user.email_verification_token, `${process.env.FRONTEND_URL}/register?ref=${user.referral_code}`);
      return res.status(401).json({ success: false, message: 'You should pass the email verification. We sent a new email verification token. Please check your email inbox now' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user.id);

    // Get user dashboard data
    const user_base_data = await getDashboard(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          referral_code: user.referral_code,
          is_admin: user.is_admin,
          phone: user.phone,
          egd_balance: user.egd_balance,
          withdrawals: user.withdrawals,
          wallet_address: user.wallet_address,
          referred_by: user.referred_by,
          parent_leg: user.parent_leg,
          left_volume: user.left_volume,
          right_volume: user.right_volume,
          created_at: getCreatedDate(user)
        },
        user_base_data,
        token
      }
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
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    try {
      validateString(newPassword, 'New Password', 3);
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
      password: newPassword,
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
    await user.update({ last_login: new Date() });

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
    const [admin_settings, staking_packages, rank_plans, commission_plans, total_tokens] = await Promise.all([
      AdminSetting.findAll(),
      StakingPackage.findAll(),
      RankPlan.findAll(),
      CommissionPlan.findAll(),
      TotalToken.findAll()
    ]);

    res.json({
      success: true,
      data: {
        admin_settings,
        staking_packages,
        rank_plans,
        commission_plans,
        total_tokens
      }
    });
  } catch (error) {
    console.error('Landing page data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch landing page data' });
  }
};

async function getDashboard(user_id) {
  try {
    const commission_plan = await CommissionPlan.findAll();
    const max_level = await CommissionPlan.count();

    // Get active stakings with package details
    const entireStakings = await Staking.findAll({ where: { user_id, status: { [Op.in]: ['active', 'completed'] } }, include: [{ model: StakingPackage, as: 'package' }] });

    // Calculate total staked amount
    const totalStaked = entireStakings.reduce((sum, staking) => {
      return Number((sum + parseFloat(staking.package.stake_amount || 0)).toFixed(8));
    }, 0);

    // Calculate total rewards earned (daily yield based on staking duration)
    const totalRewardsEarned = entireStakings.reduce((sum, staking) => {
      const stakingDate = getCreatedDate(staking);
      if (staking.package && stakingDate) {
        const now = new Date();
        const daysDiff = Math.floor((now - stakingDate) / 86400000);
        const dailyReward = (parseFloat(staking.package.stake_amount) * parseFloat(staking.package.daily_yield_percentage)) / 100;
        const totalEarned = dailyReward * daysDiff;
        return Number((sum + totalEarned).toFixed(8));
      }
      return sum;
    }, 0);

    // Calculate total rewards that will be received when staking period ends (365 days)
    const totalRewardsClaimed = entireStakings.reduce((sum, staking) => {
      if (staking.package) {
        const dailyReward = (parseFloat(staking.package.stake_amount) * parseFloat(staking.package.daily_yield_percentage)) / 100;
        const totalRewardsAtEnd = dailyReward * staking.package.lock_period_days; // 365 days
        return Number((sum + totalRewardsAtEnd).toFixed(8));
      }
      return sum;
    }, 0);

    // Get recent transactions
    const recent_transactions = await Transaction.findAll({
      where: { user_id },
      attributes: ['id', 'type', 'direction', 'amount', 'currency', 'notes', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    let total_earn_from_affiliation = 0;
    let each_level_income = [];
    let each_level_affiliater_number = [];

    // Get user's referral network (all levels from commission plans)
    const getReferralNetworkWithIncome = async (referrerId, level = 1) => {
      if (level > max_level) return [];
      if (!each_level_income[level]) each_level_income[level] = 0;
      each_level_affiliater_number[level] = each_level_affiliater_number[level] ? each_level_affiliater_number[level] + 1 : 1;

      // Find direct referrals using the new User model structure
      const referrals = await User.findAll({
        where: { referred_by: referrerId, is_admin: false },
        attributes: ['id', 'name', 'email', 'created_at', 'egd_balance', 'parent_leg', 'left_volume', 'right_volume'],
        order: [['created_at', 'ASC']]
      });

      const result = [];
      for (const referredUser of referrals) {

        let commission_income = 0;
        // Get referred user's stakings
        const userStakings = await Staking.findAll({
          where: { user_id: referredUser.id, status: { [Op.in]: ['active', 'completed'] } },
          include: [{
            model: StakingPackage,
            as: 'package',
            attributes: ['stake_amount']
          }]
        });

        const userTotalStaked = userStakings.reduce((sum, staking) => {
          return sum + parseFloat(staking.package.stake_amount || 0);
        }, 0);

        const commissionRate = commission_plan.find(plan => plan.level === level)?.commission_percent || 0;
        commission_income = (userTotalStaked * commissionRate) / 100;
        total_earn_from_affiliation += commission_income;
        each_level_income[level] += commission_income;

        // Recursively get sub-referrals and their incomes
        const subReferrals = await getReferralNetworkWithIncome(referredUser.id, level + 1);

        result.push({
          id: referredUser.id,
          level,
          referred_user: {
            id: referredUser.id,
            name: referredUser.name,
            email: referredUser.email,
            created_at: referredUser.created_at,
            egd_balance: referredUser.egd_balance,
            parent_leg: referredUser.parent_leg,
            left_volume: referredUser.left_volume,
            right_volume: referredUser.right_volume
          },
          created_at: referredUser.created_at,
          commission_income: Number(commission_income.toFixed(8)),
          sub_referrals: subReferrals
        });
      }

      return result;
    };

    // Get upline users (sponsors) up to commission depth
    const getUplineUsers = async (userId, maxLevel = 9) => {
      let currentUserId = userId;
      let level = 1;
      const uplines = [];

      while (level <= maxLevel) {
        // Find the user who referred this user
        const currentUser = await User.findByPk(currentUserId);
        if (!currentUser || !currentUser.referred_by || currentUser.referred_by === 1) break; // Stop at admin

        const uplineUser = await User.findByPk(currentUser.referred_by);
        if (!uplineUser) break;

        uplines.push({
          level,
          user: {
            id: uplineUser.id,
            name: uplineUser.name,
            email: uplineUser.email,
            created_at: uplineUser.created_at,
            egd_balance: uplineUser.egd_balance,
            parent_leg: uplineUser.parent_leg,
            left_volume: uplineUser.left_volume,
            right_volume: uplineUser.right_volume
          }
        });

        currentUserId = uplineUser.id;
        level++;
      }
      return uplines;
    };

    const upline_users = await getUplineUsers(user_id, max_level);
    const referralNetwork = await getReferralNetworkWithIncome(user_id, 1);
    const updated_withdrawals = await Withdrawal.findAll({ where: { user_id, status: { [Op.in]: ['approved', 'rejected'] } } })
    // Clean up arrays (remove undefined entries)
    each_level_income = each_level_income.filter(income => income !== undefined);
    each_level_affiliater_number = each_level_affiliater_number.filter(count => count !== undefined);

    return {
      staking: {
        total_staked: totalStaked,
        total_rewards_earned: totalRewardsEarned,
        total_rewards_claimed: totalRewardsClaimed,
        entire_stakings: entireStakings.length,
        stakings: entireStakings.map(staking => ({
          id: staking.id,
          stake_amount: staking.package.stake_amount,
          status: staking.status,
          start_date: getCreatedDate(staking),
          now: new Date(),
          package: staking.package ? {
            id: staking.package.id,
            name: staking.package.name,
            daily_yield_percentage: staking.package.daily_yield_percentage,
            lock_period_days: staking.package.lock_period_days
          } : null
        }))
      },
      referrals: {
        total_earn_from_affiliation,
        each_level_income,
        each_level_affiliater_number,
        network: referralNetwork
      },
      upline_users,
      recent_transactions,
      updated_withdrawals
    };
  } catch (error) {
    console.error('Get dashboard error:', error);
    throw error; // Let the calling function handle the error
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
}; 