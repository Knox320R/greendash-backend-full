const { User, Staking, Transaction, Referral, AdminSetting, StakingPackage, RankPlan, CommissionPlan, TotalToken, Withdrawal } = require('../db/models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
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
    // Calculate total staked amount from packages
    const activeStakingsWithPackages = await Staking.findAll({
      where: { status: 'active' },
      include: [{ model: StakingPackage, as: 'package', attributes: ['stake_amount'] }]
    });
    const totalStakedAmount = activeStakingsWithPackages.reduce((sum, staking) => { return sum + parseFloat(staking.package?.stake_amount || 0); }, 0);
    // Calculate total rewards paid from transactions
    const totalRewardsPaid = await Transaction.sum('amount', { where: { type: 'staking', direction: 'out', currency: "EGD", status: 'completed' } });

    // Financial statistics - calculate from transactions
    const totalInvested = await Transaction.sum('amount', { where: { type: 'staking', direction: 'in', currency: "USDT", status: 'completed' } });
    const totalEarned = await Transaction.sum('amount', { where: { currency: 'USDT', direction: 'in', status: 'completed' } });
    const totalWithdrawn = await Transaction.sum('amount', { where: { type: 'withdrawal', direction: 'out', currency: "USDT", status: 'completed' } });

    // Transaction statistics
    const totalTransactions = await Transaction.count();
    const pendingTransactions = await Transaction.count({ where: { status: 'pending' } });
    const completedTransactions = await Transaction.count({ where: { status: 'completed' } });

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
          total_rewards_paid: parseFloat(totalRewardsPaid || 0)
        },
        financial: {
          total_invested: parseFloat(totalInvested || 0),
          total_earned: parseFloat(totalEarned || 0),
          total_withdrawn: parseFloat(totalWithdrawn || 0)
        },
        transactions: {
          total: totalTransactions,
          pending: pendingTransactions,
          completed: completedTransactions
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
    const { field_name, data } = req.body
    const { id } = data
    let model = undefined
    switch (field_name) {
      case "admin_settings": {
        model = await AdminSetting.findByPk(id)
        break
      }
      case "staking_packages": {
        model = await StakingPackage.findByPk(id)
        break
      }
      case "rank_plans": {
        model = await RankPlan.findByPk(id)
        break
      }
      case "commission_plans": {
        model = await CommissionPlan.findByPk(id)
        break
      }
      case "total_tokens": {
        model = await TotalToken.findByPk(id)
        break
      }
    }
    await model.update(data)
    return res.send({ success: true, message: "successfully updated" })
  } catch (e) {
    console.log(e);
    return res.status(500).send("failed to update setting data")
  }
}

const getTablePagenation = async (req, res) => {
  try {

    const { limit, offset, table_name } = req.body

    console.log(req.body);
    let list = [];
    let isMore = false;

    switch (table_name) {
      case "users": {
        list = await User.findAll({ order: [['created_at', 'DESC']], limit, offset, attributes: ['id', 'email', 'name', 'created_at', 'is_email_verified', 'is_active'] });
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
            { model: User, as: 'user', attributes: ['email', 'name'] }
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
          offset,
          attributes: ['id', 'type', 'direction', 'amount', 'status', 'created_at']
        });
        break
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
    const { is_active, is_admin, is_email_verified, egd_balance, usdt_balance } = req.body;

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
    if (egd_balance !== undefined) updated_ata.egd_balance = egd_balance;
    if (usdt_balance !== undefined) updated_ata.usdt_balance = usdt_balance;

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
    const withdrawal = await Withdrawal.findByPk(id)
    await withdrawal.update({ status: "approved" })
    res.send({ success: true, message: "success to approve user withdrawal" })
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to approve withdrawal" })
  }
}

const RejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.body
    const withdrawal = await Withdrawal.findByPk(id)
    const newWithd = await withdrawal.update({ status: "rejected" })

    const user = await User.findByPk(withdrawal.user_id)
    const refund = parseFloat(user.withdrawals) + parseFloat(withdrawal.amount)
    console.log(refund);
    await user.update({ withdrawals: refund })

    return res.send({ success: true, message:" successfully refund to the user " })
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "failed to reject withdrawal" })
  }
}

module.exports = {
  getDashboardStats,
  updateUser,
  getTablePagenation,
  updateAdminSettings,
  RejectWithdrawal,
  ApproveWithdrawal,
  ApproveWithdrawal,
  RejectWithdrawal
}; 