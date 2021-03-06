'use strict';

const { get } = require('lodash');

const Address = require('./address');
const Company = require('./company');
const Contact = require('./contact-v2');
const Licence = require('./licence');
const Transaction = require('./transaction');
const Role = require('./role');

const {
  assertIsArrayOfType,
  assertIsInstanceOf,
  assertId,
  assertIsNullableInstanceOf
} = require('./validators');

const Model = require('./model');

class InvoiceLicence extends Model {
  constructor (id) {
    super(id);
    this._transactions = [];
  }

  /**
  * Sets the licence instance
  * @param {Licence} licence
  */
  set licence (licence) {
    assertIsInstanceOf(licence, Licence);
    this._licence = licence;
  }

  /**
   * Gets the licence instance
   * @return {Licence}
   */
  get licence () {
    return this._licence;
  }

  /**
  * Sets the company instance for this licence holder
  * @param {Company} company
  */
  set company (company) {
    assertIsInstanceOf(company, Company);
    this._company = company;
  }

  /**
   * Gets the address instance for this licence holder
   * @return {Address}
   */
  get company () {
    return this._company;
  }

  /**
  * Sets the contact instance for this licence holder
  * @param {Contact} contact
  */
  set contact (contact) {
    assertIsNullableInstanceOf(contact, Contact);
    this._contact = contact;
  }

  /**
   * Gets the contact instance for this licence holder
   * @return {Contact}
   */
  get contact () {
    return this._contact;
  }

  /**
   * Sets the address instance for this licence holder
   * @param {Address} address
   */
  set address (address) {
    assertIsInstanceOf(address, Address);
    this._address = address;
  }

  /**
   * Gets the address instance for this licence holder
   * @return {Address}
   */
  get address () {
    return this._address;
  }

  set transactions (transactions) {
    assertIsArrayOfType(transactions, Transaction);
    this._transactions = transactions;
  }

  get transactions () {
    return this._transactions;
  }

  set roles (roles) {
    assertIsArrayOfType(roles, Role);
    this._roles = roles;
  }

  get roles () {
    return this._roles;
  }

  /**
   * Gets a unique ID for this invoice licence which can be used
   * for unique comparisons
   * @return {String}
   */
  get uniqueId () {
    return [
      get(this, '_licence.licenceNumber'),
      get(this, '_company.id'),
      get(this, '_address.id'),
      get(this, '_contact.id')
    ].join('.');
  }

  /**
   * Parent invoice ID
   * @param {String} invoiceId - GUID
   */
  set invoiceId (invoiceId) {
    assertId(invoiceId);
    this._invoiceId = invoiceId;
  }

  get invoiceId () {
    return this._invoiceId;
  }
}

module.exports = InvoiceLicence;
