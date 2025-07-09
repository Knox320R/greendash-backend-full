require("dotenv").config();
const { ethers } = require("ethers");
const { TxHash, AdminSetting } = require("./db/models")

const ERC20_ABI = [
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

async function startListening(callback) {

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(process.env.USDT_ADDRESS, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
  
    contract.on("Transfer", async (from, to, value, event) => {
        console.log(`📡 Transfer from ${from} to ${to} of ${value.toString()}`);
        const amount = ethers.formatUnits(value, decimals);
        const tx_hash = event?.log?.transactionHash || "00000000";
        const platform = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } })
        const platform_address = platform?.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e'
        if(to === platform_address) await TxHash.create({ tx_hash, amount, created_at: new Date() })
        callback({
            from,
            to,
            symbol,
            amount,
            txHash: event.log.transactionHash
        });
    });

    console.log("🚀 Listening for USDT Transfer events on Sepolia...");
}

module.exports = { startListening };
