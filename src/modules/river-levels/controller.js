const riverLevels = require('../../lib/connectors/river-levels');
const ngrConverter = require('./ngr-converter');
const { isArray } = require('lodash');

/**
 * Gets measures from river level data
 * Ignores 'downstream stage'
 * @param {Object} data - data from flood API
 * @return {Array} measures
 */
function getMeasures (data) {
  const { measures } = data.items;
  const measuresArray = isArray(measures) ? measures : [measures];

  return measuresArray.reduce((acc, measure) => {
    if (measure.qualifier === 'Downstream Stage') {
      return acc;
    }

    const { latestReading: { dateTime, value }, parameter, period, unitName, valueType } = measure;

    return [...acc, {
      latestReading: { dateTime, value },
      parameter,
      period,
      unitName,
      valueType
    }];
  }, []);
}

/**
 * Get latest measurement data for gauging station with the given ID
 * @param {String} request.params.id - gauging station ID
 */
async function getStation (request, reply) {
  const { id } = request.params;

  try {
    // Get data from river levels API
    const data = await riverLevels.getStation(id);

    const { lat, long, easting, northing, label, catchmentName, riverName, status, stageScale } = data.items;

    // Convert easting/northing to NGR
    const ngr = ngrConverter(easting, northing);

    reply({
      lat,
      long,
      ngr,
      catchmentName,
      riverName,
      label,
      stageScale,
      measures: getMeasures(data),
      active: /^https?:\/\/environment.data.gov.uk\/flood-monitoring\/def\/core\/statusActive$/.test(status)
    });
  } catch (error) {
    console.error(error);
    reply({ error: 'River levels API error' }).code(error.statusCode);
  }
}

module.exports = {
  getStation
};