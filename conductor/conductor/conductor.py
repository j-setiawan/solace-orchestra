# Conductor
import sys
import mido

from solace.client import SolaceMQTTClient

def get_unique_notes_in_channel(notes_in_channel):
    """ Get an orderede set of unique notes in the channel """
    all_notes = []
    for notes in notes_in_channel:
        all_notes.append(notes.note)

    return sorted(set(all_notes))

def analyze_song(mid):
    """ Determine which tracks have enough notes to make it interesting """
    for channel_id in range(len(mid.tracks)):
        channel = mid.tracks[channel_id]
        notes_in_channel = [n for n in channel if n.type == "note_on"]

        if notes_in_channel:
            channel_number = notes_in_channel[0].channel
            channels[channel_number] = {
                'instrument': channel.name.strip(),
                'notes': len(notes_in_channel)
            }
            unique_notes = get_unique_notes_in_channel(notes_in_channel)
            channels[channel_number]['unique'] = unique_notes

def play_song(mid):
    for msg in mid.play():
        if msg.type == "note_on":
            channel_number = msg.channel
            unique_notes = channels[channel_number]['unique']
            print(str(msg.channel) + ": " + notes[msg.note % 12])

            # Message body
            #  track: The track on the game controller that the note will be placed on (1..7)
            #  note: The midi note number
            #  channel: The midi channel that denotes the instrument
            message_body = '{ ' + \
            'track: ' + str((unique_notes.index(msg.note) % number_of_tracks_on_game_controller) + 1) + ',' +\
            'note: ' + str(msg.note) + ',' + \
            'channel: ' + str(channel_number) + '}'
            print(message_body)
            solace.publish("orchestra/" + theatre + '/' + str(msg.channel), 
            message_body)

# Topic format = orchestra/theatre/channel
# orchestra - constant
# theatre - the "room" that the song is played in. Default value is 'default'
# channel - the "instument being played"
theatre = 'default'

# Total number of tracks playable on game controller
number_of_tracks_on_game_controller = 7
# The conversion of MIDI notes is based on this: 
# https://www.midikits.net/midi_analyser/midi_note_numbers_for_octaves.htm
notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
midi_file = sys.argv[1]

mid = mido.MidiFile(midi_file)

channels = {}

# Create the messaging client
solace = SolaceMQTTClient()

# Analyze the song
analyze_song(mid)
# Play the song note by note and send out messages to game controllers
play_song(mid)
    
