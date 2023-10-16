import { createApp } from "@deroll/app";

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL || "http://localhost:8080/host-runner";

const app = createApp({ url: rollupServer });
// TODO: add input handlers here
app.start().catch((e) => process.exit(1));