'use strict';

const {
  experiment,
  test,
  beforeEach
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const uuid = require('uuid/v4');

const Company = require('../../../../../src/lib/models/company');
const Invoice = require('../../../../../src/lib/models/invoice');
const InvoiceAccount = require('../../../../../src/lib/models/invoice-account');
const InvoiceLicence = require('../../../../../src/lib/models/invoice-licence');
const Licence = require('../../../../../src/lib/models/licence');
const Totals = require('../../../../../src/lib/models/totals');

const apiInvoiceMapper = require('../../../../../src/modules/billing/mappers/api/invoice');

const INVOICE_ID = uuid();

const createInvoice = () => {
  const invoice = new Invoice(INVOICE_ID);
  invoice.invoiceAccount = new InvoiceAccount();
  invoice.invoiceAccount.accountNumber = 'A12345678A';
  invoice.invoiceAccount.company = new Company();
  invoice.invoiceAccount.company.name = 'Test Co Ltd.';
  invoice.invoiceLicences = [
    new InvoiceLicence()
  ];
  const licence = new Licence();
  licence.licenceNumber = '01/123/ABC';
  invoice.invoiceLicences[0].licence = licence;
  invoice.totals = new Totals();
  invoice.totals.netTotal = 3634654;
  return invoice;
};

experiment('modules/billing/mappers/api/invoice', () => {
  let result, invoice;
  beforeEach(async () => {
    invoice = createInvoice();
    result = apiInvoiceMapper.modelToBatchInvoices(invoice);
  });

  test('the model is mapped to the API response shape', async () => {
    expect(result).to.equal({
      id: INVOICE_ID,
      accountNumber: 'A12345678A',
      name: 'Test Co Ltd.',
      netTotal: 3634654,
      licenceNumbers: ['01/123/ABC']
    });
  });
});