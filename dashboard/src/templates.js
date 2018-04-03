import jst from './jayesstee';
import env from '../environment/env';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;

let formatters = {

  secsToTime: (secs) => {
    let date = new Date(null);
    date.setSeconds(parseInt(secs || 0));
    return date.toISOString().substr(11, 8);
  }

};


export default templates = {

  page:  (data) => $div({cn: 'main-page'},
                        templates.header(data),
                        templates.body(data)),

  header: (data) => $div({cn: 'header'},
                         env.title
                        ),

  body: (data) => $div({cn: 'body'},
                       templates.pane({name: "conductor",
                                       title: "Conductors",
                                       bodyTemplate: templates.conductorBody},
                                      data),
                       templates.pane({name: "musician",
                                       title: "Musicians",
                                       bodyTemplate: templates.musicianBody},
                                      data),
                       templates.pane({name: "song",
                                       title: "Songs",
                                       bodyTemplate: templates.songBody},
                                      data),
                       templates.pane({name: "symphony",
                                       title: "Symphonies",
                                       bodyTemplate: templates.symphonyBody},
                                      data),
                       templates.pane({name: "status",
                                       title: "Status",
                                       bodyTemplate: templates.statusBody},
                                      data),
                       templates.pane({name: "buttons",
                                       title: "Control",
                                       bodyTemplate: templates.buttonBody},
                                      data)
                  ),

  pane: (opts, data) => $div({cn: `pane ${opts.name}-pane`},
                             templates.paneHeader(opts, data),
                             opts.bodyTemplate ? jst.stamp(opts.name, opts.bodyTemplate, opts, data) : undefined
                            ),

  paneHeader: (opts) => $div({cn: `pane-header ${opts.name}-pane-header`},
                             opts.title
                            ),

  conductorBody: (opts, data) => $div({cn: 'pane-body'},
                                      templates.table({
                                        fields: [
                                          {title: "Name", name: "name"},
                                          {title: "# Songs", name: "numSongs"},
                                        ],
                                        model: data.conductors
                                      })
                                     ),

  songBody: (opts, data) => $div({cn: 'pane-body'},
                                 templates.table({
                                   fields: [
                                     {title: "Name", name: "song_name"},
                                     {title: "Length", name: "song_length", format: formatters.secsToTime},
                                     {title: "# Channels", name: "numChannels"},
                                   ],
                                   model: data.songs
                                 })
                                ),

  symphonyBody: (opts, data) => $div({cn: 'pane-body'},
                                 templates.table({
                                   fields: [
                                     {title: "Name", name: "name"}
                                   ],
                                   model: data.symphonies
                                 })
                                ),

  statusBody: (opts, data) => $div({cn: 'pane-body'},
                                   `${opts.title} body`
                                  ),

  buttonBody: (opts, data) => $div({cn: 'pane-body'},
                                   $button({cn: "add-conductor"}, "Add Conductor"),
                                   $button({cn: "add-musician"},  "Add Musician"),
                                   $button({cn: "add-symphony"},  "Add Symphony"),
                                   $button({cn: "inc-button"},    "Increment"),
                                   $button({cn: "clear-button"},  "Clear")
                                  ),

  musicianBody: (opts, data) => $div({cn: 'pane-body'},
                                   templates.table({
                                     fields: [
                                       {title: "Name", name: "name"},
                                       {title: "Hits", name: "hits"},
                                       {title: "Misses", name: "misses"},
                                       {title: "%", name: "percent"},
                                       {title: "RTT", name: "rtt"},
                                     ],
                                     model: data.musicians
                                   })
                                  ),

  table: (opts) => $table({cn: 'pane-table'},
                          $thead(
                            $tr(
                              opts.fields.map(field => $th({cn: `th-${field.name}`}, field.title))
                            )
                          ),
                          $tbody(
                            opts.model.map(
                              row => $tr(
                                opts.fields.map(field => $td({cn: `td-${field.name}`},
                                                             field.format ?
                                                             field.format(row[field.name], row) :
                                                             row[field.name]))
                              )
                            )
                          )
                         ),

};
