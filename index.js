"use strict";
const dayjs = require('./dayjs-timezone');

const _isNumber = require('lodash.isnumber');
const _pick = require("lodash.pick");
const _isNaN = require("lodash.isnan");

// To support intervals that look like '15min', '30sec', as well as the moment-supported
// second, minute, hour, day, week, month, etc.
const re = new RegExp(/^(\d+)(.)/);
const floor = (d, interval) => {
  if (re.test(interval)) {
    var n = Number(interval.match(re)[1]);
    var sm = interval.match(re)[2];
    if (sm === "m") {
      var intervals = Math.floor(d.minute() / n);
      return d.minute(intervals * n).second(0).millisecond(0);
    } else if (sm === "s") {
      var intervals = Math.floor(d.second() / n);
      return d.second(intervals * n).millisecond(0);
    }
  } else {
    return d.startOf(interval);
  }
}

// To support intervals that look like '15min', '30sec', as well as the moment-supported
// second, minute, hour, day, week, month, etc.
const period = (interval) => {
  let n = 1;
  let i = interval;
  if (re.test(interval)) {
    n = Number(interval.match(re)[1]);
    let sm = interval.match(re)[2];
    if (sm === "m") i = "minute";
    if (sm === "s") i = "second";
  }
  return {
    n,
    interval: i
  }
}

// The older interface was promise/callback based, so we need to keep that interface
module.exports = function timeseries(opts, cb) {
  let promise = new Promise((resolve, reject) => {
    let data = opts.data.filter(p => {
      return (
        p[opts.timestampField||'timestamp'] >= opts.start &&
        p[opts.timestampField||'timestamp'] <= opts.end
      );
    });
    try {
      resolve(timeseries_aggregate({...opts, chunks: data}));
    } catch(err) {
      reject(err);
    }
  });
  if (!cb) return promise;
  else promise.then((res) => cb(null, res)).catch((err) => cb(err));
};

// aggregate function that supports sum, max, count, and (optionally weighted) mean
//
function aggregate(data, fcn) {
  // Aggregator functions are closures that maintain an internal state,
  // and are called over and over, accumulating state.  Each as a res()
  // function to return a final (possibly calculated) result.

  function sum(name) {
    let total = 0;
    return {
      agg: (v) => {
        if (_isNaN(v)) return; // ignore NaN
        total += v;
      },
      res: () => total,
    };
  }

  function max(name) {
    let _max = 0;
    return {
      agg: (v) => {
        if (_isNaN(v)) return; // ignore NaN
        if (v > _max) _max = v;
      },
      res: () => _max,
    };
  }

  function min(name) {
    let _min = 0;
    return {
      agg: (v) => {
        if (_isNaN(v)) return; // ignore NaN
        if (v < _min) _min = v;
      },
      res: () => _min,
    };
  }

  function count(name) {
    let total = 0;
    return {
      agg: (v) => {
        if (_isNaN(v)) return; // ignore NaN
        total += 1;
      },
      res: () => total,
    };
  }

  function mean(name) {
    let acc = 0;
    let total = 0;
    return {
      agg: (v, data, weight) => {
        if (_isNaN(v)) return; // ignore NaN
        acc += v;
        total += 1;
      },
      res: () => acc / total,
    };
  }

  // aggregator name => aggregator function lookup
  const aggFcns = {
    sum,
    max,
    min,
    mean,
    count,
  };

  let res = {
    // [metricName1]: aggregatorFunction,
    // [metricName2]: aggregatorFunction,
    // etc ... will build up as we iterate over data, even if data have different shapes
  };
  data.forEach((chunk) => {
    Object.keys(chunk).forEach((field) => {
      if (!_isNumber(chunk[field])) return; // only numbers.
      // if we haven't seen this metric before, add it to res, with the proper function
      let _fcn = fcn;
      if (typeof fcn === 'object') _fcn = fcn[field];
      if (!_fcn) _fcn = "sum"; // because some fields are present that are ignored
      if (!res[field]) res[field] = aggFcns[_fcn](field);
      // and now call the agg function with the value, the chunk data and weight function
      res[field].agg(chunk[field], chunk);
    });
  });
  // Now we have a single object (res) with
  //   [metricName1]: aggregatorFunction,
  //   [metricName2]: aggregatorFunction,
  // where each aggregator function is a closure with accumulated state ...
  // Iterate through those keys, calling the .res() part of the closure to get the final result,
  // and transfer that (key => result) to the final result.
  let result = {...data[0]};
  Object.keys(res).forEach((field) => {
    if (res[field] && res[field].res) {
      result[field] = res[field].res();
    }
  });
  return result;
};

// The chunks input to this function is expected to be { timestamp:, data: {} },
// so more like a database object.
//
// if start and end are supplied, they should be moment()s.  If they are not supplied,
// start and end will be taken from the first and last chunk.
//
// fields is an array of metric names to include in the results.
//
// fill indicates how a period is represented if there are no chunks in that period.
// none: don't do anything
// zeros: create a chunk with all zeros
// nans: create a chunk with all NaNa
// previous: use the last chunk of the previous period (or zeros if no previous chunk)
//
function timeseries_aggregate({
  timestampField,
  start,
  end,
  tz,
  interval,
  fields,
  fill,
  chunks,
  fcn,
  indicateGenerated,
}){
  // The idea is to first create something like this:
  // [
  //   { timestamp:, chunks: [array of chunks for this period ] },
  //   { timestamp:, chunks: [array of chunks for this period ] },
  //   ...
  // ]
  // and then pass the chunk arrays to aggregate() function and replace the array
  // with the aggregated rollup.
  //
  const mk = (fields, value) => {
    let res = {};
    fields.forEach((f) => (res[f] = value));
    return res;
  };

  const createDate = (value, tz) => {
    if (_isNumber(value)) return dayjs(value, tz);
    if (value instanceof Date) return dayjs(value, tz);
    if (value.isValid && value.isValid()) return value;
    throw new Error('cannot create a date from', value);
  }

  // establish start and end
  if (!tz) tz = "UTC";
  if (!start) start = createDate(chunks[0][timestampField||'timestamp'], tz);
  if (!end) end = createDate(chunks[chunks.length - 1][timestampField||'timestamp'], tz);

  if (interval) start = floor(start, interval);

  let timestamp = start;
  let done = false;
  let ts = [];
  let lastPoint;

  const p = period(interval);
  while (!done) {
    let e = end;
    if (p.interval) e = timestamp.add(p.n, p.interval);
    let cdata = chunks.filter(c => {
      return (c[timestampField||'timestamp'] >= timestamp && c[timestampField||'timestamp'] < e);
    });
    let data = aggregate(cdata, fcn);
    if (fields) data = _pick(data, fields);
    if (Object.keys(data).length === 0 && fill !== undefined) {
      let properties = fields
        ? fields
        : chunks.length
        ? Object.keys(chunks[0])
        : [];
      if (fill === "previous" && lastPoint) data = lastPoint;
      else if (fill === "previous") data = mk(properties, 0);
      else if (fill === "zeros") data = mk(properties, 0);
      else if (fill === "nans") data = mk(properties, NaN);
      else data = mk(properties, fill);
      if (indicateGenerated) data[indicateGenerated] = true;
    }
    if (Object.keys(data).length) {
      ts.push({ ...data, [timestampField||'timestamp']: timestamp });
      lastPoint = data;
    }

    if (!interval) done = true;
    else {
      timestamp = timestamp.add(p.n, p.interval);
      if (timestamp > end) done = true;
    }
  }
  return ts;
};
