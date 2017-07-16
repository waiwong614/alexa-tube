'use strict';
const AWS = require('aws-sdk');
const dropboxV2Api = require('dropbox-v2-api');
var search = require('youtube-search');
var google = require('./node_modules/googleapis');
const ytdl = require('ytdl-core');
var Stream = require('stream');
var url = 'http://youtube.com/watch?v='
var fs = require('fs');
var API_KEY = process.env['API_KEY'];
var dropbox_token = process.env['DROPBOX_TOKEN'];

const dropbox = dropboxV2Api.authenticate({
    token: dropbox_token
});


console.log('***********Starting new session**************')

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

var maxresults = 20

var opts = {
  maxResults: maxresults,
    type: 'video',
    key: API_KEY
};

var settings = new Object();
var streamURL;
 
exports.handler = function(event, context) {
    var player = new alextube(event, context);
    player.handle();
};
 
var alextube = function (event, context) {
    this.event = event;
    this.context = context;
};
 
 
alextube.prototype.handle = function () {
    var requestType = this.event.request.type;
    var userId = this.event.context ? this.event.context.System.user.userId : this.event.session.user.userId;
    
    console.log(JSON.stringify(this.event))
 
 
   if (requestType === "LaunchRequest") {
        this.speak('Welcome to youtube. What are you searching for?', true)
 
 
    } else if (requestType === "IntentRequest") {
        var intent = this.event.request.intent;
        
        if (!process.env['API_KEY']){
            this.speak('API KEY Environment Variable not set!')
        }        
        
        if (!process.env['DROPBOX_TOKEN']){
            this.speak('DROPBOX TOKEN Environment Variable not set!')
        }

        if (intent.name === "SearchIntent") {
            
            var foundTitle;
            var searchFunction = this

        
        console.log('Starting Search Intent')

        var alexaUtteranceText = this.event.request.intent.slots.search.value;
        console.log ('Search term is : - '+ alexaUtteranceText);
            
            if (!alexaUtteranceText){
                searchFunction.speak("I'm sorry I didn't understand what you said")
            }
        search(alexaUtteranceText, opts, function(err, results) {
          if(err) {
              return console.log(err)
              searchFunction.speak('I could not get any results')
          }
            else {
                console.log('number of results is', results.length)
                settings.results = results
                settings.currentresult = 0
                var playlist=[];
                    for (var count = 0; count <= results.length-1; count++) {
                        
                        playlist[count] = 'Track ' + (count +1) +': ' + results[count].title

                    }
                settings.playlist = playlist
                searchFunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                        
                        searchFunction.processResult();
                    } else {
                        console.log('Settings saved to dropbox', result)
                        searchFunction.loadSettings(function(err, result)  {
                            if (err) {
                                searchFunction.speak('There was an error loading settings from dropbox')
                            } else {
                                if (!settings.autoplay){
                                    settings.autoplay ='on'
                                } 
                                
                                if (!settings.shuffle){
                                    settings.shuffle = 'off'
                                }
                                if (!settings.loop){
                                    settings.loop = 'off'
                                }
                                
                                if (settings.shuffle == 'on'){
                                    settings.currentresult = Math.floor((Math.random() * (results.length-1) ));
                                }
                                
                                
                                searchFunction.processResult();

          
                            }
                        });
                    
                    }
                });
                
            }

        });
        
        } else if (intent.name === "NowPlayingIntent") {
        console.log('Starting Now playing Intent')
            var nowfunction = this;
            this.loadSettings(function(err, result)  {
                if (err) {
                    nofunction.speak('There was an error loading settings from dropbox')
                } else {
                    var currentresult = settings.currentresult
                    var enqueuestatus = settings.enqueue
                     if (enqueuestatus == true){
                        console.log('Song already enqueued')
                        currentresult--
                     }
                    var results = settings.results 
                    var title = results[currentresult].title
                    var cardTitle = "📺 Playing - " + title + ' 📺'
                    var cardText = nowfunction.createPlaylist(currentresult)
                    nowfunction.speakWithCard('Currently Playing ' + title, cardTitle, cardText)
                }
            });
        } 
        else if (intent.name === "AutoOn") {
 
        console.log('Starting Auto On Intent')
            this.autoMode('on')
    

            

        
        } else if (intent.name === "AutoOff") {
 
        console.log('Starting Auto Off Intent')
            this.autoMode('off')
        
        } else if (intent.name === "NumberIntent") {
 
        console.log('Starting number Intent')
            var number = this.event.request.intent.slots.number.value;
            this.numberedTrack(number)

        
        } else if (intent.name === "AMAZON.PauseIntent") {
            console.log('Running pause intent')
            this.stop();
 
        } else if (intent.name === "AMAZON.CancelIntent") {
            this.speak(' ')
            
        } else if (intent.name === "AMAZON.NextIntent") {
            this.next();
      
        } else if (intent.name === "AMAZON.PreviousIntent") {
            this.previous();
    
        } else if (intent.name === "AMAZON.ShuffleOffIntent") {
            this.shuffle('off');
    
        } else if (intent.name === "AMAZON.ShuffleOnIntent") {
            this.shuffle('on');
    
        }else if (intent.name === "AMAZON.LoopOnIntent") {
            this.loop('on');
    
        }else if (intent.name === "AMAZON.LoopOffIntent") {
            this.loop('off');
    
        }else if (intent.name === "AMAZON.RepeatIntent") {
            this.speak('Repeat is not supported by the youtube skill');
    
        }else if (intent.name === "AMAZON.StartOverIntent") {
            this.numberedTrack(1)

        }else if (intent.name === "AMAZON.HelpIntent") {
            this.help()

        } else if (intent.name === "AMAZON.ResumeIntent") {
            console.log('Resume called')
            var resumefunction = this;
            this.loadSettings(function(err, result)  {
            if (err) {
                resumefunction.speak('There was an error loading settings from dropbox')
            } else {
                var lastPlayed = settings.lastplayed
                var offsetInMilliseconds = 0;
                var token = resumefunction.createToken;
                var results = resumefunction.results;
                var currentresult = settings.currentresult
                var url = settings.currentURL;
                console.log('current URL is ' + url)
                if (lastPlayed !== null) {
                    console.log(lastPlayed);
                    offsetInMilliseconds = lastPlayed.request.offsetInMilliseconds;
                    token = settings.currenttoken;
                }
                if (offsetInMilliseconds < 0){
                    offsetInMilliseconds = 0
                }
                resumefunction.resume(url, offsetInMilliseconds, token);

                }
            });
            
        }
    } 
    else if (requestType === "AudioPlayer.PlaybackStopped") {
        console.log('Playback stopped')
        var playbackstoppedfunction = this;
        
        this.loadSettings(function(err, result)  {
            if (err) {
                playbackstoppedfunction.speak('There was an error loading settings from dropbox')
            } else { 
                settings.lastplayed = playbackstoppedfunction.event
                playbackstoppedfunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                    } else {
                        console.log('Settings saved to dropbox', result)
                    }
                });
            }

        });

        
    }
    else if (requestType === "AudioPlayer.PlaybackPause") {
        console.log('Playback paused')
        
        
    }
    else if (requestType === "AudioPlayer.AudioPlayer.PlaybackFailed") {
        console.log('Playback failed')
        console.log(this.event.request.error.message)
        
        
    } 
    else if (requestType === "AudioPlayer.PlaybackStarted") {
        console.log('Playback started')
        
        
        var playbackstartedfunction = this;
        
        this.loadSettings(function(err, result)  {
            if (err) {
                playbackstartedfunction.speak('There was an error loading settings from dropbox')
            } else { 
                settings.lastplayed = playbackstartedfunction.event
                settings.enqueue = false;
                var results = settings.results
                var currentresult = settings.currentresult
                settings.currenttitle = results[currentresult].title
                playbackstartedfunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                    } else {
                        console.log('Settings saved to dropbox', result)
                    }
                });
            }

        });        
    }
    else if (requestType === "AudioPlayer.PlaybackNearlyFinished") {
        console.log('Playback nearly finished')
        var finishedfunction = this;
        var token = this.event.request.token;
        console.log('Token from request is', token)
            this.loadSettings(function(err, result)  {
            if (err) {
                finishedfunction.speak('There was an error loading settings to dropbox')
            } else {
                var results = settings.results 
                var current = settings.currentresult
                settings.currenttoken = token
                console.log('number of results is', results.length)
                
                if (settings.shuffle == 'on'){
                    settings.currentresult = Math.floor((Math.random() * (results.length-1) ));
                    finishedfunction.processResult();
                }

                else if (current >= results.length-1){
                    if (settings.loop == 'on'){
                        settings.currentresult = 0
                        finishedfunction.processResult('enqueue');
                    } else {
                    console.log('end of results reached')
                    }
                } else if(settings.autoplay == 'off'){
                    console.log('Autoplay is off')
                }
                else {
                    current++;
                    settings.currentresult = current;
                    finishedfunction.processResult('enqueue');

                }
            }
        });
        
    }
};
 
 alextube.prototype.play = function (audioURL, offsetInMilliseconds,  tokenValue) {

    var results = settings.results
    var currentresult = settings.currentresult
    var title = results[currentresult].title

    var playlistText = this.createPlaylist(currentresult); 
    var responseText = 'Playing Track ' + (currentresult + 1)+ '. ' + title;

    var response = {
    version: "1.0",
    response: {
        shouldEndSession: true,
        "outputSpeech": {
          "type": "PlainText",
          "text": responseText,
        },
        "card": {
          "type": "Standard",
          "title": "📺 Playing - " + title + ' 📺',
          "text": playlistText
        },
                directives: [
            {
                type: "AudioPlayer.Play",
                playBehavior: "REPLACE_ALL", 
                audioItem: {
                    stream: {
                        url: audioURL,
                        token: tokenValue, 
                        expectedPreviousToken: null, 
                        offsetInMilliseconds: offsetInMilliseconds
                    }
                }
            }
        ]
    }
    };
    console.log('Play Response is')
    console.log(JSON.stringify(response))
    this.context.succeed(response);
}; 

