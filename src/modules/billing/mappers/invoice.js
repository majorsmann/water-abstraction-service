'use strict';

const { omit, uniqBy } = require('lodash');

const Invoice = require('../../../lib/models/invoice');
const InvoiceAccount = require('../../../lib/models/invoice-account');

// Mappers
const address = require('./address');
const invoiceAccount = require('./invoice-account');
const invoiceLicence = require('./invoice-licence');

/**
 * @param {Object} row - camel cased
 * @return {Invoice}
 */
const dbToModel = row => {
  const invoice = new Invoice(row.billingInvoiceId);
  invoice.invoiceAccount = new InvoiceAccount(row.invoiceAccountId);
  invoice.invoiceAccount.accountNumber = row.invoiceAccountNumber;
  return invoice;
};

/**
 * Maps data from an Invoice model to the correct shape for water.billing_invoices
 * @param {Batch} batch
 * @param {Invoice} invoice
 * @return {Object}
 */
const modelToDb = (batch, invoice) => ({
  invoice_account_id: invoice.invoiceAccount.id,
  invoice_account_number: invoice.invoiceAccount.accountNumber,
  address: omit(invoice.address.toObject(), 'id'),
  billing_batch_id: batch.id
});

const getInvoiceAccountNumber = row => row.invoiceAccount.invoiceAccount.invoiceAccountNumber;

/**
 * Maps output data from charge processor into an array of unique invoice licences
 * matching the invoice account number of the supplied Invoice instance
 * @param {Invoice} invoice - invoice instance
 * @param {Array} data - processed charge versions
 * @param {Batch} batch - current batch model
 * @return {Array<InvoiceLicence>}
 */
const mapInvoiceLicences = (invoice, data, batch) => {
  // Find rows with invoice account number that match the supplied invoice
  const { accountNumber } = invoice.invoiceAccount;
  const filtered = data.filter(row => getInvoiceAccountNumber(row) === accountNumber);
  // Create array of InvoiceLicences
  const invoiceLicences = filtered.map(invoiceLicence.chargeToModel);

  // @todo attach transactions to InvoiceLicences
  // Return a unique list
  return uniqBy(invoiceLicences, invoiceLicence => invoiceLicence.uniqueId);
};

/**
 * Given an array of data output from the charge processor,
 * maps it to an array of Invoice instances
 * @param {Array} data - output from charge processor
 * @param {Batch} batch
 * @return {Array<Invoice>}
 */
const chargeToModels = (data, batch) => {
  // Create unique list of invoice accounts within data
  const rows = uniqBy(
    data.map(row => row.invoiceAccount),
    row => row.invoiceAccount.invoiceAccountId
  );

  // Map to invoice models
  return rows.map(row => {
    const invoice = new Invoice();

    // Create invoice account model
    invoice.invoiceAccount = invoiceAccount.crmToModel(row.invoiceAccount);

    // Create invoice address model
    invoice.address = address.crmToModel(row.address);

    // Create invoiceLicences array
    invoice.invoiceLicences = mapInvoiceLicences(invoice, data, batch);

    return invoice;
  });
};

exports.dbToModel = dbToModel;
exports.modelToDb = modelToDb;
exports.chargeToModels = chargeToModels;