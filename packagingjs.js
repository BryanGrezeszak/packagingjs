
var utils = require('./utils');
var ProjectManager = require('./project-manager');
var ClassParser = require('./class-parser');
var CompileWriter = require('./compile-writer');
var Mapping = require('./mapping');

// options
var classMain, codePackages, autorun, strictMode, LINE_BREAK, GLOBAL, mapInData;

// base: namespaced format, such as 'my.name.space.Main' or just 'Main' if no namespaces
// options: {roots:['./'], autorun:'static', strict:false, windows:false, global:'window', sourcemap:true, maplevel:1}
function packagingjs(base, options)
{
	options = options || {};
	classMain = base;
	codePackages = utils.codePackages = options.roots || ['./'];
	autorun = options.autorun ? options.autorun : 'static'; // 'none', 'static' or 'instance'
	strictMode = !!options.strict;
	Mapping.doMapping = options.sourcemap !== false;
	Mapping.linesOnly = options.maplevel !== 2; // 1 or 2 | 1 being lines only, 2 being most individual characters mapped
	mapInData = options.sourcemapin; // for usage by gulp-packagingjs along with gulp-sourcemaps
	LINE_BREAK = ClassParser.LINE_BREAK = utils.LINE_BREAK = options.windows ? '\r\n' : '\n';
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
	ClassParser.parse(MainJSC, utils.classNameFromFullName(classMain), MainURL);
	var MainCode = ClassParser.getCode();
	var MainMap = ClassParser.mapData;
	ProjectManager.registerClassCode(classMain, MainCode, MainMap);

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
	
	if (nextURL === null)
		throw new Error('packagingjs error: Class '+nextClass+' path not found on any code roots. Check naming and file placement.');
	
	var nextJSC = utils.getFile(nextURL);
	ClassParser.parse(nextJSC, utils.classNameFromFullName(nextClass), nextURL);
	var nextCode = ClassParser.getCode();
	var nextMap = ClassParser.mapData;
	ProjectManager.registerClassCode(nextClass, nextCode, nextMap);
	
	return compileNextClass(); // recurse
}

function allClassesCompiled()
{
	var header = CompileWriter.getHeader();
	var normjs = CompileWriter.getJSFileImports();
	var clssjs = CompileWriter.getClasses();
	var startupCode = autorun&&autorun!=='none' ? (autorun=='static' ? classMain+'.main();' : 'new '+classMain+'();') : '';
	
	Mapping.reset(mapInData);
	var onLine = (strictMode?2:1); // indexed from 1
	onLine += header.data.lines;
	onLine = Mapping.buildIncludes(onLine, normjs.data);
	onLine = Mapping.buildClasses(onLine, clssjs.data);
	Mapping.setSourceContent(clssjs.data);
	
	var transpiledCode = (strictMode?'"use strict";'+LINE_BREAK:'')+
	                      header+(header.string?LINE_BREAK:'')+
						  normjs+(normjs.string?LINE_BREAK:'')+
						  clssjs+LINE_BREAK+
						  startupCode;
	
	// this would do inline sourcemaps at the end of the code should we want that for some reason
	// '\n\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'+Mapping.toBase64()
	
	return {code:transpiledCode, sourcemap:Mapping.toString(), toString:function(){return this.code;}};
}

module.exports = packagingjs;


