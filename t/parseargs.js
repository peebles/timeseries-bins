'use strict';
module.exports = function( app ) {
  return function( argv ) {
    let bag = {};
    let arg;
    while( arg = argv.shift() ) {
      let i = arg.match( /^--(.+)/ );
      if ( i && i.length == 2 ) {
	if ( argv[0] && argv[0].match( /^--(.+)/ ) )
	  bag[ i[1] ] = true;
	else if ( ! argv[0] )
	  bag[ i[1] ] = true;
	else {
	  let v = argv.shift();
	  if ( v.match( /^\d+$/ ) )
	    v = Number( v );
	  bag[ i[1] ] = v;
	}
      }
    }
    return bag;
  };
};
