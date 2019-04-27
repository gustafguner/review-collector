import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';
import GitHub from '../../utils/github';

const unwatch: express.RequestHandler = async (req, res) => {
  const teamId = req.body.team_id;
  const repoName = req.body.text;

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

  res.status(200).json({
    text: ' ',
    attachments: [
      {
        color: '#595959',
        title: 'Stopped watching a repository',
        text: `You're not watching *${repoName}* anymore :see_no_evil:`,
      },
    ],
  });
};

export default unwatch;
