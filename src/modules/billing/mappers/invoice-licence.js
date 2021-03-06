'use strict';

const { get } = require('lodash');

const Address = require('../../../lib/models/address');
const Company = require('../../../lib/models/company');
const Contact = require('../../../lib/models/contact-v2');

const InvoiceLicence = require('../../../lib/models/invoice-licence');

// Mappers
const transaction = require('./transaction');
const licence = require('../../../lib/mappers/licence');

/**
 * Maps a row of data from water.billing_invoice_licences
 * to an InvoiceLicence model
 * @param {Object} row - camel cased
 * @return {InvoiceLicence}
 */
const dbToModel = row => {
  const invoiceLicence = new InvoiceLicence(row.billingInvoiceLicenceId);

  // @todo suggest we serialise company, address and contact to jsonb fields in table
  invoiceLicence.company = new Company(row.companyId);
  invoiceLicence.address = new Address(row.addressId);
  invoiceLicence.address.fromHash(row.licenceHolderAddress);

  if (row.contactId) {
    invoiceLicence.contact = new Contact(row.contactId);
  }
  if (row.billingTransactions) {
    invoiceLicence.transactions = row.billingTransactions.map(transaction.dbToModel);
  }
  if (row.licence) {
    invoiceLicence.licence = licence.dbToModel(row.licence);
  }
  invoiceLicence.invoiceId = row.billingInvoiceId;
  return invoiceLicence;
};

/**
 * Maps data from an InvoiceLicence model to the correct shape for water.billing_invoice_licences
 * @param {Batch} batch
 * @param {Invoice} invoice
 * @return {Object}
 */
const modelToDb = (invoice, invoiceLicence) => {
  // Map data to new row in water.billing_invoice_licences
  // @todo - it feels odd here writing either a contact or a company object
  // suggest we expand the table to include company and contact fields and write both separately
  const licenceHolder = invoiceLicence.contact ? invoiceLicence.contact.toJSON() : invoiceLicence.company.toJSON();

  return {
    billingInvoiceId: invoice.id,
    companyId: invoiceLicence.company.id,
    contactId: get(invoiceLicence, 'contact.id', null),
    addressId: invoiceLicence.address.id,
    licenceRef: invoiceLicence.licence.licenceNumber,
    licenceHolderName: licenceHolder,
    licenceHolderAddress: invoiceLicence.address.toObject(),
    licenceId: invoiceLicence.licence.id
  };
};

exports.dbToModel = dbToModel;
exports.modelToDB = modelToDb;
