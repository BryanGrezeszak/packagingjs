
var fs = require('fs');
var sourceMap = require('source-map');

var Mapping = {};
var map;

// can be shut off from outside to avoid all the processing
Mapping.doMapping = true;

// can be turned on to only map lines and not worry about individual chars (faster and smaller maps)
Mapping.linesOnly = true;

Mapping.reset = function(mapIn)
{
	if (mapIn)
		map = sourceMap.SourceMapGenerator.fromSourceMap( new sourceMap.SourceMapConsumer(mapIn) )
	else
		map = new sourceMap.SourceMapGenerator();
}

Mapping.add = function(src, origLine, origCol, genLine, genCol)
{
	map.addMapping({
		source: src,
		generated: {
			line: genLine,
			column: genCol
		},
		original: {
			line: origLine,
			column: origCol
		}
	});
}

Mapping.buildIncludes = function(offset, data)
{
	if (!Mapping.doMapping)
		return offset;
	
	// if none then nothing to map
	if (data.includes.length === 0)
		return offset;
	
	// for the opening comment of the section
	offset++;
	
	// loop through each included package and map each
	for (var i=0; i<data.includes.length; i++)
	{
		var incl = data.includes[i];
		var lines = incl.content.split(/\r?\n/g);
		
		// gotta map each line
		for (var j=0; j<incl.lines; j++)
		{
			var line = lines[j];
			
			if (Mapping.linesOnly) {
				Mapping.add(incl.file, j+1, 0, offset+j, 0);
			}
			else {
				for (var k=0; k<line.length; k++)
					Mapping.add(incl.file, j+1, k, offset+j, k);
			}
		}
		
		offset += incl.lines;
	}
	
	// +1 for closing comment
	return offset + 1;
}

Mapping.buildClasses = function(offset, data)
{
	if (!Mapping.doMapping)
		return offset;
	
	var i, j, k;
	
	// loop through each included class and map each
	for (i=0; i<data.maps.length; i++)
	{
		var map = data.maps[i];
		var genLines = map.genCode.split(/\r?\n/g);
		var origLines = map.origCode.split(/\r?\n/g);
		
		// map each shortcut
		var classStart = offset + 3;
		for (j=0; j<map.shortcuts.length; j++)
		{
			var sc = map.shortcuts[j];
			Mapping.add(map.file, sc.origLine, 0, offset+sc.genLine-1, 0);
			classStart = offset+sc.genLine+1;
		}
		
		// map the verbatim part of first class line from original to generated
		Mapping.add(map.file, map.body.origLine, 0, classStart, 0);
		
		// map the rest of that first line
		if (!Mapping.linesOnly)
		{
			var firstLine = origLines[map.body.origLine-1];
			var colDiff = map.body.genVCol - map.body.origVCol;
			for (k=map.body.origVCol; k<firstLine.length; k++)
				Mapping.add(map.file, map.body.origLine, k, classStart, k+colDiff);
		}
		
		// map the rest of the class after that first line
		var fromStart = classStart;
		for (j=map.body.origLine; j<origLines.length; j++)
		{
			var line = origLines[j];
			fromStart++;
			
			if (Mapping.linesOnly) {
				Mapping.add(map.file, j+1, 0, fromStart, 0);
			}
			else {
				for (k=0; k<line.length; k++)
					Mapping.add(map.file, j+1, k, fromStart, k);
			}
		}
		
		offset += genLines.length;
	}
}

Mapping.setSourceContent = function(data)
{
	for (var i=0; i<data.maps.length; i++) {
		var _map = data.maps[i];
		map.setSourceContent(_map.file, _map.origCode);
	}
}

Mapping.toString = function()
{
	return Mapping.doMapping ? map.toString() : '';
}

Mapping.toBase64 = function()
{
	return Mapping.doMapping ? base64_encode( map.toString() ) : '';
}

module.exports = Mapping;


// ----------------


function base64_encode(data) {
  //  discuss at: http://phpjs.org/functions/base64_encode/
  // original by: Tyler Akins (http://rumkin.com)
  // improved by: Bayron Guevara
  // improved by: Thunder.m
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Rafał Kukawski (http://kukawski.pl)
  // bugfixed by: Pellentesque Malesuada
  //   example 1: base64_encode('Kevin van Zonneveld');
  //   returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
  //   example 2: base64_encode('a');
  //   returns 2: 'YQ=='

  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
    ac = 0,
    enc = '',
    tmp_arr = [];

  if (!data) {
    return data;
  }

  do { // pack three octets into four hexets
    o1 = data.charCodeAt(i++);
    o2 = data.charCodeAt(i++);
    o3 = data.charCodeAt(i++);

    bits = o1 << 16 | o2 << 8 | o3;

    h1 = bits >> 18 & 0x3f;
    h2 = bits >> 12 & 0x3f;
    h3 = bits >> 6 & 0x3f;
    h4 = bits & 0x3f;

    // use hexets to index into b64, and append result to encoded string
    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  } while (i < data.length);

  enc = tmp_arr.join('');

  var r = data.length % 3;

  return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
}