alextube.prototype.resume = function (audioURL, offsetInMilliseconds, tokenValue) {
    
    var resumeResponse = {
    version: "1.0",
    response: {
        shouldEndSession: true,

        directives: [
            {
                type: "AudioPlayer.Play",
                playBehavior: "REPLACE_ALL", 
                audioItem: {
                    stream: {
                        url: audioURL,
                        streamFormat: "AUDIO_MP4",
                        expectedPreviousToken: null, 
                        offsetInMilliseconds: offsetInMilliseconds,
                        //offsetInMilliseconds: 0,
                        token: tokenValue
                    }
                }
            }
        ]
    }
    };
    console.log('Resume Response is')
    console.log(JSON.stringify(resumeResponse))
    this.context.succeed(resumeResponse);
};

 alextube.prototype.enqueue = function (audioURL, offsetInMilliseconds, tokenValue, previousToken) {

    var response = {
        version: "1.0",
        response: {
            shouldEndSession: true,
            directives: [
                {
                    type: "AudioPlayer.Play",
                    playBehavior: "ENQUEUE", 
                    audioItem: {
                        stream: {
                            url: audioURL,
                            streamFormat: "AUDIO_MP4",
                            token: tokenValue, 
                            expectedPreviousToken: previousToken, 
                            offsetInMilliseconds: offsetInMilliseconds
                        }
                    }
                }
            ]
        }
    };
    console.log('Enqueue Response is')
    console.log(JSON.stringify(response))
    this.context.succeed(response);
};
 
