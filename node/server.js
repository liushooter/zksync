const ethers = require("ethers")
const zksync = require("zksync")

const _privKey = ""

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

    // L2 转账前，必须先解锁
    if (!isSigningKeySet) {
      if ((await zkWallet.getAccountId()) == undefined) {
        throw new Error("Unknown Account Id")
      }

      // As any other kind of transaction, `ChangePubKey` transaction requires fee.
      // User doesn't have (but can) to specify the fee amount. If omitted, library will query zkSync node for
      // the lowest possible amount.
      const changePubkey = await zkWallet.setSigningKey({
        ethAuthType: "ECDSA", // 显式指定验证类型
        feeToken: "ETH",
        // fee: ethers.utils.parseEther("0.001")
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
      ethers.utils.parseEther("0.001"))

    const transfer = await zkWallet.syncTransfer({
      to: newAddr,
      token: "ETH",
      amount,
      fee,
    })

    console.log("transfer: ", transfer)

    return transfer
  }

///
async function main() {
  const args = process.argv

  let num = 10
  if (args.length > 2) {

    let arg = args[2]
    num = parseInt(arg)

  }

  let wallets = []
  for (let i = 0; i < num; i++) {
    wallets.push(getWallet())
    console.log("----------")
  }

  const zkWalletObj = await getZkWallet(_privKey)

  for (const wallet of wallets) {
    const addr = wallet.address
    console.log(addr);
  }


}

main()
