import { WebClient } from '@slack/web-api';

class Slack {
  private web: WebClient;

  constructor(token: string) {
    this.web = new WebClient(token);
  }
}

export default Slack;
