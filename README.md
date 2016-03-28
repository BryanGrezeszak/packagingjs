# PackagingJS

> ES4 style packaging, namespacing, and dependency implementation.

### Install

```sh
$ npm install --save-dev packagingjs
```

### Usage Via Node API

```javascript
var packagingjs = require('packagingjs');
var output = packagingjs('BaseClass', options);
```

-------------------

### Arguments

##### BaseClass

The first argument takes a string in namespaced format to the class intended as your base class for the compilation. So 'my.namespace.MainClass' would look for the file 'my/namespace/MainClass.js' in one of the roots you define in the options.

##### options.roots `[default=['./']]`

An array of strings of locations to look for PackagingJS style files when using imports, includes, and for base classes. It will search for files in these locations from first to last. So if it is not found in your first root then it looks in the second, and so on.

##### options.autorun `[default='static']`

Allows you to control how the base class is automatically started. The options are 'none' (which will not attempt to run any class at all), 'instance' (which will create a new instance of the base class automatically on start), and 'static' (which will call a static function '.main()' on the base class on start).

##### options.strict `[default=false]`

Boolean value for whether to make the entire output strict mode. Even when false you can still use strict mode in individual functions. This only allows you to automatically strict mode the entire file.

##### options.windows `[default=false]`

Boolean value that allows you to specify to use windows style CRLF line breaks in the output.

##### options.global `[default='window']`

A string value representing the global object for the environment your code is intended for. For browsers that is 'window', so that is the default.

---------------------

### The PackagingJS Format Specifications

##### Overview

PackagingJS implements the ES4 concept of dependencies and namespacing, compiling a base "class" and all its dependencies into one build of valid JavaScript code. **Note:** the term "class" is used loosely in these docs to describe many ways of creating reusable JS code.

In ES4 all source files contained one class of code which was wrapped by a `package` block indicating the namespace for that class. Classes could the import other classes as dependencies with a simple `import` statement above the actual class definition.

Namespaces were also very easy to use because, while a class could be heavily namespaced to avoid conflicts, within a class that had explicitly imported that other class the name of the class alone could be used, i.e. `my.name.space.ClassName` could be referenced as just `ClassName` within the specific package scope of the class that had imported it (as well as within its own definition as well). Organization of code files is also simplified as it is to match the namespacing. For example `my.name.space.ClassName` will be expected to be found at `my/name/space/ClassName.js` in at least one of the root directories specified when compiling (multiple roots may be defined so that you can have one repository for reusable code that is used in many projects but still pull in local classes just for the current project, which makes reusing code and maintaining a good library of reusable code extremely simple). 

Many JS tools help you handle dependencies, but the ES4 system of tying dependencies, namespacing and the architecture of your files/folders into one uniform system makes a system that is extremely easy and shareable. Even the most complex libraries of hundreds of classes in hundreds of files become easy for any random person to grab and instantly know what's going on with all those files.

PackagingJS implements these concepts (and a couple added ones) into normal JavaScript and compiles dependent files together started from a specific "base class".

The main differences between modern JS and ES4 is that there was only one main way to make a class in ES4. In modern JS there are many ways to make reusable modular code (all of which we will call "classes" for the sake of simplicity) and we also need to deal with being able to use JS code that is not in PackagingJS format. PackagingJS does that quite well.

It's also important to note that PackagingJS does not attempt to otherwise deal with your JS code at all except for the the importing/including of the classes and dealing with the namespacing (which is handled at the very beginning of the classes). So after you make your package block, declare your imports/includes and write the opening of your "class" PackagingJS is completely hands-off of your code and you can write it however you want (including invalidly even...PackagingJS does not try to be a linting engine or anything of the sort, and as such even non-normal JS such as experimental Babel type stuff will work just fine because PackagingJS only cares about the opening of the class and copies the rest verbatim without question). This makes it very powerful compared to concepts like RequireJS and CommonJS which need to be able to parse much of your code to work.

### "Class" Formats

PackagingJS will recognize all of the following as valid types of "classes" and will properly deal with their namespacing and importing.

Keep in mind that for each of these _it is only the beginning of the class that matters_. PackagingJS only needs to be able to tell where your class begins so that it can know that it can look for import/include/using statements before that and so that it can add namespacing to the beginning of the class. After that opening of the class you can write whatever you want...even invalid JS, and PackagingJS won't care. It just uses your code verbatim from there on, trusting that you know what you're doing. So these formats are **not** big strict structures that all your code has to follow, they are just examples of each type of opening that you might start your code with.

##### Object Literal

Many times JS "classes" are made as object literals. PackagingJS accepts those, such as:

```javascript
package
{
	var MyClass = {
		prop: 'val',
		method: function() {
			/* ... */
		}
	}
}
```

PackagingJS only cares about the part before and including the opening curly brace of the object literal, so other ways of doing it will work as well:

