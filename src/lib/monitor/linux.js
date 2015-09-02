'use strict';

var process = require('sdk/system/child_process');
var sp = require('sdk/simple-prefs');
var prefs = sp.prefs;
var timers = require('sdk/timers');
var unload = require('sdk/system/unload');
var file = require('sdk/io/file');
var {env} = require('sdk/system/environment');
var {Cc, Ci, Cu} = require('chrome');

var callback, id, prs;
var ps = env.PATH
  .split(':')
  .map((p) => p += '/ps')
  .filter(p => file.exists(p))
  .shift();
var pid = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime).processID;

function terminate () {
  if (prs && !prs.killed) {
    prs.kill(true);
  }
}

function meter () {
  terminate();
  prs = process.spawn(ps, ['-p', pid + '', '-o', '%cpu']);
  prs.stdout.on('data', function (stdout) {
    var tmp = /\b[\d\.]+\b/.exec(stdout);
    if (tmp && tmp.length && callback) {
      callback(+tmp[0]);
      if (id) {
        timers.clearTimeout(id);
      }
      id = timers.setTimeout(meter, prefs.period * 1000);
    }
  });
  prs.stderr.on('data', function (stderr) {
    console.error(stderr);
  });
  prs.on('close', function (code) {
    prs = null;
  });
}
meter();
sp.on('period', meter);

unload.when(terminate);

exports.attach = function (c) {
  callback = c;
};
