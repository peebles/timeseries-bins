const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);
module.exports = dayjs;
