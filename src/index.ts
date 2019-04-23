import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import to from 'await-to-js';

import Team from './models/team';

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

bot.on('message', (message: any) => {
  if (message.type !== 'message') {
    return;
  }
  // console.log(message);
});

app.post('/commands/watch', async (req, res) => {
  const teamId = req.body.team_id;
  const repoName = req.body.text;
  const responseUrl = req.body.response_url;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team) {
    console.log('Error');
    return;
  }

  console.log(team);

  const [githubUserError, githubUser] = await to(
    axios({
      method: 'get',
      url: 'https://api.github.com/user',
      headers: {
        accept: 'application/json',
        Authorization: `token ${team.github_access_token}`,
      },
    }),
  );

  if (githubUserError || !githubUser) {
    console.log('Error');
    return;
  }

  const [githubWebhookError, githubWebhook] = await to(
    axios({
      method: 'post',
      url: `https://api.github.com/repos/${
        githubUser.data.login
      }/${repoName}/hooks`,
      headers: {
        accept: 'application/json',
        Authorization: `token ${team.github_access_token}`,
      },
      data: {
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: {
          url: 'http://example.com/webhook',
          content_type: 'json',
        },
      },
    }),
  );

  console.log(
    `https://api.github.com/repos/${githubUser.data.login}/${repoName}/hooks`,
  );

  if (githubWebhookError) {
    axios({
      method: 'post',
      url: responseUrl,
      headers: {
        accept: 'application/json',
      },
      data: {
        response_type: 'in_channel',
        text: `:crying_cat_face: An error occured! Did you spell your repository name \`${repoName}\` correct?`,
      },
    });
    return;
  }

  console.log(githubUser.data);

  // console.log(req.body);
  console.log(`The team ${teamId} want to watch the repository ${repoName}`);

  axios({
    method: 'post',
    url: responseUrl,
    headers: {
      accept: 'application/json',
    },
    data: {
      response_type: 'in_channel',
      text: `You are now watching ${repoName}`,
    },
  });
});

app.post('/github/webhook', (req, res) => {
  console.log('HIT!');
  console.log(req.body);
  res.send(202);
});

app.get('/slack/oauth2/redirect', async (req, res) => {
  const code = req.query.code;
  let err, response, team, foundTeam;

  [err, response] = await to(
    axios({
      method: 'get',
      url: `https://slack.com/api/oauth.access?code=${code}&client_id=${
        process.env.SLACK_APP_CLIENT_ID
      }&client_secret=${process.env.SLACK_APP_CLIENT_SECRET}`,
      headers: {
        accept: 'application/json',
      },
    }),
  );

  if (err || !response) {
    return res.redirect('http://localhost:8000/onboarding/error');
  }

  const body = response.data;

  [err, foundTeam] = await to(
    Team.findOne({ slack_team_id: body.team_id }).exec(),
  );

  if (err) {
    return res.redirect('http://localhost:8000/onboarding/error');
  }

  if (!foundTeam) {
    const newTeam = new Team({
      slack_team_id: body.team_id,
      slack_team_name: body.team_name,
      slack_access_token: body.access_token,
      slack_scope: body.scope,
    });

    [err, team] = await to(newTeam.save());
  } else {
    foundTeam.slack_team_name = body.team_name;
    foundTeam.slack_access_token = body.access_token;
    foundTeam.slack_scope = body.scope;

    [err, team] = await to(foundTeam.save());
  }

  if (err || !team) {
    return res.redirect('http://localhost:8000/onboarding/error');
  }

  return res.redirect(`http://localhost:8000/onboarding/github?id=${team._id}`);
});

app.get('/github/oauth2/redirect', async (req, res) => {
  const id = req.query.id;
  const code = req.query.code;

  const [err, response] = await to(
    axios({
      method: 'post',
      url: `https://github.com/login/oauth/access_token?client_id=${
        process.env.GITHUB_CLIENT_ID
      }&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`,
      headers: {
        accept: 'application/json',
      },
    }),
  );

  if (err || !response) {
    return res.json({ success: false });
  }

  const [findErr, team] = await to(Team.findById(id).exec());

  if (findErr || !team) {
    return res.json({ success: false });
  }

  team.github_access_token = response.data.access_token;

  const [saveErr] = await to(team.save());

  if (saveErr) {
    return res.json({ success: false });
  }

  return res.redirect('http://localhost:8000/onboarding/done');
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
