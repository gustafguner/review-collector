import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';

const connect: express.RequestHandler = async (req, res) => {
  const slackUserId = req.body.user_id;
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
            url: `https://github.com/login/oauth/authorize?client_id=16466a53ce26b858fa89&scope=read:user&redirect_uri=${
              process.env.BACKEND_URL
            }/slack/oauth2/redirect?payload=${team._id}$${slackUserId}`,
          },
        ],
      },
    ],
  };

  res.status(200).json(message);
};

export default connect;
