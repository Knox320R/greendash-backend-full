'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StakingPackage extends Model {
    static associate(models) {
      StakingPackage.hasMany(models.Staking, { foreignKey: 'package_id', as: 'stakings' });
    }
  }

  StakingPackage.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    stake_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    daily_yield_percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    lock_period_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 365
    }
  }, {
    sequelize,
    modelName: 'StakingPackage',
    tableName: 'staking_packages',
    timestamps: true,
    underscored: true
  });

  return StakingPackage;
};
