import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
const SlackBot = require('slackbots');

const PORT = process.env.PORT || 4000;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

const bot = new SlackBot({
  token: process.env.BOT_TOKEN,
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

app.post('/connect', (req, res) => {
  const code = req.body.code;
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
