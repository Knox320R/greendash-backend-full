require("dotenv").config();
const { ethers } = require("ethers");
const { TxHash, AdminSetting } = require("./db/models");
const ERC20_ABI = require('./contract/bep-20.json');

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            // Check if it's a rate limit error
            if (error.code === 'BAD_DATA' && error.value && 
                error.value.some(err => err.code === -32005)) {
                console.log(`⚠️ Rate limit hit, waiting ${baseDelay * Math.pow(2, i)}ms before retry...`);
                await delay(baseDelay * Math.pow(2, i));
                continue;
            }
            
            // For other errors, wait a bit and retry
            console.log(`⚠️ Request failed, retrying in ${baseDelay * Math.pow(2, i)}ms...`);
            await delay(baseDelay * Math.pow(2, i));
        }
    }
}

async function startListening(callback) {
    try {
        const platform_info = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } })
        const platform_address = platform_info.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e'
        
        const usdt_token_address = '0x55d398326f99059fF775485246999027B3197955'   // USDT bep-20

        const provider = new ethers.JsonRpcProvider(process.env.BSC_MAINNET);

        const contract = new ethers.Contract(usdt_token_address, ERC20_ABI, provider);

        // Add delay between contract calls to avoid rate limiting
        console.log("🔍 Fetching contract details...");
        
        let decimals, symbol;
        try {
            decimals = await retryWithBackoff(() => contract.decimals());
            console.log(`✅ Contract decimals: ${decimals}`);
            
            // Add delay between calls
            await delay(500);
            
            symbol = await retryWithBackoff(() => contract.symbol());
            console.log(`✅ Contract symbol: ${symbol}`);
        } catch (error) {
            console.error("❌ Failed to fetch contract details:", error.message);
            // Use defaults if contract calls fail
            decimals = 18;
            symbol = "USDT";
            console.log(`⚠️ Using defaults: decimals=${decimals}, symbol=${symbol}`);
        }

        // Set up event listener with error handling
        contract.on("Transfer", async (from, to, value, event) => {
            try {
                if(to === platform_address) {
                    const amount = ethers.formatUnits(value, decimals);
                    console.log(`📡 Transfer from ${from} to ${to} of ${amount}`);
                    const tx_hash = event?.log?.transactionHash || "0x00000000";
                    await TxHash.create({ tx_hash, amount, created_at: new Date() })
                    callback({
                        from,
                        to,
                        symbol,
                        amount,
                        txHash: event.log.transactionHash
                    });
                }
            } catch (error) {
                console.error("❌ Error processing transfer event:", error.message);
            }
        });

        console.log("🚀 Listening for USDT Transfer events on BSC Mainnet...");
        console.log(`📍 Platform address: ${platform_address}`);
        console.log(`📍 Token address: ${usdt_token_address}`);
        
    } catch (error) {
        console.error("❌ Error starting chain listener:", error.message);
        // Don't crash the app, just log the error
        throw error;
    }
}

module.exports = { startListening };
