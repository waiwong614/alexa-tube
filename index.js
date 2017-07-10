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

const maxresults=25

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
        this.play(streamURL, 0);
 
 
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
        console.log ('Search term is : - '+ alexaUtteranceText)
        ;
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
                    for (var count = 0; count < results.length-1; count++) {
                        
                        playlist[count] = 'Track ' + (count +1) +': ' + results[count].title

                    }
                settings.playlist = playlist
                searchFunction.saveSettings(function(err, result)  {
                    if (err) {
                        console.log('There was an error saving settings to dropbox', err)
                        
                        searchFunction.playresult();
                    } else {
                        console.log('Settings saved to dropbox', result)
                        searchFunction.playresult();
                    }
                });
                //searchFunction.playresult();
            }

        });
        
        }else if (intent.name === "NowPlayingIntent") {
 
        console.log('Starting Now playing Intent')
            var nowfunction = this;
            
            this.loadSettings(function(err, result)  {
            if (err) {
                nofunction.speak('There was an error loading settings from dropbox')
            } else {
                
                var title = settings.currenttitle
                nowfunction.speak('Playing ' + title)
                
                
            }
        });
            

        
        }else if (intent.name === "NumberIntent") {
 
        console.log('Starting number Intent')
            var number = this.event.request.intent.slots.number.value;
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
                    numfunction.playresult();
                }            
            }
        });
            
                

        
        } else if (intent.name === "AMAZON.PauseIntent") {
            console.log('Running pause intent')
            this.stop();
 
 
        } else if (intent.name === "AMAZON.CancelIntent") {
            this.speak(' ')
            

 
        }else if (intent.name === "AMAZON.NextIntent") {
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
                    
                     
                } else {
                    console.log('Enqueuing song')
                    if (current >= results.length){
                        nextfunction.speak('end of results')
                    } else {
                        current++;
                        settings.currentresult = current;
                        nextfunction.playresult();

                    }
                }
            }
        });
            
                
                
            
            
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
    } else if (requestType === "AudioPlayer.PlaybackStopped") {
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

        
    }else if (requestType === "AudioPlayer.PlaybackPause") {
        console.log('Playback paused')
        
        
    }else if (requestType === "AudioPlayer.AudioPlayer.PlaybackFailed") {
        console.log('Playback failed')
        console.log(this.event.request.error.message)
        
        
    } else if (requestType === "AudioPlayer.PlaybackStarted") {
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
        
        
        
    }else if (requestType === "AudioPlayer.PlaybackNearlyFinished") {
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

                if (current >= results.length){
                    console.log('end of results')
                } else {
                    current++;
                    settings.currentresult = current;
                    finishedfunction.playresult('enqueue');

                }
            }
        });
        
    }
};
 
 alextube.prototype.play = function (audioURL, offsetInMilliseconds,  tokenValue) {
     var results = settings.results
     var currentresult = settings.currentresult
     var title = results[currentresult].title
     var description = results[currentresult].description
     var smallImageUrl = results[currentresult].thumbnails.high.url
     var link = results[currentresult].link
     var channel = results[currentresult].channelTitle
     var tracklist = '';
     for (let count = 0; count < results.length-1; count++) {

            
         if (count == currentresult){
             tracklist = tracklist + '🔊  '
         } 
         tracklist = tracklist + settings.playlist[count]
        if (count == currentresult){
             tracklist = tracklist + '  🔊'
         }
         tracklist = tracklist + '\n'
         

        }
    var responseText = ' '; 
    if (title){
        responseText = 'Playing ' + title;
    }
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
              "text": description + '\n' + 'From Channel: ' + channel + '\n' + '🔗 ' + link + '\n \n' +
                '➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖\n...........................TRACK LISTING...........................\n➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖\n' + tracklist
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

alextube.prototype.playresult = function (enqueue) {
    console.log("Processing result")
    var results = settings.results
    var currentresult = settings.currentresult
    var url = results[currentresult].id;
    var foundTitle = results[currentresult].title;
    var playFunction = this;
    var audioStreamInfo = ytdl.getInfo(url, { filter: function(format) { return format.container === 'm4a'; } }, function (err,info){
        
        var contentduration = info.length_seconds
        
        if (contentduration > 125*90){
            
            playFunction.speak('Audio longer than 2 hours')
            
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

alextube.prototype.processresult = function (responseText) {
    var response = {
        version: "1.0",
        "sessionAttributes": {},
        response: {
            "outputSpeech": {
              "type": "PlainText",
              "text": responseText,
            },
            "shouldEndSession": true
        }
        
    };
    this.context.succeed(response);
};
alextube.prototype.speak = function (responseText) {
    //console.log('speaking result')
    var response = {
        version: "1.0",
        "sessionAttributes": {},
        response: {
            "outputSpeech": {
              "type": "PlainText",
              "text": responseText,
            },
            "shouldEndSession": true
        }
        
    };
    this.context.succeed(response);
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