# Orchestra Hero Architectural Overview

This document give the high-level overview of the Orchestra Hero 
messaging application.

## Glossary

###### Note
A single sound that is played in the game

###### Note Request
A message sent by the Conductor indicating when a Note should be played by a Game Controller

###### Note Response
A message sent by the Game Controller indicating when a Note was played on the Game Controller

###### Song
A collection of Notes that represents a full game. The Song is divided up into many channels.

###### Channel
A stream of Notes that are all published on the same topic and are destined for the same Game Controller. 
All Notes in the same stream typically represent a single instrument in the song.

###### Discovery
Immediately after starting a Conductor or Game Controller, they will send a request message to a
well known topic in order to register the component with the Dashboard.


## Components

The application is split into the following components:

1. Message Broker

   The message broker function is provided by a Solace Cloud service

2. Conductor

   The Conductor reads in source musical scores (possibly midi files)
   and converts the musical data into multiple channels of timed events
   that are sent via the message bus to Game Controllers.
   
3. Dashboard

   The Dashboard component coordinates everything in the application.
   
4. Audience (TBD - there must be a better name)

   The Audience component is responsible for receiving events from
   the active Conductor and events from all the Game Controllers and
   converting this information into sound and graphics that can be shown
   on a projector for the demo and played over the audio system in the room.
   

### Message Broker

The Message Broker component provides the messaging middleware that allows
for easy service discovery and inter component communications. For this application
Solace Cloud will be used. The application will require a service that is capable 
of providing 150 client connections.

Each messaging component is free to use its own preferred language and messaging
protocol.

Since this application is time sensitive, some tests will need to be performed to 
ensure that the cloud service provides sufficient message throughput and low 
enough latency for the application. If lower latency is needed, it may be necessary
to use a local appliance instead.

##### Message Broker Config

The configuration of the Message Broker is quite straightforward. The default startup
configuration should be sufficient for this application.

##### Message Exchange Patterns

All messages sent via the message broker will use SMF direct messaging (or QOS0 for
MQTT). There are no requirements for guaranteed messaging.

The two message exchange patterns used will be Request-Reply and Fire-and-Forget. 
The exact usage of these patterns will be described later in the document.
 

### Conductor

The Conductor component is responsible for reading in musical source files and
streaming numerous Channels of Notes to the Game Controllers and to the Player.

When the Conductor first starts, it will:

 * read in all the musical source files that it was given
 * retrieve the meta data from the files
 * perform discovery with the Dashboard 
 * register all songs it can play with the Dashboard
 * wait for further instructions from the Dashboard

Eventually the Dashboard will request that the Conductor should play a song and send
a song request to the specific Conductor to begin playing. When the Conductor receives
the request to play a song, it will:

 * send out a Song Start message, which includes all the song meta-data
 * next it will send a time synchronization preamble lasting TBD seconds
 * then it will send the song out on all channels
 * when the song ends, it will send a song complete message

### Dashboard
     
The Dashboard is the brains of the application. It is responsible for:

 * registering all Conductors and Game Controllers through discovery
 * choosing which song on which Conductor should be played through user interaction
 * distributing the instrument channels to Game Controllers

During song playing, it will monitor the song to give some indication of progress. At 
song completion it will harvest statistics/scores from the Game Controllers to allow 
players to be ranked. This ranking could be used in channel assignment for later songs
so that better players are assigned harder channels.
    

### Game Controller

There are many Game Controllers in the application. The Game Controllers are used
by Players to participate in the song. At startup they:

 * request a name/gamer-tag from the player
 * register with the Dashboard by publishing to a well known address
 * wait for a song start message (TBD - may receive progress information about other players in the game)

When a song is started the Game Controller will:

 * receive the Song Start message and alert the user that a song is starting
 * receive and display the song meta-data
 * perform time sychronization with the time synch preamble sent by the Conductor
 * during the time synch preamble, give a count-down before Notes start arriving at the Game Controller
 * receive Notes during the Song, providing a progressive indication of when a note must be played on the Game Controller
 * register screen/key presses that represent playing of notes by the player
 * send messages to the Audience that indicate the Note being played, along with time offset information relative to the expected time to play the note. If note is not played within TBD milliseconds, send an indication that the note was missed
 * display a score for the user (% hit) that indicates how close the player was to hitting all the notes

When the song is complete (recognized by the reception of a Song Complete message from the Conductor), the Game Controller will display the full score for the player and send the score to the Dashboard.


### Audience

The Audience is the audio and visual component of the application. It is responsible for combining
all the information from the Conductor and Game Controllers into sound and some sort of visual display.
There can be multiple Audience components, though likely not during the demo.

On startup the Audience will:

 * register itself with the Dashboard so the Dashboard can complain if a Song is started without at least one present
 * receive and display some information about available players (and their current scores?)

While waiting for a song:

 * receive additional information from the Dashboard when player list changes

When a song starts, the Audience will:

 * clear any past history and visually show there is a new song starting
 * display the song meta data
 * perform time synchronization with the Conductor during the song preamble
 * show a countdown to song starting during the preamble
 * receive all the Note Requests on all channels from the Conductor
 * receive all the Note Responses on all channels from all Game Controllers
 * combine all the Note Request information with Note Response information to determine which notes to play

When playing audio, the Audience needs to be somewhat forgiving to account for network delays 
and lost packets. Note Requests will be receive TBD seconds in advance of the Note Responses, 
so with time synchronization it should be possible for the Audience to know exactly when all 
the notes should be played. The Audience should use the gamer score (or recent hit rate) to 
build in a small amount of forgiveness for channels that are missing Note Responses when the 
that note should be played.

Due to variable latency over the network, the Audience should build in a small delay before
playing received Note Responses. Time synchronization should allow reasonable synchronization 
across all players.

