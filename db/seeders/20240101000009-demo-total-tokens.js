'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('total_tokens', [
      { title: 'seed_sale', description: 'Seed sale allocation', percent: 10.0, created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'private_sale', description: 'Private sale allocation', percent: 25.0, created_at: new Date(Date.now() - 2000000), updated_at: new Date(Date.now() - 2000000) },
      { title: 'public_sale', description: 'Public sale allocation', percent: 20.0, created_at: new Date(Date.now() - 3000000), updated_at: new Date(Date.now() - 3000000) },
      { title: 'airdrop', description: 'Airdrop allocation', percent: 2.0, created_at: new Date(Date.now() - 4000000), updated_at: new Date(Date.now() - 4000000) },
      { title: 'liquidity', description: 'Liquidity pool', percent: 2.0, created_at: new Date(Date.now() - 5000000), updated_at: new Date(Date.now() - 5000000) },
      { title: 'development', description: 'Development fund', percent: 6.0, created_at: new Date(Date.now() - 6000000), updated_at: new Date(Date.now() - 6000000) },
      { title: 'marketing & expansion', description: 'Marketing and expansion', percent: 7.5, created_at: new Date(Date.now() - 7000000), updated_at: new Date(Date.now() - 7000000) },
      { title: 'team & audits', description: 'Team and audits', percent: 7.5, created_at: new Date(Date.now() - 8000000), updated_at: new Date(Date.now() - 8000000) },
      { title: 'staking & reserves', description: 'Staking and reserves', percent: 20.0, created_at: new Date(Date.now() - 9000000), updated_at: new Date(Date.now() - 9000000) },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('total_tokens', null, {});
  }
}; 