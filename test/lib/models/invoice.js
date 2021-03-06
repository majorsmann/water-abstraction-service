'use strict';

const { experiment, test, beforeEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const Invoice = require('../../../src/lib/models/invoice');
const InvoiceAccount = require('../../../src/lib/models/invoice-account');
const Address = require('../../../src/lib/models/address');
const InvoiceLicence = require('../../../src/lib/models/invoice-licence');
const Licence = require('../../../src/lib/models/licence');

const TEST_GUID = 'add1cf3b-7296-4817-b013-fea75a928580';

class TestClass {

}
const TEST_MODEL = new TestClass();

experiment('lib/models/invoice', () => {
  let invoice;

  beforeEach(async () => {
    invoice = new Invoice();
  });

  experiment('construction', () => {
    test('can include an id in the constructor', async () => {
      const inv = new Invoice(TEST_GUID);
      expect(inv.id).to.equal(TEST_GUID);
    });

    test('can omit the id in the constructor', async () => {
      const inv = new Invoice();
      expect(inv.id).to.be.undefined();
    });
  });

  experiment('.id', () => {
    test('can be set to a guid string', async () => {
      invoice.id = TEST_GUID;
      expect(invoice.id).to.equal(TEST_GUID);
    });

    test('throws an error if set to a non-guid string', async () => {
      const func = () => {
        invoice.id = 'hey';
      };
      expect(func).to.throw();
    });
  });

  experiment('.invoiceAccount', () => {
    let invoiceAccount;

    beforeEach(async () => {
      invoiceAccount = new InvoiceAccount();
    });
    test('can be set to an InvoiceAccount instance', async () => {
      invoice.invoiceAccount = invoiceAccount;
      expect(invoice.invoiceAccount).to.equal(invoiceAccount);
    });

    test('throws an error if set to the wrong model type', async () => {
      const func = () => {
        invoice.invoiceAccount = TEST_MODEL;
      };
      expect(func).to.throw();
    });
  });

  experiment('.address', () => {
    let address;

    beforeEach(async () => {
      address = new Address();
    });
    test('can be set to an Address instance', async () => {
      invoice.address = address;
      expect(invoice.address).to.equal(address);
    });

    test('throws an error if set to the wrong model type', async () => {
      const func = () => {
        invoice.address = TEST_MODEL;
      };
      expect(func).to.throw();
    });
  });

  experiment('.getLicenceNumbers', () => {
    test('returns the licence numbers as an array', async () => {
      const licence1 = new Licence();
      const licence2 = new Licence();
      const licence3 = new Licence();
      licence1.licenceNumber = 'LIC1';
      licence2.licenceNumber = 'LIC2';
      licence3.licenceNumber = 'LIC3';

      const invoiceLicence1 = new InvoiceLicence();
      const invoiceLicence2 = new InvoiceLicence();
      const invoiceLicence3 = new InvoiceLicence();

      invoiceLicence1.licence = licence1;
      invoiceLicence2.licence = licence2;
      invoiceLicence3.licence = licence3;

      const invoice = new Invoice();
      invoice.invoiceLicences = [invoiceLicence1, invoiceLicence2, invoiceLicence3];

      expect(invoice.getLicenceNumbers()).to.equal(['LIC1', 'LIC2', 'LIC3']);
    });

    test('returns an empty array if there is no licence data', async () => {
      const invoice = new Invoice();
      expect(invoice.getLicenceNumbers()).to.equal([]);
    });
  });
});
