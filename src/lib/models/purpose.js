'use strict';

const Model = require('./model');

const {
  assertEnum,
  assertString
} = require('./validators');

const PURPOSE_TYPES = {
  primary: 'primary',
  secondary: 'secondary',
  use: 'use'
};

class Purpose extends Model {
  get type () {
    return this._type;
  }

  set type (type) {
    assertEnum(type, Object.values(PURPOSE_TYPES));
    this._type = type;
  }

  /**
   * Human-readable name, e.g. 'North West'
   * @return {String}
   */
  get name () {
    return this._name;
  }

  set name (name) {
    assertString(name);
    this._name = name;
  }

  /**
   * Alphanumeric code
   * @return {String}
   */
  get code () {
    return this._code;
  }

  set code (code) {
    assertString(code);
    this._code = code;
  }
}

module.exports = Purpose;
module.exports.PURPOSE_TYPES = PURPOSE_TYPES;
