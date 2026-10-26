
require('dotenv').config();
const KEY = process.env.API_KEY;

if (!KEY) {
  throw new Error("Set API_KEY before starting, see README.md for instructions");
}

module.exports = {
  "/api/v1": {
    "target":"https://interview-api.memtime-demo.deno.net",
    "secure": true,
    "changeOrigin": true,
    headers: {
      "Authorization": `Bearer ${KEY}`
    },
  },
};