"use strict";
let moment = require( 'moment-timezone' );

const _isInteger = (t) => {
  return (typeof t==='number' && (t%1)===0);
}

module.exports = function( app ) {
  let lib = {};

  // pass an int, get back the int
  // pass "now" get now in milliseconds
  // pass "+1d" or "-3weeks" get back milliseconds relative to now.
  // otherwise, assume the input is a moment-parsable string, eg: 'YYYY-MM-DDTHH:mm:ss[Z]'
  lib.timestamp = function( t, tz ) {
    if ( _isInteger( t ) ) return t;
    if ( t.match( /^\d+$/ ) ) return Number( t );
    if ( t.match( /^\d+ms$/ ) ) {
      let m = t.match( /^(\d+)ms$/ );
      return Number( m[1] );
    }
    if ( t == "now" ) return moment().valueOf();
    let m = t.match( /^([+-])(\d+)(\S+)/ );
    if ( ! m ) {
      // might be a parsable string
      try {
	return moment.tz( t, (tz || 'UTC') ).valueOf();
      } catch( err ) {
	return NaN;
      }
    }
    else {
      if ( m.length != 4 ) return NaN;
      if ( m[1] == "+" )
	return moment().add( Number( m[2] ), m[3] ).valueOf();
      else if ( m[1] == "-" )
	return moment().subtract( Number( m[2] ), m[3] ).valueOf();
      else
	return NaN;
    }
  }
  
  return lib;
}
