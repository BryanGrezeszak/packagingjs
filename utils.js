
var utils = {};
var fs = require('fs');

// returns the text content of the fname
utils.getFile = function(fname)
{
    var contents = fs.readFileSync(fname, 'utf8');
	return contents.replace(/\r\n/g,'\n').replace(/\n/g, utils.LINE_BREAK); // use the user specified line breaks for uniformity
}

// determines if a file exists
utils.isFile = function(fname)
{
	try {
		fs.accessSync(fname, fs.F_OK);
		return true;
	} catch (e) {
		return false;
	}
}

// gets a list of all files in the given dir (no trailing slash in directory path)
utils.fileList = function(dir)
{
	var files = [];
	
	for (var i=0,ii=utils.codePackages.length; i<ii; i++)
	{
		var root = utils.codePackages[i];
		var all = fs.readdirSync(root+dir);
	
		for (var i in all)
			if (!fs.statSync(root+dir+'/'+all[i]).isDirectory() && all[i].substr(-3)==='.js')
				files.push(all[i]);
	}
	
	return files;
}

// finds a file within one of the code packages given and starts in the package format com.whatever.Class - returns the URL
utils.findPackageFile = function(pname)
{
	return utils.findFile(pname.split('.').join('/') + '.js');
}

// finds a file within one of the code packages given - returns the URL
utils.findFile = function(fname)
{
	for (var i=0,ii=utils.codePackages.length; i<ii; i++) {
		if (utils.isFile(utils.codePackages[i] + fname))
			return utils.codePackages[i]+fname;
	}
	
	return null;
}

// turns com.whatever.Class into just Class
utils.classNameFromFullName = function(fullName)
{
	var splt = fullName.split('.');
	if (splt.length > 0) return splt[splt.length-1];
}

// Allows getting index of an object with a property
utils.indexOfPropVal = function(arr, key, val, start)
{
	 for (var i = (start || 0), j = arr.length; i < j; i++) {
		 if (arr[i][key] === val) { return i; }
	 }
	 return -1;
}

// allows real valid parsing without the inherent problems regex's have (like mixing up strings and such
// finds the first instance of a character in the string param search as long as not ", ', //, /*, etc
// use nolook if you don't care about it being surrounded by text, e.g. nolook true 'Xblah' will match blah, otherwise it won't
utils.nextToken = function(code, token, frm, nolook)
{
	var len = token.length;
	var ch1 = token.charAt(0);
	
	var extra = ' '; 
	while(extra.length < len) extra += ' ';
	
	var str = (extra + code + extra).split('');
	frm = frm === undefined ? 0 : frm;
	
	var okChars = /[^_a-zA-Z0-9$]/;
	
	var mode =
	{
		singleQuote: false,
		doubleQuote: false,
		lineComment: false,
		blckComment: false,
		regex: false
	};
	
	for (var i = frm+len, l = str.length; i < l; i++)
	{
		if (mode.regex) {
			if (str[i] === '/' && str[i-1] !== '\\')
				mode.regex = false;
			continue;
		}
		if (mode.singleQuote) {
			if (str[i] === "'" && str[i-1] !== '\\')
				mode.singleQuote = false;
			continue;
		}
		if (mode.doubleQuote) {
			if (str[i] === '"' && str[i-1] !== '\\')
				mode.doubleQuote = false;
			continue;
		}
		if (mode.lineComment) {
			if (str[i] === '\n')
				mode.lineComment = false;
			continue;
		}
		if (mode.blckComment) {
			if (str[i] === '/' && str[i-1] === '*')
				mode.blckComment = false;
			continue;
		}
 
		mode.regex       = str[i] === '/' && str[i+1] !== '/' && str[i+1] !== '*';
		mode.doubleQuote = str[i] === '"';
		mode.singleQuote = str[i] === "'";
		mode.lineComment = str[i] === '/' && str[i+1] === '/';
		mode.blckComment = str[i] === '/' && str[i+1] === '*';
		
		if (str[i]==ch1 && str.slice(i, i+len).join('')==token) { // if we found the first char and find it really is an intance of the text...
			if (str[i+len].match(okChars) != null || nolook) { // look ahead for acceptable character indicating a lone word token (nolook for nonwords)
				if (str[i-1].match(okChars) != null || nolook) { // look behind for acceptable character indicating a lone word token (nolook for nonwords)
					return i-len; // if all that's good, we have our token, return index
				}
			}
		}
	}
	
	return -1;
}

// finds the last token, otherwise same as nextToken
utils.lastToken = function(code, token, frm, nolook)
{
	frm--; // start 1 behind since the loop adds one each time
	var last = -1;
	
	while (true)
	{
		frm = utils.nextToken(code, token, frm+1, nolook);
		if (frm > last)
			last = frm;
		else
			break;
	}
	
	return last;
}

// NOT string safe, is only used in places where there wouldn't be strings
// in other words var blah = "my string /* "; will screw it up
utils.removeComments = function(code)
{
	for (var i = 0; i < code.length-1; i++)
	{
		var chr1 = code.charAt(i);
		var chr2 = code.charAt(i+1);
		
		// is single line comment
		if (chr1 === '/' && chr2 === '/') {
			var end = code.indexOf('\n',i);
			code = code.substr(0,i) + (end===-1 ? '' : code.substr(end));
		}
		
		if (chr1 === '/' && chr2 === '*') {
			var end = code.indexOf('*/',i);
			code = code.substr(0,i) + (end===-1 ? '' : code.substr(end+2));
		}
	}
	
	return code;
}

module.exports = utils;