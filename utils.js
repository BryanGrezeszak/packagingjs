
var utils = {};
var fs = require('fs');

// returns the text content of the fname
utils.getFile = function(fname)
{
    var contents = fs.readFileSync(fname, 'utf8');
	return contents;
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
utils.indexOfPropVal = function(arr, key, val, start) {
	 for (var i = (start || 0), j = arr.length; i < j; i++) {
		 if (arr[i][key] === val) { return i; }
	 }
	 return -1;
}

module.exports = utils;