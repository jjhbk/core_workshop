# Requirements

You should have:

- python3
- nodejs
- yarn
- docker desktop
- forge
- Qemu

if on windows, you should have wsl2 installed and running.

# Instructions

## 1. Environment Setup

1. install sunodo @ sunodo.io

   > npm install -g @sunodo/cli

2. Create sunodo app

   > sunodo create js-app --template javascript && cd js-app

3. install project dependencies

   > yarn

4. run your node for the 1st time

   ```bash
   sunodo build
   sunodo run
   ```

5. Lets inform it of its own ethereum address on the base layer

   > sunodo send dapp-address

   Check the logs to see that it worked.

   The payload should be the address of the application you used to send the transaction.

6. Send a generic message to the node

   > sunodo send generic input="Your Msg Here"

   Use the this [online tool](https://string-functions.com/hex-string.aspx) to convert the payload from hex to string

   There are many other options with the `sunodo send` command, explore them using `sunodo send --help`.

## 2. Learning about "no-backend" option flag

You can run your application directly from your machine (bare metal) so it's easier to debug and quicker on the re-lauching cycles. Here's how:

```bash
sunodo run --no-backend # that starts the node infrastructure, but not the application
```

in another shell, run the application directly from your machine

```bash
yarn build # only needed when updating the typings or the first time
yarn start
```

Now you can replay the interactions from before, but this time, the application will be running directly from your machine.

## 3. Adding Handlers

### 3.1. Adding Advance Handler

In this section we are learning how to handle base layer input transactions. More specifically, we are going to follow the Solidity ABI standards for this tutorial, but you are not limited by it.

You can check the final version of the index file after the following steps in the [`src/third.ts`](./src/third.ts) file in this repo.

1. Add viem imports

   ```typescript
   import { encodeFunctionData, getAddress } from "viem";
   ```

2. use abi of a smart contract

   ```typescript
   var storageabi = [
     {
       inputs: [],
       name: "retrieve",
       outputs: [
         {
           internalType: "uint256",
           name: "",
           type: "uint256",
         },
       ],
       stateMutability: "view",
       type: "function",
     },
     {
       inputs: [
         {
           internalType: "uint256",
           name: "num",
           type: "uint256",
         },
       ],
       name: "store",
       outputs: [],
       stateMutability: "nonpayable",
       type: "function",
     },
   ];
   ```

3. Add a new default handler for `advance` requests (input txs)

   ```typescript
   async function handle_advance(data) {
     console.log("Received advance request data " + JSON.stringify(data));
     const payload = data["payload"];
     try {
       const payloadStr = ethers.utils.toUtf8String(payload);
       console.log(`Adding notice "${payloadStr}"`);
     } catch (e) {
       console.log(`Adding notice with binary value "${payload}"`);
     }
     let advance_req;
     if (payload == "0x766f7563686572") {
       const call = encodeFunctionData({
         abi: storageabi,
         functionName: "store",
         args: [123124554],
       });
       voucher = {
         destination: storage_address, // dapp Address
         payload: call,
       };
       console.log(voucher);
       advance_req = await fetch(rollup_server + "/voucher", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(voucher),
       });
       console.log("starting a voucher");
     } else {
       advance_req = await fetch(rollup_server + "/notice", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({ payload }),
       });
     }

     const json = await advance_req.json();
     console.log(
       "Received  status " +
         advance_req.status +
         " with body " +
         JSON.stringify(json)
     );
     return "accept";
   }
   ```

4. Add a inspect handler

```typescript
async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  const payload = data["payload"];
  try {
    const payloadStr = ethers.utils.toUtf8String(payload);
    console.log(`Adding report "${payloadStr}"`);
  } catch (e) {
    console.log(`Adding report with binary value "${payload}"`);
  }
  const inspect_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload }),
  });
  console.log("Adding report with" + inspect_req.status);
  return "accept";
}
```

4. Test with an input

   First we need to encode the message, like we are going to send it to a solidy contract:

   > cast calldata "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

   it outputs:

   > 0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266

   so now we can send it using sunodo:

   ```bash
    sunodo send generic --input=0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 --input-encoding=hex
   ```

   Try by yourself to send a "sayHello" request.

5. Try a frontend tool
   https://github.com/prototyp3-dev/frontend-web-cartesi
