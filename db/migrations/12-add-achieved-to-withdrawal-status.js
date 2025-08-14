'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add "achieved" to the status ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE withdrawals 
      MODIFY COLUMN status ENUM('pending', 'approved', 'completed', 'rejected', 'achieved') 
      NOT NULL DEFAULT 'pending'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove "achieved" from the status ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE withdrawals 
      MODIFY COLUMN status ENUM('pending', 'approved', 'completed', 'rejected') 
      NOT NULL DEFAULT 'pending'
    `);
  }
}; 