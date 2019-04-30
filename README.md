<p align="center">
  <a href="https://review-collector.netlify.com/">
    <img src="https://i.imgur.com/5MQP334.png" alt="Review Collector Logo" width="500">
  </a>
</p>


[![Build Status](https://travis-ci.com/gustafguner/review-collector.svg)](https://travis-ci.com/gustafguner/review-collector)

Pull requests are often left hanging due to a lack of reviews. You end up
either flooding public channels with messages like "@here can anyone review this?" or even worse – manually contacting each person asking them for a review.

With Review Collector, you don't have to do any of this. Review Collector is a Slack Bot that direct messages your colleagues when you request a review from them.

## Getting started
Getting started with Review Collector is very simple.

### Installation

Add Review Collector to your workspace:
    
<a href="https://slack.com/oauth/authorize?scope=commands,bot,chat:write:bot,im:write&client_id=600818133427.600894270546">
<img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
</a>

After having authorized the Slack App, you will be asked to connect with GitHub. This is necessary for Review Collector to be able to keep track of your repositories. **Review Collector has no rights to access code inside your repositories.**

### Connecting Slack users to GitHub users
Once installed, Review Collector will be able to watch for necessary events inside your repositories, but for Slack users to be notified they must connect their Slack user with their GitHub user.

All users who wish to either send or recieve review notifications must run the slash-command `/connect`. You will be prompted with the following:

<img src="https://i.imgur.com/IrBYCAk.png" width="500">

After having clicked the "Connect with GitHub" button and proceeded with the authorization process you should be notified by Review Collector that the connection was successfull.

<img src="https://i.imgur.com/JpGLEzV.png" width="500">

## Usage

### Commands
These are the available commands:

* `/connect` – Connects your Slack user to your GitHub user allowing Review Collector to notify you and send notifications from you.
* `/watch <repo-name>` – Tells Review Collector to start watching a repository. 
* `/unwatch <repo-name>` – Tells Review Collector to stop watching a repository.
* `/watching` – Lists all repositories you're currently watching.

### Example usage

Let's demonstrate the basic flow of Review Collector. 

Suppose I have installed Review Collector in my Slack workspace and all of my colleagues have connected their Slack user to their GitHub user with `/connect`. We are working on a repository called `test-repo` and want Review Collector to handle its review requests. To tell Review Collector to start watching it I run

```
/watch test-repo
```

If everything goes well, Review Collector will respond to you

<img src="https://i.imgur.com/EIUhs33.png" width="500">

Now I'm going to create a pull request and add one of my colleagues **qwertylorem** as a reviewer.

<img src="https://i.imgur.com/PeX8onL.png" width="500">

**qwertylorem** (@Lorem on Slack) instantly gets notified about this.

<img src="https://i.imgur.com/lvRuaxS.png" width="500">

After a little while, Review Collector notifies me, telling me that @Lorem has approved my pull request.

<img src="https://i.imgur.com/cTLsUxh.png" width="500">

With my approving review I decide to merge my pull request! 🎉
