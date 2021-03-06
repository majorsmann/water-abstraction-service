'use strict';

const Hapi = require('@hapi/hapi');
const uuid = require('uuid/v4');
const { cloneDeep } = require('lodash');

const { expect } = require('@hapi/code');
const { experiment, test, beforeEach } = exports.lab = require('@hapi/lab').script();

const routes = require('../../../src/modules/billing/routes');
const preHandlers = require('../../../src/modules/billing/pre-handlers');

/**
 * Creates a test Hapi server that has no other plugins loaded,
 * does not require auth and will rewrite the handler function to
 * return a test stub.
 *
 * This allows the route validation to be tested in isolation.
 *
 * @param {Object} route The route to test
 */
const getServer = route => {
  const server = Hapi.server({ port: 80 });

  const testRoute = cloneDeep(route);
  testRoute.handler = (req, h) => h.response('Test handler').code(200);
  testRoute.config.pre = [];
  server.route(testRoute);
  return server;
};

experiment('modules/billing/routes', () => {
  experiment('postCreateBatch', () => {
    let request;
    let server;

    beforeEach(async () => {
      server = getServer(routes.postCreateBatch);

      request = {
        method: 'POST',
        url: '/water/1.0/billing/batches',
        payload: {
          userEmail: 'charging@example.com',
          regionId: '054517f2-be00-4505-a3cc-df65a89cd8e1',
          batchType: 'annual',
          financialYearEnding: 2019,
          isSummer: true
        }
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the userEmail is not a valid email', async () => {
      request.payload.userEmail = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the userEmail is omitted', async () => {
      delete request.payload.userEmail;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the regionId is not a uuid', async () => {
      request.payload.regionId = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the regionId is omitted', async () => {
      delete request.payload.regionId;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the batchType is an unexpected value', async () => {
      request.payload.batchType = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the batchType is omitted', async () => {
      delete request.payload.batchType;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the financialYear is not a number', async () => {
      request.payload.financialYearEnding = false;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the financialYear is omitted', async () => {
      delete request.payload.financialYearEnding;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the isSummer is an unexpected value', async () => {
      request.payload.isSummer = 'nope';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 200 if the isSummer is omitted (defaults to false)', async () => {
      delete request.payload.isSummer;

      const response = await server.inject(request);

      expect(response.statusCode).to.equal(200);
      expect(response.request.payload.isSummer).to.equal(false);
    });
  });

  experiment('getBatch', () => {
    let request;
    let server;
    let validId;

    beforeEach(async () => {
      server = getServer(routes.getBatch);
      validId = '00000000-0000-0000-0000-000000000000';
      request = {
        method: 'GET',
        url: `/water/1.0/billing/batches/${validId}`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.getBatch.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });

  experiment('getBatches', () => {
    let request;
    let server;

    beforeEach(async () => {
      server = getServer(routes.getBatches);

      request = {
        method: 'GET',
        url: '/water/1.0/billing/batches'
      };
    });

    test('returns 200 with no query params payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns 200 when pagination params are added to the query string', async () => {
      request.url += '?page=1&perPage=10';

      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the page is not an integer', async () => {
      request.url += '?page=___one___&perPage=10';

      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the perPage param is not an integer', async () => {
      request.url += '?page=1&perPage=___ten___';

      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });
  });

  experiment('getBatchInvoices', () => {
    let request;
    let server;
    let validId;

    beforeEach(async () => {
      server = getServer(routes.getBatchInvoices);
      validId = '00000000-0000-0000-0000-000000000000';
      request = {
        method: 'GET',
        url: `/water/1.0/billing/batches/${validId}/invoices`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });
  });

  experiment('getBatchInvoiceDetail', () => {
    let request;
    let server;
    let validInvoiceId;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.getBatchInvoiceDetail);
      validInvoiceId = uuid();
      validBatchId = uuid();

      request = {
        method: 'GET',
        url: `/water/1.0/billing/batches/${validBatchId}/invoices/${validInvoiceId}`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the invoice id is not a uuid', async () => {
      request.url = request.url.replace(validInvoiceId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });
  });

  experiment('getBatchInvoicesDetail', () => {
    let request;
    let server;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.getBatchInvoicesDetails);
      validBatchId = uuid();

      request = {
        method: 'GET',
        url: `/water/1.0/billing/batches/${validBatchId}/invoices/details`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });
  });

  experiment('deleteBatchInvoice', () => {
    let request;
    let server;
    let validBatchId;
    let validInvoiceId;

    beforeEach(async () => {
      server = getServer(routes.deleteBatchInvoice);
      validBatchId = uuid();
      validInvoiceId = uuid();

      request = {
        method: 'DELETE',
        url: `/water/1.0/billing/batches/${validBatchId}/invoices/${validInvoiceId}`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the invoice id is not a uuid', async () => {
      request.url = request.url.replace(validInvoiceId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.deleteBatchInvoice.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });

  experiment('deleteBatch', () => {
    let request;
    let server;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.deleteBatch);
      validBatchId = uuid();

      request = {
        method: 'DELETE',
        url: `/water/1.0/billing/batches/${validBatchId}`,
        headers: {
          'defra-internal-user-id': 1234
        }
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 200 if unknown headers are passed', async () => {
      request.headers['x-custom-header'] = '123';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not supplied', async () => {
      request.headers = {};
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not a number', async () => {
      request.headers['defra-internal-user-id'] = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.deleteBatch.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });

  experiment('postApproveBatch', () => {
    let request;
    let server;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.postApproveBatch);
      validBatchId = uuid();

      request = {
        method: 'POST',
        url: `/water/1.0/billing/batches/${validBatchId}/approve`,
        headers: {
          'defra-internal-user-id': 1234
        }
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 200 if unknown headers are passed', async () => {
      request.headers['x-custom-header'] = '123';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not supplied', async () => {
      request.headers = {};
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not a number', async () => {
      request.headers['defra-internal-user-id'] = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.postApproveBatch.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });

  experiment('getBatchLicences', () => {
    let request;
    let server;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.getBatchLicences);
      validBatchId = uuid();

      request = {
        method: 'GET',
        url: `/water/1.0/billing/batches/${validBatchId}/licences`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.postApproveBatch.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });

  experiment('patchTransactionBillingVolume', () => {
    let request, server, transactionId;

    beforeEach(async () => {
      server = getServer(routes.patchTransactionBillingVolume);
      transactionId = '054517f2-be00-4505-a3cc-df65a89cd8e1';

      request = {
        method: 'PATCH',
        url: `/water/1.0/billing/transactions/${transactionId}/volume`,
        payload: {
          volume: 5
        },
        headers: {
          'defra-internal-user-id': 1234
        }
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 200 if unknown headers are passed', async () => {
      request.headers['x-custom-header'] = '123';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(transactionId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not supplied', async () => {
      request.headers = {};
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the calling user id is not a number', async () => {
      request.headers['defra-internal-user-id'] = 'a string';
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 200 if the volume is 0', async () => {
      request.payload.volume = 0;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the volume is not a positive number', async () => {
      request.payload.volume = -5;
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('returns a 400 if the volume is omitted', async () => {
      delete request.payload.volume;
    });
  });

  experiment('getInvoiceLicence', () => {
    let request;
    let server;
    let invoiceLicenceId;

    beforeEach(async () => {
      server = getServer(routes.getInvoiceLicence);
      invoiceLicenceId = uuid();

      request = {
        method: 'GET',
        url: `/water/1.0/billing/invoice-licences/${invoiceLicenceId}`
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the invoice licence id is not a uuid', async () => {
      request.url = request.url.replace(invoiceLicenceId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });
  });

  experiment('.postApproveReviewBatch', () => {
    let request;
    let server;
    let validBatchId;

    beforeEach(async () => {
      server = getServer(routes.postApproveReviewBatch);
      validBatchId = uuid();

      request = {
        method: 'POST',
        url: `/water/1.0/billing/batches/${validBatchId}/approve-review`,
        headers: {
          'defra-internal-user-id': 1234
        }
      };
    });

    test('returns the 200 for a valid payload', async () => {
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });

    test('returns a 400 if the batch id is not a uuid', async () => {
      request.url = request.url.replace(validBatchId, '123');
      const response = await server.inject(request);
      expect(response.statusCode).to.equal(400);
    });

    test('contains a pre handler to load the batch', async () => {
      const { pre } = routes.postApproveBatch.config;
      expect(pre).to.have.length(1);
      expect(pre[0].method).to.equal(preHandlers.loadBatch);
      expect(pre[0].assign).to.equal('batch');
    });
  });
});
