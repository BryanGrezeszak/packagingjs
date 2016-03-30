
var ProjectManager = new Object();
var utils = require('./utils');

var packages = {}; // holds every package root on it's 1st level properties

// registers the package name WITHOUT the class name on the end
ProjectManager.registerPackage = function(pckg)
{
	if (pckg === undefined || pckg === null || pckg === '')
		return;
	
	var pckgArr = pckg.split('.');
	
	var curObj = packages;
	for (var i=0,ii=pckgArr.length; i<ii; i++)
	{
		if (!curObj.hasOwnProperty(pckgArr[i]))
			curObj[pckgArr[i]] = new Object();
		
		curObj = curObj[pckgArr[i]];
	}
}
ProjectManager.getPackageObject = function() {
	return packages;
}

var jsFiles = []; // holds all included normal .js script urls
ProjectManager.registerJSFile = function(fname)
{
	if (fname.charAt(0) === '/')
		fname = fname.substr(1);
	else if (fname.substr(0,2) === './')
		fname = fname.substr(2);
	
	if (jsFiles.indexOf(fname) < 0)
		jsFiles.push(fname);
}
ProjectManager.getJSFileArray = function() {
	return jsFiles;
}

var classFiles = []; // holds all imported PackageJS class file urls in format {url:String, fullClassName:"", processed:Boolean, code:String}
var classesMoved = []; // used internally by ProjectManager.registerClassFile
ProjectManager.registerClassFile = function(fullClassName, dependent) // takes full class name like foo.bar.ClassName
{
	var index = getClassFilesIndex(fullClassName);
	var alreadyThere = index > 0;
	var fname = fullClassName.split('.').join('/') + '.js';
	
	// if not there, add it and update index
	if (!alreadyThere) {
		classFiles.push({url:fname, processed:false, code:null, map:null, fullClassName:fullClassName, dependson:[], toString:function(){return '[classFiles array object '+this.fullClassName+']';}});
		index = classFiles.length - 1;
	}
	
	// if this was called from a class importing it, then that class is dependent on this, so track that on its classFiles object
	if (dependent) {
		var dependentIndex = getClassFilesIndex(dependent);
		classFiles[dependentIndex].dependson.push(fullClassName);
	}
	
	// if it was already there, then we need to  make it last, and then find all other classes it depends on and make them last,
	// and then to their dependencies...etc, iteratively.
	if (alreadyThere) {
		moveClassToEnd(fullClassName, true);
	}
	
	// iteratively moves a class to the end of the classFiles array, then does the same for the classes that class depends on
	classesMoved = [];
	function moveClassToEnd(fullClassName) {
		// if we've got a class name we've already iterated through then we're in an infinite loop of dependencies...impossible
		if (classesMoved.indexOf(fullClassName) > -1) {
			throw new Error('packagingjs error: Imports are dependency declarations as well. You have dependencies that depend on classes that depend on them. This makes it impossible to order those classes in a way that they will all work. Movement trace: '+fullClassName+': ['+classesMoved.join(', ')+']');
		}
		classesMoved.push(fullClassName);
		
		// step 1: get the index of this class, and the list of its dependson
		var index = getClassFilesIndex(fullClassName);
		var dependson = classFiles[index].dependson;
		
		// step 2: move this class to end
		classFiles.push(classFiles.splice(index, 1)[0]);
		
		// step 3: do the same for each dependency of this one
		for (var i=0,ii=dependson.length; i<ii; i++)
			moveClassToEnd(dependson[i]);
	}
	
	// helper function for getting location of class within clasFiles array
	function getClassFilesIndex(fullClassName) {
		var fname = fullClassName.split('.').join('/') + '.js';
		return utils.indexOfPropVal(classFiles, 'url', fname);
	}
}

ProjectManager.registerClassCode = function(fullClassName, code, map)
{
	var fname = fullClassName.split('.').join('/') + '.js';
	var index = utils.indexOfPropVal(classFiles, 'url', fname);
	if (index > -1) {
		classFiles[index].processed = true;
		classFiles[index].code = code;
		classFiles[index].map = map;
	}
}

ProjectManager.getClassArray = function() {
	return classFiles;
}

ProjectManager.nextClassToProcess = function()
{
	for (var i=0,ii=classFiles.length; i<ii; i++) {
		if (classFiles[i].processed === false)
			return classFiles[i].fullClassName;
	}
	
	return null; // if no more to do
}

var classShortcuts = []; // holds in format {reference:path.Whatever, shortcut:Name}
ProjectManager.registerClassShortcut = function(fullClassName, shortcut)
{
	var scIndex = utils.indexOfPropVal(classShortcuts, 'shortcut', shortcut);
	
	// already same shortcut for same class...leave it be
	if (scIndex > -1 && classShortcuts[scIndex].reference == fullClassName)
		return;
	
	if (scIndex > -1)
		throw new Error('Transpiler Error: The class name shortcut '+shortcut+' is utilized more than once.');
	
	classShortcuts.push({reference:fullClassName, shortcut:shortcut});
}
ProjectManager.getClassShortcuts = function() {
	return classShortcuts;
}

ProjectManager.clear = function() {
	packages = {};
	jsFiles = [];
	classFiles = []
	classShortcuts = [];
}

module.exports = ProjectManager;