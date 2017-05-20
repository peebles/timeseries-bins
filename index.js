"use strict";
let moment = require( 'moment-timezone' );
let _ = require( 'lodash' );
let spigot = require("stream-spigot");
let agg = require("timestream-aggregates-strings");
let concat = require("concat-stream");

module.exports = function timeseries( opts, cb ) {
  try {
    spigot({ objectMode: true }, opts.data ).pipe( agg[ opts.fcn ]( opts.timestampField, opts.interval, null, opts.tz || 'UTC' ) ).pipe(concat(function( r ) {
      if ( ! opts.interval ) return cb( null, r );
      if ( opts.fill == undefined ) return cb( null, r );
      // fit the sparse bins into strict bins
      let start = moment( opts.start ).tz( opts.tz || 'UTC' ).startOf( opts.interval );
      let end = opts.end;
      let bins = [];
      while( start.valueOf() <= end ) {
	let b = {};
	b[ opts.timestampField ] = start.valueOf();
	let hit = _.find( r, b );
	if ( hit ) {
	  bins.push( hit );
	}
	else {
	  if ( opts.indicateGenerated ) {
	    b[ opts.indicateGenerated ] = true;
	  }
	  if ( _.isNumber( opts.fill ) ) {
	    _.forIn( r[0], function( v, k ) {
	      if ( k == opts.timestampField ) return;
	      if ( typeof v == 'string' ) return;
	      b[ k ] = opts.fill;
	    });
	  }
	  else if ( opts.fill == 'previous' ) {
	    let ref;
	    if ( bins.length == 0 ) ref = r[0];
	    else ref = bins[ bins.length - 1 ];
	    _.forIn( ref, function( v, k ) {
	      if ( k == opts.timestampField ) return;
	      b[ k ] = ( bins.length == 0 ) ? 0 : v;
	    });	      
	  }
	  else {
	    throw( 'unsupported fill: ', opts.fill ); 
	  }
	  bins.push( b );
	}
	start = start.add( 1, opts.interval );
      }
      cb( null, bins );
    }));
  } catch( err ) {
    cb( err );
  }
};
