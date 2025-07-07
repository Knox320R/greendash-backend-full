'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Withdrawal extends Model {
    static associate(models) {
      Withdrawal.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  Withdrawal.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Withdrawal amount'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'Withdrawal',
    tableName: 'withdrawals',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
    ]
  });

  Withdrawal.addHook('afterFind', (result) => {
    if (!result) return;
    const convert = (w) => {
      if (w && w.amount !== undefined && w.amount !== null) {
        w.amount = Number(w.amount);
      }
    };
    if (Array.isArray(result)) {
      result.forEach(convert);
    } else {
      convert(result);
    }
  });

  return Withdrawal;
}; 