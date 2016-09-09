var ProjectManager = require('./project-manager');
var utils = require('./utils');

function ClassParser()
{
	this.packageName = '';
	this.imports = [];
	this.className = '';
	this.fileName = '';
	this.fullClassName = '';
	
	this.requiredClasses = [];
	this.requiredFiles = [];
	this.classShortcuts = [];
	this.mapData = {};
	
	var code;
	var origCode = '';
	
	this.parse = function(c, cn, fn)
	{
		code = c;
		origCode = c;
		this.className = cn;
		this.fileName = fn;
		this.mapData.file = fn;
		
		this.getAndRemovePackage();
		this.getPreClassCode();
		this.getImports(pckgOpenLines);
		this.registerImports();
		this.finalizeCode();
		this.finalizeMappings();
	}
	
	this.clear = function()
	{
		this.packageName = '';
		this.imports = [];
		this.className = '';
		this.fileName = '';
		this.fullClassName = '';
		
		this.requiredClasses = []; // not used right now, holds the class names this class imported as being dependent upon
		this.requiredFiles = []; // not used right now, holds the js file imports this class brought it itself
		this.classShortcuts = [];
		this.mapData = {};
	}
	
	this.getCode = function() {
		return code;
	}
	
	var pckgOpenLines = 0; // lines before the opening { of the package
	var pckgLastLineChars = 0; // how many characters were on the last line of the package before (and including) the {, needed in case class starts on same line
	// sets the package name, and removes the package and it's surrounding braces (and everything outside the package) from the code we're working with
	this.getAndRemovePackage = function()
	{
		var packageInd = utils.nextToken(code, 'package', 0); //code.indexOf('package', 0);
		var openingCurly = utils.nextToken(code, '{', packageInd, true); //code.indexOf('{', packageInd);
		var closingCurly = utils.lastToken(code, '}', openingCurly, true); //code.lastIndexOf('}');
		
		// this is the only thing that requires any parsing after the opening of the class (parses to ignores comments which may exist after package closes)
		// since we're trying to avoid that, if it doesn't find a closing curly then we'll just consider the last index of } at all to be the curly
		if (closingCurly === -1)
			closingCurly = code.lastIndexOf('}');
		
		// if that failed too then make that an error
		if (closingCurly === -1)
			throw new Error("packagingjs error: Closing curly brace for package not found in class "+this.className+".");
		
		if (packageInd < 0)
				throw new Error("packagingjs error: Class "+this.className+", class package not found.");
		
		this.packageName = utils.removeComments(code.substring(packageInd+7, openingCurly)).trim();
		this.fullClassName = this.packageName.length>0 ? this.packageName+'.'+this.className : this.className;
		ProjectManager.registerPackage(this.packageName);
		ProjectManager.registerClassFile(this.packageName+(this.packageName?'.':'')+this.className);
		
		// end of class is considered any non-whitspace character before the closing curly of the package
		var classEnd = code.substr(0,closingCurly-1).match(/[^\s](?=\s*$)/).index;
		
		var pckgOpeningCode = code.substring(0, openingCurly+1);
		var pckgOpeningLines = pckgOpeningCode.split(/\r?\n/);
		
		// track how many lines to open the package (for source mapping reasons)
		pckgOpenLines = pckgOpeningLines.length;
		// track how many were in the last line of the opener in case class begins on that line too
		pckgLastLineChars = pckgOpeningLines.pop().length;
		
		code = code.substring(openingCurly+1, classEnd+1);
	}
	
	// separates out import statements before the rest of the code
	var preClassCode, origStartLine, origStartCol, origStartVerbatimCol, genStartVerbatimCol;
	this.getPreClassCode = function()
	{
		var fRegex = new RegExp('function\\s+'+this.className+'(?=[\\s(])');
		var cRegex = new RegExp('class\\s+'+this.className+'(?=[\\s])');
		var vRegex = new RegExp('var\\s+'+this.className+'(?=[\\s])');
		var dRegex = new RegExp('private\\s+'+this.className+';?');
		
		var fMatch = fRegex.exec(code); // anything that begins with function Name 
		var cMatch = cRegex.exec(code); // anything that begins with class Name
		var vMatch = vRegex.exec(code); // anything that begins with var Name 
		var dMatch = dRegex.exec(code); // anything that begins with private Name
		
		// get the index of each match
		var fMatchInd = fMatch ? fMatch.index : Number.MAX_VALUE;
		var cMatchInd = cMatch ? cMatch.index : Number.MAX_VALUE;
		var vMatchInd = vMatch ? vMatch.index : Number.MAX_VALUE;
		var dMatchInd = dMatch ? dMatch.index : Number.MAX_VALUE;
		
		if (fMatch==null && cMatch==null && vMatch==null &&  dMatch==null)
			throw new Error("packagingjs error: Proper definition representing class "+this.fullClassName+" not found.");
		
		// get the index of each match
		var fMatchInd = fMatch ? fMatch.index : Number.MAX_VALUE;
		var cMatchInd = cMatch ? cMatch.index : Number.MAX_VALUE;
		var vMatchInd = vMatch ? vMatch.index : Number.MAX_VALUE;
		var dMatchInd = dMatch ? dMatch.index : Number.MAX_VALUE;
		
		var begin = 'var '+this.className+' = '+(this.packageName ? this.packageName : this.GLOBAL)+'.'+this.className;
		
		// find the smallest index of a match for testing which one to use
		var smallest = Math.min(fMatchInd, cMatchInd, vMatchInd, dMatchInd);
		
		// track how many lines in from inner of package the class starts (for source mapping), -1 cuz first line of it and last of package opening are same line
		// if is 0 then is on the same line as at least part of the package declaration, and columns must be offset because of that
		var classOpenLines = code.substring(0, smallest).split(/\n/g).length - 1;
		
		// the line in the original where the class definition starts
		origStartLine = pckgOpenLines + classOpenLines;
		
		// the column in the original where the class definition starts
		origStartCol = (classOpenLines?0:pckgLastLineChars) + code.substring(0, smallest).split(/\n/g).pop().length;
		
		// will be set to the point in the original were the class starts being copied verbatim
		//origStartVerbatimCol;
		// ditto but for where that point starts in the generated line (including the \t that gets added
		//genStartVerbatimCol;
		
		if (fMatchInd === smallest) // if it's a function declaration/statement...
		{
			preClassCode = code.substring(0, fMatch.index);
			code = '\t'+begin+' = function'+code.substr(smallest+fMatch[0].length);
			
			origStartVerbatimCol = origStartCol + fMatch[0].length;
			genStartVerbatimCol = 1 + begin.length + 11; // the 12 is the ' = function'
		}
		else if (cMatchInd === smallest) // if it's a class declaration
		{
			preClassCode = code.substring(0, cMatch.index);
			code = '\t'+begin+' = '+code.substr(smallest);
			
			origStartVerbatimCol = origStartCol;
			genStartVerbatimCol = 1 + begin.length + 3; // the 3 is the ' = '
		}
		else if (vMatchInd === smallest) // if it's a var ClassName = class type
		{
			preClassCode = code.substring(0, vMatch.index);
			code = '\t'+begin+code.substr(smallest+vMatch[0].length);
			
			origStartVerbatimCol = origStartCol + vMatch[0].length;
			genStartVerbatimCol = 1 + begin.length;
		}
		else // if (dMatchInd === smallest) // if a manual class begin via private ClassName
		{
			preClassCode = code.substring(0, dMatch.index);
			code = '\t'+'/* private '+this.className+' */'+code.substr(smallest+dMatch[0].length);
			
			origStartVerbatimCol = origStartCol + dMatch[0].length;
			genStartVerbatimCol = 15 + this.className.length;
		}
		
		//console.log(this.mapData.file, origStartLine, origStartCol, origStartVerbatimCol);
	}
	
	// calls itself recursively for each import until done
	this.getImports = function(curLine)
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
		
		var nlMtch = preClassCode.substr(0, least).match(/\n/g);
		curLine += nlMtch ? nlMtch.length : 0;
		
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
				var fileList = utils.fileList(splt.join('/').trim(), this.fullClassName.split('.').join('/')+'.js');
				var len = fileList.length;
				while (len--)
					additions += 'import ' + pckNm + '.' + fileList[len].replace(/\.js$/,'') + '; '; // put on same line so can track for sourcemaps as all being from same line
			}
			else {
				ProjectManager.registerClassFile(pckNm+(pckNm?'.':'')+last, this.fullClassName);
				this.imports.push(new StringLine(impTxt, curLine));
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
					this.classShortcuts.push(new StringLine('var '+splt[1].trim()+' = '+fname+';', curLine));
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
			this.classShortcuts.push(new StringLine('var '+cName+' = '+fcName+';', curLine));
		}
		
		// move to end of this import/include/using and then iterate again
		preClassCode = additions + preClassCode.substr(theEnd);
		this.getImports(curLine);
	}
	
	this.registerImports = function()
	{
		for (var i=0,ii=this.imports.length; i<ii; i++)
		{
			var val = this.imports[i].toString().trim(), parts = val.split(' as ');
			
			this.requiredClasses.push(parts[0].trim());
			
			if (val.match(/\sas\s/)) { // if is an "as" import
				this.classShortcuts.push(new StringLine('var '+parts[1].trim()+' = '+parts[0].trim()+';', this.imports[i].line));
			}
			else if (val.split('.').length > 1) { // otherwise just auto-imply the class name as shortcut IF it actually has a namespace
				this.classShortcuts.push(new StringLine('var '+val.split('.').pop()+' = '+val+';', this.imports[i].line));
			}
		}
	}
	
	// 2nd to final call that builds the class data into its final 'code' property
	// before this is called the code prop is just the raw class itself, this adds the comments surrounding, the IIFE, and the "import as" stuff
	this.finalizeCode = function()
	{
		var rawCode = code;
		var codeArr = [];
		
		codeArr.push('////////// BEGIN '+this.fullClassName+' //////////');
		codeArr.push('(function()');
		codeArr.push('{');
		
		for (var i=0; i<this.classShortcuts.length; i++)
			codeArr.push('\t'+this.classShortcuts[i]);
		if (this.classShortcuts.length > 0)
			codeArr.push('');
		
		codeArr.push(rawCode);
		
		codeArr.push('}');
		codeArr.push(')();');
		codeArr.push('////////// END '+this.fullClassName+' //////////');
		
		code = codeArr.join(this.LINE_BREAK);
	}
	
	// final call builds the mapData based on what we know
	this.finalizeMappings = function()
	{
		// start on line 4 since first 3 are opening comment/IIFE
		var curLine = 4;
		this.mapData.shortcuts = [];
		this.mapData.genCode = code;
		this.mapData.origCode = origCode;
		this.mapData.body = {};
		
		// add the line for each shortcut (line is about as precise as we can go since it's completely different code from original)
		for (var i=0; i<this.classShortcuts.length; i++)
		{
			var shortcut = this.classShortcuts[i];
			this.mapData.shortcuts.push({origLine:shortcut.line, genLine:curLine});
			curLine++;
		}
		
		// if there were shortcuts then it adds a line, account for that
		if (this.classShortcuts.length > 0)
			curLine++;
		
		// add data for the opening class line
		this.mapData.body.origLine = origStartLine;        // line in original where the class definition starts
		this.mapData.body.origCol  = origStartCol;         // column in origLine where the class starts in the original file
		this.mapData.body.origVCol = origStartVerbatimCol; // column in origLine where class starts being verbatim in original file
		this.mapData.body.genVCol  = genStartVerbatimCol;  // column in generated file where starts to print the verbatim part of the original file
	}
}

function StringLine(string, line) {
	this.string = string;
	this.line = line;
}
StringLine.prototype.toString = function(){ return this.string; }

module.exports = new ClassParser();