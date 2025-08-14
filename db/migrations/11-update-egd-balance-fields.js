'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, add the new old_egd_balance field
    await queryInterface.addColumn('users', 'old_egd_balance', {
      type: Sequelize.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    });

    // Add the new old_withdrawals field
    await queryInterface.addColumn('users', 'old_withdrawals', {
      type: Sequelize.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    });

    // Rename egd_balance to new_egd_balance
    await queryInterface.renameColumn('users', 'egd_balance', 'new_egd_balance');

    // Rename withdrawals to new_withdrawals
    await queryInterface.renameColumn('users', 'withdrawals', 'new_withdrawals');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: rename new_egd_balance back to egd_balance
    await queryInterface.renameColumn('users', 'new_egd_balance', 'egd_balance');

    // Revert: rename new_withdrawals back to withdrawals
    await queryInterface.renameColumn('users', 'new_withdrawals', 'withdrawals');

    // Remove the old_egd_balance column
    await queryInterface.removeColumn('users', 'old_egd_balance');

    // Remove the old_withdrawals column
    await queryInterface.removeColumn('users', 'old_withdrawals');
  }
}; 