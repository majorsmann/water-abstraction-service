const { set } = require('lodash');
const twoPartTariffMatching = require('./two-part-tariff-matching');
const returnHelpers = require('./returns-helpers');
const Purpose = require('../../../../lib/models/purpose');

const decorateWithResultsContainingData = (overallError, data, transactions) => {
  for (const result of data) {
    const { error, data: { chargeElementId, actualReturnQuantity } } = result;
    const transaction = transactions.find(transaction => transaction.chargeElement.id === chargeElementId);

    const twoPartTariffStatus = overallError || error;
    transaction.fromHash({
      twoPartTariffStatus: twoPartTariffStatus,
      twoPartTariffError: !!twoPartTariffStatus,
      calculatedVolume: actualReturnQuantity,
      volume: twoPartTariffStatus ? null : actualReturnQuantity
    });
  };

  return transactions;
};

const decorateWithResultsNotContainingData = (overallError, transactions) => {
  for (const transaction of transactions) {
    transaction.fromHash({
      twoPartTariffStatus: overallError,
      twoPartTariffError: !!overallError,
      volume: null,
      calculatedVolume: null
    });
  }
  return transactions;
};
/**
 * Incorporates output of returns algorithm with charge element data
 *
 * @param {Array} matchingResults Output from returns matching algorithm
 * @param {ChargeVersion} chargeVersion
 * @return {chargeVersion} including returns matching results
 */
const decorateTransactionsWithMatchingResults = (matchingResults, invoiceLicence) => {
  const { error: overallError, data } = matchingResults;
  const { transactions } = invoiceLicence;
  if (data) return decorateWithResultsContainingData(overallError, data, transactions);
  return decorateWithResultsNotContainingData(overallError, transactions);
};

const fixPurpose = chargeElement => ({
  type: Purpose.PURPOSE_TYPES.use,
  name: 'Spray irrigation',
  code: '420'
});

const getChargeElementsForMatching = transactions => transactions.map(trans =>
  ({
    ...trans.chargeElement.toJSON(),
    startDate: trans.chargePeriod.startDate,
    endDate: trans.chargePeriod.endDate,
    totalDays: trans.authorisedDays,
    billableDays: trans.billableDays,
    // @TODO: REMOVE FIXED PURPOSE
    // remove once using bookshelf to retrieve charge element data
    purposeUse: fixPurpose(trans.chargeElement)
  }));

/**
 * Process returns matching for given invoice licence
 *
 * @param {Batch} batch
 * @param {InvoiceLicence} invoiceLicence
 * @return {Batch} including returns matching results in transactions
 */
const processReturnsMatching = async (batch, invoiceLicence) => {
  const { licence, transactions } = invoiceLicence;
  const returnsForLicence = await returnHelpers.getReturnsForMatching(licence, batch);

  return twoPartTariffMatching.matchReturnsToChargeElements(getChargeElementsForMatching(transactions), returnsForLicence);
};

const processBatch = async batch => {
  for (const invoice of batch.invoices) {
    for (const invoiceLicence of invoice.invoiceLicences) {
      const matchingResults = await processReturnsMatching(batch, invoiceLicence);

      set(invoiceLicence, 'transactions', decorateTransactionsWithMatchingResults(matchingResults, invoiceLicence));
    }
  }

  return batch;
};

exports.processBatch = processBatch;