import jst from '../../common/jayesstee';
import env from '../../common/env';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;

let formatters = {

  secsToTime: (secs) => {
    let date = new Date(null);
    date.setSeconds(parseInt(secs || 0));
    return date.toISOString().substr(11, 8);
  },

  formatLatency: (value) => {
    value = value || 0;
    let cn =
        value < 20 ? "rtt-fast" :
        value < 50 ? "rtt-medium" :
        "rtt-slow";
    return [{cn: `rtt-${value < 75 ? "fast" : value < 150 ? "medium" : "slow"}`},
            `${value} ms`];
  }

};


export default templates = {

  page:  (data) => $div({cn: 'main-page'},
                        templates.header(data),
                        templates.body(data)),

  header: (data) => $div({cn: 'header'},
                         env.title + " Dashboard"
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
                                          {title: "RTT", name: "latency", format: formatters.formatLatency},
                                        ],
                                        model: data.conductors
                                      })
                                     ),

  songBody: (opts, data) => $div({cn: 'pane-body'},
                                 templates.table({
                                   fields: [
                                     {title: "", name: "action"},
                                     {title: "Name", name: "song_name"},
                                     {title: "Length", name: "song_length", format: formatters.secsToTime},
                                     {title: "# Channels", name: "numChannels"},
                                     {title: "Conductor", name: "conductor_name"},
                                   ],
                                   model: data.songs
                                 })
                                ),

  symphonyBody: (opts, data) => $div({cn: 'pane-body'},
                                 templates.table({
                                   fields: [
                                     {title: "Name", name: "name"},
                                     {title: "RTT", name: "latency", format: formatters.formatLatency},
                                   ],
                                   model: data.symphonies
                                 })
                                ),

  statusBody: (opts, data) => $div({cn: 'pane-body'},
                                   data.status.body
                                  ),

  buttonBody: (opts, data) => $div({cn: 'pane-body'},
                                   data.buttons.map(
                                     button => 
                                       $button({events: {click: button}}, button.title)
                                   )
                                  ),

  musicianBody: (opts, data) => $div({cn: 'pane-body'},
                                   templates.table({
                                     fields: [
                                       {title: $i({cn: `fa fa-${data.allMusicianToggle?"check-":""}square`, events: {click: (e) => data.toggleAllMusicians(e)}}), name: "checkbox"},
                                       {title: "Name", name: "name"},
                                       {title: "Channel", name: "channel_id"},
                                       {title: "Hits", name: "hits"},
                                       {title: "Misses", name: "misses"},
                                       {title: "%", name: "percent"},
                                       {title: "RTT", name: "latency", format: formatters.formatLatency},
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
                              row => $tr(row.state ? {cn: `row-state-${row.state}`} : undefined,
                                         opts.fields.map(field => $td({cn: `td-${field.name}`},
                                                                      field.format ?
                                                                      field.format(row[field.name], row) :
                                                                      row[field.name]))
                              )
                            )
                          )
                         ),

  songAction: (data, song) => $i({events: song.events,
                                  cn: "song-action-button fa " +
                                  (typeof data.currentSong !== "undefined" ?
                                   data.currentSong === song ?
                                   "fa-stop-circle" :
                                   "fa-play-circle song-action-inactive" :
                                   "fa-play-circle")
                                 }),

  musicianEnabled: (data, musician) => $i({events: musician.events,
                                           cn: "musician-action-checkbox fa " +
                                           (musician.disabled ?
                                            "fa-square" :
                                            "fa-check-square")
                                 }),

};
