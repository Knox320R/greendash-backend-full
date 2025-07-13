'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TokenPool extends Model { }

  TokenPool.init({
    title: {
      type: DataTypes.ENUM('total_staking', 'daily_staking', 'platform_fee', 'purchase', 'other'),
      allowNull: false,
      defaultValue: 'total_staking'
    },
    description: {
      type: DataTypes.TEXT
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      defaultValue: 0,
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'TokenPool',
    tableName: 'token_pools',
    timestamps: true,
    underscored: true
  });

  return TokenPool;
};
