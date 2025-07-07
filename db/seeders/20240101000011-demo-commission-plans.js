'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('commission_plans', [
      { level: 1, commission_percent: 15, created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { level: 2, commission_percent: 7.5, created_at: new Date(Date.now() - 2000000), updated_at: new Date(Date.now() - 2000000) },
      { level: 3, commission_percent: 4, created_at: new Date(Date.now() - 3000000), updated_at: new Date(Date.now() - 3000000) },
      { level: 4, commission_percent: 3, created_at: new Date(Date.now() - 4000000), updated_at: new Date(Date.now() - 4000000) },
      { level: 5, commission_percent: 2.5, created_at: new Date(Date.now() - 5000000), updated_at: new Date(Date.now() - 5000000) },
      { level: 6, commission_percent: 2, created_at: new Date(Date.now() - 6000000), updated_at: new Date(Date.now() - 6000000) },
      { level: 7, commission_percent: 1, created_at: new Date(Date.now() - 7000000), updated_at: new Date(Date.now() - 7000000) },
      { level: 8, commission_percent: 0.75, created_at: new Date(Date.now() - 8000000), updated_at: new Date(Date.now() - 8000000) },
      { level: 9, commission_percent: 0.5, created_at: new Date(Date.now() - 9000000), updated_at: new Date(Date.now() - 9000000) }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('commission_plans', null, {});
  }
}; 