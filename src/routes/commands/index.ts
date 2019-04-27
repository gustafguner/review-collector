import * as express from 'express';
const router = express.Router();

import connect from './connect';
import watching from './watching';
import watch from './watch';
import unwatch from './unwatch';

router.post('/connect', connect);
router.post('/watching', watching);
router.post('/watch', watch);
router.post('/unwatch', unwatch);

export { router };
