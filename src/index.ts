import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import to from 'await-to-js';
import GitHub from './utils/github';
import Team from './models/team';

import { WebClient } from '@slack/web-api';
import { ITeam } from './models/interfaces/team';
const { createEventAdapter } = require('@slack/events-api');
const { createMessageAdapter } = require('@slack/interactive-messages');

if (
  !process.env.MONGODB_URL ||
  !process.env.MONGODB_USERNAME ||
  !process.env.MONGODB_PASSWORD ||
  !process.env.SLACK_BOT_TOKEN ||
  !process.env.SLACK_APP_SIGNING_SECRET ||
  !process.env.SLACK_APP_CLIENT_ID ||
  !process.env.SLACK_APP_CLIENT_SECRET
) {
  throw new Error('❌ Your .env file is insufficient');
}

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

const web = new WebClient(process.env.SLACK_BOT_TOKEN);
const slackEvents = createEventAdapter(process.env.SLACK_APP_SIGNING_SECRET);
const slackInteractions = createMessageAdapter(
  process.env.SLACK_APP_SIGNING_SECRET,
);

app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackInteractions.expressMiddleware());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

const PORT = process.env.PORT || 4000;

app.post('/commands/connect', async (req, res) => {
  const slackUserId = req.body.user_id;
  const channelId = req.body.channel_id;
  const teamId = req.body.team_id;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team || !team.github_access_token) {
    console.log('Error finding team');
    return;
  }

  const message = {
    text: `Please connect your Slack username to your GitHub username`,
    attachment_type: 'default',
    attachments: [
      {
        callback_id: 'github_connect',
        text: '',
        color: 'good',
        actions: [
          {
            name: 'github_connect',
            style: 'primary',
            text: 'Connect with GitHub',
            type: 'button',
            value: 'connect',
            url: `https://github.com/login/oauth/authorize?client_id=16466a53ce26b858fa89&scope=user&redirect_uri=http://localhost:4000/github/slack/oauth2/redirect?payload=${
              team._id
            }$${slackUserId}`,
          },
        ],
      },
    ],
  };

  res.status(200).json(message);
});

app.post('/commands/watching', async (req, res) => {
  res.send({
    status: 200,
    text: 'Let me check...',
  });

  const teamId = req.body.team_id;
  const responseUrl = req.body.response_url;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team || !team.github_access_token) {
    console.log('Error finding team');
    return;
  }

  const repoNames = team.repos.map((repo) => `*${repo.repo_name}*`);

  axios({
    method: 'post',
    url: responseUrl,
    headers: {
      accept: 'application/json',
    },
    data: {
      text:
        repoNames.length !== 0
          ? `You're watching ${repoNames.join(', ')}`
          : `You're not watching any repositories.`,
    },
  });
});

app.post('/commands/unwatch', async (req, res) => {
  res.sendStatus(200);

  const teamId = req.body.team_id;
  const repoName = req.body.text;
  const responseUrl = req.body.response_url;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team || !team.github_access_token) {
    console.log('Error finding team');
    return;
  }

  const github = new GitHub(team.github_access_token);
  const [githubUserError, githubUser] = await to(github.getUser());

  if (githubUserError || !githubUser) {
    console.log('Error getting user');
    return;
  }

  const repo = team.repos.find((repo) => repo.repo_name === repoName);

  if (!repo) {
    console.log('Error finding repo');
    return;
  }

  const repoIndex = team.repos.indexOf(repo);

  const [githubRepoErr, githubRepo] = await to(
    github.getRepoById(repo.repo_id),
  );

  if (githubRepoErr || !githubRepo) {
    console.log('Error');
    return;
  }

  const [deleteErr] = await to(
    github.deleteWebhook(
      githubUser.data.login,
      githubRepo.data.name,
      repo.hook_id,
    ),
  );

  if (deleteErr) {
    console.log('Error deleting webhook');
    return;
  }

  team.repos.splice(repoIndex, 1);

  const [saveErr] = await to(team.save());

  if (saveErr) {
    console.log('Error saving team');
    return;
  }

  axios({
    method: 'post',
    url: responseUrl,
    headers: {
      accept: 'application/json',
    },
    data: {
      response_type: 'in_channel',
      text: `:new_moon_with_face: You're not watching *${repoName}* anymore`,
    },
  });
});

