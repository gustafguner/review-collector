import * as express from 'express';
import Team from '../../models/team';
import to from 'await-to-js';
import axios from 'axios';

const oauth2Redirect: express.RequestHandler = async (req, res) => {
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
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/onboarding/error`);
  }

  const body = response.data;

  [err, foundTeam] = await to(
    Team.findOne({ slack_team_id: body.team_id }).exec(),
  );

  if (err) {
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/onboarding/error`);
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
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/onboarding/error`);
  }
  return res.redirect(
    `${process.env.FRONTEND_URL}/onboarding/github?id=${team._id}`,
  );
};

export default oauth2Redirect;
