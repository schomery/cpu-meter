'use strict';

var windows = require('sdk/windows').browserWindows;
var unload = require('sdk/system/unload');
var sp = require('sdk/simple-prefs');
var prefs = sp.prefs;
var os = require('sdk/system/runtime').OS;
var tabs = require('sdk/tabs');
var timers = require('sdk/timers');
var self = require('sdk/self');
var {viewFor} = require('sdk/view/core');

function rgb (p) {
  function cutHex(h) {
    return (h.charAt(0) === '#') ? h.substring(1, 7) : h;
  }
  function hexToR(h) {return parseInt((cutHex(h)).substring(0, 2), 16);}
  function hexToG(h) {return parseInt((cutHex(h)).substring(2, 4), 16);}
  function hexToB(h) {return parseInt((cutHex(h)).substring(4, 6), 16);}

  var r1 = hexToR(prefs.end);
  var r2 = hexToR(prefs.begin);
  var r = Math.round((r1 * p) + (r2 * (1 - p)));
  var g1 = hexToG(prefs.end);
  var g2 = hexToG(prefs.begin);
  var g = Math.round((g1 * p) + (g2 * (1 - p)));
  var b1 = hexToB(prefs.end);
  var b2 = hexToB(prefs.begin);
  var b = Math.round((b1 * p) + (b2 * (1 - p)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

var ui = (function () {
  var value;
  function add (window) {
    var document = viewFor(window).document;
    var urlBarIcons = document.getElementById('urlbar-icons');
    if (urlBarIcons) {
      var label = document.createElement('label');
      label.setAttribute('id', 'cpu-meter');
      urlBarIcons.appendChild(label);
    }
  }
  function remove (window) {
    var document = viewFor(window).document;
    var cpu = document.getElementById('cpu-meter');
    if (cpu && cpu.parentNode) {
      cpu.parentNode.removeChild(cpu);
    }
  }
  function update (window, str, color) {
    value = str;
    var document = viewFor(window).document;
    var cpu = document.getElementById('cpu-meter');
    if (cpu) {
      cpu.value = str;
      cpu.setAttribute('style', 'color: ' + (color || '#000'));
    }
  }
  for (let window of windows) {
    add(window);
  }
  windows.on('open', add);
  unload.when(function () {
    for (let window of windows) {
      remove(window);
    }
  });

  return function (val) {
    val = Math.round(val);
    for (let window of windows) {
      if (isNaN(val)) {
        update(window, '--%', '#000');
      }
      else {
        update(window, (val < 10 ? '0' + val : val) + '%', rgb(val / 100));
      }
    }
  };
})();
ui();

function monitor (val) {
  ui(val);
}
if (os === 'WINNT') {
  require('./monitor/windows').attach(monitor);
}
else {
  require('./monitor/linux').attach(monitor);
}
/* */
sp.on('period', function () {
  if (prefs.period < 1) {
    prefs.period = 1;
  }
});
/* welcome */
(function () {
  if (!prefs.welcome) {
    return;
  }
  var version = prefs.version;
  if (self.version !== version) {
    timers.setTimeout(function () {
      let url = 'http://firefox.add0n.com/cpu-meter.html?v=' + self.version;
      if (version && version !== 'undefined') {
        tabs.open({url: url + '&p=' + version + '&type=upgrade', inBackground: true});
      }
      else {
        tabs.open(url + '&type=install');
      }
      prefs.version = self.version;
    }, 3000);
  }
})();
