import jst from './jayesstee';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;
export default templates = {

  page:  () => $div({cn: 'main-page'},
                    templates.header(),
                    templates.body()),

  header: () => $div({cn: 'header'},
                     "My simple header"
                    ),

  body: () => $div({cn: 'body'},
                   "Hello, world!"
                  ),

};