```javascript
package
{
	var MyClass = {};
	MyClass.prop = 'val';
	MyClass.method = function() {
		/* ... */
	}
}
```

It is also not whitespace strict, for example if you went down a line when opening the class PackagingJS would understand that even though it does need to find that opening curly brace:

```javascript
package
{
	var MyClass =
	{
		prop: 'val',
		method: function() {
			/* ... */
		}
	}
}
```

##### Function Declarations and Expressions

"Classes" are also often made as functions being instantiated via the "new" operator. This is a valid way of creating classes in PackagingJS as well (in either declaration or expression format):

```javascript
package
{
	function MyClass() {
	    this.prop = 'val';
	}
}
```

PackagingJS only cares about the opening of the class up until the opening parens of the function definition, so after that anything is valid (constructor arguments, varying ways of building it, etc.). And function declarations and expressions work equally well. For example this works just fine:

```javascript
package
{
	var MyClass = function(myArg, anotherArg)
	{
	    this.prop1 = myArg;
	    this.prop2 = anotherArg
	}
	
	var p = MyClass.prototype;
	p.method = function() {
	    return this.prop1 + this.prop2;
	}
}
```

Also, since PackagingJS fully encapsulates all code within the package that `p` variable is will not bleed over to anything else or pollute the global scope or anything like that.

##### ES6 Style Classes

PackagingJS, of course, also supports ES6 classes (though make sure you use the strict compiling option so that the whole end file is strict mode so that ES6 classes can work).

```javascript
package
{
    class MyClass
    {
        constructor() {
            this.foo = 'bar';
        }
    }
}
```

PackagingJS just copies verbatim anything past the actual name of the class (in this case "class MyClass ") so extending works as expected, and if you're intending to further compile the code to use things like experimental ES7 features via Babel, or something like that, PackagingJS has no problem with that; it doesn't need to understand the code past that point. It just outputs what you tell it to beyond the class name.

##### React Classes

PackagingJS also plays nice with React, allowing the normal `React.createClass` usage, like so:

```javascript
package
{
    var MyClass = React.createClass({
        /* ... */
    });
}
```

##### Angular

PackagingJS also supports a number of formats typically used in Angular coding. For brevity I'll just document the possible opening line types it's looking for in one example:

```javascript
package
{
	var MyClass = angular. /*...*/
	// or
	myAngular.something.controller( /*...*/
	// or
	myAngular.something.value( /*...*/
	// or
	myAngular.something.factory( /*...*/
	// or
	myAngular.something.service( /*...*/
	// or
	myAngular.something.config( /*...*/
}
```

-------------------

### Namespacing

You namespace your classes by simply including the namespace as part of the package statement:

```javascript
package my.namesace
{
    var MyClass = function( /* ...etc */
}
```

Now the file `my/namespace/MyClass.js` will be expected in one of the defined root paths. It can be imported into other classes as a dependency via the full namespaced name `my.namespace.MyClass`. Once imported it can be referenced via its non-namespaced name `MyClass` within the package where it's imported.

It is good practice to namespace most classes with unique namespaces. One common practice from AS3 (which is a language that implemented the ES4 spec completely) is to use reverse domain namespacing followed by descriptive namespaces that can be used to group like classes. For example, a company at `mywebsite.com` making a class `MyAnimationUtils` might namespace that class as `com.mywebsite.animation.utils.MyAnimationUtils`. Another class that had to do with those utilities might have the same namespace and therefore be in the same folder, or one about animation that was not a utility might be namespaced will all that except the `.utils` and would reside in the parent `animation` folder.

----------------

### import, include, and using statements

##### import

In ES4 dependencies were handled via the `import` statement inside the package but before the class definition. It is handled the same in PackagingJS:

```javascript
package
{
    import some.namespace.ClassName;
    
    var MyClass = function( /* ...etc */
}
```

That will make sure that `some.namespace.ClassName` is part of the final build and that the class `MyClass` has a reference to it and can call it via its class name only: `ClassName`.

As of version 0.2.0 the import statement can also take a wildcard `*` at the end (like the format `import my.namespace.*;`) which will import all classes from that directory. It is not intended to be recursive, it only gets the direct children of that namespace. Note: the `using` statement does not have this feature, nor is it planned (for technical reasons).

##### include

In ES4 all classes were made and packaged in a similar manner and therefore `import` was all you needed. However, in modern JavaScript we need to be able to work with normal JS files that may not be packaged in the PackagingJS manner. We do this via the `include` statement.

In any PackagingJS class you may declare it as dependent on a normal JavaScript file by the include statement and giving a path to that JavaScript file (relative from one of the roots you gave in the options). It will not try to encapsulate or otherwise mess with that JS file, it will simply include it verbatim. So, for example, if you used `include` to compile in jQuery the end result would be a global `$` just like if you brought it in with a script tag. The include is solely a convenience measure for declaring it as a dependency of the class. Even if multiple files included that same jQuery file it would only get written in once, so feel free to `include` dependencies all you'd like. Example:

