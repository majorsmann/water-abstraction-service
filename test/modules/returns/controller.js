const Boom = require('boom');
const { expect } = require('code');
const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('lab').script();

const sinon = require('sinon');
const sandbox = sinon.createSandbox();

const controller = require('../../../src/modules/returns/controller');
const Event = require('../../../src/lib/event');
const s3 = require('../../../src/lib/connectors/s3');
const startUploadJob = require('../../../src/modules/returns/lib/jobs/start-xml-upload');
const uploadValidator = require('../../../src/modules/returns/lib/returns-upload-validator');
const { uploadStatus } = require('../../../src/modules/returns/lib/returns-upload');
const { logger } = require('@envage/water-abstraction-helpers');

const UUIDV4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

experiment('postUploadXml', () => {
  let request;
  let h;

  beforeEach(async () => {
    sandbox.stub(Event.repo, 'update').resolves({});
    sandbox.stub(Event.repo, 'create').resolves({});
    // sandbox.stub(Event.repo, 'update').resolves({});
    // sandbox.stub(Event.prototype, 'getId').returns('test-event-id');
    sandbox.stub(s3, 'upload').resolves({
      Location: 'test-s3-location',
      Key: 'test-s3-key'
    });
    sandbox.stub(startUploadJob, 'publish').resolves('test-job-id');

    request = {
      payload: {
        userName: 'test-user',
        fileData: '10101'
      }
    };

    h = {
      response: sinon.stub().returns({
        code: sinon.spy()
      })
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('an event is saved with the expected values', async () => {
    await controller.postUploadXml(request, h);
    const [eventValues] = Event.repo.create.firstCall.args;
    expect(eventValues.type).to.equal('returns-upload');
    expect(eventValues.subtype).to.equal('xml');
    expect(eventValues.issuer).to.equal('test-user');
    expect(eventValues.status).to.equal('processing');
  });

  test('file data is uploaded to S3', async () => {
    await controller.postUploadXml(request, h);
    const [filename, fileData] = s3.upload.lastCall.args;

    expect(filename.substr(0, 15)).to.equal('returns-upload/');
    expect(filename.substr(15, 36)).to.match(UUIDV4_REGEX);
    expect(filename.substr(51, 4)).to.equal('.xml');

    expect(fileData).to.equal('10101');
  });

  test('creates a new job for the task queue', async () => {
    await controller.postUploadXml(request, h);
    const [eventId] = startUploadJob.publish.lastCall.args;

    expect(eventId).to.match(UUIDV4_REGEX);
  });

  test('response contains the expected data', async () => {
    await controller.postUploadXml(request, h);
    const [responseData] = h.response.lastCall.args;

    expect(responseData.data.eventId).to.match(UUIDV4_REGEX);

    const expectedFilename = `returns-upload/${responseData.data.eventId}.xml`;
    expect(responseData.data.filename).to.equal(expectedFilename);

    expect(responseData.data.location).to.equal('test-s3-location');
    expect(responseData.data.jobId).to.equal('test-job-id');

    const expectedStatusLink = `/water/1.0/event/${responseData.data.eventId}`;
    expect(responseData.data.statusLink).to.equal(expectedStatusLink);
  });
});

const requestFactory = () => {
  return {
    params: {
      eventId: 'bb69e563-1a0c-4661-8e33-51ddf737740d'
    },
    payload: {
      companyId: '2dc953ff-c80e-4a1c-8f59-65c641bdbe45'
    },
    evt: {
      eventId: 'bb69e563-1a0c-4661-8e33-51ddf737740d',
      status: 'validated'
    },
    jsonData: {
      foo: 'bar'
    }
  };
};

experiment('postUploadPreview', () => {
  const sandbox = sinon.createSandbox();

  const data = { foo: 'bar' };
  const validatorResponse = { bar: 'foo' };

  let h;

  beforeEach(async () => {
    h = {
      response: sinon.stub().returns({
        code: sinon.spy()
      })
    };
    sandbox.stub(logger, 'error');
    sandbox.stub(uploadValidator, 'validate').resolves(validatorResponse);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('it should call validator with correct arguments', async () => {
    const request = requestFactory();
    await controller.postUploadPreview(request, h);
    const [returnData, companyId] = uploadValidator.validate.firstCall.args;
    expect(returnData).to.equal(data);
    expect(companyId).to.equal(request.payload.companyId);
  });

  test('it should respond with validator result in response', async () => {
    const request = requestFactory();
    const response = await controller.postUploadPreview(request, h);
    expect(response.error).to.equal(null);
    expect(response.data).to.equal(validatorResponse);
  });

  test('if validator fails it should reject', async () => {
    const request = requestFactory();
    uploadValidator.validate.rejects(new Error('Some error'));
    const func = () => controller.postUploadPreview(request, h);
    expect(func()).to.reject();
  });

  test('if validator fails it should log error', async () => {
    const request = requestFactory();
    uploadValidator.validate.rejects(new Error('Some error'));
    try {
      await controller.postUploadPreview(request, h);
    } catch (err) {

    }

    const [msg, , params] = logger.error.lastCall.args;
    expect(msg).to.be.a.string();

    expect(params.eventId).to.equal(request.params.eventId);
    expect(params.companyId).to.equal(request.payload.companyId);
  });
});

experiment('postUploadSubmit', () => {
  const sandbox = sinon.createSandbox();
  let h;

  beforeEach(async () => {
    sandbox.stub(Boom, 'badRequest');
    sandbox.stub(logger, 'error');
    sandbox.stub(Event, 'persist');
    h = {
      response: sinon.stub().returns({
        code: sinon.spy()
      })
    };
    sandbox.stub(uploadValidator, 'validate').resolves([{
      returnId: 'a',
      errors: []
    }, {
      returnId: 'b',
      errors: ['Some error']
    }
    ]);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('it should throw a bad request error if the event is the wrong status', async () => {
    const request = requestFactory();
    request.evt.status = 'submitted';

    try {
      await controller.postUploadSubmit(request, h);
    } catch (err) {

    }
    expect(Boom.badRequest.callCount).to.equal(1);
    const [msg, , params] = logger.error.lastCall.args;
    expect(msg).to.be.a.string();
    expect(params.eventId).to.equal(request.params.eventId);
    expect(params.companyId).to.equal(request.payload.companyId);
  });

  test('it should throw a bad request error if no returns to submit', async () => {
    const request = requestFactory();
    uploadValidator.validate.resolves([]);
    try {
      await controller.postUploadSubmit(request, h);
    } catch (err) {

    }
    expect(Boom.badRequest.callCount).to.equal(1);
    const [msg, , params] = logger.error.lastCall.args;
    expect(msg).to.be.a.string();
    expect(params.eventId).to.equal(request.params.eventId);
    expect(params.companyId).to.equal(request.payload.companyId);
  });

  experiment('when there are returns to submit', async () => {
    test('it should update the event status to "submitted"', async () => {
      const request = requestFactory();
      await controller.postUploadSubmit(request, h);
      const [{ eventId, status }] = Event.persist.lastCall.args;
      expect(eventId).to.equal(request.params.eventId);
      expect(status).to.equal(uploadStatus.SUBMITTING);
    });
  });
});
