import axios from 'axios';

class GitHub {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  public getUser() {
    return this.apiRequest('get', 'https://api.github.com/user');
  }

  public getRepo(owner: string, repo: string) {
    return this.apiRequest(
      'get',
      `https://api.github.com/repos/${owner}/${repo}`,
    );
  }

  public getRepoById(id: number) {
    return this.apiRequest('get', `https://api.github.com/repositories/${id}`);
  }

  public addWebhook(owner: string, repo: string) {
    return this.apiRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        name: 'web',
        active: true,
        events: [
          'push',
          'pull_request',
          'pull_request_review',
          'pull_request_review_comment',
        ],
        config: {
          url: `${process.env.BACKEND_URL}/github/webhook`,
          content_type: 'json',
        },
      },
    );
  }

  public deleteWebhook(owner: string, repo: string, hookId: number) {
    return this.apiRequest(
      'delete',
      `https://api.github.com/repos/${owner}/${repo}/hooks/${hookId}`,
    );
  }

  private apiRequest(
    method: 'get' | 'post' | 'delete',
    url: string,
    data?: object,
  ) {
    return axios({
      method,
      url,
      headers: {
        accept: 'application/json',
        Authorization: `token ${this.token}`,
      },
      data: data !== null ? { ...data } : {},
    });
  }
}

export default GitHub;