```javascript
package
{
    include 'myjs/jquery.min.js';
    
    var MyClass = function() {
        $('body').text('works!');
    }
}
```

As of version 0.3.0 it is possible to use the include without quotes and without the `.js` extension. This is purely a stylistic feature, but it does add the ability to do things in a slightly more suggestive way when coupled with how you decide to name files. For example, naming your file to represent the global variable that file introduces would then make the include statement bringing it in hint at its use. For example you could name your jQuery file `jQuery.js` and then `include jQuery;` would have the end result of making a `jQuery` object globally available. Of course, `include 'jQuery.js';` would do the same thing, but the former example allows you to be expressive of not only the file being included but also the global variable that include with make available. Since this formatting does indicate a variable to use, you may also use the `as` keyword, such as `include jQuery as j;` and then use jQuery via `j('.classname');` NOTE: it is considered good practice to **only** utilize this format of include when you are also utilizing this method of stating the global variable introduced by the include. That way a user can look in your code and automatically know that `include Foo;` means there will be a `Foo` object for usage. If that is not the case then use the normal `include 'Foo.js';` style of include instead.

##### using

As a utility to complement `include` the using statement allows you to manage a namespace that may be inherent in a normal JS file you are including.

Basically, it will take something namespaced and shortcut it so that you can use it locally (just within that package, it doesn't pollute the global scope). For example, with the wonderful CreateJS libraries everything is namespaced with `createjs.`. You could use `using` to shortcut some of those classes and make their usage more consistent with normal PackagingJS code.

```javascript
package
{
    include 'myjs/createjs/easeljs.min.js';
    using createjs.Stage;
    
    var MyClass = function() {
        var stage = new Stage(); // no need to namespace!
    }
}
```

`using` is not tied to a specific include statement or anything, so you can actually use it on stuff you didn't even include, such as native object properties. For example if you were to use the line `using document.getElementById;` you would then be able to just call `getElementById` from then on within that package. That's not what it's intended for, but it illustrates the point that it's a simple shortcut tool, not something tied to your `include` statements in any complex way.

-----------

### the as keyword

Another tool to prevent conflicts with name shortcuts is the `as` keyword, which can be used on the `import` and `using` statements (and in special cases on the `include` statement; such cases are explained in the include section). When used you can specify the name of the shortcut class name instead of using the default. This way you can avoid clashes between classes that might have the same name but different namespaces.

```javascript
package
{
    import my.namespace.ClassName;
    import name.space.ClassName as OtherClassName;
    using document.getElementById as getID;
    
    var MyClass = function() {
        var one = new ClassName(); // is my.namespace.ClassName
        var two = new OtherClassName(); // is name.space.ClassName
        var myElem = getId('my-id'); // same as document.getElementById('my-id')
    }
}
```

------------

### Usage Notes

-- When doing a series of operations to code (such as using PackagingJS alongside Babel and/or a minifier, etc.) always do PackagingJS first. PackagingJS does not rely on the rest of your code (other than the package, includes/imports/usings and the beginning of the class declaration) being in any certain format. Therefore you may write the rest of the code however you wish and it will compile perfectly fine. So no matter what crazy Babel stuff you're using PackagingJS can still deal with it. However, the reverse isn't true: PackagingJS formatting and statements are not something many other tools cope with and they will choke (or at very least change it in a way that will screw up PackagingJS) when they try to work with your PackagingJS oriented code directly.

-- PackagingJS outputs one build (intended to be written as one file) per one base class. That does not mean you have to put all your code into one JS file (unless you want to). Just plan it so that one base file imports its dependencies and does one thing and then run PackagingJS on another base file and its dependencies for another output file.

-- `package`, `import`, `include`, and `using`, and `as` statements are handled and compiled out and do not exist in the output, so they will not conflict with other current/future JS usages of those keywords which may be implemented in JS engines. Any usages of those keywords after the beginning of your class definition will not be handled by PackagingJS and will be left as you wrote them.

-- PackagingJS is designed for compilation, and this module is expected to be used within things like GULP and GRUNT plugins and their respective workflows. There is not any way for PackagingJS formatted files to run without compilation to normal JS, nor is there a way planned. That's just not what this tool is for. My official GULP plugin for this can be found [here](https://www.npmjs.com/package/gulp-packagingjs)

-- There currently is no sourcemap creation. This is not a huge problem since the majority of your code is untouched and comments are automatically inserted that show which code belongs to which class, so it's actually extremely easy to see where an error is and relate that back to your original files. However, if there is a sourcemap master out there willing to contribute I'm open to it, it would be a nice feature to have.

------------

### Version Logs

0.0.0 - Test publish.\
0.1.0 - Made ready for beta testing and documentation added.\
0.2.0 - Added * wildcard ability to import statement.\
0.2.1 - Bugfixes related to the code roots.\
0.3.0 - Added non-quoted no-file-extension format to include.