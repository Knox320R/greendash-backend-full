const { User, Staking, StakingPackage, TotalToken } = require('../db/models');

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
        where: { status: 'active' },
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

    // 4. Calculate user's current profit
    const userEgdBalance = parseFloat(user.egd_balance) || 0;     // in EGD
    const userWithdrawals = parseFloat(user.withdrawals) || 0;   // in USDT
    
    // Convert to USDT equivalent using seed token price
    const totalEGDbalance = userEgdBalance + userWithdrawals / seedTokenPrice;
    
    // Calculate profit percentage
    const profitPercentage = (totalEGDbalance / totalActiveStaking) * 100;

    console.log(`📊 User ${user_id} Profit Analysis:`);
    console.log(`   - Total Active Staking: ${totalActiveStaking} EGD`);
    console.log(`   - EGD Balance: ${userEgdBalance} EGD`);
    console.log(`   - Withdrawals: ${userWithdrawals} USDT`);
    console.log(`   - Total Value in USDT: ${totalEGDbalance} EGD`);
    console.log(`   - Profit Percentage: ${profitPercentage.toFixed(2)}%`);

    // 5. Check if profit exceeds 300%
    if (profitPercentage >= 300) {
      console.log(`⚠️ User ${user_id} profit exceeds 300% (${profitPercentage.toFixed(2)}%). Completing staking packages...`);

      // 6. Complete all user's active staking packages
      if (user.stakings && user.stakings.length > 0) {
        for (const staking of user.stakings) {
          await staking.update({ status: 'completed' });
          console.log(`   ✅ Completed staking ID: ${staking.id}`);
        }
      }

      // 7. Set benefit_overflow flag
      await user.update({ benefit_overflow: true });
      console.log(`   ✅ Set benefit_overflow flag for user ${user_id}`);

      return {
        success: true,
        message: 'Profit limit exceeded. Staking packages completed and benefit_overflow flag set.',
        details: {
          profitPercentage: profitPercentage.toFixed(2),
          completedStakings: user.stakings ? user.stakings.length : 0,
          benefitOverflowSet: true
        }
      };
    }

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
  monitorUserProfit
};