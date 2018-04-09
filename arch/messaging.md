# Messaging Format

## Values used in messages and topics

The following list defines the items that are present in topics and messages:

* **client_id**: A unique identifier in the orchestra application of the sender of a message
* **msg_id**: An identifier attached to a request-reply message to allow correlation of responses
* **current_time**: Number of milliseconds since epoch. Synched to application time
* **song_id**: An indentifier for each song within a conductor
* **note_id**: An indentifier for each note on each channel. It must be unique in a song
* **channel_id**: An identifier for each channel within a song
* **theatre_id**: An identifier for each theatre
* **play_time**: The time that a player should play a note
* **component_type**: The type of component - enum: conductor, musician, symphony
* **msg_type**: The type of message. See message types below

## Topic Format

General topic format is orchestra/\<destination-type>/\<optional-id1>/\<optional-id2>

* **orchestra** - constant
* **destination_type** - the type of destination. It is one of:
  * **p2p** - point-to-point - this requires a third level in the topic that contains the **client_id**.
    e.g. orchestra/p2p/123123
  * **broadcast** - send to everyone. e.g. orchestra/broadcast
  * **theatre** - send to everyone in a specific theatre. This requires a theatre_id. e.g. orchestra/theatre/345
  * **channel** - sent to a specific channel in a song. The id following this has the theatre id followed by the channel id. e.g. for a theatre of 345 and a channel of 14, orchestra/channel/345/14
* **optional-ids** - identifiers specific to the destination type


## Message Types

The following table lists all message types. Subsequent sections will describe the format and semantics of them.

| msg_type      | Exchange Pattern | Description |
| --------      | ---------------- | ----------- |
| register      | Request-reply    | Sent to the dashboard by each component when it starts |
| start_song    | Request-reply    | Sent by the dashboard to tell all components that a new song is starting |
| stop_song     | Fire-and-forget  | Sent by the dashboard to tell all components that the current song should be stopped |
| complete_song | Fire-and-forget  | Sent by the symphony to indicate that the song is now complete |
| music_score   | Fire-and-forget  | Sent by the conductor on a per channel basis to let all musicians know what to play and when to play it |
| play_note     | Fire-and-forget  | Sent for each note played by each musician to indicate when a note is played | 
| ping          | Request-reply    | Empty message (with reply info). The receiver will immediately reply
| score_update  | Fire-and-forget  | Sent by musician to indicate the current score



## Message Formats

### General Form

All messages are json objects. All contain the following properties (defined above):

* **client_id**
* **current_time**
* **msg_type**
* **msg_id**

### General Reply Messages

All reply messages have the msg_type field set to the received msg_type with '_response' appended to it.
For example, if a component receives a message with the msg_type set to 'ping', it will response with
a msg_type of 'ping_response'.

The topic used for all reply message is created by appending the received **client-id** to 'orchestra/p2p/'.
For example, if a component with a client id of 123123 is being replied to, then the topic would be
orchestra/p2p/123123.

All reply messages must contain the general maditory proporties plus a **status** property. If the request
was successful, the status is set to 'ok'. If there is a problem, it is set to 'error'. In the error case, there 
is an additional property call 'message' that can contain a text description of the problem.

Reply messages may contain type specific information that will be defined later.

### Registration Message

Registration messages are sent soon after startup of each component in the system. They are all received
by the dashboard so that it can list and coordinate the songs.

Registration messages are specific to the type of component registering. Each message contains the manditory
fields listed above.

This message is sent to the topic: orchestra/registration

On reception of the register message, the dashboard will reply to the sender's p2p address
(orchestra/p2p/\<client_id>) with the msg_type of 'register_response'.

#### Conductor Registration Message

* **component_type** - "conductor"
* **name** - name of the conductor
* **song_list** - array of objects, each containing:
    * **song_id** - identify of song unique to the conductor
    * **song_name** - name of song as it will be displayed
    * **song_length** - length of song in seconds
    * **song_channels** - an array of objects containing channel information
      * **channel_id**
      * **instrument_name**
      * **num_notes**

#### Musician Registration Message

* **component_type** - "musician"
* **name** - name entered by the player in the musician app

#### Symphony Registration Message

* **component_type** - "symphony"
* **name** - name of the symphony


### Start Song Message

Start song messages are sent by the dashboard to each registered component. The messages are taylored to each
type of component they are being sent to. The dashboard must retry the request if a response is not received within
3 seconds.

Their formats are defined in the following sections.

The topic for these messages is: orchestra/p2p/\<client_id>

#### Conductor Start Song Message

* **song_id**
* **song_name**
* **song_length**
* **theatre_id**
* **start_time** - time that the song should start. (5 to 10 seconds in future?)

#### Musician Start Song Message

* **song_id**
* **song_name**
* **song_length**
* **theatre_id**
* **channel_id** - IDs are spread across all participating musicians
* **start_time** - time that the song should start. (5 to 10 seconds in future?)

#### Conductor Start Song Message

* **song_id**
* **song_name**
* **song_length**
* **theatre_id**
* **start_time** - time that the song should start. (5 to 10 seconds in future?)


### Stop Song Message

Stop song messages are sent by the dashboard to all components participating in a theatre. When recieved all
components must immediately stop the current song.

The topic for these messages is: orchestra/broadcast

No reply is sent by the receiving components.

### Complete Song Message

Complete song messages are sent by the symphony to all components participating in a theatre. When recieved all
components know that the song is over.

The topic for these messages is: orchestra/theatre/<theatre_id>

No reply is sent by the receiving components.

### Ping Message

This message only contains the manditory fields. It will be immediately responded to. It can be used for time
synchronization and latency measurements.

A ping message can be sent to a specific client using its p2p address (orchestra/p2p/\<client_id>) or to
all components using the broadcast address orchestra/p2p/broadcast.

### Music Score Message

This message is used by the conductor to issue one or more notes that will be played in the future.
These messages are sent on individual channels. Each musician should be subscribed to a single channel,
while the symphony would subscribe to all channels (using a wildcard in the subscription).

This message is sent to the topic: orchestra/theatre/\<theatre_id>

The message format for this is:

* **note_list** - array of objects, one per note with each having the format:
  * **note_id** - id for the note, unique for the whole song
  * **play_time** - time in future when this note should be played
  * **note** - the midi note number
  * **channel** - the midi channel the note is played on (ie, the midi instrument)
  * **track** - the track on the game controller that the note will be placed on (1..7)
  * **duration** - length in time of note (This is needed by the symphony to play the note for the
    right length, but could also be used on the game controller to show a longer sound...)

Note that the conductor could send a message per note or even send all notes for the entire song in a
single message.

### Play Note Message

This message is sent by the musician for each note played in the application. It is a fire-and-forget message
destined for the symphony component so that it can be played.

This message is sent to the topic: orchestra/theatre/\<theatre_id>/note

The format of the message is:

* **note_id** - id of the note from the music score message
* **time_offset** - millisecond offset from the time that the note should have been played. This is a signed int

Note that this message is intentionally short because it is by far the most frequently sent message. All additional
information about the note can be retrieved from the music score message data sent earlier by using the **note_id**

### Score Update Message

This message is periodically sent by the musicians to update the dashboard and symphony on their scores. 

