import sys
import mido

from solace.client import SolaceMQTTClient

# The conversion of MIDI notes is based on this: https://www.midikits.net/midi_analyser/midi_note_numbers_for_octaves.htm
notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

midi_file = sys.argv[1]

mid = mido.MidiFile(midi_file)

channels = {}

# Determine which tracks have enough notes to make it interesting
for track_id in range(len(mid.tracks)):
    track = mid.tracks[track_id]
    notes_in_track = [n for n in track if n.type == "note_on"]

    if notes_in_track:
        channels[notes_in_track[0].channel] = {
            'instrument': track.name.strip(),
            'notes': len(notes_in_track)
        }

solace = SolaceMQTTClient()

for msg in mid.play():
    if msg.type == "note_on":
        print(str(msg.channel) + ": " + notes[msg.note % 12])
        solace.publish("orchestra/" + str(msg.channel), notes[msg.note % 12])
