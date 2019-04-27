import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';
import GitHub from '../../utils/github';

const watch: express.RequestHandler = async (req, res) => {
  const teamId = req.body.team_id;
  const repoName = req.body.text;

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
    return res.status(200).json({
      text: ' ',
      attachments: [
        {
          color: 'danger',
          title: 'Repository not found',
          text: `I couldn't find that repository. Are you sure you own a repository named *${repoName}*?`,
        },
      ],
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
    return res.status(200).json({
      text: ' ',
      attachments: [
        {
          color: 'danger',
          title: 'Unexprected error',
          text: 'An unexpected error occured :crying_cat_face:',
        },
      ],
    });
  }

  res.status(200).json({
    text: ' ',
    attachments: [
      {
        color: 'good',
        title: 'Started watching a repository',
        text: `You're now watching *${repoName}* :eyes:`,
      },
    ],
  });
};

export default watch;
