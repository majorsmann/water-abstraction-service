'use strict';

const data = require('./data');
const { bookshelf } = require('../../../src/lib/connectors/bookshelf');
const PurposeUse = require('../../../src/lib/connectors/bookshelf/PurposeUse');

const insertQuery = `
  insert into water.purposes_uses (
    legacy_id, description, loss_factor, is_two_part_tariff, date_created
  )
  values (
    :legacy_id, :description, :lossFactor, :isTwoPartTariff, now()
  )
  on conflict (legacy_id) do nothing;
`;

/**
 * Creates a purpose use if it does not exist
 * @param {String} code - purpose ID
 * @return {Promise}
 */
const create = code => bookshelf.knex.raw(insertQuery, data.purposeUses[code]);

const getByLegacyId = id => PurposeUse.forge({ legacy_id: id }).fetch();

/**
 * Creates a purpose for the charge element specified
 * @param {String} key - charge element key
 */
const createForChargeElement = async key => {
  const code = data.chargeElements[key].purposeUse;
  await create(code);
  return getByLegacyId(code);
};

exports.createForChargeElement = createForChargeElement;
