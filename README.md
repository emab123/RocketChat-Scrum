
# rocket-daily-standup
This is a fork of the rocket-daily-standup from github


The standup bot will communicate with all users that are found in the rooms, the bot has joined.
It will ask several questions (3 per room/group per user) and will publish the results in the common room.

It uses a time-based mechanism to avoid double postings


## Environment Variables
| Name | Description |
| ---- | ----------- |
| ROCKETCHAT_URL | The server to connect to |
| ROCKETCHAT_USER | The user to connect with |
| ROCKETCHAT_PASSWORD | You'll never guess this one |
| BOT_TIME_DIALOG | The time when the dialog with the users will be initiated (HH:mm) |
| BOT_TIME_PUBLISH |The time when the summary will be posted (HH:mm) |

## Project setup
Either use the Built-in docker (e.g. using the Dockerfile) or run the following commands:

> Note that the env variables must be set, using either a .env file or normal environment variables

```
npm install --production
npm run bot
```