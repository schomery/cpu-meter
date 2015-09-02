'use strict';

var process = require('sdk/system/child_process');
var sp = require('sdk/simple-prefs');
var prefs = sp.prefs;
var timers = require('sdk/timers');
var unload = require('sdk/system/unload');
var {Cu} = require('chrome');
var {FileUtils} = Cu.import('resource://gre/modules/FileUtils.jsm');

var spn, id, callback;
var cmd = FileUtils.getFile('WinD', ['System32', 'cmd.exe']);

function activate () {
  spn = process.spawn(cmd, ['/C', 'typeperf', '-si', prefs.period, '\\process(firefox)\\% processor time']);
  spn.stdout.on('data', function (stdout) {
    var tmp = /\"([\d\.]+)\"/.exec(stdout);
    if (tmp && tmp.length && !isNaN(tmp[1]) && callback) {
      callback(+(+tmp[1]).toFixed(1));
    }
  });
}
function terminate () {
  process.spawn(cmd, ['/C', 'taskkill', '/F', '/im', 'typeperf.exe']);
  if (spn && !spn.killed) {
    spn.kill();
  }
}
sp.on('period', function () {
  terminate();
  if (callback) {
    callback();
  }
  if (id) {
    timers.clearTimeout(id);
  }
  id = timers.setTimeout(activate, 1000);
});
unload.when(terminate);
activate();

exports.attach = function (c) {
  console.error(c);
  callback = c;
};
