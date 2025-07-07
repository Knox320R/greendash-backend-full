'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staking_packages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT
      },
      stake_amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        comment: 'Fixed EGD token stake amount per package'
      },
      daily_yield_percentage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: 'Daily yield rate in % e.g. 0.1 for 0.1%'
      },
      lock_period_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365,
        comment: 'Lock-in period in days'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staking_packages');
  }
};