alextube.prototype.stop = function () {
    console.log("Sending stop response")
    var response = {
        version: "1.0",
        response: {
            shouldEndSession: true,
            directives: [
                {
                    type: "AudioPlayer.Stop"
                }
            ]
        }
    };
    this.context.succeed(response);
};

alextube.prototype.next = function () {
    console.log("Next function")
    
    var nextfunction = this;
    var playingtoken = this.event.request.token;
    this.loadSettings(function(err, result)  {
        if (err) {
            nextfunction.speak('There was an error loading settings from dropbox')
        } else {
            var enqueuestatus = settings.enqueue
            var currenttoken = settings.currenttoken
            var url = settings.currentURL
            var results = settings.results 
            var current = settings.currentresult
            

            if (enqueuestatus == true){
                console.log('Song already enqueued')
                nextfunction.play(url, 0, currenttoken)
            } else if (settings.shuffle == 'on'){
                
                settings.currentresult = Math.floor((Math.random() * (results.length-1) ));
                nextfunction.processResult();
                
            } else{
                console.log('Enqueuing song')
                if (current >= results.length-1){
                    if (settings.loop == 'on'){
                        settings.currentresult = 0
                        nextfunction.processResult();
                    } else {
                    nextfunction.speak('End of playlist reached')
                    }
                } else {
                    current++;
                    settings.currentresult = current;
                    nextfunction.processResult();
                }
            }
        }
    });

};

