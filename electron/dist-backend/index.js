import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../backend/src/env.ts
var env;
var init_env = __esm({
  "../backend/src/env.ts"() {
    "use strict";
    env = {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://ipscscore:ipscscore_dev@localhost:5432/ipscscore",
      PORT: parseInt(process.env.PORT || "3001", 10),
      UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
      NODE_ENV: "production",
      BIND_ADDRESS: process.env.BIND_ADDRESS || "0.0.0.0",
      TLS_CERT_PATH: process.env.TLS_CERT_PATH || "",
      TLS_KEY_PATH: process.env.TLS_KEY_PATH || "",
      CORS_ORIGINS: process.env.CORS_ORIGINS || "*",
      PUBLIC_HIDE_EMAIL: process.env.PUBLIC_HIDE_EMAIL !== "false"
    };
  }
});

// ../node_modules/postgres/src/query.js
function cachedError(xs) {
  if (originCache.has(xs))
    return originCache.get(xs);
  const x = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  originCache.set(xs, new Error());
  Error.stackTraceLimit = x;
  return originCache.get(xs);
}
var originCache, originStackCache, originError, CLOSE, Query;
var init_query = __esm({
  "../node_modules/postgres/src/query.js"() {
    "use strict";
    originCache = /* @__PURE__ */ new Map();
    originStackCache = /* @__PURE__ */ new Map();
    originError = /* @__PURE__ */ Symbol("OriginError");
    CLOSE = {};
    Query = class extends Promise {
      constructor(strings, args, handler, canceller, options = {}) {
        let resolve, reject;
        super((a, b2) => {
          resolve = a;
          reject = b2;
        });
        this.tagged = Array.isArray(strings.raw);
        this.strings = strings;
        this.args = args;
        this.handler = handler;
        this.canceller = canceller;
        this.options = options;
        this.state = null;
        this.statement = null;
        this.resolve = (x) => (this.active = false, resolve(x));
        this.reject = (x) => (this.active = false, reject(x));
        this.active = false;
        this.cancelled = null;
        this.executed = false;
        this.signature = "";
        this[originError] = this.handler.debug ? new Error() : this.tagged && cachedError(this.strings);
      }
      get origin() {
        return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
      }
      static get [Symbol.species]() {
        return Promise;
      }
      cancel() {
        return this.canceller && (this.canceller(this), this.canceller = null);
      }
      simple() {
        this.options.simple = true;
        this.options.prepare = false;
        return this;
      }
      async readable() {
        this.simple();
        this.streaming = true;
        return this;
      }
      async writable() {
        this.simple();
        this.streaming = true;
        return this;
      }
      cursor(rows = 1, fn) {
        this.options.simple = false;
        if (typeof rows === "function") {
          fn = rows;
          rows = 1;
        }
        this.cursorRows = rows;
        if (typeof fn === "function")
          return this.cursorFn = fn, this;
        let prev;
        return {
          [Symbol.asyncIterator]: () => ({
            next: () => {
              if (this.executed && !this.active)
                return { done: true };
              prev && prev();
              const promise = new Promise((resolve, reject) => {
                this.cursorFn = (value) => {
                  resolve({ value, done: false });
                  return new Promise((r) => prev = r);
                };
                this.resolve = () => (this.active = false, resolve({ done: true }));
                this.reject = (x) => (this.active = false, reject(x));
              });
              this.execute();
              return promise;
            },
            return() {
              prev && prev(CLOSE);
              return { done: true };
            }
          })
        };
      }
      describe() {
        this.options.simple = false;
        this.onlyDescribe = this.options.prepare = true;
        return this;
      }
      stream() {
        throw new Error(".stream has been renamed to .forEach");
      }
      forEach(fn) {
        this.forEachFn = fn;
        this.handle();
        return this;
      }
      raw() {
        this.isRaw = true;
        return this;
      }
      values() {
        this.isRaw = "values";
        return this;
      }
      async handle() {
        !this.executed && (this.executed = true) && await 1 && this.handler(this);
      }
      execute() {
        this.handle();
        return this;
      }
      then() {
        this.handle();
        return super.then.apply(this, arguments);
      }
      catch() {
        this.handle();
        return super.catch.apply(this, arguments);
      }
      finally() {
        this.handle();
        return super.finally.apply(this, arguments);
      }
    };
  }
});

// ../node_modules/postgres/src/errors.js
function connection(x, options, socket) {
  const { host, port } = socket || options;
  const error = Object.assign(
    new Error("write " + x + " " + (options.path || host + ":" + port)),
    {
      code: x,
      errno: x,
      address: options.path || host
    },
    options.path ? {} : { port }
  );
  Error.captureStackTrace(error, connection);
  return error;
}
function postgres(x) {
  const error = new PostgresError(x);
  Error.captureStackTrace(error, postgres);
  return error;
}
function generic(code, message) {
  const error = Object.assign(new Error(code + ": " + message), { code });
  Error.captureStackTrace(error, generic);
  return error;
}
function notSupported(x) {
  const error = Object.assign(
    new Error(x + " (B) is not supported"),
    {
      code: "MESSAGE_NOT_SUPPORTED",
      name: x
    }
  );
  Error.captureStackTrace(error, notSupported);
  return error;
}
var PostgresError, Errors;
var init_errors = __esm({
  "../node_modules/postgres/src/errors.js"() {
    "use strict";
    PostgresError = class extends Error {
      constructor(x) {
        super(x.message);
        this.name = this.constructor.name;
        Object.assign(this, x);
      }
    };
    Errors = {
      connection,
      postgres,
      generic,
      notSupported
    };
  }
});

// ../node_modules/postgres/src/types.js
function handleValue(x, parameters, types2, options) {
  let value = x instanceof Parameter ? x.value : x;
  if (value === void 0) {
    x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
    if (value === void 0)
      throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
  }
  return "$" + types2.push(
    x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x))
  );
}
function stringify(q, string, value, parameters, types2, options) {
  for (let i = 1; i < q.strings.length; i++) {
    string += stringifyValue(string, value, parameters, types2, options) + q.strings[i];
    value = q.args[i];
  }
  return string;
}
function stringifyValue(string, value, parameters, types2, o) {
  return value instanceof Builder ? value.build(string, parameters, types2, o) : value instanceof Query ? fragment(value, parameters, types2, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types2, o), "") : handleValue(value, parameters, types2, o);
}
function fragment(q, parameters, types2, options) {
  q.fragment = true;
  return stringify(q, q.strings[0], q.args[0], parameters, types2, options);
}
function valuesBuilder(first, parameters, types2, columns, options) {
  return first.map(
    (row) => "(" + columns.map(
      (column) => stringifyValue("values", row[column], parameters, types2, options)
    ).join(",") + ")"
  ).join(",");
}
function values(first, rest, parameters, types2, options) {
  const multi = Array.isArray(first[0]);
  const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
  return valuesBuilder(multi ? first : [first], parameters, types2, columns, options);
}
function select(first, rest, parameters, types2, options) {
  typeof first === "string" && (first = [first].concat(rest));
  if (Array.isArray(first))
    return escapeIdentifiers(first, options);
  let value;
  const columns = rest.length ? rest.flat() : Object.keys(first);
  return columns.map((x) => {
    value = first[x];
    return (value instanceof Query ? fragment(value, parameters, types2, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types2, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
  }).join(",");
}
function notTagged() {
  throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
}
function firstIsString(x) {
  if (Array.isArray(x))
    return firstIsString(x[0]);
  return typeof x === "string" ? 1009 : 0;
}
function typeHandlers(types2) {
  return Object.keys(types2).reduce((acc, k) => {
    types2[k].from && [].concat(types2[k].from).forEach((x) => acc.parsers[x] = types2[k].parse);
    if (types2[k].serialize) {
      acc.serializers[types2[k].to] = types2[k].serialize;
      types2[k].from && [].concat(types2[k].from).forEach((x) => acc.serializers[x] = types2[k].serialize);
    }
    return acc;
  }, { parsers: {}, serializers: {} });
}
function escapeIdentifiers(xs, { transform: { column } }) {
  return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
}
function arrayEscape(x) {
  return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, '\\"');
}
function arrayParserLoop(s, x, parser, typarray) {
  const xs = [];
  const delimiter = typarray === 1020 ? ";" : ",";
  for (; s.i < x.length; s.i++) {
    s.char = x[s.i];
    if (s.quoted) {
      if (s.char === "\\") {
        s.str += x[++s.i];
      } else if (s.char === '"') {
        xs.push(parser ? parser(s.str) : s.str);
        s.str = "";
        s.quoted = x[s.i + 1] === '"';
        s.last = s.i + 2;
      } else {
        s.str += s.char;
      }
    } else if (s.char === '"') {
      s.quoted = true;
    } else if (s.char === "{") {
      s.last = ++s.i;
      xs.push(arrayParserLoop(s, x, parser, typarray));
    } else if (s.char === "}") {
      s.quoted = false;
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
      break;
    } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
      xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
    }
    s.p = s.char;
  }
  s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
  return xs;
}
function createJsonTransform(fn) {
  return function jsonTransform(x, column) {
    return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
  };
}
var types, NotTagged, Identifier, Parameter, Builder, defaultHandlers, builders, serializers, parsers, mergeUserTypes, escapeIdentifier, inferType, escapeBackslash, escapeQuote, arraySerializer, arrayParserState, arrayParser, toCamel, toPascal, toKebab, fromCamel, fromPascal, fromKebab, camel, pascal, kebab;
var init_types = __esm({
  "../node_modules/postgres/src/types.js"() {
    "use strict";
    init_query();
    init_errors();
    types = {
      string: {
        to: 25,
        from: null,
        // defaults to string
        serialize: (x) => "" + x
      },
      number: {
        to: 0,
        from: [21, 23, 26, 700, 701],
        serialize: (x) => "" + x,
        parse: (x) => +x
      },
      json: {
        to: 114,
        from: [114, 3802],
        serialize: (x) => JSON.stringify(x),
        parse: (x) => JSON.parse(x)
      },
      boolean: {
        to: 16,
        from: 16,
        serialize: (x) => x === true ? "t" : "f",
        parse: (x) => x === "t"
      },
      date: {
        to: 1184,
        from: [1082, 1114, 1184],
        serialize: (x) => (x instanceof Date ? x : new Date(x)).toISOString(),
        parse: (x) => new Date(x)
      },
      bytea: {
        to: 17,
        from: 17,
        serialize: (x) => "\\x" + Buffer.from(x).toString("hex"),
        parse: (x) => Buffer.from(x.slice(2), "hex")
      }
    };
    NotTagged = class {
      then() {
        notTagged();
      }
      catch() {
        notTagged();
      }
      finally() {
        notTagged();
      }
    };
    Identifier = class extends NotTagged {
      constructor(value) {
        super();
        this.value = escapeIdentifier(value);
      }
    };
    Parameter = class extends NotTagged {
      constructor(value, type, array) {
        super();
        this.value = value;
        this.type = type;
        this.array = array;
      }
    };
    Builder = class extends NotTagged {
      constructor(first, rest) {
        super();
        this.first = first;
        this.rest = rest;
      }
      build(before, parameters, types2, options) {
        const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b2) => a.i - b2.i).pop();
        return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types2, options);
      }
    };
    defaultHandlers = typeHandlers(types);
    builders = Object.entries({
      values,
      in: (...xs) => {
        const x = values(...xs);
        return x === "()" ? "(null)" : x;
      },
      select,
      as: select,
      returning: select,
      "\\(": select,
      update(first, rest, parameters, types2, options) {
        return (rest.length ? rest.flat() : Object.keys(first)).map(
          (x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types2, options)
        );
      },
      insert(first, rest, parameters, types2, options) {
        const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
        return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types2, columns, options);
      }
    }).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
    serializers = defaultHandlers.serializers;
    parsers = defaultHandlers.parsers;
    mergeUserTypes = function(types2) {
      const user = typeHandlers(types2 || {});
      return {
        serializers: Object.assign({}, serializers, user.serializers),
        parsers: Object.assign({}, parsers, user.parsers)
      };
    };
    escapeIdentifier = function escape(str) {
      return '"' + str.replace(/"/g, '""').replace(/\./g, '"."') + '"';
    };
    inferType = function inferType2(x) {
      return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
    };
    escapeBackslash = /\\/g;
    escapeQuote = /"/g;
    arraySerializer = function arraySerializer2(xs, serializer, options, typarray) {
      if (Array.isArray(xs) === false)
        return xs;
      if (!xs.length)
        return "{}";
      const first = xs[0];
      const delimiter = typarray === 1020 ? ";" : ",";
      if (Array.isArray(first) && !first.type)
        return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
      return "{" + xs.map((x) => {
        if (x === void 0) {
          x = options.transform.undefined;
          if (x === void 0)
            throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
        }
        return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
      }).join(delimiter) + "}";
    };
    arrayParserState = {
      i: 0,
      char: null,
      str: "",
      quoted: false,
      last: 0
    };
    arrayParser = function arrayParser2(x, parser, typarray) {
      arrayParserState.i = arrayParserState.last = 0;
      return arrayParserLoop(arrayParserState, x, parser, typarray);
    };
    toCamel = (x) => {
      let str = x[0];
      for (let i = 1; i < x.length; i++)
        str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
      return str;
    };
    toPascal = (x) => {
      let str = x[0].toUpperCase();
      for (let i = 1; i < x.length; i++)
        str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
      return str;
    };
    toKebab = (x) => x.replace(/_/g, "-");
    fromCamel = (x) => x.replace(/([A-Z])/g, "_$1").toLowerCase();
    fromPascal = (x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase();
    fromKebab = (x) => x.replace(/-/g, "_");
    toCamel.column = { from: toCamel };
    toCamel.value = { from: createJsonTransform(toCamel) };
    fromCamel.column = { to: fromCamel };
    camel = { ...toCamel };
    camel.column.to = fromCamel;
    toPascal.column = { from: toPascal };
    toPascal.value = { from: createJsonTransform(toPascal) };
    fromPascal.column = { to: fromPascal };
    pascal = { ...toPascal };
    pascal.column.to = fromPascal;
    toKebab.column = { from: toKebab };
    toKebab.value = { from: createJsonTransform(toKebab) };
    fromKebab.column = { to: fromKebab };
    kebab = { ...toKebab };
    kebab.column.to = fromKebab;
  }
});

// ../node_modules/postgres/src/result.js
var Result;
var init_result = __esm({
  "../node_modules/postgres/src/result.js"() {
    "use strict";
    Result = class extends Array {
      constructor() {
        super();
        Object.defineProperties(this, {
          count: { value: null, writable: true },
          state: { value: null, writable: true },
          command: { value: null, writable: true },
          columns: { value: null, writable: true },
          statement: { value: null, writable: true }
        });
      }
      static get [Symbol.species]() {
        return Array;
      }
    };
  }
});

// ../node_modules/postgres/src/queue.js
function Queue(initial = []) {
  let xs = initial.slice();
  let index = 0;
  return {
    get length() {
      return xs.length - index;
    },
    remove: (x) => {
      const index2 = xs.indexOf(x);
      return index2 === -1 ? null : (xs.splice(index2, 1), x);
    },
    push: (x) => (xs.push(x), x),
    shift: () => {
      const out = xs[index++];
      if (index === xs.length) {
        index = 0;
        xs = [];
      } else {
        xs[index - 1] = void 0;
      }
      return out;
    }
  };
}
var queue_default;
var init_queue = __esm({
  "../node_modules/postgres/src/queue.js"() {
    "use strict";
    queue_default = Queue;
  }
});

// ../node_modules/postgres/src/bytes.js
function fit(x) {
  if (buffer.length - b.i < x) {
    const prev = buffer, length = prev.length;
    buffer = Buffer.allocUnsafe(length + (length >> 1) + x);
    prev.copy(buffer);
  }
}
function reset() {
  b.i = 0;
  return b;
}
var size, buffer, messages, b, bytes_default;
var init_bytes = __esm({
  "../node_modules/postgres/src/bytes.js"() {
    "use strict";
    size = 256;
    buffer = Buffer.allocUnsafe(size);
    messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
      const v = x.charCodeAt(0);
      acc[x] = () => {
        buffer[0] = v;
        b.i = 5;
        return b;
      };
      return acc;
    }, {});
    b = Object.assign(reset, messages, {
      N: String.fromCharCode(0),
      i: 0,
      inc(x) {
        b.i += x;
        return b;
      },
      str(x) {
        const length = Buffer.byteLength(x);
        fit(length);
        b.i += buffer.write(x, b.i, length, "utf8");
        return b;
      },
      i16(x) {
        fit(2);
        buffer.writeUInt16BE(x, b.i);
        b.i += 2;
        return b;
      },
      i32(x, i) {
        if (i || i === 0) {
          buffer.writeUInt32BE(x, i);
          return b;
        }
        fit(4);
        buffer.writeUInt32BE(x, b.i);
        b.i += 4;
        return b;
      },
      z(x) {
        fit(x);
        buffer.fill(0, b.i, b.i + x);
        b.i += x;
        return b;
      },
      raw(x) {
        buffer = Buffer.concat([buffer.subarray(0, b.i), x]);
        b.i = buffer.length;
        return b;
      },
      end(at = 1) {
        buffer.writeUInt32BE(b.i - at, at);
        const out = buffer.subarray(0, b.i);
        b.i = 0;
        buffer = Buffer.allocUnsafe(size);
        return out;
      }
    });
    bytes_default = b;
  }
});

// ../node_modules/postgres/src/connection.js
import net from "net";
import tls from "tls";
import crypto3 from "crypto";
import Stream from "stream";
import { performance } from "perf_hooks";
function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
  const {
    sslnegotiation,
    ssl,
    max,
    user,
    host,
    port,
    database,
    parsers: parsers2,
    transform: transform2,
    onnotice,
    onnotify,
    onparameter,
    max_pipeline,
    keep_alive,
    backoff: backoff2,
    target_session_attrs
  } = options;
  const sent = queue_default(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
  let socket = null, cancelMessage, errorResponse = null, result = new Result(), incoming = Buffer.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedTime = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream2 = null, chunk = null, ended = null, nonce = null, query = null, final = null;
  const connection2 = {
    queue: queues.closed,
    idleTimer,
    connect(query2) {
      initial = query2;
      reconnect();
    },
    terminate,
    execute,
    cancel,
    end,
    count: 0,
    id
  };
  queues.closed && queues.closed.push(connection2);
  return connection2;
  async function createSocket() {
    let x;
    try {
      x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket();
    } catch (e) {
      error(e);
      return;
    }
    x.on("error", error);
    x.on("close", closed);
    x.on("drain", drain);
    return x;
  }
  async function cancel({ pid, secret }, resolve, reject) {
    try {
      cancelMessage = bytes_default().i32(16).i32(80877102).i32(pid).i32(secret).end(16);
      await connect();
      socket.once("error", reject);
      socket.once("close", resolve);
    } catch (error2) {
      reject(error2);
    }
  }
  function execute(q) {
    if (terminated)
      return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
    if (stream2)
      return queryError(q, Errors.generic("COPY_IN_PROGRESS", "You cannot execute queries during copy"));
    if (q.cancelled)
      return;
    try {
      q.state = backend;
      query ? sent.push(q) : (query = q, query.active = true);
      build(q);
      return write(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection2));
    } catch (error2) {
      sent.length === 0 && write(Sync);
      errored(error2);
      return true;
    }
  }
  function toBuffer(q) {
    if (q.parameters.length >= 65534)
      throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
    return q.options.simple ? bytes_default().Q().str(q.statement.string + bytes_default.N).end() : q.describeFirst ? Buffer.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer.concat([describe(q), prepared(q)]) : unnamed(q);
  }
  function describe(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
      Describe("S", q.statement.name)
    ]);
  }
  function prepared(q) {
    return Buffer.concat([
      Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
      q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
    ]);
  }
  function unnamed(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types),
      DescribeUnnamed,
      prepared(q)
    ]);
  }
  function build(q) {
    const parameters = [], types2 = [];
    const string = stringify(q, q.strings[0], q.args[0], parameters, types2, options);
    !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types2, options));
    q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
    q.string = string;
    q.signature = q.prepare && types2 + string;
    q.onlyDescribe && delete statements[q.signature];
    q.parameters = q.parameters || parameters;
    q.prepared = q.prepare && q.signature in statements;
    q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
    q.statement = q.prepared ? statements[q.signature] : { string, types: types2, name: q.prepare ? statementId + statementCount++ : "" };
    typeof options.debug === "function" && options.debug(id, string, parameters, types2);
  }
  function write(x, fn) {
    chunk = chunk ? Buffer.concat([chunk, x]) : Buffer.from(x);
    if (fn || chunk.length >= 1024)
      return nextWrite(fn);
    nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
    return true;
  }
  function nextWrite(fn) {
    const x = socket.write(chunk, fn);
    nextWriteTimer !== null && clearImmediate(nextWriteTimer);
    chunk = nextWriteTimer = null;
    return x;
  }
  function connectTimedOut() {
    errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
    socket.destroy();
  }
  async function secure() {
    if (sslnegotiation !== "direct") {
      write(SSLRequest);
      const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
      if (!canSSL && ssl === "prefer")
        return connected();
    }
    const options2 = {
      socket,
      servername: net.isIP(socket.host) ? void 0 : socket.host
    };
    if (sslnegotiation === "direct")
      options2.ALPNProtocols = ["postgresql"];
    if (ssl === "require" || ssl === "allow" || ssl === "prefer")
      options2.rejectUnauthorized = false;
    else if (typeof ssl === "object")
      Object.assign(options2, ssl);
    socket.removeAllListeners();
    socket = tls.connect(options2);
    socket.on("secureConnect", connected);
    socket.on("error", error);
    socket.on("close", closed);
    socket.on("drain", drain);
  }
  function drain() {
    !query && onopen(connection2);
  }
  function data(x) {
    if (incomings) {
      incomings.push(x);
      remaining -= x.length;
      if (remaining > 0)
        return;
    }
    incoming = incomings ? Buffer.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer.concat([incoming, x], incoming.length + x.length);
    while (incoming.length > 4) {
      length = incoming.readUInt32BE(1);
      if (length >= incoming.length) {
        remaining = length - incoming.length;
        incomings = [incoming];
        break;
      }
      try {
        handle(incoming.subarray(0, length + 1));
      } catch (e) {
        query && (query.cursorFn || query.describeFirst) && write(Sync);
        errored(e);
      }
      incoming = incoming.subarray(length + 1);
      remaining = 0;
      incomings = null;
    }
  }
  async function connect() {
    terminated = false;
    backendParameters = {};
    socket || (socket = await createSocket());
    if (!socket)
      return;
    connectTimer.start();
    if (options.socket)
      return ssl ? secure() : connected();
    socket.on("connect", ssl ? secure : connected);
    if (options.path)
      return socket.connect(options.path);
    socket.ssl = ssl;
    socket.connect(port[hostIndex], host[hostIndex]);
    socket.host = host[hostIndex];
    socket.port = port[hostIndex];
    hostIndex = (hostIndex + 1) % port.length;
  }
  function reconnect() {
    setTimeout(connect, closedTime ? Math.max(0, closedTime + delay - performance.now()) : 0);
  }
  function connected() {
    try {
      statements = {};
      needsTypes = options.fetch_types;
      statementId = Math.random().toString(36).slice(2);
      statementCount = 1;
      lifeTimer.start();
      socket.on("data", data);
      keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1e3 * keep_alive);
      const s = StartupMessage();
      write(s);
    } catch (err) {
      error(err);
    }
  }
  function error(err) {
    if (connection2.queue === queues.connecting && options.host[retries + 1])
      return;
    errored(err);
    while (sent.length)
      queryError(sent.shift(), err);
  }
  function errored(err) {
    stream2 && (stream2.destroy(err), stream2 = null);
    query && queryError(query, err);
    initial && (queryError(initial, err), initial = null);
  }
  function queryError(query2, err) {
    if (query2.reserve)
      return query2.reject(err);
    if (!err || typeof err !== "object")
      err = new Error(err);
    "query" in err || "parameters" in err || Object.defineProperties(err, {
      stack: { value: err.stack + query2.origin.replace(/.*\n/, "\n"), enumerable: options.debug },
      query: { value: query2.string, enumerable: options.debug },
      parameters: { value: query2.parameters, enumerable: options.debug },
      args: { value: query2.args, enumerable: options.debug },
      types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
    });
    query2.reject(err);
  }
  function end() {
    return ending || (!connection2.reserved && onend(connection2), !connection2.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
  }
  function terminate() {
    terminated = true;
    if (stream2 || query || initial || sent.length)
      error(Errors.connection("CONNECTION_DESTROYED", options));
    clearImmediate(nextWriteTimer);
    if (socket) {
      socket.removeListener("data", data);
      socket.removeListener("connect", connected);
      socket.readyState === "open" && socket.end(bytes_default().X().end());
    }
    ended && (ended(), ending = ended = null);
  }
  async function closed(hadError) {
    incoming = Buffer.alloc(0);
    remaining = 0;
    incomings = null;
    clearImmediate(nextWriteTimer);
    socket.removeListener("data", data);
    socket.removeListener("connect", connected);
    idleTimer.cancel();
    lifeTimer.cancel();
    connectTimer.cancel();
    socket.removeAllListeners();
    socket = null;
    if (initial)
      return reconnect();
    !hadError && (query || sent.length) && error(Errors.connection("CONNECTION_CLOSED", options, socket));
    closedTime = performance.now();
    hadError && options.shared.retries++;
    delay = (typeof backoff2 === "function" ? backoff2(options.shared.retries) : backoff2) * 1e3;
    onclose(connection2, Errors.connection("CONNECTION_CLOSED", options, socket));
  }
  function handle(xs, x = xs[0]) {
    (x === 68 ? DataRow : (
      // D
      x === 100 ? CopyData : (
        // d
        x === 65 ? NotificationResponse : (
          // A
          x === 83 ? ParameterStatus : (
            // S
            x === 90 ? ReadyForQuery : (
              // Z
              x === 67 ? CommandComplete : (
                // C
                x === 50 ? BindComplete : (
                  // 2
                  x === 49 ? ParseComplete : (
                    // 1
                    x === 116 ? ParameterDescription : (
                      // t
                      x === 84 ? RowDescription : (
                        // T
                        x === 82 ? Authentication : (
                          // R
                          x === 110 ? NoData : (
                            // n
                            x === 75 ? BackendKeyData : (
                              // K
                              x === 69 ? ErrorResponse : (
                                // E
                                x === 115 ? PortalSuspended : (
                                  // s
                                  x === 51 ? CloseComplete : (
                                    // 3
                                    x === 71 ? CopyInResponse : (
                                      // G
                                      x === 78 ? NoticeResponse : (
                                        // N
                                        x === 72 ? CopyOutResponse : (
                                          // H
                                          x === 99 ? CopyDone : (
                                            // c
                                            x === 73 ? EmptyQueryResponse : (
                                              // I
                                              x === 86 ? FunctionCallResponse : (
                                                // V
                                                x === 118 ? NegotiateProtocolVersion : (
                                                  // v
                                                  x === 87 ? CopyBothResponse : (
                                                    // W
                                                    /* c8 ignore next */
                                                    UnknownMessage
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ))(xs);
  }
  function DataRow(x) {
    let index = 7;
    let length2;
    let column;
    let value;
    const row = query.isRaw ? new Array(query.statement.columns.length) : {};
    for (let i = 0; i < query.statement.columns.length; i++) {
      column = query.statement.columns[i];
      length2 = x.readInt32BE(index);
      index += 4;
      value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === void 0 ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
      query.isRaw ? row[i] = query.isRaw === true ? value : transform2.value.from ? transform2.value.from(value, column) : value : row[column.name] = transform2.value.from ? transform2.value.from(value, column) : value;
    }
    query.forEachFn ? query.forEachFn(transform2.row.from ? transform2.row.from(row) : row, result) : result[rows++] = transform2.row.from ? transform2.row.from(row) : row;
  }
  function ParameterStatus(x) {
    const [k, v] = x.toString("utf8", 5, x.length - 1).split(bytes_default.N);
    backendParameters[k] = v;
    if (options.parameters[k] !== v) {
      options.parameters[k] = v;
      onparameter && onparameter(k, v);
    }
  }
  function ReadyForQuery(x) {
    if (query) {
      if (errorResponse) {
        query.retried ? errored(query.retried) : query.prepared && retryRoutines.has(errorResponse.routine) ? retry(query, errorResponse) : errored(errorResponse);
      } else {
        query.resolve(results || result);
      }
    } else if (errorResponse) {
      errored(errorResponse);
    }
    query = results = errorResponse = null;
    result = new Result();
    connectTimer.cancel();
    if (initial) {
      if (target_session_attrs) {
        if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
          return fetchState();
        else if (tryNext(target_session_attrs, backendParameters))
          return terminate();
      }
      if (needsTypes) {
        initial.reserve && (initial = null);
        return fetchArrayTypes();
      }
      initial && !initial.reserve && execute(initial);
      options.shared.retries = retries = 0;
      initial = null;
      return;
    }
    while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
      Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
    if (query)
      return;
    connection2.reserved ? !connection2.reserved.release && x[5] === 73 ? ending ? terminate() : (connection2.reserved = null, onopen(connection2)) : connection2.reserved() : ending ? terminate() : onopen(connection2);
  }
  function CommandComplete(x) {
    rows = 0;
    for (let i = x.length - 1; i > 0; i--) {
      if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
        result.count = +x.toString("utf8", i + 1, x.length - 1);
      if (x[i - 1] >= 65) {
        result.command = x.toString("utf8", 5, i);
        result.state = backend;
        break;
      }
    }
    final && (final(), final = null);
    if (result.command === "BEGIN" && max !== 1 && !connection2.reserved)
      return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
    if (query.options.simple)
      return BindComplete();
    if (query.cursorFn) {
      result.count && query.cursorFn(result);
      write(Sync);
    }
  }
  function ParseComplete() {
    query.parsing = false;
  }
  function BindComplete() {
    !result.statement && (result.statement = query.statement);
    result.columns = query.statement.columns;
  }
  function ParameterDescription(x) {
    const length2 = x.readUInt16BE(5);
    for (let i = 0; i < length2; ++i)
      !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
    query.prepare && (statements[query.signature] = query.statement);
    query.describeFirst && !query.onlyDescribe && (write(prepared(query)), query.describeFirst = false);
  }
  function RowDescription(x) {
    if (result.command) {
      results = results || [result];
      results.push(result = new Result());
      result.count = null;
      query.statement.columns = null;
    }
    const length2 = x.readUInt16BE(5);
    let index = 7;
    let start;
    query.statement.columns = Array(length2);
    for (let i = 0; i < length2; ++i) {
      start = index;
      while (x[index++] !== 0) ;
      const table = x.readUInt32BE(index);
      const number = x.readUInt16BE(index + 4);
      const type = x.readUInt32BE(index + 6);
      query.statement.columns[i] = {
        name: transform2.column.from ? transform2.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
        parser: parsers2[type],
        table,
        number,
        type
      };
      index += 18;
    }
    result.statement = query.statement;
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  async function Authentication(x, type = x.readUInt32BE(5)) {
    (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
  }
  async function AuthenticationCleartextPassword() {
    const payload = await Pass();
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function AuthenticationMD5Password(x) {
    const payload = "md5" + await md5(
      Buffer.concat([
        Buffer.from(await md5(await Pass() + user)),
        x.subarray(9)
      ])
    );
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function SASL() {
    nonce = (await crypto3.randomBytes(18)).toString("base64");
    bytes_default().p().str("SCRAM-SHA-256" + bytes_default.N);
    const i = bytes_default.i;
    write(bytes_default.inc(4).str("n,,n=*,r=" + nonce).i32(bytes_default.i - i - 4, i).end());
  }
  async function SASLContinue(x) {
    const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
    const saltedPassword = await crypto3.pbkdf2Sync(
      await Pass(),
      Buffer.from(res.s, "base64"),
      parseInt(res.i),
      32,
      "sha256"
    );
    const clientKey = await hmac(saltedPassword, "Client Key");
    const auth = "n=*,r=" + nonce + ",r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
    serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth)).toString("base64");
    const payload = "c=biws,r=" + res.r + ",p=" + xor(
      clientKey,
      Buffer.from(await hmac(await sha256(clientKey), auth))
    ).toString("base64");
    write(
      bytes_default().p().str(payload).end()
    );
  }
  function SASLFinal(x) {
    if (x.toString("utf8", 9).split(bytes_default.N, 1)[0].slice(2) === serverSignature)
      return;
    errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
    socket.destroy();
  }
  function Pass() {
    return Promise.resolve(
      typeof options.pass === "function" ? options.pass() : options.pass
    );
  }
  function NoData() {
    result.statement = query.statement;
    result.statement.columns = [];
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  function BackendKeyData(x) {
    backend.pid = x.readUInt32BE(5);
    backend.secret = x.readUInt32BE(9);
  }
  async function fetchArrayTypes() {
    needsTypes = false;
    const types2 = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute);
    types2.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
  }
  function addArrayType(oid, typarray) {
    if (!!options.parsers[typarray] && !!options.serializers[typarray]) return;
    const parser = options.parsers[oid];
    options.shared.typeArrayMap[oid] = typarray;
    options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
    options.parsers[typarray].array = true;
    options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
  }
  function tryNext(x, xs) {
    return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
  }
  function fetchState() {
    const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute, null, { simple: true });
    query2.resolve = ([[a], [b2]]) => {
      backendParameters.default_transaction_read_only = a.transaction_read_only;
      backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
    };
    query2.execute();
  }
  function ErrorResponse(x) {
    if (query) {
      (query.cursorFn || query.describeFirst) && write(Sync);
      errorResponse = Errors.postgres(parseError(x));
    } else {
      errored(Errors.postgres(parseError(x)));
    }
  }
  function retry(q, error2) {
    delete statements[q.signature];
    q.retried = error2;
    execute(q);
  }
  function NotificationResponse(x) {
    if (!onnotify)
      return;
    let index = 9;
    while (x[index++] !== 0) ;
    onnotify(
      x.toString("utf8", 9, index - 1),
      x.toString("utf8", index, x.length - 1)
    );
  }
  async function PortalSuspended() {
    try {
      const x = await Promise.resolve(query.cursorFn(result));
      rows = 0;
      x === CLOSE ? write(Close(query.portal)) : (result = new Result(), write(Execute("", query.cursorRows)));
    } catch (err) {
      write(Sync);
      query.reject(err);
    }
  }
  function CloseComplete() {
    result.count && query.cursorFn(result);
    query.resolve(result);
  }
  function CopyInResponse() {
    stream2 = new Stream.Writable({
      autoDestroy: true,
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream2 = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
        stream2 = null;
      }
    });
    query.resolve(stream2);
  }
  function CopyOutResponse() {
    stream2 = new Stream.Readable({
      read() {
        socket.resume();
      }
    });
    query.resolve(stream2);
  }
  function CopyBothResponse() {
    stream2 = new Stream.Duplex({
      autoDestroy: true,
      read() {
        socket.resume();
      },
      /* c8 ignore next 11 */
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream2 = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream2);
  }
  function CopyData(x) {
    stream2 && (stream2.push(x.subarray(5)) || socket.pause());
  }
  function CopyDone() {
    stream2 && stream2.push(null);
    stream2 = null;
  }
  function NoticeResponse(x) {
    onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
  }
  function EmptyQueryResponse() {
  }
  function FunctionCallResponse() {
    errored(Errors.notSupported("FunctionCallResponse"));
  }
  function NegotiateProtocolVersion() {
    errored(Errors.notSupported("NegotiateProtocolVersion"));
  }
  function UnknownMessage(x) {
    console.error("Postgres.js : Unknown Message:", x[0]);
  }
  function UnknownAuth(x, type) {
    console.error("Postgres.js : Unknown Auth:", type);
  }
  function Bind(parameters, types2, statement = "", portal = "") {
    let prev, type;
    bytes_default().B().str(portal + bytes_default.N).str(statement + bytes_default.N).i16(0).i16(parameters.length);
    parameters.forEach((x, i) => {
      if (x === null)
        return bytes_default.i32(4294967295);
      type = types2[i];
      parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
      prev = bytes_default.i;
      bytes_default.inc(4).str(x).i32(bytes_default.i - prev - 4, prev);
    });
    bytes_default.i16(0);
    return bytes_default.end();
  }
  function Parse(str, parameters, types2, name = "") {
    bytes_default().P().str(name + bytes_default.N).str(str + bytes_default.N).i16(parameters.length);
    parameters.forEach((x, i) => bytes_default.i32(types2[i] || 0));
    return bytes_default.end();
  }
  function Describe(x, name = "") {
    return bytes_default().D().str(x).str(name + bytes_default.N).end();
  }
  function Execute(portal = "", rows2 = 0) {
    return Buffer.concat([
      bytes_default().E().str(portal + bytes_default.N).i32(rows2).end(),
      Flush
    ]);
  }
  function Close(portal = "") {
    return Buffer.concat([
      bytes_default().C().str("P").str(portal + bytes_default.N).end(),
      bytes_default().S().end()
    ]);
  }
  function StartupMessage() {
    return cancelMessage || bytes_default().inc(4).i16(3).z(2).str(
      Object.entries(Object.assign(
        {
          user,
          database,
          client_encoding: "UTF8"
        },
        options.connection
      )).filter(([, v]) => v).map(([k, v]) => k + bytes_default.N + v).join(bytes_default.N)
    ).z(2).end(0);
  }
}
function parseError(x) {
  const error = {};
  let start = 5;
  for (let i = 5; i < x.length - 1; i++) {
    if (x[i] === 0) {
      error[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
      start = i + 1;
    }
  }
  return error;
}
function md5(x) {
  return crypto3.createHash("md5").update(x).digest("hex");
}
function hmac(key, x) {
  return crypto3.createHmac("sha256", key).update(x).digest();
}
function sha256(x) {
  return crypto3.createHash("sha256").update(x).digest();
}
function xor(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++)
    buffer2[i] = a[i] ^ b2[i];
  return buffer2;
}
function timer(fn, seconds) {
  seconds = typeof seconds === "function" ? seconds() : seconds;
  if (!seconds)
    return { cancel: noop, start: noop };
  let timer2;
  return {
    cancel() {
      timer2 && (clearTimeout(timer2), timer2 = null);
    },
    start() {
      timer2 && clearTimeout(timer2);
      timer2 = setTimeout(done, seconds * 1e3, arguments);
    }
  };
  function done(args) {
    fn.apply(null, args);
    timer2 = null;
  }
}
var connection_default, uid, Sync, Flush, SSLRequest, ExecuteUnnamed, DescribeUnnamed, noop, retryRoutines, errorFields;
var init_connection = __esm({
  "../node_modules/postgres/src/connection.js"() {
    "use strict";
    init_types();
    init_errors();
    init_result();
    init_queue();
    init_query();
    init_bytes();
    connection_default = Connection;
    uid = 1;
    Sync = bytes_default().S().end();
    Flush = bytes_default().H().end();
    SSLRequest = bytes_default().i32(8).i32(80877103).end(8);
    ExecuteUnnamed = Buffer.concat([bytes_default().E().str(bytes_default.N).i32(0).end(), Sync]);
    DescribeUnnamed = bytes_default().D().str("S").str(bytes_default.N).end();
    noop = () => {
    };
    retryRoutines = /* @__PURE__ */ new Set([
      "FetchPreparedStatement",
      "RevalidateCachedQuery",
      "transformAssignedExpr"
    ]);
    errorFields = {
      83: "severity_local",
      // S
      86: "severity",
      // V
      67: "code",
      // C
      77: "message",
      // M
      68: "detail",
      // D
      72: "hint",
      // H
      80: "position",
      // P
      112: "internal_position",
      // p
      113: "internal_query",
      // q
      87: "where",
      // W
      115: "schema_name",
      // s
      116: "table_name",
      // t
      99: "column_name",
      // c
      100: "data type_name",
      // d
      110: "constraint_name",
      // n
      70: "file",
      // F
      76: "line",
      // L
      82: "routine"
      // R
    };
  }
});

// ../node_modules/postgres/src/subscribe.js
function Subscribe(postgres2, options) {
  const subscribers = /* @__PURE__ */ new Map(), slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
  let connection2, stream2, ended = false;
  const sql2 = subscribe.sql = postgres2({
    ...options,
    transform: { column: {}, value: {}, row: {} },
    max: 1,
    fetch_types: false,
    idle_timeout: null,
    max_lifetime: null,
    connection: {
      ...options.connection,
      replication: "database"
    },
    onclose: async function() {
      if (ended)
        return;
      stream2 = null;
      state.pid = state.secret = void 0;
      connected(await init(sql2, slot, options.publications));
      subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
    },
    no_subscribe: true
  });
  const end = sql2.end, close = sql2.close;
  sql2.end = async () => {
    ended = true;
    stream2 && await new Promise((r) => (stream2.once("close", r), stream2.end()));
    return end();
  };
  sql2.close = async () => {
    stream2 && await new Promise((r) => (stream2.once("close", r), stream2.end()));
    return close();
  };
  return subscribe;
  async function subscribe(event, fn, onsubscribe = noop2, onerror = noop2) {
    event = parseEvent(event);
    if (!connection2)
      connection2 = init(sql2, slot, options.publications);
    const subscriber = { fn, onsubscribe };
    const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, /* @__PURE__ */ new Set([subscriber])).get(event);
    const unsubscribe = () => {
      fns.delete(subscriber);
      fns.size === 0 && subscribers.delete(event);
    };
    return connection2.then((x) => {
      connected(x);
      onsubscribe();
      stream2 && stream2.on("error", onerror);
      return { unsubscribe, state, sql: sql2 };
    });
  }
  function connected(x) {
    stream2 = x.stream;
    state.pid = x.state.pid;
    state.secret = x.state.secret;
  }
  async function init(sql3, slot2, publications) {
    if (!publications)
      throw new Error("Missing publication names");
    const xs = await sql3.unsafe(
      `CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`
    );
    const [x] = xs;
    const stream3 = await sql3.unsafe(
      `START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`
    ).writable();
    const state2 = {
      lsn: Buffer.concat(x.consistent_point.split("/").map((x2) => Buffer.from(("00000000" + x2).slice(-8), "hex")))
    };
    stream3.on("data", data);
    stream3.on("error", error);
    stream3.on("close", sql3.close);
    return { stream: stream3, state: xs.state };
    function error(e) {
      console.error("Unexpected error during logical streaming - reconnecting", e);
    }
    function data(x2) {
      if (x2[0] === 119) {
        parse(x2.subarray(25), state2, sql3.options.parsers, handle, options.transform);
      } else if (x2[0] === 107 && x2[17]) {
        state2.lsn = x2.subarray(1, 9);
        pong();
      }
    }
    function handle(a, b2) {
      const path4 = b2.relation.schema + "." + b2.relation.table;
      call("*", a, b2);
      call("*:" + path4, a, b2);
      b2.relation.keys.length && call("*:" + path4 + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
      call(b2.command, a, b2);
      call(b2.command + ":" + path4, a, b2);
      b2.relation.keys.length && call(b2.command + ":" + path4 + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
    }
    function pong() {
      const x2 = Buffer.alloc(34);
      x2[0] = "r".charCodeAt(0);
      x2.fill(state2.lsn, 1);
      x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2e3, 0, 1)) * BigInt(1e3), 25);
      stream3.write(x2);
    }
  }
  function call(x, a, b2) {
    subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b2, x));
  }
}
function Time(x) {
  return new Date(Date.UTC(2e3, 0, 1) + Number(x / BigInt(1e3)));
}
function parse(x, state, parsers2, handle, transform2) {
  const char = (acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc);
  Object.entries({
    R: (x2) => {
      let i = 1;
      const r = state[x2.readUInt32BE(i)] = {
        schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
        table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
        columns: Array(x2.readUInt16BE(i += 2)),
        keys: []
      };
      i += 2;
      let columnIndex = 0, column;
      while (i < x2.length) {
        column = r.columns[columnIndex++] = {
          key: x2[i++],
          name: transform2.column.from ? transform2.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
          type: x2.readUInt32BE(i += 1),
          parser: parsers2[x2.readUInt32BE(i)],
          atttypmod: x2.readUInt32BE(i += 4)
        };
        column.key && r.keys.push(column);
        i += 4;
      }
    },
    Y: () => {
    },
    // Type
    O: () => {
    },
    // Origin
    B: (x2) => {
      state.date = Time(x2.readBigInt64BE(9));
      state.lsn = x2.subarray(1, 9);
    },
    I: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      const { row } = tuples(x2, relation.columns, i += 7, transform2);
      handle(row, {
        command: "insert",
        relation
      });
    },
    D: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      handle(
        key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform2).row : null,
        {
          command: "delete",
          relation,
          key
        }
      );
    },
    U: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform2) : null;
      xs && (i = xs.i);
      const { row } = tuples(x2, relation.columns, i + 3, transform2);
      handle(row, {
        command: "update",
        relation,
        key,
        old: xs && xs.row
      });
    },
    T: () => {
    },
    // Truncate,
    C: () => {
    }
    // Commit
  }).reduce(char, {})[x[0]](x);
}
function tuples(x, columns, xi, transform2) {
  let type, column, value;
  const row = transform2.raw ? new Array(columns.length) : {};
  for (let i = 0; i < columns.length; i++) {
    type = x[xi++];
    column = columns[i];
    value = type === 110 ? null : type === 117 ? void 0 : column.parser === void 0 ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
    transform2.raw ? row[i] = transform2.raw === true ? value : transform2.value.from ? transform2.value.from(value, column) : value : row[column.name] = transform2.value.from ? transform2.value.from(value, column) : value;
  }
  return { i: xi, row: transform2.row.from ? transform2.row.from(row) : row };
}
function parseEvent(x) {
  const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
  if (!xs)
    throw new Error("Malformed subscribe pattern: " + x);
  const [, command, path4, key] = xs;
  return (command || "*") + (path4 ? ":" + (path4.indexOf(".") === -1 ? "public." + path4 : path4) : "") + (key ? "=" + key : "");
}
var noop2;
var init_subscribe = __esm({
  "../node_modules/postgres/src/subscribe.js"() {
    "use strict";
    noop2 = () => {
    };
  }
});

// ../node_modules/postgres/src/large.js
import Stream2 from "stream";
function largeObject(sql2, oid, mode = 131072 | 262144) {
  return new Promise(async (resolve, reject) => {
    await sql2.begin(async (sql3) => {
      let finish;
      !oid && ([{ oid }] = await sql3`select lo_creat(-1) as oid`);
      const [{ fd }] = await sql3`select lo_open(${oid}, ${mode}) as fd`;
      const lo = {
        writable,
        readable,
        close: () => sql3`select lo_close(${fd})`.then(finish),
        tell: () => sql3`select lo_tell64(${fd})`,
        read: (x) => sql3`select loread(${fd}, ${x}) as data`,
        write: (x) => sql3`select lowrite(${fd}, ${x})`,
        truncate: (x) => sql3`select lo_truncate64(${fd}, ${x})`,
        seek: (x, whence = 0) => sql3`select lo_lseek64(${fd}, ${x}, ${whence})`,
        size: () => sql3`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `
      };
      resolve(lo);
      return new Promise(async (r) => finish = r);
      async function readable({
        highWaterMark = 2048 * 8,
        start = 0,
        end = Infinity
      } = {}) {
        let max = end - start;
        start && await lo.seek(start);
        return new Stream2.Readable({
          highWaterMark,
          async read(size2) {
            const l = size2 > max ? size2 - max : size2;
            max -= size2;
            const [{ data }] = await lo.read(l);
            this.push(data);
            if (data.length < size2)
              this.push(null);
          }
        });
      }
      async function writable({
        highWaterMark = 2048 * 8,
        start = 0
      } = {}) {
        start && await lo.seek(start);
        return new Stream2.Writable({
          highWaterMark,
          write(chunk, encoding, callback) {
            lo.write(chunk).then(() => callback(), callback);
          }
        });
      }
    }).catch(reject);
  });
}
var init_large = __esm({
  "../node_modules/postgres/src/large.js"() {
    "use strict";
  }
});

// ../node_modules/postgres/src/index.js
import os from "os";
import fs from "fs";
function Postgres(a, b2) {
  const options = parseOptions(a, b2), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
  let ending = false;
  const queries = queue_default(), connecting = queue_default(), reserved = queue_default(), closed = queue_default(), ended = queue_default(), open = queue_default(), busy = queue_default(), full = queue_default(), queues = { connecting, reserved, closed, ended, open, busy, full };
  const connections = [...Array(options.max)].map(() => connection_default(options, queues, { onopen, onend, onclose }));
  const sql2 = Sql(handler);
  Object.assign(sql2, {
    get parameters() {
      return options.parameters;
    },
    largeObject: largeObject.bind(null, sql2),
    subscribe,
    CLOSE,
    END: CLOSE,
    PostgresError,
    options,
    reserve,
    listen,
    begin,
    close,
    end
  });
  return sql2;
  function Sql(handler2) {
    handler2.debug = options.debug;
    Object.entries(options.types).reduce((acc, [name, type]) => {
      acc[name] = (x) => new Parameter(x, type.to);
      return acc;
    }, typed);
    Object.assign(sql3, {
      types: typed,
      typed,
      unsafe,
      notify,
      array,
      json,
      file
    });
    return sql3;
    function typed(value, type) {
      return new Parameter(value, type);
    }
    function sql3(strings, ...args) {
      const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler2, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
      return query;
    }
    function unsafe(string, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([string], args, handler2, cancel, {
        prepare: false,
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    function file(path4, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([], args, (query2) => {
        fs.readFile(path4, "utf8", (err, string) => {
          if (err)
            return query2.reject(err);
          query2.strings = [string];
          handler2(query2);
        });
      }, cancel, {
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
  }
  async function listen(name, fn, onlisten) {
    const listener = { fn, onlisten };
    const sql3 = listen.sql || (listen.sql = Postgres({
      ...options,
      max: 1,
      idle_timeout: null,
      max_lifetime: null,
      fetch_types: false,
      onclose() {
        Object.entries(listen.channels).forEach(([name2, { listeners }]) => {
          delete listen.channels[name2];
          Promise.all(listeners.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
          })));
        });
      },
      onnotify(c, x) {
        c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
      }
    }));
    const channels = listen.channels || (listen.channels = {}), exists = name in channels;
    if (exists) {
      channels[name].listeners.push(listener);
      const result2 = await channels[name].result;
      listener.onlisten && listener.onlisten();
      return { state: result2.state, unlisten };
    }
    channels[name] = { result: sql3`listen ${sql3.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
    const result = await channels[name].result;
    listener.onlisten && listener.onlisten();
    return { state: result.state, unlisten };
    async function unlisten() {
      if (name in channels === false)
        return;
      channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
      if (channels[name].listeners.length)
        return;
      delete channels[name];
      return sql3`unlisten ${sql3.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
    }
  }
  async function notify(channel, payload) {
    return await sql2`select pg_notify(${channel}, ${"" + payload})`;
  }
  async function reserve() {
    const queue = queue_default();
    const c = open.length ? open.shift() : await new Promise((resolve, reject) => {
      const query = { reserve: resolve, reject };
      queries.push(query);
      closed.length && connect(closed.shift(), query);
    });
    move(c, reserved);
    c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
    c.reserved.release = true;
    const sql3 = Sql(handler2);
    sql3.release = () => {
      c.reserved = null;
      onopen(c);
    };
    return sql3;
    function handler2(q) {
      c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
    }
  }
  async function begin(options2, fn) {
    !fn && (fn = options2, options2 = "");
    const queries2 = queue_default();
    let savepoints = 0, connection2, prepare = null;
    try {
      await sql2.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
      return await Promise.race([
        scope(connection2, fn),
        new Promise((_, reject) => connection2.onclose = reject)
      ]);
    } catch (error) {
      throw error;
    }
    async function scope(c, fn2, name) {
      const sql3 = Sql(handler2);
      sql3.savepoint = savepoint;
      sql3.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
      let uncaughtError, result;
      name && await sql3`savepoint ${sql3(name)}`;
      try {
        result = await new Promise((resolve, reject) => {
          const x = fn2(sql3);
          Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
        });
        if (uncaughtError)
          throw uncaughtError;
      } catch (e) {
        await (name ? sql3`rollback to ${sql3(name)}` : sql3`rollback`);
        throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
      }
      if (!name) {
        prepare ? await sql3`prepare transaction '${sql3.unsafe(prepare)}'` : await sql3`commit`;
      }
      return result;
      function savepoint(name2, fn3) {
        if (name2 && Array.isArray(name2.raw))
          return savepoint((sql4) => sql4.apply(sql4, arguments));
        arguments.length === 1 && (fn3 = name2, name2 = null);
        return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
      }
      function handler2(q) {
        q.catch((e) => uncaughtError || (uncaughtError = e));
        c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
      }
    }
    function onexecute(c) {
      connection2 = c;
      move(c, reserved);
      c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
    }
  }
  function move(c, queue) {
    c.queue.remove(c);
    queue.push(c);
    c.queue = queue;
    queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
    return c;
  }
  function json(x) {
    return new Parameter(x, 3802);
  }
  function array(x, type) {
    if (!Array.isArray(x))
      return array(Array.from(arguments));
    return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
  }
  function handler(query) {
    if (ending)
      return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
    if (open.length)
      return go(open.shift(), query);
    if (closed.length)
      return connect(closed.shift(), query);
    busy.length ? go(busy.shift(), query) : queries.push(query);
  }
  function go(c, query) {
    return c.execute(query) ? move(c, busy) : move(c, full);
  }
  function cancel(query) {
    return new Promise((resolve, reject) => {
      query.state ? query.active ? connection_default(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
    });
  }
  async function end({ timeout = null } = {}) {
    if (ending)
      return ending;
    await 1;
    let timer2;
    return ending = Promise.race([
      new Promise((r) => timeout !== null && (timer2 = setTimeout(destroy, timeout * 1e3, r))),
      Promise.all(connections.map((c) => c.end()).concat(
        listen.sql ? listen.sql.end({ timeout: 0 }) : [],
        subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []
      ))
    ]).then(() => clearTimeout(timer2));
  }
  async function close() {
    await Promise.all(connections.map((c) => c.end()));
  }
  async function destroy(resolve) {
    await Promise.all(connections.map((c) => c.terminate()));
    while (queries.length)
      queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
    resolve();
  }
  function connect(c, query) {
    move(c, connecting);
    c.connect(query);
    return c;
  }
  function onend(c) {
    move(c, ended);
  }
  function onopen(c) {
    if (queries.length === 0)
      return move(c, open);
    let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
    while (ready && queries.length && max-- > 0) {
      const query = queries.shift();
      if (query.reserve)
        return query.reserve(c);
      ready = c.execute(query);
    }
    ready ? move(c, busy) : move(c, full);
  }
  function onclose(c, e) {
    move(c, closed);
    c.reserved = null;
    c.onclose && (c.onclose(e), c.onclose = null);
    options.onclose && options.onclose(c.id);
    queries.length && connect(c, queries.shift());
  }
}
function parseOptions(a, b2) {
  if (a && a.shared)
    return a;
  const env2 = process.env, o = (!a || typeof a === "string" ? b2 : a) || {}, { url, multihost } = parseUrl(a), query = [...url.searchParams].reduce((a2, [b3, c]) => (a2[b3] = c, a2), {}), host = o.hostname || o.host || multihost || url.hostname || env2.PGHOST || "localhost", port = o.port || url.port || env2.PGPORT || 5432, user = o.user || o.username || url.username || env2.PGUSERNAME || env2.PGUSER || osUsername();
  o.no_prepare && (o.prepare = false);
  query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
  "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
  query.sslrootcert === "system" && (query.ssl = "verify-full");
  const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
  const defaults = {
    max: globalThis.Cloudflare ? 3 : 10,
    ssl: false,
    sslnegotiation: null,
    idle_timeout: null,
    connect_timeout: 30,
    max_lifetime,
    max_pipeline: 100,
    backoff,
    keep_alive: 60,
    prepare: true,
    debug: false,
    fetch_types: true,
    publications: "alltables",
    target_session_attrs: null
  };
  return {
    host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
    port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
    path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
    database: o.database || o.db || (url.pathname || "").slice(1) || env2.PGDATABASE || user,
    user,
    pass: o.pass || o.password || url.password || env2.PGPASSWORD || "",
    ...Object.entries(defaults).reduce(
      (acc, [k, d]) => {
        const value = k in o ? o[k] : k in query ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env2["PG" + k.toUpperCase()] || d;
        acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
        return acc;
      },
      {}
    ),
    connection: {
      application_name: env2.PGAPPNAME || "postgres.js",
      ...o.connection,
      ...Object.entries(query).reduce((acc, [k, v]) => (k in defaults || (acc[k] = v), acc), {})
    },
    types: o.types || {},
    target_session_attrs: tsa(o, url, env2),
    onnotice: o.onnotice,
    onnotify: o.onnotify,
    onclose: o.onclose,
    onparameter: o.onparameter,
    socket: o.socket,
    transform: parseTransform(o.transform || { undefined: void 0 }),
    parameters: {},
    shared: { retries: 0, typeArrayMap: {} },
    ...mergeUserTypes(o.types)
  };
}
function tsa(o, url, env2) {
  const x = o.target_session_attrs || url.searchParams.get("target_session_attrs") || env2.PGTARGETSESSIONATTRS;
  if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
    return x;
  throw new Error("target_session_attrs " + x + " is not supported");
}
function backoff(retries) {
  return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
}
function max_lifetime() {
  return 60 * (30 + Math.random() * 30);
}
function parseTransform(x) {
  return {
    undefined: x.undefined,
    column: {
      from: typeof x.column === "function" ? x.column : x.column && x.column.from,
      to: x.column && x.column.to
    },
    value: {
      from: typeof x.value === "function" ? x.value : x.value && x.value.from,
      to: x.value && x.value.to
    },
    row: {
      from: typeof x.row === "function" ? x.row : x.row && x.row.from,
      to: x.row && x.row.to
    }
  };
}
function parseUrl(url) {
  if (!url || typeof url !== "string")
    return { url: { searchParams: /* @__PURE__ */ new Map() } };
  let host = url;
  host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
  host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
  const urlObj = new URL(url.replace(host, host.split(",")[0]));
  return {
    url: {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    },
    multihost: host.indexOf(",") > -1 && host
  };
}
function osUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process.env.USERNAME || process.env.USER || process.env.LOGNAME;
  }
}
var src_default;
var init_src = __esm({
  "../node_modules/postgres/src/index.js"() {
    "use strict";
    init_types();
    init_connection();
    init_query();
    init_queue();
    init_errors();
    init_subscribe();
    init_large();
    Object.assign(Postgres, {
      PostgresError,
      toPascal,
      pascal,
      toCamel,
      camel,
      toKebab,
      kebab,
      fromPascal,
      fromCamel,
      fromKebab,
      BigInt: {
        to: 20,
        from: [20],
        parse: (x) => BigInt(x),
        // eslint-disable-line
        serialize: (x) => x.toString()
      }
    });
    src_default = Postgres;
  }
});

// ../backend/src/db/client.ts
async function closeDb() {
  await sql.end();
}
var sql;
var init_client = __esm({
  "../backend/src/db/client.ts"() {
    "use strict";
    init_src();
    init_env();
    sql = src_default(env.DATABASE_URL);
  }
});

// ../backend/src/utils/fileStorage.ts
var fileStorage_exports = {};
__export(fileStorage_exports, {
  deleteUploadedFile: () => deleteUploadedFile,
  saveUploadedFile: () => saveUploadedFile,
  validateImageFile: () => validateImageFile
});
import { writeFile, unlink, mkdir } from "fs/promises";
import { join as join2 } from "path";
function validateImageFile(file) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `File type ${file.type} not allowed. Use JPEG, PNG, WebP, or GIF.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds 10MB limit.";
  }
  return null;
}
async function saveUploadedFile(filename, data) {
  const uploadDir = env.UPLOAD_DIR;
  await mkdir(uploadDir, { recursive: true });
  const filePath = join2(uploadDir, filename);
  await writeFile(filePath, Buffer.from(data));
  return filePath;
}
async function deleteUploadedFile(filePath) {
  try {
    await unlink(filePath);
  } catch {
  }
}
var ALLOWED_MIME_TYPES, MAX_FILE_SIZE;
var init_fileStorage = __esm({
  "../backend/src/utils/fileStorage.ts"() {
    "use strict";
    init_env();
    ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ]);
    MAX_FILE_SIZE = 10 * 1024 * 1024;
  }
});

// ../backend/src/utils/scoringCalc.ts
var scoringCalc_exports = {};
__export(scoringCalc_exports, {
  calculateActionSteelScore: () => calculateActionSteelScore,
  calculateAggregatedScore: () => calculateAggregatedScore,
  calculateChronoPf: () => calculateChronoPf,
  calculateHitCountScore: () => calculateHitCountScore,
  calculateHitFactorScore: () => calculateHitFactorScore,
  calculateIDPAScore: () => calculateIDPAScore,
  calculateMultiGunScore: () => calculateMultiGunScore,
  calculateRingScore: () => calculateRingScore,
  calculateScore: () => calculateScore,
  calculateStagePercent: () => calculateStagePercent,
  calculateStagePoints: () => calculateStagePoints,
  calculateTimeBasedPercent: () => calculateTimeBasedPercent,
  checkPfPassed: () => checkPfPassed,
  getPointValues: () => getPointValues
});
function getPointValues(pf) {
  if (pf === "major") {
    return { alpha: 5, charlie: 4, delta: 2, steel: 5 };
  }
  return { alpha: 5, charlie: 3, delta: 1, steel: 5 };
}
function calculateScore(input) {
  const pv = getPointValues(input.power_factor);
  let raw_points = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;
  const hasExplicitMissData = input.targets.some((t) => t.miss > 0);
  for (const target of input.targets) {
    if (target.target_type === "paper") {
      const hits = [];
      for (let i = 0; i < target.alpha; i++) hits.push({ zone: "A", value: pv.alpha });
      for (let i = 0; i < target.charlie; i++) hits.push({ zone: "C", value: pv.charlie });
      for (let i = 0; i < target.delta; i++) hits.push({ zone: "D", value: pv.delta });
      hits.sort((a, b2) => b2.value - a.value);
      const best = hits.slice(0, target.hits_per_paper);
      raw_points += best.reduce((sum, h) => sum + h.value, 0);
      const totalScoringHits = target.alpha + target.charlie + target.delta;
      const targetMisses = hasExplicitMissData ? target.miss : Math.max(0, target.hits_per_paper - totalScoringHits);
      miss_count += targetMisses;
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === "steel") {
      if (target.steel_hit) {
        raw_points += pv.steel;
      } else {
        miss_count += 1;
      }
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === "no_shoot") {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === "npm") {
      if (target.steel_hit) {
        raw_points += pv.steel;
      }
      no_shoot_hit_count += target.no_shoot_hits;
    }
  }
  let penalty_points = 0;
  if (input.scoring_type === "comstock") {
    penalty_points = miss_count * 10 + no_shoot_hit_count * 10 + input.ftsa_count * 10 + input.procedural_count * 10;
  }
  if (input.scoring_type === "virginia") {
    penalty_points = miss_count * 10 + no_shoot_hit_count * 10 + input.ftsa_count * 10 + input.procedural_count * 10 + input.extra_shot_count * 10 + input.extra_hit_count * 10 + input.stacking_count * 10;
  }
  if (input.scoring_type === "fixed_time") {
    penalty_points = no_shoot_hit_count * 10 + input.procedural_count * 10 + input.extra_shot_count * 10 + input.extra_hit_count * 10 + input.stacking_count * 10 + input.overtime_shot_count * 5;
  }
  const net_points = raw_points - penalty_points;
  let hit_factor = 0;
  if ((input.scoring_type === "comstock" || input.scoring_type === "virginia") && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }
  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 1e4) / 1e4
  };
}
function calculateAggregatedScore(input) {
  const pv = getPointValues(input.power_factor);
  const raw_points = input.total_alpha * pv.alpha + input.total_charlie * pv.charlie + input.total_delta * pv.delta;
  let penalty_points = 0;
  if (input.scoring_type === "comstock" || input.scoring_type === "hit_factor") {
    penalty_points = (input.total_miss + input.total_no_shoot + input.ftsa_count + input.procedural_count) * 10;
  } else if (input.scoring_type === "virginia") {
    penalty_points = (input.total_miss + input.total_no_shoot + input.ftsa_count + input.procedural_count) * 10 + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10;
  } else if (input.scoring_type === "fixed_time") {
    penalty_points = input.total_no_shoot * 10 + input.procedural_count * 10 + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10 + input.overtime_shot_count * 5;
  }
  const net_points = raw_points - penalty_points;
  let hit_factor = 0;
  if ((input.scoring_type === "comstock" || input.scoring_type === "virginia" || input.scoring_type === "hit_factor") && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }
  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 1e4) / 1e4
  };
}
function calculateHitFactorScore(input) {
  return calculateScore({ ...input, scoring_type: "comstock" });
}
function calculateIDPAScore(input) {
  let points_down = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;
  const hasExplicitMissData = input.targets.some((t) => t.miss > 0);
  for (const target of input.targets) {
    if (target.target_type === "paper") {
      points_down += target.alpha * 0 + target.charlie * 1 + target.delta * 3;
      const totalHits = target.alpha + target.charlie + target.delta;
      const targetMisses = hasExplicitMissData ? target.miss : Math.max(0, target.hits_per_paper - totalHits);
      miss_count += targetMisses;
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === "steel") {
      if (!target.steel_hit) {
        miss_count += 1;
      }
    } else if (target.target_type === "no_shoot") {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === "npm") {
    }
  }
  const penalty_seconds = miss_count * 5 + no_shoot_hit_count * 5 + input.penalty_pe * 3 + input.penalty_hnt * 5 + input.penalty_ftn * 5 + input.penalty_fp * 10 + input.penalty_ftdr * 20;
  const total_time = input.time + points_down + penalty_seconds;
  return {
    raw_points: points_down,
    penalty_points: penalty_seconds,
    net_points: 0,
    // not used for IDPA
    hit_factor: 0,
    // not used for IDPA
    total_time: Math.round(total_time * 100) / 100
  };
}
function calculateActionSteelScore(input) {
  const adjustedTimes = [];
  for (let i = 0; i < input.string_times.length; i++) {
    const time = input.string_times[i];
    const hits = input.string_plate_hits[i] || [];
    const misses = hits.filter((h) => !h).length;
    const stopMissed = hits.length > 0 ? !hits[hits.length - 1] : true;
    let adjusted = time + misses * input.miss_penalty;
    if (stopMissed) {
      adjusted = Math.min(adjusted, input.stop_plate_miss_cap);
    }
    adjustedTimes.push(adjusted);
  }
  const sorted = [...adjustedTimes].sort((a, b2) => a - b2);
  const kept = sorted.slice(0, Math.max(1, sorted.length - input.drop_worst));
  const total_time = kept.reduce((s, t) => s + t, 0);
  return {
    raw_points: 0,
    penalty_points: 0,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100
  };
}
function calculateMultiGunScore(input) {
  const penalty_seconds = input.penalty_ftn_sec * 5 + input.penalty_miss_sec * 10 + input.penalty_no_shoot_sec * 5 + input.penalty_procedural_sec * 5;
  const total_time = input.time + penalty_seconds;
  return {
    raw_points: 0,
    penalty_points: Math.round(penalty_seconds * 100) / 100,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100
  };
}
function calculateRingScore(ring_values) {
  const raw_points = ring_values.reduce((sum, v) => {
    if (v === 11) return sum + 10;
    return sum + v;
  }, 0);
  const x_count = ring_values.filter((v) => v === 11).length;
  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
    x_count
  };
}
function calculateHitCountScore(hits, point_value = 10) {
  const raw_points = hits * point_value;
  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0
  };
}
function calculateStagePercent(shooterValue, highestValue) {
  if (highestValue <= 0) return 0;
  return Math.round(shooterValue / highestValue * 1e6) / 1e4;
}
function calculateStagePoints(stagePercent, maxPoints) {
  return Math.round(stagePercent / 100 * maxPoints * 100) / 100;
}
function calculateTimeBasedPercent(shooterTime, lowestTime) {
  if (shooterTime <= 0 || lowestTime <= 0) return 0;
  return Math.round(lowestTime / shooterTime * 1e6) / 1e4;
}
function calculateChronoPf(bulletWeight, v1, v2, v3) {
  const velocities = [v1, v2, v3].filter((v) => v !== null && v > 0);
  if (velocities.length === 0) return { avgVelocity: 0, calculatedPf: 0 };
  const avgVelocity = velocities.reduce((a, b2) => a + b2, 0) / velocities.length;
  const calculatedPf = bulletWeight * avgVelocity / 1e3;
  return {
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    calculatedPf: Math.round(calculatedPf * 100) / 100
  };
}
function checkPfPassed(calculatedPf, declaredPf, organization) {
  const minorThreshold = 125;
  const majorThreshold = organization === "IPSC" ? 170 : 165;
  if (declaredPf === "major") {
    if (calculatedPf >= majorThreshold) {
      return { passed: true, reclassifyTo: null };
    }
    if (calculatedPf >= minorThreshold) {
      return { passed: false, reclassifyTo: "minor" };
    }
    return { passed: false, reclassifyTo: null };
  }
  if (calculatedPf >= minorThreshold) {
    return { passed: true, reclassifyTo: null };
  }
  return { passed: false, reclassifyTo: null };
}
var init_scoringCalc = __esm({
  "../backend/src/utils/scoringCalc.ts"() {
    "use strict";
  }
});

// ../backend/src/services/stageLinkTokens.ts
var stageLinkTokens_exports = {};
__export(stageLinkTokens_exports, {
  TokenError: () => TokenError,
  cleanupExpiredTokens: () => cleanupExpiredTokens,
  createStageLinkToken: () => createStageLinkToken,
  getActiveStageLinkTokens: () => getActiveStageLinkTokens,
  redeemStageLinkToken: () => redeemStageLinkToken,
  revokeStageLinkTokens: () => revokeStageLinkTokens
});
import crypto4 from "crypto";
async function createStageLinkToken(stageId, ttlSeconds = DEFAULT_TTL_SECONDS, createdBy) {
  const clampedTtl = Math.min(Math.max(ttlSeconds, 60), MAX_TTL_SECONDS);
  const [stage] = await sql`
    SELECT s.id, s.name, s.match_id
    FROM stages s
    WHERE s.id = ${stageId}
  `;
  if (!stage) {
    throw new Error("Stage not found");
  }
  const token = crypto4.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + clampedTtl * 1e3);
  await sql`
    INSERT INTO stage_link_tokens (id, match_id, stage_id, created_by, expires_at)
    VALUES (${token}, ${stage.match_id}, ${stageId}, ${createdBy || null}, ${expiresAt.toISOString()})
  `;
  return {
    token,
    stageId: stage.id,
    stageName: stage.name,
    matchId: stage.match_id,
    expiresAt
  };
}
async function redeemStageLinkToken(token, clientIp) {
  const [row] = await sql`
    SELECT t.id, t.stage_id, t.match_id, t.expires_at, t.redeemed_at, t.revoked_at,
           s.name as stage_name
    FROM stage_link_tokens t
    JOIN stages s ON s.id = t.stage_id
    WHERE t.id = ${token}
  `;
  if (!row) {
    throw new TokenError("Token not found", 404);
  }
  if (row.revoked_at) {
    throw new TokenError("Token has been revoked", 410);
  }
  if (row.redeemed_at) {
    throw new TokenError("Token already used", 410);
  }
  if (new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
    throw new TokenError("Token has expired", 410);
  }
  await sql`
    UPDATE stage_link_tokens
    SET redeemed_at = now(), redeemed_ip = ${clientIp || null}
    WHERE id = ${token}
  `;
  return {
    stageId: row.stage_id,
    stageName: row.stage_name,
    matchId: row.match_id,
    expiresAt: new Date(row.expires_at)
  };
}
async function revokeStageLinkTokens(matchId) {
  const result = await sql`
    UPDATE stage_link_tokens
    SET revoked_at = now()
    WHERE match_id = ${matchId}
      AND revoked_at IS NULL
      AND redeemed_at IS NULL
  `;
  return result.count;
}
async function getActiveStageLinkTokens(matchId) {
  return sql`
    SELECT t.id, t.stage_id, t.match_id, t.created_at, t.expires_at,
           s.name as stage_name, s.stage_number
    FROM stage_link_tokens t
    JOIN stages s ON s.id = t.stage_id
    WHERE t.match_id = ${matchId}
      AND t.redeemed_at IS NULL
      AND t.revoked_at IS NULL
      AND t.expires_at > now()
    ORDER BY t.created_at DESC
  `;
}
async function cleanupExpiredTokens() {
  const result = await sql`
    DELETE FROM stage_link_tokens
    WHERE expires_at < now() - interval '${sql.unsafe(String(CLEANUP_AGE_DAYS))} days'
  `;
  return result.count;
}
var DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS, CLEANUP_AGE_DAYS, TokenError;
var init_stageLinkTokens = __esm({
  "../backend/src/services/stageLinkTokens.ts"() {
    "use strict";
    init_client();
    DEFAULT_TTL_SECONDS = 5 * 60 * 60;
    MAX_TTL_SECONDS = 24 * 60 * 60;
    CLEANUP_AGE_DAYS = 7;
    TokenError = class extends Error {
      status;
      constructor(message, status) {
        super(message);
        this.status = status;
      }
    };
  }
});

// ../node_modules/@hono/node-server/dist/index.mjs
import { createServer as createServerHTTP } from "http";
import { Http2ServerRequest as Http2ServerRequest2, constants as h2constants } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto2 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request2(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.defineProperty(requestPrototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      nativeRequest: this[requestCache]
    };
    return `Request (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      ;
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(
          cache[2] || { "content-type": "text/plain; charset=UTF-8" }
        );
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.defineProperty(Response2.prototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      status: this.status,
      headers: this.headers,
      ok: this.ok,
      nativeResponse: this[responseCache]
    };
    return `Response (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream2, writable) {
  if (stream2.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream2.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = crypto2;
}
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var incomingDraining = /* @__PURE__ */ Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) {
    return;
  }
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest2) {
    try {
      ;
      incoming.stream?.close?.(h2constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer2);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      socket.destroySoon();
    }
  };
  const timer2 = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer2.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) {
      forceClose();
    }
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header) {
    header = { "content-type": "text/plain; charset=UTF-8" };
  } else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else {
    for (const key in header) {
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
    }
  }
  if (!hasContentLength) {
    if (typeof body === "string") {
      header["Content-Length"] = Buffer.byteLength(body);
    } else if (body instanceof Uint8Array) {
      header["Content-Length"] = body.byteLength;
    } else if (body instanceof Blob) {
      header["Content-Length"] = body.size;
    }
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values2 = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values2.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values2.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values2.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values2.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    drainIncoming(incoming);
                  });
                }
              });
            }
          };
        }
        outgoing.on("finish", () => {
          if (!incomingEnded) {
            drainIncoming(incoming);
          }
        });
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                drainIncoming(incoming);
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer2 = options.createServer || createServerHTTP;
  const server = createServer2(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

// ../backend/src/index.ts
import { createServer } from "https";
import fs6 from "fs";

// ../backend/src/app.ts
import os3 from "os";
import fs5 from "fs";
import path3 from "path";

// ../node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// ../node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// ../node_modules/hono/dist/utils/url.js
var splitPath = (path4) => {
  const paths = path4.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path4 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path4);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path4) => {
  const groups = [];
  path4 = path4.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path: path4 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) {
        patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey2, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey2] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path4 = url.slice(start, end);
      return tryDecodeURI(path4.includes("%25") ? path4.replace(/%25/g, "%2525") : path4);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path4) => {
  if (path4.charCodeAt(path4.length - 1) !== 63 || !path4.includes(":")) {
    return null;
  }
  const segments = path4.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// ../node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path4 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path4;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer2) => new Uint8Array(buffer2));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// ../node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer2) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer2) {
    buffer2[0] += str;
  } else {
    buffer2 = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer: buffer2, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer2))
    ).then(() => buffer2[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// ../node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// ../node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// ../node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path4, ...handlers) => {
      for (const p of [path4].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path4, app2) {
    const subApp = this.basePath(path4);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path4) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path4);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path4, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path4);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path4, "*"), handler);
    return this;
  }
  #addRoute(method, path4, handler, baseRoutePath) {
    method = method.toUpperCase();
    path4 = mergePath(this._basePath, path4);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path: path4,
      method,
      handler
    };
    this.router.add(method, path4, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path4 = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path4);
    const c = new Context(request, {
      path: path4,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// ../node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path4) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path22) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path22];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path22.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path4);
}

// ../node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b2) {
  if (a.length === 1) {
    return b2.length === 1 ? a < b2 ? -1 : 1 : -1;
  }
  if (b2.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b2 === ONLY_WILDCARD_REG_EXP_STR || b2 === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b2 === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b2.length ? a < b2 ? -1 : 1 : b2.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path4, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path4 = path4.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path4.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path4) {
  return wildcardRegExpCache[path4] ??= new RegExp(
    path4 === "*" ? "" : `^${path4.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path4, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path4] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path4, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path4) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path4) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b2) => b2.length - a.length)) {
    if (buildWildcardRegExp(k).test(path4)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path4, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path4 === "/*") {
      path4 = "*";
    }
    const paramCount = (path4.match(/\/:/g) || []).length;
    if (/\*$/.test(path4)) {
      const re = buildWildcardRegExp(path4);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path4] ||= findMiddleware(middleware[m], path4) || findMiddleware(middleware[METHOD_NAME_ALL], path4) || [];
        });
      } else {
        middleware[method][path4] ||= findMiddleware(middleware[method], path4) || findMiddleware(middleware[METHOD_NAME_ALL], path4) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path4) || [path4];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path22 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path22] ||= [
            ...findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || []
          ];
          routes[m][path22].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path4) => [path4, r[method][path4]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path4) => [path4, r[METHOD_NAME_ALL][path4]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// ../node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path4, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path4, handler]);
  }
  match(method, path4) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path4);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// ../node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path4, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path4);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path4) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path4);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path4[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path4.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b2) => {
        return a.score - b2.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// ../node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path4, handler) {
    const results = checkOptionalParameter(path4);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path4, handler);
  }
  match(method, path4) {
    return this.#node.search(method, path4);
  }
};

// ../node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// ../node_modules/hono/dist/utils/mime.js
var getMimeType = (filename, mimes = baseMimes) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match2 = filename.match(regexp);
  if (!match2) {
    return;
  }
  return mimes[match2[1].toLowerCase()];
};
var _baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html; charset=utf-8",
  html: "text/html; charset=utf-8",
  ico: "image/x-icon",
  ics: "text/calendar; charset=utf-8",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript; charset=utf-8",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml; charset=utf-8",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain; charset=utf-8",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webmanifest: "application/manifest+json",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};
var baseMimes = _baseMimes;

// ../node_modules/@hono/node-server/dist/serve-static.mjs
import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { versions } from "process";
import { Readable as Readable2 } from "stream";
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var pr54206Applied = () => {
  const [major, minor] = versions.node.split(".").map((component) => parseInt(component));
  return major >= 23 || major === 22 && minor >= 7 || major === 20 && minor >= 18;
};
var useReadableToWeb = pr54206Applied();
var createStreamBody = (stream2) => {
  if (useReadableToWeb) {
    return Readable2.toWeb(stream2);
  }
  const body = new ReadableStream({
    start(controller) {
      stream2.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream2.on("error", (err) => {
        controller.error(err);
      });
      stream2.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream2.destroy();
    }
  });
  return body;
};
var getStats = (path4) => {
  let stats;
  try {
    stats = statSync(path4);
  } catch {
  }
  return stats;
};
var tryDecode2 = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI2 = (str) => tryDecode2(str, decodeURI);
var serveStatic = (options = { root: "" }) => {
  const root = options.root || "";
  const optionPath = options.path;
  if (root !== "" && !existsSync(root)) {
    console.error(`serveStatic: root path '${root}' is not found, are you sure it's correct?`);
  }
  return async (c, next) => {
    if (c.finalized) {
      return next();
    }
    let filename;
    if (optionPath) {
      filename = optionPath;
    } else {
      try {
        filename = tryDecodeURI2(c.req.path);
        if (/(?:^|[\/\\])\.{1,2}(?:$|[\/\\])|[\/\\]{2,}/.test(filename)) {
          throw new Error();
        }
      } catch {
        await options.onNotFound?.(c.req.path, c);
        return next();
      }
    }
    let path4 = join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename, c) : filename
    );
    let stats = getStats(path4);
    if (stats && stats.isDirectory()) {
      const indexFile = options.index ?? "index.html";
      path4 = join(path4, indexFile);
      stats = getStats(path4);
    }
    if (!stats) {
      await options.onNotFound?.(path4, c);
      return next();
    }
    const mimeType = getMimeType(path4);
    c.header("Content-Type", mimeType || "application/octet-stream");
    if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
      const acceptEncodingSet = new Set(
        c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim())
      );
      for (const encoding of ENCODINGS_ORDERED_KEYS) {
        if (!acceptEncodingSet.has(encoding)) {
          continue;
        }
        const precompressedStats = getStats(path4 + ENCODINGS[encoding]);
        if (precompressedStats) {
          c.header("Content-Encoding", encoding);
          c.header("Vary", "Accept-Encoding", { append: true });
          stats = precompressedStats;
          path4 = path4 + ENCODINGS[encoding];
          break;
        }
      }
    }
    let result;
    const size2 = stats.size;
    const range = c.req.header("range") || "";
    if (c.req.method == "HEAD" || c.req.method == "OPTIONS") {
      c.header("Content-Length", size2.toString());
      c.status(200);
      result = c.body(null);
    } else if (!range) {
      c.header("Content-Length", size2.toString());
      result = c.body(createStreamBody(createReadStream(path4)), 200);
    } else {
      c.header("Accept-Ranges", "bytes");
      c.header("Date", stats.birthtime.toUTCString());
      const parts = range.replace(/bytes=/, "").split("-", 2);
      const start = parseInt(parts[0], 10) || 0;
      let end = parseInt(parts[1], 10) || size2 - 1;
      if (size2 < end - start + 1) {
        end = size2 - 1;
      }
      const chunksize = end - start + 1;
      const stream2 = createReadStream(path4, { start, end });
      c.header("Content-Length", chunksize.toString());
      c.header("Content-Range", `bytes ${start}-${end}/${stats.size}`);
      result = c.body(createStreamBody(stream2), 206);
    }
    await options.onFound?.(path4, c);
    return result;
  };
};

// ../node_modules/hono/dist/utils/stream.js
var StreamingApi = class {
  writer;
  encoder;
  writable;
  abortSubscribers = [];
  responseReadable;
  /**
   * Whether the stream has been aborted.
   */
  aborted = false;
  /**
   * Whether the stream has been closed normally.
   */
  closed = false;
  constructor(writable, _readable) {
    this.writable = writable;
    this.writer = writable.getWriter();
    this.encoder = new TextEncoder();
    const reader = _readable.getReader();
    this.abortSubscribers.push(async () => {
      await reader.cancel();
    });
    this.responseReadable = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        done ? controller.close() : controller.enqueue(value);
      },
      cancel: () => {
        if (!this.closed) {
          this.abort();
        }
      }
    });
  }
  async write(input) {
    try {
      if (typeof input === "string") {
        input = this.encoder.encode(input);
      }
      await this.writer.write(input);
    } catch {
    }
    return this;
  }
  async writeln(input) {
    await this.write(input + "\n");
    return this;
  }
  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  async close() {
    this.closed = true;
    try {
      await this.writer.close();
    } catch {
    }
  }
  async pipe(body) {
    this.writer.releaseLock();
    await body.pipeTo(this.writable, { preventClose: true });
    this.writer = this.writable.getWriter();
  }
  onAbort(listener) {
    this.abortSubscribers.push(listener);
  }
  /**
   * Abort the stream.
   * You can call this method when stream is aborted by external event.
   */
  abort() {
    if (!this.aborted) {
      this.aborted = true;
      this.abortSubscribers.forEach((subscriber) => subscriber());
    }
  }
};

// ../node_modules/hono/dist/helper/streaming/utils.js
var isOldBunVersion = () => {
  const version = typeof Bun !== "undefined" ? Bun.version : void 0;
  if (version === void 0) {
    return false;
  }
  const result = version.startsWith("1.1") || version.startsWith("1.0") || version.startsWith("0.");
  isOldBunVersion = () => result;
  return result;
};

// ../node_modules/hono/dist/helper/streaming/sse.js
var SSEStreamingApi = class extends StreamingApi {
  constructor(writable, readable) {
    super(writable, readable);
  }
  async writeSSE(message) {
    const data = await resolveCallback(message.data, HtmlEscapedCallbackPhase.Stringify, false, {});
    const dataLines = data.split(/\r\n|\r|\n/).map((line) => {
      return `data: ${line}`;
    }).join("\n");
    for (const key of ["event", "id", "retry"]) {
      if (message[key] && /[\r\n]/.test(message[key])) {
        throw new Error(`${key} must not contain "\\r" or "\\n"`);
      }
    }
    const sseData = [
      message.event && `event: ${message.event}`,
      dataLines,
      message.id && `id: ${message.id}`,
      message.retry && `retry: ${message.retry}`
    ].filter(Boolean).join("\n") + "\n\n";
    await this.write(sseData);
  }
};
var run = async (stream2, cb, onError) => {
  try {
    await cb(stream2);
  } catch (e) {
    if (e instanceof Error && onError) {
      await onError(e, stream2);
      await stream2.writeSSE({
        event: "error",
        data: e.message
      });
    } else {
      console.error(e);
    }
  } finally {
    stream2.close();
  }
};
var contextStash = /* @__PURE__ */ new WeakMap();
var streamSSE = (c, cb, onError) => {
  const { readable, writable } = new TransformStream();
  const stream2 = new SSEStreamingApi(writable, readable);
  if (isOldBunVersion()) {
    c.req.raw.signal.addEventListener("abort", () => {
      if (!stream2.closed) {
        stream2.abort();
      }
    });
  }
  contextStash.set(stream2.responseReadable, c);
  c.header("Transfer-Encoding", "chunked");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  run(stream2, cb, onError);
  return c.newResponse(stream2.responseReadable);
};

// ../node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// ../backend/src/middleware/cors.ts
init_env();
function getAllowedOrigins() {
  if (env.CORS_ORIGINS === "*") return "*";
  return env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}
var origins = getAllowedOrigins();
var corsMiddleware = cors({
  origin: origins,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
});

// ../backend/src/middleware/errorHandler.ts
var errorHandler2 = async (err, c) => {
  console.error("Unhandled error:", err);
  if (err.code === "23505") {
    return c.json({ error: "Duplicate entry \u2014 this record already exists." }, 409);
  }
  if (err.code === "23503") {
    return c.json({ error: "Referenced record not found." }, 404);
  }
  if (err.code === "23514") {
    return c.json({ error: "Data validation failed: " + err.message }, 400);
  }
  return c.json(
    { error: err.message || "Internal server error" },
    err.status || 500
  );
};

// ../backend/src/middleware/requestLogger.ts
var requestLogger = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} \u2192 ${c.res.status} (${ms}ms)`);
};

// ../backend/src/middleware/auth.ts
init_client();
async function authMiddleware(c, next) {
  if (c.req.method === "GET") {
    const authHeader2 = c.req.header("Authorization");
    if (authHeader2 && authHeader2.startsWith("Bearer ")) {
      const token2 = authHeader2.slice(7);
      const [adminSession2] = await sql`
        SELECT id FROM admin_sessions WHERE token = ${token2} AND expires_at > now()
      `;
      if (adminSession2) {
        c.set("authRole", "admin");
        c.set("authStageId", "*");
        return next();
      }
      const [session2] = await sql`
        SELECT ss.stage_id, ss.expires_at
        FROM stage_sessions ss
        WHERE ss.token = ${token2}
      `;
      if (session2 && new Date(session2.expires_at) >= /* @__PURE__ */ new Date()) {
        await sql`UPDATE stage_sessions SET last_used_at = now() WHERE token = ${token2}`;
        c.set("authRole", "scorer");
        c.set("authStageId", session2.stage_id);
        return next();
      }
    }
    c.set("authRole", "anonymous");
    c.set("authStageId", "*");
    return next();
  }
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required. Provide a session token." }, 401);
  }
  const token = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (adminSession) {
    const [epochSetting] = await sql`
      SELECT value FROM app_settings WHERE key = 'session_epoch'
    `;
    const currentEpoch = epochSetting?.value || "0";
    c.set("authRole", "admin");
    c.set("authStageId", "*");
    c.set("sessionEpoch", currentEpoch);
    return next();
  }
  const [session] = await sql`
    SELECT ss.stage_id, ss.expires_at
    FROM stage_sessions ss
    WHERE ss.token = ${token}
  `;
  if (!session) {
    return c.json({ error: "Invalid or expired session token." }, 401);
  }
  if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    return c.json({ error: "Session token has expired. Please log in again." }, 401);
  }
  await sql`UPDATE stage_sessions SET last_used_at = now() WHERE token = ${token}`;
  c.set("authRole", "scorer");
  c.set("authStageId", session.stage_id);
  return next();
}
async function stageAccessMiddleware(c, next) {
  if (c.req.method === "GET") {
    return next();
  }
  const role = c.get("authRole");
  const allowedStageId = c.get("authStageId");
  if (role === "admin") {
    return next();
  }
  const requestedStageId = c.req.param("stageId");
  if (requestedStageId && requestedStageId !== allowedStageId) {
    return c.json({ error: "Access denied. You can only score the stage you are assigned to." }, 403);
  }
  return next();
}

// ../backend/src/middleware/scoreLock.ts
init_client();
async function scoreLockMiddleware(c, next) {
  if (c.req.method !== "PUT") {
    return next();
  }
  const role = c.get("authRole");
  if (role === "admin") {
    return next();
  }
  const stageId = c.req.param("stageId");
  const registrationId = c.req.param("registrationId");
  if (!stageId || !registrationId) {
    return next();
  }
  const [existing] = await sql`
    SELECT id FROM stage_scores
    WHERE stage_id = ${stageId} AND registration_id = ${registrationId}
  `;
  if (existing) {
    return c.json({ error: "Score already saved. Only admin can modify saved scores." }, 403);
  }
  return next();
}

// ../backend/src/middleware/securityHeaders.ts
async function securityHeaders(c, next) {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  c.header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:");
  const proto = c.req.header("x-forwarded-proto") || "http";
  if (proto === "https") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

// ../backend/src/middleware/roles.ts
async function requireAdmin(c, next) {
  const role = c.get("authRole");
  if (role !== "admin") {
    return c.json({ error: "Admin access required." }, 401);
  }
  return next();
}
function methodGuard(allowedWriteRoles = ["admin"]) {
  return async (c, next) => {
    if (c.req.method === "GET") {
      return next();
    }
    const role = c.get("authRole");
    if (!allowedWriteRoles.includes(role)) {
      return c.json({ error: "Insufficient permissions." }, 401);
    }
    return next();
  };
}

// ../backend/src/routes/matches.ts
init_client();

// ../backend/src/services/audit.ts
init_client();
async function audit(c, action, target, meta) {
  try {
    const role = c.get("authRole") || "anonymous";
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() || c.req.header("x-real-ip") || "";
    let targetTable = null;
    let targetId = null;
    if (target) {
      const parts = target.split(":");
      targetTable = parts[0] || null;
      targetId = parts[1] || null;
    }
    await sql`
      INSERT INTO audit_log (actor_role, actor_token_id, action, target_table, target_id, ip, at, meta)
      VALUES (${role}, null, ${action}, ${targetTable}, ${targetId}, ${ip}, now(), ${meta ? JSON.stringify(meta) : null}::jsonb)
    `;
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}

// ../backend/src/routes/matches.ts
var matchRoutes = new Hono2();
matchRoutes.get("/", async (c) => {
  const matches = await sql`
    SELECT m.id, m.name, m.date, m.organization, m.firearm_type, m.match_level, m.is_current, m.created_at,
           (SELECT COUNT(*) FROM match_registrations mr WHERE mr.match_id = m.id) AS shooter_count
    FROM matches m
    ORDER BY m.date DESC
  `;
  return c.json(matches.map((m) => ({ ...m, shooter_count: Number(m.shooter_count), match_level: m.match_level ?? null })));
});
matchRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const { name, date, organization, firearm_type, match_level } = body;
  if (!name || !date || !organization || !firearm_type) {
    return c.json({ error: "name, date, organization, and firearm_type are required" }, 400);
  }
  const level = match_level === null || match_level === void 0 || match_level === "" ? null : Number(match_level);
  if (level !== null && (!Number.isInteger(level) || level < 1 || level > 5)) {
    return c.json({ error: "match_level must be an integer between 1 and 5" }, 400);
  }
  const [match2] = await sql`
    INSERT INTO matches (name, date, organization, firearm_type, match_level)
    VALUES (${name}, ${date}, ${organization}, ${firearm_type}, ${level})
    RETURNING *
  `;
  await audit(c, "match.create", `matches:${match2.id}`, { name });
  return c.json(match2, 201);
});
matchRoutes.get("/current", async (c) => {
  const [match2] = await sql`
    SELECT id, name, date, organization, firearm_type, match_level, is_current
    FROM matches
    WHERE is_current = true
    LIMIT 1
  `;
  if (!match2) return c.json(null);
  return c.json(match2);
});
matchRoutes.put("/:id/set-current", async (c) => {
  const id = c.req.param("id");
  const [existing] = await sql`SELECT id FROM matches WHERE id = ${id}`;
  if (!existing) return c.json({ error: "Match not found" }, 404);
  await sql`UPDATE matches SET is_current = false WHERE is_current = true`;
  await sql`UPDATE matches SET is_current = true, updated_at = NOW() WHERE id = ${id}`;
  await audit(c, "match.set-current", `matches:${id}`);
  const [match2] = await sql`
    SELECT id, name, date, organization, firearm_type, match_level, is_current
    FROM matches WHERE id = ${id}
  `;
  return c.json(match2);
});
matchRoutes.put("/unset-current", async (c) => {
  await sql`UPDATE matches SET is_current = false WHERE is_current = true`;
  await audit(c, "match.unset-current");
  return c.json({ success: true });
});
matchRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [match2] = await sql`
    SELECT * FROM matches WHERE id = ${id}
  `;
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const stages = await sql`
    SELECT id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets,
           min_rounds, max_points, par_time, image_path
    FROM stages WHERE match_id = ${id}
    ORDER BY stage_number
  `;
  const [regCount] = await sql`
    SELECT COUNT(*) as count FROM match_registrations WHERE match_id = ${id}
  `;
  const summary = stages.reduce(
    (acc, s) => ({
      total_shots: acc.total_shots + s.min_rounds,
      total_points: acc.total_points + Number(s.max_points),
      total_paper: acc.total_paper + s.paper_targets,
      total_steel: acc.total_steel + s.steel_targets
    }),
    { total_shots: 0, total_points: 0, total_paper: 0, total_steel: 0 }
  );
  return c.json({ ...match2, stages, shooter_count: Number(regCount.count), summary });
});
matchRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, date, organization, firearm_type, match_level } = body;
  let levelValue = null;
  let levelProvided = match_level !== void 0;
  if (levelProvided) {
    if (match_level === null || match_level === "") {
      levelValue = null;
    } else {
      const n = Number(match_level);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return c.json({ error: "match_level must be null or an integer between 1 and 5" }, 400);
      }
      levelValue = n;
    }
  }
  const [updated] = await sql`
    UPDATE matches
    SET name = COALESCE(${name}, name),
        date = COALESCE(${date}, date),
        organization = COALESCE(${organization}, organization),
        firearm_type = COALESCE(${firearm_type}, firearm_type),
        match_level = ${levelProvided ? levelValue : sql`match_level`},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: "Match not found" }, 404);
  await audit(c, "match.update", `matches:${id}`);
  return c.json(updated);
});
matchRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`DELETE FROM matches WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: "Match not found" }, 404);
  await audit(c, "match.delete", `matches:${id}`);
  return c.json({ deleted: true });
});

// ../backend/src/routes/stages.ts
init_client();

// ../node_modules/bcryptjs/index.js
import nodeCrypto from "crypto";
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return nodeCrypto.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
function setRandomFallback(random) {
  randomFallback = random;
}
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
function compareSync(password, hash3) {
  if (typeof password !== "string" || typeof hash3 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash3);
  if (hash3.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash3.substring(0, hash3.length - 31)),
    hash3
  );
}
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function getRounds(hash3) {
  if (typeof hash3 !== "string")
    throw Error("Illegal arguments: " + typeof hash3);
  return parseInt(hash3.split("$")[2], 10);
}
function getSalt(hash3) {
  if (typeof hash3 !== "string")
    throw Error("Illegal arguments: " + typeof hash3);
  if (hash3.length !== 60)
    throw Error("Illegal hash length: " + hash3.length + " != 60");
  return hash3.substring(0, 29);
}
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
var nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
function utf8Length(string) {
  var len = 0, c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
function utf8Array(string) {
  var offset = 0, c1, c2;
  var buffer2 = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer2[offset++] = c1;
    } else if (c1 < 2048) {
      buffer2[offset++] = c1 >> 6 | 192;
      buffer2[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer2[offset++] = c1 >> 18 | 240;
      buffer2[offset++] = c1 >> 12 & 63 | 128;
      buffer2[offset++] = c1 >> 6 & 63 | 128;
      buffer2[offset++] = c1 & 63 | 128;
    } else {
      buffer2[offset++] = c1 >> 12 | 224;
      buffer2[offset++] = c1 >> 6 & 63 | 128;
      buffer2[offset++] = c1 & 63 | 128;
    }
  }
  return buffer2;
}
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  1,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  -1,
  -1,
  -1,
  -1,
  -1
];
function base64_encode(b2, len) {
  var off = 0, rs = [], c1, c2;
  if (len <= 0 || len > b2.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b2[off++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b2[off++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b2[off++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
function base64_decode(s, len) {
  var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var S_ORIG = [
  3509652390,
  2564797868,
  805139163,
  3491422135,
  3101798381,
  1780907670,
  3128725573,
  4046225305,
  614570311,
  3012652279,
  134345442,
  2240740374,
  1667834072,
  1901547113,
  2757295779,
  4103290238,
  227898511,
  1921955416,
  1904987480,
  2182433518,
  2069144605,
  3260701109,
  2620446009,
  720527379,
  3318853667,
  677414384,
  3393288472,
  3101374703,
  2390351024,
  1614419982,
  1822297739,
  2954791486,
  3608508353,
  3174124327,
  2024746970,
  1432378464,
  3864339955,
  2857741204,
  1464375394,
  1676153920,
  1439316330,
  715854006,
  3033291828,
  289532110,
  2706671279,
  2087905683,
  3018724369,
  1668267050,
  732546397,
  1947742710,
  3462151702,
  2609353502,
  2950085171,
  1814351708,
  2050118529,
  680887927,
  999245976,
  1800124847,
  3300911131,
  1713906067,
  1641548236,
  4213287313,
  1216130144,
  1575780402,
  4018429277,
  3917837745,
  3693486850,
  3949271944,
  596196993,
  3549867205,
  258830323,
  2213823033,
  772490370,
  2760122372,
  1774776394,
  2652871518,
  566650946,
  4142492826,
  1728879713,
  2882767088,
  1783734482,
  3629395816,
  2517608232,
  2874225571,
  1861159788,
  326777828,
  3124490320,
  2130389656,
  2716951837,
  967770486,
  1724537150,
  2185432712,
  2364442137,
  1164943284,
  2105845187,
  998989502,
  3765401048,
  2244026483,
  1075463327,
  1455516326,
  1322494562,
  910128902,
  469688178,
  1117454909,
  936433444,
  3490320968,
  3675253459,
  1240580251,
  122909385,
  2157517691,
  634681816,
  4142456567,
  3825094682,
  3061402683,
  2540495037,
  79693498,
  3249098678,
  1084186820,
  1583128258,
  426386531,
  1761308591,
  1047286709,
  322548459,
  995290223,
  1845252383,
  2603652396,
  3431023940,
  2942221577,
  3202600964,
  3727903485,
  1712269319,
  422464435,
  3234572375,
  1170764815,
  3523960633,
  3117677531,
  1434042557,
  442511882,
  3600875718,
  1076654713,
  1738483198,
  4213154764,
  2393238008,
  3677496056,
  1014306527,
  4251020053,
  793779912,
  2902807211,
  842905082,
  4246964064,
  1395751752,
  1040244610,
  2656851899,
  3396308128,
  445077038,
  3742853595,
  3577915638,
  679411651,
  2892444358,
  2354009459,
  1767581616,
  3150600392,
  3791627101,
  3102740896,
  284835224,
  4246832056,
  1258075500,
  768725851,
  2589189241,
  3069724005,
  3532540348,
  1274779536,
  3789419226,
  2764799539,
  1660621633,
  3471099624,
  4011903706,
  913787905,
  3497959166,
  737222580,
  2514213453,
  2928710040,
  3937242737,
  1804850592,
  3499020752,
  2949064160,
  2386320175,
  2390070455,
  2415321851,
  4061277028,
  2290661394,
  2416832540,
  1336762016,
  1754252060,
  3520065937,
  3014181293,
  791618072,
  3188594551,
  3933548030,
  2332172193,
  3852520463,
  3043980520,
  413987798,
  3465142937,
  3030929376,
  4245938359,
  2093235073,
  3534596313,
  375366246,
  2157278981,
  2479649556,
  555357303,
  3870105701,
  2008414854,
  3344188149,
  4221384143,
  3956125452,
  2067696032,
  3594591187,
  2921233993,
  2428461,
  544322398,
  577241275,
  1471733935,
  610547355,
  4027169054,
  1432588573,
  1507829418,
  2025931657,
  3646575487,
  545086370,
  48609733,
  2200306550,
  1653985193,
  298326376,
  1316178497,
  3007786442,
  2064951626,
  458293330,
  2589141269,
  3591329599,
  3164325604,
  727753846,
  2179363840,
  146436021,
  1461446943,
  4069977195,
  705550613,
  3059967265,
  3887724982,
  4281599278,
  3313849956,
  1404054877,
  2845806497,
  146425753,
  1854211946,
  1266315497,
  3048417604,
  3681880366,
  3289982499,
  290971e4,
  1235738493,
  2632868024,
  2414719590,
  3970600049,
  1771706367,
  1449415276,
  3266420449,
  422970021,
  1963543593,
  2690192192,
  3826793022,
  1062508698,
  1531092325,
  1804592342,
  2583117782,
  2714934279,
  4024971509,
  1294809318,
  4028980673,
  1289560198,
  2221992742,
  1669523910,
  35572830,
  157838143,
  1052438473,
  1016535060,
  1802137761,
  1753167236,
  1386275462,
  3080475397,
  2857371447,
  1040679964,
  2145300060,
  2390574316,
  1461121720,
  2956646967,
  4031777805,
  4028374788,
  33600511,
  2920084762,
  1018524850,
  629373528,
  3691585981,
  3515945977,
  2091462646,
  2486323059,
  586499841,
  988145025,
  935516892,
  3367335476,
  2599673255,
  2839830854,
  265290510,
  3972581182,
  2759138881,
  3795373465,
  1005194799,
  847297441,
  406762289,
  1314163512,
  1332590856,
  1866599683,
  4127851711,
  750260880,
  613907577,
  1450815602,
  3165620655,
  3734664991,
  3650291728,
  3012275730,
  3704569646,
  1427272223,
  778793252,
  1343938022,
  2676280711,
  2052605720,
  1946737175,
  3164576444,
  3914038668,
  3967478842,
  3682934266,
  1661551462,
  3294938066,
  4011595847,
  840292616,
  3712170807,
  616741398,
  312560963,
  711312465,
  1351876610,
  322626781,
  1910503582,
  271666773,
  2175563734,
  1594956187,
  70604529,
  3617834859,
  1007753275,
  1495573769,
  4069517037,
  2549218298,
  2663038764,
  504708206,
  2263041392,
  3941167025,
  2249088522,
  1514023603,
  1998579484,
  1312622330,
  694541497,
  2582060303,
  2151582166,
  1382467621,
  776784248,
  2618340202,
  3323268794,
  2497899128,
  2784771155,
  503983604,
  4076293799,
  907881277,
  423175695,
  432175456,
  1378068232,
  4145222326,
  3954048622,
  3938656102,
  3820766613,
  2793130115,
  2977904593,
  26017576,
  3274890735,
  3194772133,
  1700274565,
  1756076034,
  4006520079,
  3677328699,
  720338349,
  1533947780,
  354530856,
  688349552,
  3973924725,
  1637815568,
  332179504,
  3949051286,
  53804574,
  2852348879,
  3044236432,
  1282449977,
  3583942155,
  3416972820,
  4006381244,
  1617046695,
  2628476075,
  3002303598,
  1686838959,
  431878346,
  2686675385,
  1700445008,
  1080580658,
  1009431731,
  832498133,
  3223435511,
  2605976345,
  2271191193,
  2516031870,
  1648197032,
  4164389018,
  2548247927,
  300782431,
  375919233,
  238389289,
  3353747414,
  2531188641,
  2019080857,
  1475708069,
  455242339,
  2609103871,
  448939670,
  3451063019,
  1395535956,
  2413381860,
  1841049896,
  1491858159,
  885456874,
  4264095073,
  4001119347,
  1565136089,
  3898914787,
  1108368660,
  540939232,
  1173283510,
  2745871338,
  3681308437,
  4207628240,
  3343053890,
  4016749493,
  1699691293,
  1103962373,
  3625875870,
  2256883143,
  3830138730,
  1031889488,
  3479347698,
  1535977030,
  4236805024,
  3251091107,
  2132092099,
  1774941330,
  1199868427,
  1452454533,
  157007616,
  2904115357,
  342012276,
  595725824,
  1480756522,
  206960106,
  497939518,
  591360097,
  863170706,
  2375253569,
  3596610801,
  1814182875,
  2094937945,
  3421402208,
  1082520231,
  3463918190,
  2785509508,
  435703966,
  3908032597,
  1641649973,
  2842273706,
  3305899714,
  1510255612,
  2148256476,
  2655287854,
  3276092548,
  4258621189,
  236887753,
  3681803219,
  274041037,
  1734335097,
  3815195456,
  3317970021,
  1899903192,
  1026095262,
  4050517792,
  356393447,
  2410691914,
  3873677099,
  3682840055,
  3913112168,
  2491498743,
  4132185628,
  2489919796,
  1091903735,
  1979897079,
  3170134830,
  3567386728,
  3557303409,
  857797738,
  1136121015,
  1342202287,
  507115054,
  2535736646,
  337727348,
  3213592640,
  1301675037,
  2528481711,
  1895095763,
  1721773893,
  3216771564,
  62756741,
  2142006736,
  835421444,
  2531993523,
  1442658625,
  3659876326,
  2882144922,
  676362277,
  1392781812,
  170690266,
  3921047035,
  1759253602,
  3611846912,
  1745797284,
  664899054,
  1329594018,
  3901205900,
  3045908486,
  2062866102,
  2865634940,
  3543621612,
  3464012697,
  1080764994,
  553557557,
  3656615353,
  3996768171,
  991055499,
  499776247,
  1265440854,
  648242737,
  3940784050,
  980351604,
  3713745714,
  1749149687,
  3396870395,
  4211799374,
  3640570775,
  1161844396,
  3125318951,
  1431517754,
  545492359,
  4268468663,
  3499529547,
  1437099964,
  2702547544,
  3433638243,
  2581715763,
  2787789398,
  1060185593,
  1593081372,
  2418618748,
  4260947970,
  69676912,
  2159744348,
  86519011,
  2512459080,
  3838209314,
  1220612927,
  3339683548,
  133810670,
  1090789135,
  1078426020,
  1569222167,
  845107691,
  3583754449,
  4072456591,
  1091646820,
  628848692,
  1613405280,
  3757631651,
  526609435,
  236106946,
  48312990,
  2942717905,
  3402727701,
  1797494240,
  859738849,
  992217954,
  4005476642,
  2243076622,
  3870952857,
  3732016268,
  765654824,
  3490871365,
  2511836413,
  1685915746,
  3888969200,
  1414112111,
  2273134842,
  3281911079,
  4080962846,
  172450625,
  2569994100,
  980381355,
  4109958455,
  2819808352,
  2716589560,
  2568741196,
  3681446669,
  3329971472,
  1835478071,
  660984891,
  3704678404,
  4045999559,
  3422617507,
  3040415634,
  1762651403,
  1719377915,
  3470491036,
  2693910283,
  3642056355,
  3138596744,
  1364962596,
  2073328063,
  1983633131,
  926494387,
  3423689081,
  2150032023,
  4096667949,
  1749200295,
  3328846651,
  309677260,
  2016342300,
  1779581495,
  3079819751,
  111262694,
  1274766160,
  443224088,
  298511866,
  1025883608,
  3806446537,
  1145181785,
  168956806,
  3641502830,
  3584813610,
  1689216846,
  3666258015,
  3200248200,
  1692713982,
  2646376535,
  4042768518,
  1618508792,
  1610833997,
  3523052358,
  4130873264,
  2001055236,
  3610705100,
  2202168115,
  4028541809,
  2961195399,
  1006657119,
  2006996926,
  3186142756,
  1430667929,
  3210227297,
  1314452623,
  4074634658,
  4101304120,
  2273951170,
  1399257539,
  3367210612,
  3027628629,
  1190975929,
  2062231137,
  2333990788,
  2221543033,
  2438960610,
  1181637006,
  548689776,
  2362791313,
  3372408396,
  3104550113,
  3145860560,
  296247880,
  1970579870,
  3078560182,
  3769228297,
  1714227617,
  3291629107,
  3898220290,
  166772364,
  1251581989,
  493813264,
  448347421,
  195405023,
  2709975567,
  677966185,
  3703036547,
  1463355134,
  2715995803,
  1338867538,
  1343315457,
  2802222074,
  2684532164,
  233230375,
  2599980071,
  2000651841,
  3277868038,
  1638401717,
  4028070440,
  3237316320,
  6314154,
  819756386,
  300326615,
  590932579,
  1405279636,
  3267499572,
  3150704214,
  2428286686,
  3959192993,
  3461946742,
  1862657033,
  1266418056,
  963775037,
  2089974820,
  2263052895,
  1917689273,
  448879540,
  3550394620,
  3981727096,
  150775221,
  3627908307,
  1303187396,
  508620638,
  2975983352,
  2726630617,
  1817252668,
  1876281319,
  1457606340,
  908771278,
  3720792119,
  3617206836,
  2455994898,
  1729034894,
  1080033504,
  976866871,
  3556439503,
  2881648439,
  1522871579,
  1555064734,
  1336096578,
  3548522304,
  2579274686,
  3574697629,
  3205460757,
  3593280638,
  3338716283,
  3079412587,
  564236357,
  2993598910,
  1781952180,
  1464380207,
  3163844217,
  3332601554,
  1699332808,
  1393555694,
  1183702653,
  3581086237,
  1288719814,
  691649499,
  2847557200,
  2895455976,
  3193889540,
  2717570544,
  1781354906,
  1676643554,
  2592534050,
  3230253752,
  1126444790,
  2770207658,
  2633158820,
  2210423226,
  2615765581,
  2414155088,
  3127139286,
  673620729,
  2805611233,
  1269405062,
  4015350505,
  3341807571,
  4149409754,
  1057255273,
  2012875353,
  2162469141,
  2276492801,
  2601117357,
  993977747,
  3918593370,
  2654263191,
  753973209,
  36408145,
  2530585658,
  25011837,
  3520020182,
  2088578344,
  530523599,
  2918365339,
  1524020338,
  1518925132,
  3760827505,
  3759777254,
  1202760957,
  3985898139,
  3906192525,
  674977740,
  4174734889,
  2031300136,
  2019492241,
  3983892565,
  4153806404,
  3822280332,
  352677332,
  2297720250,
  60907813,
  90501309,
  3286998549,
  1016092578,
  2535922412,
  2839152426,
  457141659,
  509813237,
  4120667899,
  652014361,
  1966332200,
  2975202805,
  55981186,
  2327461051,
  676427537,
  3255491064,
  2882294119,
  3433927263,
  1307055953,
  942726286,
  933058658,
  2468411793,
  3933900994,
  4215176142,
  1361170020,
  2001714738,
  2830558078,
  3274259782,
  1222529897,
  1679025792,
  2729314320,
  3714953764,
  1770335741,
  151462246,
  3013232138,
  1682292957,
  1483529935,
  471910574,
  1539241949,
  458788160,
  3436315007,
  1807016891,
  3718408830,
  978976581,
  1043663428,
  3165965781,
  1927990952,
  4200891579,
  2372276910,
  3208408903,
  3533431907,
  1412390302,
  2931980059,
  4132332400,
  1947078029,
  3881505623,
  4168226417,
  2941484381,
  1077988104,
  1320477388,
  886195818,
  18198404,
  3786409e3,
  2509781533,
  112762804,
  3463356488,
  1866414978,
  891333506,
  18488651,
  661792760,
  1628790961,
  3885187036,
  3141171499,
  876946877,
  2693282273,
  1372485963,
  791857591,
  2686433993,
  3759982718,
  3167212022,
  3472953795,
  2716379847,
  445679433,
  3561995674,
  3504004811,
  3574258232,
  54117162,
  3331405415,
  2381918588,
  3769707343,
  4154350007,
  1140177722,
  4074052095,
  668550556,
  3214352940,
  367459370,
  261225585,
  2610173221,
  4209349473,
  3468074219,
  3265815641,
  314222801,
  3066103646,
  3808782860,
  282218597,
  3406013506,
  3773591054,
  379116347,
  1285071038,
  846784868,
  2669647154,
  3771962079,
  3550491691,
  2305946142,
  453669953,
  1268987020,
  3317592352,
  3279303384,
  3744833421,
  2610507566,
  3859509063,
  266596637,
  3847019092,
  517658769,
  3462560207,
  3443424879,
  370717030,
  4247526661,
  2224018117,
  4143653529,
  4112773975,
  2788324899,
  2477274417,
  1456262402,
  2901442914,
  1517677493,
  1846949527,
  2295493580,
  3734397586,
  2176403920,
  1280348187,
  1908823572,
  3871786941,
  846861322,
  1172426758,
  3287448474,
  3383383037,
  1655181056,
  3139813346,
  901632758,
  1897031941,
  2986607138,
  3066810236,
  3447102507,
  1393639104,
  373351379,
  950779232,
  625454576,
  3124240540,
  4148612726,
  2007998917,
  544563296,
  2244738638,
  2330496472,
  2058025392,
  1291430526,
  424198748,
  50039436,
  29584100,
  3605783033,
  2429876329,
  2791104160,
  1057563949,
  3255363231,
  3075367218,
  3463963227,
  1469046755,
  985887462
];
var C_ORIG = [
  1332899944,
  1700884034,
  1701343084,
  1684370003,
  1668446532,
  1869963892
];
function _encipher(lr, off, P, S) {
  var n, l = lr[off], r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _crypt(b2, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b2, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b2, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
var bcryptjs_default = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64
};

// ../backend/src/utils/passwords.ts
var STAGE_PASSWORD_MIN_LENGTH = 8;

// ../backend/src/routes/stages.ts
var stageRoutes = new Hono2();
function parseStageJsonb(stage) {
  if (!stage) return stage;
  const result = { ...stage };
  if (typeof result.config === "string") {
    try {
      result.config = JSON.parse(result.config);
    } catch {
      result.config = {};
    }
  }
  return result;
}
var PUBLIC_STAGE_COLUMNS = `
  s.id, s.match_id, s.stage_number, s.name, s.scoring_type,
  s.paper_targets, s.steel_targets, s.no_shoot_targets, s.npm_targets, s.hits_per_paper,
  s.min_rounds, s.max_points, s.par_time, s.image_path, s.briefing, s.config,
  s.password_hash IS NOT NULL AS has_password,
  s.created_at, s.updated_at
`;
var RETURNING_STAGE_COLUMNS = `
  id, match_id, stage_number, name, scoring_type,
  paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper,
  min_rounds, max_points, par_time, image_path, briefing, config,
  password_hash, password_hash IS NOT NULL AS has_password,
  created_at, updated_at
`;
function calcStageParams(scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, config) {
  switch (scoring_type) {
    case "comstock":
    case "virginia":
    case "fixed_time":
    case "hit_factor":
    case "idpa": {
      const min_rounds = paper_targets * hits_per_paper + steel_targets;
      const max_points = paper_targets * hits_per_paper * 5 + steel_targets * 5 + npm_targets * 5;
      return { min_rounds, max_points };
    }
    case "action_steel": {
      const strings = config?.number_of_strings || 5;
      const targets = config?.targets_per_string || 5;
      const min_rounds = strings * targets;
      const max_points = strings * targets * 5;
      return { min_rounds, max_points };
    }
    case "multi_gun": {
      const numTargets = config?.num_targets || paper_targets || 0;
      const min_rounds = numTargets;
      const max_points = numTargets * 5;
      return { min_rounds, max_points };
    }
    case "bullseye": {
      const shots = config?.shots_per_string || 10;
      return { min_rounds: shots, max_points: shots * 10 };
    }
    case "archery": {
      const arrows = config?.arrows_per_end || 6;
      return { min_rounds: arrows, max_points: arrows * 10 };
    }
    case "long_range": {
      if (config?.variant === "f_class") {
        const shots = config?.shots_per_string || 20;
        return { min_rounds: shots, max_points: shots * 10 };
      }
      const numTargets = config?.num_targets || paper_targets || 10;
      return { min_rounds: numTargets, max_points: numTargets };
    }
    case "nrl22": {
      const numTargets = config?.num_targets || paper_targets || 10;
      const pointValue = config?.point_value || 10;
      return { min_rounds: numTargets, max_points: numTargets * pointValue };
    }
    default: {
      const min_rounds = paper_targets * hits_per_paper + steel_targets;
      const max_points = paper_targets * hits_per_paper * 5 + steel_targets * 5 + npm_targets * 5;
      return { min_rounds, max_points };
    }
  }
}
stageRoutes.get("/matches/:matchId/stages", async (c) => {
  const matchId = c.req.param("matchId");
  const stages = await sql`
    SELECT ${sql.unsafe(PUBLIC_STAGE_COLUMNS)}
    FROM stages s
    WHERE s.match_id = ${matchId}
    ORDER BY s.stage_number
  `;
  return c.json(stages.map(parseStageJsonb));
});
stageRoutes.post("/matches/:matchId/stages", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const { name, scoring_type, paper_targets = 0, steel_targets = 0, no_shoot_targets = 0, npm_targets = 0, hits_per_paper = 2, par_time, config, password, briefing } = body;
  if (!name || !scoring_type) {
    return c.json({ error: "name and scoring_type are required" }, 400);
  }
  if (password && password.length < STAGE_PASSWORD_MIN_LENGTH) {
    return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
  }
  const [maxNum] = await sql`
    SELECT COALESCE(MAX(stage_number), 0) as max_num FROM stages WHERE match_id = ${matchId}
  `;
  const stage_number = Number(maxNum.max_num) + 1;
  const stageConfig = config || {};
  const { min_rounds, max_points } = calcStageParams(scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, stageConfig);
  const password_hash = password ? await bcryptjs_default.hash(password, 12) : null;
  const [stage] = await sql`
    INSERT INTO stages (match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
                        no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config, password_hash)
    VALUES (${matchId}, ${stage_number}, ${name}, ${scoring_type}, ${paper_targets}, ${steel_targets},
            ${no_shoot_targets}, ${npm_targets}, ${hits_per_paper}, ${min_rounds}, ${max_points}, ${par_time || null}, ${briefing || null}, ${JSON.stringify(stageConfig)}, ${password_hash})
    RETURNING ${sql.unsafe(RETURNING_STAGE_COLUMNS)}
  `;
  return c.json(parseStageJsonb(stage), 201);
});
stageRoutes.get("/stages/:id", async (c) => {
  const id = c.req.param("id");
  const [stage] = await sql`
    SELECT ${sql.unsafe(PUBLIC_STAGE_COLUMNS)}
    FROM stages s
    WHERE s.id = ${id}
  `;
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  return c.json(parseStageJsonb(stage));
});
stageRoutes.put("/stages/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, par_time, config, password, briefing } = body;
  const [existing] = await sql`SELECT * FROM stages WHERE id = ${id}`;
  if (!existing) return c.json({ error: "Stage not found" }, 404);
  const st = scoring_type || existing.scoring_type;
  const pt = paper_targets ?? Number(existing.paper_targets);
  const stl = steel_targets ?? Number(existing.steel_targets);
  const nst = no_shoot_targets ?? Number(existing.no_shoot_targets);
  const npmt = npm_targets ?? Number(existing.npm_targets);
  const hpp = hits_per_paper ?? Number(existing.hits_per_paper);
  const stageConfig = config ?? (typeof existing.config === "string" ? JSON.parse(existing.config) : existing.config || {});
  const { min_rounds, max_points } = calcStageParams(st, pt, stl, nst, npmt, hpp, stageConfig);
  let password_hash;
  if (password === "") {
    password_hash = null;
  } else if (password) {
    if (password.length < STAGE_PASSWORD_MIN_LENGTH) {
      return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
    }
    password_hash = await bcryptjs_default.hash(password, 12);
  } else {
    password_hash = existing.password_hash;
  }
  const [updated] = await sql`
    UPDATE stages
    SET name = COALESCE(${name}, name),
        scoring_type = COALESCE(${scoring_type}, scoring_type),
        paper_targets = ${pt},
        steel_targets = ${stl},
        no_shoot_targets = ${nst},
        npm_targets = ${npmt},
        hits_per_paper = ${hpp},
        min_rounds = ${min_rounds},
        max_points = ${max_points},
        par_time = ${par_time !== void 0 ? par_time : existing.par_time},
        briefing = COALESCE(${briefing}, briefing),
        config = ${JSON.stringify(stageConfig)},
        password_hash = ${password_hash},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${sql.unsafe(RETURNING_STAGE_COLUMNS)}
  `;
  return c.json(parseStageJsonb(updated));
});
stageRoutes.delete("/stages/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`DELETE FROM stages WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: "Stage not found" }, 404);
  return c.json({ deleted: true });
});
stageRoutes.post("/stages/:id/image", async (c) => {
  const id = c.req.param("id");
  const [stage] = await sql`SELECT id, match_id FROM stages WHERE id = ${id}`;
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  const body = await c.req.parseBody();
  const file = body["image"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No image file provided" }, 400);
  }
  const { validateImageFile: validateImageFile2, saveUploadedFile: saveUploadedFile2 } = await Promise.resolve().then(() => (init_fileStorage(), fileStorage_exports));
  const error = validateImageFile2({ type: file.type, size: file.size });
  if (error) return c.json({ error }, 400);
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `stage_${id}.${ext}`;
  const data = await file.arrayBuffer();
  const filePath = await saveUploadedFile2(filename, data);
  await sql`
    UPDATE stages SET image_path = ${filePath}, updated_at = NOW() WHERE id = ${id}
  `;
  return c.json({ image_path: filePath });
});
stageRoutes.delete("/stages/:id/image", async (c) => {
  const id = c.req.param("id");
  const [stage] = await sql`SELECT image_path FROM stages WHERE id = ${id}`;
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  if (!stage.image_path) return c.json({ error: "No image to delete" }, 400);
  const { deleteUploadedFile: deleteUploadedFile2 } = await Promise.resolve().then(() => (init_fileStorage(), fileStorage_exports));
  await deleteUploadedFile2(stage.image_path);
  await sql`UPDATE stages SET image_path = NULL, updated_at = NOW() WHERE id = ${id}`;
  return c.json({ deleted: true });
});

// ../backend/src/routes/shooters.ts
init_client();

// ../backend/src/utils/unaccent.ts
init_client();
var unaccentAvailable = null;
async function isUnaccentAvailable() {
  if (unaccentAvailable !== null) return unaccentAvailable;
  try {
    await sql`SELECT unaccent('test')`;
    unaccentAvailable = true;
  } catch {
    unaccentAvailable = false;
    console.log("[DB] unaccent extension not available, diacritic-insensitive search disabled");
  }
  return unaccentAvailable;
}

// ../backend/src/routes/shooters.ts
var shooterRoutes = new Hono2();
shooterRoutes.get("/", async (c) => {
  const search = c.req.query("search") || "";
  const limitParam = c.req.query("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 0;
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const includeDeleted = c.req.query("include_deleted") === "true";
  const deletedOnly = c.req.query("deleted_only") === "true";
  let deletedFilter;
  if (deletedOnly) {
    deletedFilter = "AND deleted_at IS NOT NULL";
  } else if (includeDeleted) {
    deletedFilter = "";
  } else {
    deletedFilter = "AND deleted_at IS NULL";
  }
  let shooters;
  let total;
  if (search) {
    const pattern = `%${search}%`;
    const useUnaccent = await isUnaccentAvailable();
    if (useUnaccent) {
      if (limit > 0) {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
             OR unaccent(last_name) ILIKE unaccent(${pattern})
             OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
             OR unaccent(last_name) ILIKE unaccent(${pattern})
             OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
        `;
      }
      const [count] = await sql`
        SELECT COUNT(*) as count FROM shooters
        WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
           OR unaccent(last_name) ILIKE unaccent(${pattern})
           OR email ILIKE ${pattern})
        ${sql.unsafe(deletedFilter)}
      `;
      total = Number(count.count);
    } else {
      if (limit > 0) {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
        `;
      }
      const [count] = await sql`
        SELECT COUNT(*) as count FROM shooters
        WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
        ${sql.unsafe(deletedFilter)}
      `;
      total = Number(count.count);
    }
  } else {
    if (limit > 0) {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE 1=1 ${sql.unsafe(deletedFilter)}
        ORDER BY last_name, first_name
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE 1=1 ${sql.unsafe(deletedFilter)}
        ORDER BY last_name, first_name
      `;
    }
    const [count] = await sql`SELECT COUNT(*) as count FROM shooters WHERE 1=1 ${sql.unsafe(deletedFilter)}`;
    total = Number(count.count);
  }
  return c.json({ shooters, total, limit, offset });
});
shooterRoutes.get("/tags", async (c) => {
  const tags = await sql`
    SELECT DISTINCT tag FROM shooters
    WHERE tag IS NOT NULL AND tag != '' AND deleted_at IS NULL
    ORDER BY tag
  `;
  return c.json(tags.map((t) => t.tag));
});
shooterRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email } = body;
  if (!first_name || !last_name || !category || !division || !power_factor || !region) {
    return c.json({ error: "first_name, last_name, category, division, power_factor, and region are required" }, 400);
  }
  const [shooter] = await sql`
    INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
    VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
    RETURNING *
  `;
  await audit(c, "shooter.create", `shooters:${shooter.id}`, { name: `${first_name} ${last_name}` });
  return c.json(shooter, 201);
});
shooterRoutes.put("/bulk", async (c) => {
  const { shooterIds, updates } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: "shooterIds must be a non-empty array" }, 400);
  }
  const setClauses = [];
  if (updates.division) setClauses.push(`division = '${updates.division}'`);
  if (updates.category) setClauses.push(`category = '${updates.category}'`);
  if (updates.power_factor) setClauses.push(`power_factor = '${updates.power_factor}'`);
  if (updates.tag !== void 0) setClauses.push(`tag = '${updates.tag || null}'`);
  if (setClauses.length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }
  const updated = await sql`
    UPDATE shooters SET ${sql.unsafe(setClauses.join(", "))}, updated_at = NOW()
    WHERE id = ANY(${shooterIds}::uuid[]) AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;
  const failedIds = shooterIds.filter((id) => !updated.find((u) => u.id === id));
  const failed = failedIds.map((id) => ({ id, name: "", reason: "Shooter not found or already deleted" }));
  return c.json({ updated: updated.length, failed });
});
shooterRoutes.delete("/bulk", async (c) => {
  const { shooterIds } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: "shooterIds must be a non-empty array" }, 400);
  }
  const result = await sql`
    UPDATE shooters SET deleted_at = NOW()
    WHERE id = ANY(${shooterIds}::uuid[]) AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;
  const updatedIds = new Set(result.map((r) => r.id));
  const failedIds = shooterIds.filter((id) => !updatedIds.has(id));
  let failed = [];
  if (failedIds.length > 0) {
    const failedShooters = await sql`
      SELECT id, first_name, last_name, deleted_at FROM shooters WHERE id = ANY(${failedIds}::uuid[])
    `;
    failed = failedShooters.map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      reason: s.deleted_at ? "Already deleted" : "Not found"
    }));
  }
  return c.json({ deleted: result.length, failed });
});
shooterRoutes.get("/:id/matches", async (c) => {
  const id = c.req.param("id");
  const registrations = await sql`
    SELECT mr.id as registration_id, m.id as match_id, m.name as match_name, m.date,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category
    FROM match_registrations mr
    JOIN matches m ON m.id = mr.match_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.shooter_id = ${id}
    ORDER BY m.date DESC
  `;
  return c.json(registrations);
});
shooterRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [shooter] = await sql`SELECT * FROM shooters WHERE id = ${id}`;
  if (!shooter) return c.json({ error: "Shooter not found" }, 404);
  const history = await sql`
    SELECT mr.id, mr.match_id, m.name as match_name, m.date, mr.division, mr.category, mr.power_factor, mr.is_dq
    FROM match_registrations mr
    JOIN matches m ON m.id = mr.match_id
    WHERE mr.shooter_id = ${id}
    ORDER BY m.date DESC
  `;
  return c.json({ ...shooter, match_history: history });
});
shooterRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email } = body;
  const [updated] = await sql`
    UPDATE shooters
    SET first_name = COALESCE(${first_name}, first_name),
        last_name = COALESCE(${last_name}, last_name),
        category = COALESCE(${category}, category),
        tag = ${tag !== void 0 ? tag : sql`tag`},
        division = COALESCE(${division}, division),
        power_factor = COALESCE(${power_factor}, power_factor),
        region = COALESCE(${region}, region),
        email = ${email !== void 0 ? email : sql`email`},
        updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `;
  if (!updated) {
    const [existing] = await sql`SELECT id FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: "Shooter not found" }, 404);
    return c.json({ error: "Shooter is deleted and cannot be edited" }, 410);
  }
  await audit(c, "shooter.update", `shooters:${id}`);
  return c.json(updated);
});
shooterRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`
    UPDATE shooters SET deleted_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;
  if (result.length === 0) {
    const [existing] = await sql`SELECT id FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: "Shooter not found" }, 404);
    return c.json({ error: "Shooter already deleted" }, 410);
  }
  await audit(c, "shooter.delete", `shooters:${id}`);
  return c.json({ deleted: true });
});
shooterRoutes.post("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const [shooter] = await sql`
    UPDATE shooters SET deleted_at = NULL, updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NOT NULL
    RETURNING *
  `;
  if (!shooter) {
    const [existing] = await sql`SELECT id, deleted_at FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: "Shooter not found" }, 404);
    return c.json({ error: "Shooter is not deleted" }, 400);
  }
  await audit(c, "shooter.restore", `shooters:${id}`);
  return c.json(shooter);
});

// ../backend/src/routes/registrations.ts
init_client();
var registrationRoutes = new Hono2();
function scrubPII(row, isPublic) {
  if (!isPublic) return row;
  const { email, region, winmss_member_id, ...rest } = row;
  return rest;
}
registrationRoutes.get("/matches/:matchId/registrations", async (c) => {
  const matchId = c.req.param("matchId");
  const role = c.get("authRole") || "anonymous";
  const isPublic = role === "anonymous";
  const registrations = await sql`
    SELECT mr.id, mr.squad, mr.group_id, mr.division as reg_division, mr.category as reg_category,
           mr.power_factor as reg_power_factor, mr.is_dq, mr.dq_reason,
           s.id as shooter_id, s.first_name, s.last_name, s.category, s.tag,
           s.division, s.power_factor, s.region, s.email
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
    ORDER BY mr.squad NULLS LAST, s.last_name, s.first_name
  `;
  const resolved = registrations.map((r) => ({
    ...scrubPII(r, isPublic),
    effective_division: r.reg_division || r.division,
    effective_category: r.reg_category || r.category,
    effective_power_factor: r.reg_power_factor || r.power_factor
  }));
  return c.json(resolved);
});
registrationRoutes.post("/matches/:matchId/registrations/group", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const { registrationIds } = body;
  if (!Array.isArray(registrationIds) || registrationIds.length < 2) {
    return c.json({ error: "registrationIds must be a non-empty array with at least 2 entries" }, 400);
  }
  const groupId = crypto.randomUUID();
  for (const regId of registrationIds) {
    await sql`
      UPDATE match_registrations
      SET group_id = ${groupId}
      WHERE id = ${regId} AND match_id = ${matchId}
    `;
  }
  await audit(c, "registration.group.create", `registrations:${matchId}`, { groupId, registrationIds });
  return c.json({ group_id: groupId }, 201);
});
registrationRoutes.put("/matches/:matchId/registrations/group/:groupId/add", async (c) => {
  const { matchId, groupId } = c.req.param();
  const body = await c.req.json();
  const { registrationIds } = body;
  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: "registrationIds must be a non-empty array" }, 400);
  }
  for (const regId of registrationIds) {
    await sql`
      UPDATE match_registrations
      SET group_id = ${groupId}
      WHERE id = ${regId} AND match_id = ${matchId}
    `;
  }
  await audit(c, "registration.group.add", `registrations:${matchId}`, { groupId, registrationIds });
  return c.body(null, 204);
});
registrationRoutes.delete("/matches/:matchId/registrations/group/:groupId", async (c) => {
  const { matchId, groupId } = c.req.param();
  await sql`
    UPDATE match_registrations
    SET group_id = NULL
    WHERE match_id = ${matchId} AND group_id = ${groupId}
  `;
  await audit(c, "registration.group.delete", `registrations:${matchId}`, { groupId });
  return c.body(null, 204);
});
registrationRoutes.delete("/matches/:matchId/registrations/:id/group", async (c) => {
  const { matchId, id } = c.req.param();
  await sql`
    UPDATE match_registrations
    SET group_id = NULL
    WHERE id = ${id} AND match_id = ${matchId}
  `;
  await audit(c, "registration.group.remove", `registrations:${id}`);
  return c.body(null, 204);
});
registrationRoutes.post("/matches/:matchId/registrations", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const shooterIds = body.shooterIds || [body.shooterId];
  if (!shooterIds.length) {
    return c.json({ error: "shooterId or shooterIds required" }, 400);
  }
  const results = [];
  for (const shooterId of shooterIds) {
    try {
      const [reg] = await sql`
        INSERT INTO match_registrations (match_id, shooter_id, squad)
        VALUES (${matchId}, ${shooterId}, ${body.squad || null})
        RETURNING *
      `;
      results.push(reg);
    } catch (err) {
      if (err.code === "23505") {
        results.push({ shooter_id: shooterId, skipped: true });
      } else {
        throw err;
      }
    }
  }
  await audit(c, "registration.create", `registrations:${matchId}`, { shooterIds });
  return c.json(results, 201);
});
registrationRoutes.post("/matches/:matchId/registrations/create-and-add", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email, squad } = body;
  if (!first_name || !last_name || !category || !division || !power_factor || !region) {
    return c.json({ error: "Required shooter fields missing" }, 400);
  }
  const [shooter] = await sql`
    INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
    VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
    RETURNING *
  `;
  const [reg] = await sql`
    INSERT INTO match_registrations (match_id, shooter_id, squad)
    VALUES (${matchId}, ${shooter.id}, ${squad || null})
    RETURNING *
  `;
  await audit(c, "registration.create-and-add", `registrations:${matchId}`, { shooterId: shooter.id });
  return c.json({ shooter, registration: reg }, 201);
});
registrationRoutes.put("/matches/:matchId/registrations/bulk", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const { registrationIds, updates } = body;
  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: "registrationIds must be a non-empty array" }, 400);
  }
  if (!updates || typeof updates !== "object") {
    return c.json({ error: "updates object is required" }, 400);
  }
  const allowedFields = ["division", "category", "power_factor", "squad", "tag"];
  const updateFields = {};
  for (const field of allowedFields) {
    if (updates[field] !== void 0) {
      updateFields[field] = updates[field];
    }
  }
  if (Object.keys(updateFields).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  let updated = 0;
  const failed = [];
  for (const regId of registrationIds) {
    try {
      const [reg] = await sql`
        SELECT mr.id, mr.shooter_id, mr.division, mr.category, mr.power_factor,
               s.first_name, s.last_name
        FROM match_registrations mr
        JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId} AND mr.match_id = ${matchId}
      `;
      if (!reg) {
        failed.push({ id: regId, name: regId, reason: "Not found in this match" });
        continue;
      }
      let squadTargetIds = [regId];
      if (updateFields.squad !== void 0 && reg.group_id) {
        const siblings = await sql`
          SELECT id FROM match_registrations
          WHERE match_id = ${matchId} AND group_id = ${reg.group_id} AND id != ${regId}
        `;
        squadTargetIds = [regId, ...siblings.map((s) => s.id)];
      }
      for (const targetId of squadTargetIds) {
        await sql`
          UPDATE match_registrations
          SET division = ${updateFields.division !== void 0 ? updateFields.division : sql`division`},
              category = ${updateFields.category !== void 0 ? updateFields.category : sql`category`},
              power_factor = ${updateFields.power_factor !== void 0 ? updateFields.power_factor : sql`power_factor`},
              squad = ${updateFields.squad !== void 0 ? updateFields.squad : sql`squad`}
          WHERE id = ${targetId}
        `;
      }
      const shooterUpdates = [];
      const shooterValues = [];
      if (updateFields.division !== void 0 && reg.division === null && updateFields.division !== null && updateFields.division !== "") {
        shooterUpdates.push("division");
        shooterValues.push(updateFields.division);
      }
      if (updateFields.category !== void 0 && reg.category === null && updateFields.category !== null && updateFields.category !== "") {
        shooterUpdates.push("category");
        shooterValues.push(updateFields.category);
      }
      if (updateFields.power_factor !== void 0 && reg.power_factor === null && updateFields.power_factor !== null && updateFields.power_factor !== "") {
        shooterUpdates.push("power_factor");
        shooterValues.push(updateFields.power_factor);
      }
      if (updateFields.tag !== void 0) {
        shooterUpdates.push("tag");
        shooterValues.push(updateFields.tag);
      }
      if (shooterUpdates.length > 0 && reg.shooter_id) {
        const setClauses = shooterUpdates.map((f, i) => `${f} = $${i + 1}`).join(", ");
        shooterValues.push(reg.shooter_id, (/* @__PURE__ */ new Date()).toISOString());
        const query = `UPDATE shooters SET ${setClauses}, updated_at = $${shooterValues.length} WHERE id = $${shooterValues.length - 1}`;
        await sql.unsafe(query, shooterValues);
      }
      updated++;
    } catch {
      const [reg] = await sql`
        SELECT s.first_name, s.last_name
        FROM match_registrations mr JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId}
      `;
      failed.push({ id: regId, name: reg ? `${reg.first_name} ${reg.last_name}` : regId, reason: "Update failed" });
    }
  }
  return c.json({ updated, failed });
});
registrationRoutes.delete("/matches/:matchId/registrations/bulk", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.json();
  const { registrationIds } = body;
  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: "registrationIds must be a non-empty array" }, 400);
  }
  let removed = 0;
  const failed = [];
  for (const regId of registrationIds) {
    try {
      const [reg] = await sql`
        SELECT mr.id, s.first_name, s.last_name
        FROM match_registrations mr
        JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId} AND mr.match_id = ${matchId}
      `;
      if (!reg) {
        failed.push({ id: regId, name: regId, reason: "Not found in this match" });
        continue;
      }
      const result = await sql`DELETE FROM match_registrations WHERE id = ${regId} AND match_id = ${matchId} RETURNING id`;
      if (result.length > 0) {
        removed++;
      } else {
        failed.push({ id: regId, name: `${reg.first_name} ${reg.last_name}`, reason: "Not found" });
      }
    } catch {
      const [reg] = await sql`
        SELECT s.first_name, s.last_name
        FROM match_registrations mr JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId}
      `;
      failed.push({ id: regId, name: reg ? `${reg.first_name} ${reg.last_name}` : regId, reason: "Remove failed" });
    }
  }
  return c.json({ removed, failed });
});
registrationRoutes.put("/matches/:matchId/registrations/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { division, category, power_factor, squad, tag } = body;
  const [prior] = await sql`
    SELECT division, category, power_factor, shooter_id, group_id
    FROM match_registrations WHERE id = ${id}
  `;
  if (!prior) return c.json({ error: "Registration not found" }, 404);
  const [updated] = await sql`
    UPDATE match_registrations
    SET division = ${division !== void 0 ? division : sql`division`},
        category = ${category !== void 0 ? category : sql`category`},
        power_factor = ${power_factor !== void 0 ? power_factor : sql`power_factor`},
        squad = ${squad !== void 0 ? squad : sql`squad`}
    WHERE id = ${id}
    RETURNING *
  `;
  if (squad !== void 0 && prior.group_id) {
    const [reg] = await sql`SELECT match_id FROM match_registrations WHERE id = ${id}`;
    if (reg) {
      await sql`
        UPDATE match_registrations
        SET squad = ${squad}
        WHERE match_id = ${reg.match_id} AND group_id = ${prior.group_id} AND id != ${id}
      `;
    }
  }
  const shooterUpdates = [];
  const shooterValues = [];
  if (division !== void 0 && prior.division === null && division !== null && division !== "") {
    shooterUpdates.push("division");
    shooterValues.push(division);
  }
  if (category !== void 0 && prior.category === null && category !== null && category !== "") {
    shooterUpdates.push("category");
    shooterValues.push(category);
  }
  if (power_factor !== void 0 && prior.power_factor === null && power_factor !== null && power_factor !== "") {
    shooterUpdates.push("power_factor");
    shooterValues.push(power_factor);
  }
  if (tag !== void 0) {
    shooterUpdates.push("tag");
    shooterValues.push(tag);
  }
  if (shooterUpdates.length > 0 && prior.shooter_id) {
    const setClauses = shooterUpdates.map((field, i) => `${field} = $${i + 1}`).join(", ");
    shooterValues.push(prior.shooter_id, (/* @__PURE__ */ new Date()).toISOString());
    const query = `UPDATE shooters SET ${setClauses}, updated_at = $${shooterValues.length} WHERE id = $${shooterValues.length - 1}`;
    await sql.unsafe(query, shooterValues);
  }
  return c.json(updated);
});
registrationRoutes.delete("/matches/:matchId/registrations/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`DELETE FROM match_registrations WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: "Registration not found" }, 404);
  await audit(c, "registration.delete", `registrations:${id}`);
  return c.json({ deleted: true });
});
registrationRoutes.get("/matches/:matchId/squads", async (c) => {
  const matchId = c.req.param("matchId");
  const squads = await sql`
    SELECT mr.squad, COUNT(*) as shooter_count
    FROM match_registrations mr
    WHERE mr.match_id = ${matchId} AND mr.squad IS NOT NULL
    GROUP BY mr.squad
    ORDER BY mr.squad
  `;
  const unassigned = await sql`
    SELECT COUNT(*) as count FROM match_registrations
    WHERE match_id = ${matchId} AND squad IS NULL
  `;
  return c.json({
    squads: squads.map((s) => ({ squad: s.squad, shooter_count: Number(s.shooter_count) })),
    unassigned_count: Number(unassigned[0].count)
  });
});
registrationRoutes.get("/matches/:matchId/registrations/export/csv", async (c) => {
  const matchId = c.req.param("matchId");
  const [match2] = await sql`SELECT id, name FROM matches WHERE id = ${matchId}`;
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const registrations = await sql`
    SELECT mr.squad,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           COALESCE(mr.power_factor, s.power_factor) as power_factor,
           s.first_name, s.last_name
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
    ORDER BY mr.squad NULLS LAST, s.last_name, s.first_name
  `;
  let csv = "\uFEFF";
  csv += "first_name;last_name;squad;division;category;power_factor\n";
  for (const r of registrations) {
    const squad = r.squad ?? "";
    const division = r.division ?? "";
    const category = r.category ?? "";
    const powerFactor = r.power_factor ?? "";
    csv += `${r.first_name};${r.last_name};${squad};${division};${category};${powerFactor}
`;
  }
  const sanitized = match2.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${sanitized}_registrations.csv"`);
  return c.body(csv);
});
registrationRoutes.put("/matches/:matchId/registrations/:id/dq", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { dq_reason } = body;
  const [updated] = await sql`
    UPDATE match_registrations SET is_dq = TRUE, dq_reason = ${dq_reason || null}
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: "Registration not found" }, 404);
  await sql`
    UPDATE stage_scores SET stage_points = 0, stage_percent = 0
    WHERE registration_id = ${id}
  `;
  await audit(c, "registration.dq", `registrations:${id}`, { dq_reason });
  return c.json(updated);
});
registrationRoutes.put("/matches/:matchId/registrations/:id/undq", async (c) => {
  const { matchId, id } = c.req.param();
  const [updated] = await sql`
    UPDATE match_registrations SET is_dq = FALSE, dq_reason = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: "Registration not found" }, 404);
  const stages = await sql`SELECT id FROM stages WHERE match_id = ${matchId}`;
  for (const stage of stages) {
    const [stageRow] = await sql`SELECT * FROM stages WHERE id = ${stage.id}`;
    if (!stageRow) continue;
    const stageConfig = typeof stageRow.config === "string" ? JSON.parse(stageRow.config) : stageRow.config || {};
    const scores = await sql`
      SELECT ss.id, ss.hit_factor, ss.net_points, ss.total_time, ss.x_count, ss.registration_id,
             COALESCE(mr.division, s.division) as division
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE AND ss.is_dnf = FALSE
    `;
    const scoringType = stageRow.scoring_type;
    const maxPoints = Number(stageRow.max_points);
    const divisionGroups = /* @__PURE__ */ new Map();
    for (const score of scores) {
      const div = score.division || "unknown";
      if (!divisionGroups.has(div)) divisionGroups.set(div, []);
      divisionGroups.get(div).push(score);
    }
    for (const [, divScores] of divisionGroups) {
      if (["comstock", "virginia", "hit_factor"].includes(scoringType)) {
        const highestHF = Math.max(0, ...divScores.map((s) => Number(s.hit_factor)));
        for (const score of divScores) {
          const stagePercent = highestHF > 0 ? Math.round(Number(score.hit_factor) / highestHF * 1e6) / 1e4 : 0;
          const stagePoints = Math.round(stagePercent / 100 * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else if (scoringType === "fixed_time") {
        const highestNP = Math.max(0, ...divScores.map((s) => Number(s.net_points)));
        for (const score of divScores) {
          const stagePercent = highestNP > 0 ? Math.round(Number(score.net_points) / highestNP * 1e6) / 1e4 : 0;
          const stagePoints = Math.round(stagePercent / 100 * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else if (["idpa", "action_steel", "multi_gun"].includes(scoringType)) {
        const validTimes = divScores.map((s) => Number(s.total_time)).filter((t) => t > 0);
        const lowestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
        for (const score of divScores) {
          const stagePercent = lowestTime > 0 ? Math.round(lowestTime / Number(score.total_time) * 1e6) / 1e4 : 0;
          const stagePoints = Math.round(stagePercent / 100 * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else {
        const highestNP = Math.max(0, ...divScores.map((s) => Number(s.net_points)));
        for (const score of divScores) {
          const stagePercent = highestNP > 0 ? Math.round(Number(score.net_points) / highestNP * 1e6) / 1e4 : 0;
          const stagePoints = Math.round(stagePercent / 100 * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      }
    }
    await sql`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
    `;
    await sql`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stage.id} AND is_dnf = TRUE
    `;
  }
  await audit(c, "registration.undq", `registrations:${id}`);
  return c.json(updated);
});

// ../backend/src/routes/scoring.ts
init_client();
init_scoringCalc();

// ../backend/src/services/events.ts
var EventBroadcaster = class {
  clients = /* @__PURE__ */ new Set();
  add(matchId, stream2) {
    const conn = { matchId, stream: stream2 };
    this.clients.add(conn);
    console.log("[SSE] client connected", { matchId, total: this.clients.size });
    stream2.onAbort(() => {
      console.log("[SSE] client disconnected", { matchId, total: this.clients.size - 1 });
      this.clients.delete(conn);
    });
  }
  broadcast(event) {
    console.log("[SSE] broadcasting", event.type, event.payload, "to", this.clients.size, "clients");
    for (const conn of this.clients) {
      if (conn.matchId && event.payload && event.payload.matchId !== conn.matchId) {
        continue;
      }
      this.write(conn.stream, event);
    }
  }
  getClientCount() {
    return this.clients.size;
  }
  write(stream2, event) {
    if (stream2.aborted) return;
    stream2.writeSSE({
      event: event.type,
      data: JSON.stringify(event.payload)
    }).catch(() => {
    });
  }
};
var eventBroadcaster = new EventBroadcaster();

// ../backend/src/routes/scoring.ts
var scoringRoutes = new Hono2();
function parseJsonbFields(score) {
  if (!score) return score;
  const result = { ...score };
  if (typeof result.score_data === "string") {
    try {
      result.score_data = JSON.parse(result.score_data);
    } catch {
      result.score_data = {};
    }
  }
  if (typeof result.config === "string") {
    try {
      result.config = JSON.parse(result.config);
    } catch {
      result.config = {};
    }
  }
  return result;
}
function parseTargetJsonbFields(target) {
  if (!target) return target;
  const result = { ...target };
  if (typeof result.target_data === "string") {
    try {
      result.target_data = JSON.parse(result.target_data);
    } catch {
      result.target_data = {};
    }
  }
  return result;
}
scoringRoutes.get("/matches/:matchId/scoring-progress", async (c) => {
  const matchId = c.req.param("matchId");
  const scored = await sql`
    SELECT ss.stage_id, ss.registration_id, mr.squad
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    WHERE ss.match_id = ${matchId}
  `;
  return c.json({
    scored: scored.map((s) => ({
      stage_id: s.stage_id,
      registration_id: s.registration_id,
      squad: s.squad
    }))
  });
});
scoringRoutes.get("/matches/:matchId/stages/:stageId/scores", async (c) => {
  const { matchId, stageId } = c.req.param();
  const scores = await sql`
    SELECT ss.*, s.first_name, s.last_name, mr.squad,
           COALESCE(mr.power_factor, s.power_factor) as effective_pf,
           COALESCE(mr.division, s.division) as effective_division
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND ss.match_id = ${matchId}
    ORDER BY s.last_name, s.first_name
  `;
  return c.json(scores.map(parseJsonbFields));
});
scoringRoutes.get("/matches/:matchId/stages/:stageId/scores/:registrationId", async (c) => {
  const { matchId, stageId, registrationId } = c.req.param();
  const [score] = await sql`
    SELECT ss.* FROM stage_scores ss
    WHERE ss.stage_id = ${stageId} AND ss.registration_id = ${registrationId} AND ss.match_id = ${matchId}
  `;
  if (!score) return c.json({ error: "Score not found" }, 404);
  const targetScores = await sql`
    SELECT * FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
  `;
  const [chrono] = await sql`
    SELECT * FROM chrono_results WHERE stage_score_id = ${score.id}
  `;
  return c.json({ ...parseJsonbFields(score), targets: targetScores.map(parseTargetJsonbFields), chrono: chrono || null });
});
scoringRoutes.put("/matches/:matchId/stages/:stageId/scores/:registrationId", async (c) => {
  const { matchId, stageId, registrationId } = c.req.param();
  const body = await c.req.json();
  const {
    time,
    targets,
    procedural_count = 0,
    ftsa_count = 0,
    extra_shot_count = 0,
    extra_hit_count = 0,
    stacking_count = 0,
    overtime_shot_count = 0,
    is_dnf = false,
    chrono,
    score_data
  } = body;
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${stageId}`;
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  const scoringType = stage.scoring_type;
  const stageConfig = typeof stage.config === "string" ? JSON.parse(stage.config) : stage.config || {};
  const [reg] = await sql`
    SELECT mr.power_factor as reg_pf, s.power_factor as shooter_pf
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.id = ${registrationId}
  `;
  const powerFactor = reg?.reg_pf || reg?.shooter_pf || "minor";
  const sd = score_data || {};
  const isWinMSSImport = sd.source === "winmss" && sd.aggregated;
  let calcResult;
  let total_time = null;
  let x_count = 0;
  if (isWinMSSImport && (scoringType === "comstock" || scoringType === "virginia" || scoringType === "fixed_time" || scoringType === "hit_factor")) {
    const agg = sd.aggregated;
    calcResult = calculateAggregatedScore({
      total_alpha: agg.alpha || 0,
      total_charlie: agg.charlie || 0,
      total_delta: agg.delta || 0,
      total_miss: agg.miss || 0,
      total_no_shoot: agg.no_shoot || 0,
      total_steel: agg.steel_count || 0,
      steel_hit_count: agg.steel_count || 0,
      procedural_count: agg.procedural || procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      time,
      scoring_type: scoringType,
      power_factor: powerFactor
    });
  } else if (scoringType === "comstock" || scoringType === "virginia" || scoringType === "fixed_time") {
    calcResult = calculateScore({
      targets: targets.map((t) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper)
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: scoringType,
      power_factor: powerFactor,
      par_time: stage.par_time
    });
  } else if (scoringType === "hit_factor") {
    calcResult = calculateHitFactorScore({
      targets: targets.map((t) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper)
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: "comstock",
      power_factor: powerFactor,
      par_time: stage.par_time
    });
  } else if (scoringType === "idpa") {
    const sd2 = score_data || {};
    calcResult = calculateIDPAScore({
      targets: targets.map((t) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper)
      })),
      time: time || 0,
      penalty_pe: sd2.penalty_pe || 0,
      penalty_hnt: sd2.penalty_hnt || 0,
      penalty_ftn: sd2.penalty_ftn || 0,
      penalty_fp: sd2.penalty_fp || 0,
      penalty_ftdr: sd2.penalty_ftdr || 0
    });
    total_time = calcResult.total_time;
  } else if (scoringType === "action_steel") {
    const sd2 = score_data || {};
    calcResult = calculateActionSteelScore({
      string_times: sd2.string_times || [],
      string_plate_hits: sd2.string_plate_hits || [],
      number_of_strings: stageConfig.number_of_strings || 5,
      drop_worst: stageConfig.drop_worst ?? 1,
      miss_penalty: 3,
      stop_plate_miss_cap: 30
    });
    total_time = calcResult.total_time;
  } else if (scoringType === "multi_gun") {
    const sd2 = score_data || {};
    calcResult = calculateMultiGunScore({
      time: time || 0,
      targets: targets.map((t) => ({
        neutralized: t.target_data?.neutralized ?? false
      })),
      penalty_ftn_sec: sd2.penalty_ftn_sec || 0,
      penalty_miss_sec: sd2.penalty_miss_sec || 0,
      penalty_no_shoot_sec: sd2.penalty_no_shoot_sec || 0,
      penalty_procedural_sec: sd2.penalty_procedural_sec || 0
    });
    total_time = calcResult.total_time;
  } else if (scoringType === "bullseye" || scoringType === "archery" || scoringType === "long_range" && stageConfig.variant === "f_class") {
    const sd2 = score_data || {};
    const ringValues = sd2.ring_values || [];
    calcResult = calculateRingScore(ringValues);
    x_count = calcResult.x_count;
  } else if (scoringType === "nrl22" || scoringType === "long_range" && stageConfig.variant !== "f_class") {
    const hits = targets.filter((t) => t.target_data?.hit === true).length;
    const pointValue = stageConfig.point_value || 10;
    calcResult = calculateHitCountScore(hits, pointValue);
  } else if (scoringType === "chrono") {
    calcResult = { raw_points: 0, penalty_points: 0, net_points: 0, hit_factor: 0 };
  } else {
    calcResult = calculateScore({
      targets: targets.map((t) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper)
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: "comstock",
      power_factor: powerFactor,
      par_time: stage.par_time
    });
  }
  const scoreResult = await sql.begin(async (sql2) => {
    const [score] = await sql2`
      INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
        extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count,
        procedural_count, ftsa_count, is_dnf,
        raw_points, penalty_points, net_points, hit_factor,
        total_time, x_count, score_data)
      VALUES (${matchId}, ${stageId}, ${registrationId}, ${time ?? null},
        ${extra_shot_count}, ${extra_hit_count}, ${stacking_count}, ${overtime_shot_count},
        ${procedural_count}, ${ftsa_count}, ${is_dnf},
        ${calcResult.raw_points}, ${calcResult.penalty_points}, ${calcResult.net_points}, ${calcResult.hit_factor},
        ${total_time}, ${x_count}, ${JSON.stringify(score_data || {})})
      ON CONFLICT (stage_id, registration_id) DO UPDATE SET
        time = ${time ?? null},
        extra_shot_count = ${extra_shot_count},
        extra_hit_count = ${extra_hit_count},
        stacking_count = ${stacking_count},
        overtime_shot_count = ${overtime_shot_count},
        procedural_count = ${procedural_count},
        ftsa_count = ${ftsa_count},
        is_dnf = ${is_dnf},
        raw_points = ${calcResult.raw_points},
        penalty_points = ${calcResult.penalty_points},
        net_points = ${calcResult.net_points},
        hit_factor = ${calcResult.hit_factor},
        total_time = ${total_time},
        x_count = ${x_count},
        score_data = ${JSON.stringify(score_data || {})},
        updated_at = NOW()
      RETURNING *
    `;
    for (const t of targets) {
      const targetData = t.target_data ? JSON.stringify(t.target_data) : "{}";
      await sql2`
        INSERT INTO target_scores (stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data)
        VALUES (${score.id}, ${t.target_index}, ${t.target_type}, ${t.alpha || 0}, ${t.charlie || 0}, ${t.delta || 0}, ${t.miss || 0}, ${t.no_shoot_hits || 0}, ${t.steel_hit !== void 0 ? t.steel_hit : null}, ${targetData}::jsonb)
        ON CONFLICT (stage_score_id, target_index) DO UPDATE SET
          alpha = ${t.alpha || 0}, charlie = ${t.charlie || 0}, delta = ${t.delta || 0},
          miss = ${t.miss || 0}, no_shoot_hits = ${t.no_shoot_hits || 0},
          steel_hit = ${t.steel_hit !== void 0 ? t.steel_hit : null},
          target_data = ${targetData}::jsonb
      `;
    }
    if (chrono && scoringType === "chrono") {
      const { calculateChronoPf: calculateChronoPf2, checkPfPassed: checkPfPassed2 } = await Promise.resolve().then(() => (init_scoringCalc(), scoringCalc_exports));
      const chronoResult = calculateChronoPf2(chrono.bullet_weight, chrono.velocity_1, chrono.velocity_2, chrono.velocity_3);
      const [match2] = await sql2`SELECT organization FROM matches WHERE id = ${matchId}`;
      const pfCheck = checkPfPassed2(chronoResult.calculatedPf, powerFactor, match2.organization);
      await sql2`
        INSERT INTO chrono_results (stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3,
                                     avg_velocity, calculated_pf, pf_passed)
        VALUES (${score.id}, ${chrono.bullet_weight}, ${chrono.velocity_1 || null}, ${chrono.velocity_2 || null},
                ${chrono.velocity_3 || null}, ${chronoResult.avgVelocity}, ${chronoResult.calculatedPf}, ${pfCheck.passed})
        ON CONFLICT (stage_score_id) DO UPDATE SET
          bullet_weight = ${chrono.bullet_weight},
          velocity_1 = ${chrono.velocity_1 || null},
          velocity_2 = ${chrono.velocity_2 || null},
          velocity_3 = ${chrono.velocity_3 || null},
          avg_velocity = ${chronoResult.avgVelocity},
          calculated_pf = ${chronoResult.calculatedPf},
          pf_passed = ${pfCheck.passed},
          updated_at = NOW()
      `;
      if (pfCheck.reclassifyTo) {
        await sql2`
          UPDATE match_registrations SET power_factor = ${pfCheck.reclassifyTo}
          WHERE id = ${registrationId}
        `;
      }
    }
    return score;
  });
  await recalculateStage(matchId, stageId);
  eventBroadcaster.broadcast({
    type: "score:saved",
    payload: { matchId, stageId, registrationId }
  });
  await audit(c, "score.write", `stage_scores:${stageId}:${registrationId}`, { matchId, stageId, registrationId });
  return c.json({ ...parseJsonbFields(scoreResult), targets: targets.map(parseTargetJsonbFields), calcResult });
});
scoringRoutes.post("/matches/:matchId/stages/:stageId/recalculate", async (c) => {
  const { matchId, stageId } = c.req.param();
  await recalculateStage(matchId, stageId);
  eventBroadcaster.broadcast({
    type: "score:saved",
    payload: { matchId, stageId, registrationId: null }
  });
  await audit(c, "score.recalculate-stage", `stages:${stageId}`, { matchId });
  return c.json({ recalculated: true });
});
scoringRoutes.post("/matches/:matchId/recalculate", async (c) => {
  const matchId = c.req.param("matchId");
  const stages = await sql`SELECT id FROM stages WHERE match_id = ${matchId}`;
  for (const stage of stages) {
    await recalculateStage(matchId, stage.id);
  }
  eventBroadcaster.broadcast({
    type: "score:saved",
    payload: { matchId, stageId: null, registrationId: null }
  });
  await audit(c, "score.recalculate-match", `matches:${matchId}`, { stage_count: stages.length });
  return c.json({ recalculated: true, stage_count: stages.length });
});
async function recalculateStage(matchId, stageId) {
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${stageId}`;
  const stageConfig = typeof stage.config === "string" ? JSON.parse(stage.config) : stage.config || {};
  const scoringType = stage.scoring_type;
  const maxPoints = Number(stage.max_points);
  await sql.begin(async (sql2) => {
    if (["comstock", "virginia", "hit_factor"].includes(scoringType)) {
      await sql2`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.hit_factor) as best_hf
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    } else if (scoringType === "fixed_time") {
      await sql2`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    } else if (["idpa", "action_steel", "multi_gun"].includes(scoringType)) {
      await sql2`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MIN(ss2.total_time) as lowest_time
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND ss2.total_time > 0
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    } else if (["bullseye", "archery"].includes(scoringType) || scoringType === "long_range" && stageConfig.variant === "f_class") {
      await sql2`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    } else if (["nrl22"].includes(scoringType) || scoringType === "long_range" && stageConfig.variant !== "f_class") {
      await sql2`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    }
    await sql2`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    `;
    await sql2`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stageId} AND is_dnf = TRUE
    `;
  });
}

// ../backend/src/routes/results.ts
init_client();
var resultsRoutes = new Hono2();
function matchCte(isDq) {
  const dqFilter = isDq ? "AND mr.is_dq = TRUE" : "AND mr.is_dq = FALSE";
  return `
    WITH stage_totals AS (
      SELECT
        ss.registration_id,
        SUM(ss.stage_points) as match_points,
        SUM(ss.procedural_count) as procedurals,
        SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
      FROM stage_scores ss
      JOIN stages st ON st.id = ss.stage_id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    ),
    target_totals AS (
      SELECT
        ss.registration_id,
        SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
        SUM(ts.charlie) as charlie,
        SUM(ts.delta) as delta,
        SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
        SUM(ts.no_shoot_hits) as no_shoot
      FROM stage_scores ss
      JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    )
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      ${isDq ? "mr.dq_reason," : ""}
      COALESCE(st.match_points, 0) as match_points,
      COALESCE(st.total_time, 0) as time,
      COALESCE(tt.alpha, 0) as alpha,
      COALESCE(tt.charlie, 0) as charlie,
      COALESCE(tt.delta, 0) as delta,
      COALESCE(tt.miss, 0) as miss,
      COALESCE(tt.no_shoot, 0) as no_shoot,
      COALESCE(st.procedurals, 0) as procedurals
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_totals st ON st.registration_id = mr.id
    LEFT JOIN target_totals tt ON tt.registration_id = mr.id
    WHERE mr.match_id = $1 ${dqFilter}
  `;
}
async function runMatchQuery(matchId, isDq) {
  const query = matchCte(isDq);
  const order = isDq ? "ORDER BY s.last_name, s.first_name" : "ORDER BY match_points DESC";
  return sql.unsafe(query.replace(/\$1/g, `'${matchId}'`) + "\n" + order);
}
resultsRoutes.get("/matches/:matchId/results/overall", async (c) => {
  const matchId = c.req.param("matchId");
  const results = await runMatchQuery(matchId, false);
  const highestPoints = results.length > 0 ? Number(results[0].match_points) : 0;
  const ranked = results.map((r, i) => ({
    ...r,
    position: i + 1,
    match_points: Number(r.match_points),
    match_percent: highestPoints > 0 ? Math.round(Number(r.match_points) / highestPoints * 1e4) / 100 : 0
  }));
  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0
  }));
  return c.json({ results: ranked, dq: dqRanked });
});
resultsRoutes.get("/matches/:matchId/results/divisions", async (c) => {
  const matchId = c.req.param("matchId");
  const results = await runMatchQuery(matchId, false);
  const divisionResults = {};
  const divisionGroups = {};
  for (const r of results) {
    const div = r.division || "unknown";
    if (!divisionGroups[div]) divisionGroups[div] = [];
    divisionGroups[div].push(r);
  }
  for (const [division, shooters] of Object.entries(divisionGroups)) {
    const highestPoints = shooters.length > 0 ? Number(shooters[0].match_points) : 0;
    divisionResults[division] = shooters.map((r, i) => ({
      ...r,
      position: i + 1,
      match_points: Number(r.match_points),
      match_percent: highestPoints > 0 ? Math.round(Number(r.match_points) / highestPoints * 1e4) / 100 : 0
    }));
  }
  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0
  }));
  return c.json({ ...divisionResults, dq: dqRanked });
});
resultsRoutes.get("/matches/:matchId/results/stages", async (c) => {
  const matchId = c.req.param("matchId");
  const stages = await sql`SELECT id, stage_number, name FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;
  const stageResults = [];
  for (const stage of stages) {
    const scores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq
      ORDER BY division, ss.stage_points DESC
    `;
    const normalizedScores = scores.map((s) => ({
      ...s,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      stage_percent: Number(s.stage_percent),
      stage_points: Number(s.stage_points),
      time: s.time != null ? Number(s.time) : null
    }));
    const divisionGroups = {};
    for (const s of normalizedScores) {
      const div = s.division || "unknown";
      if (!divisionGroups[div]) divisionGroups[div] = [];
      divisionGroups[div].push(s);
    }
    const groupedScores = [];
    for (const [division, divScores] of Object.entries(divisionGroups)) {
      divScores.forEach((s, i) => {
        groupedScores.push({
          ...s,
          position: i + 1,
          division_position: i + 1
        });
      });
    }
    groupedScores.sort((a, b2) => b2.stage_points - a.stage_points);
    groupedScores.forEach((s, i) => {
      s.position = i + 1;
    });
    const dqScores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time, ss.procedural_count,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq, mr.dq_reason,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.time, ss.procedural_count,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq, mr.dq_reason
      ORDER BY s.last_name, s.first_name
    `;
    stageResults.push({
      stage_id: stage.id,
      stage_number: stage.stage_number,
      stage_name: stage.name,
      scores: groupedScores,
      dq_scores: dqScores.map((s) => ({
        ...s,
        hit_factor: Number(s.hit_factor),
        net_points: Number(s.net_points),
        time: Number(s.time),
        procedural_count: Number(s.procedural_count)
      })),
      divisions: Object.fromEntries(
        Object.entries(divisionGroups).map(([div, divScores]) => [
          div,
          divScores.map((s, i) => ({
            ...s,
            position: i + 1
          }))
        ])
      )
    });
  }
  return c.json(stageResults);
});
resultsRoutes.get("/matches/:matchId/results/stages/:stageId", async (c) => {
  const { matchId, stageId } = c.req.param();
  const scores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = FALSE
    ORDER BY ss.stage_points DESC
  `;
  const dqScores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq, mr.dq_reason
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    ORDER BY s.last_name, s.first_name
  `;
  return c.json({
    results: scores.map((s, i) => ({
      ...s,
      position: i + 1,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      stage_percent: Number(s.stage_percent),
      stage_points: Number(s.stage_points),
      time: s.time !== null && s.time !== void 0 ? Number(s.time) : null
    })),
    dq: dqScores.map((s) => ({
      ...s,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      time: Number(s.time)
    }))
  });
});
resultsRoutes.get("/matches/:matchId/results/categories", async (c) => {
  const matchId = c.req.param("matchId");
  const categories = ["regular", "junior", "senior", "super_senior", "lady"];
  const categoryResults = {};
  for (const cat of categories) {
    const query = `
      WITH stage_totals AS (
        SELECT
          ss.registration_id,
          SUM(ss.stage_points) as match_points,
          SUM(ss.procedural_count) as procedurals,
          SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
        FROM stage_scores ss
        JOIN stages st ON st.id = ss.stage_id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      ),
      target_totals AS (
        SELECT
          ss.registration_id,
          SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
          SUM(ts.charlie) as charlie,
          SUM(ts.delta) as delta,
          SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
          SUM(ts.no_shoot_hits) as no_shoot
        FROM stage_scores ss
        JOIN target_scores ts ON ts.stage_score_id = ss.id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      )
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot,
        COALESCE(st.procedurals, 0) as procedurals
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND COALESCE(mr.category, s.category) = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${cat}'`));
    if (results.length > 0) {
      const byDivision = {};
      for (const r of results) {
        const div = r.division || "unknown";
        if (!byDivision[div]) byDivision[div] = [];
        byDivision[div].push(r);
      }
      categoryResults[cat] = {};
      for (const [div, divResults] of Object.entries(byDivision)) {
        const highest = Number(divResults[0].match_points);
        categoryResults[cat][div] = divResults.map((r, i) => ({
          ...r,
          position: i + 1,
          match_points: Number(r.match_points),
          match_percent: highest > 0 ? Math.round(Number(r.match_points) / highest * 1e4) / 100 : 0
        }));
      }
    }
  }
  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0
  }));
  return c.json({ ...categoryResults, dq: dqRanked });
});
resultsRoutes.get("/matches/:matchId/results/tags", async (c) => {
  const matchId = c.req.param("matchId");
  const tags = await sql`
    SELECT DISTINCT s.tag FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId} AND s.tag IS NOT NULL AND s.tag != ''
    ORDER BY s.tag
  `;
  const tagResults = {};
  for (const { tag } of tags) {
    const query = `
      WITH stage_totals AS (
        SELECT
          ss.registration_id,
          SUM(ss.stage_points) as match_points,
          SUM(ss.procedural_count) as procedurals,
          SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
        FROM stage_scores ss
        JOIN stages st ON st.id = ss.stage_id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      ),
      target_totals AS (
        SELECT
          ss.registration_id,
          SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
          SUM(ts.charlie) as charlie,
          SUM(ts.delta) as delta,
          SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
          SUM(ts.no_shoot_hits) as no_shoot
        FROM stage_scores ss
        JOIN target_scores ts ON ts.stage_score_id = ss.id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      )
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot,
        COALESCE(st.procedurals, 0) as procedurals
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND s.tag = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${tag}'`));
    if (results.length > 0) {
      const byDivision = {};
      for (const r of results) {
        const div = r.division || "unknown";
        if (!byDivision[div]) byDivision[div] = [];
        byDivision[div].push(r);
      }
      tagResults[tag] = {};
      for (const [div, divResults] of Object.entries(byDivision)) {
        const highest = Number(divResults[0].match_points);
        tagResults[tag][div] = divResults.map((r, i) => ({
          ...r,
          position: i + 1,
          match_points: Number(r.match_points),
          match_percent: highest > 0 ? Math.round(Number(r.match_points) / highest * 1e4) / 100 : 0
        }));
      }
    }
  }
  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0
  }));
  return c.json({ ...tagResults, dq: dqRanked });
});
resultsRoutes.get("/matches/:matchId/shooters/:registrationId/stage-summaries", async (c) => {
  const { matchId, registrationId } = c.req.param();
  const [reg] = await sql`
    SELECT mr.id, mr.division as reg_division, mr.category as reg_category, mr.power_factor as reg_power_factor,
           mr.is_dq,
           s.first_name, s.last_name, s.division as shooter_division, s.category as shooter_category, s.power_factor as shooter_power_factor
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.id = ${registrationId} AND mr.match_id = ${matchId}
  `;
  if (!reg) return c.json({ error: "Registration not found" }, 404);
  const registration = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: reg.reg_division || reg.shooter_division,
    category: reg.reg_category || reg.shooter_category,
    power_factor: reg.reg_power_factor || reg.shooter_power_factor,
    is_dq: reg.is_dq
  };
  const stages = await sql`SELECT * FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;
  const stageSummaries = [];
  for (const stage of stages) {
    const [score] = await sql`
      SELECT * FROM stage_scores WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
    `;
    if (!score) continue;
    const targets = await sql`
      SELECT target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data
      FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
    `;
    stageSummaries.push({
      stage: {
        id: stage.id,
        stage_number: stage.stage_number,
        name: stage.name,
        scoring_type: stage.scoring_type,
        paper_targets: stage.paper_targets,
        steel_targets: stage.steel_targets,
        no_shoot_targets: stage.no_shoot_targets,
        npm_targets: stage.npm_targets,
        hits_per_paper: stage.hits_per_paper,
        min_rounds: stage.min_rounds,
        max_points: stage.max_points,
        par_time: stage.par_time,
        briefing: stage.briefing,
        config: stage.config
      },
      score: {
        time: score.time,
        raw_points: Number(score.raw_points),
        penalty_points: Number(score.penalty_points),
        net_points: Number(score.net_points),
        hit_factor: Number(score.hit_factor),
        stage_percent: Number(score.stage_percent),
        stage_points: Number(score.stage_points),
        total_time: score.total_time != null ? Number(score.total_time) : null,
        x_count: score.x_count || 0,
        is_dnf: score.is_dnf,
        score_data: score.score_data || null,
        targets: targets.map((t) => ({
          target_index: t.target_index,
          target_type: t.target_type,
          alpha: t.alpha || 0,
          charlie: t.charlie || 0,
          delta: t.delta || 0,
          miss: t.miss || 0,
          no_shoot_hits: t.no_shoot_hits || 0,
          steel_hit: t.steel_hit,
          target_data: t.target_data || null
        }))
      }
    });
  }
  return c.json({ registration, stages: stageSummaries });
});

// ../backend/src/routes/uploads.ts
init_client();
var uploadRoutes = new Hono2();
uploadRoutes.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const [stage] = await sql`
    SELECT image_path FROM stages WHERE image_path LIKE ${"%" + filename}
  `;
  if (!stage || !stage.image_path) {
    return c.json({ error: "Image not found" }, 404);
  }
  try {
    const { readFile } = await import("fs/promises");
    const data = await readFile(stage.image_path);
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
    return c.body(data, 200, { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" });
  } catch {
    return c.json({ error: "Image file not found on disk" }, 404);
  }
});

// ../backend/src/routes/import.ts
init_client();

// ../node_modules/csv-parse/lib/api/CsvError.js
var CsvError = class _CsvError extends Error {
  constructor(code, message, options, ...contexts) {
    if (Array.isArray(message)) message = message.join(" ").trim();
    super(message);
    if (Error.captureStackTrace !== void 0) {
      Error.captureStackTrace(this, _CsvError);
    }
    this.code = code;
    for (const context of contexts) {
      for (const key in context) {
        const value = context[key];
        this[key] = Buffer.isBuffer(value) ? value.toString(options.encoding) : value == null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }
};

// ../node_modules/csv-parse/lib/utils/is_object.js
var is_object = function(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
};

// ../node_modules/csv-parse/lib/api/normalize_columns_array.js
var normalize_columns_array = function(columns) {
  const normalizedColumns = [];
  for (let i = 0, l = columns.length; i < l; i++) {
    const column = columns[i];
    if (column === void 0 || column === null || column === false) {
      normalizedColumns[i] = { disabled: true };
    } else if (typeof column === "string") {
      normalizedColumns[i] = { name: column };
    } else if (is_object(column)) {
      if (typeof column.name !== "string") {
        throw new CsvError("CSV_OPTION_COLUMNS_MISSING_NAME", [
          "Option columns missing name:",
          `property "name" is required at position ${i}`,
          "when column is an object literal"
        ]);
      }
      normalizedColumns[i] = column;
    } else {
      throw new CsvError("CSV_INVALID_COLUMN_DEFINITION", [
        "Invalid column definition:",
        "expect a string or a literal object,",
        `got ${JSON.stringify(column)} at position ${i}`
      ]);
    }
  }
  return normalizedColumns;
};

// ../node_modules/csv-parse/lib/utils/ResizeableBuffer.js
var ResizeableBuffer = class {
  constructor(size2 = 100) {
    this.size = size2;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size2);
  }
  prepend(val) {
    if (Buffer.isBuffer(val)) {
      const length = this.length + val.length;
      if (length >= this.size) {
        this.resize();
        if (length >= this.size) {
          throw Error("INVALID_BUFFER_STATE");
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    } else {
      const length = this.length++;
      if (length === this.size) {
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf, 1, 0, length);
    }
  }
  append(val) {
    const length = this.length++;
    if (length === this.size) {
      this.resize();
    }
    this.buf[length] = val;
  }
  clone() {
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize() {
    const length = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf, 0, 0, length);
    this.buf = buf;
  }
  toString(encoding) {
    if (encoding) {
      return this.buf.slice(0, this.length).toString(encoding);
    } else {
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON() {
    return this.toString("utf8");
  }
  reset() {
    this.length = 0;
  }
};
var ResizeableBuffer_default = ResizeableBuffer;

// ../node_modules/csv-parse/lib/api/init_state.js
var np = 12;
var cr = 13;
var nl = 10;
var space = 32;
var tab = 9;
var init_state = function(options) {
  return {
    bomSkipped: false,
    bufBytesStart: 0,
    castField: options.cast_function,
    commenting: false,
    // Current error encountered by a record
    error: void 0,
    enabled: options.from_line === 1,
    escaping: false,
    escapeIsQuote: Buffer.isBuffer(options.escape) && Buffer.isBuffer(options.quote) && Buffer.compare(options.escape, options.quote) === 0,
    // columns can be `false`, `true`, `Array`
    expectedRecordLength: Array.isArray(options.columns) ? options.columns.length : void 0,
    field: new ResizeableBuffer_default(20),
    firstLineToHeaders: options.cast_first_line_to_header,
    needMoreDataSize: Math.max(
      // Skip if the remaining buffer smaller than comment
      options.comment !== null ? options.comment.length : 0,
      ...options.delimiter.map((delimiter) => delimiter.length),
      // Skip if the remaining buffer can be escape sequence
      options.quote !== null ? options.quote.length : 0
    ),
    previousBuf: void 0,
    quoting: false,
    stop: false,
    rawBuffer: new ResizeableBuffer_default(100),
    record: [],
    recordHasError: false,
    record_length: 0,
    recordDelimiterMaxLength: options.record_delimiter.length === 0 ? 0 : Math.max(...options.record_delimiter.map((v) => v.length)),
    trimChars: [
      Buffer.from(" ", options.encoding)[0],
      Buffer.from("	", options.encoding)[0]
    ],
    wasQuoting: false,
    wasRowDelimiter: false,
    timchars: [
      Buffer.from(Buffer.from([cr], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([nl], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([np], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([space], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([tab], "utf8").toString(), options.encoding)
    ]
  };
};

// ../node_modules/csv-parse/lib/utils/underscore.js
var underscore = function(str) {
  return str.replace(/([A-Z])/g, function(_, match2) {
    return "_" + match2.toLowerCase();
  });
};

// ../node_modules/csv-parse/lib/api/normalize_options.js
var normalize_options = function(opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore(opt)] = opts[opt];
  }
  if (options.encoding === void 0 || options.encoding === true) {
    options.encoding = "utf8";
  } else if (options.encoding === null || options.encoding === false) {
    options.encoding = null;
  } else if (typeof options.encoding !== "string" && options.encoding !== null) {
    throw new CsvError(
      "CSV_INVALID_OPTION_ENCODING",
      [
        "Invalid option encoding:",
        "encoding must be a string or null to return a buffer,",
        `got ${JSON.stringify(options.encoding)}`
      ],
      options
    );
  }
  if (options.bom === void 0 || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_BOM",
      [
        "Invalid option bom:",
        "bom must be true,",
        `got ${JSON.stringify(options.bom)}`
      ],
      options
    );
  }
  options.cast_function = null;
  if (options.cast === void 0 || options.cast === null || options.cast === false || options.cast === "") {
    options.cast = void 0;
  } else if (typeof options.cast === "function") {
    options.cast_function = options.cast;
    options.cast = true;
  } else if (options.cast !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST",
      [
        "Invalid option cast:",
        "cast must be true or a function,",
        `got ${JSON.stringify(options.cast)}`
      ],
      options
    );
  }
  if (options.cast_date === void 0 || options.cast_date === null || options.cast_date === false || options.cast_date === "") {
    options.cast_date = false;
  } else if (options.cast_date === true) {
    options.cast_date = function(value) {
      const date = Date.parse(value);
      return !isNaN(date) ? new Date(date) : value;
    };
  } else if (typeof options.cast_date !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST_DATE",
      [
        "Invalid option cast_date:",
        "cast_date must be true or a function,",
        `got ${JSON.stringify(options.cast_date)}`
      ],
      options
    );
  }
  options.cast_first_line_to_header = null;
  if (options.columns === true) {
    options.cast_first_line_to_header = void 0;
  } else if (typeof options.columns === "function") {
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  } else if (Array.isArray(options.columns)) {
    options.columns = normalize_columns_array(options.columns);
  } else if (options.columns === void 0 || options.columns === null || options.columns === false) {
    options.columns = false;
  } else {
    throw new CsvError(
      "CSV_INVALID_OPTION_COLUMNS",
      [
        "Invalid option columns:",
        "expect an array, a function or true,",
        `got ${JSON.stringify(options.columns)}`
      ],
      options
    );
  }
  if (options.group_columns_by_name === void 0 || options.group_columns_by_name === null || options.group_columns_by_name === false) {
    options.group_columns_by_name = false;
  } else if (options.group_columns_by_name !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "expect an boolean,",
        `got ${JSON.stringify(options.group_columns_by_name)}`
      ],
      options
    );
  } else if (options.columns === false) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "the `columns` mode must be activated."
      ],
      options
    );
  }
  if (options.comment === void 0 || options.comment === null || options.comment === false || options.comment === "") {
    options.comment = null;
  } else {
    if (typeof options.comment === "string") {
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if (!Buffer.isBuffer(options.comment)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_COMMENT",
        [
          "Invalid option comment:",
          "comment must be a buffer or a string,",
          `got ${JSON.stringify(options.comment)}`
        ],
        options
      );
    }
  }
  if (options.comment_no_infix === void 0 || options.comment_no_infix === null || options.comment_no_infix === false) {
    options.comment_no_infix = false;
  } else if (options.comment_no_infix !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_COMMENT",
      [
        "Invalid option comment_no_infix:",
        "value must be a boolean,",
        `got ${JSON.stringify(options.comment_no_infix)}`
      ],
      options
    );
  }
  const delimiter_json = JSON.stringify(options.delimiter);
  if (!Array.isArray(options.delimiter))
    options.delimiter = [options.delimiter];
  if (options.delimiter.length === 0) {
    throw new CsvError(
      "CSV_INVALID_OPTION_DELIMITER",
      [
        "Invalid option delimiter:",
        "delimiter must be a non empty string or buffer or array of string|buffer,",
        `got ${delimiter_json}`
      ],
      options
    );
  }
  options.delimiter = options.delimiter.map(function(delimiter) {
    if (delimiter === void 0 || delimiter === null || delimiter === false) {
      return Buffer.from(",", options.encoding);
    }
    if (typeof delimiter === "string") {
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if (!Buffer.isBuffer(delimiter) || delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER",
        [
          "Invalid option delimiter:",
          "delimiter must be a non empty string or buffer or array of string|buffer,",
          `got ${delimiter_json}`
        ],
        options
      );
    }
    return delimiter;
  });
  if (options.escape === void 0 || options.escape === true) {
    options.escape = Buffer.from('"', options.encoding);
  } else if (typeof options.escape === "string") {
    options.escape = Buffer.from(options.escape, options.encoding);
  } else if (options.escape === null || options.escape === false) {
    options.escape = null;
  }
  if (options.escape !== null) {
    if (!Buffer.isBuffer(options.escape)) {
      throw new Error(
        `Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`
      );
    }
  }
  if (options.from === void 0 || options.from === null) {
    options.from = 1;
  } else {
    if (typeof options.from === "string" && /\d+/.test(options.from)) {
      options.from = parseInt(options.from);
    }
    if (Number.isInteger(options.from)) {
      if (options.from < 0) {
        throw new Error(
          `Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`
      );
    }
  }
  if (options.from_line === void 0 || options.from_line === null) {
    options.from_line = 1;
  } else {
    if (typeof options.from_line === "string" && /\d+/.test(options.from_line)) {
      options.from_line = parseInt(options.from_line);
    }
    if (Number.isInteger(options.from_line)) {
      if (options.from_line <= 0) {
        throw new Error(
          `Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`
      );
    }
  }
  if (options.ignore_last_delimiters === void 0 || options.ignore_last_delimiters === null) {
    options.ignore_last_delimiters = false;
  } else if (typeof options.ignore_last_delimiters === "number") {
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if (options.ignore_last_delimiters === 0) {
      options.ignore_last_delimiters = false;
    }
  } else if (typeof options.ignore_last_delimiters !== "boolean") {
    throw new CsvError(
      "CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS",
      [
        "Invalid option `ignore_last_delimiters`:",
        "the value must be a boolean value or an integer,",
        `got ${JSON.stringify(options.ignore_last_delimiters)}`
      ],
      options
    );
  }
  if (options.ignore_last_delimiters === true && options.columns === false) {
    throw new CsvError(
      "CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS",
      [
        "The option `ignore_last_delimiters`",
        "requires the activation of the `columns` option"
      ],
      options
    );
  }
  if (options.info === void 0 || options.info === null || options.info === false) {
    options.info = false;
  } else if (options.info !== true) {
    throw new Error(
      `Invalid Option: info must be true, got ${JSON.stringify(options.info)}`
    );
  }
  if (options.max_record_size === void 0 || options.max_record_size === null || options.max_record_size === false) {
    options.max_record_size = 0;
  } else if (Number.isInteger(options.max_record_size) && options.max_record_size >= 0) {
  } else if (typeof options.max_record_size === "string" && /\d+/.test(options.max_record_size)) {
    options.max_record_size = parseInt(options.max_record_size);
  } else {
    throw new Error(
      `Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`
    );
  }
  if (options.objname === void 0 || options.objname === null || options.objname === false) {
    options.objname = void 0;
  } else if (Buffer.isBuffer(options.objname)) {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if (options.encoding === null) {
    } else {
      options.objname = options.objname.toString(options.encoding);
    }
  } else if (typeof options.objname === "string") {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
  } else if (typeof options.objname === "number") {
  } else {
    throw new Error(
      `Invalid Option: objname must be a string or a buffer, got ${options.objname}`
    );
  }
  if (options.objname !== void 0) {
    if (typeof options.objname === "number") {
      if (options.columns !== false) {
        throw Error(
          "Invalid Option: objname index cannot be combined with columns or be defined as a field"
        );
      }
    } else {
      if (options.columns === false) {
        throw Error(
          "Invalid Option: objname field must be combined with columns or be defined as an index"
        );
      }
    }
  }
  if (options.on_record === void 0 || options.on_record === null) {
    options.on_record = void 0;
  } else if (typeof options.on_record !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_ON_RECORD",
      [
        "Invalid option `on_record`:",
        "expect a function,",
        `got ${JSON.stringify(options.on_record)}`
      ],
      options
    );
  }
  if (options.on_skip !== void 0 && options.on_skip !== null && typeof options.on_skip !== "function") {
    throw new Error(
      `Invalid Option: on_skip must be a function, got ${JSON.stringify(options.on_skip)}`
    );
  }
  if (options.quote === null || options.quote === false || options.quote === "") {
    options.quote = null;
  } else {
    if (options.quote === void 0 || options.quote === true) {
      options.quote = Buffer.from('"', options.encoding);
    } else if (typeof options.quote === "string") {
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if (!Buffer.isBuffer(options.quote)) {
      throw new Error(
        `Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`
      );
    }
  }
  if (options.raw === void 0 || options.raw === null || options.raw === false) {
    options.raw = false;
  } else if (options.raw !== true) {
    throw new Error(
      `Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`
    );
  }
  if (options.record_delimiter === void 0) {
    options.record_delimiter = [];
  } else if (typeof options.record_delimiter === "string" || Buffer.isBuffer(options.record_delimiter)) {
    if (options.record_delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer,",
          `got ${JSON.stringify(options.record_delimiter)}`
        ],
        options
      );
    }
    options.record_delimiter = [options.record_delimiter];
  } else if (!Array.isArray(options.record_delimiter)) {
    throw new CsvError(
      "CSV_INVALID_OPTION_RECORD_DELIMITER",
      [
        "Invalid option `record_delimiter`:",
        "value must be a string, a buffer or array of string|buffer,",
        `got ${JSON.stringify(options.record_delimiter)}`
      ],
      options
    );
  }
  options.record_delimiter = options.record_delimiter.map(function(rd, i) {
    if (typeof rd !== "string" && !Buffer.isBuffer(rd)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a string, a buffer or array of string|buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    } else if (rd.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    }
    if (typeof rd === "string") {
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  if (typeof options.relax_column_count === "boolean") {
  } else if (options.relax_column_count === void 0 || options.relax_column_count === null) {
    options.relax_column_count = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`
    );
  }
  if (typeof options.relax_column_count_less === "boolean") {
  } else if (options.relax_column_count_less === void 0 || options.relax_column_count_less === null) {
    options.relax_column_count_less = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`
    );
  }
  if (typeof options.relax_column_count_more === "boolean") {
  } else if (options.relax_column_count_more === void 0 || options.relax_column_count_more === null) {
    options.relax_column_count_more = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`
    );
  }
  if (typeof options.relax_quotes === "boolean") {
  } else if (options.relax_quotes === void 0 || options.relax_quotes === null) {
    options.relax_quotes = false;
  } else {
    throw new Error(
      `Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`
    );
  }
  if (typeof options.skip_empty_lines === "boolean") {
  } else if (options.skip_empty_lines === void 0 || options.skip_empty_lines === null) {
    options.skip_empty_lines = false;
  } else {
    throw new Error(
      `Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`
    );
  }
  if (typeof options.skip_records_with_empty_values === "boolean") {
  } else if (options.skip_records_with_empty_values === void 0 || options.skip_records_with_empty_values === null) {
    options.skip_records_with_empty_values = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`
    );
  }
  if (typeof options.skip_records_with_error === "boolean") {
  } else if (options.skip_records_with_error === void 0 || options.skip_records_with_error === null) {
    options.skip_records_with_error = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`
    );
  }
  if (options.rtrim === void 0 || options.rtrim === null || options.rtrim === false) {
    options.rtrim = false;
  } else if (options.rtrim !== true) {
    throw new Error(
      `Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`
    );
  }
  if (options.ltrim === void 0 || options.ltrim === null || options.ltrim === false) {
    options.ltrim = false;
  } else if (options.ltrim !== true) {
    throw new Error(
      `Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`
    );
  }
  if (options.trim === void 0 || options.trim === null || options.trim === false) {
    options.trim = false;
  } else if (options.trim !== true) {
    throw new Error(
      `Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`
    );
  }
  if (options.trim === true && opts.ltrim !== false) {
    options.ltrim = true;
  } else if (options.ltrim !== true) {
    options.ltrim = false;
  }
  if (options.trim === true && opts.rtrim !== false) {
    options.rtrim = true;
  } else if (options.rtrim !== true) {
    options.rtrim = false;
  }
  if (options.to === void 0 || options.to === null) {
    options.to = -1;
  } else {
    if (typeof options.to === "string" && /\d+/.test(options.to)) {
      options.to = parseInt(options.to);
    }
    if (Number.isInteger(options.to)) {
      if (options.to <= 0) {
        throw new Error(
          `Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`
      );
    }
  }
  if (options.to_line === void 0 || options.to_line === null) {
    options.to_line = -1;
  } else {
    if (typeof options.to_line === "string" && /\d+/.test(options.to_line)) {
      options.to_line = parseInt(options.to_line);
    }
    if (Number.isInteger(options.to_line)) {
      if (options.to_line <= 0) {
        throw new Error(
          `Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`
      );
    }
  }
  return options;
};

// ../node_modules/csv-parse/lib/api/index.js
var isRecordEmpty = function(record) {
  return record.every(
    (field) => field == null || field.toString && field.toString().trim() === ""
  );
};
var cr2 = 13;
var nl2 = 10;
var boms = {
  // Note, the following are equals:
  // Buffer.from("\ufeff")
  // Buffer.from([239, 187, 191])
  // Buffer.from('EFBBBF', 'hex')
  utf8: Buffer.from([239, 187, 191]),
  // Note, the following are equals:
  // Buffer.from "\ufeff", 'utf16le
  // Buffer.from([255, 254])
  utf16le: Buffer.from([255, 254])
};
var transform = function(original_options = {}) {
  const info = {
    bytes: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0
  };
  const options = normalize_options(original_options);
  return {
    info,
    original_options,
    options,
    state: init_state(options),
    __needMoreData: function(i, bufLen, end) {
      if (end) return false;
      const { encoding, escape: escape2, quote } = this.options;
      const { quoting, needMoreDataSize, recordDelimiterMaxLength } = this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(
        needMoreDataSize,
        // Skip if the remaining buffer smaller than record delimiter
        // If "record_delimiter" is yet to be discovered:
        // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
        // 2. We set the length to windows line ending in the current encoding
        // Note, that encoding is known from user or bom discovery at that point
        // recordDelimiterMaxLength,
        recordDelimiterMaxLength === 0 ? Buffer.from("\r\n", encoding).length : recordDelimiterMaxLength,
        // Skip if remaining buffer can be an escaped quote
        quoting ? (escape2 === null ? 0 : escape2.length) + quote.length : 0,
        // Skip if remaining buffer can be record delimiter following the closing quote
        quoting ? quote.length + recordDelimiterMaxLength : 0
      );
      return numOfCharLeft < requiredLength;
    },
    // Central parser implementation
    parse: function(nextBuf, end, push, close) {
      const {
        bom,
        comment_no_infix,
        encoding,
        from_line,
        ltrim,
        max_record_size,
        raw: raw2,
        relax_quotes,
        rtrim,
        skip_empty_lines,
        to,
        to_line
      } = this.options;
      let { comment, escape: escape2, quote, record_delimiter } = this.options;
      const { bomSkipped, previousBuf, rawBuffer, escapeIsQuote } = this.state;
      let buf;
      if (previousBuf === void 0) {
        if (nextBuf === void 0) {
          close();
          return;
        } else {
          buf = nextBuf;
        }
      } else if (previousBuf !== void 0 && nextBuf === void 0) {
        buf = previousBuf;
      } else {
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      if (bomSkipped === false) {
        if (bom === false) {
          this.state.bomSkipped = true;
        } else if (buf.length < 3) {
          if (end === false) {
            this.state.previousBuf = buf;
            return;
          }
        } else {
          for (const encoding2 in boms) {
            if (boms[encoding2].compare(buf, 0, boms[encoding2].length) === 0) {
              const bomLength = boms[encoding2].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              this.options = normalize_options({
                ...this.original_options,
                encoding: encoding2
              });
              ({ comment, escape: escape2, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for (pos = 0; pos < bufLen; pos++) {
        if (this.__needMoreData(pos, bufLen, end)) {
          break;
        }
        if (this.state.wasRowDelimiter === true) {
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if (to_line !== -1 && this.info.lines > to_line) {
          this.state.stop = true;
          close();
          return;
        }
        if (this.state.quoting === false && record_delimiter.length === 0) {
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(
            buf,
            pos
          );
          if (record_delimiterCount) {
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if (raw2 === true) {
          rawBuffer.append(chr);
        }
        if ((chr === cr2 || chr === nl2) && this.state.wasRowDelimiter === false) {
          this.state.wasRowDelimiter = true;
        }
        if (this.state.escaping === true) {
          this.state.escaping = false;
        } else {
          if (escape2 !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape2.length < bufLen) {
            if (escapeIsQuote) {
              if (this.__isQuote(buf, pos + escape2.length)) {
                this.state.escaping = true;
                pos += escape2.length - 1;
                continue;
              }
            } else {
              this.state.escaping = true;
              pos += escape2.length - 1;
              continue;
            }
          }
          if (this.state.commenting === false && this.__isQuote(buf, pos)) {
            if (this.state.quoting === true) {
              const nextChr = buf[pos + quote.length];
              const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos + quote.length);
              const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos + quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(
                buf,
                pos + quote.length,
                nextChr
              );
              const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos + quote.length) : this.__isRecordDelimiter(nextChr, buf, pos + quote.length);
              if (escape2 !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape2.length)) {
                pos += escape2.length - 1;
              } else if (!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable) {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              } else if (relax_quotes === false) {
                const err = this.__error(
                  new CsvError(
                    "CSV_INVALID_CLOSING_QUOTE",
                    [
                      "Invalid Closing Quote:",
                      `got "${String.fromCharCode(nextChr)}"`,
                      `at line ${this.info.lines}`,
                      "instead of delimiter, record delimiter, trimable character",
                      "(if activated) or comment"
                    ],
                    this.options,
                    this.__infoField()
                  )
                );
                if (err !== void 0) return err;
              } else {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            } else {
              if (this.state.field.length !== 0) {
                if (relax_quotes === false) {
                  const info2 = this.__infoField();
                  const bom2 = Object.keys(boms).map(
                    (b2) => boms[b2].equals(this.state.field.toString()) ? b2 : false
                  ).filter(Boolean)[0];
                  const err = this.__error(
                    new CsvError(
                      "INVALID_OPENING_QUOTE",
                      [
                        "Invalid Opening Quote:",
                        `a quote is found on field ${JSON.stringify(info2.column)} at line ${info2.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                        bom2 ? `(${bom2} bom)` : void 0
                      ],
                      this.options,
                      info2,
                      {
                        field: this.state.field
                      }
                    )
                  );
                  if (err !== void 0) return err;
                }
              } else {
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if (this.state.quoting === false) {
            const recordDelimiterLength = this.__isRecordDelimiter(
              chr,
              buf,
              pos
            );
            if (recordDelimiterLength !== 0) {
              const skipCommentLine = this.state.commenting && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0;
              if (skipCommentLine) {
                this.info.comment_lines++;
              } else {
                if (this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1 : 0) >= from_line) {
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                if (skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0) {
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if (errField !== void 0) return errField;
                this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if (errRecord !== void 0) return errRecord;
                if (to !== -1 && this.info.records >= to) {
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if (this.state.commenting) {
              continue;
            }
            if (comment !== null && (comment_no_infix === false || this.state.record.length === 0 && this.state.field.length === 0)) {
              const commentCount = this.__compareBytes(comment, buf, pos, chr);
              if (commentCount !== 0) {
                this.state.commenting = true;
                continue;
              }
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if (delimiterLength !== 0) {
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if (errField !== void 0) return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if (this.state.commenting === false) {
          if (max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size) {
            return this.__error(
              new CsvError(
                "CSV_MAX_RECORD_SIZE",
                [
                  "Max Record Size:",
                  "record exceed the maximum number of tolerated bytes",
                  `of ${max_record_size}`,
                  `at line ${this.info.lines}`
                ],
                this.options,
                this.__infoField()
              )
            );
          }
        }
        const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if (lappend === true && rappend === true) {
          this.state.field.append(chr);
        } else if (rtrim === true && !this.__isCharTrimable(buf, pos)) {
          return this.__error(
            new CsvError(
              "CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE",
              [
                "Invalid Closing Quote:",
                "found non trimable byte after quote",
                `at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
        } else {
          if (lappend === false) {
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if (end === true) {
        if (this.state.quoting === true) {
          const err = this.__error(
            new CsvError(
              "CSV_QUOTE_NOT_CLOSED",
              [
                "Quote Not Closed:",
                `the parsing is finished with an opening quote at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
          if (err !== void 0) return err;
        } else {
          if (this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0) {
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if (errField !== void 0) return errField;
            const errRecord = this.__onRecord(push);
            if (errRecord !== void 0) return errRecord;
          } else if (this.state.wasRowDelimiter === true) {
            this.info.empty_lines++;
          } else if (this.state.commenting === true) {
            this.info.comment_lines++;
          }
        }
      } else {
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if (this.state.wasRowDelimiter === true) {
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    },
    __onRecord: function(push) {
      const {
        columns,
        group_columns_by_name,
        encoding,
        info: info2,
        from,
        relax_column_count,
        relax_column_count_less,
        relax_column_count_more,
        raw: raw2,
        skip_records_with_empty_values
      } = this.options;
      const { enabled, record } = this.state;
      if (enabled === false) {
        return this.__resetRecord();
      }
      const recordLength = record.length;
      if (columns === true) {
        if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record);
      }
      if (columns === false && this.info.records === 0) {
        this.state.expectedRecordLength = recordLength;
      }
      if (recordLength !== this.state.expectedRecordLength) {
        const err = columns === false ? new CsvError(
          "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH",
          [
            "Invalid Record Length:",
            `expect ${this.state.expectedRecordLength},`,
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        ) : new CsvError(
          "CSV_RECORD_INCONSISTENT_COLUMNS",
          [
            "Invalid Record Length:",
            `columns length is ${columns.length},`,
            // rename columns
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        );
        if (relax_column_count === true || relax_column_count_less === true && recordLength < this.state.expectedRecordLength || relax_column_count_more === true && recordLength > this.state.expectedRecordLength) {
          this.info.invalid_field_length++;
          this.state.error = err;
        } else {
          const finalErr = this.__error(err);
          if (finalErr) return finalErr;
        }
      }
      if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
        this.__resetRecord();
        return;
      }
      if (this.state.recordHasError === true) {
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if (from === 1 || this.info.records >= from) {
        const { objname } = this.options;
        if (columns !== false) {
          const obj = {};
          for (let i = 0, l = record.length; i < l; i++) {
            if (columns[i] === void 0 || columns[i].disabled) continue;
            if (group_columns_by_name === true && obj[columns[i].name] !== void 0) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record[i]];
              }
            } else {
              obj[columns[i].name] = record[i];
            }
          }
          if (raw2 === true || info2 === true) {
            const extRecord = Object.assign(
              { record: obj },
              raw2 === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info2 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [obj[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? obj : [obj[objname], obj],
              push
            );
            if (err) {
              return err;
            }
          }
        } else {
          if (raw2 === true || info2 === true) {
            const extRecord = Object.assign(
              { record },
              raw2 === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info2 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [record[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? record : [record[objname], record],
              push
            );
            if (err) {
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    },
    __firstLineToColumns: function(record) {
      const { firstLineToHeaders } = this.state;
      try {
        const headers = firstLineToHeaders === void 0 ? record : firstLineToHeaders.call(null, record);
        if (!Array.isArray(headers)) {
          return this.__error(
            new CsvError(
              "CSV_INVALID_COLUMN_MAPPING",
              [
                "Invalid Column Mapping:",
                "expect an array from column function,",
                `got ${JSON.stringify(headers)}`
              ],
              this.options,
              this.__infoField(),
              {
                headers
              }
            )
          );
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      } catch (err) {
        return err;
      }
    },
    __resetRecord: function() {
      if (this.options.raw === true) {
        this.state.rawBuffer.reset();
      }
      this.state.error = void 0;
      this.state.record = [];
      this.state.record_length = 0;
    },
    __onField: function() {
      const { cast, encoding, rtrim, max_record_size } = this.options;
      const { enabled, wasQuoting } = this.state;
      if (enabled === false) {
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if (rtrim === true && wasQuoting === false) {
        field = field.trimRight();
      }
      if (cast === true) {
        const [err, f] = this.__cast(field);
        if (err !== void 0) return err;
        field = f;
      }
      this.state.record.push(field);
      if (max_record_size !== 0 && typeof field === "string") {
        this.state.record_length += field.length;
      }
      this.__resetField();
    },
    __resetField: function() {
      this.state.field.reset();
      this.state.wasQuoting = false;
    },
    __push: function(record, push) {
      const { on_record } = this.options;
      if (on_record !== void 0) {
        const info2 = this.__infoRecord();
        try {
          record = on_record.call(null, record, info2);
        } catch (err) {
          return err;
        }
        if (record === void 0 || record === null) {
          return;
        }
      }
      push(record);
    },
    // Return a tuple with the error and the casted value
    __cast: function(field) {
      const { columns, relax_column_count } = this.options;
      const isColumns = Array.isArray(columns);
      if (isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length) {
        return [void 0, void 0];
      }
      if (this.state.castField !== null) {
        try {
          const info2 = this.__infoField();
          return [void 0, this.state.castField.call(null, field, info2)];
        } catch (err) {
          return [err];
        }
      }
      if (this.__isFloat(field)) {
        return [void 0, parseFloat(field)];
      } else if (this.options.cast_date !== false) {
        const info2 = this.__infoField();
        return [void 0, this.options.cast_date.call(null, field, info2)];
      }
      return [void 0, field];
    },
    // Helper to test if a character is a space or a line delimiter
    __isCharTrimable: function(buf, pos) {
      const isTrim = (buf2, pos2) => {
        const { timchars } = this.state;
        loop1: for (let i = 0; i < timchars.length; i++) {
          const timchar = timchars[i];
          for (let j = 0; j < timchar.length; j++) {
            if (timchar[j] !== buf2[pos2 + j]) continue loop1;
          }
          return timchar.length;
        }
        return 0;
      };
      return isTrim(buf, pos);
    },
    // Keep it in case we implement the `cast_int` option
    // __isInt(value){
    //   // return Number.isInteger(parseInt(value))
    //   // return !isNaN( parseInt( obj ) );
    //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
    // }
    __isFloat: function(value) {
      return value - parseFloat(value) + 1 >= 0;
    },
    __compareBytes: function(sourceBuf, targetBuf, targetPos, firstByte) {
      if (sourceBuf[0] !== firstByte) return 0;
      const sourceLength = sourceBuf.length;
      for (let i = 1; i < sourceLength; i++) {
        if (sourceBuf[i] !== targetBuf[targetPos + i]) return 0;
      }
      return sourceLength;
    },
    __isDelimiter: function(buf, pos, chr) {
      const { delimiter, ignore_last_delimiters } = this.options;
      if (ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1) {
        return 0;
      } else if (ignore_last_delimiters !== false && typeof ignore_last_delimiters === "number" && this.state.record.length === ignore_last_delimiters - 1) {
        return 0;
      }
      loop1: for (let i = 0; i < delimiter.length; i++) {
        const del = delimiter[i];
        if (del[0] === chr) {
          for (let j = 1; j < del.length; j++) {
            if (del[j] !== buf[pos + j]) continue loop1;
          }
          return del.length;
        }
      }
      return 0;
    },
    __isRecordDelimiter: function(chr, buf, pos) {
      const { record_delimiter } = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1: for (let i = 0; i < recordDelimiterLength; i++) {
        const rd = record_delimiter[i];
        const rdLength = rd.length;
        if (rd[0] !== chr) {
          continue;
        }
        for (let j = 1; j < rdLength; j++) {
          if (rd[j] !== buf[pos + j]) {
            continue loop1;
          }
        }
        return rd.length;
      }
      return 0;
    },
    __isEscape: function(buf, pos, chr) {
      const { escape: escape2 } = this.options;
      if (escape2 === null) return false;
      const l = escape2.length;
      if (escape2[0] === chr) {
        for (let i = 0; i < l; i++) {
          if (escape2[i] !== buf[pos + i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    __isQuote: function(buf, pos) {
      const { quote } = this.options;
      if (quote === null) return false;
      const l = quote.length;
      for (let i = 0; i < l; i++) {
        if (quote[i] !== buf[pos + i]) {
          return false;
        }
      }
      return true;
    },
    __autoDiscoverRecordDelimiter: function(buf, pos) {
      const { encoding } = this.options;
      const rds = [
        // Important, the windows line ending must be before mac os 9
        Buffer.from("\r\n", encoding),
        Buffer.from("\n", encoding),
        Buffer.from("\r", encoding)
      ];
      loop: for (let i = 0; i < rds.length; i++) {
        const l = rds[i].length;
        for (let j = 0; j < l; j++) {
          if (rds[i][j] !== buf[pos + j]) {
            continue loop;
          }
        }
        this.options.record_delimiter.push(rds[i]);
        this.state.recordDelimiterMaxLength = rds[i].length;
        return rds[i].length;
      }
      return 0;
    },
    __error: function(msg) {
      const { encoding, raw: raw2, skip_records_with_error } = this.options;
      const err = typeof msg === "string" ? new Error(msg) : msg;
      if (skip_records_with_error) {
        this.state.recordHasError = true;
        if (this.options.on_skip !== void 0) {
          this.options.on_skip(
            err,
            raw2 ? this.state.rawBuffer.toString(encoding) : void 0
          );
        }
        return void 0;
      } else {
        return err;
      }
    },
    __infoDataSet: function() {
      return {
        ...this.info,
        columns: this.options.columns
      };
    },
    __infoRecord: function() {
      const { columns, raw: raw2, encoding } = this.options;
      return {
        ...this.__infoDataSet(),
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw2 ? this.state.rawBuffer.toString(encoding) : void 0
      };
    },
    __infoField: function() {
      const { columns } = this.options;
      const isColumns = Array.isArray(columns);
      return {
        ...this.__infoRecord(),
        column: isColumns === true ? columns.length > this.state.record.length ? columns[this.state.record.length].name : null : this.state.record.length,
        quoting: this.state.wasQuoting
      };
    }
  };
};

// ../node_modules/csv-parse/lib/sync.js
var parse2 = function(data, opts = {}) {
  if (typeof data === "string") {
    data = Buffer.from(data);
  }
  const records = opts && opts.objname ? {} : [];
  const parser = transform(opts);
  const push = (record) => {
    if (parser.options.objname === void 0) records.push(record);
    else {
      records[record[0]] = record[1];
    }
  };
  const close = () => {
  };
  const err1 = parser.parse(data, false, push, close);
  if (err1 !== void 0) throw err1;
  const err2 = parser.parse(void 0, true, push, close);
  if (err2 !== void 0) throw err2;
  return records;
};

// ../backend/src/routes/import.ts
var importRoutes = new Hono2();
function parseCSVOptions(body) {
  const hasHeader = body["hasHeader"] !== "false";
  let columnMapping = null;
  if (body["columnMapping"]) {
    try {
      columnMapping = typeof body["columnMapping"] === "string" ? JSON.parse(body["columnMapping"]) : body["columnMapping"];
    } catch {
    }
  }
  return { hasHeader, columnMapping };
}
function detectDelimiter(text) {
  const lines = text.split("\n").slice(0, 5).filter((l) => l.trim());
  let semicolons = 0;
  let commas = 0;
  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
  }
  return semicolons > commas ? ";" : ",";
}
function parseCSV(text, hasHeader, columnMapping) {
  const delimiter = detectDelimiter(text);
  if (hasHeader) {
    const records = parse2(text, { columns: true, skip_empty_lines: true, trim: true, delimiter });
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      return records.map((row) => {
        const mapped = {};
        for (const [expectedKey, csvColumn] of Object.entries(columnMapping)) {
          if (csvColumn && row[csvColumn] !== void 0) {
            mapped[expectedKey] = row[csvColumn];
          }
        }
        for (const [key, value] of Object.entries(row)) {
          if (!(key in mapped) && !Object.values(columnMapping).includes(key)) {
            mapped[key] = value;
          }
        }
        return mapped;
      });
    }
    return records;
  } else {
    const records = parse2(text, { skip_empty_lines: true, trim: true, delimiter });
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      const expectedFields = Object.keys(columnMapping);
      return records.map((row) => {
        const mapped = {};
        expectedFields.forEach((field, idx) => {
          mapped[field] = row[idx] || "";
        });
        return mapped;
      });
    }
    return records.map((row) => {
      const mapped = {};
      row.forEach((val, idx) => {
        mapped[`col${idx + 1}`] = val;
      });
      return mapped;
    });
  }
}
importRoutes.post("/shooters", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No CSV file provided" }, 400);
  }
  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);
  let imported = 0;
  let skipped = 0;
  const errors = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const first_name = row.first_name || row.firstName || row.FirstName || "";
    const last_name = row.last_name || row.lastName || row.LastName || "";
    const category = row.category || row.Category || "regular";
    const tag = row.tag || row.Tag || null;
    const division = row.division || row.Division || "standard";
    const power_factor = row.power_factor || row.powerFactor || row.PowerFactor || row.pf || "minor";
    const region = row.region || row.Region || row.country || row.Country || "";
    const email = row.email || row.Email || null;
    if (!first_name || !last_name || !region) {
      errors.push(`Row ${i + 2}: missing required fields (first_name, last_name, region)`);
      continue;
    }
    const existing = await sql`
      SELECT id FROM shooters
      WHERE first_name = ${first_name} AND last_name = ${last_name}
      AND (email = ${email || null} OR (email IS NULL AND ${email || null} IS NULL))
      AND deleted_at IS NULL
    `;
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    try {
      await sql`
        INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
        VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
      `;
      imported++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  await audit(c, "import.shooters", null, { imported, skipped, errors: errors.length });
  return c.json({ imported, skipped, errors });
});
importRoutes.post("/matches/:matchId/registrations", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No CSV file provided" }, 400);
  }
  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);
  let imported = 0;
  let skipped = 0;
  const errors = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const shooter_first_name = row.shooter_first_name || row.firstName || row.first_name || "";
    const shooter_last_name = row.shooter_last_name || row.lastName || row.last_name || "";
    const squad = row.squad || row.Squad || null;
    const division = row.division || row.Division || null;
    const category = row.category || row.Category || null;
    const power_factor = row.power_factor || row.powerFactor || row.PowerFactor || row.pf || null;
    if (!shooter_first_name || !shooter_last_name) {
      errors.push(`Row ${i + 2}: shooter name required`);
      continue;
    }
    const useUnaccent = await isUnaccentAvailable();
    const [shooter] = useUnaccent ? await sql`
          SELECT id FROM shooters
          WHERE unaccent(first_name) ILIKE unaccent(${shooter_first_name})
            AND unaccent(last_name) ILIKE unaccent(${shooter_last_name})
            AND deleted_at IS NULL
          LIMIT 1
        ` : await sql`
          SELECT id FROM shooters
          WHERE first_name ILIKE ${shooter_first_name}
            AND last_name ILIKE ${shooter_last_name}
            AND deleted_at IS NULL
          LIMIT 1
        `;
    if (!shooter) {
      errors.push(`Row ${i + 2}: shooter "${shooter_first_name} ${shooter_last_name}" not found in database`);
      continue;
    }
    try {
      await sql`
        INSERT INTO match_registrations (match_id, shooter_id, squad, division, category, power_factor)
        VALUES (${matchId}, ${shooter.id}, ${squad ? parseInt(squad) : null},
                ${division || null}, ${category || null}, ${power_factor || null})
      `;
      imported++;
    } catch (err) {
      if (err.code === "23505") {
        skipped++;
      } else {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  }
  await audit(c, "import.registrations", null, { matchId, imported, skipped, errors: errors.length });
  return c.json({ imported, skipped, errors });
});
importRoutes.post("/matches/:matchId/scores", async (c) => {
  const matchId = c.req.param("matchId");
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No CSV file provided" }, 400);
  }
  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);
  let imported = 0;
  let skipped = 0;
  const errors = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const shooter_first_name = row.shooter_first_name || row.firstName || row.first_name || "";
    const shooter_last_name = row.shooter_last_name || row.lastName || row.last_name || "";
    const stage_number = row.stage_number || row.stage || row.Stage || "";
    const time = row.time || row.Time || "";
    const alpha = row.alpha || row.A || row.Alpha || "0";
    const charlie = row.charlie || row.C || row.Charlie || "0";
    const delta = row.delta || row.D || row.Delta || "0";
    const miss = row.miss || row.M || row.Miss || "0";
    const no_shoot_hits = row.no_shoot_hits || row.ns || row.NS || row.no_shoot || "0";
    const steel_hits = row.steel_hits || row.steel || row.Steel || "0";
    const procedural = row.procedural || row.proc || row.Procedural || "0";
    const ftsa = row.ftsa || row.FTSA || "0";
    if (!shooter_first_name || !shooter_last_name || !stage_number) {
      errors.push(`Row ${i + 2}: shooter name and stage_number required`);
      continue;
    }
    const useUnaccent = await isUnaccentAvailable();
    const [reg] = useUnaccent ? await sql`
          SELECT mr.id FROM match_registrations mr
          JOIN shooters s ON s.id = mr.shooter_id
          WHERE mr.match_id = ${matchId}
          AND unaccent(s.first_name) ILIKE unaccent(${shooter_first_name})
          AND unaccent(s.last_name) ILIKE unaccent(${shooter_last_name})
          LIMIT 1
        ` : await sql`
          SELECT mr.id FROM match_registrations mr
          JOIN shooters s ON s.id = mr.shooter_id
          WHERE mr.match_id = ${matchId}
          AND s.first_name ILIKE ${shooter_first_name}
          AND s.last_name ILIKE ${shooter_last_name}
          LIMIT 1
        `;
    if (!reg) {
      errors.push(`Row ${i + 2}: shooter not registered for this match`);
      skipped++;
      continue;
    }
    const [stage] = await sql`
      SELECT id, scoring_type FROM stages
      WHERE match_id = ${matchId} AND stage_number = ${parseInt(stage_number)}
    `;
    if (!stage) {
      errors.push(`Row ${i + 2}: stage ${stage_number} not found`);
      skipped++;
      continue;
    }
    const alphaVal = parseInt(alpha) || 0;
    const charlieVal = parseInt(charlie) || 0;
    const deltaVal = parseInt(delta) || 0;
    const missVal = parseInt(miss) || 0;
    const nsHits = parseInt(no_shoot_hits) || 0;
    const steelHits = parseInt(steel_hits) || 0;
    const { calculateScore: calculateScore2 } = await Promise.resolve().then(() => (init_scoringCalc(), scoringCalc_exports));
    const [pfRow] = await sql`
      SELECT COALESCE(mr.power_factor, s.power_factor) as pf
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE mr.id = ${reg.id}
    `;
    const pf = pfRow?.pf || "minor";
    const targets = [];
    if (alphaVal + charlieVal + deltaVal + missVal > 0) {
      targets.push({
        target_type: "paper",
        alpha: alphaVal,
        charlie: charlieVal,
        delta: deltaVal,
        miss: missVal,
        no_shoot_hits: nsHits,
        steel_hit: null,
        hits_per_paper: 2
      });
    }
    if (steelHits > 0) {
      targets.push({
        target_type: "steel",
        alpha: 0,
        charlie: 0,
        delta: 0,
        miss: 0,
        no_shoot_hits: 0,
        steel_hit: true,
        hits_per_paper: 1
      });
    }
    const calcResult = calculateScore2({
      targets,
      time: parseFloat(time) || null,
      procedural_count: parseInt(procedural) || 0,
      ftsa_count: parseInt(ftsa) || 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      scoring_type: stage.scoring_type,
      power_factor: pf
    });
    try {
      await sql`
        INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
          raw_points, penalty_points, net_points, hit_factor)
        VALUES (${matchId}, ${stage.id}, ${reg.id}, ${parseFloat(time) || null},
          ${calcResult.raw_points}, ${calcResult.penalty_points}, ${calcResult.net_points}, ${calcResult.hit_factor})
        ON CONFLICT (stage_id, registration_id) DO UPDATE SET
          time = ${parseFloat(time) || null},
          raw_points = ${calcResult.raw_points},
          penalty_points = ${calcResult.penalty_points},
          net_points = ${calcResult.net_points},
          hit_factor = ${calcResult.hit_factor},
          updated_at = NOW()
      `;
      imported++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  await audit(c, "import.scores", null, { matchId, imported, skipped, errors: errors.length });
  return c.json({ imported, skipped, errors });
});

// ../node_modules/mdb-reader/lib/node/SortOrder.js
var GENERAL_SORT_ORDER_VALUE = 1033;
var GENERAL_97_SORT_ORDER = Object.freeze({ value: GENERAL_SORT_ORDER_VALUE, version: -1 });
var GENERAL_LEGACY_SORT_ORDER = Object.freeze({ value: GENERAL_SORT_ORDER_VALUE, version: 0 });
var GENERAL_SORT_ORDER = Object.freeze({ value: GENERAL_SORT_ORDER_VALUE, version: 1 });

// ../node_modules/mdb-reader/lib/node/JetFormat/types.js
var CodecType;
(function(CodecType2) {
  CodecType2[CodecType2["JET"] = 0] = "JET";
  CodecType2[CodecType2["MSISAM"] = 1] = "MSISAM";
  CodecType2[CodecType2["OFFICE"] = 2] = "OFFICE";
})(CodecType || (CodecType = {}));

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet4Format.js
var jet4Format = {
  codecType: CodecType.JET,
  pageSize: 4096,
  textEncoding: "ucs-2",
  defaultSortOrder: GENERAL_LEGACY_SORT_ORDER,
  databaseDefinitionPage: {
    encryptedSize: 128,
    passwordSize: 40,
    creationDateOffset: 114,
    // 114
    defaultSortOrder: {
      offset: 110,
      // 110
      size: 4
    }
  },
  dataPage: {
    recordCountOffset: 12,
    record: {
      countOffset: 12,
      columnCountSize: 2,
      variableColumnCountSize: 2
    }
  },
  tableDefinitionPage: {
    rowCountOffset: 16,
    variableColumnCountOffset: 43,
    columnCountOffset: 45,
    logicalIndexCountOffset: 47,
    realIndexCountOffset: 51,
    realIndexStartOffset: 63,
    realIndexEntrySize: 12,
    columnsDefinition: {
      typeOffset: 0,
      indexOffset: 5,
      variableIndexOffset: 7,
      flagsOffset: 15,
      fixedIndexOffset: 21,
      sizeOffset: 23,
      entrySize: 25,
      complexTypeIdOffset: 9
    },
    columnNames: {
      nameLengthSize: 2
    },
    usageMapOffset: 55
  }
};

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet12Format.js
var jet12Format = {
  ...jet4Format,
  codecType: CodecType.OFFICE
};

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet14Format.js
var jet14Format = {
  ...jet12Format,
  defaultSortOrder: GENERAL_SORT_ORDER
};

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet15Format.js
var jet15Format = jet14Format;

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet16Format.js
var jet16Format = jet15Format;

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet17Format.js
var jet17Format = jet16Format;

// ../node_modules/mdb-reader/lib/node/JetFormat/Jet3Format.js
var jet3Format = {
  codecType: CodecType.JET,
  pageSize: 2048,
  textEncoding: "unknown",
  defaultSortOrder: GENERAL_97_SORT_ORDER,
  databaseDefinitionPage: {
    encryptedSize: 126,
    passwordSize: 20,
    creationDateOffset: null,
    defaultSortOrder: {
      offset: 58,
      // 58
      size: 2
    }
  },
  dataPage: {
    recordCountOffset: 8,
    record: {
      countOffset: 8,
      columnCountSize: 1,
      variableColumnCountSize: 1
    }
  },
  tableDefinitionPage: {
    rowCountOffset: 12,
    columnCountOffset: 25,
    variableColumnCountOffset: 23,
    logicalIndexCountOffset: 27,
    realIndexCountOffset: 31,
    realIndexStartOffset: 43,
    realIndexEntrySize: 8,
    columnsDefinition: {
      typeOffset: 0,
      indexOffset: 1,
      variableIndexOffset: 3,
      flagsOffset: 13,
      fixedIndexOffset: 14,
      sizeOffset: 16,
      entrySize: 18
    },
    columnNames: {
      nameLengthSize: 1
    },
    usageMapOffset: 35
  }
};

// ../node_modules/mdb-reader/lib/node/JetFormat/MSISAMFormat.js
var msisamFormat = {
  ...jet4Format,
  codecType: CodecType.MSISAM
};

// ../node_modules/mdb-reader/lib/node/JetFormat/index.js
var OFFSET_VERSION = 20;
var OFFSET_ENGINE_NAME = 4;
var MSISAM_ENGINE = "MSISAM Database";
function getJetFormat(buffer2) {
  const version = buffer2[OFFSET_VERSION];
  switch (version) {
    case 0:
      return jet3Format;
    case 1:
      if (buffer2.slice(OFFSET_ENGINE_NAME, OFFSET_ENGINE_NAME + MSISAM_ENGINE.length).toString("ascii") === MSISAM_ENGINE) {
        return msisamFormat;
      }
      return jet4Format;
    case 2:
      return jet12Format;
    case 3:
      return jet14Format;
    case 4:
      return jet15Format;
    case 5:
      return jet16Format;
    case 6:
      return jet17Format;
    default:
      throw new Error(`Unsupported version '${version}'`);
  }
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/identity.js
function createIdentityHandler() {
  return {
    decryptPage: (b2) => b2,
    verifyPassword: () => true
  };
}

// ../node_modules/mdb-reader/lib/node/environment/index.js
import { inflateSync } from "node:zlib";
import { createDecipheriv, createHash } from "crypto";
var environment = {
  inflate: (data) => inflateSync(data)
};

// ../node_modules/mdb-reader/lib/node/crypto/blockDecrypt.js
function blockDecrypt(cipher, key, iv, data) {
  const algorithm = `${cipher.algorithm}-${key.length * 8}-${cipher.chaining.slice(-3)}`;
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAutoPadding(false);
  return decipher.update(data);
}

// ../node_modules/mdb-reader/lib/node/util.js
function getBitmapValue(bitmap, pos) {
  const byteNumber = Math.floor(pos / 8);
  const bitNumber = pos % 8;
  return !!(bitmap[byteNumber] & 1 << bitNumber);
}
function roundToFullByte(bits) {
  return Math.floor((bits + 7) / 8);
}
function xor2(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++) {
    buffer2[i] = a[i] ^ b2[i];
  }
  return buffer2;
}
function isEmptyBuffer(buffer2) {
  return buffer2.every((v) => v === 0);
}
function intToBuffer(n) {
  const buffer2 = Buffer.allocUnsafe(4);
  buffer2.writeInt32LE(n);
  return buffer2;
}
function fixBufferLength(buffer2, length, padByte = 0) {
  if (buffer2.length > length) {
    return buffer2.slice(0, length);
  }
  if (buffer2.length < length) {
    return Buffer.from(buffer2).fill(padByte, buffer2.length, length);
  }
  return buffer2;
}
function isInRange(from, to, value) {
  return from <= value && value <= to;
}
function maskTableId(id) {
  return id & 16777215;
}

// ../node_modules/mdb-reader/lib/node/crypto/hash.js
function hash2(algorithm, buffers, length) {
  const digest = createHash(algorithm);
  for (const buffer2 of buffers) {
    digest.update(buffer2);
  }
  const result = digest.digest();
  if (length !== void 0) {
    return fixBufferLength(result, length);
  }
  return result;
}

// ../node_modules/mdb-reader/lib/node/crypto/deriveKey.js
function deriveKey(password, blockBytes, algorithm, salt, iterations, keyByteLength) {
  const baseHash = hash2(algorithm, [salt, password]);
  const iterHash = iterateHash(algorithm, baseHash, iterations);
  const finalHash = hash2(algorithm, [iterHash, blockBytes]);
  return fixBufferLength(finalHash, keyByteLength, 54);
}
function iterateHash(algorithm, baseBuffer, iterations) {
  let iterHash = baseBuffer;
  for (let i = 0; i < iterations; ++i) {
    iterHash = hash2(algorithm, [intToBuffer(i), iterHash]);
  }
  return iterHash;
}

// ../node_modules/mdb-reader/lib/node/crypto/rc4.js
function decryptRC4(key, data) {
  const decrypt = createRC4Decrypter(key);
  return decrypt(data);
}
function createRC4Decrypter(key) {
  const S = createKeyStream(key);
  let i = 0;
  let j = 0;
  return (data) => {
    const resultBuffer = Buffer.from(data);
    for (let k = 0; k < data.length; ++k) {
      i = (i + 1) % 256;
      j = (j + S[i]) % 256;
      [S[i], S[j]] = [S[j], S[i]];
      resultBuffer[k] ^= S[(S[i] + S[j]) % 256];
    }
    return resultBuffer;
  };
}
function createKeyStream(key) {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; ++i) {
    S[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; ++i) {
    j = (j + S[i] + key[i % key.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  return S;
}

// ../node_modules/mdb-reader/lib/node/codec-handler/util.js
function getPageEncodingKey(encodingKey, pageNumber) {
  const pageIndexBuffer = Buffer.alloc(4);
  pageIndexBuffer.writeUInt32LE(pageNumber);
  return xor2(pageIndexBuffer, encodingKey);
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/jet.js
var KEY_OFFSET = 62;
var KEY_SIZE = 4;
function createJetCodecHandler(databaseDefinitionPage) {
  const encodingKey = databaseDefinitionPage.slice(KEY_OFFSET, KEY_OFFSET + KEY_SIZE);
  if (isEmptyBuffer(encodingKey)) {
    return createIdentityHandler();
  }
  const decryptPage = (pageBuffer, pageIndex) => {
    const pagekey = getPageEncodingKey(encodingKey, pageIndex);
    return decryptRC4(pagekey, pageBuffer);
  };
  return {
    decryptPage,
    verifyPassword: () => true
    // TODO
  };
}

// ../node_modules/fast-xml-parser/src/util.js
var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
var regexName = new RegExp("^" + nameRegexp + "$");
function getAllMatches(string, regex) {
  const matches = [];
  let match2 = regex.exec(string);
  while (match2) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match2[0].length;
    const len = match2.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match2[index]);
    }
    matches.push(allmatches);
    match2 = regex.exec(string);
  }
  return matches;
}
var isName = function(string) {
  const match2 = regexName.exec(string);
  return !(match2 === null || typeof match2 === "undefined");
};
function isExist(v) {
  return typeof v !== "undefined";
}
var DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  "hasOwnProperty",
  "toString",
  "valueOf",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__"
];
var criticalProperties = ["__proto__", "constructor", "prototype"];

// ../node_modules/fast-xml-parser/src/validator.js
var defaultOptions = {
  allowBooleanAttributes: false,
  //A tag can have attributes without any value
  unpairedTags: []
};
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);
  const tags = [];
  let tagFound = false;
  let reachedRoot = false;
  if (xmlData[0] === "\uFEFF") {
    xmlData = xmlData.substr(1);
  }
  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === "<") {
      let tagStartPos = i;
      i++;
      if (xmlData[i] === "!") {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === "/") {
          closingTag = true;
          i++;
        }
        let tagName = "";
        for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        if (tagName[tagName.length - 1] === "/") {
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
        }
        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;
        if (attrStr[attrStr.length - 1] === "/") {
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
          } else {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject(
                "InvalidTag",
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
          if (reachedRoot === true) {
            return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            if (xmlData[i + 1] === "!") {
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === "?") {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === "&") {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        }
        if (xmlData[i] === "<") {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }
  if (!tagFound) {
    return getErrorObject("InvalidXml", "Start tag expected.", 1);
  } else if (tags.length == 1) {
    return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
  }
  return true;
}
function isWhiteSpace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == "?" || xmlData[i] == " ") {
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === "xml") {
        return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}
function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        angleBracketsCount++;
      } else if (xmlData[i] === ">") {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  }
  return i;
}
var doubleQuote = '"';
var singleQuote = "'";
function readAttributeStr(xmlData, i) {
  let attrStr = "";
  let startChar = "";
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === "") {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
      } else {
        startChar = "";
      }
    } else if (xmlData[i] === ">") {
      if (startChar === "") {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== "") {
    return false;
  }
  return {
    value: attrStr,
    index: i,
    tagClosed
  };
}
var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
function validateAttributeString(attrStr, options) {
  const matches = getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
      return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }
  return true;
}
function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === "x") {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ";")
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}
function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ";")
    return -1;
  if (xmlData[i] === "#") {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ";")
      break;
    return -1;
  }
  return i;
}
function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}
function validateAttrName(attrName) {
  return isName(attrName);
}
function validateTagName(tagname) {
  return isName(tagname);
}
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}
function getPositionFromMatch(match2) {
  return match2.startIndex + match2[1].length;
}

// ../node_modules/@nodable/entities/src/entities.js
var BASIC_LATIN = {
  amp: "&",
  AMP: "&",
  lt: "<",
  LT: "<",
  gt: ">",
  GT: ">",
  quot: '"',
  QUOT: '"',
  apos: "'",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquor: "\u201A",
  rsquor: "\u2019",
  ldquor: "\u201E",
  bdquo: "\u201E",
  comma: ",",
  period: ".",
  colon: ":",
  semi: ";",
  excl: "!",
  quest: "?",
  num: "#",
  dollar: "$",
  percent: "%",
  ast: "*",
  commat: "@",
  lowbar: "_",
  verbar: "|",
  vert: "|",
  sol: "/",
  bsol: "\\",
  lbrace: "{",
  rbrace: "}",
  lbrack: "[",
  rbrack: "]",
  lpar: "(",
  rpar: ")",
  nbsp: "\xA0",
  iexcl: "\xA1",
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  brvbar: "\xA6",
  sect: "\xA7",
  uml: "\xA8",
  copy: "\xA9",
  COPY: "\xA9",
  ordf: "\xAA",
  laquo: "\xAB",
  not: "\xAC",
  shy: "\xAD",
  reg: "\xAE",
  REG: "\xAE",
  macr: "\xAF",
  deg: "\xB0",
  plusmn: "\xB1",
  sup2: "\xB2",
  sup3: "\xB3",
  acute: "\xB4",
  micro: "\xB5",
  para: "\xB6",
  middot: "\xB7",
  cedil: "\xB8",
  sup1: "\xB9",
  ordm: "\xBA",
  raquo: "\xBB",
  frac14: "\xBC",
  frac12: "\xBD",
  half: "\xBD",
  frac34: "\xBE",
  iquest: "\xBF",
  times: "\xD7",
  div: "\xF7",
  divide: "\xF7"
};
var LATIN_ACCENTS = {
  Agrave: "\xC0",
  agrave: "\xE0",
  Aacute: "\xC1",
  aacute: "\xE1",
  Acirc: "\xC2",
  acirc: "\xE2",
  Atilde: "\xC3",
  atilde: "\xE3",
  Auml: "\xC4",
  auml: "\xE4",
  Aring: "\xC5",
  aring: "\xE5",
  AElig: "\xC6",
  aelig: "\xE6",
  Ccedil: "\xC7",
  ccedil: "\xE7",
  Egrave: "\xC8",
  egrave: "\xE8",
  Eacute: "\xC9",
  eacute: "\xE9",
  Ecirc: "\xCA",
  ecirc: "\xEA",
  Euml: "\xCB",
  euml: "\xEB",
  Igrave: "\xCC",
  igrave: "\xEC",
  Iacute: "\xCD",
  iacute: "\xED",
  Icirc: "\xCE",
  icirc: "\xEE",
  Iuml: "\xCF",
  iuml: "\xEF",
  ETH: "\xD0",
  eth: "\xF0",
  Ntilde: "\xD1",
  ntilde: "\xF1",
  Ograve: "\xD2",
  ograve: "\xF2",
  Oacute: "\xD3",
  oacute: "\xF3",
  Ocirc: "\xD4",
  ocirc: "\xF4",
  Otilde: "\xD5",
  otilde: "\xF5",
  Ouml: "\xD6",
  ouml: "\xF6",
  Oslash: "\xD8",
  oslash: "\xF8",
  Ugrave: "\xD9",
  ugrave: "\xF9",
  Uacute: "\xDA",
  uacute: "\xFA",
  Ucirc: "\xDB",
  ucirc: "\xFB",
  Uuml: "\xDC",
  uuml: "\xFC",
  Yacute: "\xDD",
  yacute: "\xFD",
  THORN: "\xDE",
  thorn: "\xFE",
  szlig: "\xDF",
  yuml: "\xFF",
  Yuml: "\u0178"
};
var LATIN_EXTENDED = {
  Amacr: "\u0100",
  amacr: "\u0101",
  Abreve: "\u0102",
  abreve: "\u0103",
  Aogon: "\u0104",
  aogon: "\u0105",
  Cacute: "\u0106",
  cacute: "\u0107",
  Ccirc: "\u0108",
  ccirc: "\u0109",
  Cdot: "\u010A",
  cdot: "\u010B",
  Ccaron: "\u010C",
  ccaron: "\u010D",
  Dcaron: "\u010E",
  dcaron: "\u010F",
  Dstrok: "\u0110",
  dstrok: "\u0111",
  Emacr: "\u0112",
  emacr: "\u0113",
  Ecaron: "\u011A",
  ecaron: "\u011B",
  Edot: "\u0116",
  edot: "\u0117",
  Eogon: "\u0118",
  eogon: "\u0119",
  Gcirc: "\u011C",
  gcirc: "\u011D",
  Gbreve: "\u011E",
  gbreve: "\u011F",
  Gdot: "\u0120",
  gdot: "\u0121",
  Gcedil: "\u0122",
  Hcirc: "\u0124",
  hcirc: "\u0125",
  Hstrok: "\u0126",
  hstrok: "\u0127",
  Itilde: "\u0128",
  itilde: "\u0129",
  Imacr: "\u012A",
  imacr: "\u012B",
  Iogon: "\u012E",
  iogon: "\u012F",
  Idot: "\u0130",
  IJlig: "\u0132",
  ijlig: "\u0133",
  Jcirc: "\u0134",
  jcirc: "\u0135",
  Kcedil: "\u0136",
  kcedil: "\u0137",
  kgreen: "\u0138",
  Lacute: "\u0139",
  lacute: "\u013A",
  Lcedil: "\u013B",
  lcedil: "\u013C",
  Lcaron: "\u013D",
  lcaron: "\u013E",
  Lmidot: "\u013F",
  lmidot: "\u0140",
  Lstrok: "\u0141",
  lstrok: "\u0142",
  Nacute: "\u0143",
  nacute: "\u0144",
  Ncaron: "\u0147",
  ncaron: "\u0148",
  Ncedil: "\u0145",
  ncedil: "\u0146",
  ENG: "\u014A",
  eng: "\u014B",
  Omacr: "\u014C",
  omacr: "\u014D",
  Odblac: "\u0150",
  odblac: "\u0151",
  OElig: "\u0152",
  oelig: "\u0153",
  Racute: "\u0154",
  racute: "\u0155",
  Rcaron: "\u0158",
  rcaron: "\u0159",
  Rcedil: "\u0156",
  rcedil: "\u0157",
  Sacute: "\u015A",
  sacute: "\u015B",
  Scirc: "\u015C",
  scirc: "\u015D",
  Scedil: "\u015E",
  scedil: "\u015F",
  Scaron: "\u0160",
  scaron: "\u0161",
  Tcedil: "\u0162",
  tcedil: "\u0163",
  Tcaron: "\u0164",
  tcaron: "\u0165",
  Tstrok: "\u0166",
  tstrok: "\u0167",
  Utilde: "\u0168",
  utilde: "\u0169",
  Umacr: "\u016A",
  umacr: "\u016B",
  Ubreve: "\u016C",
  ubreve: "\u016D",
  Uring: "\u016E",
  uring: "\u016F",
  Udblac: "\u0170",
  udblac: "\u0171",
  Uogon: "\u0172",
  uogon: "\u0173",
  Wcirc: "\u0174",
  wcirc: "\u0175",
  Ycirc: "\u0176",
  ycirc: "\u0177",
  Zacute: "\u0179",
  zacute: "\u017A",
  Zdot: "\u017B",
  zdot: "\u017C",
  Zcaron: "\u017D",
  zcaron: "\u017E"
};
var GREEK = {
  Alpha: "\u0391",
  alpha: "\u03B1",
  Beta: "\u0392",
  beta: "\u03B2",
  Gamma: "\u0393",
  gamma: "\u03B3",
  Delta: "\u0394",
  delta: "\u03B4",
  Epsilon: "\u0395",
  epsilon: "\u03B5",
  epsiv: "\u03F5",
  varepsilon: "\u03F5",
  Zeta: "\u0396",
  zeta: "\u03B6",
  Eta: "\u0397",
  eta: "\u03B7",
  Theta: "\u0398",
  theta: "\u03B8",
  thetasym: "\u03D1",
  vartheta: "\u03D1",
  Iota: "\u0399",
  iota: "\u03B9",
  Kappa: "\u039A",
  kappa: "\u03BA",
  kappav: "\u03F0",
  varkappa: "\u03F0",
  Lambda: "\u039B",
  lambda: "\u03BB",
  Mu: "\u039C",
  mu: "\u03BC",
  Nu: "\u039D",
  nu: "\u03BD",
  Xi: "\u039E",
  xi: "\u03BE",
  Omicron: "\u039F",
  omicron: "\u03BF",
  Pi: "\u03A0",
  pi: "\u03C0",
  piv: "\u03D6",
  varpi: "\u03D6",
  Rho: "\u03A1",
  rho: "\u03C1",
  rhov: "\u03F1",
  varrho: "\u03F1",
  Sigma: "\u03A3",
  sigma: "\u03C3",
  sigmaf: "\u03C2",
  sigmav: "\u03C2",
  varsigma: "\u03C2",
  Tau: "\u03A4",
  tau: "\u03C4",
  Upsilon: "\u03A5",
  upsilon: "\u03C5",
  upsi: "\u03C5",
  Upsi: "\u03D2",
  upsih: "\u03D2",
  Phi: "\u03A6",
  phi: "\u03C6",
  phiv: "\u03D5",
  varphi: "\u03D5",
  Chi: "\u03A7",
  chi: "\u03C7",
  Psi: "\u03A8",
  psi: "\u03C8",
  Omega: "\u03A9",
  omega: "\u03C9",
  ohm: "\u03A9",
  Gammad: "\u03DC",
  gammad: "\u03DD",
  digamma: "\u03DD"
};
var CYRILLIC = {
  Afr: "\u{1D504}",
  afr: "\u{1D51E}",
  Acy: "\u0410",
  acy: "\u0430",
  Bcy: "\u0411",
  bcy: "\u0431",
  Vcy: "\u0412",
  vcy: "\u0432",
  Gcy: "\u0413",
  gcy: "\u0433",
  Dcy: "\u0414",
  dcy: "\u0434",
  IEcy: "\u0415",
  iecy: "\u0435",
  IOcy: "\u0401",
  iocy: "\u0451",
  ZHcy: "\u0416",
  zhcy: "\u0436",
  Zcy: "\u0417",
  zcy: "\u0437",
  Icy: "\u0418",
  icy: "\u0438",
  Jcy: "\u0419",
  jcy: "\u0439",
  Kcy: "\u041A",
  kcy: "\u043A",
  Lcy: "\u041B",
  lcy: "\u043B",
  Mcy: "\u041C",
  mcy: "\u043C",
  Ncy: "\u041D",
  ncy: "\u043D",
  Ocy: "\u041E",
  ocy: "\u043E",
  Pcy: "\u041F",
  pcy: "\u043F",
  Rcy: "\u0420",
  rcy: "\u0440",
  Scy: "\u0421",
  scy: "\u0441",
  Tcy: "\u0422",
  tcy: "\u0442",
  Ucy: "\u0423",
  ucy: "\u0443",
  Fcy: "\u0424",
  fcy: "\u0444",
  KHcy: "\u0425",
  khcy: "\u0445",
  TScy: "\u0426",
  tscy: "\u0446",
  CHcy: "\u0427",
  chcy: "\u0447",
  SHcy: "\u0428",
  shcy: "\u0448",
  SHCHcy: "\u0429",
  shchcy: "\u0449",
  HARDcy: "\u042A",
  hardcy: "\u044A",
  Ycy: "\u042B",
  ycy: "\u044B",
  SOFTcy: "\u042C",
  softcy: "\u044C",
  Ecy: "\u042D",
  ecy: "\u044D",
  YUcy: "\u042E",
  yucy: "\u044E",
  YAcy: "\u042F",
  yacy: "\u044F",
  DJcy: "\u0402",
  djcy: "\u0452",
  GJcy: "\u0403",
  gjcy: "\u0453",
  Jukcy: "\u0404",
  jukcy: "\u0454",
  DScy: "\u0405",
  dscy: "\u0455",
  Iukcy: "\u0406",
  iukcy: "\u0456",
  YIcy: "\u0407",
  yicy: "\u0457",
  Jsercy: "\u0408",
  jsercy: "\u0458",
  LJcy: "\u0409",
  ljcy: "\u0459",
  NJcy: "\u040A",
  njcy: "\u045A",
  TSHcy: "\u040B",
  tshcy: "\u045B",
  KJcy: "\u040C",
  kjcy: "\u045C",
  Ubrcy: "\u040E",
  ubrcy: "\u045E",
  DZcy: "\u040F",
  dzcy: "\u045F"
};
var MATH = {
  plus: "+",
  pm: "\xB1",
  times: "\xD7",
  div: "\xF7",
  divide: "\xF7",
  sdot: "\u22C5",
  star: "\u2606",
  starf: "\u2605",
  bigstar: "\u2605",
  lowast: "\u2217",
  ast: "*",
  midast: "*",
  compfn: "\u2218",
  smallcircle: "\u2218",
  bullet: "\u2022",
  bull: "\u2022",
  nbsp: "\xA0",
  hellip: "\u2026",
  mldr: "\u2026",
  prime: "\u2032",
  Prime: "\u2033",
  tprime: "\u2034",
  bprime: "\u2035",
  backprime: "\u2035",
  minus: "\u2212",
  minusd: "\u2238",
  dotminus: "\u2238",
  plusdo: "\u2214",
  dotplus: "\u2214",
  plusmn: "\xB1",
  minusplus: "\u2213",
  mnplus: "\u2213",
  mp: "\u2213",
  setminus: "\u2216",
  smallsetminus: "\u2216",
  Backslash: "\u2216",
  setmn: "\u2216",
  ssetmn: "\u2216",
  lowbar: "_",
  verbar: "|",
  vert: "|",
  VerticalLine: "|",
  colon: ":",
  Colon: "\u2237",
  Proportion: "\u2237",
  ratio: "\u2236",
  equals: "=",
  ne: "\u2260",
  nequiv: "\u2262",
  equiv: "\u2261",
  Congruent: "\u2261",
  sim: "\u223C",
  thicksim: "\u223C",
  thksim: "\u223C",
  sime: "\u2243",
  simeq: "\u2243",
  TildeEqual: "\u2243",
  asymp: "\u2248",
  approx: "\u2248",
  thickapprox: "\u2248",
  thkap: "\u2248",
  TildeTilde: "\u2248",
  ncong: "\u2247",
  cong: "\u2245",
  TildeFullEqual: "\u2245",
  asympeq: "\u224D",
  CupCap: "\u224D",
  bump: "\u224E",
  Bumpeq: "\u224E",
  HumpDownHump: "\u224E",
  bumpe: "\u224F",
  bumpeq: "\u224F",
  HumpEqual: "\u224F",
  le: "\u2264",
  LessEqual: "\u2264",
  ge: "\u2265",
  GreaterEqual: "\u2265",
  lesseqgtr: "\u22DA",
  lesseqqgtr: "\u2A8B",
  greater: ">",
  less: "<"
};
var MATH_ADVANCED = {
  alefsym: "\u2135",
  aleph: "\u2135",
  beth: "\u2136",
  gimel: "\u2137",
  daleth: "\u2138",
  forall: "\u2200",
  ForAll: "\u2200",
  part: "\u2202",
  PartialD: "\u2202",
  exist: "\u2203",
  Exists: "\u2203",
  nexist: "\u2204",
  nexists: "\u2204",
  empty: "\u2205",
  emptyset: "\u2205",
  emptyv: "\u2205",
  varnothing: "\u2205",
  nabla: "\u2207",
  Del: "\u2207",
  isin: "\u2208",
  isinv: "\u2208",
  in: "\u2208",
  Element: "\u2208",
  notin: "\u2209",
  notinva: "\u2209",
  ni: "\u220B",
  niv: "\u220B",
  SuchThat: "\u220B",
  ReverseElement: "\u220B",
  notni: "\u220C",
  notniva: "\u220C",
  prod: "\u220F",
  Product: "\u220F",
  coprod: "\u2210",
  Coproduct: "\u2210",
  sum: "\u2211",
  Sum: "\u2211",
  minus: "\u2212",
  mp: "\u2213",
  plusdo: "\u2214",
  dotplus: "\u2214",
  setminus: "\u2216",
  lowast: "\u2217",
  radic: "\u221A",
  Sqrt: "\u221A",
  prop: "\u221D",
  propto: "\u221D",
  Proportional: "\u221D",
  varpropto: "\u221D",
  infin: "\u221E",
  infintie: "\u29DD",
  ang: "\u2220",
  angle: "\u2220",
  angmsd: "\u2221",
  measuredangle: "\u2221",
  angsph: "\u2222",
  mid: "\u2223",
  VerticalBar: "\u2223",
  nmid: "\u2224",
  nsmid: "\u2224",
  npar: "\u2226",
  parallel: "\u2225",
  spar: "\u2225",
  nparallel: "\u2226",
  nspar: "\u2226",
  and: "\u2227",
  wedge: "\u2227",
  or: "\u2228",
  vee: "\u2228",
  cap: "\u2229",
  cup: "\u222A",
  int: "\u222B",
  Integral: "\u222B",
  conint: "\u222E",
  ContourIntegral: "\u222E",
  Conint: "\u222F",
  DoubleContourIntegral: "\u222F",
  Cconint: "\u2230",
  there4: "\u2234",
  therefore: "\u2234",
  Therefore: "\u2234",
  becaus: "\u2235",
  because: "\u2235",
  Because: "\u2235",
  ratio: "\u2236",
  Proportion: "\u2237",
  minusd: "\u2238",
  dotminus: "\u2238",
  mDDot: "\u223A",
  homtht: "\u223B",
  sim: "\u223C",
  bsimg: "\u223D",
  backsim: "\u223D",
  ac: "\u223E",
  mstpos: "\u223E",
  acd: "\u223F",
  VerticalTilde: "\u2240",
  wr: "\u2240",
  wreath: "\u2240",
  nsime: "\u2244",
  nsimeq: "\u2244",
  ncong: "\u2247",
  simne: "\u2246",
  ncongdot: "\u2A6D\u0338",
  ngsim: "\u2275",
  nsim: "\u2241",
  napprox: "\u2249",
  nap: "\u2249",
  ngeq: "\u2271",
  nge: "\u2271",
  nleq: "\u2270",
  nle: "\u2270",
  ngtr: "\u226F",
  ngt: "\u226F",
  nless: "\u226E",
  nlt: "\u226E",
  nprec: "\u2280",
  npr: "\u2280",
  nsucc: "\u2281",
  nsc: "\u2281"
};
var ARROWS = {
  larr: "\u2190",
  leftarrow: "\u2190",
  LeftArrow: "\u2190",
  uarr: "\u2191",
  uparrow: "\u2191",
  UpArrow: "\u2191",
  rarr: "\u2192",
  rightarrow: "\u2192",
  RightArrow: "\u2192",
  darr: "\u2193",
  downarrow: "\u2193",
  DownArrow: "\u2193",
  harr: "\u2194",
  leftrightarrow: "\u2194",
  LeftRightArrow: "\u2194",
  varr: "\u2195",
  updownarrow: "\u2195",
  UpDownArrow: "\u2195",
  nwarr: "\u2196",
  nwarrow: "\u2196",
  UpperLeftArrow: "\u2196",
  nearr: "\u2197",
  nearrow: "\u2197",
  UpperRightArrow: "\u2197",
  searr: "\u2198",
  searrow: "\u2198",
  LowerRightArrow: "\u2198",
  swarr: "\u2199",
  swarrow: "\u2199",
  LowerLeftArrow: "\u2199",
  lArr: "\u21D0",
  Leftarrow: "\u21D0",
  uArr: "\u21D1",
  Uparrow: "\u21D1",
  rArr: "\u21D2",
  Rightarrow: "\u21D2",
  dArr: "\u21D3",
  Downarrow: "\u21D3",
  hArr: "\u21D4",
  Leftrightarrow: "\u21D4",
  iff: "\u21D4",
  vArr: "\u21D5",
  Updownarrow: "\u21D5",
  lAarr: "\u21DA",
  Lleftarrow: "\u21DA",
  rAarr: "\u21DB",
  Rrightarrow: "\u21DB",
  lrarr: "\u21C6",
  leftrightarrows: "\u21C6",
  rlarr: "\u21C4",
  rightleftarrows: "\u21C4",
  lrhar: "\u21CB",
  leftrightharpoons: "\u21CB",
  ReverseEquilibrium: "\u21CB",
  rlhar: "\u21CC",
  rightleftharpoons: "\u21CC",
  Equilibrium: "\u21CC",
  udarr: "\u21C5",
  UpArrowDownArrow: "\u21C5",
  duarr: "\u21F5",
  DownArrowUpArrow: "\u21F5",
  llarr: "\u21C7",
  leftleftarrows: "\u21C7",
  rrarr: "\u21C9",
  rightrightarrows: "\u21C9",
  ddarr: "\u21CA",
  downdownarrows: "\u21CA",
  har: "\u21BD",
  lhard: "\u21BD",
  leftharpoondown: "\u21BD",
  lharu: "\u21BC",
  leftharpoonup: "\u21BC",
  rhard: "\u21C1",
  rightharpoondown: "\u21C1",
  rharu: "\u21C0",
  rightharpoonup: "\u21C0",
  lsh: "\u21B0",
  Lsh: "\u21B0",
  rsh: "\u21B1",
  Rsh: "\u21B1",
  ldsh: "\u21B2",
  rdsh: "\u21B3",
  hookleftarrow: "\u21A9",
  hookrightarrow: "\u21AA",
  mapstoleft: "\u21A4",
  mapstoup: "\u21A5",
  map: "\u21A6",
  mapsto: "\u21A6",
  mapstodown: "\u21A7",
  crarr: "\u21B5",
  nleftarrow: "\u219A",
  nleftrightarrow: "\u21AE",
  nrightarrow: "\u219B",
  nrarr: "\u219B",
  larrtl: "\u21A2",
  rarrtl: "\u21A3",
  leftarrowtail: "\u21A2",
  rightarrowtail: "\u21A3",
  twoheadleftarrow: "\u219E",
  twoheadrightarrow: "\u21A0",
  Larr: "\u219E",
  Rarr: "\u21A0",
  larrhk: "\u21A9",
  rarrhk: "\u21AA",
  larrlp: "\u21AB",
  looparrowleft: "\u21AB",
  rarrlp: "\u21AC",
  looparrowright: "\u21AC",
  harrw: "\u21AD",
  leftrightsquigarrow: "\u21AD",
  nrarrw: "\u219D\u0338",
  rarrw: "\u219D",
  rightsquigarrow: "\u219D",
  larrbfs: "\u291F",
  rarrbfs: "\u2920",
  nvHarr: "\u2904",
  nvlArr: "\u2902",
  nvrArr: "\u2903",
  larrfs: "\u291D",
  rarrfs: "\u291E",
  Map: "\u2905",
  larrsim: "\u2973",
  rarrsim: "\u2974",
  harrcir: "\u2948",
  Uarrocir: "\u2949",
  lurdshar: "\u294A",
  ldrdhar: "\u2967",
  ldrushar: "\u294B",
  rdldhar: "\u2969",
  lrhard: "\u296D",
  uharr: "\u21BE",
  uharl: "\u21BF",
  dharr: "\u21C2",
  dharl: "\u21C3",
  Uarr: "\u219F",
  Darr: "\u21A1",
  zigrarr: "\u21DD",
  nwArr: "\u21D6",
  neArr: "\u21D7",
  seArr: "\u21D8",
  swArr: "\u21D9",
  nharr: "\u21AE",
  nhArr: "\u21CE",
  nlarr: "\u219A",
  nlArr: "\u21CD",
  nrArr: "\u21CF",
  larrb: "\u21E4",
  LeftArrowBar: "\u21E4",
  rarrb: "\u21E5",
  RightArrowBar: "\u21E5"
};
var SHAPES = {
  square: "\u25A1",
  Square: "\u25A1",
  squ: "\u25A1",
  squf: "\u25AA",
  squarf: "\u25AA",
  blacksquar: "\u25AA",
  blacksquare: "\u25AA",
  FilledVerySmallSquare: "\u25AA",
  blk34: "\u2593",
  blk12: "\u2592",
  blk14: "\u2591",
  block: "\u2588",
  srect: "\u25AD",
  rect: "\u25AD",
  sdot: "\u22C5",
  sdotb: "\u22A1",
  dotsquare: "\u22A1",
  triangle: "\u25B5",
  tri: "\u25B5",
  trine: "\u25B5",
  utri: "\u25B5",
  triangledown: "\u25BF",
  dtri: "\u25BF",
  tridown: "\u25BF",
  triangleleft: "\u25C3",
  ltri: "\u25C3",
  triangleright: "\u25B9",
  rtri: "\u25B9",
  blacktriangle: "\u25B4",
  utrif: "\u25B4",
  blacktriangledown: "\u25BE",
  dtrif: "\u25BE",
  blacktriangleleft: "\u25C2",
  ltrif: "\u25C2",
  blacktriangleright: "\u25B8",
  rtrif: "\u25B8",
  loz: "\u25CA",
  lozenge: "\u25CA",
  blacklozenge: "\u29EB",
  lozf: "\u29EB",
  bigcirc: "\u25EF",
  xcirc: "\u25EF",
  circ: "\u02C6",
  Circle: "\u25CB",
  cir: "\u25CB",
  o: "\u25CB",
  bullet: "\u2022",
  bull: "\u2022",
  hellip: "\u2026",
  mldr: "\u2026",
  nldr: "\u2025",
  boxh: "\u2500",
  HorizontalLine: "\u2500",
  boxv: "\u2502",
  boxdr: "\u250C",
  boxdl: "\u2510",
  boxur: "\u2514",
  boxul: "\u2518",
  boxvr: "\u251C",
  boxvl: "\u2524",
  boxhd: "\u252C",
  boxhu: "\u2534",
  boxvh: "\u253C",
  boxH: "\u2550",
  boxV: "\u2551",
  boxdR: "\u2552",
  boxDr: "\u2553",
  boxDR: "\u2554",
  boxDl: "\u2555",
  boxdL: "\u2556",
  boxDL: "\u2557",
  boxuR: "\u2558",
  boxUr: "\u2559",
  boxUR: "\u255A",
  boxUl: "\u255C",
  boxuL: "\u255B",
  boxUL: "\u255D",
  boxvR: "\u255E",
  boxVr: "\u255F",
  boxVR: "\u2560",
  boxVl: "\u2562",
  boxvL: "\u2561",
  boxVL: "\u2563",
  boxHd: "\u2564",
  boxhD: "\u2565",
  boxHD: "\u2566",
  boxHu: "\u2567",
  boxhU: "\u2568",
  boxHU: "\u2569",
  boxvH: "\u256A",
  boxVh: "\u256B",
  boxVH: "\u256C"
};
var PUNCTUATION = {
  excl: "!",
  iexcl: "\xA1",
  brvbar: "\xA6",
  sect: "\xA7",
  uml: "\xA8",
  copy: "\xA9",
  ordf: "\xAA",
  laquo: "\xAB",
  not: "\xAC",
  shy: "\xAD",
  reg: "\xAE",
  macr: "\xAF",
  deg: "\xB0",
  plusmn: "\xB1",
  sup2: "\xB2",
  sup3: "\xB3",
  acute: "\xB4",
  micro: "\xB5",
  para: "\xB6",
  middot: "\xB7",
  cedil: "\xB8",
  sup1: "\xB9",
  ordm: "\xBA",
  raquo: "\xBB",
  frac14: "\xBC",
  frac12: "\xBD",
  frac34: "\xBE",
  iquest: "\xBF",
  nbsp: "\xA0",
  comma: ",",
  period: ".",
  colon: ":",
  semi: ";",
  vert: "|",
  Verbar: "\u2016",
  verbar: "|",
  dblac: "\u02DD",
  circ: "\u02C6",
  caron: "\u02C7",
  breve: "\u02D8",
  dot: "\u02D9",
  ring: "\u02DA",
  ogon: "\u02DB",
  tilde: "\u02DC",
  DiacriticalGrave: "`",
  DiacriticalAcute: "\xB4",
  DiacriticalTilde: "\u02DC",
  DiacriticalDot: "\u02D9",
  DiacriticalDoubleAcute: "\u02DD",
  grave: "`"
};
var CURRENCY = {
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  euro: "\u20AC",
  dollar: "$",
  fnof: "\u0192",
  inr: "\u20B9",
  af: "\u060B",
  birr: "\u1265\u122D",
  peso: "\u20B1",
  rub: "\u20BD",
  won: "\u20A9",
  yuan: "\xA5",
  cedil: "\xB8"
};
var FRACTIONS = {
  frac12: "\xBD",
  half: "\xBD",
  frac13: "\u2153",
  frac14: "\xBC",
  frac15: "\u2155",
  frac16: "\u2159",
  frac18: "\u215B",
  frac23: "\u2154",
  frac25: "\u2156",
  frac34: "\xBE",
  frac35: "\u2157",
  frac38: "\u215C",
  frac45: "\u2158",
  frac56: "\u215A",
  frac58: "\u215D",
  frac78: "\u215E",
  frasl: "\u2044"
};
var MISC_SYMBOLS = {
  trade: "\u2122",
  TRADE: "\u2122",
  telrec: "\u2315",
  target: "\u2316",
  ulcorn: "\u231C",
  ulcorner: "\u231C",
  urcorn: "\u231D",
  urcorner: "\u231D",
  dlcorn: "\u231E",
  llcorner: "\u231E",
  drcorn: "\u231F",
  lrcorner: "\u231F",
  intercal: "\u22BA",
  intcal: "\u22BA",
  oplus: "\u2295",
  CirclePlus: "\u2295",
  ominus: "\u2296",
  CircleMinus: "\u2296",
  otimes: "\u2297",
  CircleTimes: "\u2297",
  osol: "\u2298",
  odot: "\u2299",
  CircleDot: "\u2299",
  oast: "\u229B",
  circledast: "\u229B",
  odash: "\u229D",
  circleddash: "\u229D",
  ocirc: "\u229A",
  circledcirc: "\u229A",
  boxplus: "\u229E",
  plusb: "\u229E",
  boxminus: "\u229F",
  minusb: "\u229F",
  boxtimes: "\u22A0",
  timesb: "\u22A0",
  boxdot: "\u22A1",
  sdotb: "\u22A1",
  veebar: "\u22BB",
  vee: "\u2228",
  barvee: "\u22BD",
  and: "\u2227",
  wedge: "\u2227",
  Cap: "\u22D2",
  Cup: "\u22D3",
  Fork: "\u22D4",
  pitchfork: "\u22D4",
  epar: "\u22D5",
  ltlarr: "\u2976",
  nvap: "\u224D\u20D2",
  nvsim: "\u223C\u20D2",
  nvge: "\u2265\u20D2",
  nvle: "\u2264\u20D2",
  nvlt: "<\u20D2",
  nvgt: ">\u20D2",
  nvltrie: "\u22B4\u20D2",
  nvrtrie: "\u22B5\u20D2",
  Vdash: "\u22A9",
  dashv: "\u22A3",
  vDash: "\u22A8",
  Vvdash: "\u22AA",
  nvdash: "\u22AC",
  nvDash: "\u22AD",
  nVdash: "\u22AE",
  nVDash: "\u22AF"
};
var ALL_ENTITIES = {
  ...BASIC_LATIN,
  ...LATIN_ACCENTS,
  ...LATIN_EXTENDED,
  ...GREEK,
  ...CYRILLIC,
  ...MATH,
  ...MATH_ADVANCED,
  ...ARROWS,
  ...SHAPES,
  ...PUNCTUATION,
  ...CURRENCY,
  ...FRACTIONS,
  ...MISC_SYMBOLS
};
var XML = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"'
};
var COMMON_HTML = {
  nbsp: "\xA0",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\xAB",
  raquo: "\xBB",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  para: "\xB6",
  sect: "\xA7",
  deg: "\xB0",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE"
};

// ../node_modules/@nodable/entities/src/EntityDecoder.js
var SPECIAL_CHARS = new Set("!?\\\\/[]$%{}^&*()<>|+");
function validateEntityName(name) {
  if (name[0] === "#") {
    throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
  }
  for (const ch of name) {
    if (SPECIAL_CHARS.has(ch)) {
      throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
    }
  }
  return name;
}
function mergeEntityMaps(...maps) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map)) {
      const raw2 = map[key];
      if (typeof raw2 === "string") {
        out[key] = raw2;
      } else if (raw2 && typeof raw2 === "object" && raw2.val !== void 0) {
        const val = raw2.val;
        if (typeof val === "string") {
          out[key] = val;
        }
      }
    }
  }
  return out;
}
var LIMIT_TIER_EXTERNAL = "external";
var LIMIT_TIER_BASE = "base";
var LIMIT_TIER_ALL = "all";
function parseLimitTiers(raw2) {
  if (!raw2 || raw2 === LIMIT_TIER_EXTERNAL) return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
  if (raw2 === LIMIT_TIER_ALL) return /* @__PURE__ */ new Set([LIMIT_TIER_ALL]);
  if (raw2 === LIMIT_TIER_BASE) return /* @__PURE__ */ new Set([LIMIT_TIER_BASE]);
  if (Array.isArray(raw2)) return new Set(raw2);
  return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
}
var NCR_LEVEL = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 });
var XML10_ALLOWED_C0 = /* @__PURE__ */ new Set([9, 10, 13]);
function parseNCRConfig(ncr) {
  if (!ncr) {
    return { xmlVersion: 1, onLevel: NCR_LEVEL.allow, nullLevel: NCR_LEVEL.remove };
  }
  const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1;
  const onLevel = NCR_LEVEL[ncr.onNCR] ?? NCR_LEVEL.allow;
  const nullLevel = NCR_LEVEL[ncr.nullNCR] ?? NCR_LEVEL.remove;
  const clampedNull = Math.max(nullLevel, NCR_LEVEL.remove);
  return { xmlVersion, onLevel, nullLevel: clampedNull };
}
var EntityDecoder = class {
  /**
   * @param {object} [options]
   * @param {object|null}  [options.namedEntities]        — extra named entities merged into base map
   * @param {object}  [options.limit]                 — security limits
   * @param {number}       [options.limit.maxTotalExpansions=0]  — 0 = unlimited
   * @param {number}       [options.limit.maxExpandedLength=0]   — 0 = unlimited
   * @param {'external'|'base'|'all'|string[]} [options.limit.applyLimitsTo='external']
   *   Which entity tiers count against the security limits:
   *   - 'external' (default) — only input/runtime + persistent external entities
   *   - 'base'               — only DEFAULT_XML_ENTITIES + namedEntities
   *   - 'all'                — every entity regardless of tier
   *   - string[]             — explicit combination, e.g. ['external', 'base']
   * @param {((resolved: string, original: string) => string)|null} [options.postCheck=null]
   * @param {string[]} [options.remove=[]] — entity names (e.g. ['nbsp', '#13']) to delete (replace with empty string)
   * @param {string[]} [options.leave=[]]  — entity names to keep as literal (unchanged in output)
   * @param {object}   [options.ncr]       — Numeric Character Reference controls
   * @param {1.0|1.1}  [options.ncr.xmlVersion=1.0]
   *   XML version governing which codepoint ranges are restricted:
   *   - 1.0 — C0 controls U+0001–U+001F (except U+0009/000A/000D) are prohibited
   *   - 1.1 — C0 controls are allowed when written as NCRs; C1 (U+007F–U+009F) decoded as-is
   * @param {'allow'|'leave'|'remove'|'throw'} [options.ncr.onNCR='allow']
   *   Base action for numeric references. Severity order: allow < leave < remove < throw.
   *   For codepoint ranges that carry a minimum level (surrogates → remove, XML 1.0 C0 → remove),
   *   the effective action is max(onNCR, rangeMinimum).
   * @param {'remove'|'throw'} [options.ncr.nullNCR='remove']
   *   Action for U+0000 (null). 'allow' and 'leave' are clamped to 'remove' since null is never safe.
   */
  constructor(options = {}) {
    this._limit = options.limit || {};
    this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
    this._maxExpandedLength = this._limit.maxExpandedLength || 0;
    this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
    this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
    this._numericAllowed = options.numericAllowed ?? true;
    this._baseMap = mergeEntityMaps(XML, options.namedEntities || null);
    this._externalMap = /* @__PURE__ */ Object.create(null);
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
    this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
    const ncrCfg = parseNCRConfig(options.ncr);
    this._ncrXmlVersion = ncrCfg.xmlVersion;
    this._ncrOnLevel = ncrCfg.onLevel;
    this._ncrNullLevel = ncrCfg.nullLevel;
  }
  // -------------------------------------------------------------------------
  // Persistent external entity registration
  // -------------------------------------------------------------------------
  /**
   * Replace the full set of persistent external entities.
   * All keys are validated — throws on invalid characters.
   * @param {Record<string, string | { regex?: RegExp, val: string }>} map
   */
  setExternalEntities(map) {
    if (map) {
      for (const key of Object.keys(map)) {
        validateEntityName(key);
      }
    }
    this._externalMap = mergeEntityMaps(map);
  }
  /**
   * Add a single persistent external entity.
   * @param {string} key
   * @param {string} value
   */
  addExternalEntity(key, value) {
    validateEntityName(key);
    if (typeof value === "string" && value.indexOf("&") === -1) {
      this._externalMap[key] = value;
    }
  }
  // -------------------------------------------------------------------------
  // Input / runtime entity registration (per document)
  // -------------------------------------------------------------------------
  /**
   * Inject DOCTYPE entities for the current document.
   * Also resets per-document expansion counters.
   * @param {Record<string, string | { regx?: RegExp, regex?: RegExp, val: string }>} map
   */
  addInputEntities(map) {
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._inputMap = mergeEntityMaps(map);
  }
  // -------------------------------------------------------------------------
  // Per-document reset
  // -------------------------------------------------------------------------
  /**
   * Wipe input/runtime entities and reset counters.
   * Call this before processing each new document.
   * @returns {this}
   */
  reset() {
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    return this;
  }
  // -------------------------------------------------------------------------
  // XML version (can be set after construction, e.g. once parser reads <?xml?>)
  // -------------------------------------------------------------------------
  /**
   * Update the XML version used for NCR classification.
   * Call this as soon as the document's `<?xml version="...">` declaration is parsed.
   * @param {1.0|1.1|number} version
   */
  setXmlVersion(version) {
    this._ncrXmlVersion = version === 1.1 ? 1.1 : 1;
  }
  // -------------------------------------------------------------------------
  // Primary API
  // -------------------------------------------------------------------------
  /**
   * Replace all entity references in `str` in a single pass.
   *
   * @param {string} str
   * @returns {string}
   */
  decode(str) {
    if (typeof str !== "string" || str.length === 0) return str;
    if (str.indexOf("&") === -1) return str;
    const original = str;
    const chunks = [];
    const len = str.length;
    let last = 0;
    let i = 0;
    const limitExpansions = this._maxTotalExpansions > 0;
    const limitLength = this._maxExpandedLength > 0;
    const checkLimits = limitExpansions || limitLength;
    while (i < len) {
      if (str.charCodeAt(i) !== 38) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < len && str.charCodeAt(j) !== 59 && j - i <= 32) j++;
      if (j >= len || str.charCodeAt(j) !== 59) {
        i++;
        continue;
      }
      const token = str.slice(i + 1, j);
      if (token.length === 0) {
        i++;
        continue;
      }
      let replacement;
      let tier;
      if (this._removeSet.has(token)) {
        replacement = "";
        if (tier === void 0) {
          tier = LIMIT_TIER_EXTERNAL;
        }
      } else if (this._leaveSet.has(token)) {
        i++;
        continue;
      } else if (token.charCodeAt(0) === 35) {
        const ncrResult = this._resolveNCR(token);
        if (ncrResult === void 0) {
          i++;
          continue;
        }
        replacement = ncrResult;
        tier = LIMIT_TIER_BASE;
      } else {
        const resolved = this._resolveName(token);
        replacement = resolved?.value;
        tier = resolved?.tier;
      }
      if (replacement === void 0) {
        i++;
        continue;
      }
      if (i > last) chunks.push(str.slice(last, i));
      chunks.push(replacement);
      last = j + 1;
      i = last;
      if (checkLimits && this._tierCounts(tier)) {
        if (limitExpansions) {
          this._totalExpansions++;
          if (this._totalExpansions > this._maxTotalExpansions) {
            throw new Error(
              `[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`
            );
          }
        }
        if (limitLength) {
          const delta = replacement.length - (token.length + 2);
          if (delta > 0) {
            this._expandedLength += delta;
            if (this._expandedLength > this._maxExpandedLength) {
              throw new Error(
                `[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`
              );
            }
          }
        }
      }
    }
    if (last < len) chunks.push(str.slice(last));
    const result = chunks.length === 0 ? str : chunks.join("");
    return this._postCheck(result, original);
  }
  // -------------------------------------------------------------------------
  // Private: limit tier check
  // -------------------------------------------------------------------------
  /**
   * Returns true if a resolved entity of the given tier should count
   * against the expansion/length limits.
   * @param {string} tier  — LIMIT_TIER_EXTERNAL | LIMIT_TIER_BASE
   * @returns {boolean}
   */
  _tierCounts(tier) {
    if (this._limitTiers.has(LIMIT_TIER_ALL)) return true;
    return this._limitTiers.has(tier);
  }
  // -------------------------------------------------------------------------
  // Private: entity resolution
  // -------------------------------------------------------------------------
  /**
   * Resolve a named entity token (without & and ;).
   * Priority: inputMap > externalMap > baseMap
   * Returns the resolved value tagged with its limit tier.
   *
   * @param {string} name
   * @returns {{ value: string, tier: string }|undefined}
   */
  _resolveName(name) {
    if (name in this._inputMap) return { value: this._inputMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._externalMap) return { value: this._externalMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._baseMap) return { value: this._baseMap[name], tier: LIMIT_TIER_BASE };
    return void 0;
  }
  /**
   * Classify a codepoint and return the minimum action level that must be applied.
   * Returns -1 when no minimum is imposed (normal allow path).
   *
   * Ranges checked (in priority order):
   *   1. U+0000            — null, governed by nullNCR (always ≥ remove)
   *   2. U+D800–U+DFFF     — surrogates, always prohibited (min: remove)
   *   3. U+0001–U+001F \ {0x09,0x0A,0x0D}  — XML 1.0 restricted C0 (min: remove)
   *      (skipped in XML 1.1 — C0 controls are allowed when written as NCRs)
   *
   * @param {number} cp  — codepoint
   * @returns {number}   — minimum NCR_LEVEL value, or -1 for no restriction
   */
  _classifyNCR(cp) {
    if (cp === 0) return this._ncrNullLevel;
    if (cp >= 55296 && cp <= 57343) return NCR_LEVEL.remove;
    if (this._ncrXmlVersion === 1) {
      if (cp >= 1 && cp <= 31 && !XML10_ALLOWED_C0.has(cp)) return NCR_LEVEL.remove;
    }
    return -1;
  }
  /**
   * Execute a resolved NCR action.
   *
   * @param {number} action   — NCR_LEVEL value
   * @param {string} token    — raw token (e.g. '#38') for error messages
   * @param {number} cp       — codepoint, used only for error messages
   * @returns {string|undefined}
   *   - decoded character string  → 'allow'
   *   - ''                        → 'remove'
   *   - undefined                 → 'leave' (caller must skip past '&' only)
   *   - throws Error              → 'throw'
   */
  _applyNCRAction(action, token, cp) {
    switch (action) {
      case NCR_LEVEL.allow:
        return String.fromCodePoint(cp);
      case NCR_LEVEL.remove:
        return "";
      case NCR_LEVEL.leave:
        return void 0;
      // signal: keep literal
      case NCR_LEVEL.throw:
        throw new Error(
          `[EntityDecoder] Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`
        );
      default:
        return String.fromCodePoint(cp);
    }
  }
  /**
   * Full NCR resolution pipeline for a numeric token.
   *
   * Steps:
   *   1. Parse the codepoint (decimal or hex).
   *   2. Validate the raw codepoint range (NaN, <0, >0x10FFFF).
   *   3. If numericAllowed is false and no minimum restriction applies → leave as-is.
   *   4. Classify the codepoint to find the minimum required action level.
   *   5. Resolve effective action = max(onNCR, minimum).
   *   6. Apply and return.
   *
   * @param {string} token  — e.g. '#38', '#x26', '#X26'
   * @returns {string|undefined}
   *   - string (incl. '')  — replacement ('' = remove)
   *   - undefined          — leave original &token; as-is
   */
  _resolveNCR(token) {
    const second = token.charCodeAt(1);
    let cp;
    if (second === 120 || second === 88) {
      cp = parseInt(token.slice(2), 16);
    } else {
      cp = parseInt(token.slice(1), 10);
    }
    if (Number.isNaN(cp) || cp < 0 || cp > 1114111) return void 0;
    const minimum = this._classifyNCR(cp);
    if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return void 0;
    const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
    return this._applyNCRAction(effective, token, cp);
  }
};

// ../node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};
var defaultOptions2 = {
  preserveOrder: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  ignoreAttributes: true,
  removeNSPrefix: false,
  // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true
  },
  tagValueProcessor: function(tagName, val) {
    return val;
  },
  attributeValueProcessor: function(attrName, val) {
    return val;
  },
  stopNodes: [],
  //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  entityDecoder: null,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function(tagName, jPath, attrs) {
    return tagName;
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true,
  // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== "string") {
    return;
  }
  const normalized = propertyName.toLowerCase();
  if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
  if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
}
function normalizeProcessEntities(value, htmlEntities) {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      // true or false
      maxEntitySize: 1e4,
      maxExpansionDepth: 1e4,
      maxTotalExpansions: Infinity,
      maxExpandedLength: 1e5,
      maxEntityCount: 1e3,
      allowedTags: null,
      tagFilter: null,
      appliesTo: "all"
    };
  }
  if (typeof value === "object" && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
      maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
      maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
      maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
      maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null,
      appliesTo: value.appliesTo ?? "all"
    };
  }
  return normalizeProcessEntities(true);
}
var buildOptions = function(options) {
  const built = Object.assign({}, defaultOptions2, options);
  const propertyNameOptions = [
    { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
    { value: built.attributesGroupName, name: "attributesGroupName" },
    { value: built.textNodeName, name: "textNodeName" },
    { value: built.cdataPropName, name: "cdataPropName" },
    { value: built.commentPropName, name: "commentPropName" }
  ];
  for (const { value, name } of propertyNameOptions) {
    if (value) {
      validatePropertyName(value, name);
    }
  }
  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }
  built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);
  built.unpairedTagsSet = new Set(built.unpairedTags);
  if (built.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map((node) => {
      if (typeof node === "string" && node.startsWith("*.")) {
        return ".." + node.substring(2);
      }
      return node;
    });
  }
  return built;
};

// ../node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var METADATA_SYMBOL;
if (typeof Symbol !== "function") {
  METADATA_SYMBOL = "@@xmlMetadata";
} else {
  METADATA_SYMBOL = /* @__PURE__ */ Symbol("XML Node Metadata");
}
var XmlNode = class {
  constructor(tagname) {
    this.tagname = tagname;
    this.child = [];
    this[":@"] = /* @__PURE__ */ Object.create(null);
  }
  add(key, val) {
    if (key === "__proto__") key = "#__proto__";
    this.child.push({ [key]: val });
  }
  addChild(node, startIndex) {
    if (node.tagname === "__proto__") node.tagname = "#__proto__";
    if (node[":@"] && Object.keys(node[":@"]).length > 0) {
      this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
    } else {
      this.child.push({ [node.tagname]: node.child });
    }
    if (startIndex !== void 0) {
      this.child[this.child.length - 1][METADATA_SYMBOL] = { startIndex };
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL;
  }
};

// ../node_modules/xml-naming/src/index.js
var nameStartChar10 = ":A-Za-z_\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
var nameChar10 = nameStartChar10 + "\\-\\.\\d\xB7\u0300-\u036F\u203F-\u2040";
var nameStartChar11 = ":A-Za-z_\xC0-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
var nameChar11 = nameStartChar11 + "\\-\\.\\d\xB7\u0300-\u036F\u0487\u203F-\u2040";
var buildRegexes = (startChar, char, flags = "") => {
  const ncStart = startChar.replace(":", "");
  const ncChar = char.replace(":", "");
  const ncNamePat = `[${ncStart}][${ncChar}]*`;
  return {
    name: new RegExp(`^[${startChar}][${char}]*$`, flags),
    ncName: new RegExp(`^${ncNamePat}$`, flags),
    qName: new RegExp(`^${ncNamePat}(?::${ncNamePat})?$`, flags),
    nmToken: new RegExp(`^[${char}]+$`, flags),
    nmTokens: new RegExp(`^[${char}]+(?:\\s+[${char}]+)*$`, flags)
  };
};
var regexes10 = buildRegexes(nameStartChar10, nameChar10);
var regexes11 = buildRegexes(nameStartChar11, nameChar11, "u");
var getRegexes = (xmlVersion = "1.0") => xmlVersion === "1.1" ? regexes11 : regexes10;
var qName = (str, { xmlVersion = "1.0" } = {}) => getRegexes(xmlVersion).qName.test(str);

// ../node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
  constructor(options, xmlVersion) {
    this.suppressValidationErr = !options;
    this.options = options;
    this.xmlVersion = xmlVersion || 1;
  }
  setXmlVersion(xmlVersion = 1) {
    this.xmlVersion = xmlVersion;
  }
  readDocType(xmlData, i) {
    const entities = /* @__PURE__ */ Object.create(null);
    let entityCount = 0;
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
            if (val.indexOf("&") === -1) {
              if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                throw new Error(
                  `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                );
              }
              entities[entityName] = val;
              entityCount++;
            }
          } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
            i += 8;
            const { index } = this.readElementExp(xmlData, i + 1);
            i = index;
          } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
            i += 8;
          } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
            i += 9;
            const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
            i = index;
          } else if (hasSeq(xmlData, "!--", i)) comment = true;
          else throw new Error(`Invalid DOCTYPE`);
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  readEntityExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
      i++;
    }
    let entityName = xmlData.substring(startIndex, i);
    validateEntityName2(entityName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    if (!this.suppressValidationErr) {
      if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
      } else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
      }
    }
    let entityValue = "";
    [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
    if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
      throw new Error(
        `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
      );
    }
    i--;
    return [entityName, entityValue, i];
  }
  readNotationExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let notationName = xmlData.substring(startIndex, i);
    !this.suppressValidationErr && validateEntityName2(notationName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
      throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;
    i = skipWhitespace(xmlData, i);
    let publicIdentifier = null;
    let systemIdentifier = null;
    if (identifierType === "PUBLIC") {
      [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] === '"' || xmlData[i] === "'") {
        [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      }
    } else if (identifierType === "SYSTEM") {
      [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      if (!this.suppressValidationErr && !systemIdentifier) {
        throw new Error("Missing mandatory system identifier for SYSTEM notation");
      }
    }
    return { notationName, publicIdentifier, systemIdentifier, index: --i };
  }
  readIdentifierVal(xmlData, i, type) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
      throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;
    const startIndex = i;
    while (i < xmlData.length && xmlData[i] !== startChar) {
      i++;
    }
    identifierVal = xmlData.substring(startIndex, i);
    if (xmlData[i] !== startChar) {
      throw new Error(`Unterminated ${type} value`);
    }
    i++;
    return [i, identifierVal];
  }
  readElementExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    if (!this.suppressValidationErr && !qName(elementName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid element name: "${elementName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
    else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
    else if (xmlData[i] === "(") {
      i++;
      const startIndex2 = i;
      while (i < xmlData.length && xmlData[i] !== ")") {
        i++;
      }
      contentModel = xmlData.substring(startIndex2, i);
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated content model");
      }
    } else if (!this.suppressValidationErr) {
      throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    return {
      elementName,
      contentModel: contentModel.trim(),
      index: i
    };
  }
  readAttlistExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    let startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    validateEntityName2(elementName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let attributeName = xmlData.substring(startIndex, i);
    if (!validateEntityName2(attributeName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid attribute name: "${attributeName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let attributeType = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
      attributeType = "NOTATION";
      i += 8;
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] !== "(") {
        throw new Error(`Expected '(', found "${xmlData[i]}"`);
      }
      i++;
      let allowedNotations = [];
      while (i < xmlData.length && xmlData[i] !== ")") {
        const startIndex2 = i;
        while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
          i++;
        }
        let notation = xmlData.substring(startIndex2, i);
        notation = notation.trim();
        if (!validateEntityName2(notation, { xmlVersion: this.xmlVersion })) {
          throw new Error(`Invalid notation name: "${notation}"`);
        }
        allowedNotations.push(notation);
        if (xmlData[i] === "|") {
          i++;
          i = skipWhitespace(xmlData, i);
        }
      }
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated list of notations");
      }
      i++;
      attributeType += " (" + allowedNotations.join("|") + ")";
    } else {
      const startIndex2 = i;
      while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        i++;
      }
      attributeType += xmlData.substring(startIndex2, i);
      const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
        throw new Error(`Invalid attribute type: "${attributeType}"`);
      }
    }
    i = skipWhitespace(xmlData, i);
    let defaultValue = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
      defaultValue = "#REQUIRED";
      i += 8;
    } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
      defaultValue = "#IMPLIED";
      i += 7;
    } else {
      [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
    }
    return {
      elementName,
      attributeName,
      attributeType,
      defaultValue,
      index: i
    };
  }
};
var skipWhitespace = (data, index) => {
  while (index < data.length && /\s/.test(data[index])) {
    index++;
  }
  return index;
};
function hasSeq(data, seq, i) {
  for (let j = 0; j < seq.length; j++) {
    if (seq[j] !== data[i + j + 1]) return false;
  }
  return true;
}
function validateEntityName2(name, xmlVersion) {
  if (qName(name, { xmlVersion }))
    return name;
  else
    throw new Error(`Invalid entity name ${name}`);
}

// ../node_modules/strnum/strnum.js
var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
var binRegex = /^0b[01]+$/;
var octRegex = /^0o[0-7]+$/;
var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
var consider = {
  hex: true,
  binary: false,
  octal: false,
  leadingZeros: true,
  decimalPoint: ".",
  eNotation: true,
  //skipLike: /regex/,
  infinity: "original"
  // "null", "infinity" (Infinity type), "string" ("Infinity" (the string literal))
};
function toNumber(str, options = {}) {
  options = Object.assign({}, consider, options);
  if (!str || typeof str !== "string") return str;
  let trimmedStr = str.trim();
  if (trimmedStr.length === 0) return str;
  else if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
  else if (trimmedStr === "0") return 0;
  else if (options.hex && hexRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 16);
  } else if (options.binary && binRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 2);
  } else if (options.octal && octRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 8);
  } else if (!isFinite(trimmedStr)) {
    return handleInfinity(str, Number(trimmedStr), options);
  } else if (trimmedStr.includes("e") || trimmedStr.includes("E")) {
    return resolveEnotation(str, trimmedStr, options);
  } else {
    const match2 = numRegex.exec(trimmedStr);
    if (match2) {
      const sign = match2[1] || "";
      const leadingZeros = match2[2];
      let numTrimmedByZeros = trimZeros(match2[3]);
      const decimalAdjacentToLeadingZeros = sign ? (
        // 0., -00., 000.
        str[leadingZeros.length + 1] === "."
      ) : str[leadingZeros.length] === ".";
      if (!options.leadingZeros && (leadingZeros.length > 1 || leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros)) {
        return str;
      } else {
        const num = Number(trimmedStr);
        const parsedStr = String(num);
        if (num === 0) return num;
        if (parsedStr.search(/[eE]/) !== -1) {
          if (options.eNotation) return num;
          else return str;
        } else if (trimmedStr.indexOf(".") !== -1) {
          if (parsedStr === "0") return num;
          else if (parsedStr === numTrimmedByZeros) return num;
          else if (parsedStr === `${sign}${numTrimmedByZeros}`) return num;
          else return str;
        }
        let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
        if (leadingZeros) {
          return n === parsedStr || sign + n === parsedStr ? num : str;
        } else {
          return n === parsedStr || n === sign + parsedStr ? num : str;
        }
      }
    } else {
      return str;
    }
  }
}
var eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str, trimmedStr, options) {
  if (!options.eNotation) return str;
  const notation = trimmedStr.match(eNotationRegx);
  if (notation) {
    let sign = notation[1] || "";
    const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
    const leadingZeros = notation[2];
    const eAdjacentToLeadingZeros = sign ? (
      // 0E.
      str[leadingZeros.length + 1] === eChar
    ) : str[leadingZeros.length] === eChar;
    if (leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str;
    else if (leadingZeros.length === 1 && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)) {
      return Number(trimmedStr);
    } else if (leadingZeros.length > 0) {
      if (options.leadingZeros && !eAdjacentToLeadingZeros) {
        trimmedStr = (notation[1] || "") + notation[3];
        return Number(trimmedStr);
      } else return str;
    } else {
      return Number(trimmedStr);
    }
  } else {
    return str;
  }
}
function trimZeros(numStr) {
  if (numStr && numStr.indexOf(".") !== -1) {
    numStr = numStr.replace(/0+$/, "");
    if (numStr === ".") numStr = "0";
    else if (numStr[0] === ".") numStr = "0" + numStr;
    else if (numStr[numStr.length - 1] === ".") numStr = numStr.substring(0, numStr.length - 1);
    return numStr;
  }
  return numStr;
}
function parse_int(numStr, base) {
  const str = numStr.trim();
  if (base === 2 || base === 8) numStr = str.substring(2);
  if (parseInt) return parseInt(numStr, base);
  else if (Number.parseInt) return Number.parseInt(numStr, base);
  else if (window && window.parseInt) return window.parseInt(numStr, base);
  else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
function handleInfinity(str, num, options) {
  const isPositive = num === Infinity;
  switch (options.infinity.toLowerCase()) {
    case "null":
      return null;
    case "infinity":
      return num;
    // Return Infinity or -Infinity
    case "string":
      return isPositive ? "Infinity" : "-Infinity";
    case "original":
    default:
      return str;
  }
}

// ../node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
  if (typeof ignoreAttributes === "function") {
    return ignoreAttributes;
  }
  if (Array.isArray(ignoreAttributes)) {
    return (attrName) => {
      for (const pattern of ignoreAttributes) {
        if (typeof pattern === "string" && attrName === pattern) {
          return true;
        }
        if (pattern instanceof RegExp && pattern.test(attrName)) {
          return true;
        }
      }
    };
  }
  return () => false;
}

// ../node_modules/path-expression-matcher/src/Expression.js
var Expression = class {
  /**
   * Create a new Expression
   * @param {string} pattern - Pattern string (e.g., "root.users.user", "..user[id]")
   * @param {Object} options - Configuration options
   * @param {string} options.separator - Path separator (default: '.')
   */
  constructor(pattern, options = {}, data) {
    this.pattern = pattern;
    this.separator = options.separator || ".";
    this.segments = this._parse(pattern);
    this.data = data;
    this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
    this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== void 0);
    this._hasPositionSelector = this.segments.some((seg) => seg.position !== void 0);
  }
  /**
   * Parse pattern string into segments
   * @private
   * @param {string} pattern - Pattern to parse
   * @returns {Array} Array of segment objects
   */
  _parse(pattern) {
    const segments = [];
    let i = 0;
    let currentPart = "";
    while (i < pattern.length) {
      if (pattern[i] === this.separator) {
        if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
            currentPart = "";
          }
          segments.push({ type: "deep-wildcard" });
          i += 2;
        } else {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
          }
          currentPart = "";
          i++;
        }
      } else {
        currentPart += pattern[i];
        i++;
      }
    }
    if (currentPart.trim()) {
      segments.push(this._parseSegment(currentPart.trim()));
    }
    return segments;
  }
  /**
   * Parse a single segment
   * @private
   * @param {string} part - Segment string (e.g., "user", "ns::user", "user[id]", "ns::user:first")
   * @returns {Object} Segment object
   */
  _parseSegment(part) {
    const segment = { type: "tag" };
    let bracketContent = null;
    let withoutBrackets = part;
    const bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
    if (bracketMatch) {
      withoutBrackets = bracketMatch[1] + bracketMatch[3];
      if (bracketMatch[2]) {
        const content = bracketMatch[2].slice(1, -1);
        if (content) {
          bracketContent = content;
        }
      }
    }
    let namespace = void 0;
    let tagAndPosition = withoutBrackets;
    if (withoutBrackets.includes("::")) {
      const nsIndex = withoutBrackets.indexOf("::");
      namespace = withoutBrackets.substring(0, nsIndex).trim();
      tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
      if (!namespace) {
        throw new Error(`Invalid namespace in pattern: ${part}`);
      }
    }
    let tag = void 0;
    let positionMatch = null;
    if (tagAndPosition.includes(":")) {
      const colonIndex = tagAndPosition.lastIndexOf(":");
      const tagPart = tagAndPosition.substring(0, colonIndex).trim();
      const posPart = tagAndPosition.substring(colonIndex + 1).trim();
      const isPositionKeyword = ["first", "last", "odd", "even"].includes(posPart) || /^nth\(\d+\)$/.test(posPart);
      if (isPositionKeyword) {
        tag = tagPart;
        positionMatch = posPart;
      } else {
        tag = tagAndPosition;
      }
    } else {
      tag = tagAndPosition;
    }
    if (!tag) {
      throw new Error(`Invalid segment pattern: ${part}`);
    }
    segment.tag = tag;
    if (namespace) {
      segment.namespace = namespace;
    }
    if (bracketContent) {
      if (bracketContent.includes("=")) {
        const eqIndex = bracketContent.indexOf("=");
        segment.attrName = bracketContent.substring(0, eqIndex).trim();
        segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
      } else {
        segment.attrName = bracketContent.trim();
      }
    }
    if (positionMatch) {
      const nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
      if (nthMatch) {
        segment.position = "nth";
        segment.positionValue = parseInt(nthMatch[1], 10);
      } else {
        segment.position = positionMatch;
      }
    }
    return segment;
  }
  /**
   * Get the number of segments
   * @returns {number}
   */
  get length() {
    return this.segments.length;
  }
  /**
   * Check if expression contains deep wildcard
   * @returns {boolean}
   */
  hasDeepWildcard() {
    return this._hasDeepWildcard;
  }
  /**
   * Check if expression has attribute conditions
   * @returns {boolean}
   */
  hasAttributeCondition() {
    return this._hasAttributeCondition;
  }
  /**
   * Check if expression has position selectors
   * @returns {boolean}
   */
  hasPositionSelector() {
    return this._hasPositionSelector;
  }
  /**
   * Get string representation
   * @returns {string}
   */
  toString() {
    return this.pattern;
  }
};

// ../node_modules/path-expression-matcher/src/ExpressionSet.js
var ExpressionSet = class {
  constructor() {
    this._byDepthAndTag = /* @__PURE__ */ new Map();
    this._wildcardByDepth = /* @__PURE__ */ new Map();
    this._deepWildcards = [];
    this._patterns = /* @__PURE__ */ new Set();
    this._sealed = false;
  }
  /**
   * Add an Expression to the set.
   * Duplicate patterns (same pattern string) are silently ignored.
   *
   * @param {import('./Expression.js').default} expression - A pre-constructed Expression instance
   * @returns {this} for chaining
   * @throws {TypeError} if called after seal()
   *
   * @example
   * set.add(new Expression('root.users.user'));
   * set.add(new Expression('..script'));
   */
  add(expression) {
    if (this._sealed) {
      throw new TypeError(
        "ExpressionSet is sealed. Create a new ExpressionSet to add more expressions."
      );
    }
    if (this._patterns.has(expression.pattern)) return this;
    this._patterns.add(expression.pattern);
    if (expression.hasDeepWildcard()) {
      this._deepWildcards.push(expression);
      return this;
    }
    const depth = expression.length;
    const lastSeg = expression.segments[expression.segments.length - 1];
    const tag = lastSeg?.tag;
    if (!tag || tag === "*") {
      if (!this._wildcardByDepth.has(depth)) this._wildcardByDepth.set(depth, []);
      this._wildcardByDepth.get(depth).push(expression);
    } else {
      const key = `${depth}:${tag}`;
      if (!this._byDepthAndTag.has(key)) this._byDepthAndTag.set(key, []);
      this._byDepthAndTag.get(key).push(expression);
    }
    return this;
  }
  /**
   * Add multiple expressions at once.
   *
   * @param {import('./Expression.js').default[]} expressions - Array of Expression instances
   * @returns {this} for chaining
   *
   * @example
   * set.addAll([
   *   new Expression('root.users.user'),
   *   new Expression('root.config.setting'),
   * ]);
   */
  addAll(expressions) {
    for (const expr of expressions) this.add(expr);
    return this;
  }
  /**
   * Check whether a pattern string is already present in the set.
   *
   * @param {import('./Expression.js').default} expression
   * @returns {boolean}
   */
  has(expression) {
    return this._patterns.has(expression.pattern);
  }
  /**
   * Number of expressions in the set.
   * @type {number}
   */
  get size() {
    return this._patterns.size;
  }
  /**
   * Seal the set against further modifications.
   * Useful to prevent accidental mutations after config is built.
   * Calling add() or addAll() on a sealed set throws a TypeError.
   *
   * @returns {this}
   */
  seal() {
    this._sealed = true;
    return this;
  }
  /**
   * Whether the set has been sealed.
   * @type {boolean}
   */
  get isSealed() {
    return this._sealed;
  }
  /**
   * Test whether the matcher's current path matches any expression in the set.
   *
   * Evaluation order (cheapest → most expensive):
   *  1. Exact depth + tag bucket  — O(1) lookup, typically 0–2 expressions
   *  2. Depth-only wildcard bucket — O(1) lookup, rare
   *  3. Deep-wildcard list         — always checked, but usually small
   *
   * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
   * @returns {boolean} true if any expression matches the current path
   *
   * @example
   * if (stopNodes.matchesAny(matcher)) {
   *   // handle stop node
   * }
   */
  matchesAny(matcher) {
    return this.findMatch(matcher) !== null;
  }
  /**
  * Find and return the first Expression that matches the matcher's current path.
  *
  * Uses the same evaluation order as matchesAny (cheapest → most expensive):
  *  1. Exact depth + tag bucket
  *  2. Depth-only wildcard bucket
  *  3. Deep-wildcard list
  *
  * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
  * @returns {import('./Expression.js').default | null} the first matching Expression, or null
  *
  * @example
  * const expr = stopNodes.findMatch(matcher);
  * if (expr) {
  *   // access expr.config, expr.pattern, etc.
  * }
  */
  findMatch(matcher) {
    const depth = matcher.getDepth();
    const tag = matcher.getCurrentTag();
    const exactKey = `${depth}:${tag}`;
    const exactBucket = this._byDepthAndTag.get(exactKey);
    if (exactBucket) {
      for (let i = 0; i < exactBucket.length; i++) {
        if (matcher.matches(exactBucket[i])) return exactBucket[i];
      }
    }
    const wildcardBucket = this._wildcardByDepth.get(depth);
    if (wildcardBucket) {
      for (let i = 0; i < wildcardBucket.length; i++) {
        if (matcher.matches(wildcardBucket[i])) return wildcardBucket[i];
      }
    }
    for (let i = 0; i < this._deepWildcards.length; i++) {
      if (matcher.matches(this._deepWildcards[i])) return this._deepWildcards[i];
    }
    return null;
  }
};

// ../node_modules/path-expression-matcher/src/Matcher.js
var MatcherView = class {
  /**
   * @param {Matcher} matcher - The parent Matcher instance to read from.
   */
  constructor(matcher) {
    this._matcher = matcher;
  }
  /**
   * Get the path separator used by the parent matcher.
   * @returns {string}
   */
  get separator() {
    return this._matcher.separator;
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    const path4 = this._matcher.path;
    return path4.length > 0 ? path4[path4.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    const path4 = this._matcher.path;
    return path4.length > 0 ? path4[path4.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    const path4 = this._matcher.path;
    if (path4.length === 0) return void 0;
    return path4[path4.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    const path4 = this._matcher.path;
    if (path4.length === 0) return false;
    const current = path4[path4.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    const path4 = this._matcher.path;
    if (path4.length === 0) return -1;
    return path4[path4.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    const path4 = this._matcher.path;
    if (path4.length === 0) return -1;
    return path4[path4.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this._matcher.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    return this._matcher.toString(separator, includeNamespace);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this._matcher.path.map((n) => n.tag);
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    return this._matcher.matches(expression);
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this._matcher);
  }
};
var Matcher = class {
  /**
   * Create a new Matcher.
   * @param {Object} [options={}]
   * @param {string} [options.separator='.'] - Default path separator
   */
  constructor(options = {}) {
    this.separator = options.separator || ".";
    this.path = [];
    this.siblingStacks = [];
    this._pathStringCache = null;
    this._view = new MatcherView(this);
  }
  /**
   * Push a new tag onto the path.
   * @param {string} tagName
   * @param {Object|null} [attrValues=null]
   * @param {string|null} [namespace=null]
   */
  push(tagName, attrValues = null, namespace = null) {
    this._pathStringCache = null;
    if (this.path.length > 0) {
      this.path[this.path.length - 1].values = void 0;
    }
    const currentLevel = this.path.length;
    if (!this.siblingStacks[currentLevel]) {
      this.siblingStacks[currentLevel] = /* @__PURE__ */ new Map();
    }
    const siblings = this.siblingStacks[currentLevel];
    const siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
    const counter = siblings.get(siblingKey) || 0;
    let position = 0;
    for (const count of siblings.values()) {
      position += count;
    }
    siblings.set(siblingKey, counter + 1);
    const node = {
      tag: tagName,
      position,
      counter
    };
    if (namespace !== null && namespace !== void 0) {
      node.namespace = namespace;
    }
    if (attrValues !== null && attrValues !== void 0) {
      node.values = attrValues;
    }
    this.path.push(node);
  }
  /**
   * Pop the last tag from the path.
   * @returns {Object|undefined} The popped node
   */
  pop() {
    if (this.path.length === 0) return void 0;
    this._pathStringCache = null;
    const node = this.path.pop();
    if (this.siblingStacks.length > this.path.length + 1) {
      this.siblingStacks.length = this.path.length + 1;
    }
    return node;
  }
  /**
   * Update current node's attribute values.
   * Useful when attributes are parsed after push.
   * @param {Object} attrValues
   */
  updateCurrent(attrValues) {
    if (this.path.length > 0) {
      const current = this.path[this.path.length - 1];
      if (attrValues !== null && attrValues !== void 0) {
        current.values = attrValues;
      }
    }
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    if (this.path.length === 0) return void 0;
    return this.path[this.path.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    if (this.path.length === 0) return false;
    const current = this.path[this.path.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    const sep = separator || this.separator;
    const isDefault = sep === this.separator && includeNamespace === true;
    if (isDefault) {
      if (this._pathStringCache !== null) {
        return this._pathStringCache;
      }
      const result = this.path.map(
        (n) => n.namespace ? `${n.namespace}:${n.tag}` : n.tag
      ).join(sep);
      this._pathStringCache = result;
      return result;
    }
    return this.path.map(
      (n) => includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag
    ).join(sep);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this.path.map((n) => n.tag);
  }
  /**
   * Reset the path to empty.
   */
  reset() {
    this._pathStringCache = null;
    this.path = [];
    this.siblingStacks = [];
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    const segments = expression.segments;
    if (segments.length === 0) {
      return false;
    }
    if (expression.hasDeepWildcard()) {
      return this._matchWithDeepWildcard(segments);
    }
    return this._matchSimple(segments);
  }
  /**
   * @private
   */
  _matchSimple(segments) {
    if (this.path.length !== segments.length) {
      return false;
    }
    for (let i = 0; i < segments.length; i++) {
      if (!this._matchSegment(segments[i], this.path[i], i === this.path.length - 1)) {
        return false;
      }
    }
    return true;
  }
  /**
   * @private
   */
  _matchWithDeepWildcard(segments) {
    let pathIdx = this.path.length - 1;
    let segIdx = segments.length - 1;
    while (segIdx >= 0 && pathIdx >= 0) {
      const segment = segments[segIdx];
      if (segment.type === "deep-wildcard") {
        segIdx--;
        if (segIdx < 0) {
          return true;
        }
        const nextSeg = segments[segIdx];
        let found = false;
        for (let i = pathIdx; i >= 0; i--) {
          if (this._matchSegment(nextSeg, this.path[i], i === this.path.length - 1)) {
            pathIdx = i - 1;
            segIdx--;
            found = true;
            break;
          }
        }
        if (!found) {
          return false;
        }
      } else {
        if (!this._matchSegment(segment, this.path[pathIdx], pathIdx === this.path.length - 1)) {
          return false;
        }
        pathIdx--;
        segIdx--;
      }
    }
    return segIdx < 0;
  }
  /**
   * @private
   */
  _matchSegment(segment, node, isCurrentNode) {
    if (segment.tag !== "*" && segment.tag !== node.tag) {
      return false;
    }
    if (segment.namespace !== void 0) {
      if (segment.namespace !== "*" && segment.namespace !== node.namespace) {
        return false;
      }
    }
    if (segment.attrName !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      if (!node.values || !(segment.attrName in node.values)) {
        return false;
      }
      if (segment.attrValue !== void 0) {
        if (String(node.values[segment.attrName]) !== String(segment.attrValue)) {
          return false;
        }
      }
    }
    if (segment.position !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      const counter = node.counter ?? 0;
      if (segment.position === "first" && counter !== 0) {
        return false;
      } else if (segment.position === "odd" && counter % 2 !== 1) {
        return false;
      } else if (segment.position === "even" && counter % 2 !== 0) {
        return false;
      } else if (segment.position === "nth" && counter !== segment.positionValue) {
        return false;
      }
    }
    return true;
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this);
  }
  /**
   * Create a snapshot of current state.
   * @returns {Object}
   */
  snapshot() {
    return {
      path: this.path.map((node) => ({ ...node })),
      siblingStacks: this.siblingStacks.map((map) => new Map(map))
    };
  }
  /**
   * Restore state from snapshot.
   * @param {Object} snapshot
   */
  restore(snapshot) {
    this._pathStringCache = null;
    this.path = snapshot.path.map((node) => ({ ...node }));
    this.siblingStacks = snapshot.siblingStacks.map((map) => new Map(map));
  }
  /**
   * Return the read-only {@link MatcherView} for this matcher.
   *
   * The same instance is returned on every call — no allocation occurs.
   * It always reflects the current parser state and is safe to pass to
   * user callbacks without risk of accidental mutation.
   *
   * @returns {MatcherView}
   *
   * @example
   * const view = matcher.readOnly();
   * // pass view to callbacks — it stays in sync automatically
   * view.matches(expr);       // ✓
   * view.getCurrentTag();     // ✓
   * // view.push(...)         // ✗ method does not exist — caught by TypeScript
   */
  readOnly() {
    return this._view;
  }
};

// ../node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
function extractRawAttributes(prefixedAttrs, options) {
  if (!prefixedAttrs) return {};
  const attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
  if (!attrs) return {};
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(options.attributeNamePrefix)) {
      const rawName = key.substring(options.attributeNamePrefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function extractNamespace(rawTagName) {
  if (!rawTagName || typeof rawTagName !== "string") return void 0;
  const colonIndex = rawTagName.indexOf(":");
  if (colonIndex !== -1 && colonIndex > 0) {
    const ns = rawTagName.substring(0, colonIndex);
    if (ns !== "xmlns") {
      return ns;
    }
  }
  return void 0;
}
var OrderedObjParser = class {
  constructor(options, externalEntities) {
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.entityExpansionCount = 0;
    this.currentExpandedLength = 0;
    let namedEntities = { ...XML };
    if (this.options.entityDecoder) {
      this.entityDecoder = this.options.entityDecoder;
    } else {
      if (typeof this.options.htmlEntities === "object") namedEntities = this.options.htmlEntities;
      else if (this.options.htmlEntities === true) namedEntities = { ...COMMON_HTML, ...CURRENCY };
      this.entityDecoder = new EntityDecoder({
        namedEntities: { ...namedEntities, ...externalEntities },
        numericAllowed: this.options.htmlEntities,
        limit: {
          maxTotalExpansions: this.options.processEntities.maxTotalExpansions,
          maxExpandedLength: this.options.processEntities.maxExpandedLength,
          applyLimitsTo: this.options.processEntities.appliesTo
        }
        //postCheck: resolved => resolved
      });
    }
    this.matcher = new Matcher();
    this.readonlyMatcher = this.matcher.readOnly();
    this.isCurrentNodeStopNode = false;
    this.stopNodeExpressionsSet = new ExpressionSet();
    const stopNodesOpts = this.options.stopNodes;
    if (stopNodesOpts && stopNodesOpts.length > 0) {
      for (let i = 0; i < stopNodesOpts.length; i++) {
        const stopNodeExp = stopNodesOpts[i];
        if (typeof stopNodeExp === "string") {
          this.stopNodeExpressionsSet.add(new Expression(stopNodeExp));
        } else if (stopNodeExp instanceof Expression) {
          this.stopNodeExpressionsSet.add(stopNodeExp);
        }
      }
      this.stopNodeExpressionsSet.seal();
    }
  }
};
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  const options = this.options;
  if (val !== void 0) {
    if (options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if (val.length > 0) {
      if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
      const jPathOrMatcher = options.jPath ? jPath.toString() : jPath;
      const newval = options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
      if (newval === null || newval === void 0) {
        return val;
      } else if (typeof newval !== typeof val || newval !== val) {
        return newval;
      } else if (options.trimValues) {
        return parseValue(val, options.parseTagValue, options.numberParseOptions);
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal === val) {
          return parseValue(val, options.parseTagValue, options.numberParseOptions);
        } else {
          return val;
        }
      }
    }
  }
}
function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(":");
    const prefix = tagname.charAt(0) === "/" ? "/" : "";
    if (tags[0] === "xmlns") {
      return "";
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}
var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
function buildAttributesMap(attrStr, jPath, tagName, force = false) {
  const options = this.options;
  if (force === true || options.ignoreAttributes !== true && typeof attrStr === "string") {
    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length;
    const attrs = {};
    const processedVals = new Array(len);
    let hasRawAttrs = false;
    const rawAttrsForMatcher = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const oldVal = matches[i][4];
      if (attrName.length && oldVal !== void 0) {
        let val = oldVal;
        if (options.trimValues) val = val.trim();
        val = this.replaceEntitiesValue(val, tagName, this.readonlyMatcher);
        processedVals[i] = val;
        rawAttrsForMatcher[attrName] = val;
        hasRawAttrs = true;
      }
    }
    if (hasRawAttrs && typeof jPath === "object" && jPath.updateCurrent) {
      jPath.updateCurrent(rawAttrsForMatcher);
    }
    const jPathStr = options.jPath ? jPath.toString() : this.readonlyMatcher;
    let hasAttrs = false;
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
      let aName = options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (options.transformAttributeName) {
          aName = options.transformAttributeName(aName);
        }
        aName = sanitizeName(aName, options);
        if (matches[i][4] !== void 0) {
          const oldVal = processedVals[i];
          const newVal = options.attributeValueProcessor(attrName, oldVal, jPathStr);
          if (newVal === null || newVal === void 0) {
            attrs[aName] = oldVal;
          } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
            attrs[aName] = newVal;
          } else {
            attrs[aName] = parseValue(oldVal, options.parseAttributeValue, options.numberParseOptions);
          }
          hasAttrs = true;
        } else if (options.allowBooleanAttributes) {
          attrs[aName] = true;
          hasAttrs = true;
        }
      }
    }
    if (!hasAttrs) return;
    if (options.attributesGroupName && !options.preserveOrder) {
      const attrCollection = {};
      attrCollection[options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}
var parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  const xmlObj = new XmlNode("!xml");
  let currentNode = xmlObj;
  let textData = "";
  this.matcher.reset();
  this.entityDecoder.reset();
  this.entityExpansionCount = 0;
  this.currentExpandedLength = 0;
  const options = this.options;
  const docTypeReader = new DocTypeReader(options.processEntities);
  const xmlLen = xmlData.length;
  for (let i = 0; i < xmlLen; i++) {
    const ch = xmlData[i];
    if (ch === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i + 2, closeIndex).trim();
        if (options.removeNSPrefix) {
          const colonIndex = tagName.indexOf(":");
          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        tagName = transformTagName(options.transformTagName, tagName, "", options).tagName;
        if (currentNode) {
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        }
        const lastTagName = this.matcher.getCurrentTag();
        if (tagName && options.unpairedTagsSet.has(tagName)) {
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        if (lastTagName && options.unpairedTagsSet.has(lastTagName)) {
          this.matcher.pop();
          this.tagsNodeStack.pop();
        }
        this.matcher.pop();
        this.isCurrentNodeStopNode = false;
        currentNode = this.tagsNodeStack.pop();
        textData = "";
        i = closeIndex;
      } else if (c1 === 63) {
        let tagData = readTagExp(xmlData, i, false, "?>");
        if (!tagData) throw new Error("Pi Tag is not closed.");
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        const attsMap = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName, true);
        if (attsMap) {
          const ver = attsMap[this.options.attributeNamePrefix + "version"];
          this.entityDecoder.setXmlVersion(Number(ver) || 1);
          docTypeReader.setXmlVersion(Number(ver) || 1);
        }
        if (options.ignoreDeclaration && tagData.tagName === "?xml" || options.ignorePiTags) {
        } else {
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(options.textNodeName, "");
          if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent && options.ignoreAttributes !== true) {
            childNode[":@"] = attsMap;
          }
          this.addChild(currentNode, childNode, this.readonlyMatcher, i);
        }
        i = tagData.closeIndex + 1;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
        if (options.commentPropName) {
          const comment = xmlData.substring(i + 4, endIndex - 2);
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
          currentNode.add(options.commentPropName, [{ [options.textNodeName]: comment }]);
        }
        i = endIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 68) {
        const result = docTypeReader.readDocType(xmlData, i);
        this.entityDecoder.addInputEntities(result.entities);
        i = result.i;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9, closeIndex);
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
        if (val == void 0) val = "";
        if (options.cdataPropName) {
          currentNode.add(options.cdataPropName, [{ [options.textNodeName]: tagExp }]);
        } else {
          currentNode.add(options.textNodeName, val);
        }
        i = closeIndex + 2;
      } else {
        let result = readTagExp(xmlData, i, options.removeNSPrefix);
        if (!result) {
          const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlLen, i + 50));
          throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
        }
        let tagName = result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;
        ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
        if (options.strictReservedNames && (tagName === options.commentPropName || tagName === options.cdataPropName || tagName === options.textNodeName || tagName === options.attributesGroupName)) {
          throw new Error(`Invalid tag name: ${tagName}`);
        }
        if (currentNode && textData) {
          if (currentNode.tagname !== "!xml") {
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
          }
        }
        const lastTag = currentNode;
        if (lastTag && options.unpairedTagsSet.has(lastTag.tagname)) {
          currentNode = this.tagsNodeStack.pop();
          this.matcher.pop();
        }
        let isSelfClosing = false;
        if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
          isSelfClosing = true;
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          } else {
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }
          attrExpPresent = tagName !== tagExp;
        }
        let prefixedAttrs = null;
        let rawAttrs = {};
        let namespace = void 0;
        namespace = extractNamespace(rawTagName);
        if (tagName !== xmlObj.tagname) {
          this.matcher.push(tagName, {}, namespace);
        }
        if (tagName !== tagExp && attrExpPresent) {
          prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
          if (prefixedAttrs) {
            rawAttrs = extractRawAttributes(prefixedAttrs, options);
          }
        }
        if (tagName !== xmlObj.tagname) {
          this.isCurrentNodeStopNode = this.isItStopNode();
        }
        const startIndex = i;
        if (this.isCurrentNodeStopNode) {
          let tagContent = "";
          if (isSelfClosing) {
            i = result.closeIndex;
          } else if (options.unpairedTagsSet.has(tagName)) {
            i = result.closeIndex;
          } else {
            const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result2.i;
            tagContent = result2.tagContent;
          }
          const childNode = new XmlNode(tagName);
          if (prefixedAttrs) {
            childNode[":@"] = prefixedAttrs;
          }
          childNode.add(options.textNodeName, tagContent);
          this.matcher.pop();
          this.isCurrentNodeStopNode = false;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
        } else {
          if (isSelfClosing) {
            ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
          } else if (options.unpairedTagsSet.has(tagName)) {
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            i = result.closeIndex;
            continue;
          } else {
            const childNode = new XmlNode(tagName);
            if (this.tagsNodeStack.length > options.maxNestedTags) {
              throw new Error("Maximum nested tags exceeded");
            }
            this.tagsNodeStack.push(currentNode);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    } else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};
function addChild(currentNode, childNode, matcher, startIndex) {
  if (!this.options.captureMetaData) startIndex = void 0;
  const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
  const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
  if (result === false) {
  } else if (typeof result === "string") {
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  } else {
    currentNode.addChild(childNode, startIndex);
  }
}
function replaceEntitiesValue(val, tagName, jPath) {
  const entityConfig = this.options.processEntities;
  if (!entityConfig || !entityConfig.enabled) {
    return val;
  }
  if (entityConfig.allowedTags) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    const allowed = Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher);
    if (!allowed) {
      return val;
    }
  }
  if (entityConfig.tagFilter) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) {
      return val;
    }
  }
  return this.entityDecoder.decode(val);
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
  if (textData) {
    if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
    textData = this.parseTextData(
      textData,
      parentNode.tagname,
      matcher,
      false,
      parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
      isLeafNode
    );
    if (textData !== void 0 && textData !== "")
      parentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}
function isItStopNode() {
  if (this.stopNodeExpressionsSet.size === 0) return false;
  return this.matcher.matchesAny(this.stopNodeExpressionsSet);
}
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
  let attrBoundary = 0;
  const len = xmlData.length;
  const closeCode0 = closingChar.charCodeAt(0);
  const closeCode1 = closingChar.length > 1 ? closingChar.charCodeAt(1) : -1;
  let result = "";
  let segmentStart = i;
  for (let index = i; index < len; index++) {
    const code = xmlData.charCodeAt(index);
    if (attrBoundary) {
      if (code === attrBoundary) attrBoundary = 0;
    } else if (code === 34 || code === 39) {
      attrBoundary = code;
    } else if (code === closeCode0) {
      if (closeCode1 !== -1) {
        if (xmlData.charCodeAt(index + 1) === closeCode1) {
          result += xmlData.substring(segmentStart, index);
          return { data: result, index };
        }
      } else {
        result += xmlData.substring(segmentStart, index);
        return { data: result, index };
      }
    } else if (code === 9 && !attrBoundary) {
      result += xmlData.substring(segmentStart, index) + " ";
      segmentStart = index + 1;
    }
  }
}
function findClosingIndex(xmlData, str, i, errMsg) {
  const closingIndex = xmlData.indexOf(str, i);
  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str.length - 1;
  }
}
function findClosingChar(xmlData, char, i, errMsg) {
  const closingIndex = xmlData.indexOf(char, i);
  if (closingIndex === -1) throw new Error(errMsg);
  return closingIndex;
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
  const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
  if (!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if (separatorIndex !== -1) {
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }
  const rawTagName = tagName;
  if (removeNSPrefix) {
    const colonIndex = tagName.indexOf(":");
    if (colonIndex !== -1) {
      tagName = tagName.substr(colonIndex + 1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }
  return {
    tagName,
    tagExp,
    closeIndex,
    attrExpPresent,
    rawTagName
  };
}
function readStopNodeData(xmlData, tagName, i) {
  const startIndex = i;
  let openTagCount = 1;
  const xmllen = xmlData.length;
  for (; i < xmllen; i++) {
    if (xmlData[i] === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingChar(xmlData, ">", i, `${tagName} is not closed`);
        let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
        if (closeTagName === tagName) {
          openTagCount--;
          if (openTagCount === 0) {
            return {
              tagContent: xmlData.substring(startIndex, i),
              i: closeIndex
            };
          }
        }
        i = closeIndex;
      } else if (c1 === 63) {
        const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
        i = closeIndex;
      } else {
        const tagData = readTagExp(xmlData, i, false);
        if (tagData) {
          const openTagName = tagData && tagData.tagName;
          if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
            openTagCount++;
          }
          i = tagData.closeIndex;
        }
      }
    }
  }
}
function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === "string") {
    const newval = val.trim();
    if (newval === "true") return true;
    else if (newval === "false") return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return "";
    }
  }
}
function transformTagName(fn, tagName, tagExp, options) {
  if (fn) {
    const newTagName = fn(tagName);
    if (tagExp === tagName) {
      tagExp = newTagName;
    }
    tagName = newTagName;
  }
  tagName = sanitizeName(tagName, options);
  return { tagName, tagExp };
}
function sanitizeName(name, options) {
  if (criticalProperties.includes(name)) {
    throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
  } else if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return options.onDangerousProperty(name);
  }
  return name;
}

// ../node_modules/fast-xml-parser/src/xmlparser/node2json.js
var METADATA_SYMBOL2 = XmlNode.getMetaDataSymbol();
function stripAttributePrefix(attrs, prefix) {
  if (!attrs || typeof attrs !== "object") return {};
  if (!prefix) return attrs;
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(prefix)) {
      const rawName = key.substring(prefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function prettify(node, options, matcher, readonlyMatcher) {
  return compress(node, options, matcher, readonlyMatcher);
}
function compress(arr, options, matcher, readonlyMatcher) {
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName(tagObj);
    if (property !== void 0 && property !== options.textNodeName) {
      const rawAttrs = stripAttributePrefix(
        tagObj[":@"] || {},
        options.attributeNamePrefix
      );
      matcher.push(property, rawAttrs);
    }
    if (property === options.textNodeName) {
      if (text === void 0) text = tagObj[property];
      else text += "" + tagObj[property];
    } else if (property === void 0) {
      continue;
    } else if (tagObj[property]) {
      let val = compress(tagObj[property], options, matcher, readonlyMatcher);
      const isLeaf = isLeafTag(val, options);
      if (Object.keys(val).length === 0 && options.alwaysCreateTextNode) {
        val[options.textNodeName] = "";
      }
      if (tagObj[":@"]) {
        assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
      } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
        val = val[options.textNodeName];
      } else if (Object.keys(val).length === 0) {
        if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }
      if (tagObj[METADATA_SYMBOL2] !== void 0 && typeof val === "object" && val !== null) {
        val[METADATA_SYMBOL2] = tagObj[METADATA_SYMBOL2];
      }
      if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
        if (!Array.isArray(compressedObj[property])) {
          compressedObj[property] = [compressedObj[property]];
        }
        compressedObj[property].push(val);
      } else {
        const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
        if (options.isArray(property, jPathOrMatcher, isLeaf)) {
          compressedObj[property] = [val];
        } else {
          compressedObj[property] = val;
        }
      }
      if (property !== void 0 && property !== options.textNodeName) {
        matcher.pop();
      }
    }
  }
  if (typeof text === "string") {
    if (text.length > 0) compressedObj[options.textNodeName] = text;
  } else if (text !== void 0) compressedObj[options.textNodeName] = text;
  return compressedObj;
}
function propName(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== ":@") return key;
  }
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
      const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
      if (options.isArray(atrrName, jPathOrMatcher, true, true)) {
        obj[atrrName] = [attrMap[atrrName]];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}
function isLeafTag(obj, options) {
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  if (propCount === 0) {
    return true;
  }
  if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
    return true;
  }
  return false;
}

// ../node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
  constructor(options) {
    this.externalEntities = {};
    this.options = buildOptions(options);
  }
  /**
   * Parse XML dats to JS object 
   * @param {string|Uint8Array} xmlData 
   * @param {boolean|Object} validationOption 
   */
  parse(xmlData, validationOption) {
    if (typeof xmlData !== "string" && xmlData.toString) {
      xmlData = xmlData.toString();
    } else if (typeof xmlData !== "string") {
      throw new Error("XML data is accepted in String or Bytes[] form.");
    }
    if (validationOption) {
      if (validationOption === true) validationOption = {};
      const result = validate(xmlData, validationOption);
      if (result !== true) {
        throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
      }
    }
    const orderedObjParser = new OrderedObjParser(this.options, this.externalEntities);
    const orderedResult = orderedObjParser.parseXml(xmlData);
    if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
    else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
  }
  /**
   * Add Entity which is not by default supported by this library
   * @param {string} key 
   * @param {string} value 
   */
  addEntity(key, value) {
    if (value.indexOf("&") !== -1) {
      throw new Error("Entity value can't have '&'");
    } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
      throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    } else if (value === "&") {
      throw new Error("An entity with value '&' is not permitted");
    } else {
      this.externalEntities[key] = value;
    }
  }
  /**
   * Returns a Symbol that can be used to access the metadata
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when `captureMetaData`
   * is true in the options.
   */
  static getMetaDataSymbol() {
    return XmlNode.getMetaDataSymbol();
  }
};

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/agile/EncryptionDescriptor.js
var xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true
});
var RESERVED_VALUE = 64;
function parseEncryptionDescriptor(buffer2) {
  const reservedValue = buffer2.readInt16LE(4);
  if (reservedValue !== RESERVED_VALUE) {
    throw new Error(`Unexpected reserved value ${reservedValue}`);
  }
  const xmlBuffer = buffer2.slice(8);
  const xmlString = xmlBuffer.toString("ascii");
  const parsedXML = xmlParser.parse(xmlString);
  const keyData = parsedXML.encryption.keyData;
  const keyEncryptor = parsedXML.encryption.keyEncryptors.keyEncryptor["p:encryptedKey"];
  return {
    keyData: {
      blockSize: keyData.blockSize,
      cipher: {
        algorithm: keyData.cipherAlgorithm,
        chaining: keyData.cipherChaining
      },
      hash: {
        size: keyData.hashSize,
        algorithm: keyEncryptor.hashAlgorithm
      },
      salt: Buffer.from(keyData.saltValue, "base64")
    },
    passwordKeyEncryptor: {
      blockSize: keyEncryptor.blockSize,
      keyBits: keyEncryptor.keyBits,
      spinCount: keyEncryptor.spinCount,
      cipher: {
        algorithm: keyEncryptor.cipherAlgorithm,
        chaining: keyEncryptor.cipherChaining
      },
      hash: {
        size: keyEncryptor.hashSize,
        algorithm: keyEncryptor.hashAlgorithm
      },
      salt: Buffer.from(keyEncryptor.saltValue, "base64"),
      encrypted: {
        keyValue: Buffer.from(keyEncryptor.encryptedKeyValue, "base64"),
        verifierHashInput: Buffer.from(keyEncryptor.encryptedVerifierHashInput, "base64"),
        verifierHashValue: Buffer.from(keyEncryptor.encryptedVerifierHashValue, "base64")
      }
    }
  };
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/agile/index.js
var ENC_VERIFIER_INPUT_BLOCK = [254, 167, 210, 118, 59, 75, 158, 121];
var ENC_VERIFIER_VALUE_BLOCK = [215, 170, 15, 109, 48, 97, 52, 78];
var ENC_VALUE_BLOCK = [20, 110, 11, 231, 171, 172, 208, 214];
function createAgileCodecHandler(encodingKey, encryptionProvider, password) {
  const { keyData, passwordKeyEncryptor } = parseEncryptionDescriptor(encryptionProvider);
  const key = decryptKeyValue(password, passwordKeyEncryptor);
  const decryptPage = (b2, pageNumber) => {
    const pageEncodingKey = getPageEncodingKey(encodingKey, pageNumber);
    const iv = hash2(keyData.hash.algorithm, [keyData.salt, pageEncodingKey], keyData.blockSize);
    return blockDecrypt(keyData.cipher, key, iv, b2);
  };
  const verifyPassword = () => {
    const verifier = decryptVerifierHashInput(password, passwordKeyEncryptor);
    const verifierHash = decryptVerifierHashValue(password, passwordKeyEncryptor);
    let testHash = hash2(passwordKeyEncryptor.hash.algorithm, [verifier]);
    const blockSize = passwordKeyEncryptor.blockSize;
    if (testHash.length % blockSize != 0) {
      const hashLength = Math.floor((testHash.length + blockSize - 1) / blockSize) * blockSize;
      testHash = fixBufferLength(testHash, hashLength);
    }
    return verifierHash.equals(testHash);
  };
  return {
    decryptPage,
    verifyPassword
  };
}
function decryptKeyValue(password, passwordKeyEncryptor) {
  const key = deriveKey(password, Buffer.from(ENC_VALUE_BLOCK), passwordKeyEncryptor.hash.algorithm, passwordKeyEncryptor.salt, passwordKeyEncryptor.spinCount, roundToFullByte(passwordKeyEncryptor.keyBits));
  return blockDecrypt(passwordKeyEncryptor.cipher, key, passwordKeyEncryptor.salt, passwordKeyEncryptor.encrypted.keyValue);
}
function decryptVerifierHashInput(password, passwordKeyEncryptor) {
  const key = deriveKey(password, Buffer.from(ENC_VERIFIER_INPUT_BLOCK), passwordKeyEncryptor.hash.algorithm, passwordKeyEncryptor.salt, passwordKeyEncryptor.spinCount, roundToFullByte(passwordKeyEncryptor.keyBits));
  return blockDecrypt(passwordKeyEncryptor.cipher, key, passwordKeyEncryptor.salt, passwordKeyEncryptor.encrypted.verifierHashInput);
}
function decryptVerifierHashValue(password, passwordKeyEncryptor) {
  const key = deriveKey(password, Buffer.from(ENC_VERIFIER_VALUE_BLOCK), passwordKeyEncryptor.hash.algorithm, passwordKeyEncryptor.salt, passwordKeyEncryptor.spinCount, roundToFullByte(passwordKeyEncryptor.keyBits));
  return blockDecrypt(passwordKeyEncryptor.cipher, key, passwordKeyEncryptor.salt, passwordKeyEncryptor.encrypted.verifierHashValue);
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/CryptoAlgorithm.js
var EXTERNAL = {
  id: 0,
  encryptionVerifierHashLength: 0,
  keySizeMin: 0,
  keySizeMax: 0
};
var RC4 = {
  id: 26625,
  encryptionVerifierHashLength: 20,
  keySizeMin: 40,
  keySizeMax: 512
};
var AES_128 = {
  id: 26625,
  encryptionVerifierHashLength: 32,
  keySizeMin: 128,
  keySizeMax: 128
};
var AES_192 = {
  id: 26127,
  encryptionVerifierHashLength: 32,
  keySizeMin: 192,
  keySizeMax: 192
};
var AES_256 = {
  id: 26128,
  encryptionVerifierHashLength: 32,
  keySizeMin: 256,
  keySizeMax: 256
};
var CRYPTO_ALGORITHMS = { EXTERNAL, RC4, AES_128, AES_192, AES_256 };

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/HashAlgorithm.js
var EXTERNAL2 = { id: 0 };
var SHA1 = { id: 32772 };
var HASH_ALGORITHMS = { EXTERNAL: EXTERNAL2, SHA1 };

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/EncryptionHeader.js
var FLAGS_OFFSET = 0;
var CRYPTO_OFFSET = 8;
var HASH_OFFSET = 12;
var KEY_SIZE_OFFSET = 16;
var EncryptionHeaderFlags = {
  FCRYPTO_API_FLAG: 4,
  FDOC_PROPS_FLAG: 8,
  FEXTERNAL_FLAG: 16,
  FAES_FLAG: 32
};
function parseEncryptionHeader(buffer2, validCryptoAlgorithms, validHashAlgorithm) {
  const flags = buffer2.readInt32LE(FLAGS_OFFSET);
  const cryptoAlgorithm = getCryptoAlgorithm(buffer2.readInt32LE(CRYPTO_OFFSET), flags);
  const hashAlgorithm = getHashAlgorithm(buffer2.readInt32LE(HASH_OFFSET), flags);
  const keySize = getKeySize(buffer2.readInt32LE(KEY_SIZE_OFFSET), cryptoAlgorithm, getCSPName(buffer2.slice(32)));
  if (!validCryptoAlgorithms.includes(cryptoAlgorithm)) {
    throw new Error("Invalid encryption algorithm");
  }
  if (!validHashAlgorithm.includes(hashAlgorithm)) {
    throw new Error("Invalid hash algorithm");
  }
  if (!isInRange(cryptoAlgorithm.keySizeMin, cryptoAlgorithm.keySizeMax, keySize)) {
    throw new Error("Invalid key size");
  }
  if (keySize % 8 !== 0) {
    throw new Error("Key size must be multiple of 8");
  }
  return {
    cryptoAlgorithm,
    hashAlgorithm,
    keySize
  };
}
function getCryptoAlgorithm(id, flags) {
  if (id === CRYPTO_ALGORITHMS.EXTERNAL.id) {
    if (isFlagSet(flags, EncryptionHeaderFlags.FEXTERNAL_FLAG)) {
      return CRYPTO_ALGORITHMS.EXTERNAL;
    }
    if (isFlagSet(flags, EncryptionHeaderFlags.FCRYPTO_API_FLAG)) {
      if (isFlagSet(flags, EncryptionHeaderFlags.FAES_FLAG)) {
        return CRYPTO_ALGORITHMS.AES_128;
      } else {
        return CRYPTO_ALGORITHMS.RC4;
      }
    }
    throw new Error("Unsupported encryption algorithm");
  }
  const algorithm = Object.values(CRYPTO_ALGORITHMS).find((alg) => alg.id === id);
  if (algorithm) {
    return algorithm;
  }
  throw new Error("Unsupported encryption algorithm");
}
function getHashAlgorithm(id, flags) {
  if (id === HASH_ALGORITHMS.EXTERNAL.id) {
    if (isFlagSet(flags, EncryptionHeaderFlags.FEXTERNAL_FLAG)) {
      return HASH_ALGORITHMS.EXTERNAL;
    }
    return HASH_ALGORITHMS.SHA1;
  }
  const algorithm = Object.values(HASH_ALGORITHMS).find((alg) => alg.id === id);
  if (algorithm) {
    return algorithm;
  }
  throw new Error("Unsupported hash algorithm");
}
function getCSPName(buffer2) {
  const str = buffer2.toString("utf16le");
  return str.slice(0, str.length - 1);
}
function getKeySize(keySize, algorithm, cspName) {
  if (keySize !== 0) {
    return keySize;
  }
  if (algorithm === CRYPTO_ALGORITHMS.RC4) {
    const cspLowerTrimmed = cspName.trim().toLowerCase();
    if (cspLowerTrimmed.length === 0 || cspLowerTrimmed.includes(" base ")) {
      return 40;
    } else {
      return 128;
    }
  }
  return 0;
}
function isFlagSet(flagValue, flagMask) {
  return (flagValue & flagMask) !== 0;
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/EncryptionVerifier.js
var SALT_SIZE_OFFSET = 138;
var SALT_OFFSET = 142;
var ENC_VERIFIER_SIZE = 16;
var SALT_SIZE = 16;
function parseEncryptionVerifier(encryptionProvider, cryptoAlgorithm) {
  const saltSize = encryptionProvider.readInt32LE(SALT_SIZE_OFFSET);
  if (saltSize !== SALT_SIZE) {
    throw new Error("Wrong salt size");
  }
  const salt = encryptionProvider.slice(SALT_OFFSET, SALT_OFFSET + SALT_SIZE);
  const encryptionVerifierOffset = SALT_OFFSET + SALT_SIZE;
  const verifierHashSizeOffset = encryptionVerifierOffset + ENC_VERIFIER_SIZE;
  const verifierHashOffset = verifierHashSizeOffset + 4;
  const encryptionVerifier = encryptionProvider.slice(encryptionVerifierOffset, verifierHashSizeOffset);
  const encryptionVerifierHashSize = encryptionProvider.readInt32LE(verifierHashSizeOffset);
  const encryptionVerifierHash = encryptionProvider.slice(verifierHashOffset, verifierHashOffset + cryptoAlgorithm.encryptionVerifierHashLength);
  return { salt, encryptionVerifier, encryptionVerifierHash, encryptionVerifierHashSize };
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/rc4-cryptoapi.js
var VALID_CRYPTO_ALGORITHMS = [CRYPTO_ALGORITHMS.RC4];
var VALID_HASH_ALGORITHMS = [HASH_ALGORITHMS.SHA1];
function createRC4CryptoAPICodecHandler(encodingKey, encryptionProvider, password) {
  const headerLength = encryptionProvider.readInt32LE(8);
  const headerBuffer = encryptionProvider.slice(12, 12 + headerLength);
  const encryptionHeader = parseEncryptionHeader(headerBuffer, VALID_CRYPTO_ALGORITHMS, VALID_HASH_ALGORITHMS);
  const encryptionVerifier = parseEncryptionVerifier(encryptionProvider, encryptionHeader.cryptoAlgorithm);
  const baseHash = hash2("sha1", [encryptionVerifier.salt, password]);
  const decryptPage = (pageBuffer, pageIndex) => {
    const pageEncodingKey = getPageEncodingKey(encodingKey, pageIndex);
    const encryptionKey = getEncryptionKey(encryptionHeader, baseHash, pageEncodingKey);
    return decryptRC4(encryptionKey, pageBuffer);
  };
  return {
    decryptPage,
    verifyPassword: () => {
      const encryptionKey = getEncryptionKey(encryptionHeader, baseHash, intToBuffer(0));
      const rc4Decrypter = createRC4Decrypter(encryptionKey);
      const verifier = rc4Decrypter(encryptionVerifier.encryptionVerifier);
      const verifierHash = fixBufferLength(rc4Decrypter(encryptionVerifier.encryptionVerifierHash), encryptionVerifier.encryptionVerifierHashSize);
      const testHash = fixBufferLength(hash2("sha1", [verifier]), encryptionVerifier.encryptionVerifierHashSize);
      return verifierHash.equals(testHash);
    }
  };
}
function getEncryptionKey(header, baseHash, data) {
  const key = hash2("sha1", [baseHash, data], roundToFullByte(header.keySize));
  if (header.keySize === 40) {
    return key.slice(0, roundToFullByte(128));
  }
  return key;
}

// ../node_modules/mdb-reader/lib/node/codec-handler/handlers/office/index.js
var MAX_PASSWORD_LENGTH = 255;
var CRYPT_STRUCTURE_OFFSET = 665;
var KEY_OFFSET2 = 62;
var KEY_SIZE2 = 4;
function createOfficeCodecHandler(databaseDefinitionPage, password) {
  const encodingKey = databaseDefinitionPage.slice(KEY_OFFSET2, KEY_OFFSET2 + KEY_SIZE2);
  if (isEmptyBuffer(encodingKey)) {
    return createIdentityHandler();
  }
  const passwordBuffer = Buffer.from(password.substring(0, MAX_PASSWORD_LENGTH), "utf16le");
  const infoLength = databaseDefinitionPage.readUInt16LE(CRYPT_STRUCTURE_OFFSET);
  const encryptionProviderBuffer = databaseDefinitionPage.slice(CRYPT_STRUCTURE_OFFSET + 2, CRYPT_STRUCTURE_OFFSET + 2 + infoLength);
  const version = `${encryptionProviderBuffer.readUInt16LE(0)}.${encryptionProviderBuffer.readUInt16LE(2)}`;
  switch (version) {
    case "4.4":
      return createAgileCodecHandler(encodingKey, encryptionProviderBuffer, passwordBuffer);
    case "4.3":
    case "3.3":
      throw new Error("Extensible encryption provider is not supported");
    case "4.2":
    case "3.2":
    case "2.2": {
      const flags = encryptionProviderBuffer.readInt32LE(4);
      if (isFlagSet(flags, EncryptionHeaderFlags.FCRYPTO_API_FLAG)) {
        if (isFlagSet(flags, EncryptionHeaderFlags.FAES_FLAG)) {
          throw new Error("Not implemented yet");
        } else {
          try {
            return createRC4CryptoAPICodecHandler(encodingKey, encryptionProviderBuffer, passwordBuffer);
          } catch (e) {
          }
          throw new Error("Not implemented yet");
        }
      } else {
        throw new Error("Unknown encryption");
      }
    }
    case "1.1":
      throw new Error("Not implemented yet");
    default:
      throw new Error(`Unsupported encryption provider: ${version}`);
  }
}

// ../node_modules/mdb-reader/lib/node/codec-handler/create.js
function createCodecHandler(databaseDefinitionPage, password) {
  const format2 = getJetFormat(databaseDefinitionPage);
  switch (format2.codecType) {
    case CodecType.JET:
      return createJetCodecHandler(databaseDefinitionPage);
    case CodecType.OFFICE:
      return createOfficeCodecHandler(databaseDefinitionPage, password);
    default:
      return createIdentityHandler();
  }
}

// ../node_modules/mdb-reader/lib/node/data/datetime.js
function readDateTime(buffer2) {
  const td = buffer2.readDoubleLE();
  const daysDiff = 25569;
  return new Date(Math.round((td - daysDiff) * 86400 * 1e3));
}

// ../node_modules/mdb-reader/lib/node/PageType.js
var PageType;
(function(PageType2) {
  PageType2[PageType2["DatabaseDefinitionPage"] = 0] = "DatabaseDefinitionPage";
  PageType2[PageType2["DataPage"] = 1] = "DataPage";
  PageType2[PageType2["TableDefinition"] = 2] = "TableDefinition";
  PageType2[PageType2["IntermediateIndexPage"] = 3] = "IntermediateIndexPage";
  PageType2[PageType2["LeafIndexPages"] = 4] = "LeafIndexPages";
  PageType2[PageType2["PageUsageBitmaps"] = 5] = "PageUsageBitmaps";
})(PageType || (PageType = {}));
function assertPageType(buffer2, pageType) {
  if (buffer2[0] !== pageType) {
    throw new Error(`Wrong page type. Expected ${pageType} but received ${buffer2[0]}.`);
  }
}

// ../node_modules/mdb-reader/lib/node/dependencies/iconv-lite/index.js
var ASCII_CHARS = Array.from({ length: 128 }).map((_, i) => String.fromCharCode(i)).join("");
var WINDOWS_1252_CHARS = "\u20AC\uFFFD\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\uFFFD\u017D\uFFFD\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\uFFFD\u017E\u0178\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF\xC0\xC1\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xCB\xCC\xCD\xCE\xCF\xD0\xD1\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xDB\xDC\xDD\xDE\xDF\xE0\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xEB\xEC\xED\xEE\xEF\xF0\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFB\xFC\xFD\xFE\xFF";
function decodeWindows1252(buffer2) {
  const chars = `${ASCII_CHARS}${WINDOWS_1252_CHARS}`;
  const charsBuffer = Buffer.from(chars, "ucs2");
  const result = Buffer.alloc(buffer2.length * 2);
  for (let i = 0; i < buffer2.length; ++i) {
    const index = buffer2[i] * 2;
    result[i * 2] = charsBuffer[index];
    result[i * 2 + 1] = charsBuffer[index + 1];
  }
  return result.toString("ucs2");
}

// ../node_modules/mdb-reader/lib/node/unicodeCompression.js
function uncompressText(buffer2, format2) {
  if (format2.textEncoding === "unknown") {
    return decodeWindows1252(buffer2);
  }
  if (buffer2.length <= 2 || (buffer2.readUInt8(0) & 255) !== 255 || (buffer2.readUInt8(1) & 255) !== 254) {
    return buffer2.toString("ucs-2");
  }
  let compressedMode = true;
  let curPos = 2;
  const uncompressedBuffer = Buffer.alloc((buffer2.length - curPos) * 2);
  let uncompressedBufferPos = 0;
  while (curPos < buffer2.length) {
    if (buffer2.readUInt8(curPos) === 0) {
      compressedMode = !compressedMode;
      curPos++;
    } else if (compressedMode) {
      uncompressedBuffer[uncompressedBufferPos++] = buffer2.readUInt8(curPos++);
      uncompressedBuffer[uncompressedBufferPos++] = 0;
    } else if (buffer2.length - curPos >= 2) {
      uncompressedBuffer[uncompressedBufferPos++] = buffer2.readUInt8(curPos++);
      uncompressedBuffer[uncompressedBufferPos++] = buffer2.readUInt8(curPos++);
    } else {
      break;
    }
  }
  return uncompressedBuffer.slice(0, uncompressedBufferPos).toString("ucs-2");
}

// ../node_modules/mdb-reader/lib/node/Database.js
var PASSWORD_OFFSET = 66;
var Database = class {
  #buffer;
  #format;
  #codecHandler;
  #databaseDefinitionPage;
  constructor(buffer2, password) {
    this.#buffer = buffer2;
    assertPageType(this.#buffer, PageType.DatabaseDefinitionPage);
    this.#format = getJetFormat(this.#buffer);
    this.#databaseDefinitionPage = Buffer.alloc(this.#format.pageSize);
    this.#buffer.copy(this.#databaseDefinitionPage, 0, 0, this.#format.pageSize);
    decryptHeader(this.#databaseDefinitionPage, this.#format);
    this.#codecHandler = createCodecHandler(this.#databaseDefinitionPage, password);
    if (!this.#codecHandler.verifyPassword()) {
      throw new Error("Wrong password");
    }
  }
  get format() {
    return this.#format;
  }
  getPassword() {
    let passwordBuffer = this.#databaseDefinitionPage.slice(PASSWORD_OFFSET, PASSWORD_OFFSET + this.#format.databaseDefinitionPage.passwordSize);
    const mask = this.#getPasswordMask();
    if (mask !== null) {
      passwordBuffer = xor2(passwordBuffer, mask);
    }
    if (isEmptyBuffer(passwordBuffer)) {
      return null;
    }
    let password = uncompressText(passwordBuffer, this.#format);
    const nullCharIndex = password.indexOf("\0");
    if (nullCharIndex >= 0) {
      password = password.slice(0, nullCharIndex);
    }
    return password;
  }
  #getPasswordMask() {
    if (this.#format.databaseDefinitionPage.creationDateOffset === null) {
      return null;
    }
    const mask = Buffer.alloc(this.#format.databaseDefinitionPage.passwordSize);
    const dateValue = this.#databaseDefinitionPage.readDoubleLE(this.#format.databaseDefinitionPage.creationDateOffset);
    mask.writeInt32LE(Math.floor(dateValue));
    for (let i = 0; i < mask.length; ++i) {
      mask[i] = mask[i % 4];
    }
    return mask;
  }
  getCreationDate() {
    if (this.#format.databaseDefinitionPage.creationDateOffset === null) {
      return null;
    }
    const creationDateBuffer = this.#databaseDefinitionPage.slice(this.#format.databaseDefinitionPage.creationDateOffset, this.#format.databaseDefinitionPage.creationDateOffset + 8);
    return readDateTime(creationDateBuffer);
  }
  getDefaultSortOrder() {
    const value = this.#databaseDefinitionPage.readUInt16LE(this.#format.databaseDefinitionPage.defaultSortOrder.offset + 3);
    if (value === 0) {
      return this.#format.defaultSortOrder;
    }
    let version = this.#format.defaultSortOrder.version;
    if (this.#format.databaseDefinitionPage.defaultSortOrder.size == 4) {
      version = this.#databaseDefinitionPage.readUInt8(this.#format.databaseDefinitionPage.defaultSortOrder.offset + 3);
    }
    return Object.freeze({ value, version });
  }
  getPage(page) {
    if (page === 0) {
      return this.#databaseDefinitionPage;
    }
    const offset = page * this.#format.pageSize;
    if (this.#buffer.length < offset) {
      throw new Error(`Page ${page} does not exist`);
    }
    const pageBuffer = this.#buffer.slice(offset, offset + this.#format.pageSize);
    return this.#codecHandler.decryptPage(pageBuffer, page);
  }
  /**
   * @param pageRow Lower byte contains the row number, the upper three contain page
   *
   * @see https://github.com/brianb/mdbtools/blob/d6f5745d949f37db969d5f424e69b54f0da60b9b/src/libmdb/data.c#L102-L124
   */
  findPageRow(pageRow) {
    const page = pageRow >> 8;
    const row = pageRow & 255;
    const pageBuffer = this.getPage(page);
    return this.findRow(pageBuffer, row);
  }
  /**
   * @param pageBuffer Buffer of a data page
   *
   * @see https://github.com/brianb/mdbtools/blob/d6f5745d949f37db969d5f424e69b54f0da60b9b/src/libmdb/data.c#L126-L138
   */
  findRow(pageBuffer, row) {
    const rco = this.#format.dataPage.recordCountOffset;
    if (row > 1e3) {
      throw new Error("Cannot read rows > 1000");
    }
    const start = pageBuffer.readUInt16LE(rco + 2 + row * 2);
    const nextStart = row === 0 ? this.#format.pageSize : pageBuffer.readUInt16LE(rco + row * 2);
    return pageBuffer.slice(start, nextStart);
  }
};
var ENCRYPTION_START = 24;
var ENCRYPTION_KEY = [199, 218, 57, 107];
function decryptHeader(buffer2, format2) {
  const decryptedBuffer = decryptRC4(Buffer.from(ENCRYPTION_KEY), buffer2.slice(ENCRYPTION_START, ENCRYPTION_START + format2.databaseDefinitionPage.encryptedSize));
  decryptedBuffer.copy(buffer2, ENCRYPTION_START);
}

// ../node_modules/mdb-reader/lib/node/SysObject.js
var SysObjectTypes = {
  Form: 0,
  Table: 1,
  Macro: 2,
  SystemTable: 3,
  Report: 4,
  Query: 5,
  LinkedTable: 6,
  Module: 7,
  Relationship: 8,
  DatabaseProperty: 11
};
function isSysObjectType(typeValue) {
  return Object.values(SysObjectTypes).includes(typeValue);
}
var SYSTEM_OBJECT_FLAG = 2147483648;
var ALT_SYSTEM_OBJECT_FLAG = 2;
var SYSTEM_OBJECT_FLAGS = SYSTEM_OBJECT_FLAG | ALT_SYSTEM_OBJECT_FLAG;
function isSystemObject(o) {
  return (o.flags & SYSTEM_OBJECT_FLAGS) !== 0;
}

// ../node_modules/mdb-reader/lib/node/types.js
var ColumnTypes = {
  Boolean: "boolean",
  Byte: "byte",
  Integer: "integer",
  Long: "long",
  Currency: "currency",
  Float: "float",
  Double: "double",
  DateTime: "datetime",
  Binary: "binary",
  Text: "text",
  OLE: "ole",
  Memo: "memo",
  RepID: "repid",
  Numeric: "numeric",
  Complex: "complex",
  BigInt: "bigint",
  DateTimeExtended: "datetimextended"
};

// ../node_modules/mdb-reader/lib/node/column.js
var columnTypeMap = {
  1: ColumnTypes.Boolean,
  2: ColumnTypes.Byte,
  3: ColumnTypes.Integer,
  4: ColumnTypes.Long,
  5: ColumnTypes.Currency,
  6: ColumnTypes.Float,
  7: ColumnTypes.Double,
  8: ColumnTypes.DateTime,
  9: ColumnTypes.Binary,
  10: ColumnTypes.Text,
  11: ColumnTypes.OLE,
  12: ColumnTypes.Memo,
  15: ColumnTypes.RepID,
  16: ColumnTypes.Numeric,
  18: ColumnTypes.Complex,
  19: ColumnTypes.BigInt,
  20: ColumnTypes.DateTimeExtended
};
function getColumnType(typeValue) {
  const type = columnTypeMap[typeValue];
  if (type === void 0) {
    throw new Error("Unsupported column type");
  }
  return type;
}
function parseColumnFlags(flags) {
  return {
    fixedLength: !!(flags & 1),
    nullable: !!(flags & 2),
    autoLong: !!(flags & 4),
    autoUUID: !!(flags & 64)
  };
}

// ../node_modules/mdb-reader/lib/node/data/bigint.js
function readBigInt(buffer2) {
  return buffer2.readBigInt64LE();
}

// ../node_modules/mdb-reader/lib/node/data/binary.js
function readBinary(buffer2) {
  const result = Buffer.alloc(buffer2.length);
  buffer2.copy(result);
  return result;
}

// ../node_modules/mdb-reader/lib/node/data/byte.js
function readByte(buffer2) {
  return buffer2.readUInt8();
}

// ../node_modules/mdb-reader/lib/node/data/complex/attachment.js
var DATA_TYPES = {
  RAW: 0,
  COMPRESSED: 1
};
function decodeAttachmentFileData(buffer2) {
  if (buffer2.length < 8) {
    throw new Error("Unknown encoded attachment data format");
  }
  const typeFlag = buffer2.readInt32LE(0);
  const dataLen = buffer2.readInt32LE(4);
  let content = buffer2.subarray(8);
  switch (typeFlag) {
    case DATA_TYPES.COMPRESSED:
      content = environment.inflate(content);
      break;
    case DATA_TYPES.RAW:
      break;
    default:
      throw new Error(`Unknown encoded attachment data type ${typeFlag}`);
  }
  if (content.length < 4) {
    throw new Error("Invalid attachment content header");
  }
  const headerLen = content.readInt32LE(0);
  if (headerLen < 4 || headerLen > content.length) {
    throw new Error("Invalid attachment header length");
  }
  const payloadEnd = Math.min(dataLen, content.length);
  if (headerLen >= payloadEnd) {
    throw new Error("Invalid attachment header length");
  }
  return content.subarray(headerLen, payloadEnd);
}

// ../node_modules/mdb-reader/lib/node/systemTables.js
function getMSysObjectsTable(database) {
  return new Table("MSysObjects", database, 2);
}

// ../node_modules/mdb-reader/lib/node/data/complex/complexColumnsData.js
var MSYS_COMPLEX_COLUMNS_TABLE = "MSysComplexColumns";
function getMsysComplexColumnsPage(database) {
  const msysObjectsData = getMSysObjectsTable(database).getData({
    columns: ["Id", "Name"]
  });
  const complexColRow = msysObjectsData.find((r) => r.Name === MSYS_COMPLEX_COLUMNS_TABLE);
  if (!complexColRow) {
    throw new Error(`MSysComplexColumns table not found in MSysObjects table`);
  }
  return maskTableId(complexColRow.Id);
}
function getComplexColumnsData(database) {
  const msysComplexColumnsPage = getMsysComplexColumnsPage(database);
  const msysComplexColumns = new Table(MSYS_COMPLEX_COLUMNS_TABLE, database, msysComplexColumnsPage);
  return msysComplexColumns.getData();
}

// ../node_modules/mdb-reader/lib/node/data/complex/utils.js
function resolveFlatTableForComplexColumn(database, column) {
  const msysObjectsData = getMSysObjectsTable(database).getData({
    columns: ["Id", "Name"]
  });
  const complexColsData = getComplexColumnsData(database);
  const tableDefPageMasked = maskTableId(column.complex.tableDefinitionPage);
  for (const row of complexColsData) {
    const rowFlatTableId = row.FlatTableID;
    if (!rowFlatTableId) {
      continue;
    }
    const rowConceptualTableId = row.ConceptualTableID;
    const tableMatch = typeof rowConceptualTableId === "number" && rowConceptualTableId === tableDefPageMasked;
    if (!tableMatch) {
      continue;
    }
    const complexTypeIdMatch = typeof row.ComplexTypeObjectID === "number" && row.ComplexTypeObjectID === column.complex.typeId;
    const complexIdMatch = typeof row.ComplexID === "number" && row.ComplexID === column.complex.typeId;
    const columnNameMatch = typeof row.ColumnName === "string" && row.ColumnName.toLowerCase() === column.name.toLowerCase();
    if (!complexTypeIdMatch && !complexIdMatch && !columnNameMatch) {
      continue;
    }
    const flatTableId = maskTableId(rowFlatTableId);
    const flatTableRow = msysObjectsData.find((r) => maskTableId(r.Id) === flatTableId);
    if (!flatTableRow) {
      throw new Error(`Flat table not found for complex column ${column.name}`);
    }
    return {
      tableName: flatTableRow.Name,
      firstPage: flatTableId
    };
  }
  throw new Error(`Flat table not found for complex column ${column.name}`);
}

// ../node_modules/mdb-reader/lib/node/data/complex/index.js
var ATTACHMENT_TYPE_COLUMN_NAMES = /* @__PURE__ */ new Set([
  "FileName",
  "FileType",
  "FileData",
  "FileURL",
  "FileTimeStamp",
  "FileFlags"
]);
function readComplex(buffer2, column, database) {
  try {
    const complexTypeId = column.complex?.typeId;
    const tableDefinitionPage = column.complex?.tableDefinitionPage;
    if (complexTypeId === void 0 || tableDefinitionPage === void 0) {
      throw new Error("Complex column is not valid");
    }
    const complexColumnDefinition = {
      ...column,
      complex: {
        typeId: complexTypeId,
        tableDefinitionPage
      }
    };
    const foreignKey = buffer2.readInt32LE(0);
    if (foreignKey <= 0) {
      throw new Error("Foreign key value is not valid");
    }
    const { tableName: flatTableName, firstPage: flatTableFirstPage } = resolveFlatTableForComplexColumn(database, complexColumnDefinition);
    const flatTable = new Table(flatTableName, database, flatTableFirstPage);
    const foreignKeyColumn = flatTable.getColumns().find((c) => c.type === ColumnTypes.Long && !c.autoLong && !ATTACHMENT_TYPE_COLUMN_NAMES.has(c.name));
    if (!foreignKeyColumn) {
      throw new Error("Foreign key column not found");
    }
    const flatData = flatTable.getData();
    const matchingRows = flatData.filter((row) => row[foreignKeyColumn.name] === foreignKey);
    return matchingRows.map((row) => {
      const attachment = {
        name: row.FileName,
        type: row.FileType,
        data: decodeAttachmentFileData(row.FileData)
      };
      if (row.FileURL) {
        attachment.url = row.FileURL;
      }
      if (row.FileTimeStamp) {
        attachment.timestamp = row.FileTimeStamp;
      }
      if (row.FileFlags) {
        attachment.flags = row.FileFlags;
      }
      return attachment;
    });
  } catch (error) {
    throw new Error("Failed to read complex column", { cause: error });
  }
}

// ../node_modules/mdb-reader/lib/node/array.js
function doCarry(values2) {
  const result = [...values2];
  const length = result.length;
  for (let i = 0; i < length - 1; ++i) {
    result[i + 1] += Math.floor(result[i] / 10);
    result[i] %= 10;
  }
  result[length - 1] %= 10;
  return result;
}
function multiplyArray(a, b2) {
  if (a.length !== b2.length) {
    throw new Error("Array a and b must have the same length");
  }
  const result = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; ++i) {
    if (a[i] === 0)
      continue;
    for (let j = 0; j < b2.length; j++) {
      result[i + j] += a[i] * b2[j];
    }
  }
  return doCarry(result.slice(0, a.length));
}
function addArray(a, b2) {
  if (a.length !== b2.length) {
    throw new Error("Array a and b must have the same length");
  }
  const length = a.length;
  const result = [];
  for (let i = 0; i < length; ++i) {
    result[i] = a[i] + b2[i];
  }
  return doCarry(result);
}
function toArray(v, length) {
  return doCarry([v, ...new Array(length - 1).fill(0)]);
}

// ../node_modules/mdb-reader/lib/node/data/util.js
function buildValue(array, scale, negative) {
  const length = array.length;
  let value = "";
  if (negative) {
    value += "-";
  }
  let top = length;
  while (top > 0 && top - 1 > scale && !array[top - 1]) {
    top--;
  }
  if (top === 0) {
    value += "0";
  } else {
    for (let i = top; i > 0; i--) {
      if (i === scale) {
        value += ".";
      }
      value += array[i - 1].toString();
    }
  }
  return value;
}

// ../node_modules/mdb-reader/lib/node/data/currency.js
var MAX_PRECISION = 20;
function readCurrency(buffer2) {
  const bytesCount = 8;
  const scale = 4;
  let product = toArray(0, MAX_PRECISION);
  let multiplier = toArray(1, MAX_PRECISION);
  const bytes = buffer2.slice(0, bytesCount);
  let negative = false;
  if (bytes[bytesCount - 1] & 128) {
    negative = true;
    for (let i = 0; i < bytesCount; ++i) {
      bytes[i] = ~bytes[i];
    }
    for (let i = 0; i < bytesCount; ++i) {
      ++bytes[i];
      if (bytes[i] != 0) {
        break;
      }
    }
  }
  for (const byte of bytes) {
    product = addArray(product, multiplyArray(multiplier, toArray(byte, MAX_PRECISION)));
    multiplier = multiplyArray(multiplier, toArray(256, MAX_PRECISION));
  }
  return buildValue(product, scale, negative);
}

// ../node_modules/mdb-reader/lib/node/data/datetimextended.js
var DAYS_START = 0;
var DAYS_LENGTH = 19;
var SECONDS_START = DAYS_START + DAYS_LENGTH + 1;
var SECONDS_LENGTH = 12;
var NANOS_START = SECONDS_START + SECONDS_LENGTH;
var NANOS_LENGTH = 7;
function readDateTimeExtended(buffer2) {
  const days = parseBigInt(buffer2.slice(DAYS_START, DAYS_START + DAYS_LENGTH));
  const seconds = parseBigInt(buffer2.slice(SECONDS_START, SECONDS_START + SECONDS_LENGTH));
  const nanos = parseBigInt(buffer2.slice(NANOS_START, NANOS_START + NANOS_LENGTH)) * 100n;
  return format(days, seconds, nanos);
}
function parseBigInt(buffer2) {
  return BigInt(buffer2.toString("ascii"));
}
function format(days, seconds, nanos) {
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(1);
  date.setUTCDate(date.getUTCDate() + Number(days));
  date.setUTCSeconds(date.getUTCSeconds() + Number(seconds));
  let result = "";
  result += date.getFullYear().toString().padStart(4, "0");
  result += `.${(date.getUTCMonth() + 1).toString().padStart(2, "0")}`;
  result += `.${date.getUTCDate().toString().padStart(2, "0")}`;
  result += ` ${date.getUTCHours().toString().padStart(2, "0")}`;
  result += `:${date.getUTCMinutes().toString().padStart(2, "0")}`;
  result += `:${date.getUTCSeconds().toString().padStart(2, "0")}`;
  result += `.${nanos.toString().padStart(9, "0")}`;
  return result;
}

// ../node_modules/mdb-reader/lib/node/data/double.js
function readDouble(buffer2) {
  return buffer2.readDoubleLE();
}

// ../node_modules/mdb-reader/lib/node/data/float.js
function readFloat(buffer2) {
  return buffer2.readFloatLE();
}

// ../node_modules/mdb-reader/lib/node/data/integer.js
function readInteger(buffer2) {
  return buffer2.readInt16LE();
}

// ../node_modules/mdb-reader/lib/node/data/memo.js
var TYPE_THIS_PAGE = 128;
var TYPE_OTHER_PAGE = 64;
var TYPE_OTHER_PAGES = 0;
function readMemo(buffer2, _col, database) {
  const memoLength = buffer2.readUIntLE(0, 3);
  const type = buffer2.readUInt8(3);
  switch (type) {
    case TYPE_THIS_PAGE: {
      const compressedText = buffer2.slice(12, 12 + memoLength);
      return uncompressText(compressedText, database.format);
    }
    case TYPE_OTHER_PAGE: {
      const pageRow = buffer2.readUInt32LE(4);
      const rowBuffer = database.findPageRow(pageRow);
      const compressedText = rowBuffer.slice(0, memoLength);
      return uncompressText(compressedText, database.format);
    }
    case TYPE_OTHER_PAGES: {
      let pageRow = buffer2.readInt32LE(4);
      let memoDataBuffer = Buffer.alloc(0);
      do {
        const rowBuffer = database.findPageRow(pageRow);
        if (memoDataBuffer.length + rowBuffer.length - 4 > memoLength) {
          break;
        }
        if (rowBuffer.length === 0) {
          break;
        }
        memoDataBuffer = Buffer.concat([memoDataBuffer, rowBuffer.slice(4)]);
        pageRow = rowBuffer.readInt32LE(0);
      } while (pageRow !== 0);
      const compressedText = memoDataBuffer.slice(0, memoLength);
      return uncompressText(compressedText, database.format);
    }
    default:
      throw new Error(`Unknown memo type ${type}`);
  }
}

// ../node_modules/mdb-reader/lib/node/data/numeric.js
var MAX_PRECISION2 = 40;
function readNumeric(buffer2, column) {
  let product = toArray(0, MAX_PRECISION2);
  let multiplier = toArray(1, MAX_PRECISION2);
  const bytes = buffer2.slice(1, 17);
  for (let i = 0; i < bytes.length; ++i) {
    const byte = bytes[12 - 4 * Math.floor(i / 4) + i % 4];
    product = addArray(product, multiplyArray(multiplier, toArray(byte, MAX_PRECISION2)));
    multiplier = multiplyArray(multiplier, toArray(256, MAX_PRECISION2));
  }
  const negative = !!(buffer2[0] & 128);
  return buildValue(
    product,
    // Scale is always set for numeric columns
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    column.scale,
    negative
  );
}

// ../node_modules/mdb-reader/lib/node/data/ole.js
var TYPES = {
  THIS_PAGE: 128,
  OTHER_PAGE: 64,
  OTHER_PAGES: 0
};
function readOLE(buffer2, _col, database) {
  const length = buffer2.readUIntLE(0, 3);
  const type = buffer2.readUInt8(3);
  switch (type) {
    case TYPES.THIS_PAGE: {
      return buffer2.slice(12, 12 + length);
    }
    case TYPES.OTHER_PAGE: {
      const pageRow = buffer2.readUInt32LE(4);
      const rowBuffer = database.findPageRow(pageRow);
      return rowBuffer.slice(0, length);
    }
    case TYPES.OTHER_PAGES: {
      let pageRow = buffer2.readInt32LE(4);
      const result = Buffer.alloc(length);
      let offset = 0;
      do {
        const rowBuffer = database.findPageRow(pageRow);
        if (rowBuffer.length <= 4) {
          break;
        }
        pageRow = rowBuffer.readUInt32LE(0);
        const newChunk = rowBuffer.subarray(4);
        newChunk.copy(result, offset);
        offset += newChunk.length;
      } while (pageRow !== 0);
      return result.subarray(0, length);
    }
    default: {
      throw new Error(`Unknown OLE type ${type}`);
    }
  }
}

// ../node_modules/mdb-reader/lib/node/data/repid.js
function readRepID(buffer2) {
  return buffer2.slice(0, 4).swap32().toString("hex") + // swap for little-endian
  "-" + buffer2.slice(4, 6).swap16().toString("hex") + // swap for little-endian
  "-" + buffer2.slice(6, 8).swap16().toString("hex") + // swap for little-endian
  "-" + buffer2.slice(8, 10).toString("hex") + // big-endian
  "-" + buffer2.slice(10, 16).toString("hex");
}

// ../node_modules/mdb-reader/lib/node/data/text.js
function readText(buffer2, _col, database) {
  return uncompressText(buffer2, database.format);
}

// ../node_modules/mdb-reader/lib/node/data/long.js
function readLong(buffer2, _column, _database) {
  return buffer2.readInt32LE(0);
}

// ../node_modules/mdb-reader/lib/node/data/index.js
var readFnByColType = {
  [ColumnTypes.BigInt]: readBigInt,
  [ColumnTypes.Binary]: readBinary,
  [ColumnTypes.Byte]: readByte,
  [ColumnTypes.Complex]: readComplex,
  [ColumnTypes.Currency]: readCurrency,
  [ColumnTypes.DateTime]: readDateTime,
  [ColumnTypes.DateTimeExtended]: readDateTimeExtended,
  [ColumnTypes.Double]: readDouble,
  [ColumnTypes.Float]: readFloat,
  [ColumnTypes.Integer]: readInteger,
  [ColumnTypes.Long]: readLong,
  [ColumnTypes.Text]: readText,
  [ColumnTypes.Memo]: readMemo,
  [ColumnTypes.Numeric]: readNumeric,
  [ColumnTypes.OLE]: readOLE,
  [ColumnTypes.RepID]: readRepID
};
function readFieldValue(buffer2, column, database) {
  if (column.type === ColumnTypes.Boolean) {
    throw new Error("readFieldValue does not handle type boolean");
  }
  const read = readFnByColType[column.type];
  if (!read) {
    return `Column type ${column.type} is currently not supported`;
  }
  return read(buffer2, column, database);
}

// ../node_modules/mdb-reader/lib/node/usage-map.js
function findMapPages(buffer2, database) {
  switch (buffer2[0]) {
    case 0:
      return findMapPages0(buffer2);
    case 1:
      return findMapPages1(buffer2, database);
    default:
      throw new Error("Unknown usage map type");
  }
}
function findMapPages0(buffer2) {
  const pageStart = buffer2.readUInt32LE(1);
  const bitmap = buffer2.slice(5);
  return getPagesFromBitmap(bitmap, pageStart);
}
function findMapPages1(buffer2, database) {
  const bitmapLength = (database.format.pageSize - 4) * 8;
  const mapCount = Math.floor((buffer2.length - 1) / 4);
  const pages = [];
  for (let mapIndex = 0; mapIndex < mapCount; ++mapIndex) {
    const page = buffer2.readUInt32LE(1 + mapIndex * 4);
    if (page === 0) {
      continue;
    }
    const pageBuffer = database.getPage(page);
    assertPageType(pageBuffer, PageType.PageUsageBitmaps);
    const bitmap = pageBuffer.slice(4);
    pages.push(...getPagesFromBitmap(bitmap, mapIndex * bitmapLength));
  }
  return pages;
}
function getPagesFromBitmap(bitmap, pageStart) {
  const pages = [];
  for (let i = 0; i < bitmap.length * 8; i++) {
    if (getBitmapValue(bitmap, i)) {
      pages.push(pageStart + i);
    }
  }
  return pages;
}

// ../node_modules/mdb-reader/lib/node/Table.js
var Table = class {
  #name;
  #database;
  #firstDefinitionPage;
  #definitionBuffer;
  #dataPages;
  /**
   * Number of rows.
   */
  #rowCount;
  /**
   * Number of columns.
   */
  #columnCount;
  #variableColumnCount;
  // #fixedColumnCount: number;
  // #logicalIndexCount: number;
  #realIndexCount;
  /**
   * @param name Table name. As this is stored in a MSysObjects, it has to be passed in
   * @param database
   * @param firstDefinitionPage The first page of the table definition referenced in the corresponding MSysObject
   */
  constructor(name, database, firstDefinitionPage) {
    this.#name = name;
    this.#database = database;
    this.#firstDefinitionPage = firstDefinitionPage;
    let nextDefinitionPage = this.#firstDefinitionPage;
    let buffer2;
    while (nextDefinitionPage > 0) {
      const curBuffer = this.#database.getPage(nextDefinitionPage);
      assertPageType(curBuffer, PageType.TableDefinition);
      if (!buffer2) {
        buffer2 = curBuffer;
      } else {
        buffer2 = Buffer.concat([buffer2, curBuffer.slice(8)]);
      }
      nextDefinitionPage = curBuffer.readUInt32LE(4);
    }
    if (!buffer2) {
      throw new Error("Could not find table definition page");
    }
    this.#definitionBuffer = buffer2;
    this.#rowCount = this.#definitionBuffer.readUInt32LE(this.#database.format.tableDefinitionPage.rowCountOffset);
    this.#columnCount = this.#definitionBuffer.readUInt16LE(this.#database.format.tableDefinitionPage.columnCountOffset);
    this.#variableColumnCount = this.#definitionBuffer.readUInt16LE(this.#database.format.tableDefinitionPage.variableColumnCountOffset);
    this.#realIndexCount = this.#definitionBuffer.readInt32LE(this.#database.format.tableDefinitionPage.realIndexCountOffset);
    const usageMapBuffer = this.#database.findPageRow(this.#definitionBuffer.readUInt32LE(this.#database.format.tableDefinitionPage.usageMapOffset));
    this.#dataPages = findMapPages(usageMapBuffer, this.#database);
  }
  get name() {
    return this.#name;
  }
  get rowCount() {
    return this.#rowCount;
  }
  get columnCount() {
    return this.#columnCount;
  }
  /**
   * Returns a column definition by its name.
   *
   * @param name Name of the column. Case sensitive.
   */
  getColumn(name) {
    const column = this.getColumns().find((c) => c.name === name);
    if (column === void 0) {
      throw new Error(`Could not find column with name ${name}`);
    }
    return column;
  }
  /**
   * Returns an ordered array of all column definitions.
   */
  getColumns() {
    const columnDefinitions = this.#getColumnDefinitions();
    columnDefinitions.sort((a, b2) => a.index - b2.index);
    return columnDefinitions.map(({ index, variableIndex, fixedIndex, ...rest }) => rest);
  }
  #getColumnDefinitions() {
    const columns = [];
    let curDefinitionPos = this.#database.format.tableDefinitionPage.realIndexStartOffset + this.#realIndexCount * this.#database.format.tableDefinitionPage.realIndexEntrySize;
    let namesCursorPos = curDefinitionPos + this.#columnCount * this.#database.format.tableDefinitionPage.columnsDefinition.entrySize;
    for (let i = 0; i < this.#columnCount; ++i) {
      const columnBuffer = this.#definitionBuffer.slice(curDefinitionPos, curDefinitionPos + this.#database.format.tableDefinitionPage.columnsDefinition.entrySize);
      const type = getColumnType(this.#definitionBuffer.readUInt8(curDefinitionPos + this.#database.format.tableDefinitionPage.columnsDefinition.typeOffset));
      const nameLength = this.#definitionBuffer.readUIntLE(namesCursorPos, this.#database.format.tableDefinitionPage.columnNames.nameLengthSize);
      namesCursorPos += this.#database.format.tableDefinitionPage.columnNames.nameLengthSize;
      const name = uncompressText(this.#definitionBuffer.slice(namesCursorPos, namesCursorPos + nameLength), this.#database.format);
      namesCursorPos += nameLength;
      const column = {
        name,
        type,
        index: columnBuffer.readUInt8(this.#database.format.tableDefinitionPage.columnsDefinition.indexOffset),
        variableIndex: columnBuffer.readUInt8(this.#database.format.tableDefinitionPage.columnsDefinition.variableIndexOffset),
        size: type === ColumnTypes.Boolean ? 0 : columnBuffer.readUInt16LE(this.#database.format.tableDefinitionPage.columnsDefinition.sizeOffset),
        fixedIndex: columnBuffer.readUInt16LE(this.#database.format.tableDefinitionPage.columnsDefinition.fixedIndexOffset),
        ...parseColumnFlags(columnBuffer.readUInt8(this.#database.format.tableDefinitionPage.columnsDefinition.flagsOffset))
      };
      if (type === ColumnTypes.Numeric) {
        column.precision = columnBuffer.readUInt8(11);
        column.scale = columnBuffer.readUInt8(12);
      }
      if (type === ColumnTypes.Complex) {
        const complexTypeIdOffset = this.#database.format.tableDefinitionPage.columnsDefinition.complexTypeIdOffset;
        if (complexTypeIdOffset !== void 0) {
          column.complex = {
            typeId: columnBuffer.readInt32LE(complexTypeIdOffset),
            tableDefinitionPage: this.#firstDefinitionPage
          };
        } else {
          throw new Error("Complex columns are not supported");
        }
      }
      columns.push(column);
      curDefinitionPos += this.#database.format.tableDefinitionPage.columnsDefinition.entrySize;
    }
    return columns;
  }
  /**
   * Returns an ordered array of all column names.
   */
  getColumnNames() {
    return this.getColumns().map((column) => column.name);
  }
  /**
   * Returns data from the table.
   *
   * @param columns Columns to be returned. Defaults to all columns.
   * @param rowOffset Index of the first row to be returned. 0-based. Defaults to 0.
   * @param rowLimit Maximum number of rows to be returned. Defaults to Infinity.
   */
  getData(options = {}) {
    const columnDefinitions = this.#getColumnDefinitions();
    const data = [];
    const columns = columnDefinitions.filter((c) => options.columns === void 0 || options.columns.includes(c.name));
    let rowsToSkip = options?.rowOffset ?? 0;
    let rowsToRead = options?.rowLimit ?? Infinity;
    for (const dataPage of this.#dataPages) {
      if (rowsToRead <= 0) {
        break;
      }
      const pageBuffer = this.#getDataPage(dataPage);
      const recordOffsets = this.#getRecordOffsets(pageBuffer);
      if (recordOffsets.length <= rowsToSkip) {
        rowsToSkip -= recordOffsets.length;
        continue;
      }
      const recordOffsetsToLoad = recordOffsets.slice(rowsToSkip, rowsToSkip + rowsToRead);
      const recordsOnPage = this.#getDataFromPage(pageBuffer, recordOffsetsToLoad, columns);
      data.push(...recordsOnPage);
      rowsToRead -= recordsOnPage.length;
      rowsToSkip = 0;
    }
    return data;
  }
  #getDataPage(page) {
    const pageBuffer = this.#database.getPage(page);
    assertPageType(pageBuffer, PageType.DataPage);
    if (pageBuffer.readUInt32LE(4) !== this.#firstDefinitionPage) {
      throw new Error(`Data page ${page} does not belong to table ${this.#name}`);
    }
    return pageBuffer;
  }
  #getRecordOffsets(pageBuffer) {
    const recordCount = pageBuffer.readUInt16LE(this.#database.format.dataPage.recordCountOffset);
    const recordOffsets = [];
    for (let record = 0; record < recordCount; ++record) {
      const offsetMask = 8191;
      let recordStart = pageBuffer.readUInt16LE(this.#database.format.dataPage.record.countOffset + 2 + record * 2);
      if (recordStart & 16384) {
        continue;
      }
      recordStart &= offsetMask;
      const nextStart = record === 0 ? this.#database.format.pageSize : pageBuffer.readUInt16LE(this.#database.format.dataPage.record.countOffset + record * 2) & offsetMask;
      const recordLength = nextStart - recordStart;
      const recordEnd = recordStart + recordLength - 1;
      recordOffsets.push([recordStart, recordEnd]);
    }
    return recordOffsets;
  }
  #getDataFromPage(pageBuffer, recordOffsets, columns) {
    const lastColumnIndex = Math.max(...columns.map((c) => c.index), 0);
    const data = [];
    for (const [recordStart, recordEnd] of recordOffsets) {
      const rowColumnCount = pageBuffer.readUIntLE(recordStart, this.#database.format.dataPage.record.columnCountSize);
      const bitmaskSize = roundToFullByte(rowColumnCount);
      let rowVariableColumnCount = 0;
      const variableColumnOffsets = [];
      if (this.#variableColumnCount > 0) {
        switch (this.#database.format.dataPage.record.variableColumnCountSize) {
          case 1: {
            rowVariableColumnCount = pageBuffer.readUInt8(recordEnd - bitmaskSize);
            const recordLength = recordEnd - recordStart + 1;
            let jumpCount = Math.floor((recordLength - 1) / 256);
            const columnPointer = recordEnd - bitmaskSize - jumpCount - 1;
            if ((columnPointer - recordStart - rowVariableColumnCount) / 256 < jumpCount) {
              --jumpCount;
            }
            let jumpsUsed = 0;
            for (let i = 0; i < rowVariableColumnCount + 1; ++i) {
              while (jumpsUsed < jumpCount && i === pageBuffer.readUInt8(recordEnd - bitmaskSize - jumpsUsed - 1)) {
                ++jumpsUsed;
              }
              variableColumnOffsets.push(pageBuffer.readUInt8(columnPointer - i) + jumpsUsed * 256);
            }
            break;
          }
          case 2: {
            rowVariableColumnCount = pageBuffer.readUInt16LE(recordEnd - bitmaskSize - 1);
            for (let i = 0; i < rowVariableColumnCount + 1; ++i) {
              variableColumnOffsets.push(pageBuffer.readUInt16LE(recordEnd - bitmaskSize - 3 - i * 2));
            }
            break;
          }
        }
      }
      const rowFixedColumnCount = rowColumnCount - rowVariableColumnCount;
      const nullMask = pageBuffer.slice(recordEnd - bitmaskSize + 1, recordEnd - bitmaskSize + 1 + roundToFullByte(lastColumnIndex + 1));
      let fixedColumnsFound = 0;
      const recordValues = {};
      for (const column of [...columns].sort((a, b2) => a.index - b2.index)) {
        let value = void 0;
        let start;
        let size2;
        if (!getBitmapValue(nullMask, column.index)) {
          value = null;
        }
        if (column.fixedLength && fixedColumnsFound < rowFixedColumnCount) {
          const colStart = column.fixedIndex + this.#database.format.dataPage.record.columnCountSize;
          start = recordStart + colStart;
          size2 = column.size;
          ++fixedColumnsFound;
        } else if (!column.fixedLength && column.variableIndex < rowVariableColumnCount) {
          const colStart = variableColumnOffsets[column.variableIndex];
          start = recordStart + colStart;
          size2 = variableColumnOffsets[column.variableIndex + 1] - colStart;
        } else {
          start = 0;
          value = null;
          size2 = 0;
        }
        if (column.type === ColumnTypes.Boolean) {
          value = value === void 0;
        } else if (value !== null) {
          value = readFieldValue(pageBuffer.slice(start, start + size2), column, this.#database);
        }
        recordValues[column.name] = value;
      }
      data.push(recordValues);
    }
    return data;
  }
};

// ../node_modules/mdb-reader/lib/node/MDBReader.js
var MDBReader = class {
  #buffer;
  #sysObjects;
  #database;
  /**
   * @param buffer Buffer of the database.
   */
  constructor(buffer2, { password } = {}) {
    this.#buffer = buffer2;
    assertPageType(this.#buffer, PageType.DatabaseDefinitionPage);
    this.#database = new Database(this.#buffer, password ?? "");
    const mSysObjectsTable = getMSysObjectsTable(this.#database).getData({
      columns: ["Id", "Name", "Type", "Flags"]
    });
    this.#sysObjects = mSysObjectsTable.map((mSysObject) => {
      const objectType = mSysObject.Type & 127;
      return {
        objectName: mSysObject.Name,
        objectType: isSysObjectType(objectType) ? objectType : null,
        tablePage: maskTableId(mSysObject.Id),
        flags: mSysObject.Flags
      };
    });
  }
  /**
   * Date when the database was created
   */
  getCreationDate() {
    return this.#database.getCreationDate();
  }
  /**
   * Database password
   */
  getPassword() {
    return this.#database.getPassword();
  }
  /**
   * Default sort order
   */
  getDefaultSortOrder() {
    return this.#database.getDefaultSortOrder();
  }
  /**
   * Returns an array of table names.
   *
   * @param normalTables Includes user tables. Default true.
   * @param systemTables Includes system tables. Default false.
   * @param linkedTables Includes linked tables. Default false.
   */
  getTableNames({ normalTables = true, systemTables = false, linkedTables = false } = {}) {
    const filteredSysObjects = [];
    for (const sysObject of this.#sysObjects) {
      if (sysObject.objectType === SysObjectTypes.Table) {
        if (!isSystemObject(sysObject)) {
          if (normalTables) {
            filteredSysObjects.push(sysObject);
          }
        } else if (systemTables) {
          filteredSysObjects.push(sysObject);
        }
      } else if (sysObject.objectType === SysObjectTypes.LinkedTable && linkedTables) {
        filteredSysObjects.push(sysObject);
      }
    }
    return filteredSysObjects.map((o) => o.objectName);
  }
  /**
   * Returns a table by its name.
   *
   * @param name Name of the table. Case sensitive.
   */
  getTable(name) {
    const sysObject = this.#sysObjects.filter((o) => o.objectType === SysObjectTypes.Table).find((o) => o.objectName === name);
    if (!sysObject) {
      throw new Error(`Could not find table with name ${name}`);
    }
    return new Table(name, this.#database, sysObject.tablePage);
  }
};

// ../backend/src/routes/winmssImport.ts
init_client();

// ../backend/src/utils/winmssMapper.ts
var WINMSS_DIVISION_MAP = {
  1: "open",
  2: "standard",
  3: "modified",
  // WinMSS id 3 = Modified (not used in IPSCScore, map to open)
  4: "production",
  5: "revolver",
  18: "classic",
  24: "production_optics"
};
var WINMSS_CATEGORY_MAP = {
  1: "regular",
  2: "lady",
  3: "junior",
  4: "senior",
  5: "super_senior"
};
var WINMSS_POWER_FACTOR_MAP = {
  1: "major",
  2: "minor"
};
var WINMSS_FIREARM_MAP = {
  1: "handgun",
  2: "rifle",
  3: "shotgun",
  4: "pcc"
  // WinMSS PCC → IPSCScore pcc (no pcc_optics/pcc_iron distinction)
};
var TABLE_ALIASES = {
  match: ["tblMatch", "Match", "Matches", "Competitions"],
  stage: ["tblMatchStage", "tblStage", "MatchStage", "Stages"],
  member: ["tblMember", "Member", "Members", "Shooters", "Competitors"],
  competitor: ["tblMatchCompetitor", "tblCompetitor", "MatchCompetitor", "Competitors", "Registrations"],
  score: ["tblMatchStageScore", "tblStageScore", "MatchStageScore", "Scores", "StageScores"],
  division: ["tblTypeDivision", "TypeDivision", "Divisions", "tblDivision"],
  category: ["tblTypeCategory", "TypeCategory", "Categories", "tblCategory"],
  powerFactor: ["tblTypePowerFactor", "TypePowerFactor", "PowerFactors", "tblPowerFactor"],
  stdStageSetup: ["tblTypeStdStageSetup", "TypeStdStageSetup", "StdStageSetup"],
  tag: ["tblTag", "Tag", "Tags", "MemberTags"],
  region: ["tblTypeRegion", "tblRegion", "TypeRegion", "Regions", "tblTypeRegions"]
};
function findTable(readerTableNames, purpose) {
  const aliases = TABLE_ALIASES[purpose];
  if (!aliases) return null;
  const lowerNames = readerTableNames.map((n) => n.toLowerCase());
  for (const alias of aliases) {
    const idx = lowerNames.indexOf(alias.toLowerCase());
    if (idx >= 0) return readerTableNames[idx];
  }
  return null;
}
var COLUMN_ALIASES = {
  // Match fields
  matchName: ["MatchName", "Match_Title", "Name", "Title", "MatchTitle"],
  matchDate: ["MatchDt", "MatchDate", "Date", "MatchDtStart", "StartDate"],
  matchFirearmType: ["TypeFirearmId", "FirearmType", "FirearmTypeId"],
  matchId: ["MatchId", "Id", "ID"],
  // Stage fields
  stageId: ["StageId", "StageNum", "StageNumber"],
  stageName: ["StageName", "Stage_Name", "Name", "Title"],
  stagePaperTargets: ["TrgtPaper", "PaperTargets", "Paper", "NumPaper", "TargetCount"],
  stageSteelTargets: ["TrgtPopper", "SteelTargets", "Popper", "NumSteel", "TrgtSteel", "TrgtPopperPlate", "PopperCount"],
  stagePlateTargets: ["TrgtPlates", "Plates", "NumPlates", "PlateCount"],
  stageNoShootTargets: ["TrgtPenalty", "NoShootTargets", "PenaltyTargets", "NumPenalty", "NoShoot", "Penalty"],
  stageMinRounds: ["MinRounds", "MinRoundCount", "MinimumRounds", "MinRds"],
  stageScoringType: ["ScoringType", "TypeStageScoringId", "StageScoringType"],
  stageMatchId: ["MatchId", "Match_Id"],
  // Member/Shooter fields
  memberId: ["MemberId", "ShooterId", "CompetitorId", "ID"],
  firstName: ["Firstname", "FirstName", "First_Name", "FName", "NameFirst", "GivenName"],
  lastName: ["Lastname", "LastName", "Last_Name", "LName", "NameLast", "Surname", "FamilyName"],
  region: ["Region", "State", "Country", "NatCode"],
  club: ["Club", "ClubName", "ClubId"],
  shooterDivision: ["TypeDivisionId", "DivisionId", "Division"],
  shooterCategory: ["TypeCategoryId", "CategoryId", "Category"],
  shooterPowerFactor: ["TypePowerFactorId", "PowerFactorId", "PowerFactor", "PF"],
  shooterFirearmType: ["TypeFirearmId", "FirearmType"],
  shooterTag: ["MemberNumber", "MemberNum", "ShooterNumber", "ShooterNum", "Number", "RegNumber", "RegNum", "IPSCNumber", "IPSCNum", "LicenseNumber", "LicNum"],
  shooterEmail: ["Email", "EmailAddress", "EMail"],
  // Competitor/Registration fields
  competitorMemberId: ["MemberId", "ShooterId", "CompetitorId"],
  competitorMatchId: ["MatchId", "Match_Id"],
  competitorDivision: ["TypeDivisionId", "DivisionId", "Division"],
  competitorCategory: ["TypeCategoryId", "CategoryId", "Category"],
  competitorPowerFactor: ["TypePowerFactorId", "PowerFactorId", "PowerFactor", "PF"],
  competitorDq: ["IsDisqualified", "Disqualified", "DQ", "IsDQ"],
  competitorFailedPf: ["FailedPowerFactor", "FailedPF", "PF_Failed"],
  competitorSquad: ["Squad", "SquadNumber", "SquadNum"],
  // Score fields (tblMatchStageScore)
  scoreMemberId: ["MemberId", "ShooterId", "CompetitorId", "ID"],
  scoreStageId: ["StageId", "StageNum", "StageNumber"],
  scoreMatchId: ["MatchId", "MatchID", "Match_Id"],
  scoreAlpha: ["ScoreA", "AHits", "aHits", "Alpha", "AlphaHits", "A", "HitsA"],
  scoreBravo: ["ScoreB", "BHits", "bHits", "Bravo", "BravoHits", "B", "HitsB"],
  scoreCharlie: ["ScoreC", "CHits", "cHits", "Charlie", "CharlieHits", "C", "HitsC"],
  scoreDelta: ["ScoreD", "DHits", "dHits", "Delta", "DeltaHits", "D", "HitsD"],
  scoreMiss: ["Misses", "Miss", "M", "MissCount"],
  scoreNoShoot: ["Penalties", "NSHits", "NoShootHits", "NoShoot", "NS", "Penalty", "NoShootCount"],
  scoreProcedural: ["Procedurals", "Procedural", "Proc", "ProceduralCount", "ProcCount"],
  scoreTime: ["Time", "StageTime", "ShootTime", "ElapsedTime"],
  scoreDnf: ["ScoresZeroedForStage", "Zeroed", "IsDNF", "DNF", "ScoreZeroed"],
  scoreDq: ["Disqualified", "DQ", "IsDQ", "IsDisqualified"],
  scoreHitFactor: ["HitFactor", "HF", "HitFactorScore"],
  scoreFTSA: ["FTSA", "FtsaCount", "FtSa", "FirstTarget", "FirstShot", "Ftsa", "FTSACount"],
  // Division/Category lookup tables
  divisionId: ["TypeDivisionId", "DivisionId", "Id", "ID"],
  divisionName: ["DivisionName", "Division", "Name", "ShortName"],
  categoryId: ["TypeCategoryId", "CategoryId", "Id", "ID"],
  categoryName: ["CategoryName", "Category", "Name", "ShortName"],
  powerFactorId: ["TypePowerFactorId", "PowerFactorId", "Id", "ID"],
  powerFactorName: ["PowerFactorName", "PowerFactor", "Name", "ShortName", "PFName"],
  // Tag table columns (for tblTag lookup)
  tagId: ["TagId", "Id", "ID", "TagID"],
  tagValue: ["Tag", "TagNumber", "Number", "Code", "Value"],
  // Region table columns (for tblTypeRegion lookup)
  regionId: ["TypeRegionId", "RegionId", "Id", "ID", "RegionID"],
  regionName: ["Region", "Code", "RegionCode", "ShortName", "Name"],
  // Member DfltTagId column (FK to tblTag)
  memberDfltTagId: ["DfltTagId", "DefaultTagId", "TagId", "DfltTagID"]
};
function findColumn(row, field) {
  const aliases = COLUMN_ALIASES[field];
  if (!aliases) return void 0;
  const keys = Object.keys(row);
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const alias of aliases) {
    const idx = lowerKeys.indexOf(alias.toLowerCase());
    if (idx >= 0) {
      return row[keys[idx]];
    }
  }
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase();
    for (let i = 0; i < lowerKeys.length; i++) {
      if (lowerKeys[i].includes(lowerAlias) || lowerAlias.includes(lowerKeys[i])) {
        return row[keys[i]];
      }
    }
  }
  return void 0;
}
function dumpRow(row) {
  return Object.entries(row).map(([k, v]) => `${k}=${v}`).join(", ");
}
function buildDivisionLookup(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = Number(findColumn(row, "divisionId"));
    const name = String(findColumn(row, "divisionName") || "").trim().toLowerCase();
    if (!id || !name) continue;
    const mapped = mapDivisionNameToId(name);
    if (mapped) map.set(id, mapped);
  }
  return map;
}
function buildCategoryLookup(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = Number(findColumn(row, "categoryId"));
    const name = String(findColumn(row, "categoryName") || "").trim().toLowerCase();
    if (!id || !name) continue;
    const mapped = mapCategoryName(name);
    if (mapped) map.set(id, mapped);
  }
  return map;
}
function buildPowerFactorLookup(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = Number(findColumn(row, "powerFactorId"));
    const name = String(findColumn(row, "powerFactorName") || "").trim().toLowerCase();
    if (!id || !name) continue;
    if (name.includes("major")) map.set(id, "major");
    else if (name.includes("minor")) map.set(id, "minor");
  }
  return map;
}
function buildTagLookup(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = Number(findColumn(row, "tagId"));
    const value = String(findColumn(row, "tagValue") || "").trim();
    if (!id || !value) continue;
    map.set(id, value);
  }
  return map;
}
function buildRegionLookup(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = Number(findColumn(row, "regionId"));
    const name = String(findColumn(row, "regionName") || "").trim();
    if (!id || !name) continue;
    map.set(id, name);
  }
  return map;
}
function mapDivisionNameToId(name) {
  const lower = name.toLowerCase().trim();
  if (lower.includes("open") || lower.includes("standard") && lower.includes("open")) return "open";
  if (lower === "standard" || lower === "std") return "standard";
  if (lower.includes("production") && lower.includes("optics")) return "production_optics";
  if (lower.includes("production") || lower.includes("prod")) return "production";
  if (lower.includes("classic")) return "classic";
  if (lower.includes("revolver") || lower.includes("rev")) return "revolver";
  if (lower.includes("modified") || lower === "mod") return "open";
  return null;
}
function mapCategoryName(name) {
  const lower = name.toLowerCase().trim();
  if (lower.includes("lady") || lower.includes("women") || lower.includes("female")) return "lady";
  if (lower.includes("super senior") || lower.includes("super_senior") || lower === "ss") return "super_senior";
  if (lower.includes("senior") || lower === "s") return "senior";
  if (lower.includes("junior") || lower === "j") return "junior";
  if (lower.includes("regular") || lower.includes("general") || lower === "r" || lower === "open") return "regular";
  return null;
}
function mapDivision(typeDivisionId, lookup) {
  if (typeDivisionId === void 0 || typeDivisionId === null) return "production";
  const id = typeof typeDivisionId === "string" ? parseInt(typeDivisionId, 10) : typeDivisionId;
  if (lookup && lookup.has(id)) return lookup.get(id);
  return WINMSS_DIVISION_MAP[id] || "production";
}
function mapCategory(typeCategoryId, lookup) {
  if (typeCategoryId === void 0 || typeCategoryId === null) return "regular";
  const id = typeof typeCategoryId === "string" ? parseInt(typeCategoryId, 10) : typeCategoryId;
  if (lookup && lookup.has(id)) return lookup.get(id);
  return WINMSS_CATEGORY_MAP[id] || "regular";
}
function mapPowerFactor(typePFId, lookup) {
  if (typePFId === void 0 || typePFId === null) return "minor";
  const id = typeof typePFId === "string" ? parseInt(typePFId, 10) : typePFId;
  if (lookup && lookup.has(id)) return lookup.get(id);
  return WINMSS_POWER_FACTOR_MAP[id] || "minor";
}
function mapRegion(regionValue, lookup) {
  if (regionValue === void 0 || regionValue === null) return "";
  if (typeof regionValue === "number" || typeof regionValue === "string" && /^\d+$/.test(regionValue)) {
    const id = typeof regionValue === "string" ? parseInt(regionValue, 10) : regionValue;
    if (lookup && lookup.has(id)) return lookup.get(id);
    return "";
  }
  return String(regionValue).trim();
}
function mapFirearmType(typeFirearmId) {
  if (typeFirearmId === void 0 || typeFirearmId === null) return "handgun";
  const id = typeof typeFirearmId === "string" ? parseInt(typeFirearmId, 10) : typeFirearmId;
  return WINMSS_FIREARM_MAP[id] || "handgun";
}
function inferScoringType(stage) {
  const stId = stage.scoringTypeId;
  if (stId !== void 0 && stId !== null) {
    const id = typeof stId === "string" ? parseInt(stId, 10) : stId;
    if (id === 1) return "comstock";
    if (id === 2) return "virginia";
    if (id === 3) return "fixed_time";
    if (id === 4) return "chrono";
  }
  if (stage.parTime && stage.parTime > 0) return "fixed_time";
  return "comstock";
}
function inferHitsPerPaper() {
  return 2;
}

// ../backend/src/routes/winmssImport.ts
init_scoringCalc();
var winmssImportRoutes = new Hono2();
winmssImportRoutes.post("/winmss/inspect", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No .mdb file provided" }, 400);
  }
  try {
    const buffer2 = Buffer.from(await file.arrayBuffer());
    const reader = new MDBReader(buffer2);
    const tableNames = reader.getTableNames();
    const result = { tables: {} };
    for (const tableName of tableNames) {
      try {
        const table = reader.getTable(tableName);
        const columns = table.getColumnNames();
        const data = table.getData();
        result.tables[tableName] = {
          columns,
          rowCount: data.length,
          sampleRows: data.slice(0, 3)
        };
      } catch (err) {
        result.tables[tableName] = { error: err.message };
      }
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: `Inspect failed: ${err.message}` }, 500);
  }
});
winmssImportRoutes.post("/winmss", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No .mdb file provided" }, 400);
  }
  if (!file.name.endsWith(".mdb") && !file.name.endsWith(".accdb")) {
    return c.json({ error: "File must be a .mdb or .accdb file" }, 400);
  }
  try {
    const buffer2 = Buffer.from(await file.arrayBuffer());
    const reader = new MDBReader(buffer2);
    const tableNames = reader.getTableNames();
    console.log("[WinMSS Import] Discovered tables:", tableNames.join(", "));
    const result = {
      matches: [],
      stages: [],
      shooters: { created: 0, skipped: 0, errors: [] },
      registrations: { created: 0, skipped: 0 },
      scores: { created: 0, errors: [] },
      warnings: []
    };
    const matchTableName = findTable(tableNames, "match");
    const stageTableName = findTable(tableNames, "stage");
    const memberTableName = findTable(tableNames, "member");
    const competitorTableName = findTable(tableNames, "competitor");
    const scoreTableName = findTable(tableNames, "score");
    const divisionTableName = findTable(tableNames, "division");
    const categoryTableName = findTable(tableNames, "category");
    const powerFactorTableName = findTable(tableNames, "powerFactor");
    const tagTableName = findTable(tableNames, "tag");
    const regionTableName = findTable(tableNames, "region");
    if (!matchTableName) {
      return c.json({ error: "Could not find match table in .mdb file. Tables found: " + tableNames.join(", ") }, 400);
    }
    let divisionLookup = /* @__PURE__ */ new Map();
    let categoryLookup = /* @__PURE__ */ new Map();
    let powerFactorLookup = /* @__PURE__ */ new Map();
    if (divisionTableName) {
      try {
        const divRows = reader.getTable(divisionTableName).getData();
        divisionLookup = buildDivisionLookup(divRows);
        console.log("[WinMSS Import] Division lookup:", Object.fromEntries(divisionLookup));
      } catch {
      }
    }
    if (categoryTableName) {
      try {
        const catRows = reader.getTable(categoryTableName).getData();
        categoryLookup = buildCategoryLookup(catRows);
        console.log("[WinMSS Import] Category lookup:", Object.fromEntries(categoryLookup));
      } catch {
      }
    }
    if (powerFactorTableName) {
      try {
        const pfRows = reader.getTable(powerFactorTableName).getData();
        powerFactorLookup = buildPowerFactorLookup(pfRows);
        console.log("[WinMSS Import] Power factor lookup:", Object.fromEntries(powerFactorLookup));
      } catch {
      }
    }
    let tagLookup = /* @__PURE__ */ new Map();
    let regionLookup = /* @__PURE__ */ new Map();
    if (tagTableName) {
      try {
        const tagRows = reader.getTable(tagTableName).getData();
        tagLookup = buildTagLookup(tagRows);
        console.log("[WinMSS Import] Tag lookup:", Object.fromEntries(tagLookup));
      } catch {
      }
    }
    if (regionTableName) {
      try {
        const regionRows = reader.getTable(regionTableName).getData();
        regionLookup = buildRegionLookup(regionRows);
        console.log("[WinMSS Import] Region lookup:", Object.fromEntries(regionLookup));
      } catch {
      }
    }
    if (memberTableName) {
      const memberTable = reader.getTable(memberTableName);
      console.log("[WinMSS Import] Member columns:", memberTable.getColumnNames().join(", "));
    }
    if (competitorTableName) {
      const compTable = reader.getTable(competitorTableName);
      console.log("[WinMSS Import] Competitor columns:", compTable.getColumnNames().join(", "));
    }
    if (stageTableName) {
      const stageTable = reader.getTable(stageTableName);
      console.log("[WinMSS Import] Stage columns:", stageTable.getColumnNames().join(", "));
    }
    if (scoreTableName) {
      const scoreTable = reader.getTable(scoreTableName);
      console.log("[WinMSS Import] Score columns:", scoreTable.getColumnNames().join(", "));
      const sampleData = scoreTable.getData();
      if (sampleData.length > 0) {
        console.log("[WinMSS Import] Score sample row keys:", Object.keys(sampleData[0]).join(", "));
        console.log("[WinMSS Import] Score sample row (first):", JSON.stringify(sampleData[0]));
      }
    }
    const memberIdMap = /* @__PURE__ */ new Map();
    if (memberTableName) {
      const memberTable = reader.getTable(memberTableName);
      const memberRows = memberTable.getData();
      console.log(`[WinMSS Import] Processing ${memberRows.length} member rows globally`);
      if (memberRows.length > 0) {
        console.log("[WinMSS Import] First member row:", JSON.stringify(memberRows[0]));
      }
      for (let i = 0; i < memberRows.length; i++) {
        const memberRow = memberRows[i];
        try {
          const wmsMemberId = findColumn(memberRow, "memberId");
          const memberIdNum = wmsMemberId !== void 0 ? Number(wmsMemberId) : i + 1;
          const firstName = (findColumn(memberRow, "firstName")?.toString() || "").trim();
          const lastName = (findColumn(memberRow, "lastName")?.toString() || "").trim();
          if (!firstName && !lastName) {
            result.shooters.skipped++;
            result.shooters.errors.push(`Member row ${i + 1} (MemberId=${memberIdNum}): both names empty`);
            continue;
          }
          if (!firstName || !lastName) {
            result.shooters.skipped++;
            result.shooters.errors.push(`Member row ${i + 1} (MemberId=${memberIdNum}): missing name (first="${firstName}", last="${lastName}")`);
            continue;
          }
          let tag = null;
          const dfltTagId = findColumn(memberRow, "memberDfltTagId");
          if (dfltTagId !== void 0 && tagLookup.size > 0) {
            const tagId = Number(dfltTagId);
            if (tagLookup.has(tagId)) {
              tag = tagLookup.get(tagId);
            }
          }
          const existing = await sql`
            SELECT id FROM shooters WHERE winmss_member_id = ${memberIdNum} AND deleted_at IS NULL LIMIT 1
          `;
          if (existing.length > 0) {
            memberIdMap.set(memberIdNum, existing[0].id);
            const regionRaw = findColumn(memberRow, "region");
            const region = mapRegion(regionRaw, regionLookup);
            if (tag || region) {
              await sql`
                UPDATE shooters
                SET tag = COALESCE(${tag || null}, tag),
                    region = CASE WHEN region = '' OR region IS NULL THEN ${region} ELSE region END,
                    updated_at = NOW()
                WHERE id = ${existing[0].id} AND deleted_at IS NULL
              `;
            }
            result.shooters.skipped++;
          } else {
            const division = mapDivision(findColumn(memberRow, "shooterDivision"), divisionLookup);
            const category = mapCategory(findColumn(memberRow, "shooterCategory"), categoryLookup);
            const regionRaw = findColumn(memberRow, "region");
            const region = mapRegion(regionRaw, regionLookup);
            const email = findColumn(memberRow, "shooterEmail")?.toString() || null;
            const pfRaw = findColumn(memberRow, "shooterPowerFactor");
            const shooterPf = mapPowerFactor(pfRaw, powerFactorLookup);
            const [shooter] = await sql`
              INSERT INTO shooters (first_name, last_name, category, division, power_factor, region, email, tag, winmss_member_id)
              VALUES (${firstName}, ${lastName}, ${category}, ${division}, ${shooterPf}, ${region}, ${email}, ${tag || null}, ${memberIdNum})
              RETURNING id
            `;
            memberIdMap.set(memberIdNum, shooter.id);
            result.shooters.created++;
          }
        } catch (err) {
          result.shooters.errors.push(`Member row ${i + 1}: ${err.message}`);
          console.error(`[WinMSS Import] Error importing member row ${i + 1}:`, err.message);
        }
      }
      console.log(`[WinMSS Import] Shooters: ${result.shooters.created} created, ${result.shooters.skipped} skipped, ${result.shooters.errors.length} errors`);
    } else {
      result.warnings.push("No member/shooter table found in .mdb file");
    }
    const matchTable = reader.getTable(matchTableName);
    const matchRows = matchTable.getData();
    if (matchRows.length === 0) {
      return c.json({ error: "No match records found in .mdb file" }, 400);
    }
    console.log("[WinMSS Import] Match columns:", matchTable.getColumnNames().join(", "));
    console.log("[WinMSS Import] Found", matchRows.length, "match(es)");
    console.log("[WinMSS Import] First match row:", JSON.stringify(matchRows[0]));
    let allCompetitorRows = [];
    if (competitorTableName) {
      const competitorTable = reader.getTable(competitorTableName);
      allCompetitorRows = competitorTable.getData();
      if (allCompetitorRows.length > 0) {
        console.log("[WinMSS Import] First competitor row:", JSON.stringify(allCompetitorRows[0]));
      }
    }
    let allScoreRows = [];
    if (scoreTableName) {
      const scoreTable = reader.getTable(scoreTableName);
      allScoreRows = scoreTable.getData();
      if (allScoreRows.length > 0) {
        console.log("[WinMSS Import] Score sample row keys:", Object.keys(allScoreRows[0]).join(", "));
        console.log("[WinMSS Import] Score sample row (first):", JSON.stringify(allScoreRows[0]));
      }
    }
    for (const matchRow of matchRows) {
      const matchName = findColumn(matchRow, "matchName")?.toString() || file.name.replace(/\.mdb$/i, "");
      const matchDateRaw = findColumn(matchRow, "matchDate");
      let matchDate;
      if (matchDateRaw instanceof Date) {
        matchDate = matchDateRaw;
      } else if (matchDateRaw) {
        matchDate = new Date(String(matchDateRaw));
      } else {
        matchDate = /* @__PURE__ */ new Date();
      }
      if (isNaN(matchDate.getTime())) {
        console.warn("[WinMSS Import] Invalid match date for match:", matchName, "raw:", matchDateRaw);
        matchDate = /* @__PURE__ */ new Date();
        result.warnings.push(`Match "${matchName}" has invalid date, using current date`);
      }
      const matchDateStr = matchDate.toISOString().split("T")[0];
      const firearmType = mapFirearmType(findColumn(matchRow, "matchFirearmType"));
      const existingMatch = await sql`
        SELECT id FROM matches WHERE name = ${matchName} AND date = ${matchDateStr}
      `;
      let matchId;
      if (existingMatch.length > 0) {
        matchId = existingMatch[0].id;
        result.warnings.push(`Match "${matchName}" already exists, updating with new data`);
        result.matches.push({ id: matchId, name: matchName, date: matchDateStr, imported: true, updated: true });
      } else {
        const [match2] = await sql`
          INSERT INTO matches (name, date, organization, firearm_type)
          VALUES (${matchName}, ${matchDateStr}, 'IPSC', ${firearmType})
          RETURNING id, name, date
        `;
        matchId = match2.id;
        result.matches.push({ id: match2.id, name: match2.name, date: matchDateStr, imported: true });
      }
      if (!stageTableName) {
        result.warnings.push("No stage table found in .mdb file");
      } else {
        const stageTable = reader.getTable(stageTableName);
        const allStageRows = stageTable.getData();
        if (allStageRows.length > 0) {
          console.log("[WinMSS Import] First stage row:", JSON.stringify(allStageRows[0]));
        }
        let stageRows = allStageRows;
        if (matchRows.length > 1) {
          const currentMatchId = findColumn(matchRow, "matchId");
          if (currentMatchId !== void 0) {
            const filtered = allStageRows.filter((r) => {
              const sid = findColumn(r, "stageMatchId") ?? findColumn(r, "matchId");
              return sid == currentMatchId;
            });
            if (filtered.length > 0) stageRows = filtered;
          }
        }
        for (const stageRow of stageRows) {
          const stageNum = findColumn(stageRow, "stageId") ?? stageRows.indexOf(stageRow) + 1;
          const stageName = findColumn(stageRow, "stageName")?.toString() || `Stage ${stageNum}`;
          const paperTargets = Number(findColumn(stageRow, "stagePaperTargets")) || 0;
          const popperTargets = Number(findColumn(stageRow, "stageSteelTargets")) || 0;
          const plateTargets = Number(findColumn(stageRow, "stagePlateTargets")) || 0;
          const steelTargets = popperTargets + plateTargets;
          const noShootTargets = Number(findColumn(stageRow, "stageNoShootTargets")) || 0;
          const minRounds = Number(findColumn(stageRow, "stageMinRounds")) || paperTargets * 2 + steelTargets;
          const scoringTypeId = findColumn(stageRow, "stageScoringType");
          const scoringType = inferScoringType({ paperTargets, steelTargets, minRounds, scoringTypeId });
          const hpp = inferHitsPerPaper();
          const maxPoints = paperTargets * hpp * 5 + steelTargets * 5;
          try {
            const existingStage = await sql`
              SELECT id FROM stages WHERE match_id = ${matchId} AND stage_number = ${Number(stageNum)}
            `;
            if (existingStage.length > 0) {
              await sql`
                UPDATE stages SET
                  name = ${stageName},
                  scoring_type = ${scoringType},
                  paper_targets = ${paperTargets},
                  steel_targets = ${steelTargets},
                  no_shoot_targets = ${noShootTargets},
                  hits_per_paper = ${hpp},
                  min_rounds = ${minRounds},
                  max_points = ${maxPoints}
                WHERE id = ${existingStage[0].id}
              `;
              result.stages.push({ id: existingStage[0].id, name: stageName, stage_number: Number(stageNum), updated: true });
            } else {
              const [stage] = await sql`
                INSERT INTO stages (match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
                  no_shoot_targets, hits_per_paper, min_rounds, max_points)
                VALUES (${matchId}, ${Number(stageNum)}, ${stageName}, ${scoringType}, ${paperTargets},
                  ${steelTargets}, ${noShootTargets}, ${hpp}, ${minRounds}, ${maxPoints})
                RETURNING id, name, stage_number
              `;
              result.stages.push({ id: stage.id, name: stage.name, stage_number: stage.stage_number });
            }
          } catch (err) {
            result.warnings.push(`Failed to import stage ${stageNum} "${stageName}": ${err.message}`);
          }
        }
      }
      if (!competitorTableName) {
        result.warnings.push("No competitor/registration table found in .mdb file");
      } else {
        const competitorIdMap = /* @__PURE__ */ new Map();
        let competitorRows = allCompetitorRows;
        if (matchRows.length > 1) {
          const currentMatchId = findColumn(matchRow, "matchId");
          if (currentMatchId !== void 0) {
            const filtered = allCompetitorRows.filter((r) => {
              const cid = findColumn(r, "competitorMatchId") ?? findColumn(r, "matchId");
              return cid == currentMatchId;
            });
            if (filtered.length > 0) competitorRows = filtered;
          }
        }
        for (const compRow of competitorRows) {
          try {
            const wmsMemberIdRaw = findColumn(compRow, "competitorMemberId") ?? findColumn(compRow, "memberId");
            const wmsMemberId = wmsMemberIdRaw !== void 0 ? Number(wmsMemberIdRaw) : 0;
            const shooterId = memberIdMap.get(wmsMemberId);
            if (!shooterId) {
              result.warnings.push(`Competitor member ID ${wmsMemberId} not found in member table, skipping`);
              continue;
            }
            const divisionOverride = findColumn(compRow, "competitorDivision") ?? findColumn(compRow, "shooterDivision") ?? findColumn(compRow, "division");
            const categoryOverride = findColumn(compRow, "competitorCategory") ?? findColumn(compRow, "shooterCategory") ?? findColumn(compRow, "category");
            const pfOverride = findColumn(compRow, "competitorPowerFactor") ?? findColumn(compRow, "shooterPowerFactor") ?? findColumn(compRow, "powerFactor");
            const division = divisionOverride ? mapDivision(divisionOverride, divisionLookup) : null;
            const category = categoryOverride ? mapCategory(categoryOverride, categoryLookup) : null;
            const powerFactor = pfOverride ? mapPowerFactor(pfOverride, powerFactorLookup) : null;
            const isDq = Boolean(findColumn(compRow, "competitorDq"));
            const squad = findColumn(compRow, "competitorSquad") ? Number(findColumn(compRow, "competitorSquad")) : null;
            const existingReg = await sql`
              SELECT id FROM match_registrations
              WHERE match_id = ${matchId} AND shooter_id = ${shooterId}
            `;
            if (existingReg.length > 0) {
              const regId = existingReg[0].id;
              competitorIdMap.set(`${wmsMemberId}`, regId);
              result.registrations.skipped++;
              if (division || category || powerFactor || isDq) {
                await sql`
                  UPDATE match_registrations SET
                    division = COALESCE(${division}, division),
                    category = COALESCE(${category}, category),
                    power_factor = COALESCE(${powerFactor}, power_factor),
                    is_dq = ${isDq},
                    dq_reason = ${isDq ? "DQ (imported from WinMSS)" : null}
                  WHERE id = ${regId}
                `;
              }
            } else {
              const [reg] = await sql`
                INSERT INTO match_registrations (match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
                VALUES (${matchId}, ${shooterId}, ${squad},
                  ${division}, ${category}, ${powerFactor},
                  ${isDq}, ${isDq ? "DQ (imported from WinMSS)" : null})
                RETURNING id
              `;
              competitorIdMap.set(`${wmsMemberId}`, reg.id);
              result.registrations.created++;
            }
          } catch (err) {
            result.warnings.push(`Registration import error: ${err.message}`);
          }
        }
        if (!scoreTableName) {
          result.warnings.push("No score table found in .mdb file");
        } else {
          const dbStages = await sql`
            SELECT id, stage_number, scoring_type, paper_targets, steel_targets,
              no_shoot_targets, hits_per_paper, min_rounds, max_points
            FROM stages WHERE match_id = ${matchId}
          `;
          const stageByNumber = new Map(dbStages.map((s) => [s.stage_number, s]));
          console.log("[WinMSS Import] DB stages for match:", dbStages.map((s) => `#${s.stage_number} ${s.name}`).join(", "));
          console.log("[WinMSS Import] Competitor map entries:", competitorIdMap.size);
          let matchScoreRows = allScoreRows;
          const wmsMatchId = findColumn(matchRow, "matchId");
          if (wmsMatchId !== void 0) {
            const filtered = allScoreRows.filter((r) => {
              const rowMatchId = findColumn(r, "scoreMatchId") ?? findColumn(r, "matchId");
              return rowMatchId == wmsMatchId;
            });
            if (filtered.length > 0) {
              matchScoreRows = filtered;
              console.log("[WinMSS Import] Filtered scores for match", wmsMatchId, ":", filtered.length, "of", allScoreRows.length);
            }
          }
          console.log("[WinMSS Import] Processing", matchScoreRows.length, "score rows");
          if (matchScoreRows.length > 0) {
            console.log("[WinMSS Import] First score row columns:", Object.keys(matchScoreRows[0]).join(", "));
            console.log("[WinMSS Import] First score row values:", dumpRow(matchScoreRows[0]));
          }
          let scoreSkippedNoReg = 0;
          let scoreSkippedNoStage = 0;
          const dqRegIds = new Set(
            (await sql`
              SELECT id FROM match_registrations WHERE match_id = ${matchId} AND is_dq = true
            `).map((r) => r.id)
          );
          for (const scoreRow of matchScoreRows) {
            try {
              let distributeHits2 = function(totalA, totalC, totalD, totalM, count, maxPerTarget) {
                const targets2 = Array.from({ length: count }, () => ({ alpha: 0, charlie: 0, delta: 0, miss: 0 }));
                let remaining = totalA;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space2 = maxPerTarget - targets2[i].alpha;
                  const fill = Math.min(space2, remaining);
                  targets2[i].alpha = fill;
                  remaining -= fill;
                }
                remaining = totalC;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space2 = maxPerTarget - (targets2[i].alpha + targets2[i].charlie);
                  const fill = Math.min(space2, remaining);
                  targets2[i].charlie = fill;
                  remaining -= fill;
                }
                remaining = totalD;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space2 = maxPerTarget - (targets2[i].alpha + targets2[i].charlie + targets2[i].delta);
                  const fill = Math.min(space2, remaining);
                  targets2[i].delta = fill;
                  remaining -= fill;
                }
                remaining = totalM;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space2 = maxPerTarget - (targets2[i].alpha + targets2[i].charlie + targets2[i].delta + targets2[i].miss);
                  const fill = Math.min(space2, remaining);
                  targets2[i].miss = fill;
                  remaining -= fill;
                }
                return targets2;
              };
              var distributeHits = distributeHits2;
              const wmsMemberIdRaw = findColumn(scoreRow, "scoreMemberId") ?? findColumn(scoreRow, "memberId") ?? findColumn(scoreRow, "competitorId");
              const wmsMemberId = wmsMemberIdRaw !== void 0 ? Number(wmsMemberIdRaw) : 0;
              const wmsStageId = Number(findColumn(scoreRow, "stageId") ?? findColumn(scoreRow, "stageNumber") ?? 0);
              const registrationId = competitorIdMap.get(`${wmsMemberId}`);
              const stage = stageByNumber.get(wmsStageId);
              if (!registrationId) {
                scoreSkippedNoReg++;
                if (scoreSkippedNoReg <= 5) {
                  const allKeys = Object.keys(scoreRow);
                  result.scores.errors.push(
                    `Score row: member ${wmsMemberId} not in competitor map. Row keys: ${allKeys.join(",")}. Stage=${wmsStageId}`
                  );
                }
                continue;
              }
              if (!stage) {
                scoreSkippedNoStage++;
                if (scoreSkippedNoStage <= 5) {
                  result.scores.errors.push(
                    `Score row: stage ${wmsStageId} not found in DB stages (available: ${[...stageByNumber.keys()].join(",")})`
                  );
                }
                continue;
              }
              const alpha = Number(findColumn(scoreRow, "scoreAlpha")) || 0;
              const charlie = Number(findColumn(scoreRow, "scoreCharlie")) || 0;
              const delta = Number(findColumn(scoreRow, "scoreDelta")) || 0;
              const miss = Number(findColumn(scoreRow, "scoreMiss")) || 0;
              const noShootHits = Number(findColumn(scoreRow, "scoreNoShoot")) || 0;
              const procedural = Number(findColumn(scoreRow, "scoreProcedural")) || 0;
              const ftsaCount = Number(findColumn(scoreRow, "scoreFTSA")) || 0;
              const time = Number(findColumn(scoreRow, "scoreTime")) || 0;
              const isDnf = Boolean(findColumn(scoreRow, "scoreDnf"));
              const isDq = Boolean(findColumn(scoreRow, "scoreDq"));
              if (result.scores.created === 0) {
                console.log("[WinMSS Import] First score extracted: alpha=" + alpha + " charlie=" + charlie + " delta=" + delta + " miss=" + miss + " ns=" + noShootHits + " proc=" + procedural + " time=" + time + " member=" + wmsMemberId + " stage=" + wmsStageId);
              }
              if (alpha === 0 && charlie === 0 && delta === 0 && miss === 0 && time === 0 && result.scores.created < 3) {
                console.log("[WinMSS Import] WARNING: Score has all-zero hits/time. Full row:", dumpRow(scoreRow));
                result.warnings.push(`Score for member ${wmsMemberId} stage ${wmsStageId} has zero hits \u2014 column names may not match`);
              }
              const reg = await sql`SELECT power_factor FROM match_registrations WHERE id = ${registrationId}`;
              const pf = reg.length > 0 ? reg[0].power_factor || "minor" : "minor";
              const steelCount = stage.steel_targets || 0;
              const calcResult = calculateAggregatedScore({
                total_alpha: alpha,
                total_charlie: charlie,
                total_delta: delta,
                total_miss: miss,
                total_no_shoot: noShootHits,
                total_steel: steelCount,
                steel_hit_count: steelCount,
                procedural_count: procedural,
                ftsa_count: ftsaCount,
                extra_shot_count: 0,
                extra_hit_count: 0,
                stacking_count: 0,
                overtime_shot_count: 0,
                time,
                scoring_type: stage.scoring_type,
                power_factor: pf
              });
              const hpp = stage.hits_per_paper || 2;
              const paperCount = Math.max(stage.paper_targets || 0, 1);
              const paperAlpha = Math.max(0, alpha - steelCount);
              const paperCharlie = charlie;
              const paperDelta = delta;
              const paperMiss = miss;
              const paperTargets = distributeHits2(paperAlpha, paperCharlie, paperDelta, paperMiss, paperCount, hpp);
              const nsOnPaper = stage.no_shoot_targets === 0 ? noShootHits : 0;
              if (nsOnPaper > 0) {
                let remaining = nsOnPaper;
                for (let i = 0; i < paperCount && remaining > 0; i++) {
                  const space2 = hpp - (paperTargets[i].alpha + paperTargets[i].charlie + paperTargets[i].delta + paperTargets[i].miss);
                  const fill = Math.min(Math.max(space2, 0), remaining);
                  paperTargets[i].miss += fill;
                  remaining -= fill;
                }
              }
              const targets = [];
              for (let i = 0; i < paperCount; i++) {
                targets.push({
                  target_type: "paper",
                  alpha: paperTargets[i].alpha,
                  charlie: paperTargets[i].charlie,
                  delta: paperTargets[i].delta,
                  miss: paperTargets[i].miss,
                  no_shoot_hits: 0,
                  steel_hit: null
                });
              }
              if (stage.no_shoot_targets > 0) {
                const nsPerTarget = Math.floor(noShootHits / stage.no_shoot_targets);
                let nsRemaining = noShootHits % stage.no_shoot_targets;
                for (let i = 0; i < stage.no_shoot_targets; i++) {
                  targets.push({
                    target_type: "no_shoot",
                    alpha: 0,
                    charlie: 0,
                    delta: 0,
                    miss: 0,
                    no_shoot_hits: nsPerTarget + (nsRemaining > 0 ? 1 : 0),
                    steel_hit: null
                  });
                  if (nsRemaining > 0) nsRemaining--;
                }
              }
              for (let i = 0; i < steelCount; i++) {
                targets.push({
                  target_type: "steel",
                  alpha: 0,
                  charlie: 0,
                  delta: 0,
                  miss: 0,
                  no_shoot_hits: 0,
                  steel_hit: true
                });
              }
              const scoreData = {
                source: "winmss",
                aggregated: {
                  alpha,
                  charlie,
                  delta,
                  miss,
                  no_shoot: noShootHits,
                  procedural,
                  steel_count: steelCount
                }
              };
              const existingScore = await sql`
                SELECT id FROM stage_scores
                WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
              `;
              if (existingScore.length > 0) {
                await sql`
                  UPDATE stage_scores SET
                    time = ${time},
                    procedural_count = ${procedural},
                    raw_points = ${calcResult.raw_points},
                    penalty_points = ${calcResult.penalty_points},
                    net_points = ${calcResult.net_points},
                    hit_factor = ${calcResult.hit_factor},
                    is_dnf = ${isDnf},
                    score_data = ${JSON.stringify(scoreData)}::jsonb
                  WHERE id = ${existingScore[0].id}
                `;
                await sql`DELETE FROM target_scores WHERE stage_score_id = ${existingScore[0].id}`;
                for (let i = 0; i < targets.length; i++) {
                  const t = targets[i];
                  await sql`
                    INSERT INTO target_scores (stage_score_id, target_index, target_type,
                      alpha, charlie, delta, miss, no_shoot_hits, steel_hit)
                    VALUES (${existingScore[0].id}, ${i + 1}, ${t.target_type},
                      ${t.alpha}, ${t.charlie}, ${t.delta}, ${t.miss},
                      ${t.no_shoot_hits}, ${t.steel_hit})
                  `;
                }
              } else {
                const [score] = await sql`
                  INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
                    procedural_count, raw_points, penalty_points, net_points, hit_factor, is_dnf, score_data)
                  VALUES (${matchId}, ${stage.id}, ${registrationId}, ${time},
                    ${procedural}, ${calcResult.raw_points}, ${calcResult.penalty_points},
                    ${calcResult.net_points}, ${calcResult.hit_factor}, ${isDnf}, ${JSON.stringify(scoreData)}::jsonb)
                  RETURNING id
                `;
                for (let i = 0; i < targets.length; i++) {
                  const t = targets[i];
                  await sql`
                    INSERT INTO target_scores (stage_score_id, target_index, target_type,
                      alpha, charlie, delta, miss, no_shoot_hits, steel_hit)
                    VALUES (${score.id}, ${i + 1}, ${t.target_type},
                      ${t.alpha}, ${t.charlie}, ${t.delta}, ${t.miss},
                      ${t.no_shoot_hits}, ${t.steel_hit})
                  `;
                }
              }
              result.scores.created++;
            } catch (err) {
              result.scores.errors.push(`Score import error: ${err.message}`);
            }
          }
          if (scoreSkippedNoReg > 0) {
            result.warnings.push(`${scoreSkippedNoReg} scores skipped \u2014 could not match member ID to registration`);
          }
          if (scoreSkippedNoStage > 0) {
            result.warnings.push(`${scoreSkippedNoStage} scores skipped \u2014 could not match stage number`);
          }
          for (const stage of dbStages) {
            try {
              const stageScores = await sql`
                SELECT ss.id, ss.time, ss.net_points, ss.registration_id, ss.is_dnf,
                  COALESCE(mr.division, s.division) as division,
                  mr.power_factor as reg_pf, s.power_factor as shooter_pf
                FROM stage_scores ss
                JOIN match_registrations mr ON mr.id = ss.registration_id
                JOIN shooters s ON s.id = mr.shooter_id
                WHERE ss.stage_id = ${stage.id}
              `;
              if (stageScores.length === 0) continue;
              const maxPoints = Number(stage.max_points) || stage.paper_targets * stage.hits_per_paper * 5 + stage.steel_targets * 5;
              const divisionGroups = /* @__PURE__ */ new Map();
              for (const s of stageScores) {
                if (s.is_dnf || dqRegIds.has(s.registration_id)) continue;
                const div = s.division || "unknown";
                if (!divisionGroups.has(div)) divisionGroups.set(div, []);
                divisionGroups.get(div).push(s);
              }
              for (const [division, divScores] of divisionGroups) {
                let bestHF = 0;
                for (const s of divScores) {
                  const hf = Number(s.time) > 0 ? Number(s.net_points) / Number(s.time) : 0;
                  if (hf > bestHF) bestHF = hf;
                }
                for (const s of divScores) {
                  const hf = Number(s.time) > 0 ? Number(s.net_points) / Number(s.time) : 0;
                  const stagePercent = bestHF > 0 ? hf / bestHF * 100 : 0;
                  const stagePoints = stagePercent / 100 * maxPoints;
                  await sql`
                    UPDATE stage_scores SET
                      stage_percent = ${Math.round(stagePercent * 1e4) / 1e4},
                      stage_points = ${Math.round(stagePoints * 100) / 100}
                    WHERE id = ${s.id}
                  `;
                }
              }
              for (const s of stageScores) {
                if (dqRegIds.has(s.registration_id) || s.is_dnf) {
                  await sql`
                    UPDATE stage_scores SET stage_percent = 0, stage_points = 0 WHERE id = ${s.id}
                  `;
                }
              }
            } catch (err) {
              result.warnings.push(`Failed to recalculate stage ${stage.stage_number}: ${err.message}`);
            }
          }
        }
      }
    }
    try {
      const updatedShooters = await sql`
        UPDATE shooters s
        SET division = mr.division,
            category = mr.category,
            power_factor = mr.power_factor,
            updated_at = NOW()
        FROM match_registrations mr
        JOIN (
          SELECT shooter_id, MAX(created_at) as max_created
          FROM match_registrations
          WHERE division IS NOT NULL
          GROUP BY shooter_id
        ) latest ON mr.shooter_id = latest.shooter_id AND mr.created_at = latest.max_created
        WHERE s.id = mr.shooter_id
          AND s.deleted_at IS NULL
          AND mr.division IS NOT NULL
      `;
      console.log(`[WinMSS Import] Updated ${updatedShooters.count} shooter defaults from registrations`);
    } catch (err) {
      result.warnings.push(`Could not update shooter defaults from registrations: ${err.message}`);
    }
    console.log(`[WinMSS Import] Complete: ${result.matches.length} matches, ${result.stages.length} stages, ${result.shooters.created}/${result.shooters.skipped} shooters, ${result.registrations.created}/${result.registrations.skipped} regs, ${result.scores.created} scores`);
    console.log(`[WinMSS Import] Warnings: ${result.warnings.length}, Errors: ${result.scores.errors.length}, Shooter errors: ${result.shooters.errors.length}`);
    return c.json(result);
  } catch (err) {
    console.error("[WinMSS Import] Error:", err);
    return c.json({ error: `Import failed: ${err.message}` }, 500);
  }
});

// ../backend/src/routes/auth.ts
init_client();
import crypto5 from "crypto";
import fs2 from "fs";
init_env();
init_stageLinkTokens();
var authRoutes = new Hono2();
var DEFAULT_ADMIN_PASSWORD = "admin";
var BCRYPT_COST = 12;
var WEAK_PASSWORDS = ["admin", "password", "1234", "12345", "123456", "1234567", "12345678", "123456789", "1234567890", "qwerty", "letmein", "welcome", "monkey", "dragon"];
function isWeakPassword(pw) {
  return WEAK_PASSWORDS.includes(pw.toLowerCase());
}
function isValidPassword(pw, minLength) {
  if (pw.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters.` };
  }
  if (isWeakPassword(pw)) {
    return { valid: false, error: "This password is too common. Please choose a stronger password." };
  }
  return { valid: true };
}
async function getCurrentSessionEpoch() {
  const [setting] = await sql`SELECT value FROM app_settings WHERE key = 'session_epoch'`;
  return setting?.value || "0";
}
async function bumpSessionEpoch() {
  const current = await getCurrentSessionEpoch();
  const next = String(Number(current) + 1);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('session_epoch', ${next}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${next}, updated_at = now()
  `;
}
function getPublicOrigin(c) {
  const headerOrigin = c.req.header("X-Public-Origin");
  const fallback = `${c.req.url.split("/api")[0]}`;
  const origin = headerOrigin || fallback;
  const isHttps = !!(env.TLS_CERT_PATH && env.TLS_KEY_PATH && fs2.existsSync(env.TLS_CERT_PATH) && fs2.existsSync(env.TLS_KEY_PATH));
  const scheme = isHttps ? "https" : "http";
  return origin.replace(/^https?:\/\//, `${scheme}://`);
}
authRoutes.post("/admin-login", async (c) => {
  const { password } = await c.req.json();
  if (!password) {
    return c.json({ error: "Password is required." }, 400);
  }
  const storedHashSetting = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const storedHash = storedHashSetting[0]?.value || "";
  let valid;
  if (!storedHash) {
    valid = password === DEFAULT_ADMIN_PASSWORD;
    if (valid) {
      const hash3 = await bcryptjs_default.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_COST);
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('admin_password_hash', ${hash3}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${hash3}, updated_at = now()
      `;
    }
  } else {
    valid = await bcryptjs_default.compare(password, storedHash);
  }
  if (!valid) {
    return c.json({ error: "Incorrect password." }, 401);
  }
  await sql`DELETE FROM admin_sessions WHERE expires_at < now()`;
  const token = crypto5.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
  await sql`
    INSERT INTO admin_sessions (token, expires_at)
    VALUES (${token}, ${expiresAt.toISOString()})
  `;
  return c.json({ token, role: "admin" });
});
authRoutes.post("/admin-logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});
authRoutes.post("/admin-logout-all", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required." }, 401);
  }
  const token = authHeader.slice(7);
  const [session] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (!session) {
    return c.json({ error: "Invalid or expired admin session." }, 401);
  }
  await sql`DELETE FROM admin_sessions WHERE 1=1`;
  await bumpSessionEpoch();
  return c.json({ success: true });
});
authRoutes.put("/admin-password", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required." }, 401);
  }
  const token = authHeader.slice(7);
  const [session] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (!session) {
    return c.json({ error: "Invalid or expired admin session." }, 401);
  }
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return c.json({ error: "Current password and new password are required." }, 400);
  }
  if (currentPassword === newPassword) {
    return c.json({ error: "New password must be different from the current password." }, 400);
  }
  const validation = isValidPassword(newPassword, 10);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const storedHash = setting?.value || "";
  let valid;
  if (!storedHash) {
    valid = currentPassword === DEFAULT_ADMIN_PASSWORD;
    if (valid) {
      const hash3 = await bcryptjs_default.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_COST);
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('admin_password_hash', ${hash3}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${hash3}, updated_at = now()
      `;
    }
  } else {
    valid = await bcryptjs_default.compare(currentPassword, storedHash);
  }
  if (!valid) {
    return c.json({ error: "Incorrect current password." }, 401);
  }
  const newHash = await bcryptjs_default.hash(newPassword, BCRYPT_COST);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('admin_password_hash', ${newHash}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${newHash}, updated_at = now()
  `;
  await bumpSessionEpoch();
  return c.json({ success: true });
});
authRoutes.get("/admin-password-status", async (c) => {
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const hasPassword = !!setting?.value;
  return c.json({ hasPassword });
});
authRoutes.post("/stage-login", async (c) => {
  const { stageId, password } = await c.req.json();
  if (!stageId || !password) {
    return c.json({ error: "Stage ID and password are required." }, 400);
  }
  if (password.length < STAGE_PASSWORD_MIN_LENGTH) {
    return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
  }
  const [stage] = await sql`
    SELECT s.id, s.name, s.password_hash, s.match_id
    FROM stages s
    WHERE s.id = ${stageId}
  `;
  if (!stage) {
    return c.json({ error: "Stage not found." }, 404);
  }
  if (!stage.password_hash) {
    return c.json({ error: "This stage does not require authentication." }, 400);
  }
  const valid = await bcryptjs_default.compare(password, stage.password_hash);
  if (!valid) {
    return c.json({ error: "Incorrect password." }, 401);
  }
  await sql`
    DELETE FROM stage_sessions
    WHERE stage_id = ${stageId} AND expires_at < now()
  `;
  const token = crypto5.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
  await sql`
    INSERT INTO stage_sessions (stage_id, token, expires_at, last_used_at)
    VALUES (${stageId}, ${token}, ${expiresAt.toISOString()}, now())
  `;
  return c.json({
    token,
    stageId: stage.id,
    stageName: stage.name,
    matchId: stage.match_id
  });
});
authRoutes.get("/stages", async (c) => {
  let matchId = c.req.query("matchId");
  if (!matchId) {
    const [currentMatch] = await sql`
      SELECT id FROM matches WHERE is_current = true LIMIT 1
    `;
    if (currentMatch) {
      matchId = currentMatch.id;
    }
  }
  let stages;
  if (matchId) {
    stages = await sql`
      SELECT s.id, s.name, s.stage_number, s.match_id, m.name as match_name
      FROM stages s
      JOIN matches m ON m.id = s.match_id
      WHERE s.match_id = ${matchId} AND s.password_hash IS NOT NULL
      ORDER BY s.stage_number
    `;
  } else {
    stages = await sql`
      SELECT s.id, s.name, s.stage_number, s.match_id, m.name as match_name
      FROM stages s
      JOIN matches m ON m.id = s.match_id
      WHERE s.password_hash IS NOT NULL
      ORDER BY s.match_id, s.stage_number
    `;
  }
  return c.json(stages.map((s) => ({
    id: s.id,
    name: s.name,
    stageNumber: s.stage_number,
    matchId: s.match_id,
    matchName: s.match_name
  })));
});
authRoutes.post("/stage-hash", async (c) => {
  const { stageId, password } = await c.req.json();
  if (!stageId || !password) {
    return c.json({ error: "Stage ID and password are required." }, 400);
  }
  const [stage] = await sql`
    SELECT id, password_hash FROM stages WHERE id = ${stageId}
  `;
  if (!stage || !stage.password_hash) {
    return c.json({ valid: false });
  }
  const valid = await bcryptjs_default.compare(password, stage.password_hash);
  return c.json({ valid });
});
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const domainMode = c.get("domainMode") || "admin";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const [adminSession] = await sql`
      SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
    `;
    if (adminSession) {
      return c.json({ role: "admin", stageId: null, isLocalNetwork: true, domainMode });
    }
    const [scorerSession] = await sql`
      SELECT ss.stage_id, ss.expires_at, s.name as stage_name, s.match_id
      FROM stage_sessions ss
      JOIN stages s ON s.id = ss.stage_id
      WHERE ss.token = ${token}
    `;
    if (scorerSession) {
      if (new Date(scorerSession.expires_at) < /* @__PURE__ */ new Date()) {
        await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
        return c.json({ role: "anonymous", stageId: null, isLocalNetwork: false, domainMode });
      }
      return c.json({ role: "scorer", stageId: scorerSession.stage_id, stageName: scorerSession.stage_name, matchId: scorerSession.match_id, isLocalNetwork: false, domainMode });
    }
  }
  return c.json({ role: "anonymous", stageId: null, isLocalNetwork: false, domainMode });
});
authRoutes.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});
authRoutes.post("/stage-link-token", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required." }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: "Invalid or expired admin session." }, 401);
  }
  const { stageId, ttlSeconds } = await c.req.json();
  if (!stageId) {
    return c.json({ error: "stageId is required." }, 400);
  }
  try {
    const result = await createStageLinkToken(stageId, ttlSeconds, adminToken);
    return c.json({
      token: result.token,
      url: `${getPublicOrigin(c)}/hodnotenie?stageToken=${result.token}`,
      stageId: result.stageId,
      stageName: result.stageName,
      matchId: result.matchId,
      expiresAt: result.expiresAt.toISOString()
    });
  } catch (err) {
    if (err.message === "Stage not found") {
      return c.json({ error: "Stage not found." }, 404);
    }
    throw err;
  }
});
authRoutes.post("/stage-link-redeem", async (c) => {
  const { token } = await c.req.json();
  if (!token) {
    return c.json({ error: "token is required." }, 400);
  }
  const clientIp = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || null;
  try {
    const result = await redeemStageLinkToken(token, clientIp || void 0);
    await sql`
      DELETE FROM stage_sessions
      WHERE stage_id = ${result.stageId} AND expires_at < now()
    `;
    const sessionToken = crypto5.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await sql`
      INSERT INTO stage_sessions (stage_id, token, expires_at, last_used_at)
      VALUES (${result.stageId}, ${sessionToken}, ${expiresAt.toISOString()}, now())
    `;
    return c.json({
      sessionToken,
      stageId: result.stageId,
      stageName: result.stageName,
      matchId: result.matchId,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    if (err instanceof TokenError) {
      return c.json({ error: err.message }, err.status);
    }
    throw err;
  }
});
authRoutes.delete("/stage-link-token", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required." }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: "Invalid or expired admin session." }, 401);
  }
  let matchId;
  try {
    const body = await c.req.json();
    matchId = body.matchId;
  } catch {
  }
  if (!matchId) {
    const [currentMatch] = await sql`
      SELECT id FROM matches WHERE is_current = true LIMIT 1
    `;
    if (currentMatch) matchId = currentMatch.id;
  }
  if (!matchId) {
    return c.json({ error: "No current match set." }, 400);
  }
  const count = await revokeStageLinkTokens(matchId);
  return c.json({ revoked: count });
});
authRoutes.get("/stage-link-token", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required." }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: "Invalid or expired admin session." }, 401);
  }
  let matchId = c.req.query("matchId");
  if (!matchId) {
    const [currentMatch] = await sql`
      SELECT id FROM matches WHERE is_current = true LIMIT 1
    `;
    if (currentMatch) {
      matchId = currentMatch.id;
    }
  }
  if (!matchId) {
    return c.json([]);
  }
  const tokens = await getActiveStageLinkTokens(matchId);
  const publicOrigin = getPublicOrigin(c);
  return c.json(tokens.map((t) => ({
    id: t.id,
    stageId: t.stage_id,
    stageName: t.stage_name,
    stageNumber: t.stage_number,
    url: `${publicOrigin}/hodnotenie?stageToken=${t.id}`,
    createdAt: t.created_at,
    expiresAt: t.expires_at
  })));
});

// ../backend/src/routes/backup.ts
import { execFile } from "child_process";
import { promisify } from "util";
import fs4 from "fs/promises";
import os2 from "os";
import path2 from "path";

// ../backend/src/utils/pgBin.ts
import path from "path";
import fs3 from "fs";
import { execSync } from "child_process";
var cachedBinDir = null;
function getPgBinDir() {
  if (cachedBinDir) return cachedBinDir;
  const resourcesPath = process.resourcesPath;
  if (resourcesPath) {
    const bundledDir = path.join(resourcesPath, "pg", "bin");
    try {
      const ext = process.platform === "win32" ? ".exe" : "";
      fs3.accessSync(path.join(bundledDir, `psql${ext}`));
      cachedBinDir = bundledDir;
      return cachedBinDir;
    } catch {
    }
  }
  try {
    const result = execSync(
      process.platform === "win32" ? "where psql" : "which psql",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const dir = path.dirname(result.split("\n")[0].trim());
    cachedBinDir = dir;
    return dir;
  } catch {
  }
  const platform = process.platform;
  const fallbacks = platform === "win32" ? ["C:\\Program Files\\PostgreSQL\\16\\bin", "C:\\Program Files\\PostgreSQL\\17\\bin"] : platform === "darwin" ? ["/opt/homebrew/opt/postgresql@16/bin", "/opt/homebrew/opt/postgresql@17/bin", "/opt/homebrew/opt/postgresql/bin", "/usr/local/opt/postgresql@16/bin", "/usr/local/opt/postgresql/bin"] : ["/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/17/bin", "/usr/bin"];
  for (const dir of fallbacks) {
    const ext = process.platform === "win32" ? ".exe" : "";
    try {
      fs3.accessSync(path.join(dir, `psql${ext}`));
      cachedBinDir = dir;
      return dir;
    } catch {
      continue;
    }
  }
  throw new Error("PostgreSQL binaries not found. Install postgresql-client or ensure pg_dump/psql are in PATH.");
}
function getPgDumpPath() {
  const ext = process.platform === "win32" ? ".exe" : "";
  return path.join(getPgBinDir(), `pg_dump${ext}`);
}
function getPsqlPath() {
  const ext = process.platform === "win32" ? ".exe" : "";
  return path.join(getPgBinDir(), `psql${ext}`);
}
function parseDatabaseUrl(dbUrl) {
  const url = new URL(dbUrl);
  return {
    PGHOST: url.hostname || "localhost",
    PGPORT: url.port || "5432",
    PGUSER: url.username || "ipscscore",
    PGPASSWORD: url.password || "",
    PGDATABASE: url.pathname.slice(1) || "ipscscore"
  };
}

// ../backend/src/routes/backup.ts
init_env();
var execFileAsync = promisify(execFile);
var backupRoutes = new Hono2();
backupRoutes.post("/backup", async (c) => {
  let pgDumpPath;
  let dbParams;
  try {
    pgDumpPath = getPgDumpPath();
    dbParams = parseDatabaseUrl(env.DATABASE_URL);
  } catch (err) {
    console.error("[Backup] Setup error:", err);
    return c.json({ error: `Backup setup failed: ${err.message}` }, 500);
  }
  const tmpFile = path2.join(os2.tmpdir(), `ipscscore-backup-${Date.now()}.sql`);
  try {
    await execFileAsync(pgDumpPath, [
      "--no-password",
      "--clean",
      "--if-exists",
      "--format=plain",
      "-f",
      tmpFile
    ], {
      env: { ...process.env, ...dbParams },
      maxBuffer: 50 * 1024 * 1024
    });
    const fileContent = await fs4.readFile(tmpFile);
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    await audit(c, "backup.export");
    c.header("Content-Disposition", `attachment; filename="ipscscore-backup-${date}.sql"`);
    c.header("Content-Type", "text/sql; charset=utf-8");
    return c.body(fileContent);
  } catch (err) {
    console.error("[Backup] pg_dump error:", err);
    return c.json({ error: `Backup failed: ${err.message}` }, 500);
  } finally {
    try {
      await fs4.unlink(tmpFile);
    } catch {
    }
  }
});
backupRoutes.post("/restore", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }
  let psqlPath;
  let dbParams;
  try {
    psqlPath = getPsqlPath();
    dbParams = parseDatabaseUrl(env.DATABASE_URL);
  } catch (err) {
    console.error("[Restore] Setup error:", err);
    return c.json({ error: `Restore setup failed: ${err.message}` }, 500);
  }
  const tmpFile = path2.join(os2.tmpdir(), `ipscscore-restore-${Date.now()}.sql`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs4.writeFile(tmpFile, Buffer.from(arrayBuffer));
    const { stderr } = await execFileAsync(psqlPath, [
      "--no-password",
      "-f",
      tmpFile
    ], {
      env: { ...process.env, ...dbParams },
      maxBuffer: 50 * 1024 * 1024
    });
    console.log("[Restore] psql stderr:", stderr?.slice(0, 500));
    await audit(c, "backup.restore");
    return c.json({ success: true, message: "Database restored successfully" });
  } catch (err) {
    console.error("[Restore] Error:", err);
    return c.json({ error: `Restore failed: ${err.message}` }, 500);
  } finally {
    try {
      await fs4.unlink(tmpFile);
    } catch {
    }
  }
});

// ../backend/src/routes/matchExport.ts
init_client();
var matchExportRoutes = new Hono2();
matchExportRoutes.get("/matches/:id/export", async (c) => {
  const matchId = c.req.param("id");
  const [match2] = await sql`SELECT id, name, date, organization, firearm_type, match_level, is_current FROM matches WHERE id = ${matchId}`;
  if (!match2) {
    return c.json({ error: "Match not found" }, 404);
  }
  const stages = await sql`SELECT id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;
  const registrations = await sql`
    SELECT mr.id, mr.squad, mr.division AS division_override, mr.category AS category_override,
           mr.power_factor AS power_factor_override, mr.is_dq, mr.dq_reason,
           s.id AS shooter_id, s.first_name, s.last_name, s.category, s.division,
           s.power_factor, s.region, s.email, s.winmss_member_id
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
  `;
  const stageScores = await sql`SELECT id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points, total_time, x_count, score_data FROM stage_scores WHERE match_id = ${matchId}`;
  const stageScoreIds = stageScores.map((s) => s.id);
  let targetScores = [];
  let chronoResults = [];
  if (stageScoreIds.length > 0) {
    targetScores = await sql`SELECT id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data FROM target_scores WHERE stage_score_id = ANY(${stageScoreIds})`;
    chronoResults = await sql`SELECT id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3, avg_velocity, calculated_pf, pf_passed FROM chrono_results WHERE stage_score_id = ANY(${stageScoreIds})`;
  }
  const result = {
    format_version: 1,
    exported_at: (/* @__PURE__ */ new Date()).toISOString(),
    match: {
      id: match2.id,
      name: match2.name,
      date: match2.date,
      organization: match2.organization,
      firearm_type: match2.firearm_type,
      match_level: match2.match_level
    },
    stages: stages.map(({ id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config }) => ({
      id,
      stage_number,
      name,
      scoring_type,
      paper_targets,
      steel_targets,
      no_shoot_targets,
      npm_targets,
      hits_per_paper,
      min_rounds,
      max_points,
      par_time,
      briefing,
      config
    })),
    registrations: registrations.map((r) => ({
      id: r.id,
      shooter: {
        id: r.shooter_id,
        first_name: r.first_name,
        last_name: r.last_name,
        category: r.category,
        division: r.division,
        power_factor: r.power_factor,
        region: r.region,
        email: r.email,
        winmss_member_id: r.winmss_member_id
      },
      squad: r.squad,
      division_override: r.division_override,
      category_override: r.category_override,
      power_factor_override: r.power_factor_override,
      is_dq: r.is_dq,
      dq_reason: r.dq_reason
    })),
    stage_scores: stageScores.map((s) => ({
      id: s.id,
      stage_id: s.stage_id,
      registration_id: s.registration_id,
      time: s.time,
      extra_shot_count: s.extra_shot_count,
      extra_hit_count: s.extra_hit_count,
      stacking_count: s.stacking_count,
      overtime_shot_count: s.overtime_shot_count,
      procedural_count: s.procedural_count,
      ftsa_count: s.ftsa_count,
      is_dnf: s.is_dnf,
      raw_points: s.raw_points,
      penalty_points: s.penalty_points,
      net_points: s.net_points,
      hit_factor: s.hit_factor,
      stage_percent: s.stage_percent,
      stage_points: s.stage_points,
      total_time: s.total_time,
      x_count: s.x_count,
      score_data: s.score_data
    })),
    target_scores: targetScores.map((t) => ({
      id: t.id,
      stage_score_id: t.stage_score_id,
      target_index: t.target_index,
      target_type: t.target_type,
      alpha: t.alpha,
      charlie: t.charlie,
      delta: t.delta,
      miss: t.miss,
      no_shoot_hits: t.no_shoot_hits,
      steel_hit: t.steel_hit,
      target_data: t.target_data
    })),
    chrono_results: chronoResults.map((c2) => ({
      id: c2.id,
      stage_score_id: c2.stage_score_id,
      bullet_weight: c2.bullet_weight,
      velocity_1: c2.velocity_1,
      velocity_2: c2.velocity_2,
      velocity_3: c2.velocity_3,
      avg_velocity: c2.avg_velocity,
      calculated_pf: c2.calculated_pf,
      pf_passed: c2.pf_passed
    }))
  };
  const safeName = (match2.name || "match").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  await audit(c, "match.export", `matches:${matchId}`);
  c.header("Content-Disposition", `attachment; filename="${safeName}-${date}.match.json"`);
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.json(result);
});
matchExportRoutes.post("/matches/import", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return c.json({ error: "Invalid JSON file" }, 400);
  }
  if (!data.format_version || !data.match || !data.stages || !data.registrations) {
    return c.json({ error: "Invalid match export file: missing required fields" }, 400);
  }
  const matchId = data.match.id;
  const [existing] = await sql`SELECT id FROM matches WHERE id = ${matchId}`;
  if (existing) {
    return c.json({ error: "A match with this ID already exists", code: "MATCH_ID_CONFLICT" }, 409);
  }
  await sql.begin(async (tx) => {
    const shooters = /* @__PURE__ */ new Map();
    for (const reg of data.registrations) {
      if (reg.shooter && !shooters.has(reg.shooter.id)) {
        shooters.set(reg.shooter.id, reg.shooter);
      }
    }
    for (const [, shooter] of shooters) {
      await tx`INSERT INTO shooters (id, first_name, last_name, category, division, power_factor, region, email, winmss_member_id)
        VALUES (${shooter.id}, ${shooter.first_name}, ${shooter.last_name}, ${shooter.category}, ${shooter.division}, ${shooter.power_factor}, ${shooter.region || ""}, ${shooter.email || null}, ${shooter.winmss_member_id || null})
        ON CONFLICT (id) DO NOTHING`;
    }
    await tx`INSERT INTO matches (id, name, date, organization, firearm_type, match_level, is_current)
      VALUES (${data.match.id}, ${data.match.name}, ${data.match.date}, ${data.match.organization}, ${data.match.firearm_type}, ${data.match.match_level || null}, false)`;
    for (const stage of data.stages) {
      await tx`INSERT INTO stages (id, match_id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config)
        VALUES (${stage.id}, ${matchId}, ${stage.stage_number}, ${stage.name}, ${stage.scoring_type}, ${stage.paper_targets || 0}, ${stage.steel_targets || 0}, ${stage.no_shoot_targets || 0}, ${stage.npm_targets || 0}, ${stage.hits_per_paper || 2}, ${stage.min_rounds || 0}, ${stage.max_points || 0}, ${stage.par_time || null}, ${stage.briefing || null}, ${JSON.stringify(stage.config || {})})`;
    }
    for (const reg of data.registrations) {
      await tx`INSERT INTO match_registrations (id, match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
        VALUES (${reg.id}, ${matchId}, ${reg.shooter.id}, ${reg.squad || null}, ${reg.division_override || null}, ${reg.category_override || null}, ${reg.power_factor_override || null}, ${reg.is_dq || false}, ${reg.dq_reason || null})`;
    }
    for (const score of data.stage_scores) {
      await tx`INSERT INTO stage_scores (id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points, total_time, x_count, score_data)
        VALUES (${score.id}, ${matchId}, ${score.stage_id}, ${score.registration_id}, ${score.time || null}, ${score.extra_shot_count || 0}, ${score.extra_hit_count || 0}, ${score.stacking_count || 0}, ${score.overtime_shot_count || 0}, ${score.procedural_count || 0}, ${score.ftsa_count || 0}, ${score.is_dnf || false}, ${score.raw_points || 0}, ${score.penalty_points || 0}, ${score.net_points || 0}, ${score.hit_factor || 0}, ${score.stage_percent || 0}, ${score.stage_points || 0}, ${score.total_time || null}, ${score.x_count || 0}, ${JSON.stringify(score.score_data || {})})`;
    }
    for (const target of data.target_scores) {
      await tx`INSERT INTO target_scores (id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data)
        VALUES (${target.id}, ${target.stage_score_id}, ${target.target_index}, ${target.target_type}, ${target.alpha || 0}, ${target.charlie || 0}, ${target.delta || 0}, ${target.miss || 0}, ${target.no_shoot_hits || 0}, ${target.steel_hit || null}, ${JSON.stringify(target.target_data || {})})`;
    }
    for (const chrono of data.chrono_results) {
      await tx`INSERT INTO chrono_results (id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3, avg_velocity, calculated_pf, pf_passed)
        VALUES (${chrono.id}, ${chrono.stage_score_id}, ${chrono.bullet_weight}, ${chrono.velocity_1 || null}, ${chrono.velocity_2 || null}, ${chrono.velocity_3 || null}, ${chrono.avg_velocity}, ${chrono.calculated_pf}, ${chrono.pf_passed})`;
    }
  });
  await audit(c, "match.import", `matches:${matchId}`, {
    stages: data.stages.length,
    registrations: data.registrations.length,
    scores: data.stage_scores.length
  });
  return c.json({
    success: true,
    match_id: matchId,
    counts: {
      stages: data.stages.length,
      registrations: data.registrations.length,
      scores: data.stage_scores.length,
      targets: data.target_scores.length,
      chrono: data.chrono_results.length
    }
  });
});

// ../backend/src/app.ts
init_env();
var app = new Hono2();
app.use("*", corsMiddleware);
app.use("*", requestLogger);
app.use("*", securityHeaders);
app.onError(errorHandler2);
function getDomainMode(host, urlPath) {
  if (!host) return "admin";
  const hostname = host.split(":")[0].toLowerCase().trim();
  const normalizedPath = urlPath.toLowerCase();
  if (hostname === "vysledky.local" || normalizedPath.startsWith("/vysledky")) return "results";
  if (hostname === "hodnotenie.local" || normalizedPath.startsWith("/hodnotenie")) return "scoring";
  if (hostname === "squads.local" || normalizedPath.startsWith("/squads")) return "squads";
  return "admin";
}
app.use("*", async (c, next) => {
  const host = c.req.header("host");
  c.set("domainMode", getDomainMode(host, c.req.path));
  await next();
});
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/events", async (c) => {
  const matchId = c.req.query("matchId") || null;
  return streamSSE(c, async (stream2) => {
    eventBroadcaster.add(matchId, stream2);
    await stream2.writeSSE({
      event: "connected",
      data: JSON.stringify({ matchId, connectedAt: (/* @__PURE__ */ new Date()).toISOString() })
    });
    while (!stream2.aborted) {
      await stream2.sleep(3e4);
    }
  });
});
app.get("/api/lan-info", (c) => {
  const interfaces = os3.networkInterfaces();
  let lanIp = "";
  let fallbackIp = "";
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === "IPv4") {
        const addr = iface.address;
        const isContainer = name.startsWith("docker") || name.startsWith("br-") || name.startsWith("veth") || name.startsWith("vnic");
        if (!isContainer && !addr.startsWith("172.")) {
          lanIp = addr;
          break;
        }
        if (!fallbackIp) fallbackIp = addr;
      }
    }
    if (lanIp) break;
  }
  return c.json({ ip: lanIp || fallbackIp || "127.0.0.1", port: env.PORT });
});
app.route("/api/auth", authRoutes);
app.route("/api", resultsRoutes);
app.route("/api", uploadRoutes);
app.use("/api/matches", authMiddleware);
app.use("/api/matches", methodGuard(["admin"]));
app.route("/api/matches", matchRoutes);
app.use("/api/matches/:matchId/stages", authMiddleware);
app.use("/api/matches/:matchId/stages", methodGuard(["admin"]));
app.use("/api/stages", authMiddleware);
app.use("/api/stages", methodGuard(["admin"]));
app.route("/api", stageRoutes);
app.use("/api/shooters", authMiddleware);
app.use("/api/shooters", requireAdmin);
app.route("/api/shooters", shooterRoutes);
app.use("/api/matches/:matchId/registrations", authMiddleware);
app.use("/api/matches/:matchId/registrations", methodGuard(["admin"]));
app.use("/api/matches/:matchId/squads", authMiddleware);
app.route("/api", registrationRoutes);
app.use("/api/matches/:matchId/stages/:stageId/scores/*", authMiddleware);
app.use("/api/matches/:matchId/stages/:stageId/scores/*", stageAccessMiddleware);
app.use("/api/matches/:matchId/stages/:stageId/scores/*", scoreLockMiddleware);
app.use("/api/matches/:matchId/scoring-progress", authMiddleware);
app.use("/api/matches/:matchId/stages/:stageId/recalculate", authMiddleware);
app.use("/api/matches/:matchId/stages/:stageId/recalculate", requireAdmin);
app.use("/api/matches/:matchId/recalculate", authMiddleware);
app.use("/api/matches/:matchId/recalculate", requireAdmin);
app.route("/api", scoringRoutes);
app.use("/api/backup", authMiddleware);
app.use("/api/backup", requireAdmin);
app.use("/api/restore", authMiddleware);
app.use("/api/restore", requireAdmin);
app.route("/api", backupRoutes);
app.use("/api/import", authMiddleware);
app.use("/api/import", requireAdmin);
app.route("/api/import", importRoutes);
app.route("/api/import", winmssImportRoutes);
app.use("/api/matches/import", authMiddleware);
app.use("/api/matches/import", requireAdmin);
app.use("/api/matches/:id/export", authMiddleware);
app.use("/api/matches/:id/export", requireAdmin);
app.route("/api", matchExportRoutes);
app.get("/manifest.json", async (c) => {
  let mode = c.req.query("mode");
  if (!mode) {
    const referer = c.req.header("referer") || "";
    try {
      const refererUrl = new URL(referer);
      const refererPath = refererUrl.pathname.toLowerCase();
      const refererHost = refererUrl.hostname.toLowerCase();
      if (refererPath.startsWith("/vysledky") || refererHost === "vysledky.local") {
        mode = "results";
      } else if (refererPath.startsWith("/hodnotenie") || refererHost === "hodnotenie.local") {
        mode = "scoring";
      } else if (refererPath.startsWith("/squads") || refererHost === "squads.local") {
        mode = "squads";
      }
    } catch {
    }
  }
  const frontendDistPath = process.env.FRONTEND_DIST_PATH;
  let manifest = {
    name: "IPSC Score",
    short_name: "IPSC Score",
    start_url: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#1e293b",
    theme_color: "#1e293b",
    orientation: "any",
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/android-chrome-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/android-chrome-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/msapplication-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/mstile-150x150.png", sizes: "150x150", type: "image/png" }
    ]
  };
  if (frontendDistPath) {
    try {
      const manifestPath = path3.join(frontendDistPath, "manifest.json");
      const raw2 = fs5.readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(raw2);
    } catch (err) {
      console.error("[Manifest] Failed to read static manifest, using default:", err);
    }
  }
  if (mode === "results") {
    manifest.start_url = "/vysledky";
    manifest.id = "ipscscore-results";
  } else if (mode === "scoring") {
    manifest.start_url = "/hodnotenie";
    manifest.id = "ipscscore-scoring";
  } else if (mode === "squads") {
    manifest.start_url = "/squads";
    manifest.id = "ipscscore-squads";
  }
  return c.json(manifest);
});
function enableStaticServing(frontendDistPath) {
  console.log(`[Static] Setting up frontend serving from: ${frontendDistPath}`);
  if (!fs5.existsSync(frontendDistPath)) {
    console.error(`[Static] ERROR: Frontend dist path does not exist: ${frontendDistPath}`);
    return;
  }
  const indexPath = path3.join(frontendDistPath, "index.html");
  if (!fs5.existsSync(indexPath)) {
    console.error(`[Static] ERROR: index.html not found at: ${indexPath}`);
    return;
  }
  console.log(`[Static] Found index.html at: ${indexPath}`);
  app.use("*", async (c, next) => {
    const urlPath = c.req.path;
    if (urlPath.startsWith("/api/")) return next();
    if (urlPath !== "/" && urlPath.includes(".")) return next();
    try {
      let html = fs5.readFileSync(indexPath, "utf-8");
      const domainMode = c.get("domainMode");
      if (domainMode && domainMode !== "admin") {
        html = html.replace(
          "<head>",
          `<head><script>window.__DOMAIN_MODE__ = "${domainMode}";</script>`
        );
        const manifestHref = domainMode === "results" ? "/manifest.json?mode=results" : domainMode === "squads" ? "/manifest.json?mode=squads" : "/manifest.json?mode=scoring";
        html = html.replace(
          /<link[^>]*rel=["']manifest["'][^>]*>/i,
          `<link rel="manifest" href="${manifestHref}" />`
        );
      }
      return c.html(html);
    } catch (err) {
      console.error("[Static] Failed to serve index.html:", err);
      return c.text("Frontend not found", 500);
    }
  });
  app.use("/*", serveStatic({ root: frontendDistPath }));
}

// ../backend/src/index.ts
init_env();
init_client();

// ../backend/src/db/migrate.ts
init_client();
import { readFileSync, readdirSync } from "fs";
import { join as join3 } from "path";
async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const migrationsDir = process.env.MIGRATIONS_DIR || (() => {
    const dirName = typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;
    return join3(dirName, "migrations");
  })();
  let files;
  try {
    files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    console.log("No migrations directory found, skipping migrations.");
    return;
  }
  const applied = await sql`SELECT name FROM _migrations`;
  const appliedNames = new Set(applied.map((r) => r.name));
  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  Skipping already applied: ${file}`);
      continue;
    }
    console.log(`  Applying migration: ${file}`);
    const content = readFileSync(join3(migrationsDir, file), "utf-8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    if (file === "008_hash_passwords.sql") {
      await hashExistingPlainPasswords();
    }
    console.log(`  Applied: ${file}`);
  }
  console.log("Migrations complete.");
}
async function hashExistingPlainPasswords() {
  const stages = await sql`
    SELECT id, password FROM stages WHERE password IS NOT NULL AND password_hash IS NULL
  `;
  if (stages.length === 0) return;
  console.log(`  Hashing ${stages.length} plain-text stage password(s)...`);
  for (const stage of stages) {
    const hash3 = await bcryptjs_default.hash(stage.password, 10);
    await sql`
      UPDATE stages SET password_hash = ${hash3}, password = NULL WHERE id = ${stage.id}
    `;
  }
  console.log("  Stage password hashing complete.");
}

// ../backend/src/index.ts
async function main() {
  console.log("Running migrations...");
  await runMigrations();
  try {
    const { cleanupExpiredTokens: cleanupExpiredTokens2 } = await Promise.resolve().then(() => (init_stageLinkTokens(), stageLinkTokens_exports));
    const deleted = await cleanupExpiredTokens2();
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} expired stage link token(s).`);
    }
  } catch (err) {
    console.warn("[Startup] Token cleanup failed:", err.message);
  }
  const frontendDistPath = process.env.FRONTEND_DIST_PATH;
  if (frontendDistPath) {
    await enableStaticServing(frontendDistPath);
    console.log(`Serving frontend from ${frontendDistPath}`);
  }
  if (env.TLS_CERT_PATH && env.TLS_KEY_PATH) {
    const certExists = fs6.existsSync(env.TLS_CERT_PATH);
    const keyExists = fs6.existsSync(env.TLS_KEY_PATH);
    if (certExists && keyExists) {
      const cert = fs6.readFileSync(env.TLS_CERT_PATH);
      const key = fs6.readFileSync(env.TLS_KEY_PATH);
      serve(
        {
          fetch: app.fetch,
          port: env.PORT,
          hostname: env.BIND_ADDRESS,
          createServer: () => createServer({ cert, key })
        },
        (info) => {
          console.log(`Server running at https://${env.BIND_ADDRESS}:${info.port}`);
        }
      );
      return;
    } else {
      console.warn(`[TLS] Certificate files not found: ${env.TLS_CERT_PATH}, ${env.TLS_KEY_PATH}`);
      console.warn("[TLS] Falling back to HTTP");
    }
  }
  serve({ fetch: app.fetch, port: env.PORT, hostname: env.BIND_ADDRESS }, (info) => {
    console.log(`Server running at http://${env.BIND_ADDRESS}:${info.port}`);
  });
}
main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await closeDb();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await closeDb();
  process.exit(0);
});
//# sourceMappingURL=index.js.map
