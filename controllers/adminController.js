const { TokenPool, User, Staking, Transaction, AdminSetting, StakingPackage, RankPlan, CommissionPlan, TotalToken, Withdrawal } = require('../db/models');
const { validationResult } = require('express-validator');
const { Op, where } = require('sequelize');
const moment = require('moment');

// Get admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const verifiedUsers = await User.count({ where: { is_email_verified: true } });
    const newUsersToday = await User.count({ where: { created_at: { [Op.gte]: moment().startOf('day').toDate() } } });

    // Staking statistics
    const totalStakings = await Staking.count();
    const activeStakings = await Staking.count({ where: { status: 'active' } });
    const adminStakings = await Staking.count({ where: { status: 'free_staking' } });
    // Calculate total staked amount from packages
    const activeStakingsWithPackages = await Staking.findAll({
      where: { status: 'active' },
      include: [{ model: StakingPackage, as: 'package', attributes: ['stake_amount'] }]
    });
    const totalStakedAmount = activeStakingsWithPackages.reduce((sum, staking) => { return sum + parseFloat(staking.package?.stake_amount || 0); }, 0);

    // Calculate total rewards paid from transactions
    // const totalRewardsPaid = await Transaction.sum('amount', { where: { type: 'daily_reward' } });

    const seedToken = await TotalToken.findOne({ where: { title: "seed_sale" } })
    const seedSalePrice = seedToken.price
    // Financial statistics - calculate from transactions
    const totalInvestedEGD = await Transaction.sum('amount', { where: { type: 'staking' } });
    const totalInvested = parseFloat(totalInvestedEGD) * seedSalePrice;

    const totalDailyRewardedEGD = await Transaction.sum('amount', { where: { type: 'daily_reward' } });
    const totalDailyRewardedUSDT = parseFloat(totalDailyRewardedEGD) * seedSalePrice;
    const totalBonusUSDT = await Transaction.sum('amount', { where: { type: { [Op.in]: ['unilevel_commission', 'weak_leg_bonus'] } } });
    const totalEarned = totalDailyRewardedUSDT + parseFloat(totalBonusUSDT);

    const totalWithdrawn = await Transaction.sum('amount', { where: { type: 'withdrawal' } });

    // Transaction statistics
    const totalTransactions = await Transaction.count();
    const stakingTransactions = await Transaction.count({ where: { type: "staking" } });
    const withdrawalTransactions = await Transaction.count({ where: { type: "withdrawal" } });

    // Withdrawal statistics
    const pendingWithdrawals = await Withdrawal.count({ where: { status: 'pending' } });
    const totalWithdrawalAmount = await Withdrawal.sum('amount', { where: { status: 'pending' } });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          new_today: newUsersToday
        },
        staking: {
          total: totalStakings,
          active: activeStakings,
          total_staked: parseFloat(totalStakedAmount || 0),
          total_rewards_paid: adminStakings
        },
        financial: {
          total_invested: totalInvested,
          total_earned: totalEarned,
          total_withdrawn: parseFloat(totalWithdrawn || 0)
        },
        transactions: {
          total: totalTransactions,
          staking: stakingTransactions,
          withdrawals: withdrawalTransactions
        },
        withdrawals: {
          pending: pendingWithdrawals,
          pending_amount: parseFloat(totalWithdrawalAmount || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    const { table_name, data } = req.body
    const { id } = data
    if (!id) {
      return res.status(400).send({ success: false, message: "ID is required" })
    }

    let row = undefined
    switch (table_name) {
      case "admin_settings": {
        row = await AdminSetting.findByPk(id)
        break
      }
      case "staking_packages": {
        row = await StakingPackage.findByPk(id)
        break
      }
      case "token_pools": {
        row = await TokenPool.findByPk(id)
        break
      }
      case "rank_plans": {
        row = await RankPlan.findByPk(id)
        break
      }
      case "commission_plans": {
        row = await CommissionPlan.findByPk(id)
        break
      }
      case "total_tokens": {
        row = await TotalToken.findByPk(id)
        break
      }
      default: {
        return res.status(400).send({ success: false, message: "Invalid table name" })
      }
    }

    if (!row) {
      return res.status(404).send({ success: false, message: "Record not found" })
    }

    await row.update(data)
    return res.send({ success: true, message: "successfully updated" })
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to update setting data" })
  }
}

