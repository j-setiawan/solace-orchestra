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

class JstElement {
  constructor(tag, params) {
    this.tag      = tag;
    this.contents = [];
    this.attrs    = {};
    this.props    = [];

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
    console.log("Appending:", this);
    if (this.el) {
      console.log("doming it");
      this.dom();
    }
  }

  replaceChild() {

    if (this.el) {
      for (var i = this.el.attributes.length - 1; i >= 0; i--){
        this.el.removeAttribute(this.el.attributes[i].name);
      }
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

    if (this.isDomified) {
      return el;
    }

    let attrs = [];
    for (let attrName of Object.keys(this.attrs)) {
      el.setAttribute(attrName, this.attrs[attrName]);
    }
    for (let propName of this.props) {
      el[propName] = true;
    }

    for (let item of this.contents) {
      if (item.type === "jst") {
        el.appendChild(item.value.dom());
      }
      else if (item.type === "textnode") {
        el.appendChild(document.createTextNode(item.value));
      }
      else {
        console.log("Unexpected content type while dominating:", item.type);
      }
    }

    this.isDomified = true;
    return el;
    
  }

  _processParams(params) {
    if (typeof params === "undefined") {
      params = [];
    }
    for (let param of params) {

      let type = typeof(param);

      if (type === "number" || type === "string") {
        this.contents.push({type: "textnode", value: param});
      }
      else if (param instanceof JstElement) {
        this.contents.push({type: "jst", value: param});
      }
      else if (typeof HTMLElement !== 'undefined' && param instanceof HTMLElement) {
        this.contents.push({type: "jst", value: JstElement(param)});
      }
      else if (type === "object") {
        for (let name of Object.keys(param)) {
          if (typeof(param[name]) === "undefined") {
            param[name] = "";
          }
          if (name === "properties" && this._objType(param.properties) === "Array") {
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
  
  _processParams2(params) {
    for (let param of params) {
      let type = this._objType(param);

      if (type === "Number" || type === "String") {
        this.contents.push({type: "textnode", value: param});
      }
      else if (type === "Object") {
        for (let name of Object.keys(param)) {
          if (typeof(param[name]) === "undefined") {
            param[name] = "";
          }
          if (name === "properties" && this._objType(param.properties) === "Array") {
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
      else if (type === "JstElement") {
        this.contents.push({type: "jst", value: param});
      }
      else if (type === "HTMLElement") {
        this.contents.push({type: "element", value: param});
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
  _objType(obj) {
    if (typeof(obj) === 'undefined') {
      return 'undefined';
    }
    var results = obj.constructor.toString().match(/(function|class) (.{1,}?)\s*(\(|{)/);
    return (results && results.length > 2) ? results[2] : '';
  }
  // Returns true if it is a DOM element
  _isElement(o) {
    return (
      typeof HTMLElement === 'object' ? o instanceof HTMLElement : // DOM2
        o && typeof o === 'object' && o !== null && o.nodeType === 1 && typeof o.nodeName === 'string'
    );
  }

  _quoteAttrValue(value) {
    return value;
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
      } else if (arguments[i] instanceof Function) {
        let result = arguments[i]();
        if (result instanceof Array) {
          flat.push.apply(flat, jst._flatten.apply(this, result));
        }
        else {
          flat.push(result);
        }
      } else {
        flat.push(arguments[i]);
      }
    }
    return flat;
  }
    


});

jst.init();

