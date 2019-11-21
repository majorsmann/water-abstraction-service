const controller = require('./controller');
const { version, isAcceptanceTestTarget } = require('../../../config');

if (isAcceptanceTestTarget) {
  exports.postSetup = {
    method: 'POST',
    path: `/water/${version}/acceptance-tests/set-up`,
    handler: controller.postSetup,
    config: {
      description: 'Creates the required data to allow acceptance tests to run'
    }
  };

  exports.postTearDown = {
    method: 'POST',
    path: `/water/${version}/acceptance-tests/tear-down`,
    handler: controller.postTearDown,
    config: {
      description: 'Deletes an data created for use with acceptance tests'
    }
  };
}