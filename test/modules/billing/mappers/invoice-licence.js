'use strict';

const {
  experiment,
  test,
  beforeEach
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const uuid = require('uuid/v4');

const invoiceLicenceMapper = require('../../../../src/modules/billing/mappers/invoice-licence');

const InvoiceLicence = require('../../../../src/lib/models/invoice-licence');
const Address = require('../../../../src/lib/models/address');
const Company = require('../../../../src/lib/models/company');
const Contact = require('../../../../src/lib/models/contact-v2');
const Region = require('../../../../src/lib/models/region');

experiment('modules/billing/mappers/invoice-licence', () => {
  experiment('.dbToModel', () => {
    let result;
    experiment('when there is no contact ID', () => {
      const dbRow = {
        billingInvoiceLicenceId: '4e44ea0b-62fc-4a3d-82ed-6ff563f1e39b',
        companyId: '40283a80-766f-481f-ba54-484ac0b7ea6d',
        addressId: '399282c3-f9b4-4a4b-af1b-0019e040ad61'
      };

      beforeEach(async () => {
        result = invoiceLicenceMapper.dbToModel(dbRow);
      });

      test('returns an instance of InvoiceLicence with correct ID', async () => {
        expect(result instanceof InvoiceLicence).to.be.true();
        expect(result.id).to.equal(dbRow.billingInvoiceLicenceId);
      });

      test('the invoiceLicence has a company with correct ID', async () => {
        expect(result.company instanceof Company).to.be.true();
        expect(result.company.id).to.equal(dbRow.companyId);
      });

      test('the invoiceLicence has an address with correct ID', async () => {
        expect(result.address instanceof Address).to.be.true();
        expect(result.address.id).to.equal(dbRow.addressId);
      });

      test('the contact is not set', async () => {
        expect(result.contact).to.be.undefined();
      });
    });

    experiment('when there contact ID is set', () => {
      const dbRow = {
        billingInvoiceLicenceId: '4e44ea0b-62fc-4a3d-82ed-6ff563f1e39b',
        companyId: '40283a80-766f-481f-ba54-484ac0b7ea6d',
        addressId: '399282c3-f9b4-4a4b-af1b-0019e040ad61',
        contactId: 'b21a7769-942e-4166-a787-a16701f25e4e'
      };

      beforeEach(async () => {
        result = invoiceLicenceMapper.dbToModel(dbRow);
      });

      test('the invoiceLicence has a contact with correct ID', async () => {
        expect(result.contact instanceof Contact).to.be.true();
        expect(result.contact.id).to.equal(dbRow.contactId);
      });
    });
  });

  experiment('.chargeToModel', () => {
    let mappedInvoiceLicence;
    let batch;
    let data;

    beforeEach(async () => {
      data = {
        chargeElements: [],
        chargeVersion: {
          licenceId: uuid(),
          licenceRef: '123/321'
        },
        licenceHolder: {
          company: {
            companyId: uuid(),
            name: 'Wheat Co'
          },
          address: {
            addressId: uuid(),
            address1: 'Add One',
            address2: 'Add Two',
            address3: null,
            address4: null,
            town: 'Add Town',
            county: 'Add County',
            postcode: 'AD1 1AD',
            country: null
          },
          contact: {
            salutation: 'Ms',
            lastName: 'Teek'
          }
        }
      };
      batch = {
        region: new Region().fromHash({ code: 'A ' })
      };
      mappedInvoiceLicence = invoiceLicenceMapper.chargeToModel(data, batch);
    });

    test('maps the licence', async () => {
      const { licence } = mappedInvoiceLicence;
      expect(licence.id).to.equal(data.chargeVersion.licenceId);
      expect(licence.licenceNumber).to.equal(data.chargeVersion.licenceRef);
      expect(licence.region.code).to.equal(batch.region.code);
    });

    test('maps the company', async () => {
      const { company } = mappedInvoiceLicence;
      expect(company.id).to.equal(data.licenceHolder.company.companyId);
      expect(company.name).to.equal(data.licenceHolder.company.name);
    });

    test('maps the address', async () => {
      const { address } = mappedInvoiceLicence;
      expect(address.id).to.equal(data.licenceHolder.address.addressId);
      expect(address.addressLine1).to.equal(data.licenceHolder.address.address1);
      expect(address.addressLine2).to.equal(data.licenceHolder.address.address2);
      expect(address.addressLine3).to.equal(data.licenceHolder.address.address3);
      expect(address.addressLine4).to.equal(data.licenceHolder.address.address4);
      expect(address.town).to.equal(data.licenceHolder.address.town);
      expect(address.county).to.equal(data.licenceHolder.address.county);
      expect(address.postcode).to.equal(data.licenceHolder.address.postcode);
      expect(address.country).to.equal(data.licenceHolder.address.country);
    });

    test('maps the contact', async () => {
      const { contact } = mappedInvoiceLicence;
      expect(contact.salutation).to.equal(data.licenceHolder.contact.salutation);
      expect(contact.lastName).to.equal(data.licenceHolder.contact.lastName);
    });
  });
});
