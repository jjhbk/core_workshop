
# Requirements

You should have:

- python3
- nodejs 
- yarn
- docker desktop
- forge

if on windows, you should have wsl2 installed and running. 

# Instructions

## 1. Environment Setup

1. install sunodo @ sunodo.io

    > npm install -g @sunodo/cli


2. install project dependencies

    > yarn 

3. run your node for the 1st time

    ```bash
    sunodo build
    sunodo run
    ``````

4. Lets inform it of its own ethereum address on the base layer

    > sunodo send dapp-address

    Check the logs to see that it worked.

    The payload should be the address of the application you used to send the transaction.

5. Send a generic message to the node

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

## 3. Installing Deroll

1. Install the deroll app libraries

    >   yarn add @deroll/app @deroll/router @deroll/wallet

2. Let's start over at the `src/index.ts` with the addition of deroll.
You can add the following snippet or copy it from the [`src/second.ts`](./src/second.ts) file in this repo.

    ```typescript
    import { createApp } from "@deroll/app";

    const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL || "http://localhost:8080/host-runner";

    const app = createApp({ url: rollupServer });
    // TODO: add input handlers here
    app.start().catch((e) => process.exit(1));
    ```

You can run the application again using `sunodo run --no-backend`, and then `yarn start` in another shell.

As you probably you could've guessed from the snippet, this can't do much. Let's add some input handlers.


## 4. Adding Handlers


### 4.1. Adding Advance Handler

In this section we are learning how to handle base layer input transactions. More specifically, we are going to follow the Solidity ABI standards for this tutorial, but you are not limited by it.

You can check the final version of the index file after the following steps in the [`src/third.ts`](./src/third.ts) file in this repo.

1. Add viem imports

    ``` typescript
    import { decodeFunctionData, parseAbi } from "viem";
    ```

2. Define some 'solidity functions' to be used in the next step, here is an example:

    ``` typescript
    const abi = parseAbi([
        "function balanceOf(address userAddr)",
        "function sayHello()",
    ]);
    ```

3. Add a new default handler for `advance` requests (input txs)

    ``` typescript

    app.addAdvanceHandler(async ({ payload }) => {
        console.log("Received advance request data " + JSON.stringify(payload))
        const { functionName, args } = decodeFunctionData({ abi, data: payload });
        switch (functionName) {
            case "balanceOf":
                const [userAddr] = args;
                console.log(`The ${userAddr} balance is...`);
                return "accept";

            case "sayHello":
                console.log(`Hello!"`);
                return "accept";
        }
    });
    ```

4. Test with an input

    First we need to enconde the message, like we are going to send it to a solidy contract:

    > cast calldata "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

    it outputs:

    > 0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266

    so now we can send it using sunodo:

    ```bash
     sunodo send generic --input=0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 --input-encoding=hex
    ```

    Try by yourself to send a "sayHello" request.


### 4.2 Let's play with routes

Deroll comes with the option to use routes, so it's easier to manage the functions that need to act on a input.

To help us to also manage funds, we are also going to use the `@deroll/wallet` library.

As usual, you can find the final script at [`src/fourth.ts`](./src/fourth.ts) file in this repo.
1. Import the libs    
    ```typescript
    import { createRouter } from "@deroll/router";
    import { createWallet } from "@deroll/wallet";
    ```
2. Create a wallet instance
    ```typescript
    const wallet = createWallet();
    ```
3. Create a router instance
    ```typescript
    const router = createRouter({ app });
    ```    
4. Let's register the default handlers of the wallet
    ```typescript
    app.addAdvanceHandler(wallet.handler);
    ```

5. Let's handle the possible errors of ABI decoding. At the last section for the advanceHandler, add a try/catch block as such:

    ```typescript
    app.addAdvanceHandler(async ({ payload }) => {
        try{ 
            const { functionName, args } = decodeFunctionData({ abi, data: payload });
        
            switch (functionName) {
                case "balanceOf":
                    const [userAddr] = args;
                    console.log(`The ${userAddr} balance is...`);
                    return "accept";
        
                case "sayHello":
                    console.log(`Hello!"`);
                    return "accept";
            }

        } catch(e) {
            console.log('error decoding function data', e)
            return "reject";
        }
    });
    ```

6. Now modify the balanceOf to actually check balances. Add:
    ```typescript
    console.log(`The ${userAddr} balance is ${wallet.balanceOf(userAddr)}`);
    ```

    and you can check again that the balance was actually modified:
    ```bash
     sunodo send generic --input=0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 --input-encoding=hex
    ```

7. Let's add a route on the inspect mode to check the balance.

    Here is an example of a route to check the balances:

    ```typescript
    router.add<{ address: string }>(
        "wallet/:address",
        ({ params: { address } }) => {
            console.log('wallet handler called', address)
            return JSON.stringify({
                balance: wallet.balanceOf(address).toString(),
            });
        },
    );
    ```
    Add it to the routes of the app like so:    
    ```typescript
    app.addInspectHandler(router.handler);
    ``````

    you should be able to check the balance of the address you used before:
    ```bash
    curl http://localhost:8080/inspect/wallet/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    ```

## 5. Changing the state

Now that we learned how to send and manage the 2 types of requests, let's learn how to change the state of the application.

### 5.1 Transfer of funds

Final version of the script can be found at [`src/fifth.ts`](./src/fifth.ts) file in this repo.

1. Make a deposit again using sunodo

    > sunodo send ether --amount=10

2. Add a transfer function to your advance handler

    2.1 a new function to the abi
    ```typescript
    "function transfer(address to, uint256 amount)",
    ```
    2.2 a new variable at the handler definition, the `metadata`: 
    ```typescript
    app.addAdvanceHandler(async ({ payload, metadata }) => {
    ```
    2.3 a new case to the switch statement
    ```typescript
    case "transfer":
        const [to, amount] = args;
        console.log(`Transfering ${amount} to ${to}`);
        wallet.transferEther(metadata.msg_sender, to, amount);
        return "accept";
    ```

3. Test the transfer function

    3.1 Encode the transfer function
    ```bash
    cast calldata "transfer(address,uint256)" 0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C 10 # this is the address of the dapp
    ```
    3.2 Send the transaction
    ```bash
    sunodo send generic --input=0xa9059cbb00000000000000000000000070ac08179605af2d9e75782b8decdd3c22aa4d0c000000000000000000000000000000000000000000000000000000000000000a
    ```

    3.3 Check the balance of the dapp address
    ```bash
    curl http://localhost:8080/inspect/wallet/0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C
    ```
