const express = require('express');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const { infuraProjectId, privateKey, privateKeyGanache, etherApiKey, bscApiKey } = JSON.parse(fs.readFileSync('.secret').toString().trim());
const binanceProvider = new HDWalletProvider({
  privateKeys: privateKey,
  providerOrUrl: `https://data-seed-prebsc-1-s1.binance.org:8545`
});

const app = express();
const BouncerProxy = require('./BouncerProxyABI.js');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var cors = require('cors');
app.use(cors());
let contracts;
var Web3 = require('web3');
var web3 = new Web3(binanceProvider);

// console.log('web3', web3);

let accounts;
web3.eth.getAccounts().then((_accounts) => {
  accounts = _accounts;
  console.log("ACCOUNTS", accounts);
});
const contractAddress = '0xc5f34ecd89012c12c3ed780cdf81f8e130ac123f';
const bouncerContract = new web3.eth.Contract(BouncerProxy, contractAddress);
console.log('bouncerContract', bouncerContract);

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/");
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({ hello: "world" }));

});

let txHashkey = "tx";

app.post('/tx', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/tx", req.body);
  let account = web3.eth.accounts.recover(req.body.message, req.body.sig);
  console.log("RECOVERED:", account);

  if (account.toLowerCase() == req.body.parts[1].toLowerCase()) {
    console.log("Correct sig... relay transaction to contract... might want more filtering here, but just blindly do it for now");
    const nonce = await web3.eth.getTransactionCount(accounts[0]);
    console.log('nonce', nonce);
    //console.log(contracts.BouncerProxy)
    const contract = bouncerContract;
    console.log("Forwarding tx to ", contract._address, " with local account ", accounts[0]);

    let txparams = {
      from: accounts[0],
      gas: req.body.gas,
      gasPrice: req.body.gasPrice,
      nonce: nonce,
    };
    console.log('txparams', txparams);
    //first get the hash to see if there is already a tx in motion
    console.log('req.body', req.body);
    try {
      // address sender, address signer, address destination, uint value, bytes data, address rewardToken, uint rewardAmount
      let hash = await contract.methods.getHash(req.body.parts[1], req.body.parts[2], req.body.parts[3], req.body.parts[4], req.body.parts[5], req.body.parts[6]).call();
      console.log("HASH:", hash);
      console.log("Checking centralized db for collision before mining....");
      let thisTxsKey = txHashkey + hash.toLowerCase();
      console.log("Getting Transaction with hash ", thisTxsKey);

      console.log("NO EXISTING TX, DOING TX");
      //const result = await clevis("contract","forward","BouncerProxy",accountIndexSender,sig,accounts[accountIndexSigner],localContractAddress("Example"),"0",data,rewardAddress,reqardAmount)
      console.log("TX", req.body.sig, req.body.parts[1], req.body.parts[2], req.body.parts[3], req.body.parts[4], req.body.parts[5], req.body.parts[6]);
      console.log("PARAMS", txparams);
      // contract.methods.forward(req.body.sig, req.body.parts[1], req.body.parts[2], req.body.parts[3], req.body.parts[4], req.body.parts[5], req.body.parts[6]).send(
      contract.methods.forward(
        req.body.sig,
        req.body.parts[1],
        req.body.parts[2],
        req.body.parts[3],
        req.body.parts[4],
        req.body.parts[5],
        req.body.parts[6]
      ).send(
        txparams, (error, transactionHash) => {
          console.log("TX CALLBACK", error, transactionHash);
        }
      )
        .on('error', (err, receiptMaybe) => {
          console.log("TX ERROR", err, receiptMaybe);
        })
        .on('transactionHash', (transactionHash) => {
          console.log("TX HASH", transactionHash);
        })
        .on('receipt', (receipt) => {
          console.log("TX RECEIPT", receipt);
        })
        .then((receipt) => {
          console.log("TX THEN", receipt);
        });

      res.set('Content-Type', 'application/json');
      res.end(JSON.stringify({ hello: "world" }));
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  } else {
    console.log('else');
  }

});

app.listen(10001);
console.log(`http listening on 10001`);
