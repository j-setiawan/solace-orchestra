import jst       from '../../common/jayesstee';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;
export default templates = {

  page:  () => $div({cn: 'main-page'},
                    templates.header(),
                    templates.body()),

  header: () => $div({cn: 'header'},
                     "Time sync client"
                    ),

  body: () => $div({cn: 'body'},
                    $div({cn: 'id1', class: 'RealServerTime'},
                      "Waiting..."
                    ),
                  ),

};
