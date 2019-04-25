import * as mongoose from 'mongoose';

import { ITeam } from './interfaces/team';

const Repo = {
  hook_id: { type: Number, requred: true },
  repo_name: { type: String, required: true },
  repo_id: { type: Number, required: true },
};

const User = {
  slack_id: { type: String, required: true },
  github_id: { type: String, required: true },
};

export const TeamSchema = new mongoose.Schema({
  slack_team_id: { type: String, required: true },
  slack_team_name: { type: String, required: true },
  slack_access_token: { type: String, required: true },
  slack_scope: { type: String, required: true },
  github_access_token: { type: String, required: false },
  repos: { type: [Repo], default: [] },
  users: { type: [User], default: [] },
});

const Team = mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
