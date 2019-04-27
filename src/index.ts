import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import * as commands from './routes/commands';
import * as slack from './routes/slack';
import * as github from './routes/github';

const { createEventAdapter } = require('@slack/events-api');
const { createMessageAdapter } = require('@slack/interactive-messages');

if (
  !process.env.MONGODB_URL ||
  !process.env.MONGODB_USERNAME ||
  !process.env.MONGODB_PASSWORD ||
  !process.env.SLACK_BOT_TOKEN ||
  !process.env.SLACK_APP_SIGNING_SECRET ||
  !process.env.SLACK_APP_CLIENT_ID ||
  !process.env.SLACK_APP_CLIENT_SECRET ||
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_SLACK_CLIENT_SECRET
) {
  throw new Error('❌ Your .env file is insufficient');
}

mongoose
  .connect(process.env.MONGODB_URL, {
    auth: {
      user: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD,
    },
  })
  .then(() => console.log('🔌 Successfully connected to MongoDB'))
  .catch((err) =>
    console.error(
      '❌ An error occured when connecting to the MongoDB database: ',
      err,
    ),
  );

const PORT = process.env.PORT || 4000;

const app = express();

const slackEvents = createEventAdapter(process.env.SLACK_APP_SIGNING_SECRET);
const slackInteractions = createMessageAdapter(
  process.env.SLACK_APP_SIGNING_SECRET,
);

app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackInteractions.expressMiddleware());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

app.use('/commands', commands.router);
app.use('/github', github.router);
app.use('/slack', slack.router);

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
