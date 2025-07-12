'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CommissionPlan extends Model {}

  CommissionPlan.init({
    level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true
    },
    commission_percent: {
      type: DataTypes.FLOAT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'CommissionPlan',
    tableName: 'commission_plans',
    timestamps: true,
    underscored: true
  });

  return CommissionPlan;
};
