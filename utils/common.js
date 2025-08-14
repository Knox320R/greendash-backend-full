const { User, Staking, StakingPackage, TotalToken, Transaction, Withdrawal } = require('../db/models');
const { Op } = require('sequelize'); // Added Op import for the new_withdrawals query

/**
 * Calculate staking progress percentage based on new idea
 * @param {number} user_id - The user's ID
 * @returns {Promise<Object>} - Object containing staking progress information
 */
const calculateStakingProgress = async (user_id) => {
  try {
    // Get user's current staking package
    const currentStaking = await Staking.findOne({ 
      where: { 
        user_id, 
        status: { [Op.in]: ['active', 'free_staking'] } 
      }, 
      include: [{ model: StakingPackage, as: 'package' }] 
    });

    if (!currentStaking || !currentStaking.package) {
      return {
        progress_rate: 0,
        current_earned: 0,
        target_amount: 0,
        current_staking_package_amount: 0,
        has_active_staking: false
      };
    }

    // Get token price
    const tokenInfo = await TotalToken.findOne({ where: { title: "seed_sale" } });
    const token_price = parseFloat(tokenInfo?.price) || 0.01;

    // Get user's current balances
    const user = await User.findByPk(user_id);
    const current_egd_balance = Number(user.new_egd_balance || 0);
    const current_withdrawals = Number(user.new_withdrawals || 0);

    // Calculate current earned amount in USDT
    // Convert EGD balance to USDT + current withdrawals (already in USDT)
    const current_earned_usdt = (current_egd_balance * token_price) + current_withdrawals;

    // Calculate target amount in USDT (current staking package amount * 3)
    const current_staking_package_amount_egd = parseFloat(currentStaking.package.stake_amount);
    const current_staking_package_amount_usdt = current_staking_package_amount_egd * token_price;
    const target_amount_usdt = current_staking_package_amount_usdt * 3;

    // Calculate progress percentage
    const progress_rate = target_amount_usdt > 0 ? (current_earned_usdt / target_amount_usdt) * 100 : 0;

    return {
      progress_rate: Math.min(progress_rate, 100), // Cap at 100%
      current_earned: current_earned_usdt, // in USDT
      target_amount: target_amount_usdt, // in USDT
      current_staking_package_amount: current_staking_package_amount_usdt, // in USDT
      current_staking_package_name: currentStaking.package.name,
      has_active_staking: true
    };
  } catch (error) {
    console.error('Error calculating staking progress:', error);
    return {
      progress_rate: 0,
      current_earned: 0,
      target_amount: 0,
      current_staking_package_amount: 0,
      current_staking_package_name: '',
      has_active_staking: false
    };
  }
};

const getCreatedDate = (obj) => {
  try {
    if (!obj) return null;
    
    // Handle different object structures
    if (obj.createdAt) return obj.createdAt;
    if (obj.created_at) return obj.created_at;
    if (obj.dataValues && obj.dataValues.createdAt) return obj.dataValues.createdAt;
    if (obj.dataValues && obj.dataValues.created_at) return obj.dataValues.created_at;
    
    return null;
  } catch (error) {
    console.error('Error getting created date:', error);
    return null;
  }
};

/**
 * Monitor user's profit and limit it to 300%
 * If user's profit exceeds 300%, complete all staking packages and set benefit_overflow flag
 * @param {number} user_id - The user's ID
 * @returns {Promise<Object>} - Result object with success status and details
 */
