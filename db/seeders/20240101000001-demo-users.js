'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      // Root Admin User (ID: 1) - System Admin
      {
        id: 1,
        email: 'admin@greendash.io',
        password: await bcrypt.hash('aaa', 10),
        name: 'System Administrator',
        referred_by: 1, // Self-referral for admin
        parent_leg: 'left',
        left_volume: 1500,
        right_volume: 2000,
        referral_code: 'ADMIN001',
        egd_balance: 10000.00,
        withdrawals: 100,
        phone: '+1234567890',
        is_active: true,
        is_admin: true,
        is_email_verified: true,
        last_login: new Date(),
        wallet_address: '0x230d69A23822B4B40C0F06f5d9c8FC2Bd0024Eee',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      
      // Top Level Sponsor (ID: 2) - Referred by Admin
      {
        id: 2,
        email: 'sponsor@greendash.io',
        password: await bcrypt.hash('aaa', 10),
        name: 'John Sponsor',
        referred_by: 1, // Referred by admin
        parent_leg: 'left',
        left_volume: 500.00, // Alice's volume
        right_volume: 300.00, // Daniel's volume
        referral_code: 'SPONSOR002',
        egd_balance: 5000.00,
        withdrawals: 50,
        phone: '+1234567891',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 86400000),
        wallet_address: '0x6e48237e80565004F729D18b7B95b5f12514D429',
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02')
      },
      
      // Alice (ID: 3) - Referred by Sponsor, placed under Sponsor's left leg
      {
        id: 3,
        email: 'alice.smith@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Alice Smith',
        referred_by: 2, // Referred by sponsor
        parent_leg: 'left',
        left_volume: 100.00, // Bob's volume
        right_volume: 200.00, // Grace's volume
        referral_code: 'ALICE003',
        egd_balance: 1200.50,
        withdrawals: 100,
        phone: '+1234567892',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 172800000),
        wallet_address: '0xdAB2d05b29843098cbD18f1B2caDaad9Ed389fDa',
        created_at: new Date('2024-01-03'),
        updated_at: new Date('2024-01-03')
      },
      
      // Bob (ID: 4) - Referred by Alice, placed under Alice's left leg
      {
        id: 4,
        email: 'bob.jones@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Bob Jones',
        referred_by: 3, // Referred by Alice
        parent_leg: 'left',
        left_volume: 800.00, // Carol's volume
        right_volume: 100.00, // Kate's volume
        referral_code: 'BOB004',
        egd_balance: 800.25,
        withdrawals: 50,
        phone: '+1234567893',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 259200000),
        wallet_address: '0xdAB2d05b29843098cbD18f1B2caDaad9Ed389fDa',
        created_at: new Date('2024-01-04'),
        updated_at: new Date('2024-01-04')
      },
      
      // Carol (ID: 5) - Referred by Bob, placed under Bob's left leg
      {
        id: 5,
        email: 'carol.lee@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Carol Lee',
        referred_by: 4, // Referred by Bob
        parent_leg: 'left',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'CAROL005',
        egd_balance: 500.00,
        withdrawals: 25,
        phone: '+1234567894',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 345600000),
        wallet_address: '0xC73c5209C2cc44f6C165Be0EE79aF51991A8018B',
        created_at: new Date('2024-01-05'),
        updated_at: new Date('2024-01-05')
      },
      
      // Daniel (ID: 6) - Referred by Sponsor, placed under Sponsor's right leg
      {
        id: 6,
        email: 'daniel.kim@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Daniel Kim',
        referred_by: 2, // Referred by sponsor
        parent_leg: 'right',
        left_volume: 400.00, // Henry's volume
        right_volume: 800.00, // Eva's volume
        referral_code: 'DANIEL006',
        egd_balance: 2500.75,
        withdrawals: 200,
        phone: '+1234567895',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 432000000),
        wallet_address: '0x00beE0e5D09CA2E16b6692680E40044C8181f8A3',
        created_at: new Date('2024-01-06'),
        updated_at: new Date('2024-01-06')
      },
      
      // Eva (ID: 7) - Referred by Daniel, placed under Daniel's right leg
      {
        id: 7,
        email: 'eva.martin@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Eva Martin',
        referred_by: 6, // Referred by Daniel
        parent_leg: 'right',
        left_volume: 650.00, // Leo's volume
        right_volume: 950.00, // Frank's volume
        referral_code: 'EVA007',
        egd_balance: 1500.00,
        withdrawals: 120,
        phone: '+1234567896',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 518400000),
        wallet_address: '0x00beE0e5D09CA2E16b6692680E40044C8181f8A3',
        created_at: new Date('2024-01-07'),
        updated_at: new Date('2024-01-07')
      },
      
      // Frank (ID: 8) - Referred by Eva, placed under Eva's right leg
      {
        id: 8,
        email: 'frank.nguyen@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Frank Nguyen',
        referred_by: 7, // Referred by Eva
        parent_leg: 'right',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'FRANK008',
        egd_balance: 800.00,
        withdrawals: 60,
        phone: '+1234567897',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 604800000),
        wallet_address: '0x230d69A23822B4B40C0F06f5d9c8FC2Bd0024Eee',
        created_at: new Date('2024-01-08'),
        updated_at: new Date('2024-01-08')
      },
      
      // Grace (ID: 9) - Referred by Alice, placed under Alice's right leg
      {
        id: 9,
        email: 'grace.cho@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Grace Cho',
        referred_by: 3, // Referred by Alice
        parent_leg: 'right',
        left_volume: 100.00, // Irene's volume
        right_volume: 0,
        referral_code: 'GRACE009',
        egd_balance: 2100.00,
        withdrawals: 180,
        phone: '+1234567898',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 691200000),
        wallet_address: '0x6e48237e80565004F729D18b7B95b5f12514D429',
        created_at: new Date('2024-01-09'),
        updated_at: new Date('2024-01-09')
      },
      
      // Henry (ID: 10) - Referred by Daniel, placed under Daniel's left leg
      {
        id: 10,
        email: 'henry.tan@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Henry Tan',
        referred_by: 6, // Referred by Daniel
        parent_leg: 'left',
        left_volume: 0,
        right_volume: 50.00, // Jack's volume
        referral_code: 'HENRY010',
        egd_balance: 950.00,
        withdrawals: 90,
        phone: '+1234567899',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 777600000),
        wallet_address: '0xdAB2d05b29843098cbD18f1B2caDaad9Ed389fDa',
        created_at: new Date('2024-01-10'),
        updated_at: new Date('2024-01-10')
      },
      
      // Irene (ID: 11) - Referred by Grace, placed under Grace's left leg
      {
        id: 11,
        email: 'irene.zhao@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Irene Zhao',
        referred_by: 9, // Referred by Grace
        parent_leg: 'left',
        left_volume: 0,
        right_volume: 40.00, // Maya's volume
        referral_code: 'IRENE011',
        egd_balance: 1750.00,
        withdrawals: 160,
        phone: '+1234567900',
        is_active: false,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 864000000),
        wallet_address: '0xC73c5209C2cc44f6C165Be0EE79aF51991A8018B',
        created_at: new Date('2024-01-11'),
        updated_at: new Date('2024-01-11')
      },
      
      // Jack (ID: 12) - Referred by Henry, placed under Henry's right leg
      {
        id: 12,
        email: 'jack.park@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Jack Park',
        referred_by: 10, // Referred by Henry
        parent_leg: 'right',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'JACK012',
        egd_balance: 3000.00,
        withdrawals: 250,
        phone: '+1234567901',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 950400000),
        wallet_address: '0x00beE0e5D09CA2E16b6692680E40044C8181f8A3',
        created_at: new Date('2024-01-12'),
        updated_at: new Date('2024-01-12')
      },
      
      // Kate (ID: 13) - Referred by Bob, placed under Bob's right leg
      {
        id: 13,
        email: 'kate.wilson@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Kate Wilson',
        referred_by: 4, // Referred by Bob
        parent_leg: 'right',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'KATE013',
        egd_balance: 2200.00,
        withdrawals: 150,
        phone: '+1234567902',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 1036800000),
        wallet_address: '0x230d69A23822B4B40C0F06f5d9c8FC2Bd0024Eee',
        created_at: new Date('2024-01-13'),
        updated_at: new Date('2024-01-13')
      },
      
      // Leo (ID: 14) - Referred by Eva, placed under Eva's left leg
      {
        id: 14,
        email: 'leo.garcia@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Leo Garcia',
        referred_by: 7, // Referred by Eva
        parent_leg: 'left',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'LEO014',
        egd_balance: 1800.00,
        withdrawals: 120,
        phone: '+1234567903',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 1123200000),
        wallet_address: '0x6e48237e80565004F729D18b7B95b5f12514D429',
        created_at: new Date('2024-01-14'),
        updated_at: new Date('2024-01-14')
      },
      
      // Maya (ID: 15) - Referred by Irene, placed under Irene's right leg
      {
        id: 15,
        email: 'maya.patel@example.com',
        password: await bcrypt.hash('aaa', 10),
        name: 'Maya Patel',
        referred_by: 11, // Referred by Irene
        parent_leg: 'right',
        left_volume: 0,
        right_volume: 0,
        referral_code: 'MAYA015',
        egd_balance: 1200.00,
        withdrawals: 80,
        phone: '+1234567904',
        is_active: true,
        is_admin: false,
        is_email_verified: true,
        last_login: new Date(Date.now() - 1209600000),
        wallet_address: '0xdAB2d05b29843098cbD18f1B2caDaad9Ed389fDa',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15')
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
}; 