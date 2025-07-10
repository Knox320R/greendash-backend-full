const { User, Staking, Transaction, Referral, AdminSetting, StakingPackage, RankPlan, CommissionPlan, TotalToken, Withdrawal } = require('../db/models');
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
    // Calculate total staked amount from packages
    const activeStakingsWithPackages = await Staking.findAll({
      where: { status: 'active' },
      include: [{ model: StakingPackage, as: 'package', attributes: ['stake_amount'] }]
    });
    const totalStakedAmount = activeStakingsWithPackages.reduce((sum, staking) => { return sum + parseFloat(staking.package?.stake_amount || 0); }, 0);
    // Calculate total rewards paid from transactions
    const totalRewardsPaid = await Transaction.sum('amount', { where: { type: 'staking' } });

    // Financial statistics - calculate from transactions
    const totalInvested = await Transaction.sum('amount', { where: { type: 'staking' } });
    const totalEarned = await Transaction.sum('amount', { where: { type: { [Op.in]: ['staking', 'purchase']} } });
    const totalWithdrawn = await Transaction.sum('amount', { where: { type: 'withdrawal' } });

    // Transaction statistics
    const totalTransactions = await Transaction.count();
    const withdrawalTransactions = await Transaction.count({ where: {type: "staking"} });
    const stakingTransactions = await Transaction.count({ where: {type: "withdrawal"} });

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
    }
    await row.update(data)
    return res.send({ success: true, message: "successfully updated" })
  } catch (e) {
    console.log(e);
    return res.status(500).send("failed to update setting data")
  }
}

const deleteAdminSettings = async (req, res) => {
  try {
    const { table_name, id } = req.params
    console.log(table_name, id);
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
    }
    await row.destroy()
    return res.send({ success: true, message: "successfully deleted" })
  } catch (e) {
    console.log(e);
    return res.status(500).send("failed to update setting data")
  }
}

const createAdminSettings = async (req, res) => {
  try {
    const { table_name, data } = req.body
    console.log(table_name, data);
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
    }
    return res.send({ success: true, message: "successfully created", newRow: model })
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
    const platform_fee_item = await AdminSetting.findOne({ where: { title: "platform_fee" } })
    const platform_fee = parseFloat(platform_fee_item.value)
    const amount = parseFloat(withdrawal.amount) * platform_fee / 100;
    await Transaction.create({ user_id: withdrawal.user_id, type: 'withdrawal', amount })
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
    await withdrawal.update({ status: "rejected" })

    const user = await User.findByPk(withdrawal.user_id)
    const refund = parseFloat(user.withdrawals) + parseFloat(withdrawal.amount)

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
  RejectWithdrawal,
  deleteAdminSettings,
  createAdminSettings
};