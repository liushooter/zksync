const ethers = require("ethers")
const zksync = require("zksync")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
require('dotenv').config()

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getTimestamp() {
  const now = +(new Date())
  return parseInt(now / 1000)
}

const csvWriter = createCsvWriter({
  path: `./ethaddrs_${getTimestamp().toString()}.csv`,
  header: [
    {id: 'privKey', title: 'PrivateKey'},
    {id: 'address', title: 'EthAddress'}
  ]
});

const _privKey = process.env.PRIV_KEY

function getWallet() {
  const wallet = new ethers.Wallet.createRandom()

  console.log("privateKey: ", wallet.privateKey)
  console.log("publicKey: ", wallet.publicKey)
  console.log("addr: ", wallet.address)

  return wallet
}

async function getZkWallet(privKey) {
  const ethersProvider = ethers.getDefaultProvider("ropsten")

  // Create ethereum wallet using ethers.js
  const ethWallet = new ethers.Wallet(privKey).connect(ethersProvider)

  const zkProvider = await zksync.getDefaultProvider("ropsten")
  // Derive zksync.Signer from ethereum wallet.
  const zkWallet = await zksync.Wallet.fromEthSigner(ethWallet, zkProvider)
  return zkWallet
}

async function getBalance(zkWallet) {
  // Committed state is not final yet
  let committedETHBalance = await zkWallet.getBalance("ETH")

  // Verified state is final
  const verifiedETHBalance = await zkWallet.getBalance("ETH", "verified")

  console.log("committedETHBalance: ", committedETHBalance)
  console.log("verifiedETHBalance: ", verifiedETHBalance)

  const accountId = await zkWallet.getAccountId()

  if (accountId == undefined) {
    // throw new Error("Unknown Account Id")
    console.log("Unknown Account Id")
  } else {
    console.log("accountId: ", accountId)

    let isSigningKeySet = await zkWallet.isSigningKeySet()
    console.log("isSigningKeySet: ", isSigningKeySet)

    /// AccountState
    const state = await zkWallet.getAccountState()
    const committedBalances = state.committed.balances

    committedETHBalance = committedBalances["ETH"]
    const ethBalance = ethers.utils.formatEther(committedETHBalance)
    console.log("ethBalance: ", ethBalance, "ETH")
  }
}

async function depositETHToZksync(zkWallet, newAddr){ // from eth to zksync , L1 to L2
  const deposit = await zkWallet.depositToSyncFromEthereum({
    depositTo: newAddr, // 可以给自己的地址转账，也可以是别人的
    token: "ETH",
    amount: ethers.utils.parseEther("1.0"),
  });

  const depositReceipt = await deposit.awaitReceipt();
  const depositVerifyReceipt = await deposit.awaitVerifyReceipt();

  console.log("depositReceipt: ", depositReceipt);
  console.log("depositVerifyReceipt: ", depositVerifyReceipt);
}

async function sendTx(zkWallet, newAddr, cost) { // L2 to L2
    const isSigningKeySet = await zkWallet.isSigningKeySet()

    console.log("isSigningKeySet: ", isSigningKeySet)

    // L2 转账前，必须先解锁
    if (!isSigningKeySet) {

      if ((await zkWallet.getAccountId()) == undefined) {
        throw new Error("Unknown Account Id")
      }

      console.log("签名 ing")

      // As any other kind of transaction, `ChangePubKey` transaction requires fee.
      // User doesn't have (but can) to specify the fee amount. If omitted, library will query zkSync node for
      // the lowest possible amount.
      const changePubkey = await zkWallet.setSigningKey({
        ethAuthType: "ECDSA", // 显式指定验证类型
        feeToken: "ETH",
        // fee: ethers.utils.parseEther("0.0002") 可以不设置 fee
      });

      // Wait until the tx is committed
      const receipt = await changePubkey.awaitReceipt();

      console.log("changePubkey: ", changePubkey)
      console.log()
      console.log("receipt: ", receipt)
    }

    const amount = zksync.utils.closestPackableTransactionAmount(
      ethers.utils.parseEther(cost))

    const fee = zksync.utils.closestPackableTransactionFee(
      ethers.utils.parseEther("0.0013")) // 调整手续费 0.000223

    console.log("转账 ing")

    const transfer = await zkWallet.syncTransfer({
      to: newAddr,
      token: "ETH",
      amount,
      // fee, 可以不设置 fee
    })

    return transfer
  }

////////////

async function main() {
  const args = process.argv

  let num = 10
  if (args.length > 2) {
    let arg = args[2]
    num = parseInt(arg)
  }

  const zkWalletObj = await getZkWallet(_privKey)

  let records = []

  for (let i = 0; i < num; i++) {
    const wallet = getWallet()

    records.push({privKey: wallet.privateKey , address: wallet.address})
    console.log("----------")
  }

  csvWriter.writeRecords(records)
  .then(() => {
    console.log('地址已保存');
  });

  let txNonce
  const cost = "0.01" // 转账金额

  for (const item of records) {

    // const cost = getRandomArbitrary(0.01, 0.02).toString().substring(0, 6)
    // console.log("cost: ", cost)

    const transfer = await sendTx(zkWalletObj, item.address, cost)
    const tx = transfer.txData.tx

    if (txNonce !== tx.nonce) {
      console.log("new nonce: ", tx.nonce)
      console.log("new txhash: ", transfer.txHash)
    } else {
      console.error("Error tx nonce is same: ", tx.nonce)
      console.error("Error tx nonce is same: ", transfer.txHash)
      break
    }

    console.log()

    await new Promise(resolve => setTimeout(resolve, 15 * 1000)) // 每隔 15 秒钟进行下 1 个交易
  }

}

main()
