import * as express from 'express';
const router = express.Router();

import webhook from './webhook';
import ouath2Redirect from './oauth2-redirect';
import slackOuath2Redirect from './slack-oauth2-redirect';

router.post('/webhook', webhook);
router.get('/oauth2/redirect', ouath2Redirect);
router.get('/slack/oauth2/redirect', slackOuath2Redirect);

export { router };
