/**
 * @desc Environment Detection - Gets Data Pertaining to User's Environment
 * @module Environment
 * @typicalname environment
 * @example
 * ```
 * var environment = require("ad-libs.js/lib/detect/environment");
 * ```
 */

/* jshint strict: false, nonstandard: true, browser: true, moz: true, esnext: true, es5: true */

// ****** BEGIN DETECT ENVIRONMENT CODE ******* //

'use strict';

var win = window,
	doc = win.document,
	nav = win.navigator,
	can = require('../canHas').can,
	has = require('../canHas').has;

/**
 * Return this ad's position within the parent, in the order of the frames around us.
 * @param pos
 * @private
 * @returns {String}
 */
var getFramePosition = function (pos) {
	if (win.parent.frames[pos] || pos > 100) {
		if (win.parent.frames[pos] === window) {
			return '' + pos;
		} else {
			return getFramePosition(pos + 1);
		}
	} else {
		return '-1';
	}
};

/**
 * Return the ad's depth in iframes.
 * @param myWin {Object} window object
 * @param depth {Number} nest level
 * @private
 * @returns {Number}
 */
var getFrameDepth = function (myWin, depth) {
	depth = depth || 0;
	myWin = myWin || window;

	if (myWin === top || depth > 100) {
		return depth;
	} else {
		return getFrameDepth(myWin.parent, depth + 1);
	}
};

var versionMatch = /(\d+.\d+)/i;

/**
 * Check the web standards compliant plugin interface for plugins by name.
 * @param name
 * @private
 * @returns {String}
 */
var checkPlugin = function (name) {
	/**
	 * @type plugin
	 * @property description
	 * @property version
	 * @property name
	 */
	var plugin = has(name, has('plugins', nav));
	var	version;

	if (typeof plugin === 'object') {
		if (versionMatch.test(has('version', plugin).toString())) {
			version = plugin.version;
		} else if (versionMatch.test(has('description', plugin).toString())) {
			version = plugin.description;
		} else if (versionMatch.test(has('name', plugin).toString())) {
			version = plugin.name;
		} else {
			version = '1.0'; // @todo come up with something a little more scientific
		}

		// This has to come back with an array because it matched the test above in all cases.
		return '' + parseFloat(version.match(versionMatch)[1].replace('_', '.'));
	}
	return '-1';
};

/**
 * Check standards compliant and active x interfaces for the flash plugin version.
 * @private
 * @returns {String}
 */
var getFlashVersion = function () {
	if (can(nav, 'plugins') && !has('ActiveXObject')) { // standards compliant browsers

		return checkPlugin('Shockwave Flash'); //Flash version

	} else if (has('ActiveXObject')) { // must be ie, but not the newest ie 11+ releases

		return (function () {
				var plugin,
					pluginVersion;

				try {
					plugin = (new has('ActiveXObject'))('ShockwaveFlash.ShockwaveFlash'); // jshint ignore:line
					pluginVersion = has('GetVariable', plugin)('$version');
					if (typeof pluginVersion === 'string') {
						pluginVersion.split(' ')[1].split(',');
					}
					return pluginVersion[0] + '.' + pluginVersion[1];
				} catch (e) {
					//Flash Not Installed
					return '-1';
				}
			}()) || '-1';
	}

	return '-1';
};

/**
 * Detect environmental variables and return them wrapped within an object.
 * @returns {Object} returns the environment object
 * @static
 * @example
 * ```js
 * var flash = environment.detect().flash;
 *
 * console.log(flash) // outputs the version of Flash
 * ```
 *
 */
