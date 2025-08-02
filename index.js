const log = require("loglevel");
const runbot = require("./lib");

//sanity checks
function ensure_env(name) {
    if(!process.env[name]) {
        console.error(`Missing mandatory env parameter ${name}`);
        process.exit(1);
    }
}

["ROCKETCHAT_URL", "ROCKETCHAT_USER", "DATA_FILE", "ROCKETCHAT_PASSWORD"].map(ensure_env);

log.setLevel(process.env.LOG_LEVEL || "info");

//simply start the bot ...
runbot();
