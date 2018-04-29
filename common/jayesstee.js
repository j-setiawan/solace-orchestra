function jst(selector) {
  let el = document.querySelector(selector);
  if (!el) {
    return new JstElement();
  }
  else {
    return new JstElement(el);
  }
}

export default jst;


// JstElement Class
//
// This class represents an HTML element. On creation
// it is just a scaffold that can be either inserted into
// the DOM (in a browser) or serialized into HTML.
class JstElement {
  constructor(tag, params) {
    this.tag      = tag;
    this.contents = [];
    this.attrs    = {};
    this.props    = [];
    this.events   = {};
    this.stamps   = {};

    if (tag instanceof HTMLElement) {
      // Wrapping an element with a JstElement
      this.tag = tag.tagName.toLowerCase();
      this.el  = tag;
    }

    this._processParams(params);

    if (this.el) {
      // If we have a real element, put all the content into it
      this.dom();
    }
  }

  appendChild() {
    this.isDomified = false;

    this._processParams(arguments);
    if (this.el) {
      this.dom();
    }
  }

  replaceChild() {
    if (this.el) {
      this.el.innerHTML = "";
    }

    this.isDomified = false;
    this.contents   = [];
    this.atts       = [];
    this.props      = [];

    this.appendChild.apply(this, arguments);
  }

  // Return HTML
  html(opts) {
    let html = "";

    if (!opts)       { opts = {}; }
    if (!opts.depth) { opts.depth = 0; }
    if (opts.indent) { html += " ".repeat(opts.indent * opts.depth++); }

    html += "<" + this.tag;

    let attrs = [];
    for (let attrName of Object.keys(this.attrs)) {
      attrs.push(attrName + "=" + "\"" + this._quoteAttrValue(this.attrs[attrName]) + "\"");
    }
    if (attrs.length) {
      html += " " + attrs.join(" ");
    }
    if (this.props.length) {
      html += " " + this.props.join(" ");
    }

    html += ">";

    if (opts.indent) {
      html += "\n";
    }

    for (let item of this.contents) {
      if (item.type === "jst") {
        html += item.value.html(opts);
      }
      else if (item.type === "HTMLElement") {
        html += item.value.innerHTML;
      }
      else if (item.type === "textnode") {
        if (opts.indent && opts.depth) {
          html += " ".repeat(opts.indent * opts.depth);
        }
        html += item.value;
        if (opts.indent && opts.depth) {
          html += "\n";
        }
      }
      else {
        console.log("Unexpected content type while serializing:", item.type);
      }
    }

    if (opts.indent && opts.depth) {
      opts.depth--;
      html += " ".repeat(opts.indent * opts.depth);
    }

    html += `</${this.tag}>`;
    if (opts.indent) {
      html += "\n";
    }
    return html;
  }

  // Return an HTMLElement
  dom() {
    let el = this.el || document.createElement(this.tag);

    if (!this.isDomified) {
      for (let attrName of Object.keys(this.attrs)) {
        el.setAttribute(attrName, this.attrs[attrName]);
      }
      for (let propName of this.props) {
        el[propName] = true;
      }
      for (let event of Object.keys(this.events)) {
        // TODO: Add support for options - note that this will require
        //       some detection of options support in the browser...
        el.addEventListener(event, this.events[event].listener);
      }
    }

    for (let item of this.contents) {
      if (item.type === "jst") {
        let hasEl   = item.value.el;
        let childEl = item.value.dom();
        if (!hasEl) {
          el.appendChild(childEl);
        }
      }
      else if (item.type === "textnode") {
        if (!item.el) {
          item.el             = document.createElement("span");
          item.el.textContent = item.value;
          el.appendChild(item.el);
        }
      }
      else {
        console.warn("Unexpected content type while dominating:", item.type);
      }
    }

    this.el         = el;
    this.isDomified = true;
    return el;
  }

