import * as mongoose from 'mongoose';

interface Repo {
  hook_id: number;
  name: string;
}

export interface ITeam extends mongoose.Document {
  slack_team_id: string;
  slack_team_name: string;
  slack_access_token: string;
  slack_scope: string;
  github_access_token?: string;
  repos: Repo[];
}
