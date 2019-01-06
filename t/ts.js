"use strict";
//
// simple test of new timeseries library
//
let moment = require( 'moment-timezone' );
require( 'console.table' );
let timeseries = require( '../index' );

let app = {};
let time = require( './time' )(app);
let parseargs = require( './parseargs' )(app);

function exit( err ) {
  if ( err ) console.trace( err );
  process.exit( err ? 1 : 0 );
}

let args = parseargs( process.argv );

let TZ = args.tz || 'America/Los_Angeles';

let start = time.timestamp( args.start, TZ );
let end = time.timestamp( args.end, TZ );

let points = [
  { timestamp: moment( '2017-02-02T10:00:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-02-02T11:15:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-02-10T09:00:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-02-11T17:15:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-02-13T11:30:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-02-13T16:45:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-02T09:00:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-04T11:15:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-04T22:10:00' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-07T03:16:27' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-07T03:17:03' ).tz( TZ ).valueOf(), value: 10 },
  { timestamp: moment( '2017-03-07T03:17:19' ).tz( TZ ).valueOf(), value: 10 },
];

timeseries({ data: points, fcn: 'sum', timestampField: 'timestamp', interval: args.interval, start: start, end: end, tz: TZ, fill: args.fill }).then((bins) => {
  console.table( bins.map( function( b ) {
    b.timestamp = moment( b.timestamp ).tz( TZ ).format();
    return b;
  }));
  exit();
}).catch((err) => {
  exit(err);
});

  
