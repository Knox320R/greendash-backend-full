require("dotenv").config();
const { ethers } = require("ethers");
const { TxHash, AdminSetting } = require("./db/models");
const ERC20_ABI = require('./contract/bep-20.json');

async function startListening(callback) {

    // const usdt_info = await AdminSetting.findOne({ where: { title: 'usdt_token_address' } })
    // console.log(usdt_info.value);
    const platform_info = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } })
    const platform_address = platform_info.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e'
    
    // const usdt_token_address = usdt_info.value || '0x55d398326f99059fF775485246999027B3197955'   // USDT bep-20
    const usdt_token_address = '0x55d398326f99059fF775485246999027B3197955'   // USDT bep-20

    // const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const provider = new ethers.JsonRpcProvider(process.env.BSC_MAINNET);
    // const provider = new ethers.JsonRpcProvider(process.env.EthereumMainnet);

    const contract = new ethers.Contract(usdt_token_address, ERC20_ABI, provider);

    const decimals = await contract.decimals();        
    const symbol = await contract.symbol();

    contract.on("Transfer", async (from, to, value, event) => {
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
    });

    console.log("🚀 Listening for USDT Transfer events on Sepolia...");
}

module.exports = { startListening };
