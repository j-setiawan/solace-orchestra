import mido

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

for msg in mid.play():
    if msg.type == "note_on":
        print(str(msg.channel) + ": " + notes[msg.note % 12])
