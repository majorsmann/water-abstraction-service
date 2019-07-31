const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const { expect, fail } = require('code');
const {
  beforeEach,
  afterEach,
  experiment,
  test } = exports.lab = require('lab').script();

const { serviceRequest } = require('@envage/water-abstraction-helpers');
const idmConnector = require('../../../src/lib/connectors/idm');

experiment('connectors/idm', () => {
  beforeEach(async () => {
    sandbox.stub(serviceRequest, 'get').resolves({
      version: '0.0.1'
    });

    sandbox.stub(idmConnector.usersClient, 'findMany').resolves({
      data: [],
      error: null
    });
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.getUsersByExternalId', () => {
    experiment('when externalIds array is empty', () => {
      const externalIds = [];

      test('the API is not called', async () => {
        await idmConnector.usersClient.getUsersByExternalId(externalIds);
        expect(idmConnector.usersClient.findMany.callCount).to.equal(0);
      });

      test('returns an object with empty data array', async () => {
        const result = await idmConnector.usersClient.getUsersByExternalId(externalIds);
        expect(result).to.equal({ data: [] });
      });
    });

    experiment('when externalIds is not empty', () => {
      const externalIds = [1, 2, 3, 4];
      beforeEach(async () => {
        await idmConnector.usersClient.getUsersByExternalId(externalIds);
      });

      test('uses the expected filter', async () => {
        const [filter] = idmConnector.usersClient.findMany.lastCall.args;
        expect(filter).to.equal({
          external_id: {
            $in: externalIds
          },
          application: 'water_vml'
        });
      });
    });
  });

  experiment('.getUserByUserName', () => {
    const userName = 'testing@example.com';

    beforeEach(async () => {
      idmConnector.usersClient.findMany.resolves({
        data: [{ user_id: 123 }],
        error: null
      });
    });

    test('uses the expected filter', async () => {
      await idmConnector.usersClient.getUserByUserName(userName);
      const [filter] = idmConnector.usersClient.findMany.lastCall.args;
      expect(filter).to.equal({
        user_name: userName,
        application: 'water_vml'
      });
    });

    test('returns the expected data', async () => {
      idmConnector.usersClient.findMany.resolves({
        data: [{ user_id: 123 }],
        error: null
      });

      const user = await idmConnector.usersClient.getUserByUserName(userName);
      expect(user.user_id).to.equal(123);
    });

    test('returns undefined when the user is not found', async () => {
      idmConnector.usersClient.findMany.resolves({
        data: [],
        error: null
      });

      const user = await idmConnector.usersClient.getUserByUserName(userName);
      expect(user).to.be.undefined();
    });

    test('throws if an error is returned', async () => {
      idmConnector.usersClient.findMany.resolves({
        error: { name: 'User not found' },
        data: []
      });

      try {
        await idmConnector.usersClient.getUserByUserName(userName);
        fail('Should never get here');
      } catch (err) {
        expect(err).to.exist();
      }
    });
  });

  experiment('.getServiceVersion', () => {
    test('calls the expected URL', async () => {
      await idmConnector.getServiceVersion();
      const [url] = serviceRequest.get.lastCall.args;
      expect(url).to.endWith('/status');
    });
  });
});
