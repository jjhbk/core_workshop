

import { createApp } from "@deroll/app";
import { decodeFunctionData, parseAbi } from "viem";

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL || "http://localhost:8080/host-runner";

const app = createApp({ url: rollupServer });
const abi = parseAbi([
    "function balanceOf(address userAddr)",
    "function sayHello()",
]);

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

app.start().catch((e) => process.exit(1));