app.post('/commands/watch', async (req, res) => {
  res.send({
    status: 200,
    text: 'Let me check...',
  });

  const teamId = req.body.team_id;
  const repoName = req.body.text;
  const responseUrl = req.body.response_url;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team || !team.github_access_token) {
    console.log('Error');
    return;
  }

  const github = new GitHub(team.github_access_token);

  const [githubUserError, githubUser] = await to(github.getUser());

  if (githubUserError || !githubUser) {
    console.log('Error');
    return;
  }

  const [githubWebhookError, githubWebhook] = await to(
    github.addWebhook(githubUser.data.login, repoName),
  );

  if (githubWebhookError || !githubWebhook) {
    return axios({
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
  }

  const [githubRepoError, githubRepo] = await to(
    github.getRepo(githubUser.data.login, repoName),
  );

  if (githubRepoError || !githubRepo) {
    console.log('Error');
    return;
  }

  team.repos.push({
    hook_id: githubWebhook.data.id,
    repo_name: repoName,
    repo_id: githubRepo.data.id,
  });

  const [saveError] = await to(team.save());

  if (saveError) {
    return axios({
      method: 'post',
      url: responseUrl,
      headers: {
        accept: 'application/json',
      },
      data: {
        response_type: 'in_channel',
        text: `:crying_cat_face: An unexpected error occured.`,
      },
    });
  }

  axios({
    method: 'post',
    url: responseUrl,
    headers: {
      accept: 'application/json',
    },
    data: {
      response_type: 'in_channel',
      text: `:eyes: You are now watching *${repoName}*`,
    },
  });
});

app.post('/github/webhook', async (req, res) => {
  console.log('Webhook hit!');
  const action = req.body.action;

  if (action !== 'review_requested') {
    // review_request_removed?
    return res.sendStatus(202);
  }

  const repoId = req.body.repository.id;

  const [err, teams] = await to(Team.find({ 'repos.repo_id': repoId }).exec());

  if (err || !teams) {
    console.log('Error finding teams');
    return res.sendStatus(500);
  }

  const requester = req.body.pull_request.user;
  const reviewer = req.body.requested_reviewer;
  console.log(reviewer.id);

  teams.forEach((team: ITeam) => {
    const requesterSlackUser = team.users.find(
      (user: any) => user.github_id === requester.id,
    );
    const reviewerSlackUser = team.users.find(
      (user: any) => user.github_id === reviewer.id,
    );

    if (!requesterSlackUser || !reviewerSlackUser) {
      return;
    }

    // console.log(requesterSlackUser);
    // console.log(reviewerSlackUser);

    web.chat.postMessage({
      token: team.slack_access_token,
      channel: reviewerSlackUser.slack_id,
      as_user: false,
      text: `${requester.login} just requested a review from you!`,
    });
  });

  res.sendStatus(202);
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

  console.log(body);

  if (!foundTeam) {
    const newTeam = new Team({
      slack_team_id: body.team_id,
      slack_team_name: body.team_name,
      slack_access_token: body.access_token,
      slack_bot_access_token: body.bot.bot_access_token,
      slack_bot_user_id: body.bot.bot_user_id,
      slack_scope: body.scope,
    });

    [err, team] = await to(newTeam.save());
  } else {
    foundTeam.slack_team_name = body.team_name;
    foundTeam.slack_access_token = body.access_token;
    foundTeam.slack_bot_access_token = body.bot.bot_access_token;
    foundTeam.slack_bot_user_id = body.bot.bot_user_id;
    foundTeam.slack_scope = body.scope;

    [err, team] = await to(foundTeam.save());
  }

  if (err || !team) {
    return res.redirect('http://localhost:8000/onboarding/error');
  }

  return res.redirect(`http://localhost:8000/onboarding/github?id=${team._id}`);
});

app.get('/github/slack/oauth2/redirect', async (req, res) => {
  const payload = req.query.payload;
  const teamId = payload.split('$')[0];
  const slackUserId = payload.split('$')[1];
  const code = req.query.code;

  const [err, response] = await to(
    axios({
      method: 'post',
      url: `https://github.com/login/oauth/access_token?client_id=${
        process.env.GITHUB_SLACK_CLIENT_ID
      }&client_secret=${process.env.GITHUB_SLACK_CLIENT_SECRET}&code=${code}`,
      headers: {
        accept: 'application/json',
      },
    }),
  );

  if (err || !response) {
    console.log('Error getting access token');
    return res.json({ success: false });
  }

  const github = new GitHub(response.data.access_token);

  const [githubUserError, githubUser] = await to(github.getUser());

  if (githubUserError || !githubUser) {
    console.log(githubUserError);
    console.log(githubUser);
    console.log('Error getting GitHub user');
    return res.json({ success: false });
  }

  const githubUserId = githubUser.data.id;

  const [teamError, team] = await to(Team.findById(teamId).exec());

  if (teamError || !team) {
    console.log('Error finding team');
    return res.json({ success: false });
  }

  const newTeamUsers = team.users.filter(
    (user: any) =>
      user.slack_id !== slackUserId && user.github_id !== githubUserId,
  );
  newTeamUsers.push({
    slack_id: slackUserId,
    github_id: githubUserId,
  });

  team.users = newTeamUsers;

  const [teamSaveError] = await to(team.save());

  if (teamSaveError) {
    console.log('Error saving');
    return res.json({ success: false });
  }

  const [dmErr, dmResponse] = await to(
    web.im.open({
      token: team.slack_access_token,
      user: team.slack_bot_user_id,
    }),
  );

  if (dmErr || !dmResponse) {
    return res.sendStatus(500);
  }

  const dm: any = dmResponse;

  web.chat.postMessage({
    token: team.slack_access_token,
    channel: dm.channel.id,
    text:
      ':white_check_mark: Your GitHub and Slack accounts are now connected!',
  });

  res.redirect('http://localhost:8000/onboarding/done'); // TODO: change
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

slackInteractions.action('github_connect', (req: any, res: any) => {
  console.log('hit!');
  console.log(req);
  return 1;
});
