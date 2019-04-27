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

import * as commands from './routes/commands';

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

app.use('/commands', commands.router);

app.post('/github/webhook', async (req, res) => {
  const action = req.body.action;

  console.log('😀 WEBHOOK 😀');
  if (action === 'merged') {
    console.log(req.body);
  }

  if (action !== 'review_requested' && action !== 'submitted') {
    // review_request_removed?
    // re_request
    // merge?
    return res.sendStatus(202);
  }

  const repoId = req.body.repository.id;

  const [err, teams] = await to(Team.find({ 'repos.repo_id': repoId }).exec());

  if (err || !teams) {
    console.log('Error finding teams');
    return res.sendStatus(500);
  }

  if (action === 'submitted') {
    const reviewer = req.body.review.user;
    const prAuthor = req.body.pull_request.user;
    const pullRequest = req.body.pull_request;
    const repository = req.body.repository;
    const review = req.body.review;

    teams.forEach(async (team: ITeam) => {
      const reviewerSlackUser = team.users.find(
        (user: any) => user.github_id === reviewer.id,
      );
      const prAuthorSlackUser = team.users.find(
        (user: any) => user.github_id === prAuthor.id,
      );

      if (!reviewerSlackUser || !prAuthorSlackUser) {
        return;
      }

      const [dmErr, dmResponse] = await to(
        web.im.open({
          token: team.slack_bot_access_token,
          user: prAuthorSlackUser.slack_id,
        }),
      );

      if (dmErr || !dmResponse) {
        return res.sendStatus(500);
      }

      const dm: any = dmResponse;

      interface ReviewStates {
        [key: string]: ReviewState;
      }

      interface ReviewState {
        title: string;
        color: string;
      }

      const reviewStates: ReviewStates = {
        approved: {
          title: 'Approved',
          color: 'good',
        },
        changes_requested: {
          title: 'Changes requested',
          color: 'warning',
        },
        commented: {
          title: 'Commented',
          color: '#595959',
        },
      };

      console.log(review.state);

      web.chat.postMessage({
        token: team.slack_bot_access_token,
        channel: dm.channel.id,
        text: `<@${reviewerSlackUser.slack_id}> reviewed you pull request`,
        attachments: [
          {
            mrkdwn_in: ['text'],
            color: reviewStates[review.state].color,
            author_name: `${reviewer.login}`,
            author_icon: reviewer.avatar_url,
            title: reviewStates[review.state].title,
            title_link: review.html_url,
            text: review.body.length !== 0 ? `"${review.body}"` : review.body,
            footer: repository.full_name,
          },
        ],
      });
    });

    return res.sendStatus(202);
  }

  const requester = req.body.sender;
  const pullRequest = req.body.pull_request;
  const repository = req.body.repository;
  const reviewer = req.body.requested_reviewer;

  teams.forEach(async (team: ITeam) => {
    const requesterSlackUser = team.users.find(
      (user: any) => user.github_id === requester.id,
    );
    const reviewerSlackUser = team.users.find(
      (user: any) => user.github_id === reviewer.id,
    );

    if (!requesterSlackUser || !reviewerSlackUser) {
      return;
    }

    const [dmErr, dmResponse] = await to(
      web.im.open({
        token: team.slack_bot_access_token,
        user: reviewerSlackUser.slack_id,
      }),
    );

    if (dmErr || !dmResponse) {
      return res.sendStatus(500);
    }

    const dm: any = dmResponse;

    web.chat.postMessage({
      token: team.slack_bot_access_token,
      channel: dm.channel.id,
      text: ' ',
      attachments: [
        {
          mrkdwn_in: ['text'],
          color: 'good',
          pretext: `<@${
            requesterSlackUser.slack_id
          }> requested a review from you`,
          author_name: pullRequest.user.login,
          author_link: pullRequest.user.html_url,
          author_icon: pullRequest.user.avatar_url,
          title: pullRequest.title,
          title_link: pullRequest.html_url,
          text: `${pullRequest.body}`,
          footer: repository.full_name,
          thumb_url: repository.html_url,
          // ts: (new Date(pullRequest.created_at).getTime() / 1000).toString(),
        },
        {
          author_name: `:keyboard: ${pullRequest.changed_files} file${
            pullRequest.changed_files === 1 ? '' : 's'
          } changed · ${pullRequest.additions} addition${
            pullRequest.additions === 1 ? '' : 's'
          } · ${pullRequest.deletions} deletion${
            pullRequest.deletions === 1 ? '' : 's'
          }`,
          text: ' ',
        },
      ],
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
      token: team.slack_bot_access_token,
      user: slackUserId,
    }),
  );

  if (dmErr || !dmResponse) {
    return res.sendStatus(500);
  }

  const dm: any = dmResponse;

  web.chat.postMessage({
    token: team.slack_bot_access_token,
    channel: dm.channel.id,
    text: ' ',
    attachment_type: 'default',
    attachments: [
      {
        title: 'Successfully connected',
        text: 'You are now connected to GitHub! :confetti_ball:',
        color: 'good',
      },
    ],
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
