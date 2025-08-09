'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stakings', 'tx_hash', {
      type: Sequelize.STRING(66),
      allowNull: true,
      unique: true,
      after: 'status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('stakings', 'tx_hash');
  }
}; 