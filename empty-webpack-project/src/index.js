import env       from '../environment/env';
import jst       from './jayesstee';
import templates from './templates';

import './style.css';


// Fill in all the HTML from the templates
jst("body").appendChild(templates.page());



