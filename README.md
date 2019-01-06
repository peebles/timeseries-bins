# Timestamp Bins

This little library attempts to emulate how Grafana works with a series of raw data points
when you ask it to bin by an interval (hour, day, week, month, quarter, year) over a period
of time, aggregating with a function like sum or ave, and filling empty bins with a value
or the previous bin.

## Input Data

The input data is expected to look something like this:

```javascript
[
  {timestamp: 1378511041582, speed: 1, odometer: 0,   fuel: 100},
  {timestamp: 1378511141582, speed: 4, odometer: 11,  fuel: 98},
  {timestamp: 1378511241582, speed: 3, odometer: 22,  fuel: 97},
  {timestamp: 1378511341582, speed: 25, odometer: 99,  fuel: 76},
  {timestamp: 1378511441582, speed: 50, odometer: 155, fuel: 70},
  {timestamp: 1378511541582, speed: 50, odometer: 241, fuel: 62},
  {timestamp: 1378511641582, speed: 122, odometer: 755, fuel: 18},
  {timestamp: 1378511741582, speed: 31, odometer: 780, fuel: 15},
  {timestamp: 1378511841582, speed: 0, odometer: 780, fuel: 15},
]
```

## Usage

```javascript
var timeseries = require( 'timeseries-bins' );
var options = {
  data: data_points,
  timestampField: "timestamp",
  fcn: "sum",
  interval: "hour",
  start: 1378511041582,
  end: 1378511841582,
  tz: "America/Los_Angeles",
  fill: 0,
};
timeseries( options, function( err, bins ) {
  if ( err ) exit( err );
  console.table( bins );
});
```

## Options

"interval" can be any interval that `moment()` understands.  It can also be something like "15min" or "30sec" and if so, will
behave like InfluxDB (round down to the nearest period specified and create buckets every period specified). "fcn" can be one of 
"sum", "mean", "mode", "median", "variance", "stdev", "percentile", "min", "max", "count", "first", "last".  "fill" can be either 
a number, or the string "previous".

If interval is not specified or is null, then you will get a rollup ... am array with a single point which performed the function
over all of the raw data points.

Your data points can contain values that are strings.  These are passed though unmodified.  The bin will contain the string value
that was in the last point dropped into that bin.

## Promises

If the callback argument is not supplied, the function will return a promise.