alextube.prototype.nextResult = function () {
    console.log("Next Result function")
    
    var nextfunction = this;
    var results = settings.results
    var current = settings.currentresult
    
    if (current >= results.length-1){
        nextfunction.speak('End of playlist reached')
    } else {
        current++;
        settings.currentresult = current;
        nextfunction.processResult();
    }


};

alextube.prototype.previous = function () {
    console.log("Previous function")
    
    var previousfunction = this;
    var playingtoken = this.event.request.token;
    this.loadSettings(function(err, result)  {
        if (err) {
            previousfunction.speak('There was an error loading settings from dropbox')
        } else {
            var enqueuestatus = settings.enqueue
            var currenttoken = settings.currenttoken
            var url = settings.currentURL
            var results = settings.results 
            var current = settings.currentresult
            if (enqueuestatus == true){
                console.log('Song already enqueued')
                current = current - 2
                if (current < 0){
                    previousfunction.speak('Already at beginning of playlist')
                } else {
                    settings.currentresult = current;
                    previousfunction.processResult();
                }                     
            } else {
                console.log('Enqueuing song')
                current = current -1
                if (current < 0){
                    previousfunction.speak('Already at beginning of playlist')
                } else {
                    settings.currentresult = current;
                    previousfunction.processResult();
                }
            }
        }
    });

};

alextube.prototype.processResult = function (enqueue) {
    console.log("Processing result")
    var results = settings.results
    var currentresult = settings.currentresult
    var url = results[currentresult].id;
    var foundTitle = results[currentresult].title;
    var playFunction = this;
    var audioStreamInfo = ytdl.getInfo(url, { filter: function(format) { return format.container === 'm4a'; } }, function (err,info){
        
        var contentduration = info.length_seconds
        console.log ('Duration is ', contentduration)
        
        if (contentduration > 125*60){
            
            console.log('Audio longer than 2 hours - for track', currentresult)
            settings.playlist[currentresult] = settings.playlist[currentresult] + 'TRACK TOO LONG TO PLAY!'
            playFunction.nextResult();

            
        } else if (contentduration > 0){
            const dropboxUploadStream = dropbox({
                resource: 'files/upload',
                parameters: {
                    path: '/youtube-skill/audio.m4a',
                    mode: 'overwrite',
                    mute: true
                }
            }, (err, result) => {
                if (err){
                    console.log('There was an error')
                    console.log(err)
                } else if (result){
                    console.log(result)
                    dropbox({
                        resource: 'files/get_temporary_link',
                        parameters: {
                            'path': '/youtube-skill/audio.m4a'
                        }
                    }, (err, result) => {
                        if (err){
                            console.log('There was an error')
                    console.log(err)
                        } else if (result){
                            console.log('Here is the temp link')
                            console.log(result.link)
                            var streamURL = result.link
                            settings.currentURL = streamURL;
                            if (!enqueue){
                                console.log('normal play')
                                var token = playFunction.createToken();
                                settings.currenttoken = token
                                settings.enqueue = false
                            
                            playFunction.saveSettings(function(err, result)  {
                                    if (err) {
                                        console.log('There was an error saving settings to dropbox', err)

                                        playFunction.speak('There was an error saving settings to dropbox')
                                    } else {
                                        console.log('Settings saved to dropbox', result)
                                         
                                        playFunction.play(streamURL, 0, token);
                                    }
                                });      
                                
                            } else {
                                console.log('enque play')
                                var previoustoken = settings.currenttoken
                                console.log('Previous token is: ', previoustoken)
                                var token = playFunction.createToken();
                                settings.currenttoken = token
                                settings.enqueue = true
                                console.log('current token is: ', settings.currenttoken)
                                
                            
                            playFunction.saveSettings(function(err, result)  {
                                    if (err) {
                                        console.log('There was an error saving settings to dropbox', err)

                                        playFunction.speak('There was an error saving settings to dropbox')
                                    } else {
                                        console.log('Settings saved to dropbox', result)
                                         
                                        playFunction.enqueue(streamURL, 0, token, previoustoken);
                                    }
                                });

                            }

                        }
                        
                    });
                }
            }); 
            var media = ytdl(url, { filter: function(format) { return format.container === 'm4a'; } }).pipe(dropboxUploadStream);
        }
 
    })
    
};


