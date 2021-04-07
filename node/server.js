const ethers = require("ethers")
const zksync = require("zksync")

function getWallet() {
  const wallet = new ethers.Wallet.createRandom()

  const privateKey = wallet.privateKey
  const publicKey = wallet.publicKey
  const addr = wallet.address

  console.log("privateKey: ", privateKey)
  console.log("publicKey: ", publicKey)
  console.log("addr: ", addr)
}

async function getBalanceAndSendTx() {

  const _privKey = ""

  const toAddr = ""
  const ethersProvider = ethers.getDefaultProvider("ropsten")

  // console.log(ethersProvider)

  // Create ethereum wallet using ethers.js
  const ethWallet = new ethers.Wallet(_privKey).connect(ethersProvider)

  const zkProvider = await zksync.getDefaultProvider("ropsten")
  // Derive zksync.Signer from ethereum wallet.
  const zkWallet = await zksync.Wallet.fromEthSigner(ethWallet, zkProvider)

  /// Checking zkSync account balance

  // Committed state is not final yet
  let committedETHBalance = await zkWallet.getBalance("ETH")

  // Verified state is final
  const verifiedETHBalance = await zkWallet.getBalance("ETH", "verified")

  console.log("committedETHBalance: ", committedETHBalance)
  console.log("verifiedETHBalance: ", verifiedETHBalance)

  /// AccountState
  const state = await zkWallet.getAccountState()

  const committedBalances = state.committed.balances
  committedETHBalance = committedBalances["ETH"]

  const ethBalance = ethers.utils.formatEther(committedETHBalance)

  console.log("ethBalance: ", ethBalance, "ETH")

  let isSigningKeySet = await zkWallet.isSigningKeySet()
  let accountId = await zkWallet.getAccountId()

  console.log("isSigningKeySet: ", isSigningKeySet)
  console.log("accountId: ", accountId)

  // L1 to L2
  // depositETHToZksync(zkWallet, zkWallet.address())

  sendTx(zkWallet, toAddr) // L2 to L2
}

async function depositETHToZksync(zkWallet, newAddr){ // from eth to zksync
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

async function sendTx(zkWallet, newAddr) { // L2 to L2

  const isSigningKeySet = await zkWallet.isSigningKeySet()

  // L2 转账前，必须先解锁
  if (!isSigningKeySet) {
    if ((await zkWallet.getAccountId()) == undefined) {
      throw new Error("Unknown account");
    }

    // As any other kind of transaction, `ChangePubKey` transaction requires fee.
    // User doesn't have (but can) to specify the fee amount. If omitted, library will query zkSync node for
    // the lowest possible amount.
    const changePubkey = await zkWallet.setSigningKey({
      ethAuthType: "ECDSA", // 显式指定验证类型
      feeToken: "ETH",
      fee: ethers.utils.parseEther("0.001")
    });

    // Wait until the tx is committed
    const receipt = await changePubkey.awaitReceipt();

    console.log("changePubkey: ", changePubkey)
    console.log()
    console.log("receipt: ", receipt)
  }

  const amount = zksync.utils.closestPackableTransactionAmount(
    ethers.utils.parseEther("0.111"))

  const fee = zksync.utils.closestPackableTransactionFee(
    ethers.utils.parseEther("0.001"))

  const transfer = await zkWallet.syncTransfer({
    to: newAddr,
    token: "ETH",
    amount,
    fee,
  })


  console.log("transfer: ", transfer);
}

function main() {
  const args = process.argv

  let num = 10
  if (args.length > 2) {

    let arg = args[2]
    num = parseInt(arg)

  }

  for (var i = 0; i < num; i++) {
    getWallet()
    console.log("----------")
  }

}

main()

// getBalanceAndSendTx()
