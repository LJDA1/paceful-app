/**
 * Shared VerticalSignalEngine singleton.
 * Required by all API routes — Node module cache keeps this a single instance.
 */

const path = require('path');
const { VerticalSignalEngine } = require('./vertical-signal-engine');

const engine = new VerticalSignalEngine(
  path.join(process.cwd(), 'config/verticals')
);

module.exports = { engine };
