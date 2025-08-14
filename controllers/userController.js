const { where, Op } = require('sequelize');
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

    // Direct blockchain verification using tx_hash
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.BSC_MAINNET);
    const usdt_token_address = '0x55d398326f99059fF775485246999027B3197955'; // USDT BEP-20
    const ERC20_ABI = require('../contract/bep-20.json');
    const contract = new ethers.Contract(usdt_token_address, ERC20_ABI, provider);

    // Get platform wallet address
    const platform_info = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } });
    const platform_address = platform_info.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e';

    try {
      // Verify transaction exists and get receipt
      const receipt = await provider.getTransactionReceipt(tx_hash);
      if (!receipt || receipt.status !== 1) {
        return res.status(400).send({ success: false, message: "Transaction not found or failed" });
      }

      // Check if transaction is to platform wallet
      // const tx = await provider.getTransaction(tx_hash);
      // console.log(tx);

      // Parse transaction logs to find USDT transfer
      let transferAmount = 0.00;
      let transferFrom = null;

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'Transfer') {
            const { from, to, value } = parsedLog.args;
            if (to.toLowerCase() === platform_address.toLowerCase()) {
              transferAmount = parseFloat(ethers.formatUnits(value, 18)); // USDT has 18 decimals
              transferFrom = from;
              break;
            }
          }
        } catch (logError) {
          continue;
        }
      }

      if (!transferAmount || !transferFrom) {
        return res.status(400).send({ success: false, message: "No USDT transfer found in transaction" });
      }

      // Check if transaction amount matches package amount
      const package = await StakingPackage.findByPk(package_id)
      if (!package) return res.status(403).send({ success: false, message: "failed to find staking package" })

      const token_info = await TotalToken.findOne({ where: { title: "seed_sale" } });
      const token_price = parseFloat(token_info.price) || 0.01;
      const usdt_amount = parseFloat(package.stake_amount) * token_price;
      if (transferAmount < usdt_amount) {
        console.log("stake_amount", usdt_amount);
        console.log("transferAmount", transferAmount);
        return res.status(400).send({ success: false, message: "Transaction amount doesn't match staking amount" });
      }

      // Check if transaction hash already used for staking
      const existingStaking = await Staking.findOne({ where: { tx_hash: tx_hash } });
      if (existingStaking) {
        return res.status(400).send({ success: false, message: "Transaction hash already used for staking" });
      }

      // Check if user already has an active staking package
      const existingActiveStaking = await Staking.findOne({ 
        where: { 
          user_id: user_id,
          status: { [Op.in]: ['active', 'free_staking'] }
        },
        include: [{ model: StakingPackage, as: 'package' }]
      });

      if (existingActiveStaking) {
        // Check if this is an upgrade (new package must be bigger)
        const currentPackage = existingActiveStaking.package;
        const newPackage = package;
        
        if (parseFloat(newPackage.stake_amount) <= parseFloat(currentPackage.stake_amount)) {
          return res.status(400).send({ 
            success: false, 
            message: "Upgrade not allowed. New package must be bigger than current package.",
            current_package: currentPackage.stake_amount,
            new_package: newPackage.stake_amount
          });
        }

        // This is a valid upgrade - complete the current staking package
        await existingActiveStaking.update({ status: 'completed' });
        console.log(`✅ Upgraded staking package for user ${user_id}: ${currentPackage.stake_amount} -> ${newPackage.stake_amount}`);
      }

      const user = await User.findByPk(user_id)
      if (!user) return res.status(403).send({ success: false, message: "failed to find user" })

      // Transfer current balances to old balances when starting new staking
      const currentNewEgd = Number(user.new_egd_balance || 0)
      const currentNewWithdrawals = Number(user.new_withdrawals || 0)
      
      if (currentNewEgd > 0 || currentNewWithdrawals > 0) {
        await user.update({
          old_egd_balance: Number(user.old_egd_balance || 0) + currentNewEgd,
          old_withdrawals: Number(user.old_withdrawals || 0) + currentNewWithdrawals,
          new_egd_balance: 0,
          new_withdrawals: 0
        })
      }

      // Mark all completed withdrawals as achieved when starting new staking
      await Withdrawal.update(
        { status: 'achieved' },
        { 
          where: { 
            user_id: user_id,
            status: 'completed'
          }
        }
      )

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

      const new_staking = await Staking.create({
        user_id,
        package_id,
        status: "active",
        tx_hash: tx_hash // Store transaction hash in staking record
      })

      const newTransaction = await Transaction.create({
        user_id,
        type: "staking",
        amount: package.stake_amount,
        created_at: new Date()
      })

      const parent_leg = user.parent_leg + '_volume';
      await User.increment(parent_leg, { by: usdt_amount, where: { id: user.referred_by } })

      let ref = user.referred_by;
      for (let unilevel of unilevel_list) {
        const referrer = await User.findByPk(ref)
        if (!referrer) break; // Add safety check
        if (referrer.benefit_overflow) continue;
        const withdrawal_increment = usdt_amount * unilevel.commission_percent / 100
        
        await referrer.increment('new_withdrawals', { by: withdrawal_increment })
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

      await monitorUserProfit(user_id);

      // Calculate staking progress percentage for the response
      const { calculateStakingProgress } = require('../utils/common');
      const staking_progress = await calculateStakingProgress(user_id);

      return res.send({ 
        success: true, 
        message: "success to stake", 
        newTransaction, 
        newStaking,
        staking_progress
      })

    } catch (blockchainError) {
      console.error('Blockchain verification error:', blockchainError);
      return res.status(400).send({ success: false, message: "Failed to verify transaction on blockchain" });
    }

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
      if(user.benefit_overflow) continue;
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
        await user.increment('new_egd_balance', { by: share });
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
    const restFeePoolAfterDistribution = feePool - totalDistributed
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

    // Calculate new balances
    const currentNewEgd = Number(user.new_egd_balance || 0)
    const currentOldEgd = Number(user.old_egd_balance || 0)
    const currentNewWithdrawals = Number(user.new_withdrawals || 0)
    const currentOldWithdrawals = Number(user.old_withdrawals || 0)
    
    let remainingAmount = amount
    let newNewEgd = currentNewEgd
    let newOldEgd = currentOldEgd
    let newNewWithdrawals = currentNewWithdrawals
    let newOldWithdrawals = currentOldWithdrawals
    
    // First deduct from new_egd_balance
    if (remainingAmount > 0 && newNewEgd > 0) {
      const deductFromNew = Math.min(remainingAmount, newNewEgd)
      newNewEgd -= deductFromNew
      remainingAmount -= deductFromNew
    }
    
    // Then deduct from old_egd_balance if needed
    if (remainingAmount > 0 && newOldEgd > 0) {
      const deductFromOld = Math.min(remainingAmount, newOldEgd)
      newOldEgd -= deductFromOld
      remainingAmount -= deductFromOld
    }
    
    // Add to withdrawals (prefer new_withdrawals first)
    const usdtAmount = (amount - remainingAmount) * seed_token.price
    if (usdtAmount > 0) {
      newNewWithdrawals += usdtAmount
    }

    const newUser = await user.update({ 
      new_egd_balance: newNewEgd, 
      old_egd_balance: newOldEgd,
      new_withdrawals: newNewWithdrawals,
      old_withdrawals: newOldWithdrawals
    })
    
    res.send({ 
      success: true, 
      message: "success to exchange your token, EGD -> USDT", 
      egd: newUser.egd_balance, 
      withd: newUser.withdrawals 
    })

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

    // Calculate new withdrawal balances
    const currentNewWithdrawals = Number(user.new_withdrawals || 0)
    const currentOldWithdrawals = Number(user.old_withdrawals || 0)
    
    let remainingAmount = amount
    let newNewWithdrawals = currentNewWithdrawals
    let newOldWithdrawals = currentOldWithdrawals
    
    // First deduct from new_withdrawals
    if (remainingAmount > 0 && newNewWithdrawals > 0) {
      const deductFromNew = Math.min(remainingAmount, newNewWithdrawals)
      newNewWithdrawals -= deductFromNew
      remainingAmount -= deductFromNew
    }
    
    // Then deduct from old_withdrawals if needed
    if (remainingAmount > 0 && newOldWithdrawals > 0) {
      const deductFromOld = Math.min(remainingAmount, newOldWithdrawals)
      newOldWithdrawals -= deductFromOld
      remainingAmount -= deductFromOld
    }
    
    // Update user withdrawal balances
    await user.update({
      new_withdrawals: newNewWithdrawals,
      old_withdrawals: newOldWithdrawals
    })
    
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