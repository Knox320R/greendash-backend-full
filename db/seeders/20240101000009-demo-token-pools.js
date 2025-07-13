'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('token_pools', [
      { title: 'total_staking', description: 'Total staked amount', amount: 0},
      { title: 'daily_staking', description: 'Daily staked amount', amount: 500000},
      { title: 'platform_fee', description: 'Total purchase amount', amount: 100000},
      { title: 'purchase', description: 'Total purchase amount', amount: 0},
      { title: 'other', description: 'other tokens amount', amount: 0},
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('token_pools', null, {});
  }
}; 