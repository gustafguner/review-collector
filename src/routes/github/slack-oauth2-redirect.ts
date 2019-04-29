import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';
import axios from 'axios';
import { WebClient } from '@slack/web-api';
import GitHub from '../../utils/github';

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const slackOuath2Redirect: express.RequestHandler = async (req, res) => {
  const payload = req.query.payload;
  console.log('Payload: ', payload);
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

  res.redirect(`${process.env.FRONTEND_URL}/onboarding/done`);
};

export default slackOuath2Redirect;
