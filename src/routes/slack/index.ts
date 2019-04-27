import * as express from 'express';
const router = express.Router();

import oauth2Redirect from './oauth2-redirect';

router.get('/oauth2/redirect', oauth2Redirect);

export { router };
