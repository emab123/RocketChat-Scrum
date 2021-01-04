//Note: rocket sdk uses process.env per default!
const rocket = require('rocketchat-js-sdk');
const log = require("loglevel");
const standupData = require("./data");
const respond = require("./respond");
const summary = require("./summary");
const nag = require("./nag");

//setup the sdk
//silence rocket api a bit
rocket.driver.useLog({
    debug: () => null,
    info: () => null,
    warn: () => log.warn,
    warning: () => log.warn,
    error: log.error
});

async function connectAndLogin() {
    await rocket.driver.connect();
    standupData.bot_id = await rocket.driver.login();
}

async function stop() {
    log.debug("Ending interval timers");
    nag.stop();
    summary.stop();
    log.debug("Storing supData");
    await standupData.store();
    if(rocket.driver.asteroid.loggedIn) {
        log.debug("Logging out")
        await rocket.driver.disconnect();
    }
    log.info("Bot shut down complete");
    process.exit(0);
}

process.on("SIGINT", stop);

module.exports = async () => {
    try {
        log.info("Starting up");
        log.debug("Loading config");
        await standupData.load();
        log.debug("Setting up");
        await connectAndLogin();
        await rocket.driver.subscribeToMessages();
        await rocket.driver.reactToMessages(respond);
        //watch the timers
        log.debug("Starting timers");
        await Promise.all([nag.setup()]);//, summary.setup()]);
        log.info("Bot started ... waiting");
        return stop;
    } catch(e) {
        log.error("Bot failed ... ending server");
        log.error(e);
        log.error("Terminating bot");
        process.exit(1);
    }
}
