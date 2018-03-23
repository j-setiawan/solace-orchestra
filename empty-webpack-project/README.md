## Empty Webpack Project

### How to Use

In this empty project, the index.html is generated automatically (though that
can be changed). All it does is load the generated dist/bundle.js and any other
assets that have been imported.

To build the output, you need to be at empty-webpack-project and type: 

    `npm run build:dev`
   
or

    `npm run build:prod`

to build dev or production builds, respectively.

Your output should be fully included in dist.


### Creating HTML

Any HTML templating tools can be used. I have included my own one (src/jayesstee.js) that I like
to use that lets you write HTML using javascript directly (see src/templates.js). Using this
you can simply do things like:

  jst("body").appendChild(
    $div({cn: "my-class-name", otherParam: "my-random-param"},
      $ul(
        $li("first item"),
        $li("second item"),
        $li("third item"),
      )
  ));
  
This will fill the body of the HTML with a div and an unordered list.


### Other Help

A great place to understand webpack is: https://webpack.js.org/guides/getting-started/

