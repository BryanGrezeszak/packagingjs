
var utils = require('./utils');
var ProjectManager = require('./project-manager');
var ClassParser = require('./class-parser');
var CompileWriter = require('./compile-writer');

// options
var classMain, codePackages, autorun, strictMode, LINE_BREAK, GLOBAL;

// base: namespaced format, such as 'my.name.space.Main' or just 'Main' if no namespaces
// options: {roots:['./'], autorun:'static', strict:false, windows:false, global:'window'}
function packagingjs(base, options)
{
	options = options || {};
	classMain = base;
	codePackages = utils.codePackages = options.roots || ['./'];
	autorun = options.autorun ? options.autorun : 'static'; // 'none', 'static' or 'instance'
	strictMode = !!options.strict;
	LINE_BREAK = ClassParser.LINE_BREAK = CompileWriter.LINE_BREAK = options.windows ? '\r\n' : '\n';
	GLOBAL = ClassParser.GLOBAL = CompileWriter.GLOBAL = options.hasOwnProperty('global') ? options.global : 'window';
	
	// make all the roots given valid with a '/' at end if they don't have one
	var len = codePackages.length;
	while (len--) {
		var root = codePackages[len];
		if (root === '')
			continue;
		var lastChar = root.charAt(root.length-1);
		if (lastChar !== '/')
			codePackages[len] = root + '/';
	}
	
	return compileMain();
}

function compileMain()
{
	ProjectManager.clear();
	var MainURL = utils.findPackageFile(classMain);
	
	if (MainURL === null)
		throw new Error('packagingjs error: Base class '+classMain+' not found on any code roots. Check compiler settings.');
	
	var MainJSC = utils.getFile(MainURL);
	ClassParser.parse(MainJSC, utils.classNameFromFullName(classMain));
	var MainCode = ClassParser.getCode();
	ProjectManager.registerClassCode(classMain, MainCode);

	// will call recursively until no more
	return compileNextClass();
}

function compileNextClass()
{
	var nextClass = ProjectManager.nextClassToProcess();
	
	if (nextClass === null) {
		return allClassesCompiled();
	}
	
	ClassParser.clear();
	
	var nextURL = utils.findPackageFile(nextClass);
	
	if (nextURL == null)
		throw new Error('packagingjs error: Class '+nextClass+' path not found on any code roots. Check naming and file placement.');
	
	var nextJSC = utils.getFile(nextURL);
	ClassParser.parse(nextJSC, utils.classNameFromFullName(nextClass));
	var nextCode = ClassParser.getCode();
	ProjectManager.registerClassCode(nextClass, nextCode);
	
	return compileNextClass(); // recurse
}

function allClassesCompiled()
{
	var header = CompileWriter.getHeader();
	var normjs = CompileWriter.getJSFileImports();
	var classCode = CompileWriter.getClasses();
	var startupCode =  autorun&&autorun!=='none' ? (autorun=='static' ? classMain+'.main();' : 'new '+classMain+'();') : '';
	
	var transpiledCode = (strictMode?'"use strict";'+LINE_BREAK:'')+
	                     header+(header?LINE_BREAK:'')+
						 normjs+(normjs?LINE_BREAK:'')+
						 classCode+LINE_BREAK+
						 startupCode;
	
	return transpiledCode;
}

module.exports = packagingjs;


