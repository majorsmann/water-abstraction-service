/**
 *
 * @module controllers/notify
 */

const Helpers = require('../lib/helpers');
const DB = require('../lib/connectors/db');
const { pool } = require('../lib/connectors/db');
const NotifyClient = require('notifications-node-client').NotifyClient;

const Joi = require('joi');
const moment = require('moment');

const messageQueue = require('../lib/message-queue');

/**
 * Gets the notify template ID for a notify message ref,
 * and sends it using the notify API
 *
 *  Sample CURL
 *  curl -X POST '../notify/password_reset_email' -d '{"recipient":"email@email.com","personalisation":{"firstname":"name","reset_url":"url"}}'
 *
 * @param {Object} request - the HAPI HTTP request
 * @param {Object} [request.query] - GET query params
 * @param {String} [request.query.recipient] - recipient of the notify message
 * @param {String} [request.query.message_ref] - the internal ref of the message to be sent
 * @param {String} [request.payload.personalisation] - the personalisation packet
 * @param {Object} reply - the HAPI HTTP response
 */
async function send (request, reply) {
  const { message_ref: messageRef } = request.params;
  const { recipient, personalisation } = request.payload;

  const config = {
    messageRef,
    recipient,
    personalisation
  };

  // Schedule job
  await messageQueue.publish('notify.enqueue', config, {
    expireIn: '01:00:00'
  });
  reply(config);
}

/**
 * Gets the notify template ID for a notify message ref,
 * and sends it using the notify API
 *
 *  Sample CURL
 *  curl -X POST '../notify/password_reset_email' -d '{"recipient":"email@email.com","personalisation":{"firstname":"name","reset_url":"url"}}'
 *
 * @param {Object} request - the HAPI HTTP request
 * @param {Object} [request.query] - GET query params
 * @param {String} [request.query.recipient] - recipient of the notify message
 * @param {String} [request.query.message_ref] - the internal ref of the message to be sent
 * @param {String} [request.payload.personalisation] - the personalisation packet
 * @param {Object} reply - the HAPI HTTP response
 */
async function futureSend (request, reply) {
  var config = {};
  config.message_ref = request.params.message_ref;
  config.id = request.payload.id;
  config.recipient = request.payload.recipient;
  config.personalisation = request.payload.personalisation;
  config.sendafter = request.payload.sendafter;
  try {
    var res = await sendLater(config);
    console.log(res);
    if (res.error) {
      console.log(res.error);
      return reply({
        error: res.error
      }).code(400);
    } else {
      console.log('no error');
      return reply({
        message: res.message
      }).code(200);
    }
  } catch (e) {
    return reply({
      message: e
    }).code(500);
  }
}

/**
 * A function to get the notify key
 * The key stored in the DB can be an actual key, or it can refer
 * to an environment variable as follows:
 * test:  TEST_NOTIFY_KEY
 * whitelist: WHITELIST_NOTIFY_KEY
 * live: LIVE_NOTIFY_KEY
 * @param {String} a reference to a notify key: test|whitelist|live to be
 *                 loaded from environment variable, or a full key
 * @return {String} notify key
 */
function getNotifyKey (key) {
  const lKey = key.toLowerCase();
  const keys = {
    test: process.env.TEST_NOTIFY_KEY,
    whitelist: process.env.WHITELIST_NOTIFY_KEY,
    live: process.env.LIVE_NOTIFY_KEY
  };
  if (lKey in keys) {
    return keys[lKey];
  }
  return key;
}

/**
 * Update scheduled event with notify ID
 * @param {String} id - the ID in the water.scheduled_notification table
 * @param {String} notifyId - the ID of the message in the notify service
 * @return {Promise} resolves when DB table updated
 */
function updateNotifyId (id, notifyId) {
  // Update scheduled_notification table with message ID so we can check status later
  const query = `UPDATE water.scheduled_notification SET notify_id=$1 WHERE id=$2`;
  const queryParams = [notifyId, id];
  return pool.query(query, queryParams);
}

/**
 * Gets the notify template ID for a notify message ref,
 * and sends it using the notify API
 *
 *  Sample CURL
 *  curl -X POST '../notify/password_reset_email' -d '{"recipient":"email@email.com","personalisation":{"firstname":"name","reset_url":"url"}}'
 *
 * @param {Object} config - the request
 * @param {String} [config.id] - id of the notify request (used for preventing double send with on conflict)
 * @param {String} [config.recipient] - recipient of the notify message
 * @param {String} [config.message_ref] - the internal ref of the message to be sent
 * @param {String} [config.personalisation] - the personalisation packet
 */