  delete() {
    // Remove all items associated with this JstElement
    for (let item of this.contents) {
      this._deleteItem(item);
    }

    for (let stampName of Object.keys(this.stamps)) {
      jst.deleteStamp(stampName);
    }

    // Delete this element, if present
    if (this.el) {
      if (this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }

    delete this.el;

    this.tag      = "-deleted-";
    this.contents = [];
    this.attrs    = {};
    this.props    = [];
    this.stamps   = {};
  }

  reStamp(stampName, template, params) {
    // Reinsert the stamp - this requires removing the old one too
    let stampInfo = this.stamps[stampName];

    if (!stampInfo) {
      throw new Error("Can't find requested stamp (" + stampName + ") for reStamping");
    }

    let stamp = stampInfo.stamp;

    // Go through the contents and remove all the ones that are for this stamp
    let firstIndex = -1;
    let index      = 0;
    let count      = 0;
    for (let item of this.contents) {
      if (item.stampName && item.stampName === stampName) {
        if (item.type === "jst") {
          item.value.delete();
        }
        else if (item.type === "textnode") {
          if (item.el && item.el.parentNode) {
            // Remove the span element
            item.el.parentNode.removeChild(item.el);
          }
        }
        else {
          console.warn("Unexpected content type while deleting:", item.type);
        }
        firstIndex = firstIndex < 0 ? firstIndex = index : firstIndex;
        count++;
      }
      index++;
    }

    this.contents = this.contents.slice(firstIndex, count);

    // Re-add the stamp
    if (params && params.length > 0) {
      stamp.setParams(params);
    }

    if (template) {
      stamp.setTemplate(template);
    }

    let trailingContents = this.contents.slice(firstIndex);

    if (firstIndex) {
      this.contents = this.contents.slice(0, firstIndex);
    }
    else {
      this.contents = [];
    }

    let items = stamp.getTemplate().apply(this, stamp.getParams());
    this._processParams([items], stamp.getName());

    // Now re-add the trailing contents
    this.contents.concat(trailingContents);

    // If we were already domified, then redo it for the new elements
    if (this.isDomified) {
      this.dom();
    }
  }

  update(stampName, params) {
    let stampInfo = this.stamps[stampName];

    if (!stampInfo) {
      throw new Error("Can't find requested stamp (" + stampName + ") for reStamping");
    }

    let stamp = stampInfo.stamp;

    if (params && params.length > 0) {
      stamp.setParams(params);
    }

    // Create a new JST tree that will be compared against the existing one
    let items = stamp.getTemplate().apply(this, stamp.getParams());

    // newJst will contain the new stamped tree
    let newJst = new JstElement("div");
    newJst._processParams([items], stamp.getName());

    this._compareAndCopy(newJst, true, stamp.getName());

    // If we were already domified, then redo it for the new elements
    if (this.isDomified) {
      this.dom();
    }
  }

  // Returns true if upper layer needs to copy new Jst. False otherwise
  _compareAndCopy(newJst, topNode, stampName) {
    let oldIndex = 0;
    let newIndex = 0;

    // First check the attributes, props and events
    // But only if we aren't the topNode
    if (!topNode) {
      if (this.tag !== newJst.tag) {
        return true;
      }

      // Just fix all the attributes inline
      for (let attrName of Object.keys(this.attrs)) {
        if (!newJst.attrs[attrName]) {
          delete this.attrs[attrName];
          if (this.isDomified) {
            this.el.removeAttribute(attrName);
          }
        }
        else if (newJst.attrs[attrName] !== this.attrs[attrName]) {
          this.attrs[attrName] = newJst.attrs[attrName];
          if (this.isDomified) {
            this.el.setAttribute(attrName, newJst.attrs[attrName]);
          }
        }
      }
      for (let attrName of Object.keys(newJst.attrs)) {
        if (!this.attrs[attrName]) {
          this.attrs[attrName] = newJst.attrs[attrName];
          if (this.isDomified) {
            this.el.setAttribute(attrName, newJst.attrs[attrName]);
          }
        }
      }

      if (this.props.length || newJst.props.length) {
        let fixProps = false;
        
        // Just compare them in order - if they happen to be the same,
        // but in a different order, we will do a bit more work than necessary
        // but it should be very unlikely that that would happen
        if (this.props.length != newJst.props.length) {
          fixProps = true;
        }
        else {
          for (let i = 0; i < this.props.length; i++) {
            if (this.props[i] !== newJst.props[i]) {
              fixProps = true;
              break;
            }
          }
        }
        
        if (fixProps) {
          if (this.isDomified) {
            for (let prop of this.props) {
              delete this.el[prop];
            }
            for (let prop of newJst.props) {
              this.el[prop] = true;
            }
          }
          this.props = newJst.props;
        }
      }
      
      // Fix all the events
      for (let eventName of Object.keys(this.events)) {
        if (!newJst.events[eventName]) {
          delete this.events[eventName];
          if (this.isDomified) {
            this.el.removeEventListener(eventName, this.events[eventName].listener);
          }
        }
        else if (newJst.events[eventName].listener !== this.events[eventName].listener) {
          if (this.isDomified) {
            this.el.removeEventListener(eventName, this.events[eventName].listener);
            this.el.addEventListener(eventName, newJst.events[eventName].listener);
          }
          this.events[eventName] = newJst.events[eventName];
        }
      }
      for (let eventName of Object.keys(newJst.events)) {
        if (!this.events[eventName]) {
          this.events[eventName] = newJst.events[eventName];
          if (this.isDomified) {
            this.el.addEventListener(eventName, newJst.events[eventName].listener);
          }
        }
      }
    }
    
    while (true) {
      let oldItem = this.contents[oldIndex];
      let newItem = newJst.contents[newIndex];

      if (!oldItem || !newItem) {
        break;
      }

      if (stampName && oldItem.stampName !== stampName) {
        oldIndex++;
        continue;
      }

      if (oldItem.type !== newItem.type) {
        break;
      }

      if (oldItem.type === "jst") {
        // If the tags are the same, then we must descend and compare
        let doReplace = oldItem.value._compareAndCopy(newItem.value, false);
        if (doReplace) {
          break;
        }
      }
      else if (oldItem.type === "textnode" && oldItem.value !== newItem.value) {
        if (oldItem.el) {
          oldItem.el.textContent = newItem.value;
        }
        oldItem.value = newItem.value;
      }

      oldIndex++;
      newIndex++;
    }

    // Need to copy stuff - first delete all the old contents
    let oldStartIndex = oldIndex;
    let oldItem       = this.contents[oldIndex];

    while (oldItem) {
      if (stampName && oldItem.stampName !== stampName) {
        break;
      }
      this._deleteItem(oldItem);
      oldIndex++;
      oldItem = this.contents[oldIndex];
    }

    this.contents.splice(oldStartIndex, oldIndex - oldStartIndex);

    if (newJst.contents[newIndex]) {
      // Remove the old stuff and insert the new
      let newItems = newJst.contents.splice(newIndex, newJst.contents.length - newIndex);
      this.contents.splice(oldStartIndex, 0, ...newItems);
    }

    return false;
    
  }

  _deleteItem(contentsItem) {
    if (contentsItem.type === "jst") {
      contentsItem.value.delete();
    }
    else if (contentsItem.type === "textnode") {
      if (contentsItem.el && contentsItem.el.parentNode) {
        // Remove the span element
        contentsItem.el.parentNode.removeChild(contentsItem.el);
        delete contentsItem.el;
      }
    }
    else {
      console.warn("Unexpected content type while deleting:", contentsItem.type);
    }
  }

  _processParams(params, stampName) {
    params = jst._flatten.apply(this, params);

    if (typeof params === "undefined") {
      params = [];
    }
    for (let param of params) {
      let type = typeof param;

      if (type === "number" || type === "string") {
        this.contents.push({type: "textnode", value: param, stampName: stampName});
      }
      else if (param instanceof JstElement) {
        this.contents.push({type: "jst", value: param, stampName: stampName});
      }
      else if (param instanceof JstStamp) {
        let stamp = param;
        this.stamps[param.getName()] = {
          stamp: stamp,
          index: this.contents.length
        };
        stamp.setParent(this);
        let items = stamp.getTemplate().apply(this, stamp.getParams());
        this._processParams([items], stamp.getName());
      }
      else if (typeof HTMLElement !== 'undefined' && param instanceof HTMLElement) {
        this.contents.push({type: "jst", value: new JstElement(param), stampName: stampName});
      }
      else if (type === "object") {
        for (let name of Object.keys(param)) {
          if (typeof(param[name]) === "undefined") {
            param[name] = "";
          }
          if (name === "properties" && param.properties instanceof Array) {
            for (let prop of param.properties) {
              this.props.push(prop);
            }
          }
          else if (name === "events" && typeof param.events === "object") {
            for (let event of Object.keys(param.events)) {
              if (param.events[event] instanceof Function) {
                this.events[event] = {listener: param.events[event]};
              }
              else {
                this.events[event] = param.events[event];
              }
            }
          }
          else if (name === "cn") {
            // A bit of magic for the "class" attribute: cn -> class
            // We also will append to the class if there already is one
            if (this.attrs['class']) {
              this.attrs['class'] += " " + param[name];
            }
            else {
              this.attrs['class'] = param[name];
            }
          }
          else {
            this.attrs[name] = param[name];
          }
        }
      }
      else if (type === "undefined") {
        // skip
      }
      else {
        console.log("Unknown JstElement parameter type: ", type);
      }
    }
  }


  // Some helpers
  _quoteAttrValue(value) {
    return value.replace(/"/, '\"');
  }

}

// JstStamp Class
//
// Container for stamped templates
//
class JstStamp {
  constructor(name, template, params) {
    this.name     = name;
    this.template = template;
    this.params   = params;
    return this;
  }

  getName() {
    return this.name;
  }

  getTemplate(){
    return this.template;
  }
  setTemplate(template){
    this.template = template;
  }

  getParams() {
    return this.params;
  }
  setParams(params) {
    this.params = params;
  }

  getParent() {
    return this.parent;
  }
  setParent(parent) {
    this.parent = parent;
  }
}


jst.fn = jst.prototype = {};


// Shrunken version of jQuery's extend
jst.extend = jst.fn.extend = function() {
  let target = this;
  let length = arguments.length;

  for (let i = 0; i < length; i++) {
    let options;
    if ((options = arguments[i]) !== null) {
      for (let name in options) {
        let copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }

  // Return the modified object
  return target;
};


jst.extend({
  tagPrefix: "$",
  tags: [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
    'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
    'cite', 'code', 'col', 'colgroup', 'command', 'data', 'datalist', 'dd',
    'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
    'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input',
    'ins', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'math',
    'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option',
    'output', 'p', 'param', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's',
    'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong',
    'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'textarea',
    'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var',
    'video', 'wbr'
  ],
  stamps: {},

  addCustomElements: function() {
    let names = jst._flatten.apply(this, arguments);

    for (let name of names) {
      let fullName = jst.tagPrefix + name;
      jst[fullName] = function() {
        let args = jst._flatten.apply(this, arguments);
        return (new JstElement(name, args));
      };
    }
  },


  init: function() {
    jst.addCustomElements(jst.tags);
  },

  stamp: function() {
    let name     = arguments[0];
    let template = arguments[1];
    let theRest  = (Array.from(arguments)).slice(2);

    let newName = name;
    if (this.stamps[name]) {
      let i = 0;
      while (true) {
        newName = `${name}-${i}`;
        if (!this.stamps[newName]) {
          break;
        }
        i++;
      }
      console.warn("Naming conflict with stamp. Requested name:", name, " actual:", newName);
    }

    this.stamps[newName] = new JstStamp(newName, template, theRest);

    return this.stamps[newName];
  },

  reStamp: function(stampName, template, ...params) {
    let stamp = this.stamps[stampName];
    if (!stamp) {
      throw new Error("Unknown stamp name: " + stampName);
    }
    stamp.getParent().reStamp(stampName, template, params);
  },

  update: function(stampName, ...params) {
    let stamp = this.stamps[stampName];
    if (!stamp) {
      throw new Error("Unknown stamp name: " + stampName);
    }
    stamp.getParent().update(stampName, params);
  },

  deleteStamp: function(stampName) {
    delete this.stamps[stampName];
  },

  makeGlobal: function(prefix) {
    jst.global          = true;
    jst.globalTagPrefix = prefix || jst.tagPrefix;
    for (let tag of jst.tags) {
      let name = jst.globalTagPrefix + tag;
      let g = typeof global !== 'undefined' ? global : window;
      g[name] = function() {
        return jst[name].apply(this, arguments);
      };
    }
  },

  _flatten: function() {
    var flat = [];
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Array) {
        flat.push.apply(flat, jst._flatten.apply(this, arguments[i]));
      }
      else if (arguments[i] instanceof Function) {
        let result = arguments[i]();
        if (result instanceof Array) {
          flat.push.apply(flat, jst._flatten.apply(this, result));
        }
        else {
          flat.push(result);
        }
      }
      else {
        flat.push(arguments[i]);
      }
    }
    return flat;
  }

});

jst.init();

