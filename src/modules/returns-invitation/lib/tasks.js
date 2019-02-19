/**
 * Sync and async tasks that modify the notification state to build up
 * the notification object ready for sending
 */

// Third-party dependencies
const { get, chunk, find, mapValues, mapKeys } = require('lodash');
const Boom = require('boom');
const moment = require('moment');

// Library dependencies
const { getDocumentContacts } = require('../../../lib/connectors/crm/documents');
const messageQueue = require('../../../lib/message-queue');
const { returns } = require('../../../lib/connectors/returns');
const { logger } = require('@envage/water-abstraction-helpers');

// Module dependencies
const { transformContact } = require('./de-duplicate');
const { enqueue } = require('../../notify')(messageQueue);

/**
 * Enqueues all messages for sending in the notification state to PG boss
 * @param {Object} state - notification state
 * @return {Promise} resolves when all messages enqueued
 */
const enqueueMessages = async (state) => {
  for (let message of state.messages) {
    try {
      await enqueue(message);
    } catch (err) {
      logger.error('Failed to enqueue', err);
    }
  }
};

/**
 * Creates an index of which licence numbers hold which returns
 * @param {Array} returns
 * @return {Object} keyed by licence number, each with an array of return IDs
 */
const createReturnsIndex = (returns) => {
  return returns.reduce((acc, ret) => {
    const { licence_ref: licenceNumber, return_id: returnId } = ret;
    if (!(licenceNumber in acc)) {
      acc[licenceNumber] = [];
    }
    acc[licenceNumber].push(returnId);
    return acc;
  }, {});
};

const formatDate = date => moment(date).format('D MMMM YYYY');

const addReturnPrefix = ret => mapKeys(ret, (value, key) => `return_${key}`);

/**
 * Formats return data for inclusion in personalisation fields
 * by formatting the dates to the form D MMM YYYY
 * @param  {[type]} ret [description]
 * @return {[type]}     [description]
 */
const formatReturn = ret => {
  const data = mapValues(ret, (value, key) => {
    const isDate = ['start_date', 'end_date', 'due_date'].includes(key);
    return isDate ? formatDate(value) : value;
  });
  return addReturnPrefix(data);
};

/**
 * Given a page of licence contacts, a returns index, and a rolePriority array,
 * returns an array of transformed contacts ready for placing in the
 * notification state object
 * @param {Object} data - returned from CRM licence contacts call
 * @param {Object} index - returns index, with return IDs for each licence number
 * @param {Array} rolePriority - preferred contact roles for notification type
 * @parm {Object} state - message state
 * @return {Array} contacts
 */
const getTransformedReturnsContacts = (data, index, rolePriority, state) => {
  return data.reduce((acc, contact) => {
    const { system_external_id: licenceNumber } = contact;

    // Create a row for each return ID for this licence
    const contacts = index[licenceNumber].reduce((acc, returnId) => {
      const ret = find(state.returns, row => (row.return_id === returnId));

      const returnContact = {
        ...contact,
        ...formatReturn(ret)
      };
      return [
        ...acc,
        transformContact(returnContact, rolePriority)
      ];
    }, []);

    return [
      ...acc,
      ...contacts
    ];
  }, []);
};

/**
 * Fetches contacts for the returns specified in the notifications object,
 * and uses them to populate the 'contacts' section
 * @param {Object} state - current notification state
 * @return {Promise} resolves with new state
 */
const fetchReturnsContacts = async (state) => {
  const rolePriority = get(state, 'config.rolePriority', ['licence_holder']);
  const contacts = [];

  const licenceNumbers = state.returns.map(ret => ret.licence_ref);
  const index = createReturnsIndex(state.returns);

  // Split list of licence numbers into pages
  const pages = chunk(licenceNumbers, 200);

  for (let page of pages) {
    const filter = {
      system_external_id: {
        $in: page
      }
    };
    const { data, error } = await getDocumentContacts(filter);

    if (error) {
      throw Boom.badImplementation(`Error getting contacts for licences ${page.join(',')}`, error);
    }

    contacts.push(...getTransformedReturnsContacts(data, index, rolePriority, state));
  }

  return contacts;
};

/**
 * Async method to fetch returns and populate in the notification state
 * @param {Object} state
 * @return {Promise} resolves with new state
 */
const fetchReturns = async (state) => {
  const { returnsFilter: filter } = state;

  const sort = {};
  const columns = ['return_id', 'licence_ref', 'return_requirement', 'due_date', 'start_date', 'end_date'];

  // Find all returns matching criteria
  return returns.findAll(filter, sort, columns);
};

module.exports = {
  enqueueMessages,
  fetchReturnsContacts,
  fetchReturns,
  createReturnsIndex,
  getTransformedReturnsContacts,
  formatReturn
};
