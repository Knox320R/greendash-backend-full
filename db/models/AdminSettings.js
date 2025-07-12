'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminSetting extends Model { }

  AdminSetting.init({
    title: {
      type: DataTypes.ENUM(
        'platform_wallet_address',
        'usdt_token_address',
        'platform_fee',
        'min_withdrawal',
        'max_withdrawal',
        'unilevel_commission_enable',
        'rank_reward_enable',
        'daily_bonus_time',
        'platform_name'
      ),
      allowNull: false,
      defaultValue: 'platform_wallet_address',
      unique: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'AdminSetting',
    tableName: 'admin_settings',
    timestamps: true,
    underscored: true
  });

  return AdminSetting;
};
