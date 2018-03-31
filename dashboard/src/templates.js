import jst from './jayesstee';
import env from '../environment/env';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;
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
                       templates.pane({name: "player",
                                       title: "Players",
                                       bodyTemplate: templates.playerBody},
                                      data),
                       templates.pane({name: "song",
                                       title: "Songs",
                                       bodyTemplate: templates.songBody},
                                      data),
                       templates.pane({name: "status",
                                       title: "Status",
                                       bodyTemplate: templates.statusBody},
                                      data),
                  ),

  pane: (opts, data) => $div({cn: `pane ${opts.name}-pane`},
                             templates.paneHeader(opts, data),
                             opts.bodyTemplate ? opts.bodyTemplate(opts, data) : undefined
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
                                     {title: "Name", name: "name"},
                                     {title: "Length", name: "length"},
                                     {title: "# Channels", name: "numChannels"},
                                   ],
                                   model: data.songs
                                 })
                                ),

  statusBody: (opts, data) => $div({cn: 'pane-body'},
                                   `${opts.title} body`
                                  ),

  playerBody: (opts, data) => $div({cn: 'pane-body'},
                                   templates.table({
                                     fields: [
                                       {title: "Name", name: "name"},
                                       {title: "Hits", name: "hits"},
                                       {title: "Misses", name: "misses"},
                                       {title: "%", name: "percent"},
                                       {title: "RTT", name: "rtt"},
                                     ],
                                     model: data.players
                                   })
                                  ),

  table: (opts) => $table({cn: 'pane-table'},
                          $thead(
                            $tr(
                              opts.fields.map(field => $th(field.title))
                            )
                          ),
                          $tbody(
                            opts.model.map(
                              row => $tr(
                                opts.fields.map(field => $td(row[field.name]))
                              )
                            )
                          )
                         )



};
