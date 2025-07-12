const { TotalTokens, Withdrawal, AdminSetting, TxHash, User, Staking, Transaction, StakingPackage, CommissionPlan } = require('../db/models');
const { validationResult } = require('express-validator');

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
    if (is_active) updated_ata.is_active = is_active;
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

    const tx = await TxHash.findOne({ where: { tx_hash } })
    if (!tx) return res.status(403).send({ success: false, message: "failed to find transaction hash" })

    const package = await StakingPackage.findByPk(package_id)
    if (!package) return res.status(403).send({ success: false, message: "failed to find staking package" })

    const user = await User.findByPk(user_id)
    if (!user) return res.status(403).send({ success: false, message: "failed to find user" })

    const seed_token = await TotalTokens.findOne({ where: { title: "seed_sale" } })
    const usdt_amount = parseFloat(package.stake_amount) * seed_token.price

    const unilevel_list = await CommissionPlan.findAll({ order: [['level', 'ASC']] })

    await seed_token.increment('amount', { by: -package.stake_amount })
    await TotalTokens.increment('amount', { by: package.stake_amount }, { where: {title: "daily_staking_pool"} })
    const new_staking = await Staking.create({ user_id, package_id, status: "active" })
    const newTransaction = await Transaction.create({ user_id, type: "staking", amount: package.stake_amount })
    await User.increment(user.parent_leg + '_volume', { by: usdt_amount }, { where: { id: user.referred_by } })
    await tx.destroy();

    let ref = user.referred_by;
    for(let unilevel of unilevel_list) {
      const referrer = await User.findByPk(ref)
      const withdrawal_increment = usdt_amount * unilevel.commission_percent / 100
      await referrer.increment('withdrawals', { by: withdrawal_increment })
      await Transaction.create({ user_id: referrer.id, type: 'unilevel_commission', amount: withdrawal_increment })
      if(ref === 1) break
      ref = referrer.referred_by
    }

    const newStaking = { ...new_staking.dataValues, package }

    return res.send({ success: true, message: "success to stake", newTransaction, newStaking })

  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to stake now" })
  }
}

const convertToUSDT = async (req, res) => {
  try {
    const { amount } = req.body
    const user = await User.findByPk(req.user.id)

    const egd_balance = Number(user.egd_balance)
    const withdrawals = parseFloat(user.withdrawals)
    if (amount > egd_balance) return res.status(403).send({ message: "Your requested amount is exceeding", success: true })

    const seed_token = await TotalTokens.findOne({ where: { title: "seed_sale" } }) || { price: 0.01 }

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

    const user = await User.findByPk(user_id)
    const withdrawals = parseFloat(user.withdrawals)

    if (amount > withdrawals) req.status(403).send({ success: false, message: "Your requested amount is exceeding the available amount." })

    await user.increment('withdrawals', { by: -amount })
    const withdrawal = await Withdrawal.create({ user_id, amount, status: "pending" })

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
    if (rejectedWithdrawals) 
      for (const item of rejectedWithdrawals) await item.destroy()
    
    const approvedWithdrawals = await Withdrawal.findAll({ where: { user_id, status: "approved" } })
    if (approvedWithdrawals)
      for (const item of approvedWithdrawals) await item.update({ status: "completed" })

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
  confirmUpdatedWithdrawl
}; 