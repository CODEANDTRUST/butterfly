(function() {
  var Selection, _set_theme_href, _theme, alt, cancel, copy, ctrl, escape, histSize, linkify, maybePack, nextLeaf, packSize, previousLeaf, selection, tags, tid, walk,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  addEventListener('copy', copy = function(e) {
    var data, end, j, len, line, ref, sel;
    document.getElementsByTagName('body')[0].contentEditable = false;
    butterfly.bell("copied");
    e.clipboardData.clearData();
    sel = getSelection().toString().replace(/\u00A0/g, ' ').replace(/\u2007/g, ' ');
    data = '';
    ref = sel.split('\n');
    for (j = 0, len = ref.length; j < len; j++) {
      line = ref[j];
      if (line.slice(-1) === '\u23CE') {
        end = '';
        line = line.slice(0, -1);
      } else {
        end = '\n';
      }
      data += line.replace(/\s*$/, '') + end;
    }
    e.clipboardData.setData('text/plain', data.slice(0, -1));
    return e.preventDefault();
  });

  addEventListener('paste', function(e) {
    var data, send, size;
    document.getElementsByTagName('body')[0].contentEditable = false;
    butterfly.bell("pasted");
    data = e.clipboardData.getData('text/plain');
    data = data.replace(/\r\n/g, '\n').replace(/\n/g, '\r');
    size = 1024;
    send = function() {
      butterfly.send(data.substring(0, size));
      data = data.substring(size);
      if (data.length) {
        return setTimeout(send, 25);
      }
    };
    send();
    return e.preventDefault();
  });

  Terminal.on('change', function(line) {
    if (indexOf.call(line.classList, 'extended') >= 0) {
      return line.addEventListener('click', (function(line) {
        return function() {
          var after, before;
          if (indexOf.call(line.classList, 'expanded') >= 0) {
            return line.classList.remove('expanded');
          } else {
            before = line.getBoundingClientRect().height;
            line.classList.add('expanded');
            after = line.getBoundingClientRect().height;
            return document.body.scrollTop += after - before;
          }
        };
      })(line));
    }
  });

  walk = function(node, callback) {
    var child, j, len, ref, results;
    ref = node.childNodes;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      child = ref[j];
      callback.call(child);
      results.push(walk(child, callback));
    }
    return results;
  };

  linkify = function(text) {
    var emailAddressPattern, pseudoUrlPattern, urlPattern;
    urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
    pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
    return text.replace(urlPattern, '<a href="$&">$&</a>').replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>').replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
  };

  tags = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  };

  escape = function(s) {
    return s.replace(/[&<>]/g, function(tag) {
      return tags[tag] || tag;
    });
  };

  Terminal.on('change', function(line) {
    return walk(line, function() {
      var linkified, newNode, val;
      if (this.nodeType === 3) {
        val = this.nodeValue;
        linkified = linkify(escape(val));
        if (linkified !== val) {
          newNode = document.createElement('span');
          newNode.innerHTML = linkified;
          this.parentElement.replaceChild(newNode, this);
          return true;
        }
      }
    });
  });

  ctrl = false;

  alt = false;

  addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      return ctrl = true;
    } else if (e.touches.length === 3) {
      ctrl = false;
      return alt = true;
    } else if (e.touches.length === 4) {
      ctrl = true;
      return alt = true;
    }
  });

  window.mobileKeydown = function(e) {
    var _altKey, _ctrlKey, _keyCode;
    if (ctrl || alt) {
      _ctrlKey = ctrl;
      _altKey = alt;
      _keyCode = e.keyCode;
      if (e.keyCode >= 97 && e.keyCode <= 122) {
        _keyCode -= 32;
      }
      e = new KeyboardEvent('keydown', {
        ctrlKey: _ctrlKey,
        altKey: _altKey,
        keyCode: _keyCode
      });
      ctrl = alt = false;
      setTimeout(function() {
        return window.dispatchEvent(e);
      }, 0);
      return true;
    } else {
      return false;
    }
  };

  tid = null;

  packSize = 1000;

  histSize = 100;

  maybePack = function() {
    var hist, i, j, pack, packfrag, ref;
    if (!(butterfly.term.childElementCount > packSize + butterfly.rows)) {
      return;
    }
    hist = document.getElementById('packed');
    packfrag = document.createDocumentFragment('fragment');
    for (i = j = 0, ref = packSize; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      packfrag.appendChild(butterfly.term.firstChild);
    }
    pack = document.createElement('div');
    pack.classList.add('pack');
    pack.appendChild(packfrag);
    hist.appendChild(pack);
    if (hist.childElementCount > histSize) {
      hist.firstChild.remove();
    }
    return tid = setTimeout(maybePack);
  };

  Terminal.on('refresh', function() {
    if (tid) {
      clearTimeout(tid);
    }
    return maybePack();
  });

  Terminal.on('clear', function() {
    var hist, newHist;
    newHist = document.createElement('div');
    newHist.id = 'packed';
    hist = document.getElementById('packed');
    return butterfly.body.replaceChild(newHist, hist);
  });

  selection = null;

  cancel = function(ev) {
    if (ev.preventDefault) {
      ev.preventDefault();
    }
    if (ev.stopPropagation) {
      ev.stopPropagation();
    }
    ev.cancelBubble = true;
    return false;
  };

  previousLeaf = function(node) {
    var previous;
    previous = node.previousSibling;
    if (!previous) {
      previous = node.parentNode.previousSibling;
    }
    if (!previous) {
      previous = node.parentNode.parentNode.previousSibling;
    }
    while (previous.lastChild) {
      previous = previous.lastChild;
    }
    return previous;
  };

  nextLeaf = function(node) {
    var next;
    next = node.nextSibling;
    if (!next) {
      next = node.parentNode.nextSibling;
    }
    if (!next) {
      next = node.parentNode.parentNode.nextSibling;
    }
    while (next != null ? next.firstChild : void 0) {
      next = next.firstChild;
    }
    return next;
  };

  Selection = (function() {
    function Selection() {
      butterfly.body.classList.add('selection');
      this.selection = getSelection();
    }

    Selection.prototype.reset = function() {
      var fakeRange, ref, results;
      this.selection = getSelection();
      fakeRange = document.createRange();
      fakeRange.setStart(this.selection.anchorNode, this.selection.anchorOffset);
      fakeRange.setEnd(this.selection.focusNode, this.selection.focusOffset);
      this.start = {
        node: this.selection.anchorNode,
        offset: this.selection.anchorOffset
      };
      this.end = {
        node: this.selection.focusNode,
        offset: this.selection.focusOffset
      };
      if (fakeRange.collapsed) {
        ref = [this.end, this.start], this.start = ref[0], this.end = ref[1];
      }
      this.startLine = this.start.node;
      while (!this.startLine.classList || indexOf.call(this.startLine.classList, 'line') < 0) {
        this.startLine = this.startLine.parentNode;
      }
      this.endLine = this.end.node;
      results = [];
      while (!this.endLine.classList || indexOf.call(this.endLine.classList, 'line') < 0) {
        results.push(this.endLine = this.endLine.parentNode);
      }
      return results;
    };

    Selection.prototype.clear = function() {
      return this.selection.removeAllRanges();
    };

    Selection.prototype.destroy = function() {
      butterfly.body.classList.remove('selection');
      return this.clear();
    };

    Selection.prototype.text = function() {
      return this.selection.toString().replace(/\u00A0/g, ' ').replace(/\u2007/g, ' ');
    };

    Selection.prototype.up = function() {
      return this.go(-1);
    };

    Selection.prototype.down = function() {
      return this.go(+1);
    };

    Selection.prototype.go = function(n) {
      var index;
      index = Array.prototype.indexOf.call(butterfly.term.childNodes, this.startLine) + n;
      if (!((0 <= index && index < butterfly.term.childElementCount))) {
        return;
      }
      while (!butterfly.term.childNodes[index].textContent.match(/\S/)) {
        index += n;
        if (!((0 <= index && index < butterfly.term.childElementCount))) {
          return;
        }
      }
      return this.selectLine(index);
    };

    Selection.prototype.apply = function() {
      var range;
      this.clear();
      range = document.createRange();
      range.setStart(this.start.node, this.start.offset);
      range.setEnd(this.end.node, this.end.offset);
      return this.selection.addRange(range);
    };

    Selection.prototype.selectLine = function(index) {
      var line, lineEnd, lineStart;
      line = butterfly.term.childNodes[index];
      lineStart = {
        node: line.firstChild,
        offset: 0
      };
      lineEnd = {
        node: line.lastChild,
        offset: line.lastChild.textContent.length
      };
      this.start = this.walk(lineStart, /\S/);
      return this.end = this.walk(lineEnd, /\S/, true);
    };

    Selection.prototype.collapsed = function(start, end) {
      var fakeRange;
      fakeRange = document.createRange();
      fakeRange.setStart(start.node, start.offset);
      fakeRange.setEnd(end.node, end.offset);
      return fakeRange.collapsed;
    };

    Selection.prototype.shrinkRight = function() {
      var end, node;
      node = this.walk(this.end, /\s/, true);
      end = this.walk(node, /\S/, true);
      if (!this.collapsed(this.start, end)) {
        return this.end = end;
      }
    };

    Selection.prototype.shrinkLeft = function() {
      var node, start;
      node = this.walk(this.start, /\s/);
      start = this.walk(node, /\S/);
      if (!this.collapsed(start, this.end)) {
        return this.start = start;
      }
    };

    Selection.prototype.expandRight = function() {
      var node;
      node = this.walk(this.end, /\S/);
      return this.end = this.walk(node, /\s/);
    };

    Selection.prototype.expandLeft = function() {
      var node;
      node = this.walk(this.start, /\S/, true);
      return this.start = this.walk(node, /\s/, true);
    };

    Selection.prototype.walk = function(needle, til, backward) {
      var i, node, text;
      if (backward == null) {
        backward = false;
      }
      if (needle.node.firstChild) {
        node = needle.node.firstChild;
      } else {
        node = needle.node;
      }
      text = node != null ? node.textContent : void 0;
      i = needle.offset;
      if (backward) {
        while (node) {
          while (i > 0) {
            if (text[--i].match(til)) {
              return {
                node: node,
                offset: i + 1
              };
            }
          }
          node = previousLeaf(node);
          text = node != null ? node.textContent : void 0;
          i = text.length;
        }
      } else {
        while (node) {
          while (i < text.length) {
            if (text[i++].match(til)) {
              return {
                node: node,
                offset: i - 1
              };
            }
          }
          node = nextLeaf(node);
          text = node != null ? node.textContent : void 0;
          i = 0;
        }
      }
      return needle;
    };

    return Selection;

  })();

  document.addEventListener('keydown', function(e) {
    var r, ref, ref1;
    if (ref = e.keyCode, indexOf.call([16, 17, 18, 19], ref) >= 0) {
      return true;
    }
    if (e.shiftKey && e.keyCode === 13 && !selection && !getSelection().isCollapsed) {
      butterfly.send(getSelection().toString());
      getSelection().removeAllRanges();
      return cancel(e);
    }
    if (selection) {
      selection.reset();
      if (!e.ctrlKey && e.shiftKey && (37 <= (ref1 = e.keyCode) && ref1 <= 40)) {
        return true;
      }
      if (e.shiftKey && e.ctrlKey) {
        if (e.keyCode === 38) {
          selection.up();
        } else if (e.keyCode === 40) {
          selection.down();
        }
      } else if (e.keyCode === 39) {
        selection.shrinkLeft();
      } else if (e.keyCode === 38) {
        selection.expandLeft();
      } else if (e.keyCode === 37) {
        selection.shrinkRight();
      } else if (e.keyCode === 40) {
        selection.expandRight();
      } else {
        return cancel(e);
      }
      if (selection != null) {
        selection.apply();
      }
      return cancel(e);
    }
    if (!selection && e.ctrlKey && e.shiftKey && e.keyCode === 38) {
      r = Math.max(butterfly.term.childElementCount - butterfly.rows, 0);
      selection = new Selection();
      selection.selectLine(r + butterfly.y - 1);
      selection.apply();
      return cancel(e);
    }
    return true;
  });

  document.addEventListener('keyup', function(e) {
    var ref, ref1;
    if (ref = e.keyCode, indexOf.call([16, 17, 18, 19], ref) >= 0) {
      return true;
    }
    if (selection) {
      if (e.keyCode === 13) {
        butterfly.send(selection.text());
        selection.destroy();
        selection = null;
        return cancel(e);
      }
      if (ref1 = e.keyCode, indexOf.call([37, 38, 39, 40], ref1) < 0) {
        selection.destroy();
        selection = null;
        return true;
      }
    }
    return true;
  });

  document.addEventListener('dblclick', function(e) {
    var anchorNode, anchorOffset, newRange, range, sel;
    if (e.ctrlKey || e.altkey) {
      return;
    }
    sel = getSelection();
    if (sel.isCollapsed || sel.toString().match(/\s/)) {
      return;
    }
    range = document.createRange();
    range.setStart(sel.anchorNode, sel.anchorOffset);
    range.setEnd(sel.focusNode, sel.focusOffset);
    if (range.collapsed) {
      sel.removeAllRanges();
      newRange = document.createRange();
      newRange.setStart(sel.focusNode, sel.focusOffset);
      newRange.setEnd(sel.anchorNode, sel.anchorOffset);
      sel.addRange(newRange);
    }
    while (!(sel.toString().match(/\s/) || !sel.toString())) {
      sel.modify('extend', 'forward', 'character');
    }
    sel.modify('extend', 'backward', 'character');
    anchorNode = sel.anchorNode;
    anchorOffset = sel.anchorOffset;
    sel.collapseToEnd();
    sel.extend(anchorNode, anchorOffset);
    while (!(sel.toString().match(/\s/) || !sel.toString())) {
      sel.modify('extend', 'backward', 'character');
    }
    return sel.modify('extend', 'forward', 'character');
  });

  _set_theme_href = function(href) {
    var img;
    document.getElementById('style').setAttribute('href', href);
    img = document.createElement('img');
    img.onerror = function() {
      return setTimeout((function() {
        return typeof butterfly !== "undefined" && butterfly !== null ? butterfly.resize() : void 0;
      }), 250);
    };
    return img.src = href;
  };

  _theme = typeof localStorage !== "undefined" && localStorage !== null ? localStorage.getItem('theme') : void 0;

  if (_theme) {
    _set_theme_href(_theme);
  } else {
    _theme = "/theme/built-in-dataprotocol/style.css";
    _set_theme_href(_theme);
  }

  this.set_theme = function(theme) {
    _theme = theme;
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      localStorage.setItem('theme', theme);
    }
    if (theme) {
      return _set_theme_href(theme);
    }
  };

}).call(this);

//# sourceMappingURL=ext.js.map
