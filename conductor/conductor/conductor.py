# Conductor
import sys
import math
import mido
import time
import pprint
import copy
import re
import threading

from solace.client import SolaceMQTTClient

from os      import listdir, getcwd, getpid
from os.path import isfile, join

import json

def get_unique_notes_in_channel(notes_in_channel):
    """ Utility function to get an ordered set of unique notes in the channel """
    all_notes = []
    for notes in notes_in_channel:
        all_notes.append(notes.note)

    return sorted(set(all_notes))
    
def get_unique_instruments_in_channel(notes_in_channel):
    """ Utility function to get an ordered set of unique instruments in the channel """
    all_instruments = []
    for notes in notes_in_channel:
        all_instruments.append(notes.program)

    return sorted(set(all_instruments))
    
class Conductor:

    def __init__(self):
        
        self.channel_instrument = {}

        # The conversion of MIDI notes is based on this: 
        # https://www.midikits.net/midi_analyser/midi_note_numbers_for_octaves.htm
        self.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

        # Path to the midi files
        self.midi_file_path = getcwd() + "/midi_files"

        # The list of midi filenames
        self.midi_files = self.get_midi_files(self.midi_file_path)

        # Topic format = orchestra/theatre/default
        # orchestra - constant
        # theatre - the "room" that the song is played in. Default value is 'default'
        # channel - the "instument being played"
        self.theatre = 'default'

        # Redirect for callbacks
        def onConnect():
            self.onConnect()

        def onReregister(*args):
            self.onReregister(*args)
        
        def onStartSong(*args):
            self.onStartSong(*args)
        
        def onStopSong(*args):
            self.onStopSong(*args)
        
        # Unique id assigned to each message (note)
        self.unique_id = 0

        # Total number of tracks playable on game controller
        self.number_of_tracks_on_game_controller = 7

        self.channels = {}

        # The filename of the selected song
        self.selected_song_file = {}

        # The midi events of the selected song
        self.selected_song_midi = {}

        # Game controller default time offset between when the note is
        # received and when it's played (amount of time it takes for the
        # note to travel down the UI track component)
        self.game_controller_play_offset_sec  = 2;
        self.game_controller_play_offset_msec = 2000;

        # The length of a quarter note in milli seconds
        # 60 seconds / tempo (beats per minute)
        self.quarterNoteLength = 60/80*1000;

        # Parse midi files
        self.parseMidiFiles()

        # Create and initialize solace messaging client
        self.solace = SolaceMQTTClient(callbacks={'connect': onConnect,
                                                  'start_song': onStartSong,
                                                  'stop_song': onStopSong,
                                                  'reregister': onReregister})



    def parseMidiFiles(self):
        self.song_list      = []
        self.song_list_full = []
        self.midis          = []

        song_id = 0
        all_instruments = []
        for file in self.midi_files:
            midi = mido.MidiFile(self.midi_file_path + "/" + file)
            name = re.sub('\.mid$', '', file)
            print("Parsing midi file: ", file)
            info = {
                'song_name':     name,
                'song_channels': [],
                'instruments':   []
            }
            fullNotesPerChannel = []

            if (midi.length):
                info['song_length'] = math.ceil(midi.length)

            tempoList = []
            for channelIdx in range(len(midi.tracks)):

                channel     = midi.tracks[channelIdx]
                currentTick = 0
                currentTime = 0.0
                noteStart   = {}
                tempoIdx    = 0
                program     = 0

                # Default to 500000, but override with learned tempo if present
                tempo       = 500000
                if len(tempoList):
                    tempo = tempoList[0][1]

                # Loop through all the messages and learn the start and duration of all notes
                notes = []
                for msg in channel:
                    #print(msg)

                    currentTime = currentTime + mido.tick2second(msg.time, midi.ticks_per_beat, tempo)
                    currentTick = currentTick + msg.time

                    # Adjust tempo as we go along
                    # if (tempoIdx+1) < len(tempoList) and tempoList[tempoIdx+1][0] <= currentTick:
                    #     tempoIdx += 1
                    #     tempo = tempoList[tempoIdx][1]

                    # Learn the tempo - should only happen on channel 1
                    if msg.type == "set_tempo":
                        tempoList.append([currentTick, msg.tempo])

                    # Learn the program
                    if msg.type == "program_change":
                        program = msg.program

                    # Record when note starts
                    elif msg.type == 'note_on':
                        noteInfo = {
                            'channel':   msg.channel,
                            'note':      msg.note,
                            'velocity':  msg.velocity,
                            'start':     currentTime,
                            'note_id':   self.unique_id,
                            'program':   program,
                            'track':     (msg.note % self.number_of_tracks_on_game_controller) + 1
                        }
                        self.unique_id += 1
                        noteStart[str(msg.note)] = noteInfo
                        notes.append(noteInfo)
                        
                    # Calc the note length and fill in the rest of the note info
                    elif msg.type == 'note_off' and str(msg.note) in noteStart:
                        noteInfo              = noteStart[str(msg.note)]
                        noteLen               = currentTime - noteInfo['start']
                        noteInfo['duration']  = int(1000 * noteLen)
                        noteInfo['play_time'] = int(1000 * noteInfo['start']) + self.game_controller_play_offset_msec
                        noteInfo['start']     = int(1000 * noteInfo['start'])
                        del(noteStart[str(msg.note)])

                for note in noteStart:
                    noteInfo              = noteStart[note]
                    noteLen               = currentTime - noteInfo['start']
                    noteInfo['duration']  = int(1000 * noteLen)
                    noteInfo['play_time'] = int(1000 * noteInfo['start']) + self.game_controller_play_offset_msec
                    noteInfo['start']     = int(1000 * noteInfo['start'])
                    
                        
                if notes:
                    channelInfo     = {}
                    fullChannelInfo = {}
                    channelNum      = notes[0]['channel']
                    
                    channelInfo['channel_id']      = channelNum
                    channelInfo['num_notes']       = len(notes)
                    channelInfo['instrument_name'] = channel.name.strip()

                    fullChannelInfo          = copy.copy(channelInfo)
                    fullChannelInfo['notes'] = notes

                    program_change = next((m for m in channel if m.type == 'program_change'), {'program': 0})
                    channelInfo['program'] = program_change.program
                    all_instruments.append(program_change.program)

                    info['song_channels'].append(channelInfo)
                    fullNotesPerChannel.append(fullChannelInfo)

            info['song_id']     = song_id

            self.song_list.append(info)
            self.song_list_full.append(fullNotesPerChannel)
            self.midis.append(midi)

            song_id += 1

        # Need this to cut and paste into the symphony (until we enable sync over messaging)
        all_instruments = sorted(set(all_instruments))
        print("All Instruments:")
        print(all_instruments)
                            
    def makeRegistrationMessage(self):
        return {
                'msg_type':       'register',
                'component_type': 'conductor',
                'name':           'conductor_' + str(getpid()),
                'song_list':      self.song_list
            }
        
    def onConnect(self):
        self.registrationMessage = self.makeRegistrationMessage()
        self.solace.sendMessage("orchestra/registration", self.registrationMessage)
        print("Connected!!")

    def onReregister(self, topic, rxMessage):
        # Reply with the original registration message
        self.registrationMessage = self.makeRegistrationMessage()
        self.solace.sendMessage("orchestra/registration", self.registrationMessage)
        
    def onStartSong(self, topic, rxMessage):
        songId             = rxMessage['song_id']
        theatreId          = rxMessage['theatre_id']
        self.currentSongId = songId

        self.solace.subscribe("orchestra/theatre/" + str(theatreId))
        self.solace.sendResponse(rxMessage, {})

        self.songThread = threading.Thread(target=self.play_precanned_song, args=[songId])
        self.songThread.start()

    def onStopSong(self, topic, rxMessage):
        for song in self.song_list:
            song['is_playing'] = 0

    # Reads all of the files in the midi_files directory
    def get_midi_files(self, mypath):
         return [f for f in listdir(mypath) if isfile(join(mypath, f))]

    # Returns the list of songs
    def get_songs(self):
        return self.get_midi_files

    # Select one of the midi files in the midi_files directory and analyze
    # the song
    def select_song(self, song_index):
        self.selected_song_file = self.midi_files[song_index]
        self.selected_song_midi = mido.MidiFile(self.midi_file_path + "/" + self.selected_song_file)
        self.analyze_song()

    def analyze_song(self):
        """ Determine which tracks have enough notes to make it interesting """
        #pprint(vars(self.selected_song_midi))
        for channel_id in range(len(self.selected_song_midi.tracks)):
            channel = self.selected_song_midi.tracks[channel_id]
            notes_in_channel = [n for n in channel if n.type == "note_on"]

            if notes_in_channel:
                channel_number = notes_in_channel[0].channel

                self.channels[channel_number] = {
                    'instrument': channel.name.strip(),
                    'notes': len(notes_in_channel)
                }
                unique_notes = get_unique_notes_in_channel(notes_in_channel)
                self.channels[channel_number]['unique'] = unique_notes

                program_change = next((m for m in channel if m.type == 'program_change'), 0)
                self.channel_instrument[channel_number] = program_change.program


    def play_precanned_song(self, songId):

        for song in self.song_list:
            song['is_playing'] = 0
        self.song_list[songId]['is_playing'] = 1

        # Need to sleep a bit so that the other components can register their
        # subscriptions
        time.sleep(2)
        song = self.song_list_full[songId]

        currentTime = self.solace.getTime()
        for channel in song:
            notes = []
            for note in channel['notes']:
                fixedNote = copy.copy(note)
                if ('play_time' in fixedNote):
                    fixedNote['play_time'] = fixedNote['play_time'] + currentTime + 5000
                    notes.append(fixedNote)
            
            message_body = {
                'msg_type': 'note_list',
                'note_list': notes
            }
            topic = "orchestra/theatre/" + self.theatre + "/" + str(channel['notes'][0]['channel'])
            # print("Sending note list on ", channel['notes'][0]['channel'], topic)
            self.solace.sendMessage(topic, message_body)

        print(self.song_list[songId])
        stopTime = 8000 + self.solace.getTime() + self.song_list[songId]['song_length']*1000

        while self.solace.getTime() < stopTime and self.song_list[songId]['is_playing']:
            time.sleep(1)

        if self.song_list[songId]['is_playing']:
            topic = "orchestra/theatre/" + self.theatre
            self.solace.sendMessage(topic, {'msg_type': 'complete_song',
                                            'song_id':  self.currentSongId})
            self.solace.sendMessage(topic, {'msg_type': 'stop_song',
                                            'song_id':  self.currentSongId})
            self.song_list[songId]['is_playing'] = 0
            del self.currentSongId
                
                
    def play_song(self, songId):

        for song in self.song_list:
            song['is_playing'] = 0
        self.song_list[songId]['is_playing'] = 1

        self.select_song(songId)

        channelIdxs = []
        for i in range(30):
            channelIdxs.append(0)

        song_full = self.song_list_full[songId]
            
        for msg in self.selected_song_midi.play():
            if not self.song_list[songId]['is_playing']:
                print("Stopping song")
                return
            if msg.type == "note_on":
                channel_number = msg.channel
                full_note      = song_full[channel_number-1]['notes'][channelIdxs[channel_number]]
                channelIdxs[channel_number] += 1
                topic = "orchestra/theatre/" + self.theatre + "/" + str(channel_number)
                unique_notes = self.channels[channel_number]['unique']
                current_time = time.time()

                # Message body
                #  id: unique id for this note. Can be used for correlation by symphony
                #  program: The general midi identifier of the instrument being played
                #  track: The track on the game controller that the note will be placed on (1..7)
                #  note: The midi note number
                #  channel: The midi channel that denotes the instrument
                #  current_time: Epoch time in seconds UTC
                #  play_time: The time the note should be played
                message_body = {
                    'msg_type': 'note_list',
                    'client_id': self.unique_id,
                    'msg_id': self.unique_id,
                    'current_time': current_time,
                    'note_list': [
                        {
                        'note_id': str(self.unique_id),
                        'program': str(self.channel_instrument[channel_number]),
                        'track': str((unique_notes.index(msg.note) % self.number_of_tracks_on_game_controller) + 1),
                        'note': str(msg.note),
                        'channel': str(channel_number),
                        'duration': str(full_note['duration']),
                        'current_time': str(current_time),
                        'play_time': str(current_time + self.game_controller_play_offset_sec)
                        }
                    ]}

                self.unique_id += 1
                #print("Topic: " + topic)
                #print(message_body)
                self.solace.publish(topic, json.dumps(message_body))

        # Done playing song - just send a complete song to let everyone know
        time.sleep(self.game_controller_play_offset_sec + 2)
        topic = "orchestra/theatre/" + self.theatre
        self.solace.sendMessage(topic, {'msg_type': 'complete_song',
                                        'song_id':  self.currentSongId})
        self.song_list[songId]['is_playing'] = 0
        del self.currentSongId
        
        

conductor = Conductor()
time.sleep(1000000)
