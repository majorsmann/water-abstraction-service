const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const uuid = require('uuid/v4');

const { bookshelf, BillingInvoice } = require('../../../../src/lib/connectors/bookshelf');
const queries = require('../../../../src/lib/connectors/repos/queries/billing-invoices');

const billingInvoices = require('../../../../src/lib/connectors/repos/billing-invoices');

const result = {
  rows: [{
    billing_invoice_id: 'test-invoice-id'
  }]
};

experiment('lib/connectors/repos/billing-invoices', () => {
  let model, stub;

  beforeEach(async () => {
    sandbox.stub(bookshelf.knex, 'raw').resolves(result);

    model = {
      toJSON: sandbox.stub().returns({ foo: 'bar' })
    };

    stub = {
      fetch: sandbox.stub().resolves(model),
      orderBy: sandbox.stub().returnsThis(),
      fetchPage: sandbox.stub().resolves(model),
      where: sandbox.stub().returnsThis(),
      save: sandbox.stub().resolves(model),
      destroy: sandbox.stub().resolves(model)
    };

    sandbox.stub(BillingInvoice, 'forge').returns(stub);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.upsert', () => {
    let result;

    beforeEach(async () => {
      result = await billingInvoices.upsert({
        invoiceAccountId: 'test-invoice-account-id'
      });
    });

    test('calls knex.raw with the correct arguments', async () => {
      const [query, params] = bookshelf.knex.raw.lastCall.args;
      expect(query).to.equal(queries.upsert);
      expect(params).to.equal({
        invoiceAccountId: 'test-invoice-account-id'
      });
    });

    test('returns the first found row with camelCased keys', async () => {
      expect(result).to.equal({
        billingInvoiceId: 'test-invoice-id'
      });
    });
  });

  experiment('.deleteEmptyBatchById', () => {
    beforeEach(async () => {
      await billingInvoices.deleteEmptyByBatchId('test-batch-id');
    });

    test('calls knex.raw with the correct arguments', async () => {
      const [query, params] = bookshelf.knex.raw.lastCall.args;
      expect(query).to.equal(queries.deleteEmptyByBatchId);
      expect(params).to.equal({
        batchId: 'test-batch-id'
      });
    });
  });

  experiment('.findOne', () => {
    let result;

    beforeEach(async () => {
      model.toJSON.returns({ foo: 'bar' });
      result = await billingInvoices.findOne('test-id');
    });

    test('calls model.forge with correct id', async () => {
      const [params] = BillingInvoice.forge.lastCall.args;
      expect(params).to.equal({ billingInvoiceId: 'test-id' });
    });

    test('calls fetch() with related models', async () => {
      const [params] = stub.fetch.lastCall.args;
      expect(params.withRelated).to.equal([
        'billingBatch',
        'billingBatch.region',
        'billingInvoiceLicences',
        'billingInvoiceLicences.licence',
        'billingInvoiceLicences.licence.region',
        'billingInvoiceLicences.billingTransactions',
        'billingInvoiceLicences.billingTransactions.billingVolume',
        'billingInvoiceLicences.billingTransactions.chargeElement',
        'billingInvoiceLicences.billingTransactions.chargeElement.purposeUse'
      ]);
    });

    test('calls toJSON() on returned models', async () => {
      expect(model.toJSON.callCount).to.equal(1);
    });

    test('returns the result of the toJSON() call', async () => {
      expect(result).to.equal({ foo: 'bar' });
    });
  });

  experiment('.deleteByBatchId', () => {
    const batchId = 'test-batch-id';

    beforeEach(async () => {
      await billingInvoices.deleteByBatchId(batchId);
    });

    test('calls forge() on the model', async () => {
      expect(BillingInvoice.forge.called).to.be.true();
    });

    test('calls where() with the correct params', async () => {
      const [params] = stub.where.lastCall.args;
      expect(params).to.equal({ billing_batch_id: batchId });
    });

    test('calls destroy() to delete found records', async () => {
      expect(stub.destroy.called).to.be.true();
    });
  });

  experiment('.delete', async () => {
    const billingInvoiceId = uuid();

    beforeEach(async () => {
      await billingInvoices.delete(billingInvoiceId);
    });

    test('the model is forged with correct params', async () => {
      expect(BillingInvoice.forge.calledWith({
        billingInvoiceId
      })).to.be.true();
    });

    test('the model is destroyed', async () => {
      expect(stub.destroy.called).to.be.true();
    });
  });
});
