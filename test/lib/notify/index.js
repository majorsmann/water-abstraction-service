const Lab = require('@hapi/lab');
const lab = Lab.script();
const Code = require('@hapi/code');

const { getNotifyKey, getPdfNotifyKey } = require('../../../src/lib/notify');

lab.experiment('Test getNotifyKey', () => {
  lab.test('The API should get test notify key', async () => {
    Code.expect(getNotifyKey('test')).to.equal(process.env.TEST_NOTIFY_KEY);
  });

  lab.test('The API should get whitelist notify key', async () => {
    Code.expect(getNotifyKey('whitelist')).to.equal(process.env.WHITELIST_NOTIFY_KEY);
  });

  lab.test('The API should get live notify key', async () => {
    Code.expect(getNotifyKey('live')).to.equal(process.env.LIVE_NOTIFY_KEY);
  });

  lab.test('The API should use a custom notify key', async () => {
    Code.expect(getNotifyKey('some-other-key')).to.equal('some-other-key');
  });
});

lab.experiment('Test getPdfNotifyKey', () => {
  const env = {
    TEST_NOTIFY_KEY: 'test-key',
    LIVE_NOTIFY_KEY: 'live-key'
  };

  const local = {
    ...env,
    NODE_ENV: 'local'
  };

  const test = {
    ...env,
    NODE_ENV: 'test'
  };

  const preprod = {
    ...env,
    NODE_ENV: 'preprod'
  };

  const production = {
    ...env,
    NODE_ENV: 'production'
  };

  lab.test('Should return test key for all environments other than production', async () => {
    Code.expect(getPdfNotifyKey(test)).to.equal('test-key');
    Code.expect(getPdfNotifyKey(local)).to.equal('test-key');
    Code.expect(getPdfNotifyKey(preprod)).to.equal('test-key');
  });

  lab.test('Should return live key for production only', async () => {
    Code.expect(getPdfNotifyKey(production)).to.equal('live-key');
  });
});

exports.lab = lab;
