import * as mongoose from 'mongoose';

interface Repo {
  hook_id: number;
  repo_name: string;
  repo_id: number;
}

interface User {
  slack_id: string;
  github_id: number;
}

export interface ITeam extends mongoose.Document {
  slack_team_id: string;
  slack_team_name: string;
  slack_access_token: string;
  slack_bot_access_token: string;
  slack_bot_user_id: string;
  slack_scope: string;
  github_access_token?: string;
  repos: Repo[];
  users: User[];
}
