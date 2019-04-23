import * as mongoose from 'mongoose';

export interface ITeam extends mongoose.Document {
  slack_team_id: string;
  slack_team_name: string;
  slack_access_token: string;
  slack_scope: string;
  github_access_token?: string;
}
