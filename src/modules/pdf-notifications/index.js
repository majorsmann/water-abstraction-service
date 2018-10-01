const scheduledNotification = require('../../controllers/notifications').repository;
const { findOne } = require('../../lib/repository-helpers');
const nunjucks = require('nunjucks');
const { testMode } = require('../../../config');

const viewHelpers = require('./view-helpers');

const env = nunjucks.configure('./src/views/pdf-notifications/', {
  noCache: testMode
});

env.addFilter('naldRegion', viewHelpers.naldRegion);
env.addFilter('date', viewHelpers.dateFormat);
env.addFilter('paginateReturnLines', viewHelpers.paginateReturnLines);
env.addFilter('stringify', viewHelpers.stringify);

/**
 * Gets the relevant view template path given a message ref
 * for PDF messages
 * @param {String} messageRef
 * @return {String} view path
 */
const getViewPath = (messageRef) => {
  const view = messageRef.replace(/^pdf\./i, '');
  return `${view}.html`;
};

/**
 * Renders a notification message based on a scheduled_notification ID
 * this will be rendered in HTML to be converted later to PDF
 * @param {String} request.params.notificationId - GUID
 * @return {Promise} resolves with HTML content
 */
const getRenderNotification = async (notificationId) => {
  const notification = await findOne(scheduledNotification, notificationId);
  const view = getViewPath(notification.message_ref);

  console.log(JSON.stringify({ notification }, null, 2));
  return env.render(view, { notification });
};

module.exports = {
  getRenderNotification,
  getViewPath
};