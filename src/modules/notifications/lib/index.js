const moment = require('moment');
const getContactList = require('./contact-list');
const licenceLoader = require('./licence-loader');
const taskConfigLoader = require('./task-config-loader');
const templateRenderer = require('./template-renderer');
const eventLogger = require('./event-logger');
const { sendLater } = require('../../../controllers/notify');
const { createGUID } = require('../../../lib/helpers');

/* eslint camelcase: "warn" */

/**
 * Method which can be shared between preview/send
 *
 * Send a notification
 * The process is:
 * - select template (and personalisation variables)
 * - select audience (licence numbers)
 * - generate contact list
 * - send
 *
 * Process in detail:
 *
 * 1. Build contact list
 * - get list of contacts from CRM data
 * - de-duplicate, select most relevant contacts
 *
 * 2. Build template view context for each licence
 * - supplied template parameters (per batch)
 * - task configuration data (per task)
 * - pull all licences from permit repo, run them through NALD licence transformer (per de-duped licence list)
 *
 * 3. Render template content
 * - use Nunjucks to render view context data with selected template
 *
 * @param {Object} filter - the filter for searching for licences in CRM
 * @param {Number} taskConfigId - the numeric ID of the notification task
 * @param {Object} params - template parameters
 * @return {Promise} resolves with array of contacts, licences, and rendered messages to send via Notify
 */
async function prepareNotification (filter, taskConfigId, params) {
  // Get a list of de-duped contacts with licences
  const contacts = await getContactList(filter);

  // Load licence data from permit repo, and use NALD licence transformer
  // to transform to same format used in front-end GUI
  const licenceData = await licenceLoader(contacts);

  // Load task config data
  const taskConfig = await taskConfigLoader(taskConfigId);

  return templateRenderer(taskConfig, params, contacts, licenceData);
}

/**
 * Send notification
 * @param {Number} taskConfigId
 * @param {String} issuer - email address
 * @param {Array} contactData - data from prepare step above
 */
async function sendNotification (taskConfigId, issuer, contactData) {
  const taskConfig = await taskConfigLoader(taskConfigId);

  // Schedule messages for sending
  for (let row of contactData) {
    // Format name
    let { salutation, forename, name } = row.contact.contact;
    let fullName = [salutation, forename, name].filter(x => x).join(' ');

    // Get address
    let { address_1, address_2, address_3, address_4, town, county, postcode } = row.contact.contact;
    let lines = [fullName, address_1, address_2, address_3, address_4, town, county];

    // Format personalisation with address lines and postcode
    let address = lines.filter(x => x).reduce((acc, line, i) => {
      return {
        ...acc,
        [`address_line_${i + 1}`]: line
      };
    }, {});

    let messageConfig = {
      id: createGUID(),
      recipient: row.contact.method === 'email' ? row.contact.email : 'n/a',
      message_ref: row.contact.method === 'email' ? 'notification_email' : 'notification_letter',
      personalisation: {
        body: row.output,
        heading: taskConfig.config.name,
        ...address,
        postcode
      },
      sendafter: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    const { error } = await sendLater(messageConfig);

    console.log(error, messageConfig);
  }

  // Create array of affected licence numbers
  const licences = contactData.reduce((acc, row) => {
    const licenceNumbers = row.contact.licences.map(item => item.system_external_id);
    return [...acc, ...licenceNumbers];
  }, []);

  // Create array of affected CRM entity IDs
  const entities = contactData.map(row => row.contact.entity_id).filter(x => x);

  // Log event
  await eventLogger(taskConfig, issuer, licences, entities, contactData, 'sent');
}

module.exports = {
  prepareNotification,
  sendNotification
};
