"use strict";
let moment = require( 'moment-timezone' );
let _find = require( 'lodash.find' );
let _forIn = require( 'lodash.forin' );
let _filter = require( 'lodash.filter' );
let spigot = require("stream-spigot");
let agg = require("timestream-aggregates-strings");
let concat = require("concat-stream");

const _isInteger = (t) => {
  return (typeof t==='number' && (t%1)===0);
}

// To support intervals that look like '15min', '30sec', as well as the moment-supported
// second, minute, hour, day, week, month, etc.
const re = new RegExp(/^(\d+)(.)/);
moment.fn.floor = function (interval) {
  if ( re.test(interval) ) {
    var n = Number(interval.match(re)[1]);
    var sm = interval.match(re)[2];
    if ( sm === 'm' ) {
      var intervals = Math.floor(this.minutes() / n);
      this.minutes(intervals * n);
      this.seconds(0);
      this.milliseconds(0);
      return this;
    }
    else if ( sm === 's' ) {
      var intervals = Math.floor(this.seconds() / n);
      this.seconds(intervals * n);
      this.milliseconds(0);
      return this;
    }
  }
  else {
    return this.startOf(interval);
  }
}

module.exports = function timeseries( opts, cb ) {
  let promise = new Promise((resolve) => {
    let data = _filter( opts.data, (p) => {
      return p[opts.timestampField] >= opts.start && p[opts.timestampField] <= opts.end;
    });
    spigot({ objectMode: true }, data ).pipe( agg[ opts.fcn ]( opts.timestampField, opts.interval, null, opts.tz || 'UTC' ) ).pipe(concat(function( r ) {
      if ( ! opts.interval ) return resolve( r );
      if ( opts.fill == undefined ) return resolve( r );
      // fit the sparse bins into strict bins
      let start = moment( opts.start ).tz( opts.tz || 'UTC' ).floor( opts.interval );
      let end = opts.end;
      let bins = [];
      while( start.valueOf() <= end ) {
	let b = {};
	b[ opts.timestampField ] = start.valueOf();
	let hit = _find( r, b );
	if ( hit ) {
	  bins.push( hit );
	}
	else {
	  if ( opts.indicateGenerated ) {
            // if asked, place a marker on points that were filled.
	    b[ opts.indicateGenerated ] = true;
	  }
	  if ( _isInteger( opts.fill ) ) {
	    _forIn( r[0], function( v, k ) {
	      if ( k == opts.timestampField ) return;
	      if ( typeof v == 'string' ) return;
	      b[ k ] = opts.fill;
	    });
	  }
	  else if ( opts.fill == 'previous' ) {
	    let ref;
	    if ( bins.length == 0 ) ref = r[0];
	    else ref = bins[ bins.length - 1 ];
	    _forIn( ref, function( v, k ) {
	      if ( k == opts.timestampField ) return;
	      b[ k ] = ( bins.length == 0 ) ? 0 : v;
	    });	      
	  }
	  else {
	    throw( 'unsupported fill: ', opts.fill ); 
	  }
	  bins.push( b );
	}
        if ( re.test( opts.interval ) ) {
          start = start.add( Number(opts.interval.match(re)[1]),
                             opts.interval.match(re)[1] === 's' ? 'seconds' : 'minutes' ); 
        }
        else {
	  start = start.add( 1, opts.interval );
        }
      }
      resolve( bins );
    }))});
  if ( ! cb ) return promise;
  else promise.then((res) => cb(null, res)).catch((err) => cb(err));
};
