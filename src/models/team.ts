import * as mongoose from 'mongoose';

import { ITeam } from './interfaces/team';

export const TeamSchema = new mongoose.Schema({
  slack_team_id: { type: String, required: true },
  slack_team_name: { type: String, required: true },
  slack_access_token: { type: String, required: true },
  slack_scope: { type: String, required: true },
  github_access_token: { type: String, required: false },
});

const Team = mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
