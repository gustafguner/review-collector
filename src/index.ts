import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
import * as request from 'request';
const SlackBot = require('slackbots');

const PORT = process.env.PORT || 4000;

console.log(process.env.MONGODB_URL);

mongoose
  .connect(process.env.MONGODB_URL!, {
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

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

const bot = new SlackBot({
  token: process.env.SLACK_BOT_TOKEN,
  name: 'review-bot',
});

bot.on('start', () => {
  const params = {
    icon_emoji: ':cat:',
  };

  bot.postMessageToChannel('general', 'meow!', params);
});

bot.on('message', (data: any) => {
  if (data.type !== 'message') {
    return;
  }

  if (data.text.includes('tjena')) {
    const params = {
      icon_emoji: ':smiley:',
    };
    bot.postMessageToChannel('general', 'tjeeena!', params);
  }
});

app.post('/github/webhook', (req, res) => {
  console.log(req.body);
});

app.get('/slack/oauth2/redirect', (req, res) => {
  const code = req.query.code;

  const options = {
    uri: `https://slack.com/api/oauth.access?code=${code}&client_id=${
      process.env.SLACK_APP_CLIENT_ID
    }&client_secret=${process.env.SLACK_APP_CLIENT_SECRET}`,
    json: true,
    method: 'GET',
  };

  request(options, (error, response, body) => {
    if (body.ok === true) {
      res.redirect('http://localhost:8000/onboarding/github');
    } else {
      res.redirect('http://localhost:8000/onboarding/error');
    }
  });
});

app.get('/github/oauth2/redirect', (req, res) => {
  const id = req.query.id;
  console.log(id);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
