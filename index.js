const runbot = require("./lib");

//sanity checks

if(!process.env.ROCKETCHAT_URL ||
   !process.env.ROCKETCHAT_USER ||
   !process.env.ROCKETCHAT_PASSWORD) {
       console.error("Not correctly configured! Rocket-Chat credentials / url is missing");
       process.exit(1);
   }


//simply start the bot ...
runbot();