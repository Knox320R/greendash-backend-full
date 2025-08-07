const { where } = require('sequelize');
const { TokenPool, TotalToken, Withdrawal, AdminSetting, TxHash, User, Staking, Transaction, StakingPackage, CommissionPlan } = require('../db/models');
const { validationResult } = require('express-validator');
const { monitorUserProfit } = require('../utils/common');
require('dotenv').config();

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'email_verification_token', 'reset_password_token'] },
      include: [
        {
          model: Staking,
          as: 'stakings',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: StakingPackage,
              as: 'package'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    const { id } = req.user
    const user = await User.findByPk(id)

    const { phone, name, is_active, wallet_address } = req.body;

    const updated_ata = {};
    if (name) updated_ata.name = name;
    if (phone) updated_ata.phone = phone;
    if (is_active !== undefined) updated_ata.is_active = is_active;
    if (wallet_address) updated_ata.wallet_address = wallet_address;

    await user.update(updated_ata)

    return res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { current_password, new_password } = req.body;

    // Verify current password
    const isValidPassword = await req.user.comparePassword(current_password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await req.user.update({ password: new_password });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

const startStaking = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { tx_hash, package_id } = req.body

    if (!tx_hash || !package_id) {
      return res.status(400).send({ success: false, message: "Transaction hash and package ID are required" })
    }

    const tx = await TxHash.findOne({ where: { tx_hash } })
    if (!tx) return res.status(403).send({ success: false, message: "failed to find transaction hash" })

    const package = await StakingPackage.findByPk(package_id)
    if (!package) return res.status(403).send({ success: false, message: "failed to find staking package" })

    const user = await User.findByPk(user_id)
    if (!user) return res.status(403).send({ success: false, message: "failed to find user" })

    const seed_token = await TotalToken.findOne({ where: { title: "seed_sale" } })
    if (!seed_token) {
      return res.status(500).send({ success: false, message: "seed_sale token not found" })
    }

    const usdt_amount = parseFloat(package.stake_amount) * parseFloat(seed_token.price || 0)

    const unilevel_list = await CommissionPlan.findAll({ order: [['level', 'ASC']] })

    // 1. Get platform fee percentage
    const platformFeeSetting = await AdminSetting.findOne({ where: { title: 'platform_fee' } });
    const platformFeePercent = parseFloat(platformFeeSetting.value) || 0;

    // 2. Calculate fee and net staking
    const feeAmount = parseFloat(package.stake_amount) * (platformFeePercent / 100);
    const netStakingAmount = parseFloat(package.stake_amount) - feeAmount;

    // 3. Add net staking to daily_staking pool
    await TokenPool.increment('amount', { by: netStakingAmount, where: { title: "daily_staking" } });

    // 4. Add fee to platform_fee pool
    await TokenPool.increment('amount', { by: feeAmount, where: { title: "platform_fee" } });

    const new_staking = await Staking.create({ user_id, package_id, status: "active" })
    const newTransaction = await Transaction.create({
      user_id,
      type: "staking",
      amount: package.stake_amount,
      created_at: new Date()
    })
    const parent_leg = user.parent_leg + '_volume';
    await User.increment(parent_leg, { by: usdt_amount, where: { id: user.referred_by } })
    await tx.destroy();

    let ref = user.referred_by;
    for (let unilevel of unilevel_list) {
      const referrer = await User.findByPk(ref)
      if (!referrer) break; // Add safety check
      const withdrawal_increment = usdt_amount * unilevel.commission_percent / 100
      await referrer.increment('withdrawals', { by: withdrawal_increment })
      await Transaction.create({
        user_id: referrer.id,
        type: 'unilevel_commission',
        amount: withdrawal_increment,
        created_at: new Date()
      })
      await monitorUserProfit(referrer.id);
      if (ref === 1) break
      ref = referrer.referred_by
    }

    const newStaking = { ...new_staking.dataValues, package }

    return res.send({ success: true, message: "success to stake", newTransaction, newStaking })

  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to stake now" })
  }
}

const universalCashback = async (req, res) => {
  try {
    const TOTAL_SUPPLY = process.env.TOTAL_TOKEN_AMOUNT || 1000000000;

    // 1. Get the current platform fee pool
    const feePoolToken = await TokenPool.findOne({ where: { title: 'platform_fee' } });
    if (!feePoolToken) {
      return res.status(404).json({ success: false, message: 'Platform fee pool not found.' });
    }
    const feePool = parseFloat(feePoolToken.amount) || 0;
    if (feePool <= 0) {
      return res.status(400).json({ success: false, message: 'No fees to distribute.' });
    }

    // 2. Find all users with active stakings and calculate their total active staked amount
    const stakers = await User.findAll({
      include: [{
        model: Staking,
        as: 'stakings',
        where: { status: 'active' },
        required: true,
        include: [{ model: StakingPackage, as: 'package' }]
      }]
    });

    if (stakers.length === 0) {
      return res.status(400).json({ success: false, message: 'No active stakers found.' });
    }

    // 3. Calculate each user's share based on total supply
    let totalDistributed = 0;
    let userDistributions = [];
    for (const user of stakers) {
      let userTotalStaked = 0;
      user.stakings.forEach(staking => {
        const pkg = staking.package;
        if (pkg) {
          userTotalStaked += parseFloat(pkg.stake_amount) || 0;
        }
      });
      if (userTotalStaked > 0) {
        const share = (userTotalStaked / TOTAL_SUPPLY) * feePool;
        totalDistributed += share;
        await user.increment('egd_balance', { by: share });
        await Transaction.create({
          user_id: user.id,
          type: 'universal_cashback',
          amount: share,
          created_at: new Date()
        });
        userDistributions.push({ user_id: user.id, staked: userTotalStaked, share });
      }
    }

    // 4. Set the platform_fee pool to 0
    const restFeePoolAfterDistribution = feePool-totalDistributed
    await TokenPool.increment('amount', { by: restFeePoolAfterDistribution, where: { title: 'total_staking' } })
    await feePoolToken.update({ amount: 0 });

    return res.json({
      success: true,
      message: 'Fee pool distributed successfully.',
      total_distributed: totalDistributed,
      staker_count: userDistributions.length,
      user_distributions: userDistributions
    });
  } catch (error) {
    console.error('Error distributing fee pool:', error);
    return res.status(500).json({ success: false, message: 'Failed to distribute fee pool.' });
  }
};


const convertToUSDT = async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).send({ success: false, message: "Valid amount is required" })
    }

    const user = await User.findByPk(req.user.id)

    const egd_balance = Number(user.egd_balance)
    const withdrawals = parseFloat(user.withdrawals)
    if (amount > egd_balance) return res.status(403).send({ message: "Your requested amount is exceeding", success: false })

    const seed_token = await TotalToken.findOne({ where: { title: "seed_sale" } }) || { price: 0.01 }

    const new_egd = egd_balance - amount
    const new_withd = withdrawals + amount * seed_token.price
    const newUser = await user.update({ egd_balance: new_egd, withdrawals: new_withd })
    res.send({ success: true, message: "success to exchange your token, EGD -> USDT", egd: newUser.egd_balance, withd: newUser.withdrawals })

  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to exchange to USDT" })
  }
}

