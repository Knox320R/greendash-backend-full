'use strict';

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'staking',
        'weak_leg_bonus',
        'withdrawal',
        'purchase',
        'daily_bonus',
        'admin_adjustment'
    ),
      allowNull: false,
    },
    direction: {
      type: DataTypes.ENUM('in', 'out'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    currency: {
      type: DataTypes.ENUM('USDT', 'EGD'),
      allowNull: false,
      defaultValue: 'USDT',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'transactions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
    ]
  });

  Transaction.associate = function(models) {
    Transaction.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    // Further dynamic associations to reference_table can be handled in app logic.
  };

  Transaction.addHook('afterFind', (result) => {
    if (!result) return;
    const convert = (tx) => {
      if (tx && tx.amount !== undefined && tx.amount !== null) {
        tx.amount = Number(tx.amount);
      }
    };
    if (Array.isArray(result)) {
      result.forEach(convert);
    } else {
      convert(result);
    }
  });

  return Transaction;
};