var detect = function () {

	var environment = {},
		zoomRatio = 1,
		deviceWidth,
		pixelDensity,
		results = [],
		map = {};

	var save = function (result) {
		results.push(result);
		return results.length - 1;
	};

	environment.parent_ads = has('length', has('frames', win.parent)) || '-1';
	map.PARENT_ADS = save(environment.parent_ads);

	try {
		environment.ad_order = getFramePosition(0);
	} catch (ex) {
		environment.ad_order = '-1';
	}

	try {
		environment.ad_depth = getFrameDepth() + '';
	} catch (ex) {
		environment.ad_depth = '-1';
	}

	map.AD_ORDER = save(environment.ad_order);
	map.AD_DEPTH = save(environment.ad_depth);

	if (can(screen,'deviceXDPI') && can(screen,'logicalXDPI')) { // old ie, so this must go before the IE check
		zoomRatio = (screen.deviceXDPI / screen.logicalXDPI).toFixed(3);
	} else if (has('all')) { // new ie
		zoomRatio = (doc.documentElement.offsetHeight / win.innerHeight).toFixed(3);
	} else if (has('orientation')) { // mobile webkit
		deviceWidth = (Math.abs(win.orientation) === 90) ? screen.height : screen.width;
		zoomRatio = (deviceWidth / win.innerWidth).toFixed(3);
	} else if (has('opera')) {
		zoomRatio = (top.outerWidth / top.innerWidth).toFixed(3);
	} // anything else is obnoxiously complex

	if (!isFinite(zoomRatio)) {
		zoomRatio = '-1';
	} else if (+zoomRatio !== 1) {
		zoomRatio = (+zoomRatio).toFixed(3);
	}

	pixelDensity = has('devicePixelRatio') || 1;

	environment.zoom_ratio = zoomRatio;
	environment.pixel_density = pixelDensity.toFixed(3);
	map.ZOOM_RATIO = save(zoomRatio);
	map.PIXEL_DENSITY = save(pixelDensity.toFixed(3));

	//d.documentElement.clientWidth; // ad width
	//d.documentElement.offsetWidth; // ??
	//d.documentElement.scrollWidth; // ??
	//
	//screen.availHeight; // total screen size available to the browser minus the os ui
	//screen.height; // total screen size
	//
	//w.outerWidth; // potentially as close as we can get on safari and chrome to the window width
	//w.innerWidth; // ad width including a check for scrollbars
	//
	//if (d.documentElement.clientWidth === w.innerWidth) { } // there are no horizontal scroll bars in the ad
	//if (d.documentElement.clientHeight === w.innerHeight) { } // there are no horizontal scroll bars in the ad
	//
	//if (isMobile) {
	//	if (screen.width === screen.availWidth) { console.log(''); } // maximized width
	//	else if (screen.width === screen.availHeight) { console.log(''); } // maximized width
	//}
	//
	//if (screen.height === screen.availHeight) { } // maximized width

	// Estimated screen size given the current screen, which is the only one we can measure

	environment.screen_w = ((has('width', screen) || '0') * pixelDensity).toFixed(0);
	environment.screen_h = ((has('height', screen) || '0') * pixelDensity).toFixed(0);

	// Estimated viewport size, but not really that accurate for IE without getting an event from IE 9-10 per the geometry strat
	// @todo fix this because it is definitely not correct the way it's implemented
	environment.avail_w = ((has('availWidth', screen) || '0') * pixelDensity).toFixed(0);
	environment.avail_h = Math.max((can(doc, 'documentElement') && has('clientWidth', doc.documentElement)) || 0, has('outerWidth') || 0).toFixed(0);

	//
	environment.ad_w = Math.max((can(doc, 'documentElement') && has('clientWidth', doc.documentElement)) || 0, has('innerWidth') || 0).toFixed(0);
	environment.ad_h = Math.max((can(doc, 'documentElement') && has('clientHeight', doc.documentElement)) || 0, has('innerHeight') || 0).toFixed(0);

	environment.flash = getFlashVersion();

	// Do not track info from the browser. The Mozilla implementation and Microsoft implements vary quite a bit.
	if (can(nav, 'doNotTrack')) {
		environment.dnt = (nav.doNotTrack === 'yes' || parseInt(nav.doNotTrack, 10) === 1) ? '1' : '0';
	} else if (can(nav, 'msDoNotTrack')) {
		environment.dnt = (nav.msDoNotTrack === 'yes' || parseInt(nav.msDoNotTrack, 10) === 1) ? '1' : '0';
	} else {
		environment.dnt = '-1';
	}

	// Rendering mode the browser is using. This represents a chance to check for quirks mode's target IE version
	environment.doc_mode = has('documentMode', doc) || '0';

	map.SCREEN_W = save(environment.screen_w);
	map.SCREEN_H = save(environment.screen_h);
	map.AVAIL_W = save(environment.avail_w);
	map.AVAIL_H = save(environment.avail_h);
	map.AD_W = save(environment.ad_w);
	map.AD_H = save(environment.ad_h);
	map.FLASH = save(environment.flash);
	map.DNT = save(environment.dnt);
	map.DOC_MODE = save(environment.doc_mode);

	/**
	 *
	 * @returns {Number}
	 */
	module.exports.getFlashVersion = function () {
		return parseFloat(environment.flash); //Flash Version
	};

	/**
	 *
	 * @returns {String}
	 */
	module.exports.getFrameDepth = function () {
		return environment.ad_depth;
	};


	/**
	 *
	 * @returns {{height: (*|String|Undefined), width: (*|String|Undefined)}}
	 */
	module.exports.getAvailableScreenSize = function () {
		return {
			height: environment.avail_h,
			width: environment.avail_w
		};
	};

	/**
	 *
	 * @returns {{height: (*|String|Undefined), width: (*|String|Undefined)}}
	 */
	module.exports.getScreenSize = function () {
		return {
			height: environment.screen_h,
			width: environment.screen_w
		};
	};

	/**
	 *
	 * @returns {{height: (*|String|Undefined), width: (*|String|Undefined)}}
	 */
	module.exports.getAdDocSize = function () {
		return {
			height: environment.ad_h,
			width: environment.ad_w
		};
	};

	module.exports.details = environment;
	module.exports.map = map;
	module.exports.results = results;

	return environment;
};

module.exports.detect = detect;

// ****** BEGIN DETECT ENVIRONMENT CODE ******* //
