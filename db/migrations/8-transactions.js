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
          'referral',
          'withdrawal',
          'purchase',
          'airdrop',
          'admin_adjustment'
        ),
        allowNull: false,
        comment: 'Source of the transaction'
      },
      direction: {
        type: Sequelize.ENUM('in', 'out'),
        allowNull: false,
        comment: 'Flow of funds: in (credit), out (debit)',
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        comment: 'Amount of the transaction',
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'EGD',
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'completed',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional transaction notes',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ),
      },
    });

    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  },
};
