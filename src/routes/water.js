'use strict';
/*
API page, pending real back end - uses fs to read and write to lkocal json files...
*/
const sessionRoutes = require('../controllers/sessions');
const schedulerRoutes = require('../controllers/scheduler');
const notificationsRoutes = require('../controllers/notifications');
const eventsRoutes = require('../controllers/events');
const notifyTemplatesRoutes = require('../controllers/notifytemplates');
const taskRunner = require('../controllers/taskRunner');
const taskConfigRoutes = require('../controllers/task-config');
const gaugingStationRoutes = require('../controllers/gauging-stations');
const moduleRoutes = require('../modules/routes');
const arAnalysisLicencesRoutes = require('../controllers/ar-analysis-licences');

const pkg = require('../../package.json');
const { version } = pkg;

module.exports = [
  ...sessionRoutes,
  ...schedulerRoutes,
  ...eventsRoutes,
  ...notificationsRoutes,
  ...notifyTemplatesRoutes,
  ...taskConfigRoutes,
  ...moduleRoutes,
  ...gaugingStationRoutes,
  ...arAnalysisLicencesRoutes,
  {
    method: 'GET',
    path: '/status',
    handler: () => ({ version }),
    config: { auth: false, description: 'Check service status' }
  }
];

// start node cron
const cron = require('node-cron');

taskRunner.reset();

cron.schedule('*/1 * * * *', function () {
  taskRunner.run();
});