const deleteAdminSettings = async (req, res) => {
  try {
    const { table_name, id } = req.params
    if (!id) {
      return res.status(400).send({ success: false, message: "ID is required" })
    }

    let row = undefined
    switch (table_name) {
      case "admin_settings": {
        row = await AdminSetting.findByPk(id)
        break
      }
      case "staking_packages": {
        row = await StakingPackage.findByPk(id)
        break
      }
      case "rank_plans": {
        row = await RankPlan.findByPk(id)
        break
      }
      case "commission_plans": {
        row = await CommissionPlan.findByPk(id)
        break
      }
      case "total_tokens": {
        row = await TotalToken.findByPk(id)
        break
      }
      default: {
        return res.status(400).send({ success: false, message: "Invalid table name" })
      }
    }

    if (!row) {
      return res.status(404).send({ success: false, message: "Record not found" })
    }

    await row.destroy()
    return res.send({ success: true, message: "successfully deleted" })
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to delete setting data" })
  }
}

const createAdminSettings = async (req, res) => {
  try {
    const { table_name, data } = req.body
    if (!data) {
      return res.status(400).send({ success: false, message: "Data is required" })
    }

    let model = undefined
    switch (table_name) {
      case "admin_settings": {
        model = await AdminSetting.create(data)
        break
      }
      case "staking_packages": {
        model = await StakingPackage.create(data)
        break
      }
      case "rank_plans": {
        model = await RankPlan.create(data)
        break
      }
      case "commission_plans": {
        model = await CommissionPlan.create(data)
        break
      }
      case "total_tokens": {
        model = await TotalToken.create(data)
        break
      }
      default: {
        return res.status(400).send({ success: false, message: "Invalid table name" })
      }
    }
    return res.send({ success: true, message: "successfully created", newRow: model })
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, message: "failed to create setting data" })
  }
}

const getTablePagenation = async (req, res) => {
  try {
    const { limit, offset, table_name } = req.body

    if (!limit || offset === null || !table_name) {
      return res.status(400).send({ success: false, message: "limit, offset, and table_name are required" })
    }

    let list = [];
    let isMore = false;

    switch (table_name) {
      case "users": {
        list = await User.findAll({
          include: [{
            model: Staking,
            as: 'stakings',
            // where: { status: { [Op.in]: ['active', 'free_staking'] } },
            attributes: ['id', 'package_id', 'status', 'created_at'],
            // required: true,
            include: [{
              model: StakingPackage,
              as: 'package'
            }]
          }],
          order: [['created_at', 'DESC']],
          limit,
          offset,
          attributes: ['id', 'email', 'name', 'created_at', 'is_email_verified', 'is_active', 'left_volume', 'right_volume']
        });
        break
      }
      case "stakings": {
        list = await Staking.findAll({
          include: [
            { model: User, as: 'user', attributes: ['email', 'name'] },
            { model: StakingPackage, as: 'package', attributes: ['name', 'stake_amount'] }
          ],
          order: [['created_at', 'DESC']],
          limit,
          offset,
          attributes: ['id', 'status', 'created_at']
        });
        break
      }
      case "withdrawals": {
        list = await Withdrawal.findAll({
          include: [
            { model: User, as: 'user', attributes: ['email', 'name', 'wallet_address'] }
          ],
          order: [['created_at', 'DESC']],
          limit,
          offset,
          attributes: ['id', 'amount', 'status', 'created_at', 'updated_at']
        });
        break
      }
      case "transactions": {
        list = await Transaction.findAll({
          include: [
            { model: User, as: 'user', attributes: ['email', 'name'] }
          ],
          order: [['created_at', 'DESC']],
          limit,
          offset
        });
        break
      }
      default: {
        return res.status(400).send({ success: false, message: "Invalid table name" })
      }
    }
    isMore = !(list.length < limit)
    return res.send({ success: true, list, isMore })
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: false,
      message: "failed to read table data"
    })
  }
}

// Update user (admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, is_admin, is_email_verified, egd_balance } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updated_ata = {};
    if (typeof is_active === 'boolean') updated_ata.is_active = is_active;
    if (typeof is_admin === 'boolean') updated_ata.is_admin = is_admin;
    if (typeof is_email_verified === 'boolean') updated_ata.is_email_verified = is_email_verified;
    if (egd_balance !== undefined) updated_ata.new_egd_balance = egd_balance;

    await user.update(updated_ata);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

