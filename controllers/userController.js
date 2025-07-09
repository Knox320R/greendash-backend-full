const { Withdrawal, AdminSetting, TxHash, User, Staking, Transaction, StakingPackage, CommissionPlan } = require('../db/models');
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

    const { phone, name, is_active, wallet_address } = req.body;

    const updated_ata = {};
    if (name) updated_ata.name = name;
    if (phone) updated_ata.phone = phone;
    if (is_active) updated_ata.is_active = is_active;
    if (wallet_address) updated_ata.wallet_address = wallet_address;

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

    const token_price_setting = await AdminSetting.findOne({ where: { title: "token_price" } })
    const token_price = parseFloat(token_price_setting.value)
    const usdt_amount = parseFloat(package.stake_amount) * token_price
    const unilevel_list = await CommissionPlan.findAll()
    const unilevel_depth = await CommissionPlan.count()

    await tx.destroy();
    const newTransaction = await Transaction.create({ user_id, type: "staking", direction: "in", amount: package.stake_amount, currency: "EGD", status: "completed", notes: "Staking " + package.name })
    const new_staking = await Staking.create({ user_id, package_id, status: "active" })

    const parent = await User.findByPk(user.referred_by)
    console.log(usdt_amount);
    if (user.parent_leg === "left") {
      const left_volume = (parseFloat(parent.left_volume) + usdt_amount).toString();
      await parent.update({ left_volume })
    } else if (user.parent_leg === "right") {
      console.log(parent.right_volume);
      const right_volume = (parseFloat(parent.right_volume) + usdt_amount).toString();
      console.log(right_volume);
      await parent.update({ right_volume })
    }

    let ref = user.referred_by;
    for (let i = 1; i <= unilevel_depth; i++) {
      const referrer = await User.findByPk(ref)
      const unilevel = unilevel_list.find(item => item.level === i)
      const withdrawals = (parseFloat(referrer.withdrawals) + usdt_amount * unilevel.commission_percent / 100).toString();
      await referrer.update({ withdrawals: withdrawals })
      if (ref === 1) break
      ref = referrer.referred_by;
    }

    const daily_pool = await AdminSetting.findOne({ where: { title: "daily_pool" } })
    const new_pool = Number(daily_pool.value) + Number(package.stake_amount)
    await daily_pool.update({ value: new_pool })

    const newStaking = {
      id: new_staking.id,
      stake_amount: package.stake_amount,
      status: new_staking.status,
      start_date: new Date(),
      now: new Date(),
      package: {
        id: package.id,
        name: package.name,
        daily_yield_percentage: package.daily_yield_percentage,
        lock_period_days: package.lock_period_days
      }
    }

    return res.send({ success: true, message: "success to stake", newTransaction, newStaking })

  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to stake now" })
  }
}

const convertToUSDT = async (req, res) => {
  try {
    const user_id = req.user.id
    const { amount } = req.body

    const user = await User.findByPk(user_id)
    const egd_balance = Number(user.egd_balance)
    const withdrawals = parseFloat(user.withdrawals)
    if(amount > egd_balance) return res.status(403).send({ message: "Your requested amount is exceeding", success: true })

    const token_price_setting = await AdminSetting.findOne({ where: { title: "token_price" } })
    const token_price = parseFloat(token_price_setting.value)
    
    const new_egd = egd_balance - amount
    const new_withd = withdrawals + amount * token_price
    const newUser = await user.update({ egd_balance: new_egd, withdrawals: new_withd })
    res.send({ success: true, message: "success to exchange your token, EGD -> USDT",  egd: newUser.egd_balance, withd: newUser.withdrawals })

  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to exchange to USDT" })
  }
}

const withdrawalRequest = async (req, res) => {
  try {
    const user_id = req.user.id
    const { amount } = req.body
    console.log(user_id, amount);
    const user = await User.findByPk(user_id)
    const withdrawals = parseFloat(user.withdrawals)
    if(amount > withdrawals) req.status(403).send({ success: false, message: "Your requested amount is exceeding the available amount."})
    
    const newUser = await user.update({ withdrawals: withdrawals - amount })
    const transaction = await Transaction.create({ user_id, type: "withdrawal", direction: "out", amount, currency: "USDT", status: "pending", notes: user.name + " requests withdrawal" });
  
    const withdrawal = await Withdrawal.create({ user_id, amount, status: "pending" })

    res.send({ success: true, message: "Your request is pending for admin check. please wait till admin admit it.", newUser, transaction, withdrawal })

  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to withdraw request." })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  startStaking,
  convertToUSDT,
  withdrawalRequest
}; 