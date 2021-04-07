```
curl 'https://ropsten-api.zksync.io/jsrpc' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'content-type: application/json;charset=UTF-8' \
  --data-raw '{"id":1,"jsonrpc":"2.0","method":"account_info","params":["0x67870E570B5855071589380283d35b008bee416e"]}'


{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x67870e570b5855071589380283d35b008bee416e",
    "id": 489,
    "depositing": {
      "balances": {}
    },
    "committed": {
      "balances": {
        "ETH": "500000000000000000"
      },
      "nonce": 0,
      "pubKeyHash": "sync:0000000000000000000000000000000000000000"
    },
    "verified": {
      "balances": {},
      "nonce": 0,
      "pubKeyHash": "sync:0000000000000000000000000000000000000000"
    }
  },
  "id": 1
}
```

---

https://faucet.ropsten.be/

https://ropsten.zksync.io/deposit/

https://ropsten.zkscan.io/

https://uptime.com/s/zksync

https://zksync.io/api/
