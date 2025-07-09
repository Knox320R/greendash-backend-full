require("dotenv").config();
const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Staking, AdminSetting, StakingPackage, Transaction } = require('./db/models');

// Helper to convert a time string (e.g., '10:00') to a cron expression
// This allows the daily bonus scheduler to run at the exact time specified in admin_settings
function timeStringToCron(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    // Returns a cron string like '0 10 * * *' for 10:00
    return `${minute} ${hour} * * *`;
}

// Main function to calculate and distribute the daily bonus
// This function is called automatically by the scheduler at the configured time
async function calculateAndDistributeBonus() {
    // Use a transaction to ensure all updates are atomic and consistent
    const sequelize = User.sequelize;
    const t = await sequelize.transaction();
    try {
        // 1. Fetch relevant admin settings for the daily bonus logic
        // - daily_pool: tokens locked in staking today
        // - total_staking_pool: cumulative tokens locked in staking
        // - platform_fee: percentage of daily_pool to use as bonus (default 10%)
        const [dailyPoolSetting, totalStakingPoolSetting, platformFeeSetting] = await Promise.all([
            AdminSetting.findOne({ where: { title: 'daily_pool' }, transaction: t }),
            AdminSetting.findOne({ where: { title: 'total_staking_pool' }, transaction: t }),
            AdminSetting.findOne({ where: { title: 'platform_fee' }, transaction: t })
        ]);
        // Parse all values from strings to numbers for calculation
        let dailyPool = parseFloat(dailyPoolSetting.value || '0');
        let totalStakingPool = parseFloat(totalStakingPoolSetting.value || '0');
        let platformFeePercent = platformFeeSetting ? parseFloat(platformFeeSetting.value) : 10.0;
        // Validate platformFeePercent (should be between 0 and 100)
        if (isNaN(platformFeePercent) || platformFeePercent <= 0 || platformFeePercent > 100) platformFeePercent = 10.0;

        // If no new staking today, skip bonus distribution
        if (dailyPool <= 0) {
            console.log('No new staking today. Skipping daily bonus.');
            await t.commit();
            return;
        }

        // 2. Calculate the bonus pool and the amount to add to total_staking_pool
        // - bonusPool: the portion of daily_pool to distribute as bonus (platformFeePercent%)
        // - toTotalStaking: the remaining 90% (or 100% - platformFeePercent%)
        const bonusPool = dailyPool * (platformFeePercent / 100);
        const toTotalStaking = dailyPool - bonusPool;
        const newTotalStakingPool = totalStakingPool + toTotalStaking;

        // 3. Fetch all users with active staking and calculate their total staked EGD
        // Only users with at least one active staking are eligible for the bonus
        const stakers = await User.findAll({
            include: [{
                model: Staking,
                as: 'stakings',
                where: { status: 'active' },
                required: true,
                include: [{ model: StakingPackage, as: 'package' }]
            }],
            transaction: t
        });
        let totalStakedEGD = 0;
        // Build a list of each staker's total staked EGD
        const userStakingInfo = stakers.map(user => {
            let userTotalStaked = 0;
            user.stakings.forEach(staking => {
                const pkg = staking.package;
                if (pkg) {
                    userTotalStaked += pkg.stake_amount;
                }
            });
            totalStakedEGD += userTotalStaked;
            return { user, userTotalStaked };
        });

        // 4. Distribute the bonus pool proportionally to all active stakers
        // Each user's share is based on their proportion of the total staked EGD
        if (bonusPool > 0 && totalStakedEGD > 0) {
            for (const info of userStakingInfo) {
                if (info.userTotalStaked > 0) {
                    // Calculate the user's share of the bonus pool
                    const userShare = bonusPool * (info.userTotalStaked / totalStakedEGD);
                    // Increment the user's EGD balance
                    await info.user.increment('egd_balance', { by: userShare, transaction: t });
                    // Record the bonus as a transaction for transparency and audit
                    await Transaction.create({
                        user_id: info.user.id,
                        type: 'daily_bonus',
                        direction: 'in',
                        amount: userShare,
                        currency: 'EGD',
                        notes: 'Daily bonus pool distribution'
                    }, { transaction: t });
                }
            }
        }

        // 5. Update the pools in admin_settings
        // - total_staking_pool is increased by 90% of daily_pool
        // - daily_pool is reset to 0 for the next day
        await totalStakingPoolSetting.update({ value: newTotalStakingPool.toString() }, { transaction: t });
        await dailyPoolSetting.update({ value: '0' }, { transaction: t });

        await t.commit();
        console.log(`✅ Daily bonus distributed: ${bonusPool} EGD to stakers. 90% moved to total_staking_pool.`);
    } catch (err) {
        await t.rollback();
        // Log any errors for debugging and alerting
        console.error('❌ Error in daily bonus distribution:', err);
    }
}

// Scheduler initialization
// Reads the daily_bonus_time from admin_settings and schedules the daily bonus job accordingly
module.exports = async () => {
    // Fetch the scheduled time for the daily bonus from admin_settings
    const dailyBonusTimeSetting = await AdminSetting.findOne({ where: { title: 'daily_bonus_time' } });
    const timeStr = dailyBonusTimeSetting ? dailyBonusTimeSetting.value : '0:0';
    const cronTime = timeStringToCron(timeStr);

    // Schedule the daily bonus calculation at the specified time every day
    cron.schedule(cronTime, async () => {
        await calculateAndDistributeBonus();
    });
    console.log(`⏰ Daily bonus scheduler initialized (runs at ${timeStr} every day)`);
}