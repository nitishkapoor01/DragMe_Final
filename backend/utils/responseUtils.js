/* ==========================================================================
   DRAGME BACKEND UTILS: RESPONSE FORMATTING (backend/utils/responseUtils.js)
   Standardized JSON responses for errors and success messages
   ========================================================================== */

function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({
    success: true,
    ...data
  });
}

function sendError(res, message = 'Internal Server Error', status = 500, details = null) {
  const response = {
    success: false,
    error: message
  };
  if (details) {
    response.details = details;
  }
  return res.status(status).json(response);
}

module.exports = {
  sendSuccess,
  sendError
};
