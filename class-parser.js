var ProjectManager = require('./project-manager');
var utils = require('./utils');

function ClassParser()
{
	this.packageName = '';
	this.imports = [];
	this.className = '';
	this.fullClassName = '';
	
	this.requiredClasses = [];
	this.requiredFiles = [];
	this.classShortcuts = [];
	
	var code;
	
	this.parse = function(c, cn)
	{
		code = c;
		this.className = cn;
		this.getAndRemovePackage();
		this.getPreClassCode();
		this.getImports();
		this.registerImports();
		this.finalizeCode();
	}
	
	this.clear = function()
	{
		this.packageName = '';
		this.imports = [];
		this.className = '';
		this.fullClassName = '';
		
		this.requiredClasses = []; // not used right now, holds the class names this class imported as being dependent upon
		this.requiredFiles = []; // not used right now, holds the js file imports this class brought it itself
		this.classShortcuts = [];
	}
	
	this.getCode = function() {
		return code;
	}
	
	// sets the package name, and removes the package and it's surrounding braces from the code we're working with
	this.getAndRemovePackage = function()
	{
		var packageInd = code.indexOf('package', 0);
		var openingCurly = code.indexOf('{', packageInd);
		var closingCurly = code.lastIndexOf('}');
		
		
		if (packageInd < 0) throw new Error("packagingjs error: Class "+this.className+", class package not found.");
		if (packageInd > openingCurly) throw new Error("packagingjs error: Class "+this.className+", expected keyword 'package' before opening curly bracket.");
		
		this.packageName = code.substring(packageInd+7, openingCurly).trim();
		this.fullClassName = this.packageName.length>0 ? this.packageName+'.'+this.className : this.className;
		ProjectManager.registerPackage(this.packageName);
		ProjectManager.registerClassFile(this.packageName+(this.packageName?'.':'')+this.className);
		
		/*var classEndCurly = code.lastIndexOf('}',closingCurly-1);
		var classEndSemi = code.lastIndexOf(';',closingCurly-1);
		var classEnd = classEndCurly>classEndSemi ? classEndCurly : classEndSemi;*/ // used to look for last ; or }, now any non-whitspace character
		var classEnd = code.substr(0,closingCurly-1).match(/[^\s](?=\s*$)/).index;
		
		code = code.substring(openingCurly+1, classEnd+1);
	}
	
	// separates out import statements before the rest of the code
	var preClassCode;
	this.getPreClassCode = function()
	{
		// standard function, class, and object creation class beginnings
		var fMatch = (/(var\s+\w+\s*=\s*)?function(\s|.)*?\(/).exec(code);
		var cMatch = (/class\s+\w+/).exec(code);
		var vMatch = (/(var\s+)\w+\s*=(\s*)\{/).exec(code);
		
		// beginning of a react class: var Blah = React.createClass
		var rMatch = (/(var\s+)\w+\s*=(\s*)React.createClass/).exec(code);
		
		// angular type beginnings for angular modules and for controllers/values/factories/services/configs being attached to an imported module
		var mMatch = (/(var\s+)\w+\s*=(\s*)angular\./).exec(code);
		var aMatch = (/[\w.]+\.((controller)|(value)|(factory)|(service)|(config))+\s*?\(/).exec(code);
		
		// look for directive to begin class without any messing, which is string "begin class";
		var dMatch = (/['"]begin class['"];?/).exec(code);
		
		if (fMatch==null && cMatch==null && vMatch==null && rMatch==null && mMatch==null && aMatch==null && dMatch==null)
			throw new Error("packagingjs error: Proper definition representing class "+this.fullClassName+" not found.");
		
		// get the index of each match
		var fMatchInd = fMatch ? fMatch.index : Number.MAX_VALUE;
		var cMatchInd = cMatch ? cMatch.index : Number.MAX_VALUE;
		var vMatchInd = vMatch ? vMatch.index : Number.MAX_VALUE;
		var rMatchInd = rMatch ? rMatch.index : Number.MAX_VALUE;
		var mMatchInd = mMatch ? mMatch.index : Number.MAX_VALUE;
		var aMatchInd = aMatch ? aMatch.index : Number.MAX_VALUE;
		var dMatchInd = dMatch ? dMatch.index : Number.MAX_VALUE;
		
		var begin = '\tvar '+this.className+' = '+(this.packageName ? this.packageName : this.GLOBAL)+'.'+this.className;
		
		// find the smallest index of a match for testing which one to use
		var smallest = Math.min(fMatchInd, cMatchInd, vMatchInd, rMatchInd, mMatchInd, aMatchInd, dMatchInd);
		
		if (fMatchInd === smallest) // if it's a function declaration... (declarations and expressions get converted to expressions)
		{
			preClassCode = code.substring(0, fMatch.index);
			code = begin+' = function('+code.substr(smallest+fMatch[0].length).trim();
		}
		else if (cMatchInd === smallest) // if it's a class declaration
		{
			preClassCode = code.substring(0, cMatch.index);
			code = begin+' = '+code.substr(code.lastIndexOf('\n', smallest+cMatch[0].length)+1).trim();
		}
		else if (vMatchInd === smallest) // if it's a var ClassName = { static class type
		{
			preClassCode = code.substring(0, vMatch.index);
			code = begin+' ='+vMatch[2]+'{'+code.substr(smallest+vMatch[0].length).replace(/^[\s\uFEFF\xA0]+$/g, '');
		}
		else if (rMatchInd === smallest) // if it's a React class: var Blah = React.createClass
		{
			preClassCode = code.substring(0, rMatch.index);
			code = begin+' = React.createClass'+code.substr(smallest+rMatch[0].length).replace(/^[\s\uFEFF\xA0]+$/g, '');
		}
		else if (mMatchInd === smallest) // if it's an angular module: var blah = angular.
		{
			preClassCode = code.substring(0, mMatch.index);
			code = begin+' = angular.'+code.substr(smallest+mMatch[0].length).replace(/^[\s\uFEFF\xA0]+$/g, '');
		}
		else if (aMatchInd === smallest) // if it's a controller/factory/value/service/config call on an angular controller
		{
			preClassCode = code.substring(0, aMatch.index);
			code = '\t'+code.substr(aMatchInd).trim();
		}
		else // if (dMatchInd === smallest) // if a manual class begin directive was used: "begin class";
		{
			preClassCode = code.substring(0, dMatch.index);
			code = '\t'+code.substr(smallest+dMatch[0].length).trim();
		}
	}
	
	// calls itself recursively for each import until done
	this.getImports = function()
	{
		var importsRX = /(\s|^|;)import\s+(.+?);/;
		var usingsRX = /(\s|^|;)using\s+(.+?);/;
		var includesRX = /(\s|^|;)include\s+(.+?);/;
		
		// get both the next import and next using
		var imp = importsRX.exec(preClassCode);
		var usin = usingsRX.exec(preClassCode);
		var incl = includesRX.exec(preClassCode);
		
		// if no matches then we're done
		if (imp === null && usin === null && incl === null)
			return;
		
		// turn all into a number (in case one is null) to compare which is first
		var impInd = imp ? imp.index : Number.MAX_VALUE;
		var usinInd = usin ? usin.index : Number.MAX_VALUE;
		var inclInd = incl ? incl.index : Number.MAX_VALUE;
		
		var least = Math.min(impInd, usinInd, inclInd);
		
		var theEnd; // will be set to the end depending on import, include, or using
		var additions = ''; // used if there's a * wildcard
		
		// if import comes first, do it
		if (impInd === least)
		{
			theEnd = imp.index + imp[0].length;
			
			var impTxt = imp[2].trim();
			
			var splt = impTxt.split('.');
			var last = splt.pop().split(' as ')[0].trim();
			var pckNm = splt.join('.').trim();
			
			// if is explicit (blah.blah.Class) then register, if is wildcard (blah.blah.*) don't register, just make the additions
			// that will be tacked on at the end of this function which are the import statements of all .js files in that dir
			if (last === '*') {
				var fileList = utils.fileList(splt.join('/').trim());
				var len = fileList.length;
				while (len--)
					additions += 'import ' + pckNm + '.' + fileList[len].replace(/\.js$/,'') + ';' + this.LINE_BREAK;
			}
			else {
				ProjectManager.registerClassFile(pckNm+(pckNm?'.':'')+last, this.fullClassName);
				this.imports.push(impTxt);
			}
			
			if (splt.length > 1)
				ProjectManager.registerPackage(pckNm);
		}
		// if include comes first, do that
		else if (inclInd === least)
		{
			theEnd = incl.index + incl[0].length;
			var fnameraw = incl[2].trim();
			
			// strip any quotes
			var fname = fnameraw.replace(/"|'/g, '');
			
			// if it didn't have quotes and doesn't have .js at end then is special format indicating the global var in the file, and 'as' may be used
			if (fname === fnameraw && (fname.length < 3 || fname.substr(-3) !== '.js'))
			{
				var splt = fname.split(' as ');
				
				if (splt.length > 1) {
					fname = splt[0].trim();
					this.classShortcuts.push('var '+splt[1].trim()+' = '+fname+';');
				}
					
				fname += '.js';
			}
			
			ProjectManager.registerJSFile(fname);
		}
		// otherwise it's a using, so do that
		else if (usinInd === least)
		{
			theEnd = usin.index + usin[0].length;
			
			var usinTxt = usin[2].trim();
			var asSplt = usinTxt.split(' as ');
			var cName = asSplt.length>1 ? asSplt[1].trim() : asSplt[0].split('.').pop().trim();
			var fcName = asSplt[0].trim();
			this.classShortcuts.push('var '+cName+' = '+fcName+';');
		}
		
		// move to end of this import/include/using and then iterate again
		preClassCode = additions + preClassCode.substr(theEnd);
		this.getImports();
	}
	
	this.registerImports = function()
	{
		for (var i=0,ii=this.imports.length; i<ii; i++)
		{
			var val = this.imports[i].trim(), parts = val.split(' as ');
			
			if (val.match(/"|'/)) { // if is a string value to a URL
				this.requiredFiles.push(val.replace(/"|'/g, ''));
				continue; // if it's a string we're done with it, stop executing this part of loop
			}
			
			this.requiredClasses.push(parts[0].trim());
			
			if (val.match(/\sas\s/)) { // if is an "as" import
				ProjectManager.registerClassShortcut(parts[0], parts[1]);
				this.classShortcuts.push('var '+parts[1].trim()+' = '+parts[0].trim()+';');
			}
			else if (val.split('.').length > 1) { // otherwise just auto-imply the class name as shortcut IF it actually has a namespace
				this.classShortcuts.push('var '+val.split('.').pop()+' = '+val+';');
			}
		}
	}
	
	// final call that builds the class data into its final 'code' property
	// before this is called the code prop is just the raw class itself, this adds the comments surrounding, the IIFE, and the "import as" stuff
	this.finalizeCode = function()
	{
		var rawCode = code;
		var codeArr = [];
		
		codeArr.push('////////// BEGIN '+this.fullClassName+' //////////');
		codeArr.push('(function()');
		codeArr.push('{');
		
		if (this.classShortcuts.length > 0)
			codeArr.push('\t'+this.classShortcuts.join(this.LINE_BREAK+'\t')+this.LINE_BREAK+'\t');
		
		codeArr.push(rawCode);
		
		codeArr.push('}');
		codeArr.push(')();');
		codeArr.push('////////// END '+this.fullClassName+' //////////');
		
		code = codeArr.join(this.LINE_BREAK);
	}
}

module.exports = new ClassParser();