const ApproveWithdrawal = async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).send({ success: false, message: "Withdrawal ID is required" })
    }

    const withdrawal = await Withdrawal.findByPk(id)

    if (!withdrawal) {
      return res.status(404).send({ success: false, message: "Withdrawal not found" })
    }

    const platform_fee_item = await AdminSetting.findOne({ where: { title: "platform_fee" } })

    if (!platform_fee_item) {
      return res.status(500).send({ success: false, message: "Platform fee setting not found" })
    }

    const platform_fee = parseFloat(platform_fee_item.value) / 100
    const amount = parseFloat(withdrawal.amount) * (1 - platform_fee);

    await withdrawal.update({ status: "approved" })
    await Transaction.create({
      user_id: withdrawal.user_id,
      type: 'withdrawal',
      amount,
      created_at: new Date()
    })
    res.send({ success: true, message: "success to approve user withdrawal" })
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to approve withdrawal" })
  }
}

const RejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).send({ success: false, message: "Withdrawal ID is required" })
    }

    const withdrawal = await Withdrawal.findByPk(id)

    if (!withdrawal) {
      return res.status(404).send({ success: false, message: "Withdrawal not found" })
    }

    await withdrawal.update({ status: "rejected" })
    await User.increment('new_withdrawals', { by: withdrawal.amount, where: { id: withdrawal.user_id } })
    return res.send({ success: true, message: " successfully refund to the user " })
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to reject withdrawal" })
  }
}

const financialStatistic = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;

    // Validate date inputs
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'Start date and end date are required' });

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid date format' });

    // Set end date to end of day
    endDate.setUTCHours(23, 59, 59, 999);

    // Fetch stakings between dates
    const stakings = await Staking.findAll({
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      include: [{ model: User, as: 'user', attributes: ['email', 'name'] },
      { model: StakingPackage, as: 'package', attributes: ['name', 'stake_amount', 'daily_yield_percentage'] }],
      order: [['created_at', 'DESC']]
    });

    // Fetch withdrawals between dates
    const withdrawals = await Withdrawal.findAll({
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      include: [{ model: User, as: 'user', attributes: ['email', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    // Fetch transactions between dates
    const transactions = await Transaction.findAll({
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      include: [{ model: User, as: 'user', attributes: ['email', 'name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        transactions: transactions,
        withdrawals: withdrawals,
        stakings: stakings,
        summary: {
          total_transactions: transactions.length,
          total_withdrawals: withdrawals.length,
          total_stakings: stakings.length
        }
      }
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to get daily financial data"
    });
  }
};

const forceStaking = async (req, res) => {
  try {
    const { user_id, package_id } = req.body;

    // Get the user to transfer balances
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get the staking package details
    const stakingPackage = await StakingPackage.findByPk(package_id);
    if (!stakingPackage) {
      return res.status(404).json({
        success: false,
        message: "Staking package not found"
      });
    }

    // Check if user already has an active staking package
    const existingActiveStakingList = await Staking.findAll({
      where: {
        user_id: user_id,
        status: { [Op.in]: ['active', 'free_staking'] }
      },
      include: [{ model: StakingPackage, as: 'package' }]
    });

    for (let existingActiveStaking of existingActiveStakingList) {
      if (existingActiveStaking) {
        // Check if this is an upgrade (new package must be bigger)
        const currentPackage = existingActiveStaking.package;
        const newPackage = stakingPackage;

        if (parseFloat(newPackage.stake_amount) <= parseFloat(currentPackage.stake_amount)) {
          return res.status(400).json({
            success: false,
            message: "Upgrade not allowed. New package must be bigger than current package.",
            current_package: currentPackage.stake_amount,
            new_package: newPackage.stake_amount
          });
        }

      }
      
      // This is a valid upgrade - complete the current staking package
      await existingActiveStaking.update({ status: 'completed' });
    }

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

    // Create staking transaction record
    await Transaction.create({
      user_id,
      type: "free_staking",
      amount: stakingPackage.stake_amount,
      created_at: new Date()
    })

    await Staking.create({ user_id, package_id, status: "free_staking" })

    // Monitor user profit after staking
    const { monitorUserProfit } = require('../utils/common');
    await monitorUserProfit(user_id);

    return res.send({ success: true, message: "successfully staked!" })
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "failed to force stake to user"
    })
  }
}

const cancelStaking = async (req, res) => {
  try {
    const { staking_id } = req.body
    const staking = await Staking.findByPk(staking_id)
    if (staking) await staking.destroy()
    res.send({ success: true, message: "successfully canceled" })
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "failed to cancel a staking package"
    })
  }
}

module.exports = {
  getDashboardStats,
  updateUser,
  getTablePagenation,
  updateAdminSettings,
  ApproveWithdrawal,
  RejectWithdrawal,
  deleteAdminSettings,
  createAdminSettings,
  financialStatistic,
  forceStaking,
  cancelStaking
};