const { User, Staking, StakingPackage, TotalToken, Transaction } = require('../db/models');

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
    const userEgdBalance = parseFloat(user.egd_balance) || 0;     // in EGD

    // Get all withdrawal transactions (in USDT)
    // Note: Transaction records are only created when withdrawals are approved by admin
    // So all withdrawal transactions in the Transaction table are approved withdrawals
    const withdrawalTransactions = await Transaction.findAll({
      where: {
        user_id: user_id,
        type: 'withdrawal'
      }
    });

    // Calculate total withdrawals in USDT from transaction history
    let totalWithdrawalsUSDT = 0;
    if (withdrawalTransactions && withdrawalTransactions.length > 0) {
      withdrawalTransactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        if (amount > 0) {
          totalWithdrawalsUSDT += amount;
        }
      });
    }

    // Fallback: Also check user's withdrawals field for comparison
    let userWithdrawalsField = parseFloat(user.withdrawals) || 0;

    // Validate withdrawal amounts
    if (totalWithdrawalsUSDT < 0) {
      console.warn(`⚠️ Warning: Negative withdrawal amount detected for user ${user_id}: ${totalWithdrawalsUSDT}`);
      totalWithdrawalsUSDT = 0;
    }

    if (userWithdrawalsField < 0) {
      console.warn(`⚠️ Warning: Negative user withdrawals field for user ${user_id}: ${userWithdrawalsField}`);
      userWithdrawalsField = 0;
    }

    // Use transaction history as primary source, but log both for comparison
    console.log(`   - Withdrawals from transactions: ${totalWithdrawalsUSDT} USDT`);
    console.log(`   - Withdrawals from user field: ${userWithdrawalsField} USDT`);

    // Convert USDT withdrawals to EGD equivalent using seed token price
    const withdrawalsInEGD = totalWithdrawalsUSDT / seedTokenPrice;

    // Total EGD balance = Current EGD balance + Withdrawals converted to EGD
    const totalEGDbalance = userEgdBalance + withdrawalsInEGD;

    // Calculate profit percentage
    let profitPercentage = 0;
    if (totalActiveStaking > 0) {
      profitPercentage = (totalEGDbalance / totalActiveStaking) * 100;
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
    console.log(`   - EGD Balance: ${userEgdBalance} EGD`);
    console.log(`   - Withdrawals from transactions: ${totalWithdrawalsUSDT} USDT`);
    console.log(`   - Withdrawals from user field: ${userWithdrawalsField} USDT`);
    console.log(`   - Withdrawals in EGD equivalent: ${withdrawalsInEGD.toFixed(8)} EGD`);
    console.log(`   - Total Value: ${totalEGDbalance.toFixed(8)} EGD`);
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

    if (user.benefit_overflow) await user.update({ benefit_overflow: false });

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