const withdrawalRequest = async (req, res) => {
  try {
    const user_id = req.user.id
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).send({ success: false, message: "Valid amount is required" })
    }

    const user = await User.findByPk(user_id)
    const withdrawals = parseFloat(user.withdrawals)

    if (amount > withdrawals) return res.status(403).send({ success: false, message: "Your requested amount is exceeding the available amount." })

    await user.increment('withdrawals', { by: -amount })
    const withdrawal = await Withdrawal.create({
      user_id,
      amount,
      status: "pending",
      created_at: new Date()
    })

    res.send({ success: true, message: "Your request is pending for admin check. please wait till admin admit it.", withdrawal })

  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to withdraw request." })
  }
}

const confirmUpdatedWithdrawl = async (req, res) => {
  try {
    const user_id = req.user.id

    const rejectedWithdrawals = await Withdrawal.findAll({ where: { user_id, status: "rejected" } })
    if (rejectedWithdrawals && rejectedWithdrawals.length > 0) {
      for (const item of rejectedWithdrawals) {
        await item.destroy()
      }
    }

    const approvedWithdrawals = await Withdrawal.findByPk(req.body.withdrawal_id)
    await approvedWithdrawals.update({ status: "completed" })

    return res.send({ success: true, message: "Your withdrawal request has been fully processed." })
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to confirm a withdrawal" })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  startStaking,
  convertToUSDT,
  withdrawalRequest,
  confirmUpdatedWithdrawl,
  universalCashback
}; 