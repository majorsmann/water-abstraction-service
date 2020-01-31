'use strict';

const { pick } = require('lodash');

const Batch = require('../../../lib/models/batch');
const FinancialYear = require('../../../lib/models/financial-year');
const region = require('./region');
const transactionMapper = require('./transaction');

/**
 * @param {Object} row - DB row, camel cased
 * @return {Batch}
 */
const dbToModel = row => {
  const batch = new Batch();
  batch.fromHash({
    id: row.billingBatchId,
    type: row.batchType,
    ...pick(row, ['season', 'status', 'dateCreated']),
    startYear: new FinancialYear(row.fromFinancialYearEnding),
    endYear: new FinancialYear(row.toFinancialYearEnding),
    region: region.dbToModel(row.region)
  });
  return batch;
};

/**
 * @param {Batch} batch
 * @return {Array<Object>} array of transactions to POST to charge module
 */
const modelToChargeModule = batch => {
  return batch.invoices.reduce((acc, invoice) => {
    invoice.invoiceLicences.forEach(invoiceLicence => {
      invoiceLicence.transactions.forEach(transaction => {
        acc.push(transactionMapper.modelToChargeModule(batch, invoice, invoiceLicence, transaction));
      });
    });
    return acc;
  }, []);
};

exports.dbToModel = dbToModel;
exports.modelToChargeModule = modelToChargeModule;