const Lab = require('@hapi/lab');
const lab = Lab.script();
const Code = require('@hapi/code');
const moment = require('moment');

const messageQueue = require('../../../src/lib/message-queue');

const { enqueue } = require('../../../src/modules/notify/index.js')(messageQueue);
const sandbox = require('sinon').createSandbox();

lab.experiment('Test notify module', () => {
  lab.before(async () => {
    sandbox.stub(messageQueue, 'publish').resolves();
    sandbox.stub(messageQueue, 'subscribe').resolves();
  });

  lab.after(async () => {
    sandbox.restore();
  });

  lab.test('Enqueue message for immediate send', async () => {
    const { data, startIn } = await enqueue({
      messageRef: 'unit_test_email',
      recipient: 'mail@example.com',
      licences: ['01/234'],
      personalisation: {
        test_value: '00/00/00/00'
      }
    });

    Code.expect(startIn).to.equal(0);
    Code.expect(data.recipient).to.equal('mail@example.com');
    Code.expect(data.plaintext).to.equal('It has a test value of 00/00/00/00');
  });

  lab.test('Enqueue message for future send', async () => {
    const sendAfter = moment().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');

    const { data, startIn } = await enqueue({
      messageRef: 'unit_test_email',
      recipient: 'mail@example.com',
      licences: ['01/234'],
      personalisation: {
        test_value: '00/00/00/00'
      },
      sendAfter
    });

    Code.expect(startIn).to.equal(3600);
    Code.expect(data.recipient).to.equal('mail@example.com');
    Code.expect(data.plaintext).to.equal('It has a test value of 00/00/00/00');
  });
});

exports.lab = lab;
