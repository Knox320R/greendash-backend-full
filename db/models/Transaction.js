'use strict';

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'staking',              //  EGD
        'withdrawal',           //  USDT
        'purchase',             //  EGD
        'daily_reward',         //  EGD
        'universal_cashback',   //  EGD
        'unilevel_commission',  //  USDT
        'weak_leg_bonus',       //  USDT
        'admin_adjustment'
      ),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'transactions',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
    ]
  });

  Transaction.associate = function (models) {
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
