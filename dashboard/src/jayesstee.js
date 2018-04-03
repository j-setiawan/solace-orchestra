function jst(selector) {
  let el = document.querySelector(selector);
  if (!el) {
    return new JstElement();
  }
  else {
    return new JstElement(el);
  }
};

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

    let wasDomified = this.isDomified;
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
  dom(opts) {

    let el = this.el || document.createElement(this.tag);

    if (!this.isDomified) {
      for (let attrName of Object.keys(this.attrs)) {
        el.setAttribute(attrName, this.attrs[attrName]);
      }
      for (let propName of this.props) {
        el[propName] = true;
      }
    }

    for (let item of this.contents) {
      if (!item.el && !item.value.el) {
        if (item.type === "jst") {
          el.appendChild(item.value.dom());
        }
        else if (item.type === "textnode") {
          item.el             = document.createElement("span");
          item.el.textContent = item.value;
          el.appendChild(item.el);
        }
        else {
          console.warn("Unexpected content type while dominating:", item.type);
        }
      }
    }

    this.el         = el;
    this.isDomified = true;
    return el;
    
  }

  delete() {

    // Remove all items associated with this JstElement
    for (let item of this.contents) {
      if (item.type === "jst") {
        item.value.delete();
      }
      else if (item.type === "textnode" && item.el && item.el.parentNode) {
        // Remove the span element
        item.el.parentNode.removeChild(item.el);
      }
      else {
        console.warn("Unexpected content type while deleting:", item.type);
      }
    }

    // Delete this element, if present
    if (this.el) {
      if (this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }

    this.el = undefined;
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
      console.error("Can't find requested stamp (", stampName, ") for reStamping");
    }

    let stamp = stampInfo.stamp;

    // Go through the contents and remove all the ones that are for this stamp
    let firstIndex = -1;
    let index = 0;
    let count = 0;
    for (let item of this.contents) {
      if (item.stampName && item.stampName === stampName) {
        if (item.type === "jst") {
          item.value.delete();
        }
        else if (item.type === "textnode" && item.el && item.el.parentNode) {
          // Remove the span element
          item.el.parentNode.removeChild(item.el);
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
  
  _processParams(params, stampName) {

    params = jst._flatten.apply(this, params);
    
    if (typeof params === "undefined") {
      params = [];
    }
    for (let param of params) {

      let type = typeof(param);

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
        this.contents.push({type: "jst", value: JstElement(param), stampName: stampName});
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
          else if (name === "cn") {
            this.attrs['class'] = param[name];
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


jst.fn = jst.prototype = {

};


// Shrunken version of jQuery's extend
jst.extend = jst.fn.extend = function() {

  let target = this;
  let length = arguments.length;
  
  for (let i = 0; i < length; i++) {

    let options;
    if ((options = arguments[i]) != null) {

      for (let name in options ) {

	let src  = target[ name ];
	let copy = options[ name ];

	// Prevent never-ending loop
	if ( target === copy ) {
	  continue;
	}

        if ( copy !== undefined ) {
	  target[ name ] = copy;
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
        newName = `name-${i}`;
        if (!this.stamps[newName]) {
          break;
        }
        i++;
      }
      console.warn("Naming conflict with stamp. Requested name:", name, " actual:", newName);
    }

    return this.stamps[newName] = new JstStamp(newName, template, theRest);
    
  },

  reStamp: function(stampName, template, ...params) {

    let stamp = this.stamps[stampName];
    if (!stamp) {
      console.error("Unknown stamp name:", stampName);
    }

    stamp.getParent().reStamp(stampName, template, params);
    
  },

  makeGlobal: function(prefix) {
    jst.global          = true;
    jst.globalTagPrefix = prefix || jst.tagPrefix;
    for (let tag of jst.tags) {
      let name = jst.globalTagPrefix + tag;
      let g = typeof global !== 'undefined' ? global : window;
      let self = this;
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