const monitorUserProfit = async (user_id) => {
  try {
    // 1. Get user with active stakings and package details
    const user = await User.findByPk(user_id, {
      include: [{
        model: Staking,
        as: 'stakings',
        where: { status: { [Op.in]: ['active', 'free_staking'] } },
        required: false,
        include: [{ model: StakingPackage, as: 'package' }]
      }]
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // 2. Get seed sale token price
    const seedToken = await TotalToken.findOne({ where: { title: 'seed_sale' } });
    if (!seedToken || !seedToken.price) {
      return { success: false, message: 'Seed sale token price not found' };
    }

    const seedTokenPrice = parseFloat(seedToken.price);
    
    // Validate seed token price
    if (seedTokenPrice <= 0 || isNaN(seedTokenPrice)) {
      return { success: false, message: 'Invalid seed sale token price' };
    }

    // 3. Calculate user's total active staking amount
    let totalActiveStaking = 0;
    if (user.stakings && user.stakings.length > 0) {
      user.stakings.forEach(staking => {
        if (staking.package) {
          totalActiveStaking += parseFloat(staking.package.stake_amount) || 0;
        }
      });
    }

    // If no active staking, no need to monitor
    if (totalActiveStaking <= 0) {
      return { success: true, message: 'No active staking to monitor' };
    }

    // 4. Calculate user's current profit including withdrawal history
    const userNewEgdBalance = Number(user.new_egd_balance || 0);     // in EGD
    const userNewWithdrawals = Number(user.new_withdrawals || 0);    // in USDT
    
    // Get all withdrawal records (excluding achieved status) to calculate total benefit
    const activeWithdrawals = await Withdrawal.findAll({
      where: {
        user_id: user_id,
        status: { [Op.ne]: 'achieved' }  // Exclude achieved withdrawals
      }
    });
    
    // Calculate total withdrawals from withdrawal records (excluding achieved)
    let totalWithdrawalsUSDT = 0;
    if (activeWithdrawals && activeWithdrawals.length > 0) {
      activeWithdrawals.forEach(withdrawal => {
        const amount = parseFloat(withdrawal.amount) || 0;
        if (amount > 0) {
          totalWithdrawalsUSDT += amount;
        }
      });
    }
    
    // Add new_withdrawals to the total (since these are current available withdrawals)
    totalWithdrawalsUSDT += userNewWithdrawals;
    
    // Validate withdrawal amounts
    if (totalWithdrawalsUSDT < 0) {
      console.warn(`⚠️ Warning: Negative withdrawal amount detected for user ${user_id}: ${totalWithdrawalsUSDT}`);
      totalWithdrawalsUSDT = 0;
    }
    
    // Convert USDT withdrawals to EGD equivalent using seed token price
    const withdrawalsInEGD = totalWithdrawalsUSDT / seedTokenPrice;
    
    // Total benefit = New EGD balance + Withdrawals converted to EGD
    const totalBenefit = userNewEgdBalance + withdrawalsInEGD;
    
    // Calculate profit percentage
    let profitPercentage = 0;
    if (totalActiveStaking > 0) {
      profitPercentage = (totalBenefit / totalActiveStaking) * 100;
    } else {
      console.warn(`⚠️ Warning: Total active staking is 0 for user ${user_id}`);
      return { success: true, message: 'No active staking to monitor' };
    }
    
    // Validate profit percentage
    if (isNaN(profitPercentage) || profitPercentage < 0) {
      console.warn(`⚠️ Warning: Invalid profit percentage calculated for user ${user_id}: ${profitPercentage}`);
      profitPercentage = 0;
    }

    console.log(`📊 User ${user_id} Profit Analysis:`);
    console.log(`   - Total Active Staking: ${totalActiveStaking} EGD`);
    console.log(`   - New EGD Balance: ${userNewEgdBalance} EGD`);
    console.log(`   - New Withdrawals: ${userNewWithdrawals} USDT`);
    console.log(`   - Active Withdrawals (excluding achieved): ${totalWithdrawalsUSDT} USDT`);
    console.log(`   - Withdrawals in EGD equivalent: ${withdrawalsInEGD.toFixed(8)} EGD`);
    console.log(`   - Total Benefit: ${totalBenefit.toFixed(8)} EGD`);
    console.log(`   - Profit Percentage: ${profitPercentage.toFixed(2)}%`);

    // 5. Check if profit exceeds 300%
    if (profitPercentage >= 300) {
      console.log(`⚠️ User ${user_id} profit exceeds 300% (${profitPercentage.toFixed(2)}%). Completing staking packages...`);

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

      // 6. Complete all user's active staking packages
      if (user.stakings && user.stakings.length > 0) {
        for (const staking of user.stakings) {
          await staking.update({ status: 'completed' });
          console.log(`   ✅ Completed staking ID: ${staking.id}`);
        }
      }

      // 8. Set benefit_overflow flag
      await user.update({ benefit_overflow: true });
      console.log(`   ✅ Set benefit_overflow flag for user ${user_id}`);

      return {
        success: true,
        message: 'Profit limit exceeded. Staking packages completed and benefit_overflow flag set.',
        details: {
          profitPercentage: profitPercentage.toFixed(2),
          completedStakings: user.stakings ? user.stakings.length : 0,
          benefitOverflowSet: true,
        }
      };
    }

    if(user.benefit_overflow) await user.update({ benefit_overflow: false });

    return {
      success: true,
      message: 'Profit within acceptable limits',
      details: {
        profitPercentage: profitPercentage.toFixed(2),
        limitExceeded: false
      }
    };

  } catch (error) {
    console.error('Error monitoring user profit:', error);
    return { success: false, message: 'Failed to monitor user profit', error: error.message };
  }
};

module.exports = {
  getCreatedDate,
  monitorUserProfit,
  calculateStakingProgress
};