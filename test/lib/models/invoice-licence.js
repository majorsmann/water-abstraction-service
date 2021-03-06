'use strict';

const { experiment, test, beforeEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const uuid = require('uuid/v4');

const InvoiceLicence = require('../../../src/lib/models/invoice-licence');
const Address = require('../../../src/lib/models/address');
const Company = require('../../../src/lib/models/company');
const Licence = require('../../../src/lib/models/licence');
const Contact = require('../../../src/lib/models/contact-v2');
const Transaction = require('../../../src/lib/models/transaction');
const Role = require('../../../src/lib/models/role');

const createData = () => {
  const licence = new Licence();
  licence.licenceNumber = '01/123';

  const company = new Company();
  company.id = '8e1052db-08e0-4b21-bce0-c3497892a890';

  const contact = new Contact();
  contact.id = '276fc2f4-bfe0-45a9-8fdb-6bf0d481b7ea';

  const address = new Address();
  address.id = '11c0fdc8-0645-45a1-86e3-5413d4a203ba';

  return {
    id: 'bc9541fc-bc20-4cf4-a72e-412795748e5d',
    invoiceId: 'abdc7d1d-3389-48d3-991e-1eeedacc6a59',
    licence,
    company,
    contact,
    address
  };
};

experiment('lib/models/invoice-licence', () => {
  let invoiceLicence, data;

  beforeEach(async () => {
    data = createData();
    invoiceLicence = new InvoiceLicence();
  });

  experiment('.id', () => {
    test('can be set to a guid string', async () => {
      invoiceLicence.id = data.id;
      expect(invoiceLicence.id).to.equal(data.id);
    });

    test('throws an error if set to a non-guid string', async () => {
      const func = () => {
        invoiceLicence.id = 'hey';
      };
      expect(func).to.throw();
    });
  });

  experiment('.licence', () => {
    test('can be set to a Licence instance', async () => {
      invoiceLicence.licence = data.licence;
      expect(invoiceLicence.licence).to.equal(data.licence);
    });

    test('throws an error if set to an invalid type', async () => {
      const func = () => {
        invoiceLicence.licence = '01/234/ABC';
      };
      expect(func).to.throw();
    });
  });

  experiment('.company', () => {
    test('can be set to a Company instance', async () => {
      invoiceLicence.company = data.company;
      expect(invoiceLicence.company).to.equal(data.company);
    });

    test('throws an error if set to an invalid type', async () => {
      const func = () => {
        invoiceLicence.company = data.licence;
      };
      expect(func).to.throw();
    });
  });

  experiment('.contact', () => {
    test('can be set to a Contact instance', async () => {
      invoiceLicence.contact = data.contact;
      expect(invoiceLicence.contact).to.equal(data.contact);
    });

    test('throws an error if set to an invalid type', async () => {
      const func = () => {
        invoiceLicence.contact = data.company;
      };
      expect(func).to.throw();
    });
  });

  experiment('.address', () => {
    test('can be set to a Address instance', async () => {
      invoiceLicence.address = data.address;
      expect(invoiceLicence.address).to.equal(data.address);
    });

    test('throws an error if set to an invalid type', async () => {
      const func = () => {
        invoiceLicence.address = data.company;
      };
      expect(func).to.throw();
    });
  });

  experiment('.uniqueId', () => {
    beforeEach(async () => {
      invoiceLicence.licence = data.licence;
      invoiceLicence.company = data.company;
      invoiceLicence.address = data.address;
      invoiceLicence.contact = data.contact;
    });

    test('returns a string', async () => {
      expect(invoiceLicence.uniqueId).to.be.a.string();
    });

    test('string is a composite of licence number, company ID, address ID and contact ID', async () => {
      expect(invoiceLicence.uniqueId).to.equal(
        '01/123.8e1052db-08e0-4b21-bce0-c3497892a890.11c0fdc8-0645-45a1-86e3-5413d4a203ba.276fc2f4-bfe0-45a9-8fdb-6bf0d481b7ea'
      );
    });
  });

  experiment('.set transactions', () => {
    test('throws for an array containing items other than Transaction objects', async () => {
      const func = () => (invoiceLicence.transactions = ['one', 'two']);
      expect(func).to.throw();
    });

    test('throws for non array', async () => {
      const func = () => (invoiceLicence.transactions = 'one');
      expect(func).to.throw();
    });

    test('sets the value when passed an array of Transaction objects', async () => {
      const tx1 = new Transaction();
      const tx2 = new Transaction();
      invoiceLicence.transactions = [tx1, tx2];
      expect(invoiceLicence.transactions).to.have.length(2);
      expect(invoiceLicence.transactions[0]).to.equal(tx1);
      expect(invoiceLicence.transactions[1]).to.equal(tx2);
    });
  });

  experiment('.roles', () => {
    test('throws for an array containing items other than Role objects', async () => {
      const func = () => (invoiceLicence.roles = [new Role(), 'two']);
      expect(func).to.throw();
    });

    test('throws for non array', async () => {
      const func = () => (invoiceLicence.roles = 'one');
      expect(func).to.throw();
    });

    test('sets the value when passed an array of Role objects', async () => {
      const tx1 = new Role();
      const tx2 = new Role();
      invoiceLicence.roles = [tx1, tx2];
      expect(invoiceLicence.roles).to.have.length(2);
      expect(invoiceLicence.roles[0]).to.equal(tx1);
      expect(invoiceLicence.roles[1]).to.equal(tx2);
    });
  });

  experiment('.toJSON', () => {
    test('returns the expected object', async () => {
      const transaction = new Transaction();
      transaction.id = uuid();
      transaction.value = 123;

      const data = createData();

      invoiceLicence.id = data.id;
      invoiceLicence.licence = data.licence;
      invoiceLicence.company = data.company;
      invoiceLicence.contact = data.contact;
      invoiceLicence.address = data.address;
      invoiceLicence.transactions = [transaction];

      const json = invoiceLicence.toJSON();

      expect(json.id).to.equal(data.id);
      expect(json.licence.licenceNumber).to.equal(data.licence.licenceNumber);
      expect(json.company.id).to.equal(data.company.id);
      expect(json.contact.id).to.equal(data.contact.id);
      expect(json.address.id).to.equal(data.address.id);
      expect(json.transactions[0].id).to.equal(transaction.id);
      expect(json.transactions[0].value).to.equal(transaction.value);
    });
  });

  experiment('.invoiceId', () => {
    test('can be set to a guid string', async () => {
      invoiceLicence.invoiceId = data.invoiceId;
      expect(invoiceLicence.invoiceId).to.equal(data.invoiceId);
    });

    test('throws an error if set to a non-guid string', async () => {
      const func = () => {
        invoiceLicence.invoiceId = 'hey';
      };
      expect(func).to.throw();
    });
  });
});
