const { pick } = require('lodash');
const BillingVolume = require('../../../lib/models/billing-volume');
const FinancialYear = require('../../../lib/models/financial-year');
const userMapper = require('./user');

const dbToModel = row => {
  const billingVolume = new BillingVolume();
  return billingVolume.fromHash({
    id: row.billingVolumeId,
    ...pick(row, ['chargeElementId', 'isSummer', 'calculatedVolume', 'twoPartTariffError',
      'twoPartTariffStatus', 'isApproved', 'volume']),
    financialYear: new FinancialYear(row.financialYear),
    twoPartTariffReview: userMapper.mapToModel(row.twoPartTariffReview)
  });
};

const matchingResultsToDb = (matchingResults, financialYear, isSummer, billingBatchId) => {
  const { error: overallError } = matchingResults;
  return matchingResults.data.map(result => {
    const twoPartTariffStatus = overallError || result.error;
    return {
      chargeElementId: result.data.chargeElementId,
      financialYear,
      isSummer,
      calculatedVolume: result.data.actualReturnQuantity,
      volume: result.data.actualReturnQuantity,
      twoPartTariffStatus: twoPartTariffStatus,
      twoPartTariffError: !!twoPartTariffStatus,
      isApproved: false,
      billingBatchId
    };
  });
};

exports.dbToModel = dbToModel;
exports.matchingResultsToDb = matchingResultsToDb;
