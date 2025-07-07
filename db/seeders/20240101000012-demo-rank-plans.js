'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('rank_plans', [
      { rank: 'Bronze', volume: 10000, bonus_amount: 500, equivalent: null, created_at: new Date(Date.now() - 100000000), updated_at: new Date(Date.now() - 1000000) },
      { rank: 'Silver', volume: 50000, bonus_amount: 2500, equivalent: null, created_at: new Date(Date.now() - 200000000), updated_at: new Date(Date.now() - 2000000) },
      { rank: 'Gold', volume: 100000, bonus_amount: 5000, equivalent: null, created_at: new Date(Date.now() - 300000000), updated_at: new Date(Date.now() - 3000000) },
      { rank: 'Platinum', volume: 250000, bonus_amount: 12500, equivalent: null, created_at: new Date(Date.now() - 400000000), updated_at: new Date(Date.now() - 4000000) },
      { rank: 'Diamond', volume: 500000, bonus_amount: 25000, equivalent: 'Compact electric car', created_at: new Date(Date.now() - 500000000), updated_at: new Date(Date.now() - 5000000) },
      { rank: 'Ruby', volume: 750000, bonus_amount: 37500, equivalent: 'Urban electric car', created_at: new Date(Date.now() - 600000000), updated_at: new Date(Date.now() - 6000000) },
      { rank: 'Emerald', volume: 1000000, bonus_amount: 50000, equivalent: 'Modern electric SUV', created_at: new Date(Date.now() - 700000000), updated_at: new Date(Date.now() - 7000000) },
      { rank: 'Sapphire', volume: 1500000, bonus_amount: 75000, equivalent: 'Sporty electric sedan', created_at: new Date(Date.now() - 800000000), updated_at: new Date(Date.now() - 8000000) },
      { rank: 'Titanium', volume: 2000000, bonus_amount: 100000, equivalent: 'Premium 7-seater electric SUV', created_at: new Date(Date.now() - 900000000), updated_at: new Date(Date.now() - 9000000) },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('rank_plans', null, {});
  }
};