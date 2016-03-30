var ProjectManager = require('./project-manager');
var utils = require('./utils');

var CompileWriter = {};

CompileWriter.getHeader = function()
{
	var packageObj = ProjectManager.getPackageObject();
	
	var retObj = {string:'', data:{lines:0}, toString:function(){return this.string;}};
	
	var hasKeys = false;
	for (var key in packageObj) {
		hasKeys = true; break;
	}
	if (!hasKeys) {
		return retObj;
	}
	
	var headerArr = [];
	headerArr[0] = "////////// BEGIN packages //////////";
	
	iterate(packageObj, headerArr, '', CompileWriter.GLOBAL+'.');
	
	headerArr.push("////////// END packages //////////");
	
	retObj.string = headerArr.join(utils.LINE_BREAK);
	retObj.data.lines = retObj.string.match(/\n/g).length + 1;
	
	return retObj;
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
	
	var retObj = {string:'', data:{includes:[], lines:0}, toString:function(){return this.string;}};
	
	if (jsFileArr.length < 1)
		return retObj;
	
	var jsArr = [], trueJSPath, curLine = 1, numLines, fileContents;
	jsArr.push("////////// BEGIN normal js include files //////////");
	
	for (var i=0,ii=jsFileArr.length; i<ii; i++)
	{
		trueJSPath = utils.findFile(jsFileArr[i]);
		
		if (trueJSPath == null)
			throw new Error("Transpiler Error: no file "+jsFileArr[i]+" found on any code package points. Check naming and file placement.");
		
		fileContents = utils.getFile(trueJSPath);
		jsArr.push(fileContents);
		
		numLines = fileContents.match(/\n/g).length + 1;
		retObj.data.includes.push({file:trueJSPath, lines:numLines, content:fileContents});
	}
	
	jsArr.push("////////// END normal js include files //////////");
	
	retObj.string = jsArr.join(utils.LINE_BREAK);
	retObj.data.lines = retObj.string.match(/\n/g).length + 1;
	
	return retObj;
}

CompileWriter.getClasses = function()
{
	var classObjArr = ProjectManager.getClassArray();
	
	var retObj = {string:'', data:{maps:[]}, toString:function(){return this.string;}};
	
	var classArr = [];
	for (var i=classObjArr.length-1; i>-1; i--) {
		classArr.push(classObjArr[i].code);
		retObj.data.maps.push(classObjArr[i].map);
	}
	
	retObj.string = classArr.join(utils.LINE_BREAK);
	
	return retObj;
}

// outputs a list of all shortcuts from "import blah as blah", for global usage
// not currently used (each class only sees its own "import as" stuff)
// TODO: marked for removal after testing for a while commented out
/*
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
	
	return scArr.join(utils.LINE_BREAK);
}
*/

module.exports = CompileWriter;