alextube.prototype.speak = function (responseText, ask) {
    //console.log('speaking result')
    var session = true
    if (ask){
        session = false
    }
    var response = {
        version: "1.0",
        "sessionAttributes": {},
        response: {
            "outputSpeech": {
              "type": "PlainText",
              "text": responseText,
            },
            "shouldEndSession": session
        }
        
    };
    this.context.succeed(response);
};

alextube.prototype.speakWithCard = function (responseText, cardTitle, cardText) {
    //console.log('speaking result')
    var response = {
        version: "1.0",
        "sessionAttributes": {},
        response: {
            "outputSpeech": {
              "type": "PlainText",
              "text": responseText,
            },
            "card": {
              "type": "Standard",
              "title": cardTitle,
              "text": cardText
            },
            "shouldEndSession": true
        }
        
    };
    this.context.succeed(response);
};

alextube.prototype.autoMode = function (mode) {
    console.log('changing auto play mode')
    
    var autofunction = this;
            
        
        this.loadSettings(function(err, result)  {
            if (err) {
                autofunction.speak('There was an error loading settings from dropbox')
            } else { 
                settings.autoplay = mode
                settings.enqueue = false
                autofunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                    } else {
                        console.log('Settings saved to dropbox', result)
                        autofunction.speak('Autoplay mode is ' + mode)
                    }
                });
            }

        });

};

alextube.prototype.shuffle = function (mode) {
    console.log('changing shuffle mode')
    
    var shufflefunction = this;
            
        
        this.loadSettings(function(err, result)  {
            if (err) {
                shufflefunction.speak('There was an error loading settings from dropbox')
            } else { 
                settings.shuffle = mode
                settings.enqueue = false
                shufflefunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                    } else {
                        console.log('Settings saved to dropbox', result)
                        shufflefunction.speak('Shuffle mode is ' + mode)
                    }
                });
            }

        });

};

alextube.prototype.loop = function (mode) {
    console.log('changing shuffle mode')
    
    var loopfunction = this;
            
        
        this.loadSettings(function(err, result)  {
            if (err) {
                loopfunction.speak('There was an error loading settings from dropbox')
            } else { 
                settings.loop = mode
                settings.enqueue = false
                loopfunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                    } else {
                        console.log('Settings saved to dropbox', result)
                        loopfunction.speak('Loop mode is ' + mode)
                    }
                });
            }

        });

};

alextube.prototype.numberedTrack = function (number) {
    console.log('Numbered track function')
    
            var numfunction = this;
            this.loadSettings(function(err, result)  {
            if (err) {
                numfunction.speak('There was an error loading settings from dropbox')
            } else {
                var enqueuestatus = settings.enqueue
                var currenttoken = settings.currenttoken
                var url = settings.currentURL
                var results = settings.results 
                var current = settings.currentresult
                
                if (number > results.length || number < 1 ){
                    numfunction.speak('That is not a valid selection')
                } else {
                    
                    
                    settings.currentresult = number-1;
                    numfunction.processResult();
                }            
            }
        });

};



 
alextube.prototype.saveSettings = function (callback) {
    
   
    var wstream = fs.createWriteStream('/tmp/settings.js');
    wstream.write(JSON.stringify(settings));
    wstream.end();
    wstream.on('finish', function () {
      //console.log('seetings file has been written');
        const dropboxUploadlastplayed = dropbox({
                resource: 'files/upload',
                parameters: {
                    path: '/youtube-skill/settings.js',
                    mode: 'overwrite',
                    mute: true
                }
            }, (err, result) => {
                if (err){
                    console.log('There was an error')
                    error = err;
                    callback(err, null);
                } else if (result){
                      
                    callback(null, result);
                    
                }
            });
        fs.createReadStream('/tmp/settings.js').pipe(dropboxUploadlastplayed);
    });

   

};
 
