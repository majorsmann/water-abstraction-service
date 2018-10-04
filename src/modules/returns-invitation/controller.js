
// Module dependencies
const { reducer } = require('./lib/reducer');
const {
  init, setReturnFilter, createEvent, setPersonalisation, setReturns,
  setContacts, dedupeContacts, createMessages
} = require('./lib/action-creators');
const { fetchReturns, fetchReturnsContacts, enqueueMessages } = require('./lib/tasks');

const { eventFactory } = require('./lib/event-factory');

const { persist: persistEvent } = require('./lib/connectors/event');

const generateReference = require('../../lib/reference-generator');

const returnsInvite = async (request, isPreview = true) => {
  const { filter, personalisation, config } = request.payload;

  // Create initial state
  let state = reducer({}, init(config));

  // Set request data
  state = reducer(state, setPersonalisation(personalisation));
  state = reducer(state, setReturnFilter(filter));

  // Fetch returns
  const returns = await fetchReturns(state);
  state = reducer(state, setReturns(returns));

  // Fetch returns contacts & de-duplicate
  const contacts = await fetchReturnsContacts(state);
  state = reducer(state, setContacts(contacts));
  state = reducer(state, dedupeContacts());

  const ref = generateReference(state.config.prefix);
  state = reducer(state, createEvent(ref));

  // Create and persist event
  const ev = eventFactory(state);

  if (!isPreview) {
    await persistEvent(ev);
  }

  state = reducer(state, createMessages());

  if (!isPreview) {
    await enqueueMessages(state);
  }

  // Output
  return {
    config: state.config,
    event: ev
  };
};

const postReturnsInvitePreview = async (request, h) => {
  return returnsInvite(request, true);
};

const postReturnsInvite = async (request, h) => {
  return returnsInvite(request, false);
};

module.exports = {
  postReturnsInvitePreview,
  postReturnsInvite
};
