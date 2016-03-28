var ProjectManager = require('./project-manager');
var utils = require('./utils');

var CompileWriter = {};

CompileWriter.getHeader = function()
{
	var packageObj = ProjectManager.getPackageObject();
	
	var hasKeys = false; for (var key in packageObj) { hasKeys = true; break; }
	if (!hasKeys)
		return '';
	
	var headerArr = [];
	headerArr[0] = "////////// BEGIN packages //////////";
	
	iterate(packageObj, headerArr, '', CompileWriter.GLOBAL+'.');
	
	headerArr.push("////////// END packages //////////");
	
	return headerArr.join(CompileWriter.LINE_BREAK);
}

var iterate = function(obj, arr, prev, prefix) {
	prefix = prefix || '';
	for (var key in obj) {
		arr.push("if ("+prefix+prev+key+" === undefined) "+prefix+prev+key+" = {};");
		iterate(obj[key], arr, prev+key+'.');
	}
}

CompileWriter.getJSFileImports = function()
{
	var jsFileArr = ProjectManager.getJSFileArray();
	
	if (jsFileArr.length < 1)
		return '';
	
	var jsArr = [], trueJSPath;
	jsArr.push("////////// BEGIN normal js include files //////////");
	
	for (var i=0,ii=jsFileArr.length; i<ii; i++)
	{
		trueJSPath = utils.findFile(jsFileArr[i]);
		
		if (trueJSPath == null)
			throw new Error("Transpiler Error: no file "+jsFileArr[i]+" found on any code package points. Check naming and file placement.");
		
		jsArr.push(utils.getFile(trueJSPath));
	}
	
	jsArr.push("////////// END normal js include files //////////");
	
	return jsArr.join(CompileWriter.LINE_BREAK)
}

CompileWriter.getClasses = function()
{
	var classObjArr = ProjectManager.getClassArray();
	
	var classArr = [];
	for (var i=classObjArr.length-1; i>-1; i--) {
		classArr.push(classObjArr[i].code);
	}
	
	return classArr.join(CompileWriter.LINE_BREAK);
}

// outputs a list of all shortcuts from "import blah as blah", for global usage
// not currently used (each class only sees its own "import as" stuff)
CompileWriter.getClassShortcuts = function()
{
	var scObjArr = ProjectManager.getClassShortcuts();
	
	if (scObjArr.length < 1)
		return '';
	
	var scArr = [];
	scArr.push("////////// BEGIN class shortcuts //////////");
	
	for (var i=0,ii=scObjArr.length; i<ii; i++) {
		scArr.push('var '+scObjArr[i].shortcut+' = '+scObjArr[i].reference+';');
	}
	
	scArr.push("////////// END class shortcuts //////////");
	
	return scArr.join(CompileWriter.LINE_BREAK);
}

module.exports = CompileWriter;