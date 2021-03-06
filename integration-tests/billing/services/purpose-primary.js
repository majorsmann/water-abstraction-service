'use strict';

const chargeElementsData = require('./data/charge-elements');
const purposePrimaryData = require('./data/purpose-primary');

const { bookshelf } = require('../../../src/lib/connectors/bookshelf');
const PurposePrimary = require('../../../src/lib/connectors/bookshelf/PurposePrimary');

const insertQuery = `
  insert into water.purposes_primary (legacy_id, description, date_created)
  values (:legacy_id, :description, now())
  on conflict (legacy_id) do nothing;
`;

/**
 * Creates a purpose use if it does not exist
 * @param {String} code - purpose ID
 * @return {Promise}
 */
const create = code => bookshelf.knex.raw(insertQuery, purposePrimaryData[code]);

const getByLegacyId = id => PurposePrimary.forge({ legacy_id: id }).fetch();

/**
 * Creates a purpose for the charge element specified
 * @param {String} key - charge element key
 */
const createForChargeElement = async key => {
  const code = chargeElementsData[key].purposePrimary;
  await create(code);
  return getByLegacyId(code);
};

exports.createForChargeElement = createForChargeElement;
