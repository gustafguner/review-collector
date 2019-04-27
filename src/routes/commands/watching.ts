import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';

const watching: express.RequestHandler = async (req, res) => {
  const teamId = req.body.team_id;

  const [err, team] = await to(Team.findOne({ slack_team_id: teamId }).exec());

  if (err || !team || !team.github_access_token) {
    console.log('Error finding team');
    return;
  }

  const repoNames = team.repos.map((repo) => `*${repo.repo_name}*`);

  res.status(200).json({
    text: ' ',
    attachments: [
      {
        text:
          repoNames.length !== 0
            ? `You're watching ${repoNames.join(', ')}`
            : `You're not watching any repositories.`,
      },
    ],
  });
};

export default watching;
