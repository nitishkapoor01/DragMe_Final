/* ==========================================================================
   DRAGME BACKEND ROUTES: MEDIA PROCESSING & CDN DELIVERY
   ========================================================================== */

const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/media/limits', mediaController.getLimits);
router.get('/media/metrics', mediaController.getMetrics);
router.get('/media/jobs/:jobId', mediaController.getJobStatus);
router.get('/media/assets/:id', mediaController.getAsset);
router.delete('/media/assets/:id', requireAuth, mediaController.deleteAsset);

router.post('/upload/media', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), mediaController.upload);
router.post('/media/upload', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), mediaController.upload);
router.post('/admin/media/cleanup', requireAuth, rateLimiter({ windowMs: 60000, max: 10 }), mediaController.runCleanup);

module.exports = router;
