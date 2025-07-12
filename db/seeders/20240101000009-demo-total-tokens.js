'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('total_tokens', [
      { title: 'seed_sale', description: 'Seed sale allocation', amount: 100000000, price: 0.01},
      { title: 'private_sale', description: 'Private sale allocation', amount: 250000000, price: 0.02},
      { title: 'public_sale', description: 'Public sale allocation', amount: 200000000, price: 0.04},
      { title: 'airdrop', description: 'Airdrop allocation', amount: 20000000},
      { title: 'liquidity', description: 'Liquidity pool', amount: 20000000},
      { title: 'development', description: 'Development fund', amount: 60000000},
      { title: 'marketing & expansion', description: 'Marketing and expansion', amount: 75000000},
      { title: 'team & audits', description: 'Team and audits', amount: 75000000},
      { title: 'staking & reserves', description: 'Staking and reserves', amount: 200000000},
      { title: 'other', description: 'other tokens amount', amount: 0},
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('total_tokens', null, {});
  }
}; 