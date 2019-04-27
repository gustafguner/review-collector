import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';
import { WebClient } from '@slack/web-api';
import { ITeam } from '../../models/interfaces/team';

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const webhook: express.RequestHandler = async (req, res) => {
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
};

export default webhook;
