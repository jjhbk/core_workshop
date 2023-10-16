

import { createApp } from "@deroll/app";
import { createRouter } from "@deroll/router";
import { createWallet } from "@deroll/wallet";
import { decodeFunctionData, parseAbi } from "viem";

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL || "http://localhost:8080/host-runner";

console.log('starting app with rollup server ');

const app = createApp({ url: rollupServer });
const abi = parseAbi([
    "function balanceOf(address userAddr)",
    "function sayHello()",
    "function transfer(address to, uint256 amount)",
]);

app.addAdvanceHandler(async ({ payload, metadata }) => {
    try{ 
        const { functionName, args } = decodeFunctionData({ abi, data: payload });
        switch (functionName) {
            case "balanceOf":
                const [userAddr] = args;
                console.log(`The ${userAddr} balance is ${wallet.balanceOf(userAddr)}`);
                return "accept";
    
            case "sayHello":
                console.log(`Hello!"`);
                return "accept";
            case "transfer":
                const [to, amount] = args;
                console.log(`Transfering ${amount} to ${to}`);
                wallet.transferEther(metadata.msg_sender, to, amount);
                return "accept";
        }

    } catch(e) {
        return "reject";
    }
});

const wallet = createWallet();
const router = createRouter({ app });

app.addAdvanceHandler(wallet.handler);

router.add<{ address: string }>(
    "wallet/:address",
    ({ params: { address } }) => {
        return JSON.stringify({
            balance: wallet.balanceOf(address).toString(),
        });
    },
);
app.addInspectHandler(router.handler);

app.start().catch((e) => process.exit(1));