alextube.prototype.loadSettings = function (callback) {
    
    const savefile = fs.createWriteStream('/tmp/settings.js')
    dropbox({
        resource: 'files/download',
        parameters: {
            path: '/youtube-skill/settings.js'
        }
        }, (err, result) => {
            if (err){
                    console.log('There was an error downloading file from dropbox')
                    callback(err, null);
                
                
                    
                } else if (result){
                    console.log('File was downloaded from dropbox')
                    //savefile.end();
                    
                }
        }).pipe(savefile);
    
            
    
    savefile.on('finish', function () {
        
        fs.readFile('/tmp/settings.js', 'utf8', onFileRead);

        function onFileRead(err, data) {  
          if (err) {
            console.log('There was an error reading settings file from /tmp')
             callback(err, null); 
          } else {
              
              settings = JSON.parse(data);
              console.log(settings)
              console.log('Settings file sucessfully read')
              callback(null, {});
              
          }
        }
        
        
    })
               
    };

alextube.prototype.createToken = function() {

  var d = new Date().getTime();

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {

    var r = (d + Math.random()*16)%16 | 0;

    d = Math.floor(d/16);

    return (c=='x' ? r : (r&0x3|0x8)).toString(16);

  });

  return uuid;

}
alextube.prototype.createPlaylist = function(currentresult) {
    
    var results = settings.results
     
     var title = results[currentresult].title
     var description = results[currentresult].description
     var smallImageUrl = results[currentresult].thumbnails.high.url
     var link = results[currentresult].link
     var channel = results[currentresult].channelTitle
     var tracklist = '';
     for (let count = 0; count <= results.length-1; count++) {

            
         if (count == currentresult){
             tracklist = tracklist + '🔊  '
         } 
         tracklist = tracklist + settings.playlist[count]
        if (count == currentresult){
             tracklist = tracklist + '  🔊'
         }
         tracklist = tracklist + '\n'
        }
    
    var playlist = description + '\n' + 'From Channel: ' + channel + '\n' + '🔗 ' + link + '\nAutoPlay is ' + settings.autoplay + ': Shuffle Mode is ' + settings.shuffle + ': Loop mode is ' + settings.loop + '\n' +
                '➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖\n...........................TRACK LISTING...........................\n➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖\n' + tracklist

  return playlist;

};

alextube.prototype.help = function(currentresult) {
    
    var cardtext = '1. Request a particular video: "Alexa, ask youtube to play Charley bit my finger"\n' +
'2. Request an auto generated playlist of 25 results: - "Alexa ask Youtube to play SOME David Bowie"\n' +
'3. Request a particular track from the playlist: "Alexa, ask Youtube to play Track 10"\n' +
'4. Skip to the next/previous track:- "Alexa, next/ previous track"\n' +
'5. Pause:- "Alexa pause" or "Alexa stop"\n' +
'6. Resume playback:- "Alexa resume" NOTE - this will restart the track from the beginning\n' +
'7. Find out what is playing by asking "Alexa ask Youtube whats playing"\n' +
'8. Loop the current playlist:- "Alexa Loop On/Off"\n' +
'9. Shuffle mode On/Off:- "Alexa shuffle On/Off"\n' +
'10. Start the track currently playing fromt he beginning:- "Alexa Start Over"'
    
    var cardTitle = 'Youtube Skill Commands'
    
    this.speakWithCard ('Please see the Alexa app for a list of commands that can be used with this skill', cardTitle, cardtext)

}