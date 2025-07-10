'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: "CASCADE",
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'staking',
          'withdrawal',
          'purchase',
          'daily_reward',
          'unilevel_commission',
          'universal_cashback',
          'weak_leg_bonus',
          'admin_adjustment'
        ),
        allowNull: false,
        comment: 'Source of the transaction'
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        comment: 'Amount of the transaction',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  },
};
