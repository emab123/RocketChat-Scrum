//Note: rocket sdk uses process.env per default!
const rocket = require('rocketchat-js-sdk')
const standupData = require("./data");
const respond = require("./respond");
const summary = require("./summary");
const nag = require("./nag");

//setup the sdk
//silence rocket api a bit
rocket.driver.useLog({
    debug: () => null,
    info: () => null,
    warn: () => console.warn,
    warning: () => console.warn,
    error: console.error
});

async function connectAndLogin() {
    await rocket.driver.connect();
    standupData.bot_id = await rocket.driver.login();
}

process.on("SIGINT", async () => {
    console.log("Ending");
    nag.stop();
    summary.stop();
    await standupData.store();
    await rocket.driver.unsubscribeAll();
    await rocket.driver.disconnect();
    process.exit(0);
});

module.exports = async () => {
    try {
        console.log("Loading config");
        await standupData.load();
        console.log("Setting up");
        await connectAndLogin();
        await rocket.driver.subscribeToMessages();
        await rocket.driver.reactToMessages(respond);
        //watch the timers
        console.log("Starting timers");
        nag.setup();
        summary.setup();
        console.log("Waiting");
    } catch(e) {
        console.error("Bot failed ...");
        console.error(e);
    }
}
