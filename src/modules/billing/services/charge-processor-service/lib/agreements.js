'use strict';

const { compact, groupBy, flatMap } = require('lodash');
const helpers = require('@envage/water-abstraction-helpers');
const dateHelpers = require('./date-helpers');
const DateRange = require('../../../../../lib/models/date-range');

const isBillingAgreement = licenceAgreement =>
  licenceAgreement.agreement.isTwoPartTariff() || licenceAgreement.agreement.isCanalAndRiversTrust();

const getPropertyKey = licenceAgreement => {
  const { agreement } = licenceAgreement;
  if (agreement.isTwoPartTariff()) {
    return 'section127Agreement';
  }
  if (agreement.isCanalAndRiversTrust()) {
    return 'section130Agreement';
  }
};

const mapAgreement = licenceAgreement => ({
  startDate: licenceAgreement.dateRange.startDate,
  endDate: licenceAgreement.dateRange.endDate,
  [getPropertyKey(licenceAgreement)]: licenceAgreement.agreement
});

const mapHistoryRow = row => {
  const agreements = compact([row.section127Agreement, row.section130Agreement])
    .map(row => row.section127Agreement || row.section130Agreement);

  return {
    dateRange: new DateRange(row.startDate, row.endDate),
    agreements
  };
};

/**
 * Gets a history of agreements for the charge period taking into account
 * licence agreements
 * @param {DateRange} chargePeriod
 * @param {Array<LicenceAgreement>} licenceAgreements
 * @return {Array}
 */
const getAgreementsHistory = (chargePeriod, licenceAgreements) => {
  // Filter out agreements that are not S127/S130 as they don't affect charging
  const filtered = licenceAgreements
    .filter(isBillingAgreement);

  // Group by agreement type as each has its own timeline
  const groups = groupBy(filtered, getPropertyKey);

  // Create a combined history by applying the agreements history in each group
  const history = Object.keys(groups).reduce((acc, key) => {
    const history = helpers.charging.mergeHistory(groups[key].map(mapAgreement));

    const arr = acc
      .map(row => helpers.charging.dateRangeSplitter(row, history, key));

    return flatMap(arr).map(dateHelpers.applyEffectiveDates);
  }, [chargePeriod.toJSON()]);

  // Map to a simple structure
  return history.map(mapHistoryRow);
};

exports.getAgreementsHistory = getAgreementsHistory;
