'use strict';

const { parseQuery } = require('./lib/query-parser');
const search = require('./lib/index');
const { buildResponse } = require('./lib/build-response');
const { logger } = require('../../logger');

const buildInternalSearchResponse = async (request) => {
  const { query, page } = request.query;
  const { isUser, isNumeric, isReturnId } = parseQuery(query);

  const response = {};

  if (isReturnId) {
    const data = await search.searchReturns(query);
    buildResponse(response, 'returns', data);
  } else if (isUser) {
  // User search
    const data = await search.searchUsers(query, page);
    buildResponse(response, 'users', data);
  } else {
  // Search returns
    if (isNumeric) {
      const data = await search.searchReturns(query);
      buildResponse(response, 'returns', data);
    }
    // Search CRM documents
    const data = await search.searchDocuments(query, page);
    buildResponse(response, 'documents', data);
  }

  return response;
};
/**
 * Provides an API for internal search.
 * Internal searches for:
 * - Licences
 * - Returns
 * - Users
 */
const getInternalSearch = async (request) => {
  let response;
  try {
    // Single return
    response = buildInternalSearchResponse(request, response);
  } catch (err) {
    logger.error('Internal search error', err);
  }

  return response;
};

module.exports = {
  getInternalSearch
};