async function sendNow (config) {
  const schema = {
    id: Joi.string().guid(),
    message_ref: Joi.string().required(),
    recipient: Joi.string().required(),
    personalisation: Joi.object().required()
  };
  const {
    error
  } = Joi.validate(config, schema);
  if (error) {
    console.log(error);
    return {
      error: {
        error: error.details,
        message_ref: config.message_ref,
        template_id: undefined,
        message: error.details
      }
    };
  } else {
    // Send ${data.message_ref} to ${data.recipient} with ${data.personalisation}`

    try {
      // get template details
      let template = await DB.query('select * from water.notify_templates where message_ref=$1', [config.message_ref]);
      if (!template.data.length) {
        return {
          error: `Template ${config.message_ref} was not found`
        };
      } else {
        const notifyClient = new NotifyClient(getNotifyKey(template.data[0].notify_key));
        var templateId = template.data[0].template_id;
        try {
          // check template exists in notify
          template = await notifyClient.getTemplateById(templateId);
        } catch (e) {
          return {
            error: {
              error: 'Error returned from notify getTemplateByID',
              message_ref: config.message_ref,
              template_id: templateId,
              message: e.message
            }
          };
        }
        // call different notify functions according to template type as returned by notify
        switch (template.body.type) {
          case 'sms':
            try {
              const { body: { id } } = await notifyClient.sendSms(templateId, config.recipient, config.personalisation);
              await updateNotifyId(config.id, id);
            } catch (e) {
              return {
                error: {
                  error: 'Error returned from notify sendSMS endpoint',
                  message_ref: config.message_ref,
                  template_id: templateId,
                  message: e.message
                }
              };
            }
            break;
          case 'email':
            await Joi.validate(config.recipient, Joi.string().email());
            try {
              const { body: { id } } = await notifyClient.sendEmail(templateId, config.recipient, config.personalisation);
              await updateNotifyId(config.id, id);
            } catch (e) {
              return {
                error: {
                  error: 'Error returned from notify send email',
                  message_ref: config.message_ref,
                  template_id: templateId,
                  message: e.message
                }
              };
            }

            break;
          case 'letter':
            try {
              // note: notify key (and therefore live or test) now controlled in DB
              console.log('sending letter');
              const { body: { id } } = await notifyClient.sendLetter(templateId, config.personalisation);
              await updateNotifyId(config.id, id);
            } catch (e) {
              return {
                error: {
                  error: 'Error returned from notify sendLetter',
                  message_ref: config.message_ref,
                  template_id: templateId,
                  message: e.message
                }
              };
            }
            break;
        }
      }
      return {
        message: 'ok'
      };
    } catch (e) {
      console.log(e);
      return {
        error: e
      };
    }
  }
}

/**
 * Gets the notify template ID for a notify message ref,
 * and sends it using the notify API
 *
 *  Sample CURL
 *  curl -X POST '../notify/password_reset_email' -d '{"recipient":"email@email.com","personalisation":{"firstname":"name","reset_url":"url"}}'
 *
 * @param {Object} config - the request
 * @param {String} [config.id] - id of the notify request (used for preventing double send with on conflict)
 * @param {String} [config.recipient] - recipient of the notify message
 * @param {String} [config.message_ref] - the internal ref of the message to be sent
 * @param {String} [config.personalisation] - the personalisation packet
 * @param {String} [config.sendafter] - date time of when to send
 */
async function sendLater (config) {
  const schema = {
    id: Joi.string().required(),
    recipient: Joi.string().required(),
    message_ref: Joi.string().required(),
    personalisation: Joi.object().required(),
    sendafter: Joi.string().required()
  };

  const {
    error
  } = Joi.validate(config, schema);
  if (error) {
    return {
      error: {
        error: error.details
      }
    };
  } else {
    try {
      // get template details
      let template = await DB.query('select * from water.notify_templates where message_ref=$1', [config.message_ref]);
      if (!template.data.length) {
        return {
          error: `Template ${config.message_ref} was not found`
        };
      }
      console.log(template);
      const notifyClient = new NotifyClient(getNotifyKey(template.data[0].notify_key));
      var templateId = template.data[0].template_id;
      try {
        // check template exists in notify
        template = await notifyClient.getTemplateById(templateId);
      } catch (e) {
        return {
          error: {
            error: 'Error returned from notify getTemplateByID',
            message_ref: config.message_ref,
            template_id: templateId,
            message: e.message
          }
        };
      }

      const query = `insert into water.scheduled_notification (id,recipient,message_ref,personalisation,send_after)
                  values ($1,$2,$3,$4,$5) on conflict(id) do nothing`;
      const queryparams = [config.id, config.recipient, config.message_ref, config.personalisation, config.sendafter];
      try {
        const addNotification = await DB.query(query, queryparams);
        if (addNotification.error) {
          throw addNotification.error;
        }
        return ({
          message: 'ok'
        });
      } catch (e) {
        console.log(e);
        return ({
          error: e

        });
      }
    } catch (e) {
      console.log(e);
      return ({
        error: e

      });
    }
  }
}

module.exports = {
  send,
  sendNow,
  sendLater,
  futureSend,
  getNotifyKey
};
