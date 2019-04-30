<p align="center">
  <a href="https://review-collector.netlify.com/">
    <img src="https://i.imgur.com/5MQP334.png" alt="Review Collector Logo" style="max-width: 500px; width: 100%;">
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

<img src="https://i.imgur.com/IrBYCAk.png">

After having clicked the "Connect with GitHub" button and proceeded with the authorization process you should be notified by Review Collector that the connection was successfull.

<img src="https://i.imgur.com/JpGLEzV.png">
