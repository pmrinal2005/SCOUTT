var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir4, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y2, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count4, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process2 extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process2.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd3) {
    this.#cwd = cwd3;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// .wrangler/tmp/pages-YLsuOS/bundledWorker-0.8545474402286868.mjs
import { Writable as Writable2 } from "node:stream";
import { EventEmitter as EventEmitter2 } from "node:events";
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
// @__NO_SIDE_EFFECTS__
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
__name2(createNotImplementedError2, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw /* @__PURE__ */ createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
__name2(notImplemented2, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass2(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass2, "notImplementedClass");
__name2(notImplementedClass2, "notImplementedClass");
var _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
var nodeTiming2 = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry2 = class {
  static {
    __name(this, "PerformanceEntry");
  }
  static {
    __name2(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow2();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow2() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark3 = class PerformanceMark22 extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMark2");
  }
  static {
    __name2(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMeasure");
  }
  static {
    __name2(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  static {
    __name2(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList2 = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  static {
    __name2(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance2 = class {
  static {
    __name(this, "Performance");
  }
  static {
    __name2(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin2;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming2;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming2("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin2) {
      return _performanceNow2();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark3(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure2(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver2 = class {
  static {
    __name(this, "PerformanceObserver");
  }
  static {
    __name2(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
if (!("__unenv__" in performance2)) {
  const proto = Performance2.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance2)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance2, key, desc);
      }
    }
  }
}
globalThis.performance = performance2;
globalThis.Performance = Performance2;
globalThis.PerformanceEntry = PerformanceEntry2;
globalThis.PerformanceMark = PerformanceMark3;
globalThis.PerformanceMeasure = PerformanceMeasure2;
globalThis.PerformanceObserver = PerformanceObserver2;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
var noop_default2 = Object.assign(() => {
}, { __unenv__: true });
var _console2 = globalThis.console;
var _ignoreErrors2 = true;
var _stderr2 = new Writable2();
var _stdout2 = new Writable2();
var log3 = _console2?.log ?? noop_default2;
var info3 = _console2?.info ?? log3;
var trace3 = _console2?.trace ?? info3;
var debug3 = _console2?.debug ?? log3;
var table3 = _console2?.table ?? log3;
var error3 = _console2?.error ?? log3;
var warn3 = _console2?.warn ?? error3;
var createTask3 = _console2?.createTask ?? /* @__PURE__ */ notImplemented2("console.createTask");
var clear3 = _console2?.clear ?? noop_default2;
var count3 = _console2?.count ?? noop_default2;
var countReset3 = _console2?.countReset ?? noop_default2;
var dir3 = _console2?.dir ?? noop_default2;
var dirxml3 = _console2?.dirxml ?? noop_default2;
var group3 = _console2?.group ?? noop_default2;
var groupEnd3 = _console2?.groupEnd ?? noop_default2;
var groupCollapsed3 = _console2?.groupCollapsed ?? noop_default2;
var profile3 = _console2?.profile ?? noop_default2;
var profileEnd3 = _console2?.profileEnd ?? noop_default2;
var time3 = _console2?.time ?? noop_default2;
var timeEnd3 = _console2?.timeEnd ?? noop_default2;
var timeLog3 = _console2?.timeLog ?? noop_default2;
var timeStamp3 = _console2?.timeStamp ?? noop_default2;
var Console2 = _console2?.Console ?? /* @__PURE__ */ notImplementedClass2("console.Console");
var _times2 = /* @__PURE__ */ new Map();
var _stdoutErrorHandler2 = noop_default2;
var _stderrErrorHandler2 = noop_default2;
var workerdConsole2 = globalThis["console"];
var {
  assert: assert3,
  clear: clear22,
  // @ts-expect-error undocumented public API
  context: context2,
  count: count22,
  countReset: countReset22,
  // @ts-expect-error undocumented public API
  createTask: createTask22,
  debug: debug22,
  dir: dir22,
  dirxml: dirxml22,
  error: error22,
  group: group22,
  groupCollapsed: groupCollapsed22,
  groupEnd: groupEnd22,
  info: info22,
  log: log22,
  profile: profile22,
  profileEnd: profileEnd22,
  table: table22,
  time: time22,
  timeEnd: timeEnd22,
  timeLog: timeLog22,
  timeStamp: timeStamp22,
  trace: trace22,
  warn: warn22
} = workerdConsole2;
Object.assign(workerdConsole2, {
  Console: Console2,
  _ignoreErrors: _ignoreErrors2,
  _stderr: _stderr2,
  _stderrErrorHandler: _stderrErrorHandler2,
  _stdout: _stdout2,
  _stdoutErrorHandler: _stdoutErrorHandler2,
  _times: _times2
});
var console_default2 = workerdConsole2;
globalThis.console = console_default2;
var hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
  return BigInt(Date.now() * 1e6);
}, "bigint"), "bigint") });
var ReadStream2 = class {
  static {
    __name(this, "ReadStream");
  }
  static {
    __name2(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};
var WriteStream2 = class {
  static {
    __name(this, "WriteStream");
  }
  static {
    __name2(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir32, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y2, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env22) {
    return 1;
  }
  hasColors(count32, env22) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};
var NODE_VERSION2 = "22.14.0";
var Process2 = class _Process extends EventEmitter2 {
  static {
    __name(this, "_Process");
  }
  static {
    __name2(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream2(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream2(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream2(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd22) {
    this.#cwd = cwd22;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION2}`;
  }
  get versions() {
    return { node: NODE_VERSION2 };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw /* @__PURE__ */ createNotImplementedError2("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw /* @__PURE__ */ createNotImplementedError2("process.getActiveResourcesInfo");
  }
  exit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.exit");
  }
  reallyExit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.reallyExit");
  }
  kill() {
    throw /* @__PURE__ */ createNotImplementedError2("process.kill");
  }
  abort() {
    throw /* @__PURE__ */ createNotImplementedError2("process.abort");
  }
  dlopen() {
    throw /* @__PURE__ */ createNotImplementedError2("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw /* @__PURE__ */ createNotImplementedError2("process.loadEnvFile");
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("process.disconnect");
  }
  cpuUsage() {
    throw /* @__PURE__ */ createNotImplementedError2("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw /* @__PURE__ */ createNotImplementedError2("process.initgroups");
  }
  openStdin() {
    throw /* @__PURE__ */ createNotImplementedError2("process.openStdin");
  }
  assert() {
    throw /* @__PURE__ */ createNotImplementedError2("process.assert");
  }
  binding() {
    throw /* @__PURE__ */ createNotImplementedError2("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name2(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
var globalProcess2 = globalThis["process"];
var getBuiltinModule2 = globalProcess2.getBuiltinModule;
var workerdProcess2 = getBuiltinModule2("node:process");
var unenvProcess2 = new Process2({
  env: globalProcess2.env,
  hrtime: hrtime4,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess2.nextTick
});
var { exit: exit2, features: features2, platform: platform2 } = workerdProcess2;
var {
  _channel: _channel2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _disconnect: _disconnect2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _handleQueue: _handleQueue2,
  _kill: _kill2,
  _linkedBinding: _linkedBinding2,
  _maxListeners: _maxListeners2,
  _pendingMessage: _pendingMessage2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _send: _send2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  assert: assert22,
  availableMemory: availableMemory2,
  binding: binding2,
  channel: channel2,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  disconnect: disconnect2,
  dlopen: dlopen2,
  domain: domain2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exitCode: exitCode2,
  finalization: finalization2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getMaxListeners: getMaxListeners2,
  getuid: getuid2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  hrtime: hrtime32,
  initgroups: initgroups2,
  kill: kill2,
  listenerCount: listenerCount2,
  listeners: listeners2,
  loadEnvFile: loadEnvFile2,
  mainModule: mainModule2,
  memoryUsage: memoryUsage2,
  moduleLoadList: moduleLoadList2,
  nextTick: nextTick2,
  off: off2,
  on: on2,
  once: once2,
  openStdin: openStdin2,
  permission: permission2,
  pid: pid2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  reallyExit: reallyExit2,
  ref: ref2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  send: send2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  setuid: setuid2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  sourceMapsEnabled: sourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  throwDeprecation: throwDeprecation2,
  title: title2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  unref: unref2,
  uptime: uptime2,
  version: version2,
  versions: versions2
} = unenvProcess2;
var _process2 = {
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  loadEnvFile: loadEnvFile2,
  sourceMapsEnabled: sourceMapsEnabled2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  availableMemory: availableMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  disconnect: disconnect2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exit: exit2,
  finalization: finalization2,
  features: features2,
  getBuiltinModule: getBuiltinModule2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getMaxListeners: getMaxListeners2,
  hrtime: hrtime32,
  kill: kill2,
  listeners: listeners2,
  listenerCount: listenerCount2,
  memoryUsage: memoryUsage2,
  nextTick: nextTick2,
  on: on2,
  off: off2,
  once: once2,
  pid: pid2,
  platform: platform2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  title: title2,
  throwDeprecation: throwDeprecation2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  uptime: uptime2,
  version: version2,
  versions: versions2,
  // @ts-expect-error old API
  domain: domain2,
  initgroups: initgroups2,
  moduleLoadList: moduleLoadList2,
  reallyExit: reallyExit2,
  openStdin: openStdin2,
  assert: assert22,
  binding: binding2,
  send: send2,
  exitCode: exitCode2,
  channel: channel2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getuid: getuid2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setuid: setuid2,
  permission: permission2,
  mainModule: mainModule2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _maxListeners: _maxListeners2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _kill: _kill2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  _disconnect: _disconnect2,
  _handleQueue: _handleQueue2,
  _pendingMessage: _pendingMessage2,
  _channel: _channel2,
  _send: _send2,
  _linkedBinding: _linkedBinding2
};
var process_default2 = _process2;
globalThis.process = process_default2;
var ri = Object.defineProperty;
var Gt = /* @__PURE__ */ __name2((e) => {
  throw TypeError(e);
}, "Gt");
var ai = /* @__PURE__ */ __name2((e, t, s) => t in e ? ri(e, t, { enumerable: true, configurable: true, writable: true, value: s }) : e[t] = s, "ai");
var y = /* @__PURE__ */ __name2((e, t, s) => ai(e, typeof t != "symbol" ? t + "" : t, s), "y");
var yt = /* @__PURE__ */ __name2((e, t, s) => t.has(e) || Gt("Cannot " + s), "yt");
var u = /* @__PURE__ */ __name2((e, t, s) => (yt(e, t, "read from private field"), s ? s.call(e) : t.get(e)), "u");
var b = /* @__PURE__ */ __name2((e, t, s) => t.has(e) ? Gt("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), "b");
var x = /* @__PURE__ */ __name2((e, t, s, i) => (yt(e, t, "write to private field"), i ? i.call(e, s) : t.set(e, s), s), "x");
var A = /* @__PURE__ */ __name2((e, t, s) => (yt(e, t, "access private method"), s), "A");
var Vt = /* @__PURE__ */ __name2((e, t, s, i) => ({ set _(a) {
  x(e, t, a, s);
}, get _() {
  return u(e, t, i);
} }), "Vt");
var zt = /* @__PURE__ */ __name2((e, t, s) => (i, a) => {
  let r = -1;
  return n(0);
  async function n(o) {
    if (o <= r) throw new Error("next() called multiple times");
    r = o;
    let l, c = false, d;
    if (e[o] ? (d = e[o][0][0], i.req.routeIndex = o) : d = o === e.length && a || void 0, d) try {
      l = await d(i, () => n(o + 1));
    } catch (p) {
      if (p instanceof Error && t) i.error = p, l = await t(p, i), c = true;
      else throw p;
    }
    else i.finalized === false && s && (l = await s(i));
    return l && (i.finalized === false || c) && (i.res = l), i;
  }
  __name(n, "n");
  __name2(n, "n");
}, "zt");
var ni = /* @__PURE__ */ Symbol();
var oi = /* @__PURE__ */ __name2(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: s = false, dot: i = false } = t, r = (e instanceof Ss ? e.raw.headers : e.headers).get("Content-Type");
  return r != null && r.startsWith("multipart/form-data") || r != null && r.startsWith("application/x-www-form-urlencoded") ? li(e, { all: s, dot: i }) : {};
}, "oi");
async function li(e, t) {
  const s = await e.formData();
  return s ? ci(s, t) : {};
}
__name(li, "li");
__name2(li, "li");
function ci(e, t) {
  const s = /* @__PURE__ */ Object.create(null);
  return e.forEach((i, a) => {
    t.all || a.endsWith("[]") ? di(s, a, i) : s[a] = i;
  }), t.dot && Object.entries(s).forEach(([i, a]) => {
    i.includes(".") && (ui(s, i, a), delete s[i]);
  }), s;
}
__name(ci, "ci");
__name2(ci, "ci");
var di = /* @__PURE__ */ __name2((e, t, s) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(s) : e[t] = [e[t], s] : t.endsWith("[]") ? e[t] = [s] : e[t] = s;
}, "di");
var ui = /* @__PURE__ */ __name2((e, t, s) => {
  if (/(?:^|\.)__proto__\./.test(t)) return;
  let i = e;
  const a = t.split(".");
  a.forEach((r, n) => {
    n === a.length - 1 ? i[r] = s : ((!i[r] || typeof i[r] != "object" || Array.isArray(i[r]) || i[r] instanceof File) && (i[r] = /* @__PURE__ */ Object.create(null)), i = i[r]);
  });
}, "ui");
var bs = /* @__PURE__ */ __name2((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "bs");
var pi = /* @__PURE__ */ __name2((e) => {
  const { groups: t, path: s } = fi(e), i = bs(s);
  return hi(i, t);
}, "pi");
var fi = /* @__PURE__ */ __name2((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (s, i) => {
    const a = `@${i}`;
    return t.push([a, s]), a;
  }), { groups: t, path: e };
}, "fi");
var hi = /* @__PURE__ */ __name2((e, t) => {
  for (let s = t.length - 1; s >= 0; s--) {
    const [i] = t[s];
    for (let a = e.length - 1; a >= 0; a--) if (e[a].includes(i)) {
      e[a] = e[a].replace(i, t[s][1]);
      break;
    }
  }
  return e;
}, "hi");
var et = {};
var mi = /* @__PURE__ */ __name2((e, t) => {
  if (e === "*") return "*";
  const s = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (s) {
    const i = `${e}#${t}`;
    return et[i] || (s[2] ? et[i] = t && t[0] !== ":" && t[0] !== "*" ? [i, s[1], new RegExp(`^${s[2]}(?=/${t})`)] : [e, s[1], new RegExp(`^${s[2]}$`)] : et[i] = [e, s[1], true]), et[i];
  }
  return null;
}, "mi");
var Nt = /* @__PURE__ */ __name2((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (s) => {
      try {
        return t(s);
      } catch {
        return s;
      }
    });
  }
}, "Nt");
var gi = /* @__PURE__ */ __name2((e) => Nt(e, decodeURI), "gi");
var ws = /* @__PURE__ */ __name2((e) => {
  const t = e.url, s = t.indexOf("/", t.indexOf(":") + 4);
  let i = s;
  for (; i < t.length; i++) {
    const a = t.charCodeAt(i);
    if (a === 37) {
      const r = t.indexOf("?", i), n = t.indexOf("#", i), o = r === -1 ? n === -1 ? void 0 : n : n === -1 ? r : Math.min(r, n), l = t.slice(s, o);
      return gi(l.includes("%25") ? l.replace(/%25/g, "%2525") : l);
    } else if (a === 63 || a === 35) break;
  }
  return t.slice(s, i);
}, "ws");
var vi = /* @__PURE__ */ __name2((e) => {
  const t = ws(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "vi");
var ae = /* @__PURE__ */ __name2((e, t, ...s) => (s.length && (t = ae(t, ...s)), `${(e == null ? void 0 : e[0]) === "/" ? "" : "/"}${e}${t === "/" ? "" : `${(e == null ? void 0 : e.at(-1)) === "/" ? "" : "/"}${(t == null ? void 0 : t[0]) === "/" ? t.slice(1) : t}`}`), "ae");
var ks = /* @__PURE__ */ __name2((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":")) return null;
  const t = e.split("/"), s = [];
  let i = "";
  return t.forEach((a) => {
    if (a !== "" && !/\:/.test(a)) i += "/" + a;
    else if (/\:/.test(a)) if (/\?/.test(a)) {
      s.length === 0 && i === "" ? s.push("/") : s.push(i);
      const r = a.replace("?", "");
      i += "/" + r, s.push(i);
    } else i += "/" + a;
  }), s.filter((a, r, n) => n.indexOf(a) === r);
}, "ks");
var xt = /* @__PURE__ */ __name2((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? Nt(e, As) : e) : e, "xt");
var Es = /* @__PURE__ */ __name2((e, t, s) => {
  let i;
  if (!s && t && !/[%+]/.test(t)) {
    let n = e.indexOf("?", 8);
    if (n === -1) return;
    for (e.startsWith(t, n + 1) || (n = e.indexOf(`&${t}`, n + 1)); n !== -1; ) {
      const o = e.charCodeAt(n + t.length + 1);
      if (o === 61) {
        const l = n + t.length + 2, c = e.indexOf("&", l);
        return xt(e.slice(l, c === -1 ? void 0 : c));
      } else if (o == 38 || isNaN(o)) return "";
      n = e.indexOf(`&${t}`, n + 1);
    }
    if (i = /[%+]/.test(e), !i) return;
  }
  const a = {};
  i ?? (i = /[%+]/.test(e));
  let r = e.indexOf("?", 8);
  for (; r !== -1; ) {
    const n = e.indexOf("&", r + 1);
    let o = e.indexOf("=", r);
    o > n && n !== -1 && (o = -1);
    let l = e.slice(r + 1, o === -1 ? n === -1 ? void 0 : n : o);
    if (i && (l = xt(l)), r = n, l === "") continue;
    let c;
    o === -1 ? c = "" : (c = e.slice(o + 1, n === -1 ? void 0 : n), i && (c = xt(c))), s ? (a[l] && Array.isArray(a[l]) || (a[l] = []), a[l].push(c)) : a[l] ?? (a[l] = c);
  }
  return t ? a[t] : a;
}, "Es");
var yi = Es;
var xi = /* @__PURE__ */ __name2((e, t) => Es(e, t, true), "xi");
var As = decodeURIComponent;
var Wt = /* @__PURE__ */ __name2((e) => Nt(e, As), "Wt");
var ke;
var L;
var Q;
var Cs;
var $s;
var _t;
var V;
var hs;
var Ss = (hs = class {
  static {
    __name(this, "hs");
  }
  static {
    __name2(this, "hs");
  }
  constructor(e, t = "/", s = [[]]) {
    b(this, Q);
    y(this, "raw");
    b(this, ke);
    b(this, L);
    y(this, "routeIndex", 0);
    y(this, "path");
    y(this, "bodyCache", {});
    b(this, V, (e2) => {
      const { bodyCache: t2, raw: s2 } = this, i = t2[e2];
      if (i) return i;
      const a = Object.keys(t2)[0];
      return a ? t2[a].then((r) => (a === "json" && (r = JSON.stringify(r)), new Response(r)[e2]())) : t2[e2] = s2[e2]();
    });
    this.raw = e, this.path = t, x(this, L, s), x(this, ke, {});
  }
  param(e) {
    return e ? A(this, Q, Cs).call(this, e) : A(this, Q, $s).call(this);
  }
  query(e) {
    return yi(this.url, e);
  }
  queries(e) {
    return xi(this.url, e);
  }
  header(e) {
    if (e) return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((s, i) => {
      t[i] = s;
    }), t;
  }
  async parseBody(e) {
    return oi(this, e);
  }
  json() {
    return u(this, V).call(this, "text").then((e) => JSON.parse(e));
  }
  text() {
    return u(this, V).call(this, "text");
  }
  arrayBuffer() {
    return u(this, V).call(this, "arrayBuffer");
  }
  bytes() {
    return u(this, V).call(this, "arrayBuffer").then((e) => new Uint8Array(e));
  }
  blob() {
    return u(this, V).call(this, "blob");
  }
  formData() {
    return u(this, V).call(this, "formData");
  }
  addValidatedData(e, t) {
    u(this, ke)[e] = t;
  }
  valid(e) {
    return u(this, ke)[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [ni]() {
    return u(this, L);
  }
  get matchedRoutes() {
    return u(this, L)[0].map(([[, e]]) => e);
  }
  get routePath() {
    return u(this, L)[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
}, ke = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakSet(), Cs = /* @__PURE__ */ __name2(function(e) {
  const t = u(this, L)[0][this.routeIndex][1][e], s = A(this, Q, _t).call(this, t);
  return s && /\%/.test(s) ? Wt(s) : s;
}, "Cs"), $s = /* @__PURE__ */ __name2(function() {
  const e = {}, t = Object.keys(u(this, L)[0][this.routeIndex][1]);
  for (const s of t) {
    const i = A(this, Q, _t).call(this, u(this, L)[0][this.routeIndex][1][s]);
    i !== void 0 && (e[s] = /\%/.test(i) ? Wt(i) : i);
  }
  return e;
}, "$s"), _t = /* @__PURE__ */ __name2(function(e) {
  return u(this, L)[1] ? u(this, L)[1][e] : e;
}, "_t"), V = /* @__PURE__ */ new WeakMap(), hs);
var we = { Stringify: 1, BeforeStream: 2, Stream: 3 };
var N = /* @__PURE__ */ __name2((e, t) => {
  const s = new String(e);
  return s.isEscaped = true, s.callbacks = t, s;
}, "N");
var bi = /[&<>'"]/;
var Ts = /* @__PURE__ */ __name2(async (e, t) => {
  let s = "";
  t || (t = []);
  const i = await Promise.all(e);
  for (let a = i.length - 1; s += i[a], a--, !(a < 0); a--) {
    let r = i[a];
    typeof r == "object" && t.push(...r.callbacks || []);
    const n = r.isEscaped;
    if (r = await (typeof r == "object" ? r.toString() : r), typeof r == "object" && t.push(...r.callbacks || []), r.isEscaped ?? n) s += r;
    else {
      const o = [s];
      re(r, o), s = o[0];
    }
  }
  return N(s, t);
}, "Ts");
var re = /* @__PURE__ */ __name2((e, t) => {
  const s = e.search(bi);
  if (s === -1) {
    t[0] += e;
    return;
  }
  let i, a, r = 0;
  for (a = s; a < e.length; a++) {
    switch (e.charCodeAt(a)) {
      case 34:
        i = "&quot;";
        break;
      case 39:
        i = "&#39;";
        break;
      case 38:
        i = "&amp;";
        break;
      case 60:
        i = "&lt;";
        break;
      case 62:
        i = "&gt;";
        break;
      default:
        continue;
    }
    t[0] += e.substring(r, a) + i, r = a + 1;
  }
  t[0] += e.substring(r, a);
}, "re");
var Ps = /* @__PURE__ */ __name2((e) => {
  const t = e.callbacks;
  if (!(t != null && t.length)) return e;
  const s = [e], i = {};
  return t.forEach((a) => a({ phase: we.Stringify, buffer: s, context: i })), s[0];
}, "Ps");
var dt = /* @__PURE__ */ __name2(async (e, t, s, i, a) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const r = e.callbacks;
  if (!(r != null && r.length)) return Promise.resolve(e);
  a ? a[0] += e : a = [e];
  const n = Promise.all(r.map((o) => o({ phase: t, buffer: a, context: i }))).then((o) => Promise.all(o.filter(Boolean).map((l) => dt(l, t, false, i, a))).then(() => a[0]));
  return s ? N(await n, r) : n;
}, "dt");
var wi = "text/plain; charset=UTF-8";
var bt = /* @__PURE__ */ __name2((e, t) => ({ "Content-Type": e, ...t }), "bt");
var Me = /* @__PURE__ */ __name2((e, t) => new Response(e, t), "Me");
var qe;
var Ge;
var z;
var Ee;
var W;
var O;
var Ve;
var Ae;
var Se;
var ce;
var ze;
var We;
var Z;
var xe;
var ms;
var ki = (ms = class {
  static {
    __name(this, "ms");
  }
  static {
    __name2(this, "ms");
  }
  constructor(e, t) {
    b(this, Z);
    b(this, qe);
    b(this, Ge);
    y(this, "env", {});
    b(this, z);
    y(this, "finalized", false);
    y(this, "error");
    b(this, Ee);
    b(this, W);
    b(this, O);
    b(this, Ve);
    b(this, Ae);
    b(this, Se);
    b(this, ce);
    b(this, ze);
    b(this, We);
    y(this, "render", (...e2) => (u(this, Ae) ?? x(this, Ae, (t2) => this.html(t2)), u(this, Ae).call(this, ...e2)));
    y(this, "setLayout", (e2) => x(this, Ve, e2));
    y(this, "getLayout", () => u(this, Ve));
    y(this, "setRenderer", (e2) => {
      x(this, Ae, e2);
    });
    y(this, "header", (e2, t2, s) => {
      this.finalized && x(this, O, Me(u(this, O).body, u(this, O)));
      const i = u(this, O) ? u(this, O).headers : u(this, ce) ?? x(this, ce, new Headers());
      t2 === void 0 ? i.delete(e2) : s != null && s.append ? i.append(e2, t2) : i.set(e2, t2);
    });
    y(this, "status", (e2) => {
      x(this, Ee, e2);
    });
    y(this, "set", (e2, t2) => {
      u(this, z) ?? x(this, z, /* @__PURE__ */ new Map()), u(this, z).set(e2, t2);
    });
    y(this, "get", (e2) => u(this, z) ? u(this, z).get(e2) : void 0);
    y(this, "newResponse", (...e2) => A(this, Z, xe).call(this, ...e2));
    y(this, "body", (e2, t2, s) => A(this, Z, xe).call(this, e2, t2, s));
    y(this, "text", (e2, t2, s) => !u(this, ce) && !u(this, Ee) && !t2 && !s && !this.finalized ? new Response(e2) : A(this, Z, xe).call(this, e2, t2, bt(wi, s)));
    y(this, "json", (e2, t2, s) => A(this, Z, xe).call(this, JSON.stringify(e2), t2, bt("application/json", s)));
    y(this, "html", (e2, t2, s) => {
      const i = /* @__PURE__ */ __name2((a) => A(this, Z, xe).call(this, a, t2, bt("text/html; charset=UTF-8", s)), "i");
      return typeof e2 == "object" ? dt(e2, we.Stringify, false, {}).then(i) : i(e2);
    });
    y(this, "redirect", (e2, t2) => {
      const s = String(e2);
      return this.header("Location", /[^\x00-\xFF]/.test(s) ? encodeURI(s) : s), this.newResponse(null, t2 ?? 302);
    });
    y(this, "notFound", () => (u(this, Se) ?? x(this, Se, () => Me()), u(this, Se).call(this, this)));
    x(this, qe, e), t && (x(this, W, t.executionCtx), this.env = t.env, x(this, Se, t.notFoundHandler), x(this, We, t.path), x(this, ze, t.matchResult));
  }
  get req() {
    return u(this, Ge) ?? x(this, Ge, new Ss(u(this, qe), u(this, We), u(this, ze))), u(this, Ge);
  }
  get event() {
    if (u(this, W) && "respondWith" in u(this, W)) return u(this, W);
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (u(this, W)) return u(this, W);
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return u(this, O) || x(this, O, Me(null, { headers: u(this, ce) ?? x(this, ce, new Headers()) }));
  }
  set res(e) {
    if (u(this, O) && e) {
      e = Me(e.body, e);
      for (const [t, s] of u(this, O).headers.entries()) if (t !== "content-type") if (t === "set-cookie") {
        const i = u(this, O).headers.getSetCookie();
        e.headers.delete("set-cookie");
        for (const a of i) e.headers.append("set-cookie", a);
      } else e.headers.set(t, s);
    }
    x(this, O, e), this.finalized = true;
  }
  get var() {
    return u(this, z) ? Object.fromEntries(u(this, z)) : {};
  }
}, qe = /* @__PURE__ */ new WeakMap(), Ge = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), W = /* @__PURE__ */ new WeakMap(), O = /* @__PURE__ */ new WeakMap(), Ve = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), Se = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakSet(), xe = /* @__PURE__ */ __name2(function(e, t, s) {
  const i = u(this, O) ? new Headers(u(this, O).headers) : u(this, ce) ?? new Headers();
  if (typeof t == "object" && "headers" in t) {
    const r = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
    for (const [n, o] of r) n.toLowerCase() === "set-cookie" ? i.append(n, o) : i.set(n, o);
  }
  if (s) for (const [r, n] of Object.entries(s)) if (typeof n == "string") i.set(r, n);
  else {
    i.delete(r);
    for (const o of n) i.append(r, o);
  }
  const a = typeof t == "number" ? t : (t == null ? void 0 : t.status) ?? u(this, Ee);
  return Me(e, { status: a, headers: i });
}, "xe"), ms);
var R = "ALL";
var Ei = "all";
var Ai = ["get", "post", "put", "delete", "options", "patch"];
var Rs = "Can not add a route since the matcher is already built.";
var _s = class extends Error {
  static {
    __name(this, "_s");
  }
  static {
    __name2(this, "_s");
  }
};
var Si = "__COMPOSED_HANDLER";
var Ci = /* @__PURE__ */ __name2((e) => e.text("404 Not Found", 404), "Ci");
var Kt = /* @__PURE__ */ __name2((e, t) => {
  if ("getResponse" in e) {
    const s = e.getResponse();
    return t.newResponse(s.body, s);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "Kt");
var D;
var _;
var Is;
var H;
var ne;
var rt;
var at;
var Ce;
var $i = (Ce = class {
  static {
    __name(this, "Ce");
  }
  static {
    __name2(this, "Ce");
  }
  constructor(t = {}) {
    b(this, _);
    y(this, "get");
    y(this, "post");
    y(this, "put");
    y(this, "delete");
    y(this, "options");
    y(this, "patch");
    y(this, "all");
    y(this, "on");
    y(this, "use");
    y(this, "router");
    y(this, "getPath");
    y(this, "_basePath", "/");
    b(this, D, "/");
    y(this, "routes", []);
    b(this, H, Ci);
    y(this, "errorHandler", Kt);
    y(this, "onError", (t2) => (this.errorHandler = t2, this));
    y(this, "notFound", (t2) => (x(this, H, t2), this));
    y(this, "fetch", (t2, ...s) => A(this, _, at).call(this, t2, s[1], s[0], t2.method));
    y(this, "request", (t2, s, i2, a2) => t2 instanceof Request ? this.fetch(s ? new Request(t2, s) : t2, i2, a2) : (t2 = t2.toString(), this.fetch(new Request(/^https?:\/\//.test(t2) ? t2 : `http://localhost${ae("/", t2)}`, s), i2, a2)));
    y(this, "fire", () => {
      addEventListener("fetch", (t2) => {
        t2.respondWith(A(this, _, at).call(this, t2.request, t2, void 0, t2.request.method));
      });
    });
    [...Ai, Ei].forEach((r) => {
      this[r] = (n, ...o) => (typeof n == "string" ? x(this, D, n) : A(this, _, ne).call(this, r, u(this, D), n), o.forEach((l) => {
        A(this, _, ne).call(this, r, u(this, D), l);
      }), this);
    }), this.on = (r, n, ...o) => {
      for (const l of [n].flat()) {
        x(this, D, l);
        for (const c of [r].flat()) o.map((d) => {
          A(this, _, ne).call(this, c.toUpperCase(), u(this, D), d);
        });
      }
      return this;
    }, this.use = (r, ...n) => (typeof r == "string" ? x(this, D, r) : (x(this, D, "*"), n.unshift(r)), n.forEach((o) => {
      A(this, _, ne).call(this, R, u(this, D), o);
    }), this);
    const { strict: i, ...a } = t;
    Object.assign(this, a), this.getPath = i ?? true ? t.getPath ?? ws : vi;
  }
  route(t, s) {
    const i = this.basePath(t);
    return s.routes.map((a) => {
      var n;
      let r;
      s.errorHandler === Kt ? r = a.handler : (r = /* @__PURE__ */ __name2(async (o, l) => (await zt([], s.errorHandler)(o, () => a.handler(o, l))).res, "r"), r[Si] = a.handler), A(n = i, _, ne).call(n, a.method, a.path, r, a.basePath);
    }), this;
  }
  basePath(t) {
    const s = A(this, _, Is).call(this);
    return s._basePath = ae(this._basePath, t), s;
  }
  mount(t, s, i) {
    let a, r;
    i && (typeof i == "function" ? r = i : (r = i.optionHandler, i.replaceRequest === false ? a = /* @__PURE__ */ __name2((l) => l, "a") : a = i.replaceRequest));
    const n = r ? (l) => {
      const c = r(l);
      return Array.isArray(c) ? c : [c];
    } : (l) => {
      let c;
      try {
        c = l.executionCtx;
      } catch {
      }
      return [l.env, c];
    };
    a || (a = (() => {
      const l = ae(this._basePath, t), c = l === "/" ? 0 : l.length;
      return (d) => {
        const p = new URL(d.url);
        return p.pathname = this.getPath(d).slice(c) || "/", new Request(p, d);
      };
    })());
    const o = /* @__PURE__ */ __name2(async (l, c) => {
      const d = await s(a(l.req.raw), ...n(l));
      if (d) return d;
      await c();
    }, "o");
    return A(this, _, ne).call(this, R, ae(t, "*"), o), this;
  }
}, D = /* @__PURE__ */ new WeakMap(), _ = /* @__PURE__ */ new WeakSet(), Is = /* @__PURE__ */ __name2(function() {
  const t = new Ce({ router: this.router, getPath: this.getPath });
  return t.errorHandler = this.errorHandler, x(t, H, u(this, H)), t.routes = this.routes, t;
}, "Is"), H = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ __name2(function(t, s, i, a) {
  t = t.toUpperCase(), s = ae(this._basePath, s);
  const r = { basePath: a !== void 0 ? ae(this._basePath, a) : this._basePath, path: s, method: t, handler: i };
  this.router.add(t, s, [i, r]), this.routes.push(r);
}, "ne"), rt = /* @__PURE__ */ __name2(function(t, s) {
  if (t instanceof Error) return this.errorHandler(t, s);
  throw t;
}, "rt"), at = /* @__PURE__ */ __name2(function(t, s, i, a) {
  if (a === "HEAD") return (async () => new Response(null, await A(this, _, at).call(this, t, s, i, "GET")))();
  const r = this.getPath(t, { env: i }), n = this.router.match(a, r), o = new ki(t, { path: r, matchResult: n, env: i, executionCtx: s, notFoundHandler: u(this, H) });
  if (n[0].length === 1) {
    let c;
    try {
      c = n[0][0][0][0](o, async () => {
        o.res = await u(this, H).call(this, o);
      });
    } catch (d) {
      return A(this, _, rt).call(this, d, o);
    }
    return c instanceof Promise ? c.then((d) => d || (o.finalized ? o.res : u(this, H).call(this, o))).catch((d) => A(this, _, rt).call(this, d, o)) : c ?? u(this, H).call(this, o);
  }
  const l = zt(n[0], this.errorHandler, u(this, H));
  return (async () => {
    try {
      const c = await l(o);
      if (!c.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
      return c.res;
    } catch (c) {
      return A(this, _, rt).call(this, c, o);
    }
  })();
}, "at"), Ce);
var js = [];
function Ti(e, t) {
  const s = this.buildAllMatchers(), i = /* @__PURE__ */ __name2(((a, r) => {
    const n = s[a] || s[R], o = n[2][r];
    if (o) return o;
    const l = r.match(n[0]);
    if (!l) return [[], js];
    const c = l.indexOf("", 1);
    return [n[1][c], l];
  }), "i");
  return this.match = i, i(e, t);
}
__name(Ti, "Ti");
__name2(Ti, "Ti");
var ut = "[^/]+";
var Le = ".*";
var Be = "(?:|/.*)";
var be = /* @__PURE__ */ Symbol();
var Pi = new Set(".\\+*[^]$()");
function Ri(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === Le || e === Be ? 1 : t === Le || t === Be ? -1 : e === ut ? 1 : t === ut ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(Ri, "Ri");
__name2(Ri, "Ri");
var de;
var ue;
var F;
var he;
var _i = (he = class {
  static {
    __name(this, "he");
  }
  static {
    __name2(this, "he");
  }
  constructor() {
    b(this, de);
    b(this, ue);
    b(this, F, /* @__PURE__ */ Object.create(null));
  }
  insert(t, s, i, a, r) {
    if (t.length === 0) {
      if (u(this, de) !== void 0) throw be;
      if (r) return;
      x(this, de, s);
      return;
    }
    const [n, ...o] = t, l = n === "*" ? o.length === 0 ? ["", "", Le] : ["", "", ut] : n === "/*" ? ["", "", Be] : n.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let c;
    if (l) {
      const d = l[1];
      let p = l[2] || ut;
      if (d && l[2] && (p === ".*" || (p = p.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(p)))) throw be;
      if (c = u(this, F)[p], !c) {
        if (Object.keys(u(this, F)).some((f) => f !== Le && f !== Be)) throw be;
        if (r) return;
        c = u(this, F)[p] = new he(), d !== "" && x(c, ue, a.varIndex++);
      }
      !r && d !== "" && i.push([d, u(c, ue)]);
    } else if (c = u(this, F)[n], !c) {
      if (Object.keys(u(this, F)).some((d) => d.length > 1 && d !== Le && d !== Be)) throw be;
      if (r) return;
      c = u(this, F)[n] = new he();
    }
    c.insert(o, s, i, a, r);
  }
  buildRegExpStr() {
    const s = Object.keys(u(this, F)).sort(Ri).map((i) => {
      const a = u(this, F)[i];
      return (typeof u(a, ue) == "number" ? `(${i})@${u(a, ue)}` : Pi.has(i) ? `\\${i}` : i) + a.buildRegExpStr();
    });
    return typeof u(this, de) == "number" && s.unshift(`#${u(this, de)}`), s.length === 0 ? "" : s.length === 1 ? s[0] : "(?:" + s.join("|") + ")";
  }
}, de = /* @__PURE__ */ new WeakMap(), ue = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap(), he);
var mt;
var Ke;
var gs;
var Ii = (gs = class {
  static {
    __name(this, "gs");
  }
  static {
    __name2(this, "gs");
  }
  constructor() {
    b(this, mt, { varIndex: 0 });
    b(this, Ke, new _i());
  }
  insert(e, t, s) {
    const i = [], a = [];
    for (let n = 0; ; ) {
      let o = false;
      if (e = e.replace(/\{[^}]+\}/g, (l) => {
        const c = `@\\${n}`;
        return a[n] = [c, l], n++, o = true, c;
      }), !o) break;
    }
    const r = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let n = a.length - 1; n >= 0; n--) {
      const [o] = a[n];
      for (let l = r.length - 1; l >= 0; l--) if (r[l].indexOf(o) !== -1) {
        r[l] = r[l].replace(o, a[n][1]);
        break;
      }
    }
    return u(this, Ke).insert(r, t, i, u(this, mt), s), i;
  }
  buildRegExp() {
    let e = u(this, Ke).buildRegExpStr();
    if (e === "") return [/^$/, [], []];
    let t = 0;
    const s = [], i = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, r, n) => r !== void 0 ? (s[++t] = Number(r), "$()") : (n !== void 0 && (i[Number(n)] = ++t), "")), [new RegExp(`^${e}`), s, i];
  }
}, mt = /* @__PURE__ */ new WeakMap(), Ke = /* @__PURE__ */ new WeakMap(), gs);
var ji = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var nt = /* @__PURE__ */ Object.create(null);
function Ms(e) {
  return nt[e] ?? (nt[e] = new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, s) => s ? `\\${s}` : "(?:|/.*)")}$`));
}
__name(Ms, "Ms");
__name2(Ms, "Ms");
function Mi() {
  nt = /* @__PURE__ */ Object.create(null);
}
__name(Mi, "Mi");
__name2(Mi, "Mi");
function Oi(e) {
  var c;
  const t = new Ii(), s = [];
  if (e.length === 0) return ji;
  const i = e.map((d) => [!/\*|\/:/.test(d[0]), ...d]).sort(([d, p], [f, h]) => d ? 1 : f ? -1 : p.length - h.length), a = /* @__PURE__ */ Object.create(null);
  for (let d = 0, p = -1, f = i.length; d < f; d++) {
    const [h, m, g] = i[d];
    h ? a[m] = [g.map(([k]) => [k, /* @__PURE__ */ Object.create(null)]), js] : p++;
    let v;
    try {
      v = t.insert(m, p, h);
    } catch (k) {
      throw k === be ? new _s(m) : k;
    }
    h || (s[p] = g.map(([k, w]) => {
      const j = /* @__PURE__ */ Object.create(null);
      for (w -= 1; w >= 0; w--) {
        const [E, C] = v[w];
        j[E] = C;
      }
      return [k, j];
    }));
  }
  const [r, n, o] = t.buildRegExp();
  for (let d = 0, p = s.length; d < p; d++) for (let f = 0, h = s[d].length; f < h; f++) {
    const m = (c = s[d][f]) == null ? void 0 : c[1];
    if (!m) continue;
    const g = Object.keys(m);
    for (let v = 0, k = g.length; v < k; v++) m[g[v]] = o[m[g[v]]];
  }
  const l = [];
  for (const d in n) l[d] = s[n[d]];
  return [r, l, a];
}
__name(Oi, "Oi");
__name2(Oi, "Oi");
function ve(e, t) {
  if (e) {
    for (const s of Object.keys(e).sort((i, a) => a.length - i.length)) if (Ms(s).test(t)) return [...e[s]];
  }
}
__name(ve, "ve");
__name2(ve, "ve");
var X;
var ee;
var gt;
var Os;
var vs;
var Ni = (vs = class {
  static {
    __name(this, "vs");
  }
  static {
    __name2(this, "vs");
  }
  constructor() {
    b(this, gt);
    y(this, "name", "RegExpRouter");
    b(this, X);
    b(this, ee);
    y(this, "match", Ti);
    x(this, X, { [R]: /* @__PURE__ */ Object.create(null) }), x(this, ee, { [R]: /* @__PURE__ */ Object.create(null) });
  }
  add(e, t, s) {
    var o;
    const i = u(this, X), a = u(this, ee);
    if (!i || !a) throw new Error(Rs);
    i[e] || [i, a].forEach((l) => {
      l[e] = /* @__PURE__ */ Object.create(null), Object.keys(l[R]).forEach((c) => {
        l[e][c] = [...l[R][c]];
      });
    }), t === "/*" && (t = "*");
    const r = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const l = Ms(t);
      e === R ? Object.keys(i).forEach((c) => {
        var d;
        (d = i[c])[t] || (d[t] = ve(i[c], t) || ve(i[R], t) || []);
      }) : (o = i[e])[t] || (o[t] = ve(i[e], t) || ve(i[R], t) || []), Object.keys(i).forEach((c) => {
        (e === R || e === c) && Object.keys(i[c]).forEach((d) => {
          l.test(d) && i[c][d].push([s, r]);
        });
      }), Object.keys(a).forEach((c) => {
        (e === R || e === c) && Object.keys(a[c]).forEach((d) => l.test(d) && a[c][d].push([s, r]));
      });
      return;
    }
    const n = ks(t) || [t];
    for (let l = 0, c = n.length; l < c; l++) {
      const d = n[l];
      Object.keys(a).forEach((p) => {
        var f;
        (e === R || e === p) && ((f = a[p])[d] || (f[d] = [...ve(i[p], d) || ve(i[R], d) || []]), a[p][d].push([s, r - c + l + 1]));
      });
    }
  }
  buildAllMatchers() {
    const e = /* @__PURE__ */ Object.create(null);
    return Object.keys(u(this, ee)).concat(Object.keys(u(this, X))).forEach((t) => {
      e[t] || (e[t] = A(this, gt, Os).call(this, t));
    }), x(this, X, x(this, ee, void 0)), Mi(), e;
  }
}, X = /* @__PURE__ */ new WeakMap(), ee = /* @__PURE__ */ new WeakMap(), gt = /* @__PURE__ */ new WeakSet(), Os = /* @__PURE__ */ __name2(function(e) {
  const t = [];
  let s = e === R;
  return [u(this, X), u(this, ee)].forEach((i) => {
    const a = i[e] ? Object.keys(i[e]).map((r) => [r, i[e][r]]) : [];
    a.length !== 0 ? (s || (s = true), t.push(...a)) : e !== R && t.push(...Object.keys(i[R]).map((r) => [r, i[R][r]]));
  }), s ? Oi(t) : null;
}, "Os"), vs);
var te;
var K;
var ys;
var Li = (ys = class {
  static {
    __name(this, "ys");
  }
  static {
    __name2(this, "ys");
  }
  constructor(e) {
    y(this, "name", "SmartRouter");
    b(this, te, []);
    b(this, K, []);
    x(this, te, e.routers);
  }
  add(e, t, s) {
    if (!u(this, K)) throw new Error(Rs);
    u(this, K).push([e, t, s]);
  }
  match(e, t) {
    if (!u(this, K)) throw new Error("Fatal error");
    const s = u(this, te), i = u(this, K), a = s.length;
    let r = 0, n;
    for (; r < a; r++) {
      const o = s[r];
      try {
        for (let l = 0, c = i.length; l < c; l++) o.add(...i[l]);
        n = o.match(e, t);
      } catch (l) {
        if (l instanceof _s) continue;
        throw l;
      }
      this.match = o.match.bind(o), x(this, te, [o]), x(this, K, void 0);
      break;
    }
    if (r === a) throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, n;
  }
  get activeRouter() {
    if (u(this, K) || u(this, te).length !== 1) throw new Error("No active router has been determined yet.");
    return u(this, te)[0];
  }
}, te = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakMap(), ys);
var Oe = /* @__PURE__ */ Object.create(null);
var Bi = /* @__PURE__ */ __name2((e) => {
  for (const t in e) return true;
  return false;
}, "Bi");
var se;
var M;
var pe;
var $e;
var I;
var Y;
var oe;
var Te;
var Di = (Te = class {
  static {
    __name(this, "Te");
  }
  static {
    __name2(this, "Te");
  }
  constructor(t, s, i) {
    b(this, Y);
    b(this, se);
    b(this, M);
    b(this, pe);
    b(this, $e, 0);
    b(this, I, Oe);
    if (x(this, M, i || /* @__PURE__ */ Object.create(null)), x(this, se, []), t && s) {
      const a = /* @__PURE__ */ Object.create(null);
      a[t] = { handler: s, possibleKeys: [], score: 0 }, x(this, se, [a]);
    }
    x(this, pe, []);
  }
  insert(t, s, i) {
    x(this, $e, ++Vt(this, $e)._);
    let a = this;
    const r = pi(s), n = [];
    for (let o = 0, l = r.length; o < l; o++) {
      const c = r[o], d = r[o + 1], p = mi(c, d), f = Array.isArray(p) ? p[0] : c;
      if (f in u(a, M)) {
        a = u(a, M)[f], p && n.push(p[1]);
        continue;
      }
      u(a, M)[f] = new Te(), p && (u(a, pe).push(p), n.push(p[1])), a = u(a, M)[f];
    }
    return u(a, se).push({ [t]: { handler: i, possibleKeys: n.filter((o, l, c) => c.indexOf(o) === l), score: u(this, $e) } }), a;
  }
  search(t, s) {
    var d;
    const i = [];
    x(this, I, Oe);
    let r = [this];
    const n = bs(s), o = [], l = n.length;
    let c = null;
    for (let p = 0; p < l; p++) {
      const f = n[p], h = p === l - 1, m = [];
      for (let v = 0, k = r.length; v < k; v++) {
        const w = r[v], j = u(w, M)[f];
        j && (x(j, I, u(w, I)), h ? (u(j, M)["*"] && A(this, Y, oe).call(this, i, u(j, M)["*"], t, u(w, I)), A(this, Y, oe).call(this, i, j, t, u(w, I))) : m.push(j));
        for (let E = 0, C = u(w, pe).length; E < C; E++) {
          const S = u(w, pe)[E], $ = u(w, I) === Oe ? {} : { ...u(w, I) };
          if (S === "*") {
            const me = u(w, M)["*"];
            me && (A(this, Y, oe).call(this, i, me, t, u(w, I)), x(me, I, $), m.push(me));
            continue;
          }
          const [U, Xe, Ie] = S;
          if (!f && !(Ie instanceof RegExp)) continue;
          const q = u(w, M)[U];
          if (Ie instanceof RegExp) {
            if (c === null) {
              c = new Array(l);
              let ge = s[0] === "/" ? 1 : 0;
              for (let je = 0; je < l; je++) c[je] = ge, ge += n[je].length + 1;
            }
            const me = s.substring(c[p]), vt = Ie.exec(me);
            if (vt) {
              if ($[Xe] = vt[0], A(this, Y, oe).call(this, i, q, t, u(w, I), $), Bi(u(q, M))) {
                x(q, I, $);
                const ge = ((d = vt[0].match(/\//)) == null ? void 0 : d.length) ?? 0;
                (o[ge] || (o[ge] = [])).push(q);
              }
              continue;
            }
          }
          (Ie === true || Ie.test(f)) && ($[Xe] = f, h ? (A(this, Y, oe).call(this, i, q, t, $, u(w, I)), u(q, M)["*"] && A(this, Y, oe).call(this, i, u(q, M)["*"], t, $, u(w, I))) : (x(q, I, $), m.push(q)));
        }
      }
      const g = o.shift();
      r = g ? m.concat(g) : m;
    }
    return i.length > 1 && i.sort((p, f) => p.score - f.score), [i.map(({ handler: p, params: f }) => [p, f])];
  }
}, se = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakSet(), oe = /* @__PURE__ */ __name2(function(t, s, i, a, r) {
  for (let n = 0, o = u(s, se).length; n < o; n++) {
    const l = u(s, se)[n], c = l[i] || l[R], d = {};
    if (c !== void 0 && (c.params = /* @__PURE__ */ Object.create(null), t.push(c), a !== Oe || r && r !== Oe)) for (let p = 0, f = c.possibleKeys.length; p < f; p++) {
      const h = c.possibleKeys[p], m = d[c.score];
      c.params[h] = r != null && r[h] && !m ? r[h] : a[h] ?? (r == null ? void 0 : r[h]), d[c.score] = true;
    }
  }
}, "oe"), Te);
var fe;
var xs;
var Hi = (xs = class {
  static {
    __name(this, "xs");
  }
  static {
    __name2(this, "xs");
  }
  constructor() {
    y(this, "name", "TrieRouter");
    b(this, fe);
    x(this, fe, new Di());
  }
  add(e, t, s) {
    const i = ks(t);
    if (i) {
      for (let a = 0, r = i.length; a < r; a++) u(this, fe).insert(e, i[a], s);
      return;
    }
    u(this, fe).insert(e, t, s);
  }
  match(e, t) {
    return u(this, fe).search(e, t);
  }
}, fe = /* @__PURE__ */ new WeakMap(), xs);
var Ns = class extends $i {
  static {
    __name(this, "Ns");
  }
  static {
    __name2(this, "Ns");
  }
  constructor(e = {}) {
    super(e), this.router = e.router ?? new Li({ routers: [new Ni(), new Hi()] });
  }
};
var Fi = /* @__PURE__ */ __name2((e) => {
  const t = { origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [], ...e }, s = ((a) => typeof a == "string" ? a === "*" ? t.credentials ? (r) => r || null : () => a : (r) => a === r ? r : null : typeof a == "function" ? a : (r) => a.includes(r) ? r : null)(t.origin), i = ((a) => typeof a == "function" ? a : Array.isArray(a) ? () => a : () => [])(t.allowMethods);
  return async function(r, n) {
    var c;
    function o(d, p) {
      r.res.headers.set(d, p);
    }
    __name(o, "o");
    __name2(o, "o");
    const l = await s(r.req.header("origin") || "", r);
    if (l && o("Access-Control-Allow-Origin", l), t.credentials && o("Access-Control-Allow-Credentials", "true"), (c = t.exposeHeaders) != null && c.length && o("Access-Control-Expose-Headers", t.exposeHeaders.join(",")), r.req.method === "OPTIONS") {
      (t.origin !== "*" || t.credentials) && o("Vary", "Origin"), t.maxAge != null && o("Access-Control-Max-Age", t.maxAge.toString());
      const d = await i(r.req.header("origin") || "", r);
      d.length && o("Access-Control-Allow-Methods", d.join(","));
      let p = t.allowHeaders;
      if (!(p != null && p.length)) {
        const f = r.req.header("Access-Control-Request-Headers");
        f && (p = f.split(/\s*,\s*/));
      }
      return p != null && p.length && (o("Access-Control-Allow-Headers", p.join(",")), r.res.headers.append("Vary", "Access-Control-Request-Headers")), r.res.headers.delete("Content-Length"), r.res.headers.delete("Content-Type"), new Response(null, { headers: r.res.headers, status: 204, statusText: "No Content" });
    }
    await n(), (t.origin !== "*" || t.credentials) && r.header("Vary", "Origin", { append: true });
  };
}, "Fi");
var Ui = /* @__PURE__ */ __name2((e, ...t) => {
  const s = [""];
  for (let i = 0, a = e.length - 1; i < a; i++) {
    s[0] += e[i];
    const r = Array.isArray(t[i]) ? t[i].flat(1 / 0) : [t[i]];
    for (let n = 0, o = r.length; n < o; n++) {
      const l = r[n];
      if (typeof l == "string") re(l, s);
      else if (typeof l == "number") s[0] += l;
      else {
        if (typeof l == "boolean" || l === null || l === void 0) continue;
        if (typeof l == "object" && l.isEscaped) if (l.callbacks) s.unshift("", l);
        else {
          const c = l.toString();
          c instanceof Promise ? s.unshift("", c) : s[0] += c;
        }
        else l instanceof Promise ? s.unshift("", l) : re(l.toString(), s);
      }
    }
  }
  return s[0] += e.at(-1), s.length === 1 ? "callbacks" in s ? N(Ps(N(s[0], s.callbacks))) : N(s[0]) : Ts(s, s.callbacks);
}, "Ui");
var Lt = /* @__PURE__ */ Symbol("RENDERER");
var It = /* @__PURE__ */ Symbol("ERROR_HANDLER");
var T = /* @__PURE__ */ Symbol("STASH");
var Ls = /* @__PURE__ */ Symbol("INTERNAL");
var qi = /* @__PURE__ */ Symbol("MEMO");
var pt = /* @__PURE__ */ Symbol("PERMALINK");
var Yt = /* @__PURE__ */ __name2((e) => (e[Ls] = true, e), "Yt");
var Bs = /* @__PURE__ */ __name2((e) => ({ value: t, children: s }) => {
  if (!s) return;
  const i = { children: [{ tag: Yt(() => {
    e.push(t);
  }), props: {} }] };
  Array.isArray(s) ? i.children.push(...s.flat()) : i.children.push(s), i.children.push({ tag: Yt(() => {
    e.pop();
  }), props: {} });
  const a = { tag: "", props: i, type: "" };
  return a[It] = (r) => {
    throw e.pop(), r;
  }, a;
}, "Bs");
var Ds = /* @__PURE__ */ __name2((e) => {
  const t = [e], s = Bs(t);
  return s.values = t, s.Provider = s, Pe.push(s), s;
}, "Ds");
var Pe = [];
var Bt = /* @__PURE__ */ __name2((e) => {
  const t = [e], s = /* @__PURE__ */ __name2(((i) => {
    t.push(i.value);
    let a;
    try {
      a = i.children ? (Array.isArray(i.children) ? new Vs("", {}, i.children) : i.children).toString() : "";
    } catch (r) {
      throw t.pop(), r;
    }
    return a instanceof Promise ? a.finally(() => t.pop()).then((r) => N(r, r.callbacks)) : (t.pop(), N(a));
  }), "s");
  return s.values = t, s.Provider = s, s[Lt] = Bs(t), Pe.push(s), s;
}, "Bt");
var _e = /* @__PURE__ */ __name2((e) => e.values.at(-1), "_e");
var ft = { title: [], script: ["src"], style: ["data-href"], link: ["href"], meta: ["name", "httpEquiv", "charset", "itemProp"] };
var jt = {};
var le = "data-precedence";
var Hs = /* @__PURE__ */ __name2((e) => e.rel === "stylesheet" && "precedence" in e, "Hs");
var Fs = /* @__PURE__ */ __name2((e, t) => e === "link" ? t : ft[e].length > 0, "Fs");
var Ye = /* @__PURE__ */ __name2((e) => Array.isArray(e) ? e : [e], "Ye");
var Jt = /* @__PURE__ */ new WeakMap();
var Qt = /* @__PURE__ */ __name2((e, t, s, i) => ({ buffer: a, context: r }) => {
  if (!a) return;
  const n = Jt.get(r) || {};
  Jt.set(r, n);
  const o = n[e] || (n[e] = []);
  let l = false;
  const c = ft[e], d = Fs(e, i !== void 0);
  if (d) {
    e: for (const [, p] of o) if (!(e === "link" && !(p.rel === "stylesheet" && p[le] !== void 0))) {
      for (const f of c) if (((p == null ? void 0 : p[f]) ?? null) === (s == null ? void 0 : s[f])) {
        l = true;
        break e;
      }
    }
  }
  if (l ? a[0] = a[0].replaceAll(t, "") : d || e === "link" ? o.push([t, s, i]) : o.unshift([t, s, i]), a[0].indexOf("</head>") !== -1) {
    let p;
    if (e === "link" || i !== void 0) {
      const f = [];
      p = o.map(([h, , m], g) => {
        if (m === void 0) return [h, Number.MAX_SAFE_INTEGER, g];
        let v = f.indexOf(m);
        return v === -1 && (f.push(m), v = f.length - 1), [h, v, g];
      }).sort((h, m) => h[1] - m[1] || h[2] - m[2]).map(([h]) => h);
    } else p = o.map(([f]) => f);
    p.forEach((f) => {
      a[0] = a[0].replaceAll(f, "");
    }), a[0] = a[0].replace(/(?=<\/head>)/, p.join(""));
  }
}, "Qt");
var Je = /* @__PURE__ */ __name2((e, t, s) => N(new B(e, s, Ye(t ?? [])).toString()), "Je");
var Qe = /* @__PURE__ */ __name2((e, t, s, i) => {
  if ("itemProp" in s) return Je(e, t, s);
  let { precedence: a, blocking: r, ...n } = s;
  a = i ? a ?? "" : void 0, i && (n[le] = a);
  const o = new B(e, n, Ye(t || [])).toString();
  return o instanceof Promise ? o.then((l) => N(o, [...l.callbacks || [], Qt(e, l, n, a)])) : N(o, [Qt(e, o, n, a)]);
}, "Qe");
var Gi = /* @__PURE__ */ __name2(({ children: e, ...t }) => {
  const s = Dt();
  if (s) {
    const i = _e(s);
    if (i === "svg" || i === "head") return new B("title", t, Ye(e ?? []));
  }
  return Qe("title", e, t, false);
}, "Gi");
var Vi = /* @__PURE__ */ __name2(({ children: e, ...t }) => {
  const s = Dt();
  return ["src", "async"].some((i) => !t[i]) || s && _e(s) === "head" ? Je("script", e, t) : Qe("script", e, t, false);
}, "Vi");
var zi = /* @__PURE__ */ __name2(({ children: e, ...t }) => ["href", "precedence"].every((s) => s in t) ? (t["data-href"] = t.href, delete t.href, Qe("style", e, t, true)) : Je("style", e, t), "zi");
var Wi = /* @__PURE__ */ __name2(({ children: e, ...t }) => ["onLoad", "onError"].some((s) => s in t) || t.rel === "stylesheet" && (!("precedence" in t) || "disabled" in t) ? Je("link", e, t) : Qe("link", e, t, Hs(t)), "Wi");
var Ki = /* @__PURE__ */ __name2(({ children: e, ...t }) => {
  const s = Dt();
  return s && _e(s) === "head" ? Je("meta", e, t) : Qe("meta", e, t, false);
}, "Ki");
var Us = /* @__PURE__ */ __name2((e, { children: t, ...s }) => new B(e, s, Ye(t ?? [])), "Us");
var Yi = /* @__PURE__ */ __name2((e) => (typeof e.action == "function" && (e.action = pt in e.action ? e.action[pt] : void 0), Us("form", e)), "Yi");
var qs = /* @__PURE__ */ __name2((e, t) => (typeof t.formAction == "function" && (t.formAction = pt in t.formAction ? t.formAction[pt] : void 0), Us(e, t)), "qs");
var Ji = /* @__PURE__ */ __name2((e) => qs("input", e), "Ji");
var Qi = /* @__PURE__ */ __name2((e) => qs("button", e), "Qi");
var wt = Object.freeze(Object.defineProperty({ __proto__: null, button: Qi, form: Yi, input: Ji, link: Wi, meta: Ki, script: Vi, style: zi, title: Gi }, Symbol.toStringTag, { value: "Module" }));
var Zi = /* @__PURE__ */ new Map([["className", "class"], ["htmlFor", "for"], ["crossOrigin", "crossorigin"], ["httpEquiv", "http-equiv"], ["itemProp", "itemprop"], ["fetchPriority", "fetchpriority"], ["noModule", "nomodule"], ["formAction", "formaction"]]);
var ht = /* @__PURE__ */ __name2((e) => Zi.get(e) || e, "ht");
var Xi = /[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/;
var kt = /* @__PURE__ */ new Set();
var Zt = 1024;
var er = /^[!?]|[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/;
var Xt = /* @__PURE__ */ new Set();
var tr = 256;
var De = /* @__PURE__ */ __name2((e, t, s) => {
  e.size >= t && e.clear(), e.add(s);
}, "De");
var sr = /* @__PURE__ */ __name2((e) => Xt.has(e) ? true : typeof e != "string" ? false : e.length === 0 ? true : er.test(e) ? false : (De(Xt, tr, e), true), "sr");
var ir = /* @__PURE__ */ __name2((e) => {
  if (kt.has(e)) return true;
  const t = e.length;
  if (t === 0) return false;
  for (let s = 0; s < t; s++) {
    const i = e.charCodeAt(s);
    if (!(i >= 97 && i <= 122 || i >= 65 && i <= 90 || i >= 48 && i <= 57 || i === 45 || i === 95 || i === 46 || i === 58)) return Xi.test(e) ? false : (De(kt, Zt, e), true);
  }
  return De(kt, Zt, e), true;
}, "ir");
var rr = /[\s"'():;\\/\[\]{}\x00-\x1f\x7f-\x9f]/;
var Et = /* @__PURE__ */ new Set();
var es = 1024;
var ar = /* @__PURE__ */ __name2((e) => {
  if (Et.has(e)) return true;
  const t = e.length;
  if (t === 0) return false;
  for (let s = 0; s < t; s++) {
    const i = e.charCodeAt(s);
    if (!(i >= 97 && i <= 122 || i >= 65 && i <= 90 || i >= 48 && i <= 57 || i === 45 || i === 95)) return rr.test(e) ? false : (De(Et, es, e), true);
  }
  return De(Et, es, e), true;
}, "ar");
var nr = /[;"'\\/\[\](){}]/;
var or = /* @__PURE__ */ __name2((e) => {
  if (!nr.test(e)) return false;
  let t = 0;
  const s = [];
  for (let i = 0, a = e.length; i < a; i++) {
    const r = e.charCodeAt(i);
    if (r === 92) {
      if (i === a - 1) return true;
      i++;
    } else if (t !== 0) {
      if (r === 10 || r === 12 || r === 13) return true;
      r === t && (t = 0);
    } else if (r === 47 && e.charCodeAt(i + 1) === 42) {
      const n = e.indexOf("*/", i + 2);
      if (n === -1) return true;
      i = n + 1;
    } else if (r === 34 || r === 39) t = r;
    else if (r === 40) s.push(41);
    else if (r === 91) s.push(93);
    else {
      if (r === 123 || r === 125) return true;
      if (r === 41 || r === 93) {
        if (s[s.length - 1] !== r) return true;
        s.pop();
      } else if (r === 59 && s.length === 0) return true;
    }
  }
  return t !== 0 || s.length !== 0;
}, "or");
var Gs = /* @__PURE__ */ __name2((e, t) => {
  for (const [s, i] of Object.entries(e)) {
    const a = s[0] === "-" || !/[A-Z]/.test(s) ? s : s.replace(/[A-Z]/g, (n) => `-${n.toLowerCase()}`);
    if (!ar(a)) continue;
    if (i == null) {
      t(a, null);
      continue;
    }
    let r;
    if (typeof i == "number") r = a.match(/^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/) ? `${i}` : `${i}px`;
    else if (typeof i == "string") {
      if (or(i)) continue;
      r = i;
    } else continue;
    t(a, r);
  }
}, "Gs");
var He = void 0;
var Dt = /* @__PURE__ */ __name2(() => He, "Dt");
var lr = /* @__PURE__ */ __name2((e) => /[A-Z]/.test(e) && e.match(/^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/) ? e.replace(/([A-Z])/g, "-$1").toLowerCase() : e, "lr");
var cr = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];
var dr = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "download", "formnovalidate", "hidden", "inert", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected"];
var Ht = /* @__PURE__ */ __name2((e, t) => {
  for (let s = 0, i = e.length; s < i; s++) {
    const a = e[s];
    if (typeof a == "string") re(a, t);
    else {
      if (typeof a == "boolean" || a === null || a === void 0) continue;
      a instanceof B ? a.toStringToBuffer(t) : typeof a == "number" || a.isEscaped ? t[0] += a : a instanceof Promise ? t.unshift("", a) : Ht(a, t);
    }
  }
}, "Ht");
var B = class {
  static {
    __name(this, "B");
  }
  static {
    __name2(this, "B");
  }
  constructor(e, t, s) {
    y(this, "tag");
    y(this, "props");
    y(this, "key");
    y(this, "children");
    y(this, "isEscaped", true);
    y(this, "localContexts");
    if (typeof e != "function" && !sr(e)) throw new Error(`Invalid JSX tag name: ${e}`);
    this.tag = e, this.props = t, this.children = s;
  }
  get type() {
    return this.tag;
  }
  get ref() {
    return this.props.ref || null;
  }
  toString() {
    var t, s;
    const e = [""];
    (t = this.localContexts) == null || t.forEach(([i, a]) => {
      i.values.push(a);
    });
    try {
      this.toStringToBuffer(e);
    } finally {
      (s = this.localContexts) == null || s.forEach(([i]) => {
        i.values.pop();
      });
    }
    return e.length === 1 ? "callbacks" in e ? Ps(N(e[0], e.callbacks)).toString() : e[0] : Ts(e, e.callbacks);
  }
  toStringToBuffer(e) {
    const t = this.tag, s = this.props;
    let { children: i } = this;
    e[0] += `<${t}`;
    const a = t === "svg" || He && _e(He) === "svg" ? (r) => lr(ht(r)) : (r) => ht(r);
    for (let [r, n] of Object.entries(s)) if (r = a(r), !!ir(r) && r !== "children") {
      if (r === "style" && typeof n == "object") {
        let o = "";
        Gs(n, (l, c) => {
          c != null && (o += `${o ? ";" : ""}${l}:${c}`);
        }), e[0] += ' style="', re(o, e), e[0] += '"';
      } else if (typeof n == "string") e[0] += ` ${r}="`, re(n, e), e[0] += '"';
      else if (n != null) if (typeof n == "number" || n.isEscaped) e[0] += ` ${r}="${n}"`;
      else if (typeof n == "boolean" && dr.includes(r)) n && (e[0] += ` ${r}=""`);
      else if (r === "dangerouslySetInnerHTML") {
        if (i.length > 0) throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
        i = [N(n.__html)];
      } else if (n instanceof Promise) e[0] += ` ${r}="`, e.unshift('"', n);
      else if (typeof n == "function") {
        if (!r.startsWith("on") && r !== "ref") throw new Error(`Invalid prop '${r}' of type 'function' supplied to '${t}'.`);
      } else e[0] += ` ${r}="`, re(n.toString(), e), e[0] += '"';
    }
    if (cr.includes(t) && i.length === 0) {
      e[0] += "/>";
      return;
    }
    e[0] += ">", Ht(i, e), e[0] += `</${t}>`;
  }
};
var At = class extends B {
  static {
    __name(this, "At");
  }
  static {
    __name2(this, "At");
  }
  toStringToBuffer(e) {
    const { children: t } = this, s = { ...this.props };
    t.length && (s.children = t.length === 1 ? t[0] : t);
    const i = this.tag.call(null, s);
    if (!(typeof i == "boolean" || i == null)) if (i instanceof Promise) if (Pe.length === 0) e.unshift("", i);
    else {
      const a = Pe.map((r) => [r, r.values.at(-1)]);
      e.unshift("", i.then((r) => (r instanceof B && (r.localContexts = a), r)));
    }
    else i instanceof B ? i.toStringToBuffer(e) : typeof i == "number" || i.isEscaped ? (e[0] += i, i.callbacks && (e.callbacks || (e.callbacks = []), e.callbacks.push(...i.callbacks))) : re(i, e);
  }
};
var Vs = class extends B {
  static {
    __name(this, "Vs");
  }
  static {
    __name2(this, "Vs");
  }
  toStringToBuffer(e) {
    Ht(this.children, e);
  }
};
var ts = /* @__PURE__ */ __name2((e, t, ...s) => {
  t ?? (t = {}), s.length && (t.children = s.length === 1 ? s[0] : s);
  const i = t.key;
  delete t.key;
  const a = ot(e, t, s);
  return a.key = i, a;
}, "ts");
var ss = false;
var ot = /* @__PURE__ */ __name2((e, t, s) => {
  if (!ss) {
    for (const i in jt) wt[i][Lt] = jt[i];
    ss = true;
  }
  return typeof e == "function" ? new At(e, t, s) : wt[e] ? new At(wt[e], t, s) : e === "svg" || e === "head" ? (He || (He = Bt("")), new B(e, t, [new At(He, { value: e }, s)])) : new B(e, t, s);
}, "ot");
var ur = /* @__PURE__ */ __name2(({ children: e }) => new Vs("", { children: e }, Array.isArray(e) ? e : e ? [e] : []), "ur");
function tt(e, t, s) {
  let i;
  if (!t || !("children" in t)) i = ot(e, t, []);
  else {
    const a = t.children;
    i = Array.isArray(a) ? ot(e, t, a) : ot(e, t, [a]);
  }
  return i.key = s, i;
}
__name(tt, "tt");
__name2(tt, "tt");
var Fe = "_hp";
var pr = { Change: "Input", DoubleClick: "DblClick" };
var fr = { svg: "2000/svg", math: "1998/Math/MathML" };
var Ue = [];
var Mt = /* @__PURE__ */ new WeakMap();
var Re = void 0;
var hr = /* @__PURE__ */ __name2(() => Re, "hr");
var G = /* @__PURE__ */ __name2((e) => "t" in e, "G");
var St = { onClick: ["click", false] };
var is = /* @__PURE__ */ __name2((e) => {
  if (!e.startsWith("on")) return;
  if (St[e]) return St[e];
  const t = e.match(/^on([A-Z][a-zA-Z]+?(?:PointerCapture)?)(Capture)?$/);
  if (t) {
    const [, s, i] = t;
    return St[e] = [(pr[s] || s).toLowerCase(), !!i];
  }
}, "is");
var rs = /* @__PURE__ */ __name2((e, t) => Re && e instanceof SVGElement && /[A-Z]/.test(t) && (t in e.style || t.match(/^(?:o|pai|str|u|ve)/)) ? t.replace(/([A-Z])/g, "-$1").toLowerCase() : t, "rs");
var zs = /* @__PURE__ */ __name2((e) => e == null || e === false ? null : e, "zs");
var mr = /* @__PURE__ */ __name2((e, t) => {
  "value" in t && (e.value = zs(t.value), !e.multiple && e.selectedIndex === -1 && (e.selectedIndex = 0));
}, "mr");
var as = /* @__PURE__ */ __name2((e) => e instanceof DOMException && e.name === "InvalidCharacterError", "as");
var gr = /* @__PURE__ */ __name2((e, t, s) => {
  var i;
  t || (t = {});
  for (let a in t) {
    const r = t[a];
    if (a !== "children" && (!s || s[a] !== r)) {
      a = ht(a);
      const n = is(a);
      if (n) {
        if ((s == null ? void 0 : s[a]) !== r && (s && e.removeEventListener(n[0], s[a], n[1]), r != null)) {
          if (typeof r != "function") throw new Error(`Event handler for "${a}" is not a function`);
          e.addEventListener(n[0], r, n[1]);
        }
      } else if (a === "dangerouslySetInnerHTML" && r) e.innerHTML = r.__html;
      else if (a === "ref") {
        let o;
        typeof r == "function" ? o = r(e) || (() => r(null)) : r && "current" in r && (r.current = e, o = /* @__PURE__ */ __name2(() => r.current = null, "o")), Mt.set(e, o);
      } else if (a === "style") {
        const o = e.style;
        typeof r == "string" ? o.cssText = r : (o.cssText = "", r != null && Gs(r, o.setProperty.bind(o)));
      } else {
        if (a === "value") {
          const l = e.nodeName;
          if (l === "SELECT") continue;
          if ((l === "INPUT" || l === "TEXTAREA") && (e.value = zs(r), l === "TEXTAREA")) {
            e.textContent = r;
            continue;
          }
        } else (a === "checked" && e.nodeName === "INPUT" || a === "selected" && e.nodeName === "OPTION") && (e[a] = r);
        const o = rs(e, a);
        try {
          r == null || r === false ? e.removeAttribute(o) : r === true ? e.setAttribute(o, "") : typeof r == "string" || typeof r == "number" ? e.setAttribute(o, r) : e.setAttribute(o, r.toString());
        } catch (l) {
          if (!as(l)) throw l;
        }
      }
    }
  }
  if (s) for (let a in s) {
    const r = s[a];
    if (a !== "children" && !(a in t)) {
      a = ht(a);
      const n = is(a);
      if (n) e.removeEventListener(n[0], r, n[1]);
      else if (a === "ref") (i = Mt.get(e)) == null || i();
      else try {
        e.removeAttribute(rs(e, a));
      } catch (o) {
        if (!as(o)) throw o;
      }
    }
  }
}, "gr");
var vr = /* @__PURE__ */ __name2((e, t) => {
  t[T][0] = 0, Ue.push([e, t]);
  const s = t.tag[Lt] || t.tag, i = s.defaultProps ? { ...s.defaultProps, ...t.props } : t.props;
  try {
    return [s.call(null, i)];
  } finally {
    Ue.pop();
  }
}, "vr");
var Ws = /* @__PURE__ */ __name2((e, t, s, i, a) => {
  var r, n;
  (r = e.vR) != null && r.length && (i.push(...e.vR), delete e.vR), typeof e.tag == "function" && ((n = e[T][1][Qs]) == null || n.forEach((o) => a.push(o))), e.vC.forEach((o) => {
    var l;
    if (G(o)) s.push(o);
    else if (typeof o.tag == "function" || o.tag === "") {
      o.c = t;
      const c = s.length;
      if (Ws(o, t, s, i, a), o.s) {
        for (let d = c; d < s.length; d++) s[d].s = true;
        o.s = false;
      }
    } else s.push(o), (l = o.vR) != null && l.length && (i.push(...o.vR), delete o.vR);
  });
}, "Ws");
var yr = /* @__PURE__ */ __name2((e) => {
  var t;
  for (; e && (e.tag === Fe || !e.e); ) e = e.tag === Fe || !((t = e.vC) != null && t[0]) ? e.nN : e.vC[0];
  return e == null ? void 0 : e.e;
}, "yr");
var Ks = /* @__PURE__ */ __name2((e) => {
  var t, s, i, a, r, n;
  G(e) || ((s = (t = e[T]) == null ? void 0 : t[1][Qs]) == null || s.forEach((o) => {
    var l;
    return (l = o[2]) == null ? void 0 : l.call(o);
  }), (i = Mt.get(e.e)) == null || i(), e.p === 2 && ((a = e.vC) == null || a.forEach((o) => o.p = 2)), (r = e.vC) == null || r.forEach(Ks)), e.p || ((n = e.e) == null || n.remove(), delete e.e), typeof e.tag == "function" && (Ne.delete(e), lt.delete(e), delete e[T][3], e.a = true);
}, "Ks");
var Ys = /* @__PURE__ */ __name2((e, t, s) => {
  e.c = t, Js(e, t, s);
}, "Ys");
var ns = /* @__PURE__ */ __name2((e, t) => {
  if (t) {
    for (let s = 0, i = e.length; s < i; s++) if (e[s] === t) return s;
  }
}, "ns");
var os = /* @__PURE__ */ Symbol();
var Js = /* @__PURE__ */ __name2((e, t, s) => {
  var c;
  const i = [], a = [], r = [];
  Ws(e, t, i, a, r), a.forEach(Ks);
  const n = s ? void 0 : t.childNodes;
  let o, l = null;
  if (s) o = -1;
  else if (!n.length) o = 0;
  else {
    const d = ns(n, yr(e.nN));
    d !== void 0 ? (l = n[d], o = d) : o = ns(n, (c = i.find((p) => p.tag !== Fe && p.e)) == null ? void 0 : c.e) ?? -1, o === -1 && (s = true);
  }
  for (let d = 0, p = i.length; d < p; d++, o++) {
    const f = i[d];
    let h;
    if (f.s && f.e) h = f.e, f.s = false;
    else {
      const m = s || !f.e;
      G(f) ? (f.e && f.d && (f.e.textContent = f.t), f.d = false, h = f.e || (f.e = document.createTextNode(f.t))) : (h = f.e || (f.e = f.n ? document.createElementNS(f.n, f.tag) : document.createElement(f.tag)), gr(h, f.props, f.pP), Js(f, h, m), f.tag === "select" && mr(h, f.props));
    }
    f.tag === Fe ? o-- : s ? h.parentNode || t.appendChild(h) : n[o] !== h && n[o - 1] !== h && (n[o + 1] === h ? t.appendChild(n[o]) : t.insertBefore(h, l || n[o] || null));
  }
  if (e.pP && (e.pP = void 0), r.length) {
    const d = [], p = [];
    r.forEach(([, f, , h, m]) => {
      f && d.push(f), h && p.push(h), m == null || m();
    }), d.forEach((f) => f()), p.length && requestAnimationFrame(() => {
      p.forEach((f) => f());
    });
  }
}, "Js");
var xr = /* @__PURE__ */ __name2((e, t) => !!(e && e.length === t.length && e.every((s, i) => s[1] === t[i][1])), "xr");
var lt = /* @__PURE__ */ new WeakMap();
var Ot = /* @__PURE__ */ __name2((e, t, s) => {
  var r, n, o, l, c, d;
  const i = !s && t.pC;
  s && (t.pC || (t.pC = t.vC));
  let a;
  try {
    s || (s = typeof t.tag == "function" ? vr(e, t) : Ye(t.props.children)), ((r = s[0]) == null ? void 0 : r.tag) === "" && s[0][It] && (a = s[0][It], e[5].push([e, a, t]));
    const p = i ? [...t.pC] : t.vC ? [...t.vC] : void 0, f = [];
    let h;
    for (let m = 0; m < s.length; m++) {
      if (Array.isArray(s[m])) {
        s.splice(m, 1, ...s[m].flat(1 / 0)), m--;
        continue;
      }
      let g = br(s[m]);
      if (g) {
        typeof g.tag == "function" && !g.tag[Ls] && (Pe.length > 0 && (g[T][2] = Pe.map((k) => [k, k.values.at(-1)])), (n = e[5]) != null && n.length && (g[T][3] = e[5].at(-1)));
        let v;
        if (p && p.length) {
          const k = p.findIndex(G(g) ? (w) => G(w) : g.key !== void 0 ? (w) => w.key === g.key && w.tag === g.tag : (w) => w.tag === g.tag);
          k !== -1 && (v = p[k], p.splice(k, 1));
        }
        if (v) if (G(g)) v.t !== g.t && (v.t = g.t, v.d = true), g = v;
        else {
          const k = v.pP = v.props;
          if (v.props = g.props, v.f || (v.f = g.f || t.f), typeof g.tag == "function") {
            const w = v[T][2];
            v[T][2] = g[T][2] || [], v[T][3] = g[T][3], !v.f && ((v.o || v) === g.o || (l = (o = v.tag)[qi]) != null && l.call(o, k, v.props)) && xr(w, v[T][2]) && (v.s = true);
          }
          g = v;
        }
        else if (!G(g) && Re) {
          const k = _e(Re);
          k && (g.n = k);
        }
        if (!G(g) && !g.s && (Ot(e, g), delete g.f), f.push(g), h && !h.s && !g.s) for (let k = h; k && !G(k); k = (c = k.vC) == null ? void 0 : c.at(-1)) k.nN = g;
        h = g;
      }
    }
    t.vR = i ? [...t.vC, ...p || []] : p || [], t.vC = f, i && delete t.pC;
  } catch (p) {
    if (t.f = true, p === os) {
      if (a) return;
      throw p;
    }
    const [f, h, m] = ((d = t[T]) == null ? void 0 : d[3]) || [];
    if (h) {
      const g = /* @__PURE__ */ __name2(() => ct([0, false, e[2]], m), "g"), v = lt.get(m) || [];
      v.push(g), lt.set(m, v);
      const k = h(p, () => {
        const w = lt.get(m);
        if (w) {
          const j = w.indexOf(g);
          if (j !== -1) return w.splice(j, 1), g();
        }
      });
      if (k) {
        if (e[0] === 1) e[1] = true;
        else if (Ot(e, m, [k]), (h.length === 1 || e !== f) && m.c) {
          Ys(m, m.c, false);
          return;
        }
        throw os;
      }
    }
    throw p;
  } finally {
    a && e[5].pop();
  }
}, "Ot");
var br = /* @__PURE__ */ __name2((e) => {
  if (!(e == null || typeof e == "boolean")) {
    if (typeof e == "string" || typeof e == "number") return { t: e.toString(), d: true };
    if ("vR" in e && (e = { tag: e.tag, props: e.props, key: e.key, f: e.f, type: e.tag, ref: e.props.ref, o: e.o || e }), typeof e.tag == "function") e[T] = [0, []];
    else {
      const t = fr[e.tag];
      t && (Re || (Re = Ds("")), e.props.children = [{ tag: Re, props: { value: e.n = `http://www.w3.org/${t}`, children: e.props.children } }]);
    }
    return e;
  }
}, "br");
var ls = /* @__PURE__ */ __name2((e, t) => {
  var s, i;
  (s = t[T][2]) == null || s.forEach(([a, r]) => {
    a.values.push(r);
  });
  try {
    Ot(e, t, void 0);
  } catch {
    return;
  }
  if (t.a) {
    delete t.a;
    return;
  }
  (i = t[T][2]) == null || i.forEach(([a]) => {
    a.values.pop();
  }), (e[0] !== 1 || !e[1]) && Ys(t, t.c, false);
}, "ls");
var Ne = /* @__PURE__ */ new WeakMap();
var cs = [];
var ct = /* @__PURE__ */ __name2(async (e, t) => {
  e[5] || (e[5] = []);
  const s = Ne.get(t);
  s && s[0](void 0);
  let i;
  const a = new Promise((r) => i = r);
  if (Ne.set(t, [i, () => {
    e[2] ? e[2](e, t, (r) => {
      ls(r, t);
    }).then(() => i(t)) : (ls(e, t), i(t));
  }]), cs.length) cs.at(-1).add(t);
  else {
    await Promise.resolve();
    const r = Ne.get(t);
    r && (Ne.delete(t), r[1]());
  }
  return a;
}, "ct");
var wr = /* @__PURE__ */ __name2((e, t, s) => ({ tag: Fe, props: { children: e }, key: s, e: t, p: 1 }), "wr");
var Ct = 0;
var Qs = 1;
var $t = 2;
var Tt = 3;
var Pt = /* @__PURE__ */ new WeakMap();
var Zs = /* @__PURE__ */ __name2((e, t) => !e || !t || e.length !== t.length || t.some((s, i) => s !== e[i]), "Zs");
var kr = void 0;
var ds = [];
var Er = /* @__PURE__ */ __name2((e) => {
  var n;
  const t = /* @__PURE__ */ __name2(() => typeof e == "function" ? e() : e, "t"), s = Ue.at(-1);
  if (!s) return [t(), () => {
  }];
  const [, i] = s, a = (n = i[T][1])[Ct] || (n[Ct] = []), r = i[T][0]++;
  return a[r] || (a[r] = [t(), (o) => {
    const l = kr, c = a[r];
    if (typeof o == "function" && (o = o(c[0])), !Object.is(o, c[0])) if (c[0] = o, ds.length) {
      const [d, p] = ds.at(-1);
      Promise.all([d === 3 ? i : ct([d, false, l], i), p]).then(([f]) => {
        if (!f || !(d === 2 || d === 3)) return;
        const h = f.vC;
        requestAnimationFrame(() => {
          setTimeout(() => {
            h === f.vC && ct([d === 3 ? 1 : 0, false, l], f);
          });
        });
      });
    } else ct([0, false, l], i);
  }]);
}, "Er");
var Ft = /* @__PURE__ */ __name2((e, t) => {
  var o;
  const s = Ue.at(-1);
  if (!s) return e;
  const [, i] = s, a = (o = i[T][1])[$t] || (o[$t] = []), r = i[T][0]++, n = a[r];
  return Zs(n == null ? void 0 : n[1], t) ? a[r] = [e, t] : e = a[r][0], e;
}, "Ft");
var Ar = /* @__PURE__ */ __name2((e) => {
  const t = Pt.get(e);
  if (t) {
    if (t.length === 2) throw t[1];
    return t[0];
  }
  throw e.then((s) => Pt.set(e, [s]), (s) => Pt.set(e, [void 0, s])), e;
}, "Ar");
var Sr = /* @__PURE__ */ __name2((e, t) => {
  var o;
  const s = Ue.at(-1);
  if (!s) return e();
  const [, i] = s, a = (o = i[T][1])[Tt] || (o[Tt] = []), r = i[T][0]++, n = a[r];
  return Zs(n == null ? void 0 : n[1], t) && (a[r] = [e(), t]), a[r][0];
}, "Sr");
var Cr = Ds({ pending: false, data: null, method: null, action: null });
var us = /* @__PURE__ */ new Set();
var $r = /* @__PURE__ */ __name2((e) => {
  us.add(e), e.finally(() => us.delete(e));
}, "$r");
var Ut = /* @__PURE__ */ __name2((e, t) => Sr(() => (s) => {
  let i;
  e && (typeof e == "function" ? i = e(s) || (() => {
    e(null);
  }) : e && "current" in e && (e.current = s, i = /* @__PURE__ */ __name2(() => {
    e.current = null;
  }, "i")));
  const a = t(s);
  return () => {
    a == null || a(), i == null || i();
  };
}, [e]), "Ut");
var ye = /* @__PURE__ */ Object.create(null);
var st = /* @__PURE__ */ Object.create(null);
var Ze = /* @__PURE__ */ __name2((e, t, s, i, a) => {
  if (t != null && t.itemProp) return { tag: e, props: t, type: e, ref: t.ref };
  const r = document.head;
  let { onLoad: n, onError: o, precedence: l, blocking: c, ...d } = t, p = null, f = false;
  const h = ft[e], m = Fs(e, i), g = /* @__PURE__ */ __name2((E) => E.getAttribute("rel") === "stylesheet" && E.getAttribute(le) !== null, "g");
  let v;
  if (m) {
    const E = r.querySelectorAll(e);
    e: for (const C of E) if (!(e === "link" && !g(C))) {
      for (const S of h) if (C.getAttribute(S) === t[S]) {
        p = C;
        break e;
      }
    }
    if (!p) {
      const C = h.reduce((S, $) => t[$] === void 0 ? S : `${S}-${$}-${t[$]}`, e);
      f = !st[C], p = st[C] || (st[C] = (() => {
        const S = document.createElement(e);
        for (const $ of h) t[$] !== void 0 && S.setAttribute($, t[$]);
        return t.rel && S.setAttribute("rel", t.rel), S;
      })());
    }
  } else v = r.querySelectorAll(e);
  l = i ? l ?? "" : void 0, i && (d[le] = l);
  const k = Ft((E) => {
    if (m) {
      if (e === "link" && l !== void 0) {
        let S = false;
        for (const $ of r.querySelectorAll(e)) {
          const U = $.getAttribute(le);
          if (U === null) {
            r.insertBefore(E, $);
            return;
          }
          if (S && U !== l) {
            r.insertBefore(E, $);
            return;
          }
          U === l && (S = true);
        }
        r.appendChild(E);
        return;
      }
      let C = false;
      for (const S of r.querySelectorAll(e)) {
        if (C && S.getAttribute(le) !== l) {
          r.insertBefore(E, S);
          return;
        }
        S.getAttribute(le) === l && (C = true);
      }
      r.appendChild(E);
    } else if (e === "link") r.contains(E) || r.appendChild(E);
    else if (v) {
      let C = false;
      for (const S of v) if (S === E) {
        C = true;
        break;
      }
      C || r.insertBefore(E, r.contains(v[0]) ? v[0] : r.querySelector(e)), v = void 0;
    }
  }, [m, l, e]), w = Ut(t.ref, (E) => {
    var $;
    const C = h[0];
    if (s === 2 && (E.innerHTML = ""), (f || v) && k(E), !o && !n || !C) return;
    let S = ye[$ = E.getAttribute(C)] || (ye[$] = new Promise((U, Xe) => {
      E.addEventListener("load", U), E.addEventListener("error", Xe);
    }));
    n && (S = S.then(n)), o && (S = S.catch(o)), S.catch(() => {
    });
  });
  if (a && c === "render") {
    const E = ft[e][0];
    if (E && t[E]) {
      const C = t[E], S = ye[C] || (ye[C] = new Promise(($, U) => {
        k(p), p.addEventListener("load", $), p.addEventListener("error", U);
      }));
      Ar(S);
    }
  }
  const j = { tag: e, type: e, props: { ...d, ref: w }, ref: w };
  return j.p = s, p && (j.e = p), wr(j, r);
}, "Ze");
var Tr = /* @__PURE__ */ __name2((e) => {
  const t = hr(), s = t && _e(t);
  return s != null && s.endsWith("svg") ? { tag: "title", props: e, type: "title", ref: e.ref } : Ze("title", e, void 0, false, false);
}, "Tr");
var Pr = /* @__PURE__ */ __name2((e) => !e || ["src", "async"].some((t) => !e[t]) ? { tag: "script", props: e, type: "script", ref: e.ref } : Ze("script", e, 1, false, true), "Pr");
var Rr = /* @__PURE__ */ __name2((e) => !e || !["href", "precedence"].every((t) => t in e) ? { tag: "style", props: e, type: "style", ref: e.ref } : (e["data-href"] = e.href, delete e.href, Ze("style", e, 2, true, true)), "Rr");
var _r = /* @__PURE__ */ __name2((e) => !e || ["onLoad", "onError"].some((t) => t in e) || e.rel === "stylesheet" && (!("precedence" in e) || "disabled" in e) ? { tag: "link", props: e, type: "link", ref: e.ref } : Ze("link", e, 1, Hs(e), true), "_r");
var Ir = /* @__PURE__ */ __name2((e) => Ze("meta", e, void 0, false, false), "Ir");
var Xs = /* @__PURE__ */ Symbol();
var jr = /* @__PURE__ */ __name2((e) => {
  const { action: t, ...s } = e;
  typeof t != "function" && (s.action = t);
  const [i, a] = Er([null, false]), r = Ft(async (c) => {
    const d = c.isTrusted ? t : c.detail[Xs];
    if (typeof d != "function") return;
    c.preventDefault();
    const p = new FormData(c.target);
    a([p, true]);
    const f = d(p);
    f instanceof Promise && ($r(f), await f), a([null, true]);
  }, []), n = Ut(e.ref, (c) => (c.addEventListener("submit", r), () => {
    c.removeEventListener("submit", r);
  })), [o, l] = i;
  return i[1] = false, { tag: Cr, props: { value: { pending: o !== null, data: o, method: o ? "post" : null, action: o ? t : null }, children: { tag: "form", props: { ...s, ref: n }, type: "form", ref: n } }, f: l };
}, "jr");
var ei = /* @__PURE__ */ __name2((e, { formAction: t, ...s }) => {
  if (typeof t == "function") {
    const i = Ft((a) => {
      a.preventDefault(), a.currentTarget.form.dispatchEvent(new CustomEvent("submit", { detail: { [Xs]: t } }));
    }, []);
    s.ref = Ut(s.ref, (a) => (a.addEventListener("click", i), () => {
      a.removeEventListener("click", i);
    }));
  }
  return { tag: e, props: s, type: e, ref: s.ref };
}, "ei");
var Mr = /* @__PURE__ */ __name2((e) => ei("input", e), "Mr");
var Or = /* @__PURE__ */ __name2((e) => ei("button", e), "Or");
Object.assign(jt, { title: Tr, script: Pr, style: Rr, link: _r, meta: Ir, form: jr, input: Mr, button: Or });
Bt(null);
var ps = new TextEncoder();
var Nr = /* @__PURE__ */ __name2((e, t = console.trace) => {
  let s = false;
  return new ReadableStream({ async start(a) {
    var r;
    try {
      e instanceof B && (e = e.toString());
      const n = typeof e == "object" ? e : {}, o = await dt(e, we.BeforeStream, true, n);
      s || a.enqueue(ps.encode(o));
      let l = 0;
      const c = [], d = /* @__PURE__ */ __name2((p) => {
        c.push(p.catch((f) => (console.log(f), t(f), "")).then(async (f) => {
          var h;
          f = await dt(f, we.BeforeStream, true, n), (h = f.callbacks) == null || h.map((m) => m({ phase: we.Stream, context: n })).filter(Boolean).forEach(d), l++, s || a.enqueue(ps.encode(f));
        }));
      }, "d");
      for ((r = o.callbacks) == null || r.map((p) => p({ phase: we.Stream, context: n })).filter(Boolean).forEach(d); l !== c.length; ) await Promise.all(c);
    } catch (n) {
      t(n);
    }
    s || a.close();
  }, cancel() {
    s = true;
  } });
}, "Nr");
var Lr = Bt(null);
var Br = /* @__PURE__ */ __name2((e, t, s, i) => (a, r) => {
  i = typeof i == "function" ? i(e) : i;
  const n = typeof (i == null ? void 0 : i.docType) == "string" ? i.docType : (i == null ? void 0 : i.docType) === false ? "" : "<!DOCTYPE html>", o = s ? ts((c) => s(c, e), { Layout: t, ...r }, a) : a, l = Ui`${N(n)}${ts(Lr.Provider, { value: e }, o)}`;
  if (i != null && i.stream) {
    if (i.stream === true) e.header("Transfer-Encoding", "chunked"), e.header("Content-Type", "text/html; charset=UTF-8"), e.header("Content-Encoding", "Identity");
    else for (const [c, d] of Object.entries(i.stream)) e.header(c, d);
    return e.body(Nr(l));
  } else return e.html(l);
}, "Br");
var Dr = /* @__PURE__ */ __name2((e, t) => function(i, a) {
  const r = i.getLayout() ?? ur;
  return e && i.setLayout((n) => e({ ...n, Layout: r }, i)), i.setRenderer(Br(i, r, e, t)), a();
}, "Dr");
var Hr = Dr(({ children: e }) => tt("html", { children: [tt("head", { children: tt("link", { href: "/static/style.css", rel: "stylesheet" }) }), tt("body", { children: e })] }));
var ie = { id: "demo-fintech-001", name: "Acme Fintech", industry: "B2B SaaS Fintech", region: "United States + EU", competitor_domains: ["stripe.com", "adyen.com", "checkout.com"], pillars_enabled: ["policy", "pricing", "features", "sentiment", "supply_chain", "hiring"] };
var J = { briefing_date: "2026-06-20", headline: "EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.", summary_markdown: "**4 high-impact events overnight.** The EU AI Act Article 6 enforcement window opened at 00:00 CET, directly impacting any fintech using ML for credit decisions. Stripe quietly increased ACH transaction fees from $0.80 to $0.90 (effective today). Adyen launched a new Embedded Finance API targeting your SMB segment. Reddit r/fintech sentiment around fraud-detection vendors dropped 18 points week-over-week.", threat_level: 73, events: [{ pillar: "policy", title: "EU AI Act Article 6 enforcement begins today", summary: "High-risk AI systems used in credit scoring now require conformity assessment + CE marking. Penalties up to 7% of global turnover. Your underwriting models likely fall under Annex III.", severity: 92, high_impact: true, source_url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj", source_name: "EUR-Lex Official Journal", detected_at: "2026-06-20T00:14:00Z", tags: ["EU", "AI Act", "credit-scoring", "compliance"] }, { pillar: "competitor", title: "Stripe raises ACH transaction fees 12.5%", summary: "Stripe quietly updated US pricing page: ACH fees moved from $0.80 \u2192 $0.90 per transaction. No public announcement. Detected via pricing-page diff at 03:42 UTC.", severity: 81, high_impact: true, source_url: "https://stripe.com/pricing", source_name: "stripe.com/pricing", detected_at: "2026-06-20T03:42:00Z", tags: ["pricing", "ACH", "stripe"] }, { pillar: "competitor", title: "Adyen launches Embedded Finance API for SMBs", summary: "New product page live. Targets <$10M ARR fintechs \u2014 direct overlap with your ICP. Launch tweet from CEO at 06:11 UTC has 2.4k likes.", severity: 76, high_impact: true, source_url: "https://adyen.com/embedded-finance", source_name: "Adyen Newsroom", detected_at: "2026-06-20T06:11:00Z", tags: ["product-launch", "embedded-finance", "adyen"] }, { pillar: "sentiment", title: "Fraud-detection vendor sentiment drops 18pts on r/fintech", summary: "Aggregated 47 Reddit threads over 7 days. Net sentiment around 'fraud false positives' moved from +24 to +6. Top complaint: 'too many legit txns blocked'.", severity: 71, high_impact: true, source_url: "https://reddit.com/r/fintech", source_name: "Reddit r/fintech", detected_at: "2026-06-20T02:30:00Z", tags: ["sentiment", "fraud", "reddit"] }, { pillar: "competitor", title: "Checkout.com posts 4 senior ML eng roles in Berlin", summary: "Job board diff: 4 new 'Staff ML Engineer, Risk' postings in Berlin. Signals model-team buildout. Salary band \u20AC140-180k.", severity: 54, high_impact: false, source_url: "https://checkout.com/careers", source_name: "Checkout.com Careers", detected_at: "2026-06-20T01:20:00Z", tags: ["hiring", "ml", "checkout"] }, { pillar: "policy", title: "CFPB issues guidance on overdraft-style 'pay-in-4' products", summary: "Consumer Financial Protection Bureau released circular treating BNPL pay-in-4 as 'credit' under TILA. Affects any partner you use for installment products.", severity: 68, high_impact: false, source_url: "https://consumerfinance.gov/compliance/circulars", source_name: "CFPB", detected_at: "2026-06-20T04:55:00Z", tags: ["US", "CFPB", "BNPL"] }, { pillar: "sentiment", title: "G2 reviews mention 'onboarding friction' up 31%", summary: "Across the payments-platform category on G2, mentions of 'onboarding' with negative sentiment rose 31% MoM. Direct opportunity for your faster-KYC pitch.", severity: 48, high_impact: false, source_url: "https://g2.com/categories/payment-processing", source_name: "G2 Crowd", detected_at: "2026-06-20T05:02:00Z", tags: ["g2", "onboarding", "opportunity"] }, { pillar: "policy", title: "UK FCA opens consultation on stablecoin reserves", summary: "Comment window closes Aug 14. If you touch GBP-pegged stablecoins, file by then.", severity: 41, high_impact: false, source_url: "https://fca.org.uk/publications/consultation-papers", source_name: "UK FCA", detected_at: "2026-06-20T07:00:00Z", tags: ["UK", "stablecoin", "consultation"] }], actions: [{ title: "Audit underwriting models for EU AI Act compliance", why_now: "Enforcement began 00:00 CET today; 7% global turnover penalty risk.", email_draft: `Hi team,

The EU AI Act enforcement window opened today. Article 6 + Annex III directly cover our credit-decision models. By Friday I need: (1) a model inventory marked high-risk vs limited-risk, (2) a gap-list against the conformity-assessment checklist, (3) a draft CE-marking timeline. Looping in legal \u2014 pulling Priya on this.

Moving fast,
\u2014 You`, slack_message: ":rotating_light: EU AI Act enforcement live. We need a model inventory by EOW. Owners: @priya (legal), @marco (ml). Thread inside.", impact: "high" }, { title: "Counter Stripe's ACH fee hike in this week's outreach", why_now: "Stripe just raised ACH 12.5%; cold leads who balked at our price are now within 5%.", email_draft: `Hi {{first_name}},

Quick note \u2014 Stripe raised ACH fees yesterday from $0.80 to $0.90 per transaction. For your projected volume that's an extra $14k/year you weren't budgeting for. Our pricing didn't change. Worth a 15-min call this week to compare side-by-side?

Here's an open slot Thursday 2pm ET: [link]

Best,
\u2014 You`, slack_message: "Sales team: Stripe ACH went $0.80\u2192$0.90 today. Hit the 23 stalled deals in the pipeline with the comparison email (template in #sales-plays). GO.", impact: "high" }, { title: "Ship 'instant KYC' landing page before Adyen press cycle", why_now: "Adyen Embedded Finance launch is fresh; G2 shows 31% rise in onboarding-friction complaints. Window is now.", email_draft: `Hi marketing,

Two signals converged: Adyen launched Embedded Finance for our exact ICP this morning, and G2 sentiment on 'onboarding friction' is up 31% MoM. We have a 5-day window where buyers are evaluating. Can we ship the /instant-kyc page (already designed) by Monday and run $5k LinkedIn against fintech founders?

Reply with a yes/no by 5pm.

\u2014 You`, slack_message: "Marketing: ship /instant-kyc page by Mon + $5k LinkedIn boost. Adyen news + G2 sentiment = open window. Decision needed by 5pm today.", impact: "medium" }], kpis: { threats_detected: 12, opportunities: 4, action_items: 3, avg_response_time_minutes: 47 } };
var Fr = [{ date: "2026-06-20", pillar: "policy", title: "EU AI Act enforcement begins", severity: 92 }, { date: "2026-06-20", pillar: "competitor", title: "Stripe ACH +12.5%", severity: 81 }, { date: "2026-06-19", pillar: "sentiment", title: "G2 onboarding complaints spike", severity: 62 }, { date: "2026-06-19", pillar: "competitor", title: "Adyen hires VP Product", severity: 55 }, { date: "2026-06-18", pillar: "policy", title: "CFPB guidance circular", severity: 68 }, { date: "2026-06-17", pillar: "competitor", title: "Checkout.com Series E rumor", severity: 71 }, { date: "2026-06-17", pillar: "sentiment", title: "Reddit fraud-tool thread viral", severity: 58 }, { date: "2026-06-16", pillar: "policy", title: "UK FCA stablecoin consult", severity: 41 }, { date: "2026-06-15", pillar: "competitor", title: "Stripe Atlas redesign", severity: 33 }, { date: "2026-06-14", pillar: "sentiment", title: "Twitter buzz: AI underwriting", severity: 47 }];
var Ur = (() => {
  const t = [];
  for (let s = 30; s >= 0; s--) {
    const i = /* @__PURE__ */ new Date();
    i.setDate(i.getDate() - s);
    const a = i.toISOString().slice(0, 10), r = s === 0 ? 0.9 : 0.8, n = 0.85 + Math.sin(s / 5) * 0.02, o = 0.82 + Math.cos(s / 4) * 0.015;
    t.push({ date: a, stripe: +r.toFixed(3), adyen: +n.toFixed(3), checkout: +o.toFixed(3), you: 0.78 });
  }
  return t;
})();
var qr = (() => {
  const e = [];
  for (let t = 14; t >= 0; t--) {
    const s = /* @__PURE__ */ new Date();
    s.setDate(s.getDate() - t), e.push({ date: s.toISOString().slice(0, 10), positive: 40 + Math.floor(Math.sin(t / 3) * 15) + Math.floor(Math.random() * 8), neutral: 55 + Math.floor(Math.cos(t / 4) * 10) + Math.floor(Math.random() * 6), negative: 25 + Math.floor(Math.sin(t / 2) * 12) + (t < 4 ? 15 : 0) + Math.floor(Math.random() * 5) });
  }
  return e;
})();
var Gr = [{ topic: "fraud false positives", mentions: 234, sentiment: -0.62 }, { topic: "onboarding speed", mentions: 187, sentiment: -0.41 }, { topic: "developer docs", mentions: 156, sentiment: 0.48 }, { topic: "support response", mentions: 142, sentiment: -0.28 }, { topic: "ACH reliability", mentions: 128, sentiment: 0.12 }, { topic: "pricing transparency", mentions: 119, sentiment: -0.55 }, { topic: "dashboard UX", mentions: 98, sentiment: 0.31 }, { topic: "instant settlement", mentions: 87, sentiment: 0.68 }, { topic: "international fees", mentions: 76, sentiment: -0.39 }, { topic: "webhooks", mentions: 64, sentiment: 0.21 }, { topic: "compliance burden", mentions: 58, sentiment: -0.71 }, { topic: "AI underwriting", mentions: 49, sentiment: -0.18 }];
var Vr = [{ text: "fraud", value: 89 }, { text: "slow onboarding", value: 71 }, { text: "great docs", value: 64 }, { text: "expensive", value: 58 }, { text: "instant payout", value: 52 }, { text: "false decline", value: 48 }, { text: "easy API", value: 44 }, { text: "compliance", value: 41 }, { text: "Stripe", value: 38 }, { text: "support sucks", value: 34 }, { text: "AI Act", value: 31 }, { text: "embedded finance", value: 29 }, { text: "BNPL", value: 26 }, { text: "KYC delay", value: 23 }, { text: "love the API", value: 21 }, { text: "webhook fails", value: 18 }];
var zr = { competitors: ["You", "Stripe", "Adyen", "Checkout.com"], features: [{ name: "Instant KYC (<60s)", values: [true, false, false, true] }, { name: "ACH transfers", values: [true, true, false, true] }, { name: "Embedded Finance API", values: [false, true, true, false] }, { name: "EU AI Act compliant", values: [true, true, true, false] }, { name: "Stablecoin payouts", values: [true, true, false, false] }, { name: "BNPL split", values: [false, true, true, true] }, { name: "<24h dispute resolution", values: [true, false, true, false] }, { name: "On-platform issuing", values: [false, true, true, true] }, { name: "Open-source SDK", values: [true, true, false, false] }, { name: "SOC 2 Type II", values: [true, true, true, true] }] };
var ti = [{ country: "European Union", lat: 50.85, lng: 4.35, activity: 92, count: 14 }, { country: "United States", lat: 38.9, lng: -77.04, activity: 78, count: 9 }, { country: "United Kingdom", lat: 51.5, lng: -0.13, activity: 64, count: 7 }, { country: "Singapore", lat: 1.35, lng: 103.82, activity: 51, count: 5 }, { country: "Australia", lat: -35.28, lng: 149.13, activity: 43, count: 4 }, { country: "Canada", lat: 45.42, lng: -75.7, activity: 38, count: 4 }, { country: "Japan", lat: 35.68, lng: 139.69, activity: 31, count: 3 }, { country: "Brazil", lat: -15.8, lng: -47.92, activity: 28, count: 3 }, { country: "India", lat: 28.61, lng: 77.21, activity: 47, count: 5 }, { country: "UAE", lat: 24.45, lng: 54.39, activity: 36, count: 3 }];
var Wr = ti.map((e) => ({ lat: e.lat, lng: e.lng, size: e.activity / 100, color: e.activity > 70 ? "#06b6d4" : e.activity > 45 ? "#f97316" : "#ec4899", label: `${e.country}: ${e.count} changes` }));
var Kr = { budget: 150, used: 47, breakdown: [{ endpoint: "agentic-search (daily brief)", credits: 15, count: 2, ts: "2026-06-20T06:00:00Z" }, { endpoint: "url-scraper (competitor pricing)", credits: 1, count: 18, ts: "2026-06-20T07:00:00Z" }, { endpoint: "agentic-search (Ask RealityPulse)", credits: 3, count: 4, ts: "2026-06-20T08:14:00Z" }, { endpoint: "embeddings (NVIDIA, free tier)", credits: 0, count: 47, ts: "2026-06-20T06:02:00Z" }] };
var Yr = `You are RealityPulse \u2014 a Bloomberg-Terminal-grade business intelligence
analyst for small and mid-market businesses. You synthesize regulatory
filings, competitor public data, and consumer sentiment into a single
"Daily Battle Brief". Output MUST conform exactly to the JSON schema
provided. Cite every claim with a real URL. Never speculate beyond
sources. Score severity on a 0-100 scale. Tone: terse, decisive,
boardroom-ready.`;
var Jr = /* @__PURE__ */ __name2((e) => `Generate today's Daily Battle Brief for a ${e.industry} business
operating in ${e.region}.

Competitors to monitor: ${e.competitor_domains.join(", ")}.
Pillars enabled: ${e.pillars_enabled.join(", ")}.

For the last 24 hours, find and synthesize:

1. POLICY pillar \u2014 new regulations, enforcement actions, agency
   guidance, or pending bills in ${e.region} that materially
   affect ${e.industry}. Cite regulator + URL + effective date.

2. COMPETITOR pillar \u2014 public moves by ${e.competitor_domains.join(", ")}: pricing changes, feature launches, hires, funding, layoffs,
   PR. Cite source URL + observed timestamp.

3. SENTIMENT pillar \u2014 review-site, social, and forum signal around
   ${e.industry} and the named competitors. Sample 3-5 verbatim
   quotes with URLs. Provide sentiment delta vs prior week.

4. ACTION pillar \u2014 Top 3 concrete actions the operator should take
   today. Each action: title (<=8 words), why_now, suggested email
   draft body (<=120 words), suggested Slack message (<=40 words),
   estimated impact (low|medium|high).

Return ONE JSON object matching the schema. Severity 0-100 per event.
Mark each event high_impact=true if severity>=70.`, "Jr");
var Qr = { type: "object", required: ["briefing_date", "headline", "events", "actions", "kpis"], properties: { briefing_date: { type: "string", format: "date" }, headline: { type: "string", maxLength: 140 }, summary_markdown: { type: "string" }, threat_level: { type: "integer", minimum: 0, maximum: 100 }, events: { type: "array", items: { type: "object", required: ["pillar", "title", "severity", "source_url"], properties: { pillar: { type: "string", enum: ["policy", "competitor", "sentiment"] }, title: { type: "string" }, summary: { type: "string" }, severity: { type: "integer", minimum: 0, maximum: 100 }, high_impact: { type: "boolean" }, source_url: { type: "string", format: "uri" }, source_name: { type: "string" }, detected_at: { type: "string", format: "date-time" }, tags: { type: "array", items: { type: "string" } } } } }, actions: { type: "array", maxItems: 3, items: { type: "object", required: ["title", "why_now", "impact"], properties: { title: { type: "string" }, why_now: { type: "string" }, email_draft: { type: "string" }, slack_message: { type: "string" }, impact: { type: "string", enum: ["low", "medium", "high"] } } } }, kpis: { type: "object", properties: { threats_detected: { type: "integer" }, opportunities: { type: "integer" }, action_items: { type: "integer" }, avg_response_time_minutes: { type: "integer" } } } } };
var Zr = /* @__PURE__ */ __name2((e) => `Fetch ${e}. Extract: (1) all visible prices and currency, (2)
plan/tier names, (3) any "new", "limited time", or "beta" badges,
(4) any feature list deltas. Return as JSON with fields: prices[],
plans[], badges[], features[]. No prose.`, "Zr");
var Xr = /* @__PURE__ */ __name2((e, t) => `User question: "${e}". Industry context: ${t}. Search the
last 7 days only. Return 3-5 evidence snippets with source URLs. No
opinion \u2014 just sourced facts the assistant will cite.`, "Xr");
var qt = /* @__PURE__ */ __name2((e) => `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${e.title}</title>
<meta name="description" content="RealityPulse \u2014 Bloomberg-Terminal-for-SMBs. Daily Battle Brief on policy, competitors, and sentiment." />
<link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
<link rel="alternate icon" href="/static/favicon.svg" />

<!-- Geist Sans + Mono from Vercel CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

<!-- Tailwind via CDN -->
<script src="https://cdn.tailwindcss.com"><\/script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        },
        colors: {
          ink: { 950: '#05060a', 900: '#0a0c14', 800: '#11141d', 700: '#1a1e2a', 600: '#262b3a', 500: '#3a4055' },
          policy: '#06b6d4',     // cyan
          competitor: '#f97316', // orange
          sentiment: '#ec4899',  // magenta
          action: '#10b981',     // emerald
        },
        boxShadow: {
          'glow-cyan': '0 0 24px rgba(6,182,212,0.35)',
          'glow-orange': '0 0 24px rgba(249,115,22,0.35)',
          'glow-magenta': '0 0 24px rgba(236,72,153,0.35)',
          'glow-emerald': '0 0 24px rgba(16,185,129,0.35)',
        },
      },
    },
  }
<\/script>

<!-- Icons -->
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />

<!-- Charts: Chart.js (covers line/area/bar/radar/bubble/doughnut) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"><\/script>

<!-- HTTP -->
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>

<!-- Date -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"><\/script>

<style>
  :root { color-scheme: dark; }
  html, body { background: #05060a; color: #e7eaf3; font-family: 'Inter', system-ui, sans-serif; }
  ::selection { background: rgba(6,182,212,0.4); color: #fff; }
  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0a0c14; }
  ::-webkit-scrollbar-thumb { background: #262b3a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a4055; }
  /* Pulse animation */
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(6,182,212,0.55); }
    70% { box-shadow: 0 0 0 16px rgba(6,182,212,0); }
    100% { box-shadow: 0 0 0 0 rgba(6,182,212,0); }
  }
  .pulse-ring { animation: pulse-ring 2.4s infinite cubic-bezier(0.66, 0, 0, 1); }
  @keyframes slide-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .slide-up { animation: slide-up 0.5s ease-out both; }
  .slide-up-stagger > * { animation: slide-up 0.6s ease-out both; }
  .slide-up-stagger > *:nth-child(1) { animation-delay: 0.05s; }
  .slide-up-stagger > *:nth-child(2) { animation-delay: 0.12s; }
  .slide-up-stagger > *:nth-child(3) { animation-delay: 0.19s; }
  .slide-up-stagger > *:nth-child(4) { animation-delay: 0.26s; }
  .slide-up-stagger > *:nth-child(5) { animation-delay: 0.33s; }
  .slide-up-stagger > *:nth-child(6) { animation-delay: 0.40s; }
  /* Card hover lift */
  .card { background: linear-gradient(180deg, rgba(26,30,42,0.85), rgba(17,20,29,0.85)); border: 1px solid rgba(58,64,85,0.5); border-radius: 14px; backdrop-filter: blur(8px); }
  .card-hover:hover { border-color: rgba(6,182,212,0.5); transform: translateY(-2px); transition: all 0.2s ease; }
  /* Mono numbers */
  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  /* Grid bg */
  .grid-bg {
    background-image:
      linear-gradient(rgba(58,64,85,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(58,64,85,0.12) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  /* Glow border */
  .glow-border { box-shadow: inset 0 0 0 1px rgba(6,182,212,0.35), 0 0 20px rgba(6,182,212,0.2); }
  /* Spinning satellite (loading) */
  @keyframes orbit { from { transform: rotate(0deg) translateX(40px) rotate(0deg); } to { transform: rotate(360deg) translateX(40px) rotate(-360deg); } }
  .orbit { animation: orbit 4s linear infinite; }
  /* Tab underline */
  .tab-active { color: #06b6d4; border-bottom: 2px solid #06b6d4; }
  /* Threat needle */
  @keyframes needle-sweep { from { transform: rotate(-90deg); } to { transform: rotate(var(--needle-angle, 0deg)); } }
  .needle { transform-origin: bottom center; animation: needle-sweep 1.4s cubic-bezier(.4,2,.2,.9) forwards; }
  /* Code block */
  pre.code { background: #05060a; border: 1px solid #1a1e2a; border-radius: 10px; padding: 14px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #b3b8c9; }
  pre.code .key { color: #06b6d4; }
  pre.code .str { color: #10b981; }
  pre.code .num { color: #f97316; }
  /* Marker on world map */
  .map-pin { width: 14px; height: 14px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 0 4px rgba(6,182,212,0.18), 0 0 18px rgba(6,182,212,0.7); }
  .map-pin.orange { background: #f97316; box-shadow: 0 0 0 4px rgba(249,115,22,0.18), 0 0 18px rgba(249,115,22,0.7); }
  .map-pin.magenta { background: #ec4899; box-shadow: 0 0 0 4px rgba(236,72,153,0.18), 0 0 18px rgba(236,72,153,0.7); }
  /* Slide-in drawer */
  .drawer { transform: translateX(100%); transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
  .drawer.open { transform: translateX(0); }
  /* cmdk */
  .cmdk-backdrop { backdrop-filter: blur(8px); background: rgba(5,6,10,0.7); }
</style>

${e.extraHead || ""}
</head>
<body class="${e.bodyClass || "min-h-screen bg-ink-950 text-gray-100"}">
${e.bodyHTML}
${e.extraScripts || ""}
</body>
</html>`, "qt");
var ea = /* @__PURE__ */ __name2(() => qt({ title: "RealityPulse \u2014 Bloomberg Terminal for SMBs", bodyHTML: `
<!-- Navbar -->
<nav class="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-ink-700/50">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5 group">
      <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-policy to-sentiment flex items-center justify-center">
        <div class="absolute inset-0 rounded-full pulse-ring"></div>
        <i class="fa-solid fa-satellite-dish text-white text-sm"></i>
      </div>
      <span class="text-lg font-bold tracking-tight">RealityPulse</span>
      <span class="text-[10px] mono uppercase text-policy border border-policy/40 rounded px-1.5 py-0.5">v1.0</span>
    </a>
    <div class="hidden md:flex items-center gap-7 text-sm text-gray-400">
      <a href="#features" class="hover:text-white">Features</a>
      <a href="#how" class="hover:text-white">How it works</a>
      <a href="/threat-index" class="hover:text-white">Threat Index</a>
      <a href="https://anakin.io/docs" target="_blank" class="hover:text-white">Docs <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ml-0.5"></i></a>
    </div>
    <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg hover:shadow-glow-cyan transition">
      See it in action <i class="fa-solid fa-arrow-right ml-1"></i>
    </a>
  </div>
</nav>

<!-- HERO -->
<section class="relative overflow-hidden">
  <div class="absolute inset-0 grid-bg opacity-40"></div>
  <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-policy/20 rounded-full blur-[120px]"></div>
  <div class="absolute top-40 right-0 w-[400px] h-[400px] bg-sentiment/15 rounded-full blur-[100px]"></div>

  <div class="relative max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
    <div class="slide-up">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-policy/10 border border-policy/30 text-policy text-xs mono mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-policy pulse-ring"></span>
        LIVE \u2014 3,247 changes detected in the last 24h
      </div>
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
        The Bloomberg Terminal<br>
        <span class="bg-gradient-to-r from-policy via-sentiment to-competitor bg-clip-text text-transparent">for small business.</span>
      </h1>
      <p class="text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
        A single Daily Battle Brief that tells you exactly which regulations, competitor moves, and customer sentiment shifts will affect <em>your</em> business \u2014 and what to do about each one before lunch.
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-10">
        <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold px-5 py-3 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-bolt"></i> See it in action \u2014 no signup
        </a>
        <a href="/onboarding" class="bg-ink-700/70 border border-ink-600 px-5 py-3 rounded-lg hover:bg-ink-700 transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Set up your tenant
        </a>
      </div>
      <div class="grid grid-cols-3 gap-6 max-w-md">
        <div>
          <div class="mono text-2xl font-semibold text-white">12</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Affect you today</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white">06:00 UTC</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Daily brief</div>
        </div>
        <div>
          <div class="mono text-2xl font-semibold text-white">~15 \xA2</div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">Per briefing</div>
        </div>
      </div>
    </div>

    <!-- HERO VISUAL: SVG globe with pulse dots -->
    <div class="relative slide-up" style="animation-delay: .2s">
      <div class="aspect-square max-w-[520px] mx-auto relative">
        <svg viewBox="0 0 400 400" class="w-full h-full">
          <defs>
            <radialGradient id="globeGrad" cx="50%" cy="40%">
              <stop offset="0%" stop-color="#1a1e2a" />
              <stop offset="100%" stop-color="#05060a" />
            </radialGradient>
            <radialGradient id="glow" cx="50%" cy="50%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
            </radialGradient>
          </defs>
          <!-- Outer glow -->
          <circle cx="200" cy="200" r="190" fill="url(#glow)" />
          <!-- Globe sphere -->
          <circle cx="200" cy="200" r="160" fill="url(#globeGrad)" stroke="#262b3a" stroke-width="1" />
          <!-- Meridians -->
          ${[0, 30, 60, 90, 120, 150].map((e) => `
            <ellipse cx="200" cy="200" rx="${Math.abs(160 * Math.cos(e * Math.PI / 180))}" ry="160" fill="none" stroke="#3a4055" stroke-width="0.6" opacity="0.55" />
          `).join("")}
          <!-- Parallels -->
          ${[0.3, 0.55, 0.78, 0.93].map((e) => `
            <ellipse cx="200" cy="200" rx="${160 * e}" ry="${160 * e * 0.4}" fill="none" stroke="#3a4055" stroke-width="0.5" opacity="0.45" />
          `).join("")}
          <!-- Pulse dots (regulation hot spots) -->
          ${[{ x: 250, y: 145, c: "#06b6d4" }, { x: 130, y: 165, c: "#06b6d4" }, { x: 105, y: 185, c: "#f97316" }, { x: 295, y: 235, c: "#ec4899" }, { x: 320, y: 220, c: "#06b6d4" }, { x: 235, y: 175, c: "#f97316" }, { x: 270, y: 260, c: "#06b6d4" }, { x: 165, y: 270, c: "#ec4899" }, { x: 340, y: 280, c: "#f97316" }].map((e, t) => `
            <g>
              <circle cx="${e.x}" cy="${e.y}" r="14" fill="${e.c}" opacity="0.15">
                <animate attributeName="r" from="3" to="22" dur="2.8s" begin="${t * 0.25}s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2.8s" begin="${t * 0.25}s" repeatCount="indefinite" />
              </circle>
              <circle cx="${e.x}" cy="${e.y}" r="3" fill="${e.c}" />
            </g>
          `).join("")}
        </svg>
        <!-- Caption -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-gray-500 mono">
          <span class="text-policy">\u25CF</span> Policy &nbsp;
          <span class="text-competitor">\u25CF</span> Competitor &nbsp;
          <span class="text-sentiment">\u25CF</span> Sentiment
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 3-PILLAR FEATURE BLOCKS -->
<section id="features" class="max-w-7xl mx-auto px-6 py-20">
  <div class="text-center mb-14 slide-up">
    <h2 class="text-3xl md:text-4xl font-bold mb-3">Three pillars. One brief. Every morning.</h2>
    <p class="text-gray-400 max-w-2xl mx-auto">RealityPulse fuses Anakin's Agentic Search with NVIDIA-powered reasoning to deliver a Bloomberg-grade view of your operating reality.</p>
  </div>
  <div class="grid md:grid-cols-3 gap-6 slide-up-stagger">
    ${Rt({ color: "policy", icon: "fa-scale-balanced", title: "Policy Radar", desc: 'New regulations, enforcement actions, agency guidance \u2014 globally. Each card includes a plain-English summary, deadline countdown, and a "what you must do" checklist.', stat: "14 EU events overnight", glow: "glow-cyan" })}
    ${Rt({ color: "competitor", icon: "fa-chess-knight", title: "Competitor Pulse", desc: "Hourly diffs of competitor pricing pages, feature launches, hires, funding. Side-by-side red/green snapshots are judge-bait \u2014 you literally watched them change their price.", stat: "+12.5% Stripe ACH overnight", glow: "glow-orange" })}
    ${Rt({ color: "sentiment", icon: "fa-wave-square", title: "Sentiment Storm", desc: "Topic-cluster bubble charts, sample quotes, and sentiment-delta-vs-competitors charts pulled from reviews, social, and forums.", stat: "-18pt fraud-tool sentiment", glow: "glow-magenta" })}
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how" class="max-w-7xl mx-auto px-6 py-20 border-t border-ink-700/40">
  <div class="grid lg:grid-cols-5 gap-10 items-start">
    <div class="lg:col-span-2">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">How a Battle Brief is born.</h2>
      <p class="text-gray-400 mb-6">Six steps. Two AI models. Fifteen credits. Every business day at 06:00 UTC.</p>
      <a href="/dashboard?demo=true" class="inline-flex items-center gap-2 text-policy hover:underline">
        Open the live demo dashboard <i class="fa-solid fa-arrow-right text-xs"></i>
      </a>
    </div>
    <div class="lg:col-span-3 space-y-3">
      ${[["Vercel Cron @ 06:00 UTC", "Enqueues one Inngest job per active tenant."], ["Inngest worker", "Submits Anakin Agentic Search with templated prompt + JSON schema; polls every 10s."], ["Briefing JSON", 'Written to <code class="mono text-policy">briefings</code> as JSONB. Sources embedded via NVIDIA NV-Embed-v2 \u2192 pgvector.'], ["Supabase Realtime", "INSERT event broadcasts \u2192 dashboard live-updates with Framer Motion entrance."], ["Hourly pg_cron", 'Runs <code class="mono text-policy">/v1/url-scraper</code> against competitor pages; diff \u2192 alert via Resend/Slack.'], ["Ask RealityPulse", '<code class="mono text-policy">Cmd+K</code> opens a RAG chat over your briefing history. Inline citations scroll to source.']].map(([e, t], s) => `
        <div class="card p-4 flex items-start gap-4 card-hover">
          <div class="mono text-policy text-xs w-8 shrink-0">0${s + 1}</div>
          <div>
            <div class="font-semibold mb-1">${e}</div>
            <div class="text-sm text-gray-400">${t}</div>
          </div>
        </div>
      `).join("")}
    </div>
  </div>
</section>

<!-- TECH STACK STRIP -->
<section class="border-t border-ink-700/40 py-12">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center text-xs text-gray-500 uppercase tracking-widest mb-6 mono">Powered by</div>
    <div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-gray-400">
      <span class="flex items-center gap-2"><i class="fa-solid fa-magnifying-glass-chart text-policy"></i> Anakin Agentic Search</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-microchip text-emerald-400"></i> NVIDIA meta/llama-3.2-3b-instruct</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-database text-competitor"></i> Supabase + pgvector</span>
      <span class="flex items-center gap-2"><i class="fa-brands fa-cloudflare text-orange-400"></i> Cloudflare Pages</span>
      <span class="flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Inngest + Vercel Cron</span>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="max-w-4xl mx-auto px-6 py-20 text-center">
  <h2 class="text-3xl md:text-4xl font-bold mb-4">Stop reading the news. Start running on it.</h2>
  <p class="text-gray-400 mb-8">One briefing. Every morning. Built for operators who don't have time to read the news.</p>
  <a href="/dashboard?demo=true" class="bg-policy text-ink-950 font-semibold px-6 py-3.5 rounded-lg hover:shadow-glow-cyan transition inline-flex items-center gap-2">
    <i class="fa-solid fa-rocket"></i> Open the live demo
  </a>
</section>

<footer class="border-t border-ink-700/40 py-8 text-center text-xs text-gray-500">
  RealityPulse \xB7 Built with Hono \xB7 Cloudflare Pages \xB7 Anakin \xB7 NVIDIA NIM \xB7 Supabase
</footer>
` }), "ea");
var Rt = /* @__PURE__ */ __name2((e) => `
  <div class="card card-hover p-6 relative overflow-hidden">
    <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-${e.color}/20 blur-2xl"></div>
    <div class="relative">
      <div class="w-11 h-11 rounded-lg bg-${e.color}/15 border border-${e.color}/40 flex items-center justify-center mb-4 hover:shadow-${e.glow} transition">
        <i class="fa-solid ${e.icon} text-${e.color} text-lg"></i>
      </div>
      <h3 class="text-xl font-semibold mb-2">${e.title}</h3>
      <p class="text-sm text-gray-400 leading-relaxed mb-4">${e.desc}</p>
      <div class="mono text-xs text-${e.color} inline-flex items-center gap-2 bg-${e.color}/10 border border-${e.color}/30 rounded px-2 py-1">
        <span class="w-1.5 h-1.5 rounded-full bg-${e.color} pulse-ring"></span> ${e.stat}
      </div>
    </div>
  </div>
`, "Rt");
var ta = /* @__PURE__ */ __name2(() => qt({ title: "Set up your tenant \u2014 RealityPulse", bodyHTML: `
<div class="min-h-screen flex flex-col">
  <nav class="border-b border-ink-700/50 px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2.5">
      <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-policy to-sentiment flex items-center justify-center">
        <i class="fa-solid fa-satellite-dish text-white text-sm"></i>
      </div>
      <span class="text-lg font-bold">RealityPulse</span>
    </a>
    <a href="/dashboard?demo=true" class="text-sm text-gray-400 hover:text-white">Skip \u2014 open demo \u2192</a>
  </nav>

  <main class="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
    <!-- Step indicator -->
    <div class="flex items-center justify-center gap-2 mb-10">
      <div id="dot-1" class="step-dot active w-8 h-8 rounded-full bg-policy text-ink-950 flex items-center justify-center font-semibold mono text-sm">1</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-2" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">2</div>
      <div class="w-12 h-px bg-ink-600"></div>
      <div id="dot-3" class="step-dot w-8 h-8 rounded-full bg-ink-700 text-gray-500 flex items-center justify-center font-semibold mono text-sm">3</div>
    </div>

    <!-- STEP 1 -->
    <section id="step-1" class="card p-8 slide-up">
      <div class="text-xs mono text-policy uppercase mb-2">Step 1 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What's your business?</h1>
      <p class="text-gray-400 text-sm mb-6">We use this to template your Daily Battle Brief prompt.</p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Industry</label>
          <select id="industry" class="w-full bg-ink-800 border border-ink-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-policy">
            <option>B2B SaaS Fintech</option>
            <option>E-commerce / DTC</option>
            <option>HealthTech</option>
            <option>EdTech</option>
            <option>Marketplace</option>
            <option>Cybersecurity</option>
            <option>AI / ML Platform</option>
            <option>Insurance</option>
            <option>Legal Tech</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Operating region</label>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            ${["US", "EU", "UK", "CA", "APAC", "LATAM", "MENA", "Global"].map((e) => `
              <button type="button" class="region-btn border border-ink-600 hover:border-policy hover:bg-policy/10 rounded-lg py-2.5 text-sm transition">${e}</button>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-8">
        <button onclick="goStep(2)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- STEP 2 -->
    <section id="step-2" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 2 of 3</div>
      <h1 class="text-2xl font-bold mb-2">Who are your competitors?</h1>
      <p class="text-gray-400 text-sm mb-6">Paste 1\u20133 domains. We'll hourly-scrape their pricing pages and diff them.</p>
      <div class="space-y-3">
        ${[1, 2, 3].map((e) => `
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center">
              <i class="fa-solid fa-globe text-gray-500"></i>
            </div>
            <input type="text" placeholder="${["stripe.com", "adyen.com", "checkout.com"][e - 1]}" class="comp-input flex-1 bg-ink-800 border border-ink-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-policy" />
            <span class="comp-badge text-xs mono text-gray-500">\u2014</span>
          </div>
        `).join("")}
      </div>
      <div class="flex justify-between mt-8">
        <button onclick="goStep(1)" class="text-gray-400 hover:text-white px-4 py-2.5">\u2190 Back</button>
        <button onclick="goStep(3)" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition">
          Continue <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    </section>

    <!-- STEP 3 -->
    <section id="step-3" class="card p-8 hidden">
      <div class="text-xs mono text-policy uppercase mb-2">Step 3 of 3</div>
      <h1 class="text-2xl font-bold mb-2">What matters to you?</h1>
      <p class="text-gray-400 text-sm mb-6">Toggle the six signal pillars. You can change these later.</p>
      <div class="grid grid-cols-2 gap-3">
        ${[["policy", "fa-scale-balanced", "Policy", "cyan"], ["pricing", "fa-tag", "Pricing", "orange"], ["features", "fa-puzzle-piece", "Features", "orange"], ["sentiment", "fa-wave-square", "Sentiment", "pink"], ["supply_chain", "fa-truck-fast", "Supply Chain", "cyan"], ["hiring", "fa-user-tie", "Hiring", "orange"]].map(([e, t, s]) => `
          <label class="pillar-toggle cursor-pointer card p-4 flex items-center gap-3 card-hover">
            <input type="checkbox" data-pillar="${e}" checked class="w-4 h-4 accent-cyan-500" />
            <i class="fa-solid ${t} text-gray-400"></i>
            <span class="font-medium">${s}</span>
          </label>
        `).join("")}
      </div>

      <div class="flex justify-between mt-8">
        <button onclick="goStep(2)" class="text-gray-400 hover:text-white px-4 py-2.5">\u2190 Back</button>
        <button onclick="launchBrief()" class="bg-policy text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-cyan transition flex items-center gap-2">
          <i class="fa-solid fa-rocket"></i> Generate my first briefing
        </button>
      </div>
    </section>

    <!-- LOADING -->
    <section id="loading" class="card p-10 hidden text-center">
      <div class="relative w-24 h-24 mx-auto mb-6">
        <div class="absolute inset-0 rounded-full border-2 border-policy/30"></div>
        <div class="absolute inset-0 rounded-full border-t-2 border-policy animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <i class="fa-solid fa-satellite-dish text-policy text-2xl"></i>
        </div>
      </div>
      <h2 class="text-xl font-bold mb-2">Brewing your first briefing</h2>
      <p id="loading-caption" class="text-gray-400 text-sm transition-opacity duration-500">Reading 1,247 regulations\u2026</p>
      <div class="mono text-xs text-gray-600 mt-6">Anakin job \xB7 ~15 credits \xB7 ~12s expected</div>
    </section>
  </main>
</div>

<script>
  let step = 1
  function goStep(n) {
    step = n
    for (let i = 1; i <= 3; i++) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== n)
      const dot = document.getElementById('dot-' + i)
      if (i <= n) { dot.classList.remove('bg-ink-700','text-gray-500'); dot.classList.add('bg-policy','text-ink-950') }
      else { dot.classList.remove('bg-policy','text-ink-950'); dot.classList.add('bg-ink-700','text-gray-500') }
    }
  }
  // Region buttons
  document.querySelectorAll('.region-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.region-btn').forEach(x => x.classList.remove('bg-policy/10','border-policy','text-policy'))
    b.classList.add('bg-policy/10','border-policy','text-policy')
  }))
  // Validate competitor domains (preview favicon)
  document.querySelectorAll('.comp-input').forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const v = e.target.value.trim()
      const badge = e.target.parentElement.querySelector('.comp-badge')
      const icon = e.target.parentElement.querySelector('i')
      if (/^[a-z0-9.-]+\\.[a-z]{2,}$/i.test(v)) {
        badge.textContent = '\u2713 valid'
        badge.classList.remove('text-gray-500'); badge.classList.add('text-emerald-400')
        icon.parentElement.style.backgroundImage = 'url(https://www.google.com/s2/favicons?domain=' + v + '&sz=64)'
        icon.parentElement.style.backgroundSize = 'cover'
        icon.style.display = 'none'
      } else {
        badge.textContent = '\u2014'; badge.classList.add('text-gray-500'); badge.classList.remove('text-emerald-400')
        icon.parentElement.style.backgroundImage = ''
        icon.style.display = 'inline'
      }
    })
  })
  // Loading captions cycling
  const captions = [
    'Reading 1,247 regulations\u2026',
    'Cross-referencing your competitors\u2026',
    'Embedding source documents into pgvector\u2026',
    'Asking NVIDIA meta/llama-3.2-3b-instruct to synthesize\u2026',
    'Composing your Daily Battle Brief\u2026',
  ]
  function launchBrief() {
    document.getElementById('step-3').classList.add('hidden')
    document.getElementById('loading').classList.remove('hidden')
    let i = 0
    const el = document.getElementById('loading-caption')
    const t = setInterval(() => {
      i = (i + 1) % captions.length
      el.style.opacity = 0
      setTimeout(() => { el.textContent = captions[i]; el.style.opacity = 1 }, 250)
    }, 1700)
    setTimeout(() => { clearInterval(t); window.location.href = '/dashboard?demo=true&fresh=1' }, 8500)
  }
<\/script>
` }), "ta");
var si = /* @__PURE__ */ __name2((e = false) => qt({ title: e ? "Public Threat Index \u2014 RealityPulse" : "Command Center \u2014 RealityPulse", bodyHTML: `
<!-- TOP NAV -->
<nav class="sticky top-0 z-30 backdrop-blur-md bg-ink-950/80 border-b border-ink-700/50">
  <div class="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
    <a href="/" class="flex items-center gap-2.5 group shrink-0">
      <div class="relative w-7 h-7 rounded-full bg-gradient-to-br from-policy to-sentiment flex items-center justify-center">
        <div class="absolute inset-0 rounded-full pulse-ring"></div>
        <i class="fa-solid fa-satellite-dish text-white text-xs"></i>
      </div>
      <span class="font-bold tracking-tight">RealityPulse</span>
    </a>
    <span class="text-gray-500 mono text-xs hidden md:inline">/ Acme Fintech / B2B SaaS Fintech / US+EU</span>

    <div class="flex-1 flex items-center justify-center">
      <button id="cmdk-trigger" class="flex items-center gap-2 bg-ink-800/70 hover:bg-ink-700 border border-ink-600 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition w-full max-w-md">
        <i class="fa-solid fa-magnifying-glass text-xs"></i>
        <span class="flex-1 text-left">Ask RealityPulse\u2026</span>
        <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">\u2318K</kbd>
      </button>
    </div>

    <!-- Credit Meter widget -->
    <div id="credit-meter" class="hidden md:flex items-center gap-2 card px-3 py-1.5">
      <svg width="28" height="28" viewBox="0 0 36 36" class="shrink-0">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#262b3a" stroke-width="3"/>
        <path id="credit-arc" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" stroke-width="3" stroke-dasharray="31, 100" stroke-linecap="round"/>
      </svg>
      <div class="text-xs leading-tight">
        <div class="mono text-policy"><span id="credit-used">47</span>/150</div>
        <div class="text-[10px] text-gray-500 uppercase">Anakin credits</div>
      </div>
    </div>

    <button id="transparency-trigger" class="card-hover card px-3 py-1.5 text-xs flex items-center gap-1.5">
      <i class="fa-solid fa-eye text-policy"></i> How we know this
    </button>

    <button id="theme-toggle" class="card-hover card w-8 h-8 flex items-center justify-center" title="Toggle theme">
      <i class="fa-solid fa-moon text-xs"></i>
    </button>
  </div>

  <!-- TAB BAR -->
  <div class="max-w-[1500px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
    ${[["command", "fa-house-signal", "Command Center"], ["policy", "fa-scale-balanced", "Policy Radar"], ["competitor", "fa-chess-knight", "Competitor Pulse"], ["sentiment", "fa-wave-square", "Sentiment Storm"], ["scenario", "fa-flask", "Scenario"], ["archetype", "fa-people-arrows", "Archetype"]].map(([t, s, i], a) => `
      <button data-tab="${t}" class="tab-btn px-4 py-3 text-sm flex items-center gap-2 hover:text-white transition ${a === 0 ? "tab-active" : "text-gray-400"}">
        <i class="fa-solid ${s} text-xs"></i> ${i}
      </button>
    `).join("")}
  </div>
</nav>

<main class="max-w-[1500px] mx-auto px-6 py-6">

  ${sa()}
  ${na()}
  ${la()}
  ${ca()}
  ${da()}
  ${ua()}

</main>

${pa()}
${fa()}
${ha()}

<script src="/static/dashboard.js"><\/script>
` }), "si");
function sa() {
  return `
<section data-pane="command" class="tab-pane">

  <!-- Top banner -->
  <div class="card p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 slide-up">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-lg bg-policy/15 border border-policy/40 flex items-center justify-center shrink-0">
        <i class="fa-solid fa-sun text-policy text-xl"></i>
      </div>
      <div>
        <div class="text-xs mono text-gray-500 uppercase mb-1">Good morning \xB7 brief generated <span id="brief-time">06:00 UTC</span></div>
        <h1 class="text-xl md:text-2xl font-bold">4 high-impact events overnight. Threat level <span class="text-policy mono">73/100</span>.</h1>
        <p class="text-sm text-gray-400 mt-1">EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <button id="play-audio" class="card-hover card px-3 py-2 text-sm flex items-center gap-2"><i class="fa-solid fa-headphones text-policy"></i> Listen <span class="text-[10px] mono text-gray-500">FREE</span></button>
      <button class="bg-policy text-ink-950 font-semibold px-4 py-2 rounded-lg hover:shadow-glow-cyan text-sm">Read full brief <i class="fa-solid fa-arrow-right ml-1"></i></button>
    </div>
  </div>

  <!-- TIME MACHINE slider -->
  <div class="card p-3 mb-5 flex items-center gap-4 slide-up">
    <i class="fa-solid fa-clock-rotate-left text-policy"></i>
    <span class="text-xs text-gray-400 shrink-0 mono">Time Machine</span>
    <input id="time-machine" type="range" min="0" max="7" value="0" class="flex-1 accent-cyan-500" />
    <span id="time-machine-label" class="text-xs mono text-policy shrink-0 w-32 text-right">Today \xB7 live</span>
  </div>

  <!-- 12-column grid -->
  <div class="grid grid-cols-12 gap-5">

    <!-- LEFT RAIL: 7-day timeline -->
    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm">Last 7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Events</span>
      </div>
      <ol id="timeline-list" class="relative border-l border-ink-600 pl-4 space-y-3">
        <!-- populated by JS -->
      </ol>
    </aside>

    <!-- CENTER: PULSE WHEEL hero visual -->
    <div class="col-span-12 lg:col-span-6 card p-5 relative overflow-hidden slide-up">
      <div class="absolute top-3 left-5 text-xs mono uppercase text-gray-500">The Pulse Wheel \xB7 24h</div>
      <div class="absolute top-3 right-5 flex items-center gap-3 text-[11px] mono">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-policy"></span> Policy</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-competitor"></span> Competitor</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sentiment"></span> Sentiment</span>
      </div>
      <div id="pulse-wheel-container" class="aspect-square max-w-[460px] mx-auto pt-6 pb-2">
        ${ia()}
      </div>
      <div id="wheel-tooltip" class="absolute bg-ink-950 border border-policy/50 rounded-lg p-3 text-xs pointer-events-none opacity-0 transition-opacity shadow-glow-cyan max-w-[240px]"></div>
    </div>

    <!-- RIGHT: Today's 3 actions -->
    <aside class="col-span-12 lg:col-span-3 card p-4 slide-up">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-action pulse-ring"></span> Today's 3 actions</h3>
      </div>
      <div id="actions-list" class="space-y-3"><!-- JS --></div>
    </aside>

    <!-- KPI STRIP -->
    <div class="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
      ${it("Threats Detected", "12", "+3", "text-policy", "fa-shield-halved")}
      ${it("Opportunities", "4", "+1", "text-action", "fa-bullseye")}
      ${it("Action Items", "3", "0", "text-competitor", "fa-list-check")}
      ${it("Avg. Response", "47m", "-12m", "text-sentiment", "fa-stopwatch")}
    </div>

    <!-- THREAT-LEVEL METER (animated needle, Bloomberg feel) -->
    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threat-Level Meter</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Bloomberg style</span>
      </div>
      ${ra(73)}
    </div>

    <!-- Sentiment volume area chart -->
    <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment Volume \xB7 14d</h3>
        <span class="text-[10px] mono text-sentiment uppercase">+/\u2212 /neutral</span>
      </div>
      <canvas id="chart-sentiment-volume" height="180"></canvas>
    </div>

    <!-- Sankey-ish flow: threats \u2192 actions -->
    <div class="col-span-12 lg:col-span-4 card p-5 slide-up">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Threats \u2192 Actions Flow</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Sankey</span>
      </div>
      ${aa()}
    </div>

  </div>
</section>`;
}
__name(sa, "sa");
__name2(sa, "sa");
function ia() {
  const e = [{ ring: 0, hour: 0.23, sev: 92, title: "EU AI Act enforcement", color: "#06b6d4", url: "https://eur-lex.europa.eu" }, { ring: 0, hour: 4.92, sev: 68, title: "CFPB BNPL circular", color: "#06b6d4", url: "https://consumerfinance.gov" }, { ring: 0, hour: 7, sev: 41, title: "UK FCA stablecoin consult", color: "#06b6d4", url: "https://fca.org.uk" }, { ring: 1, hour: 1.33, sev: 54, title: "Checkout.com hires 4 ML", color: "#f97316", url: "https://checkout.com" }, { ring: 1, hour: 3.7, sev: 81, title: "Stripe ACH +12.5%", color: "#f97316", url: "https://stripe.com" }, { ring: 1, hour: 6.18, sev: 76, title: "Adyen Embedded Finance launch", color: "#f97316", url: "https://adyen.com" }, { ring: 2, hour: 2.5, sev: 71, title: "Reddit fraud-tool sentiment -18", color: "#ec4899", url: "https://reddit.com" }, { ring: 2, hour: 5.03, sev: 48, title: "G2 onboarding-friction +31%", color: "#ec4899", url: "https://g2.com" }], t = [165, 130, 95], s = ["POLICY", "COMPETITOR", "SENTIMENT"], i = ["#06b6d4", "#f97316", "#ec4899"], a = e.map((n) => {
    const l = (n.hour / 24 * 360 - 90) * Math.PI / 180, c = t[n.ring], d = 8 + n.sev / 100 * 16, p = 200 + Math.cos(l) * (c - d / 2), f = 200 + Math.sin(l) * (c - d / 2), h = 200 + Math.cos(l) * (c + d / 2), m = 200 + Math.sin(l) * (c + d / 2), g = 200 + Math.cos(l) * c, v = 200 + Math.sin(l) * c;
    return `
        <g class="wheel-tick cursor-pointer" data-title="${n.title}" data-sev="${n.sev}" data-url="${n.url}" data-color="${n.color}">
          <line x1="${p}" y1="${f}" x2="${h}" y2="${m}" stroke="${n.color}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="${g}" cy="${v}" r="${4 + n.sev / 40}" fill="${n.color}" opacity="0.95" />
          <circle cx="${g}" cy="${v}" r="${10 + n.sev / 20}" fill="${n.color}" opacity="0.18">
            <animate attributeName="r" from="${4 + n.sev / 40}" to="${18 + n.sev / 12}" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.4" to="0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>`;
  }).join(""), r = [0, 6, 12, 18].map((n) => {
    const l = (n / 24 * 360 - 90) * Math.PI / 180, c = 200 + Math.cos(l) * 188, d = 200 + Math.sin(l) * 188 + 4;
    return `<text x="${c}" y="${d}" fill="#3a4055" font-family="JetBrains Mono" font-size="11" text-anchor="middle">${n.toString().padStart(2, "0")}h</text>`;
  }).join("");
  return `
    <svg viewBox="0 0 400 400" class="w-full h-full">
      <defs>
        <radialGradient id="wheelGlow" cx="50%" cy="50%">
          <stop offset="60%" stop-color="#0a0c14" />
          <stop offset="100%" stop-color="#11141d" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="185" fill="url(#wheelGlow)" />
      ${t.map((n, o) => `<circle cx="200" cy="200" r="${n}" fill="none" stroke="${i[o]}" stroke-opacity="0.15" stroke-width="22" /><circle cx="200" cy="200" r="${n}" fill="none" stroke="${i[o]}" stroke-opacity="0.5" stroke-width="0.8" />`).join("")}
      ${[0, 90, 180, 270].map((n) => {
    const o = (n - 90) * Math.PI / 180;
    return `<line x1="200" y1="200" x2="${200 + Math.cos(o) * 175}" y2="${200 + Math.sin(o) * 175}" stroke="#262b3a" stroke-width="0.6" />`;
  }).join("")}
      ${r}
      ${a}
      <!-- Center hub -->
      <circle cx="200" cy="200" r="34" fill="#05060a" stroke="#06b6d4" stroke-width="1" />
      <circle cx="200" cy="200" r="34" fill="none" stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1">
        <animate attributeName="r" from="34" to="48" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="196" fill="#e7eaf3" font-family="JetBrains Mono" font-size="18" font-weight="700" text-anchor="middle">73</text>
      <text x="200" y="212" fill="#3a4055" font-family="JetBrains Mono" font-size="8" text-anchor="middle" letter-spacing="1.5">THREAT</text>
      <!-- Ring labels -->
      ${t.map((n, o) => `<text x="200" y="${200 - n - 4}" fill="${i[o]}" font-family="JetBrains Mono" font-size="9" font-weight="600" text-anchor="middle" letter-spacing="1.5">${s[o]}</text>`).join("")}
    </svg>`;
}
__name(ia, "ia");
__name2(ia, "ia");
function ra(e) {
  const t = -90 + e / 100 * 180;
  return `
  <div class="relative">
    <svg viewBox="0 0 240 140" class="w-full">
      <defs>
        <linearGradient id="threatGrad" x1="0" x2="1">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
      </defs>
      <!-- arc -->
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="#1a1e2a" stroke-width="18" stroke-linecap="round" />
      <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="url(#threatGrad)" stroke-width="18" stroke-linecap="round" stroke-dasharray="${e / 100 * 283}, 283" />
      <!-- ticks -->
      ${[0, 25, 50, 75, 100].map((s) => {
    const i = (-180 + s / 100 * 180) * Math.PI / 180, a = 120 + Math.cos(i) * 78, r = 120 + Math.sin(i) * 78, n = 120 + Math.cos(i) * 100, o = 120 + Math.sin(i) * 100;
    return `<line x1="${a}" y1="${r}" x2="${n}" y2="${o}" stroke="#3a4055" stroke-width="1.5" /><text x="${120 + Math.cos(i) * 112}" y="${120 + Math.sin(i) * 112 + 4}" fill="#3a4055" font-family="JetBrains Mono" font-size="10" text-anchor="middle">${s}</text>`;
  }).join("")}
      <!-- needle -->
      <g style="transform-origin:120px 120px; transform: rotate(${t - 90}deg);" class="needle" data-needle-angle="${t - 90}">
        <line x1="120" y1="120" x2="120" y2="40" stroke="#e7eaf3" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="120" cy="40" r="4" fill="#06b6d4" />
      </g>
      <circle cx="120" cy="120" r="8" fill="#0a0c14" stroke="#06b6d4" stroke-width="1.5" />
    </svg>
    <div class="text-center mt-2">
      <div class="mono text-3xl font-semibold text-white">${e}<span class="text-base text-gray-500">/100</span></div>
      <div class="text-[10px] mono uppercase text-gray-500 tracking-widest">Elevated</div>
    </div>
  </div>`;
}
__name(ra, "ra");
__name2(ra, "ra");
function aa() {
  return `
  <svg viewBox="0 0 320 200" class="w-full">
    <!-- Source nodes (left) -->
    ${[{ y: 30, label: "Policy", color: "#06b6d4", count: 4 }, { y: 95, label: "Competitor", color: "#f97316", count: 5 }, { y: 160, label: "Sentiment", color: "#ec4899", count: 3 }].map((e) => `<rect x="10" y="${e.y - 18}" width="14" height="36" fill="${e.color}" rx="2" />
           <text x="32" y="${e.y - 2}" fill="#e7eaf3" font-family="Inter" font-size="11" font-weight="500">${e.label}</text>
           <text x="32" y="${e.y + 12}" fill="${e.color}" font-family="JetBrains Mono" font-size="10">${e.count} threats</text>`).join("")}
    <!-- Target nodes (right) -->
    ${[{ y: 50, label: "Audit", color: "#10b981" }, { y: 100, label: "Counter-market", color: "#10b981" }, { y: 150, label: "Ship landing", color: "#10b981" }].map((e) => `<rect x="296" y="${e.y - 14}" width="14" height="28" fill="${e.color}" rx="2" />
           <text x="290" y="${e.y - 18}" fill="#e7eaf3" font-family="Inter" font-size="10" text-anchor="end">${e.label}</text>`).join("")}
    <!-- Flows -->
    ${[["#06b6d4", 30, 50, 5], ["#06b6d4", 30, 100, 2], ["#f97316", 95, 100, 6], ["#f97316", 95, 150, 3], ["#ec4899", 160, 150, 4], ["#ec4899", 160, 100, 2]].map(([e, t, s, i]) => `<path d="M 24 ${t} C 150 ${t}, 170 ${s}, 296 ${s}" fill="none" stroke="${e}" stroke-opacity="0.35" stroke-width="${i}" />`).join("")}
  </svg>`;
}
__name(aa, "aa");
__name2(aa, "aa");
function na() {
  return `
<section data-pane="policy" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">

    <!-- World map heatmap -->
    <div class="col-span-12 lg:col-span-8 card p-5 relative">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Global Regulatory Heatmap</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Hover a region</span>
      </div>
      <div id="world-map" class="relative aspect-[2/1] rounded-lg bg-ink-900 overflow-hidden border border-ink-700">
        <!-- Stylized world map (SVG continents) -->
        <svg viewBox="0 0 1000 500" class="w-full h-full opacity-50">
          ${oa()}
        </svg>
        <!-- pins absolutely positioned -->
        <div id="map-pins" class="absolute inset-0"></div>
      </div>
    </div>

    <!-- Compare bar -->
    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Quarter-over-quarter</h3>
        <span class="text-[10px] mono text-policy uppercase">+34% vs Q1</span>
      </div>
      <canvas id="chart-policy-trend" height="200"></canvas>
    </div>

    <!-- Regulation cards -->
    <div class="col-span-12">
      <div class="flex items-center justify-between mb-3 mt-1">
        <h3 class="font-semibold">Active Regulations</h3>
        <div class="flex items-center gap-2 text-xs mono text-gray-500">
          <span class="px-2 py-0.5 rounded bg-policy/15 text-policy border border-policy/40">8 high impact</span>
          <span class="px-2 py-0.5 rounded bg-ink-700 border border-ink-600">4 deadlines &lt; 30d</span>
        </div>
      </div>
      <div id="reg-cards" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 slide-up-stagger"><!-- JS --></div>
    </div>

  </div>
</section>`;
}
__name(na, "na");
__name2(na, "na");
function oa() {
  return `
    <path d="M120,180 Q150,140 230,150 Q300,160 320,200 Q300,250 240,260 Q160,265 120,220 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M210,290 Q240,280 270,320 Q280,370 250,400 Q210,430 190,400 Q170,350 210,290 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M470,140 Q520,120 580,150 Q600,200 580,230 Q520,250 470,220 Q450,180 470,140 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M490,260 Q540,250 580,290 Q600,360 560,400 Q510,420 480,380 Q460,320 490,260 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M620,180 Q690,160 770,200 Q820,240 800,290 Q720,300 640,280 Q610,230 620,180 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M820,360 Q870,350 900,380 Q890,420 850,420 Q820,400 820,360 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
    <path d="M530,420 Q570,420 580,440 Q570,460 540,460 Q520,450 530,420 Z" fill="#1a1e2a" stroke="#3a4055" stroke-width="1" />
  `;
}
__name(oa, "oa");
__name2(oa, "oa");
function la() {
  return `
<section data-pane="competitor" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">

    <!-- Diff Timeline -->
    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Diff Timeline \xB7 7 days</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Scrub \u2192</span>
      </div>
      <div id="diff-timeline" class="relative h-14 bg-ink-900 rounded-lg border border-ink-700"></div>
    </div>

    <!-- Side-by-side diff viewer -->
    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Pricing Diff \xB7 stripe.com/pricing</h3>
        <div class="flex items-center gap-2 text-xs mono">
          <span class="text-gray-500">2026-06-19 14:00</span>
          <i class="fa-solid fa-arrow-right text-policy"></i>
          <span class="text-policy">2026-06-20 03:42</span>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-3">
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700">
            <span>BEFORE \u2014 cached snapshot</span>
            <span class="text-[10px] text-gray-500">html_hash: a3f2\u2026</span>
          </div>
          <div class="p-4 font-mono text-xs leading-relaxed space-y-1">
            <div>ACH payments</div>
            <div class="bg-red-500/15 text-red-400 px-2 py-1 rounded">- $0.80 per transaction</div>
            <div>+ 0.8% capped at $5</div>
            <div>Plan: Standard</div>
          </div>
        </div>
        <div class="border border-ink-700 rounded-lg overflow-hidden">
          <div class="bg-ink-900 px-3 py-2 text-xs mono text-gray-400 flex items-center justify-between border-b border-ink-700">
            <span class="text-policy">AFTER \u2014 current</span>
            <span class="text-[10px] text-gray-500">html_hash: b9e1\u2026</span>
          </div>
          <div class="p-4 font-mono text-xs leading-relaxed space-y-1">
            <div>ACH payments</div>
            <div class="bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded">+ $0.90 per transaction</div>
            <div>+ 0.8% capped at $5</div>
            <div>Plan: Standard</div>
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3 text-xs">
        <span class="px-2 py-1 rounded bg-competitor/15 text-competitor border border-competitor/40 mono">+12.5% fee</span>
        <span class="text-gray-400">Threat level: <strong class="text-white mono">81</strong></span>
        <button class="ml-auto text-policy hover:underline">Generate counter-email \u2192</button>
      </div>
    </div>

    <!-- Pricing race -->
    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Pricing Race \xB7 30d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">ACH per-txn</span>
      </div>
      <canvas id="chart-pricing-race" height="240"></canvas>
    </div>

    <!-- Feature parity matrix -->
    <div class="col-span-12 card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Feature Parity Matrix</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Auto-extracted</span>
      </div>
      <div id="feature-matrix" class="overflow-x-auto"></div>
    </div>

  </div>
</section>`;
}
__name(la, "la");
__name2(la, "la");
function ca() {
  return `
<section data-pane="sentiment" class="tab-pane hidden">
  <div class="grid grid-cols-12 gap-5">

    <!-- Topic bubble cluster -->
    <div class="col-span-12 lg:col-span-8 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Topic Cluster \xB7 last 14d</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Size = mentions \xB7 color = sentiment</span>
      </div>
      <div id="bubble-chart" class="h-[420px] relative"></div>
    </div>

    <!-- Diverging bar: brand vs competitors -->
    <div class="col-span-12 lg:col-span-4 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm">Sentiment \u0394 vs Competitors</h3>
        <span class="text-[10px] mono text-sentiment uppercase">7d</span>
      </div>
      <canvas id="chart-diverging" height="320"></canvas>
    </div>

    <!-- Word cloud -->
    <div class="col-span-12 lg:col-span-6 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Trending Phrases</h3>
        <span class="text-[10px] mono text-gray-500 uppercase">Word cloud</span>
      </div>
      <div id="word-cloud" class="min-h-[260px] flex flex-wrap items-center justify-center gap-x-3 gap-y-1"></div>
    </div>

    <!-- Sample quotes carousel -->
    <div class="col-span-12 lg:col-span-6 card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Verbatim quotes</h3>
        <span id="quote-counter" class="text-[10px] mono text-gray-500 uppercase">1 / 5</span>
      </div>
      <div id="quotes-carousel" class="min-h-[200px] flex items-center"></div>
      <div class="flex items-center justify-between mt-3">
        <button id="quote-prev" class="text-gray-400 hover:text-white text-sm"><i class="fa-solid fa-arrow-left"></i> Prev</button>
        <button id="quote-next" class="text-gray-400 hover:text-white text-sm">Next <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>

  </div>
</section>`;
}
__name(ca, "ca");
__name2(ca, "ca");
function da() {
  return `
<section data-pane="scenario" class="tab-pane hidden">
  <div class="card p-6 max-w-3xl mx-auto">
    <div class="flex items-start gap-4 mb-6">
      <div class="w-12 h-12 rounded-lg bg-action/15 border border-action/40 flex items-center justify-center shrink-0">
        <i class="fa-solid fa-flask text-action text-xl"></i>
      </div>
      <div>
        <h2 class="text-xl font-bold mb-1">"What if?" Scenario Simulator</h2>
        <p class="text-sm text-gray-400">Re-runs RAG over your existing briefings. <span class="text-action mono">Zero new Anakin credits.</span></p>
      </div>
    </div>
    <textarea id="scenario-input" rows="3" placeholder='Try: "What if EU AI Act enforcement is delayed 6 months?" or "What if Stripe drops ACH back to $0.70?"' class="w-full bg-ink-900 border border-ink-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-action"></textarea>
    <button id="scenario-run" class="mt-3 bg-action text-ink-950 font-semibold px-5 py-2.5 rounded-lg hover:shadow-glow-emerald transition flex items-center gap-2">
      <i class="fa-solid fa-play"></i> Run scenario
    </button>

    <div id="scenario-result" class="hidden mt-6 space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="card p-4 text-center">
          <div class="text-[10px] mono uppercase text-gray-500 mb-1">Threat Level</div>
          <div class="mono"><span id="s-before" class="text-gray-500 line-through">73</span> \u2192 <span id="s-after" class="text-action text-2xl font-bold">--</span></div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-[10px] mono uppercase text-gray-500 mb-1">New Threats</div>
          <div id="s-threats" class="mono text-2xl font-bold text-competitor">--</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-[10px] mono uppercase text-gray-500 mb-1">New Actions</div>
          <div id="s-actions" class="mono text-2xl font-bold text-policy">--</div>
        </div>
      </div>
      <div id="s-events" class="space-y-2"></div>
    </div>
  </div>
</section>`;
}
__name(da, "da");
__name2(da, "da");
function ua() {
  return `
<section data-pane="archetype" class="tab-pane hidden">
  <div class="card p-6">
    <h2 class="text-xl font-bold mb-1">Industry Archetype Comparison</h2>
    <p class="text-sm text-gray-400 mb-6">Your <span class="text-policy mono">B2B SaaS Fintech</span> profile vs the synthetic industry baseline.</p>
    <canvas id="chart-radar" height="320"></canvas>
    <div class="mt-6 grid md:grid-cols-3 gap-3">
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">You score higher on</div><div class="mt-1 text-sm">Compliance, Onboarding speed</div></div>
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">Industry beats you on</div><div class="mt-1 text-sm">Embedded Finance breadth</div></div>
      <div class="card p-3"><div class="text-[10px] mono uppercase text-gray-500">Coin-flip</div><div class="mt-1 text-sm">Sentiment, Pricing</div></div>
    </div>
  </div>
</section>`;
}
__name(ua, "ua");
__name2(ua, "ua");
function pa() {
  return `
<div id="cmdk" class="hidden fixed inset-0 z-50 cmdk-backdrop flex items-start justify-center pt-24 px-4">
  <div class="card w-full max-w-2xl overflow-hidden slide-up">
    <div class="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
      <i class="fa-solid fa-magnifying-glass text-policy"></i>
      <input id="cmdk-input" placeholder="Ask RealityPulse anything\u2026" class="flex-1 bg-transparent focus:outline-none text-base" />
      <kbd class="mono text-[10px] bg-ink-700 px-1.5 py-0.5 rounded border border-ink-600">esc</kbd>
    </div>
    <div id="cmdk-suggestions" class="px-4 py-3 text-xs text-gray-400">
      <div class="mb-2 mono uppercase tracking-widest">Try</div>
      <div class="space-y-1">
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Why did our churn spike last week?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">What's the impact of the EU AI Act on us?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Should I match Stripe's price hike?</button>
        <button class="cmdk-suggestion w-full text-left px-2 py-2 rounded hover:bg-ink-700">Summarize Adyen's product launch.</button>
      </div>
    </div>
    <div id="cmdk-output" class="hidden px-4 py-4 border-t border-ink-700 max-h-[440px] overflow-y-auto"></div>
  </div>
</div>`;
}
__name(pa, "pa");
__name2(pa, "pa");
function fa() {
  return `
<div id="transparency-backdrop" class="hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"></div>
<aside id="transparency-drawer" class="drawer fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-ink-900 border-l border-ink-700 overflow-y-auto">
  <div class="sticky top-0 bg-ink-900/95 backdrop-blur border-b border-ink-700 px-5 py-4 flex items-center justify-between">
    <div>
      <div class="text-xs mono uppercase text-policy">Anakin Transparency Drawer</div>
      <h2 class="text-lg font-bold mt-0.5">How we know this</h2>
    </div>
    <button id="transparency-close" class="text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div id="transparency-body" class="p-5 space-y-6 text-sm"></div>
</aside>`;
}
__name(fa, "fa");
__name2(fa, "fa");
function ha() {
  return `
<div id="audio-toast" class="hidden fixed bottom-6 right-6 z-40 card p-4 flex items-center gap-3 shadow-glow-cyan">
  <div class="w-9 h-9 rounded-full bg-policy/15 border border-policy/40 flex items-center justify-center">
    <i class="fa-solid fa-volume-high text-policy"></i>
  </div>
  <div>
    <div class="text-sm font-medium">Reading your brief\u2026</div>
    <div class="text-[10px] mono text-gray-500">browser SpeechSynthesis \xB7 0 credits</div>
  </div>
  <button id="audio-stop" class="ml-3 text-gray-400 hover:text-white"><i class="fa-solid fa-stop"></i></button>
</div>`;
}
__name(ha, "ha");
__name2(ha, "ha");
function it(e, t, s, i, a) {
  const r = s.startsWith("+") || s.startsWith("-") && /response/i.test(e);
  return `
  <div class="card p-4 card-hover slide-up">
    <div class="flex items-start justify-between mb-2">
      <span class="text-xs text-gray-500 uppercase tracking-wide">${e}</span>
      <i class="fa-solid ${a} ${i} text-xs"></i>
    </div>
    <div class="flex items-end justify-between">
      <div class="mono text-2xl font-bold">${t}</div>
      <div class="mono text-xs ${r ? "text-emerald-400" : "text-gray-500"}">${s}</div>
    </div>
    <canvas class="kpi-spark mt-2" height="22"></canvas>
  </div>`;
}
__name(it, "it");
__name2(it, "it");
var P = new Ns();
P.use(Hr);
P.use("/api/*", Fi());
P.get("/", (e) => e.html(ea()));
P.get("/onboarding", (e) => e.html(ta()));
P.get("/dashboard", (e) => e.html(si()));
P.get("/threat-index", (e) => e.html(si(true)));
P.get("/api/tenant/demo", (e) => e.json(ie));
P.get("/api/briefing/today", (e) => e.json(J));
P.get("/api/timeline", (e) => e.json(Fr));
P.get("/api/credit-ledger", (e) => e.json(Kr));
P.get("/api/charts/pricing-race", (e) => e.json(Ur));
P.get("/api/charts/sentiment-volume", (e) => e.json(qr));
P.get("/api/charts/topic-bubbles", (e) => e.json(Gr));
P.get("/api/charts/wordcloud", (e) => e.json(Vr));
P.get("/api/charts/feature-matrix", (e) => e.json(zr));
P.get("/api/charts/policy-regions", (e) => e.json(ti));
P.get("/api/charts/globe-dots", (e) => e.json(Wr));
P.get("/api/transparency", (e) => e.json({ daily_briefing: { endpoint: "POST https://api.anakin.io/v1/agentic-search", system_prompt: Yr, user_prompt: Jr({ industry: ie.industry, region: ie.region, competitor_domains: ie.competitor_domains, pillars_enabled: ie.pillars_enabled }), json_schema: Qr, anakin_job_id: "demo-job-0001", credits_spent: 15, poll_endpoint: "GET https://api.anakin.io/v1/agentic-search/demo-job-0001", poll_interval_ms: 1e4, cache_hours: 24 }, competitor_scraper: { endpoint: "POST https://api.anakin.io/v1/url-scraper", prompt: Zr("https://stripe.com/pricing"), credits_per_call: 1, cron: "hourly via pg_cron" }, ask_realitypulse: { endpoint: "POST https://api.anakin.io/v1/agentic-search", prompt_template: Xr("{user_question}", "{industry}"), credits_per_call: 3, rag_layer: "pgvector cosine over embeddings table (free, NVIDIA NV-Embed-v2)" }, raw_response_sample: J }));
P.post("/api/ask", async (e) => {
  var r, n, o, l;
  const { question: t } = await e.req.json(), s = (r = e.env) == null ? void 0 : r.NVIDIA_API_KEY, i = J.events.map((c, d) => `[${d + 1}] (${c.pillar}) ${c.title} \u2014 ${c.summary} \u2014 ${c.source_url}`).join(`
`), a = `You are RealityPulse, a Bloomberg-grade business
intelligence assistant. Answer using ONLY the EVIDENCE below. Cite sources
using bracket numbers [1] [2] that map to the evidence list. Tone: terse,
decisive, boardroom-ready. If evidence is insufficient, say so plainly.

EVIDENCE (today's briefing for ${ie.industry} in ${ie.region}):
${i}`;
  if (!s) {
    const c = ma(t);
    return e.json({ answer: c, citations: J.events.slice(0, 3).map((d, p) => ({ ref: `[${p + 1}]`, title: d.title, url: d.source_url, pillar: d.pillar })), model: "mock (NVIDIA_API_KEY not configured)", credits_used: 0 });
  }
  try {
    const d = await (await fetch("https://integrate.api.nvidia.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s}` }, body: JSON.stringify({ model: "meta/llama-3.2-3b-instruct", messages: [{ role: "system", content: a }, { role: "user", content: t }], temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: false }) })).json(), p = ((l = (o = (n = d == null ? void 0 : d.choices) == null ? void 0 : n[0]) == null ? void 0 : o.message) == null ? void 0 : l.content) ?? "No response.";
    return e.json({ answer: p, citations: J.events.slice(0, 3).map((f, h) => ({ ref: `[${h + 1}]`, title: f.title, url: f.source_url, pillar: f.pillar })), model: "meta/llama-3.2-3b-instruct", credits_used: 3 });
  } catch (c) {
    return e.json({ error: String(c), answer: "Error reaching NVIDIA API." }, 500);
  }
});
P.post("/api/scenario", async (e) => {
  const { scenario: t } = await e.req.json(), s = /ai act|gdpr|cfpb|regulation/i.test(t), i = /stripe|adyen|checkout|price|fee/i.test(t), a = J.threat_level, r = Math.min(100, a + (s ? 14 : 0) + (i ? 9 : 0));
  return e.json({ scenario: t, threat_level_before: a, threat_level_after: r, delta_threats: s ? 4 : 2, delta_actions: s ? 2 : 1, impacted_events: J.events.filter((n) => s ? n.pillar === "policy" : i ? n.pillar === "competitor" : true).slice(0, 4), credits_used: 0 });
});
P.post("/api/action/draft", async (e) => {
  const { action_id: t, kind: s } = await e.req.json(), i = J.actions[t];
  return i ? e.json({ kind: s, body: s === "email" ? i.email_draft : i.slack_message, generated_by: "meta/llama-3.2-3b-instruct (cached)", credits_used: 0 }) : e.json({ error: "Action not found" }, 404);
});
function ma(e) {
  const t = e.toLowerCase();
  return t.includes("eu ai act") || t.includes("regulation") ? "The EU AI Act Article 6 enforcement window opened today (00:00 CET). Your underwriting models likely fall under Annex III high-risk classification \u2014 conformity assessment and CE marking are now required. Penalties reach 7% of global turnover [1]. Recommended action: audit model inventory by end of week and loop legal in immediately. The CFPB also issued a related circular on BNPL pay-in-4 products [6] which may stack with this." : t.includes("stripe") || t.includes("competitor") || t.includes("price") ? "Stripe raised ACH transaction fees from $0.80 to $0.90 effective today \u2014 a 12.5% hike with no public announcement, detected via our hourly pricing-page diff [2]. For a typical $5M-volume customer this is ~$14k/year incremental cost. Meanwhile Adyen launched their Embedded Finance API targeting your exact SMB segment [3]. The window to counter-market is roughly 5 days while buyers are actively evaluating." : t.includes("churn") || t.includes("sentiment") ? 'Sentiment around fraud-detection in r/fintech dropped 18 points week-over-week, with "false positives" leading complaint volume [4]. Separately, G2 reviews mention "onboarding friction" up 31% MoM [7] \u2014 this is an opportunity, not a threat, given your instant-KYC capability. The churn signal aligns with the fraud-false-positive narrative more than with pricing.' : `Based on today's briefing for ${ie.industry}: threat level is ${J.threat_level}/100 with 4 high-impact events overnight. The standout signals are (a) EU AI Act enforcement going live [1], (b) Stripe's silent ACH fee increase [2], and (c) Adyen's Embedded Finance launch targeting your ICP [3]. Ask me anything more specific \u2014 pricing, regulation, sentiment, or competitor moves.`;
}
__name(ma, "ma");
__name2(ma, "ma");
var fs = new Ns();
var ga = Object.assign({ "/src/index.tsx": P });
var ii = false;
for (const [, e] of Object.entries(ga)) e && (fs.all("*", (t) => {
  let s;
  try {
    s = t.executionCtx;
  } catch {
  }
  return e.fetch(t.req.raw, t.env, s);
}), fs.notFound((t) => {
  let s;
  try {
    s = t.executionCtx;
  } catch {
  }
  return e.fetch(t.req.raw, t.env, s);
}), ii = true);
if (!ii) throw new Error("Can't import modules from ['/src/index.ts','/src/index.tsx','/app/server.ts']");
var drainBody = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } catch (e) {
    const error32 = reduceError(e);
    return Response.json(error32, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = fs;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env22, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env22, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env22, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env22, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env22, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env22, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env22, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env22, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env22, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env22, ctx) => {
      this.env = env22;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/pages-dev-util.ts
function isRoutingRuleMatch(pathname, routingRule) {
  if (!pathname) {
    throw new Error("Pathname is undefined.");
  }
  if (!routingRule) {
    throw new Error("Routing rule is undefined.");
  }
  const ruleRegExp = transformRoutingRuleToRegExp(routingRule);
  return pathname.match(ruleRegExp) !== null;
}
__name(isRoutingRuleMatch, "isRoutingRuleMatch");
function transformRoutingRuleToRegExp(rule) {
  let transformedRule;
  if (rule === "/" || rule === "/*") {
    transformedRule = rule;
  } else if (rule.endsWith("/*")) {
    transformedRule = `${rule.substring(0, rule.length - 2)}(/*)?`;
  } else if (rule.endsWith("/")) {
    transformedRule = `${rule.substring(0, rule.length - 1)}(/)?`;
  } else if (rule.endsWith("*")) {
    transformedRule = rule;
  } else {
    transformedRule = `${rule}(/)?`;
  }
  transformedRule = `^${transformedRule.replaceAll(/\./g, "\\.").replaceAll(/\*/g, ".*")}$`;
  return new RegExp(transformedRule);
}
__name(transformRoutingRuleToRegExp, "transformRoutingRuleToRegExp");

// .wrangler/tmp/pages-YLsuOS/kadpo3l3ibg.js
var define_ROUTES_default = { version: 1, include: ["/*"], exclude: ["/static/*"] };
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env3, context3) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env3.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = middleware_loader_entry_default;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env3, context3);
      }
    }
    return env3.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error4 = reduceError2(e);
    return Response.json(error4, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-oLmJ8G/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = pages_dev_pipeline_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env3, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-oLmJ8G/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=kadpo3l3ibg.js.map
