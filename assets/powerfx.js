/*
 * A small Power Fx interpreter for the Canvas Apps playground.
 * It covers a practical subset: text, numbers, booleans, tables and records,
 * operators, control references, and common functions (If, Filter, Sort,
 * CountRows, Text, Set, Notify...).
 */
(function (root) {
  'use strict';

  function FxError(msg) { var e = new Error(msg); e.fx = true; return e; }

  /* ---------- Tokenizer ---------- */
  function tokenize(src) {
    var toks = [], i = 0, m;
    while (i < src.length) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '"') {
        var s = ''; i++;
        for (;;) {
          if (i >= src.length) throw FxError('Missing closing quote (").');
          if (src[i] === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue; } i++; break; }
          s += src[i++];
        }
        toks.push({ t: 'str', v: s }); continue;
      }
      if (c === "'") {
        var j = src.indexOf("'", i + 1);
        if (j < 0) throw FxError("Missing closing quote (').");
        toks.push({ t: 'id', v: src.slice(i + 1, j) }); i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i))[0];
        toks.push({ t: 'num', v: parseFloat(m) }); i += m.length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))[0];
        toks.push({ t: 'id', v: m }); i += m.length; continue;
      }
      var two = src.substr(i, 2);
      if (two === '<>' || two === '<=' || two === '>=' || two === '&&' || two === '||') { toks.push({ t: 'op', v: two }); i += 2; continue; }
      if ('&+-*/=<>(),;[]{}:.!'.indexOf(c) > -1) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw FxError('Unexpected character "' + c + '".');
    }
    toks.push({ t: 'eof', v: 'end of formula' });
    return toks;
  }

  /* ---------- Parser ---------- */
  var cache = new Map();
  function parse(src) {
    if (cache.has(src)) return cache.get(src);
    var toks = tokenize(src), p = 0;
    var peek = function () { return toks[p]; };
    var next = function () { return toks[p++]; };
    var isOp = function (v) { return peek().t === 'op' && peek().v === v; };
    var isKw = function (v) { return peek().t === 'id' && peek().v.toLowerCase() === v; };
    var expect = function (v) { if (!isOp(v)) throw FxError('Expected "' + v + '" but found "' + peek().v + '".'); p++; };

    function chain() {
      var list = [orE()];
      while (isOp(';')) { p++; if (peek().t === 'eof' || isOp(')')) break; list.push(orE()); }
      return list.length === 1 ? list[0] : { k: 'chain', list: list };
    }
    function orE() { var l = andE(); while (isOp('||') || isKw('or')) { p++; l = { k: 'bin', op: 'or', l: l, r: andE() }; } return l; }
    function andE() { var l = cmpE(); while (isOp('&&') || isKw('and')) { p++; l = { k: 'bin', op: 'and', l: l, r: cmpE() }; } return l; }
    function cmpE() {
      var l = catE();
      while (peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].indexOf(peek().v) > -1) { var op = next().v; l = { k: 'bin', op: op, l: l, r: catE() }; }
      return l;
    }
    function catE() { var l = addE(); while (isOp('&')) { p++; l = { k: 'bin', op: '&', l: l, r: addE() }; } return l; }
    function addE() { var l = mulE(); while (isOp('+') || isOp('-')) { var op = next().v; l = { k: 'bin', op: op, l: l, r: mulE() }; } return l; }
    function mulE() { var l = unE(); while (isOp('*') || isOp('/')) { var op = next().v; l = { k: 'bin', op: op, l: l, r: unE() }; } return l; }
    function unE() {
      if (isOp('-')) { p++; return { k: 'neg', e: unE() }; }
      if (isOp('!')) { p++; return { k: 'not', e: unE() }; }
      if (isKw('not') && !(toks[p + 1].t === 'op' && toks[p + 1].v === '(')) { p++; return { k: 'not', e: unE() }; }
      return postE();
    }
    function postE() {
      var e = prim();
      while (isOp('.')) {
        p++;
        var t = next();
        if (t.t !== 'id') throw FxError('Expected a property name after ".".');
        e = { k: 'mem', e: e, name: t.v };
      }
      return e;
    }
    function list(close) {
      var items = [];
      if (!isOp(close)) { do { items.push(chain()); } while (isOp(',') && ++p); }
      expect(close);
      return items;
    }
    function prim() {
      var t = next();
      if (t.t === 'num' || t.t === 'str') return { k: 'lit', v: t.v };
      if (t.t === 'id') {
        var low = t.v.toLowerCase();
        if (isOp('(')) { p++; return { k: 'call', name: t.v, args: list(')') }; }
        if (low === 'true') return { k: 'lit', v: true };
        if (low === 'false') return { k: 'lit', v: false };
        return { k: 'id', name: t.v };
      }
      if (t.t === 'op' && t.v === '(') { var e = chain(); expect(')'); return e; }
      if (t.t === 'op' && t.v === '[') return { k: 'table', items: list(']') };
      if (t.t === 'op' && t.v === '{') {
        var fields = [];
        if (!isOp('}')) {
          do {
            var key = next();
            if (key.t !== 'id') throw FxError('Expected a field name in the record.');
            expect(':');
            fields.push([key.v, orE()]);
          } while (isOp(',') && ++p);
        }
        expect('}');
        return { k: 'record', fields: fields };
      }
      if (t.t === 'eof') throw FxError('The formula is incomplete.');
      throw FxError('Unexpected "' + t.v + '".');
    }

    var ast = chain();
    if (peek().t !== 'eof') throw FxError('Unexpected "' + peek().v + '".');
    cache.set(src, ast);
    return ast;
  }

  /* ---------- Values ---------- */
  var ENUMS = {
    Color: { Black: '#000000', White: '#ffffff', Red: '#d13438', Green: '#107c10', Blue: '#0f6cbd', Orange: '#ca5010', Purple: '#742774', Gray: '#616161', Yellow: '#c19c00', Teal: '#038387', Pink: '#c239b3', Navy: '#1b3a6b', Transparent: 'transparent' },
    NotificationType: { Success: 'success', Error: 'error', Warning: 'warning', Information: 'information' },
    SortOrder: { Ascending: 'ascending', Descending: 'descending' }
  };

  function isBlank(v) { return v === null || v === undefined || v === ''; }
  function toNum(v) {
    if (isBlank(v)) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return +v;
    throw FxError('Expected a number but got ' + describe(v) + '.');
  }
  function toStr(v) {
    if (isBlank(v)) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (v instanceof Date) return v.toLocaleString();
    if (typeof v === 'number') return String(Math.round(v * 1e10) / 1e10);
    if (Array.isArray(v)) throw FxError('Expected text but got a table.');
    if (typeof v === 'object') throw FxError('Expected text but got a record.');
    return String(v);
  }
  function toBool(v) {
    if (typeof v === 'boolean') return v;
    if (isBlank(v)) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') { var l = v.toLowerCase(); if (l === 'true') return true; if (l === 'false') return false; }
    throw FxError('Expected true or false but got ' + describe(v) + '.');
  }
  function toTable(v) {
    if (Array.isArray(v)) return v;
    if (isBlank(v)) return [];
    throw FxError('Expected a table but got ' + describe(v) + '.');
  }
  function describe(v) {
    if (Array.isArray(v)) return 'a table';
    if (v instanceof Date) return 'a date';
    if (v && typeof v === 'object') return 'a record';
    if (typeof v === 'string') return '"' + v + '"';
    return String(v);
  }
  function equals(a, b) {
    if (isBlank(a) && isBlank(b)) return true;
    if (isBlank(a) || isBlank(b)) return false;
    if (typeof a === 'number' || typeof b === 'number' || a instanceof Date || b instanceof Date) return toNum(a) === toNum(b);
    if (typeof a === 'boolean' || typeof b === 'boolean') return toBool(a) === toBool(b);
    return toStr(a) === toStr(b);
  }
  function compare(a, b) {
    if (typeof a === 'string' && typeof b === 'string' && (isNaN(+a) || isNaN(+b) || a === '' || b === '')) return a < b ? -1 : a > b ? 1 : 0;
    var x = toNum(a), y = toNum(b);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  function asRecord(v) { return (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) ? v : { Value: v }; }

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad(n) { return String(n).padStart(2, '0'); }
  function formatDate(d, f) {
    var H = d.getHours(), h12 = H % 12 || 12, ampm = /am\/pm/i.test(f);
    var hours = ampm ? h12 : H;
    var s = f.replace(/(h{1,2}):mm/gi, function (_, h) { return (h.length === 2 ? pad(hours) : hours) + ':' + pad(d.getMinutes()); });
    return s.replace(/yyyy|yy|mmmm|mmm|mm|dddd|ddd|dd|ss|am\/pm/gi, function (tok) {
      switch (tok.toLowerCase()) {
        case 'yyyy': return d.getFullYear();
        case 'yy': return pad(d.getFullYear() % 100);
        case 'mmmm': return MONTHS[d.getMonth()];
        case 'mmm': return MONTHS[d.getMonth()].slice(0, 3);
        case 'mm': return pad(d.getMonth() + 1);
        case 'dddd': return DAYS[d.getDay()];
        case 'ddd': return DAYS[d.getDay()].slice(0, 3);
        case 'dd': return pad(d.getDate());
        case 'ss': return pad(d.getSeconds());
        default: return H < 12 ? 'AM' : 'PM';
      }
    });
  }
  function formatNumber(n, f) {
    var dec = (f.split('.')[1] || '').replace(/[^0#]/g, '').length;
    var prefix = (f.match(/^[^#0,.]*/) || [''])[0];
    var body = f.indexOf(',') > -1
      ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : n.toFixed(dec);
    return prefix + body;
  }

  /* ---------- Evaluator ---------- */
  function need(name, a, min, max) {
    if (a.length < min || a.length > max) {
      var exp = min === max ? min : (max === Infinity ? min + ' or more' : min + ' to ' + max);
      throw FxError('Invalid number of arguments for ' + name + ': received ' + a.length + ', expected ' + exp + '.');
    }
  }
  function scoped(c, rec) { var n = Object.create(c); n.scope = asRecord(rec); return n; }
  function behaviorOnly(name, c) {
    if (!c.behavior) throw FxError(name + ' can only be used in behavior properties, such as OnSelect.');
  }

  var F = {
    If: function (a, c) {
      need('If', a, 2, Infinity);
      for (var i = 0; i + 1 < a.length; i += 2) if (toBool(ev(a[i], c))) return ev(a[i + 1], c);
      return a.length % 2 ? ev(a[a.length - 1], c) : null;
    },
    Switch: function (a, c) {
      need('Switch', a, 3, Infinity);
      var v = ev(a[0], c);
      for (var i = 1; i + 1 < a.length; i += 2) if (equals(v, ev(a[i], c))) return ev(a[i + 1], c);
      return (a.length - 1) % 2 ? ev(a[a.length - 1], c) : null;
    },
    Not: function (a, c) { need('Not', a, 1, 1); return !toBool(ev(a[0], c)); },
    IsBlank: function (a, c) { need('IsBlank', a, 1, 1); var v = ev(a[0], c); return isBlank(v) || (Array.isArray(v) && !v.length); },
    IsEmpty: function (a, c) { need('IsEmpty', a, 1, 1); return toTable(ev(a[0], c)).length === 0; },
    Coalesce: function (a, c) { for (var i = 0; i < a.length; i++) { var v = ev(a[i], c); if (!isBlank(v)) return v; } return null; },
    Blank: function (a) { need('Blank', a, 0, 0); return null; },
    Upper: function (a, c) { need('Upper', a, 1, 1); return toStr(ev(a[0], c)).toUpperCase(); },
    Lower: function (a, c) { need('Lower', a, 1, 1); return toStr(ev(a[0], c)).toLowerCase(); },
    Proper: function (a, c) { need('Proper', a, 1, 1); return toStr(ev(a[0], c)).toLowerCase().replace(/(^|[^a-z])([a-z])/g, function (_, p1, p2) { return p1 + p2.toUpperCase(); }); },
    Trim: function (a, c) { need('Trim', a, 1, 1); return toStr(ev(a[0], c)).trim().replace(/\s+/g, ' '); },
    Len: function (a, c) { need('Len', a, 1, 1); return toStr(ev(a[0], c)).length; },
    Left: function (a, c) { need('Left', a, 2, 2); return toStr(ev(a[0], c)).slice(0, Math.max(0, toNum(ev(a[1], c)))); },
    Right: function (a, c) { need('Right', a, 2, 2); var s = toStr(ev(a[0], c)), n = toNum(ev(a[1], c)); return n <= 0 ? '' : s.slice(-n); },
    Mid: function (a, c) { need('Mid', a, 2, 3); var s = toStr(ev(a[0], c)), st = toNum(ev(a[1], c)) - 1; return a.length > 2 ? s.substr(st, toNum(ev(a[2], c))) : s.slice(st); },
    Substitute: function (a, c) { need('Substitute', a, 3, 3); return toStr(ev(a[0], c)).split(toStr(ev(a[1], c))).join(toStr(ev(a[2], c))); },
    Concatenate: function (a, c) { return a.map(function (x) { return toStr(ev(x, c)); }).join(''); },
    Value: function (a, c) { need('Value', a, 1, 1); var s = toStr(ev(a[0], c)).replace(/,/g, ''); return s === '' ? null : toNum(s); },
    Text: function (a, c) {
      need('Text', a, 1, 2);
      var v = ev(a[0], c);
      if (a.length === 1) return toStr(v);
      var f = toStr(ev(a[1], c));
      if (v instanceof Date) return formatDate(v, f);
      return formatNumber(toNum(v), f);
    },
    Round: function (a, c) { need('Round', a, 2, 2); var k = Math.pow(10, toNum(ev(a[1], c))); return Math.round(toNum(ev(a[0], c)) * k) / k; },
    Abs: function (a, c) { need('Abs', a, 1, 1); return Math.abs(toNum(ev(a[0], c))); },
    Sqrt: function (a, c) { need('Sqrt', a, 1, 1); return Math.sqrt(toNum(ev(a[0], c))); },
    Mod: function (a, c) { need('Mod', a, 2, 2); var x = toNum(ev(a[0], c)), y = toNum(ev(a[1], c)); return ((x % y) + y) % y; },
    Rand: function (a) { need('Rand', a, 0, 0); return Math.random(); },
    RandBetween: function (a, c) { need('RandBetween', a, 2, 2); var lo = Math.ceil(toNum(ev(a[0], c))), hi = Math.floor(toNum(ev(a[1], c))); return lo + Math.floor(Math.random() * (hi - lo + 1)); },
    Now: function (a) { need('Now', a, 0, 0); return new Date(); },
    Today: function (a) { need('Today', a, 0, 0); var d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    Year: function (a, c) { need('Year', a, 1, 1); var v = ev(a[0], c); return (v instanceof Date ? v : new Date(toStr(v))).getFullYear(); },
    CountRows: function (a, c) { need('CountRows', a, 1, 1); return toTable(ev(a[0], c)).length; },
    First: function (a, c) { need('First', a, 1, 1); var t = toTable(ev(a[0], c)); return t.length ? t[0] : null; },
    Last: function (a, c) { need('Last', a, 1, 1); var t = toTable(ev(a[0], c)); return t.length ? t[t.length - 1] : null; },
    FirstN: function (a, c) { need('FirstN', a, 1, 2); return toTable(ev(a[0], c)).slice(0, a.length > 1 ? toNum(ev(a[1], c)) : 1); },
    LastN: function (a, c) { need('LastN', a, 1, 2); var n = a.length > 1 ? toNum(ev(a[1], c)) : 1; return n <= 0 ? [] : toTable(ev(a[0], c)).slice(-n); },
    Filter: function (a, c) {
      need('Filter', a, 2, Infinity);
      return toTable(ev(a[0], c)).filter(function (row) {
        var s = scoped(c, row);
        for (var i = 1; i < a.length; i++) if (!toBool(ev(a[i], s))) return false;
        return true;
      });
    },
    LookUp: function (a, c) {
      need('LookUp', a, 2, 3);
      var t = toTable(ev(a[0], c));
      for (var i = 0; i < t.length; i++) {
        var s = scoped(c, t[i]);
        if (toBool(ev(a[1], s))) return a.length > 2 ? ev(a[2], s) : t[i];
      }
      return null;
    },
    Search: function (a, c) {
      need('Search', a, 3, Infinity);
      var t = toTable(ev(a[0], c)), q = toStr(ev(a[1], c)).toLowerCase();
      var cols = a.slice(2).map(function (x) { return x.k === 'id' ? x.name : toStr(ev(x, c)); });
      if (!q) return t;
      return t.filter(function (r) { return cols.some(function (col) { return toStr(asRecord(r)[col]).toLowerCase().indexOf(q) > -1; }); });
    },
    Sort: function (a, c) {
      need('Sort', a, 2, 3);
      var t = toTable(ev(a[0], c)).slice();
      var desc = a.length > 2 && toStr(ev(a[2], c)) === 'descending';
      var keyed = t.map(function (r) { return { r: r, k: ev(a[1], scoped(c, r)) }; });
      keyed.sort(function (x, y) { var d = compare(x.k, y.k); return desc ? -d : d; });
      return keyed.map(function (x) { return x.r; });
    },
    Concat: function (a, c) {
      need('Concat', a, 2, 3);
      var sep = a.length > 2 ? toStr(ev(a[2], c)) : '';
      return toTable(ev(a[0], c)).map(function (r) { return toStr(ev(a[1], scoped(c, r))); }).join(sep);
    },
    Sum: function (a, c) { return aggregate('Sum', a, c, function (xs) { return xs.reduce(function (s, x) { return s + x; }, 0); }); },
    Average: function (a, c) { return aggregate('Average', a, c, function (xs) { return xs.length ? xs.reduce(function (s, x) { return s + x; }, 0) / xs.length : 0; }); },
    Max: function (a, c) { return aggregate('Max', a, c, function (xs) { return xs.length ? Math.max.apply(null, xs) : null; }); },
    Min: function (a, c) { return aggregate('Min', a, c, function (xs) { return xs.length ? Math.min.apply(null, xs) : null; }); },
    RGBA: function (a, c) {
      need('RGBA', a, 4, 4);
      var v = a.map(function (x) { return toNum(ev(x, c)); });
      return 'rgba(' + v[0] + ', ' + v[1] + ', ' + v[2] + ', ' + v[3] + ')';
    },
    ColorValue: function (a, c) { need('ColorValue', a, 1, 1); return toStr(ev(a[0], c)); },
    Set: function (a, c) {
      behaviorOnly('Set', c); need('Set', a, 2, 2);
      if (a[0].k !== 'id') throw FxError('The first argument of Set must be a variable name.');
      c.setVar(a[0].name, ev(a[1], c));
      return true;
    },
    Notify: function (a, c) {
      behaviorOnly('Notify', c); need('Notify', a, 1, 3);
      c.notify(toStr(ev(a[0], c)), a.length > 1 ? toStr(ev(a[1], c)) : 'information');
      return true;
    }
  };
  var FN = {};
  Object.keys(F).forEach(function (k) { FN[k.toLowerCase()] = F[k]; });

  function aggregate(name, a, c, fn) {
    var v0 = a.length ? ev(a[0], c) : null;
    if (Array.isArray(v0)) {
      need(name, a, 2, 2);
      return fn(v0.map(function (r) { return toNum(ev(a[1], scoped(c, r))); }));
    }
    need(name, a, 1, Infinity);
    return fn([toNum(v0)].concat(a.slice(1).map(function (x) { return toNum(ev(x, c)); })));
  }

  function member(o, name) {
    if (o === null || o === undefined) return null;
    if (o.__fxControl) return o.get(name);
    if (typeof o !== 'object' || Array.isArray(o) || o instanceof Date) throw FxError('"' + name + '" isn\'t available on ' + describe(o) + '.');
    if (Object.prototype.hasOwnProperty.call(o, name)) return o[name];
    var lower = name.toLowerCase();
    for (var k in o) if (k.toLowerCase() === lower) return o[k];
    throw FxError('Name isn\'t valid. \'' + name + '\' isn\'t recognized.');
  }

  function ev(n, c) {
    if (++c.steps.n > 200000) throw FxError('The formula took too long to evaluate.');
    switch (n.k) {
      case 'lit': return n.v;
      case 'id': {
        var name = n.name;
        if (c.scope) {
          if (name === 'ThisRecord' || name === 'ThisItem') return c.scope;
          if (Object.prototype.hasOwnProperty.call(c.scope, name)) return c.scope[name];
        }
        if (ENUMS[name]) return ENUMS[name];
        var v = c.resolve(name);
        if (v === undefined) throw FxError('Name isn\'t valid. \'' + name + '\' isn\'t recognized.');
        return v;
      }
      case 'mem': return member(ev(n.e, c), n.name);
      case 'neg': return -toNum(ev(n.e, c));
      case 'not': return !toBool(ev(n.e, c));
      case 'chain': {
        if (!c.behavior) throw FxError('";" can only be used in behavior properties, such as OnSelect.');
        var r = null;
        n.list.forEach(function (x) { r = ev(x, c); });
        return r;
      }
      case 'table': return n.items.map(function (x) { return asRecord(ev(x, c)); });
      case 'record': {
        var rec = {};
        n.fields.forEach(function (f) { rec[f[0]] = ev(f[1], c); });
        return rec;
      }
      case 'call': {
        var fn = FN[n.name.toLowerCase()];
        if (!fn) throw FxError('\'' + n.name + '\' is an unknown or unsupported function.');
        return fn(n.args, c);
      }
      case 'bin': {
        if (n.op === 'and') return toBool(ev(n.l, c)) && toBool(ev(n.r, c));
        if (n.op === 'or') return toBool(ev(n.l, c)) || toBool(ev(n.r, c));
        var l = ev(n.l, c), rr = ev(n.r, c);
        switch (n.op) {
          case '&': return toStr(l) + toStr(rr);
          case '+': return toNum(l) + toNum(rr);
          case '-': return toNum(l) - toNum(rr);
          case '*': return toNum(l) * toNum(rr);
          case '/': { var d = toNum(rr); if (d === 0) throw FxError('Division by zero.'); return toNum(l) / d; }
          case '=': return equals(l, rr);
          case '<>': return !equals(l, rr);
          case '<': return compare(l, rr) < 0;
          case '>': return compare(l, rr) > 0;
          case '<=': return compare(l, rr) <= 0;
          case '>=': return compare(l, rr) >= 0;
        }
      }
    }
    throw FxError('Unsupported expression.');
  }

  /**
   * Evaluate a formula.
   * ctx: { resolve(name) -> value|undefined, behavior?: bool, setVar?(name, v), notify?(msg, type) }
   */
  function evaluate(src, ctx) {
    if (!String(src).trim()) return null;
    var ast = parse(String(src));
    var c = Object.create(ctx);
    c.steps = { n: 0 };
    c.scope = ctx.scope || null;
    return ev(ast, c);
  }

  function varsSetIn(src) {
    var out = [];
    try {
      (function walk(n) {
        if (!n || typeof n !== 'object') return;
        if (n.k === 'call' && n.name.toLowerCase() === 'set' && n.args[0] && n.args[0].k === 'id') out.push(n.args[0].name);
        Object.keys(n).forEach(function (k) { var v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); });
      })(parse(String(src)));
    } catch (e) { /* ignore parse errors here */ }
    return out;
  }

  root.PowerFx = { parse: parse, evaluate: evaluate, varsSetIn: varsSetIn, toStr: toStr, toNum: toNum, toBool: toBool, isBlank: isBlank, toTable: toTable };
})(typeof window !== 'undefined' ? window : globalThis);
