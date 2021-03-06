'use strict';

const { experiment, test, beforeEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const ChargeVersion = require('../../../src/lib/models/charge-version');
const ChargeElement = require('../../../src/lib/models/charge-element');

const DateRange = require('../../../src/lib/models/date-range');
const Licence = require('../../../src/lib/models/licence');
const Region = require('../../../src/lib/models/region');
const Company = require('../../../src/lib/models/company');
const InvoiceAccount = require('../../../src/lib/models/invoice-account');

const TEST_GUID = 'add1cf3b-7296-4817-b013-fea75a928580';

class TestModel {};

experiment('lib/models/charge-version', () => {
  let chargeVersion;

  beforeEach(async () => {
    chargeVersion = new ChargeVersion();
  });

  experiment('.id', () => {
    test('can be set to a guid string', async () => {
      chargeVersion.id = TEST_GUID;
      expect(chargeVersion.id).to.equal(TEST_GUID);
    });

    test('throws an error if set to a non-guid string', async () => {
      const func = () => {
        chargeVersion.id = 'hey';
      };
      expect(func).to.throw();
    });
  });

  experiment('.licence', () => {
    test('can be set to a Licence instance', async () => {
      const licence = new Licence();
      chargeVersion.licence = licence;
      expect(chargeVersion.licence).to.equal(licence);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        chargeVersion.licence = new TestModel();
      };
      expect(func).to.throw();
    });
  });

  experiment('.scheme', () => {
    ['alcs', 'sroc'].forEach(scheme => {
      test(`can be set to "${scheme}"`, async () => {
        chargeVersion.scheme = scheme;
        expect(chargeVersion.scheme).to.equal(scheme);
      });
    });

    test('throws an error if set to a different scheme', async () => {
      const func = () => {
        chargeVersion.scheme = 'not-a-valid-scheme';
      };
      expect(func).to.throw();
    });
  });

  experiment('.versionNumber', () => {
    test('can be set to a positive integer', async () => {
      chargeVersion.versionNumber = 1;
      expect(chargeVersion.versionNumber).to.equal(1);
    });

    test('throws an error if set to a different type', async () => {
      const func = () => {
        chargeVersion.versionNumber = 'not-an-integer';
      };
      expect(func).to.throw();
    });

    test('throws an error if set to zero', async () => {
      const func = () => {
        chargeVersion.versionNumber = 0;
      };
      expect(func).to.throw();
    });

    test('throws an error if set to a negative integer', async () => {
      const func = () => {
        chargeVersion.versionNumber = -56;
      };
      expect(func).to.throw();
    });

    test('throws an error if set to a float', async () => {
      const func = () => {
        chargeVersion.versionNumber = 44.23;
      };
      expect(func).to.throw();
    });
  });

  experiment('.dateRange', () => {
    test('can be set to a DateRange instance', async () => {
      const dateRange = new DateRange('2019-09-01', null);
      chargeVersion.dateRange = dateRange;
      expect(chargeVersion.dateRange).to.equal(dateRange);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        chargeVersion.dateRange = new TestModel();
      };
      expect(func).to.throw();
    });
  });

  experiment('.status', () => {
    ['draft', 'current', 'superseded'].forEach(status => {
      test(`can be set to "${status}"`, async () => {
        chargeVersion.status = status;
        expect(chargeVersion.status).to.equal(status);
      });
    });

    test('throws an error if set to a different status', async () => {
      const func = () => {
        chargeVersion.status = 'not-a-valid-status';
      };
      expect(func).to.throw();
    });
  });

  experiment('.region', () => {
    test('can be set to a Region instance', async () => {
      const region = new Region();
      chargeVersion.region = region;
      expect(chargeVersion.region).to.equal(region);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        chargeVersion.region = new TestModel();
      };
      expect(func).to.throw();
    });
  });

  experiment('.source', () => {
    ['nald', 'wrls'].forEach(source => {
      test(`can be set to "${source}"`, async () => {
        chargeVersion.source = source;
        expect(chargeVersion.source).to.equal(source);
      });
    });

    test('throws an error if set to a different source', async () => {
      const func = () => {
        chargeVersion.source = 'not-a-valid-source';
      };
      expect(func).to.throw();
    });
  });

  experiment('.company', () => {
    test('can be set to a Company instance', async () => {
      const company = new Company();
      chargeVersion.company = company;
      expect(chargeVersion.company).to.equal(company);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        chargeVersion.company = new TestModel();
      };
      expect(func).to.throw();
    });
  });

  experiment('.invoiceAccount', () => {
    test('can be set to a InvoiceAccount instance', async () => {
      const invoiceAccount = new InvoiceAccount();
      chargeVersion.invoiceAccount = invoiceAccount;
      expect(chargeVersion.invoiceAccount).to.equal(invoiceAccount);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        chargeVersion.invoiceAccount = new TestModel();
      };
      expect(func).to.throw();
    });
  });

  experiment('.chargeElements', () => {
    test('can be set to an array of charge elements', async () => {
      const chargeElements = [new ChargeElement()];
      chargeVersion.chargeElements = chargeElements;
      expect(chargeVersion.chargeElements).to.equal(chargeElements);
    });

    test('throws an error if set to a different model type', async () => {
      const func = () => {
        const notChargeElements = [new TestModel()];
        chargeVersion.chargeElements = notChargeElements;
      };
      expect(func).to.throw();
    });
  });
});
