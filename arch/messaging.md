# Messaging Format

## Topic Format

Topic format = orchestra/theatre/channel
* **orchestra** - constant
* **theatre** - the "room" that the song is played in. Default value is 'default'
* **channel** - the "midi channel the notes are being played on"


## Message Format

The proposed message format of messages being output by the conductor to play the song:

A json object with the following keys:
* **id**: unique id for this note. Can be used for correlation by symphony
* **program**: The general midi identifier of the instrument being played
* **track**: The track on the game controller that the note will be placed on (1..7)
* **note**: The midi note number
* **channel**: The midi channel that denotes the instrument
* **current_time**: Epoch time in seconds UTC
* **play_time**: The time the note should be played
