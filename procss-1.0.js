/**
* procss.js v1.0
* Copyright 2015 BOX Creative, LLC
* Code licensed under MIT:
* https://github.com/boxnyc/procss/blob/master/LICENSE
* 
* content
* -------
* 
*
* Browser testing
* ---------------
* Internet Explorer: âˆš6+
*           FireFox: âˆš1.5+
*            Chrome: âˆš16+  (Needs work <16)
*            Safari: âˆš3.5+ (Not tested that far back)
*             Opera: âˆš9.2+
**/

var PROCSS = null;
(function(PROCSS) {
	
	/**
	 * Procss()
	 * - procss Constructor.
	 */
	PROCSS = window.PROCSS = new (function Procss() {
		
		/**
		 * Settings
		 */
		var settings = {
			endCodeLines: true,
			showErrors: true
		};
		
		/**
		 * PUBLIC
		 * >>--->
		 */
		
		/**
		 * .update()
		 * - Initiates a basic parse and bind
		 */
		this.update = function(){
			_update();
		};
		
		/**
		 * init on load...
		 */
		window.onload = function() {
			_update();
		};
		
		/**
		 * PRIVATE
		 * >>---->
		 */
		
		/**
		 * Private variables
		 */
		var removedContent = {};
		
		/**
		 * _getUserAgent():
		 * Gets the user agent info of
		 * browsers we want to know about
		 */
		function _getUserAgent() {
			var data = {opera:{version:0}};
			// Opera
			navigator.userAgent.replace(/(Opera|OPR)(\s{1,}|\/)([0-9\.]{1,})/g, function($0, $1, $2, $3){
				var version = $3.split('.');
				data.opera.version = parseFloat(version[0]+'.'+version[1]);
			});
			return data;
		};
		
		/**
		 * _parseContentSyntax(string content):
		 * Parses the content to a better syntax
		 */
		function _parseContentSyntax(content) {
			content = content.replace(/^\'|^\"|\'$|\"$/g, '').replace(/\\\'|\\\"/g, '`');
			var contents = content.split(/\'\,\s*\'|\"\s*\"/g);
			var codes = [];
			for(var _content in contents) {
				var c = contents[_content];
				c = c.replace(/\/\*.*\*\/|\/\/.*$|^\s*|\s*$/g, '');
				if(settings.endCodeLines) c = c.replace(/\;\s*$/g, '');
				if(c) codes.push(c);
			};
			var code = codes.join(settings.endCodeLines ? '; ' : ' ').replace(/\`/g, "'");
			return code;
		};
		
		/**
		 * _parsePluginShortcuts(string code):
		 * Replaces the code shortcuts to real code
		 */
		function _parsePluginShortcuts(code) {
			for(var _p in ProcssPlugin) {
				var plugin = ProcssPlugin[_p];
				if(typeof plugin.shortcuts === 'undefined') continue;
				for(var _s in plugin.shortcuts)
					code = code.split(_s).join(plugin.shortcuts[_s]);
			}
			return code;
		}
		
		/**
		 * _evaluateSettings(string code):
		 * Evaluates and applies settings code
		 * to override current settings
		 */
		function _evaluateSettings(code) {
			var settingsCode = code;
			settingsCode = 'var newSettings = {'+(settingsCode.replace(/var\s*|settings\.|\{|\}/gi, '')
				.split('=').join(':').split(';').join(','))+'};';
			try {
				eval(settingsCode); 
			} catch(e) { if(settings.showErrors) console.error(e); };
			if(typeof newSettings === 'object')
				for(var _sk in newSettings)
					if(typeof settings[_sk] !== 'undefined' && typeof newSettings[_sk] !== 'undefined')
						settings[_sk] = newSettings[_sk];
		};
		
		/**
		 * _update():
		 * Gets #selector { content: "code"; } rules,
		 * and saves to Dictionary
		 */
		function _update() {
			var data = {vars:{}, funcs:{}, elems:{}};
			var userAgent = _getUserAgent();
			for(var _styleSheet = 0; _styleSheet < document.styleSheets.length; _styleSheet++) {
				var styleSheet = document.styleSheets[_styleSheet];
				if(typeof styleSheet !== 'object') continue;				
				var rules = styleSheet.cssRules || styleSheet.rules;
				for(var _rule = 0; _rule < rules.length; _rule++) {
					var rule = rules[_rule];
					if(typeof rule.style === 'undefined') continue;
					var content = rule.style.content;
					if(!content) continue;
					// Get it's selector and make sure its not a before or after psedudo class
					var selectorText = rule.selectorText;
					if(selectorText.search(/\:(before|after)$/) > -1) continue;
					// Opera actually uses the content attribute on everything
					// so lets save it and change it to be inherit
					if(userAgent.opera.version > 9.5) {
						if(content == 'inherit' && typeof removedContent[selectorText] !== 'undefined') {
							content = removedContent[selectorText];
						} else {
							removedContent[selectorText] = content;
							rule.style.content = 'inherit';
						};
					};
					// Because of Safari/Chrome, we can only use lowercase
					selectorText = selectorText.toLowerCase();
					// Parse content to code
					var code = _parseContentSyntax(content);
					if(!code) continue;
					code = _parsePluginShortcuts(code);
					// If local settings
					if(selectorText.indexOf('settings')===0) {
						_evaluateSettings(code);
						continue;
					};
					// Check the type of rule this is, and add it to the data.
					// If function
					if(selectorText.indexOf('function ')===0) {
						selectorText = selectorText.replace(/\[([\w\-\_]*)\]/g, function(m0, m1){
							m1 = m1.split('-').join(', ');
							return '('+m1+')';
						});
						if(selectorText.search(/\)\s*$/g)==-1) selectorText += '(index, element)';
						data.funcs[selectorText] = code;
						continue;
					// If variable
					} else if(selectorText.indexOf('var ')===0) {
						if(code.search(/^\s*var\s{1,}/g) == -1) code = 'var '+code;
						data.vars[selectorText] = code;
						continue;
					};
					// If element selector
					data.elems[selectorText] = code;
				};
			};
			// Evaluate generated code!!
			_eval(data);
		};
		
		/**
		 * _update():
		 * Gets #selector { content: "code"; } rules,
		 * and saves to Dictionary
		 */
		function _eval(procssData) {
			// Determine selector engine.
			var selectorEngine = 'none';
			if(typeof jQuery !== 'undefined') {
				var selectorEngine = 'jQuery',
						$ = jQuery;
			} else if(typeof Zepto !== 'undefined') {
				var selectorEngine = 'Zepto',
						$ = Zepto;
			};
			// Process CSS vars
			for(var _var in procssData.vars) {
				try {
					eval(procssData.vars[_var]);
				} catch(e) { if(settings.showErrors) console.error(e); };
			};
			// Evaluate functions
			for(var _func in procssData.funcs) {
				try {
					eval(_func+' { '+procssData.funcs[_func]+' } ');
				} catch(e) { if(settings.showErrors) console.error(e); };
			};
			// Process selectors
			//var userAgent = _getUserAgent();
			for(var selector in procssData.elems) {
				var code = procssData.elems[selector];
				if(selector == 'document') selector = document;
				if(selector == 'window') selector = window;	
				switch(selectorEngine) {
					case 'jQuery' :
					case 'Zepto' :
						$(selector).each(function(index, element){
							try {
								eval(code);
							} catch(e) { if(settings.showErrors) console.error(e); };
						});
						break;
				};
			};
		};
		
		/**
		 * End Procss Class.
		 */
	});
	
	ProcssPlugin = {
		procss: {
			shortcuts: {
				'Æ’': 'function', // Option+f
				'â€ ': 'this' // Option+t 
			}
		}
	};
	
}(PROCSS));

