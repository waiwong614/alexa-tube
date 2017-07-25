# alexa-tube
**Unofficial Youtube Skill for Alexa**

## Release 1.2

This skill is a proof of concept for personal use that allows Alexa to search for youtube videos and play the audio element - NOTE doing so is against the youtube terms of service

This skill will stream approximately 15-18 hours per month of youtube audio within the free tier of AWS.
Each additonal 15-18 hours per month will cost approx $0.09

The skill will **try** and stop you from going beyond the free limits unless you instruct it to do otherwise - but it is your responsibility to keep a check on your usage and AWS costs. 
See the AWS Charges section for more details.


## SKILL COMMANDS

1. Request a particular video: "Alexa, ask youtube to play 'Charley bit my finger'"
2. Request an auto generated playlist of 25 results: - "Alexa ask Youtube to play SOME David Bowie"
3. Request a particular track from the playlist: "Alexa, ask Youtube to play Track 10"
4. Skip to the next/previous track:- "Alexa, next/ previous track"
5. Pause:- "Alexa pause" or "Alexa stop"
6. Resume playback:- "Alexa resume" 
7. Find out what is playing by asking "Alexa ask Youtube what's playing" - this will also tell you your data usage
8. Turn Autoplay of the next video on/off:- "Alexa turn autoplay on/off" 
8. Loop the current playlist:- "Alexa Loop On/Off"
9. Shuffle mode On/Off:- "Alexa shuffle On/Off"
10. Start the track currently playing fromt he beginning:- "Alexa Start Over"
11. Get a list of these commands in the Alexa app: - "Alexa ask Youtube for help"
12. Increase the data limit (this will allow the skill to incur data charges from AWS):- "Alexa, ask youtube to increase the data limit"
13. Reset the data limit to default of 1000MB:- "Alexa, ask youtube to reset the data limit"

Following a search request, the skill produces an Alexa App card which lists upto 25 results and shows the track that is currently playing. This card is not produced when the next track plays unless the "next" command is used or you ask what is playing

The skill will filter out any tracks longer than 7 hours as there isn't sufficient space in lambda to process them.

![alt text](screenshots/skill_card.jpeg)

## AWS CHARGES

This skill has to transfer **a lot** of data around which Amazon charges for. The first 1 Gigabyte of data transfer per month is free after which Amazon will charge $0.09 per GB.
The skill will  **try** to prevent you from going over 1000MB in a calender month (this is not a full 1GB but leaves some additonal headroom for for other skills) and will stop playing any further audio unless you specifcally ask the skill to increase the data limit by saying:-

"Alexa, ask youtube to increase the data limit"

You will then need to give the authorisation code which is:-

    ```
    ZERO ZERO ZERO DESTRUCT ZERO
    ```

This will then add an additonal 1000MB to the data limit. You can repeat this process to increase the data limit by 1000MB increments.

The Now Playing Card in the Alexa app will tell you the data that you have used to date for the current month along with an estimated cost in US dollars if you have exceed the free usage.


** NOTE - The app can only track it's own data usage. If you run other skills on AWS then these will also contribute towards usage limits. You can cheack your usage at any time by visiting:- **

https://console.aws.amazon.com/billing/home?#/


The data limit can be reset to it's default at any time with the command:-

"Alexa, ask youtube to reset the data limit"

This will prevent any further charges if you are already over the default limit


You can increase the default data limit and AWS cost rates by setting the following environment variables:-

|Key           |Description            |Possible Values| Default Value (if variable is not set)|
|--------------| ----------------------|---------------|----------------------------|
|CHARGE_PER_GIG|This is the AWS EC2 charge per GB for the first 10 TB / month data transfer out beyond the global free tier|Cost in dollars per GB|0.090| 
|MAX_DATA|The size of the data limit in bytes|size in bytes|1048576000|


**IF PAYING AWS CHARGES IS NOT ACCEPTABLE TO YOU THEN PLEASE DO NOT INSTALL THIS SKILL**


## TECHNICAL

The mpeg4 aac DASH audio stream URL provided by the API is read using YTDL-core, rewrapped into a seekable MP4 file using FFMPEG and the resulting audio is temporarily cached into dropbox in order for Alexa to play the stream. 

The skill creates a folder in your dropbox called youtube-skill, into which it writes 2 files, audio.mp4 which contains the audio to be played by Alexa and settings.json which holds the skills settings between sessions. 

Each time a track plays, the skill overwrites audio.mp4 and creates a unique public URL which is sent to the Echo device. No other files are made public (infact the skill is setup to only be able to access files and folders that it has created).

**NOTE - you might want to exclude the "youtube-skill" folder from your Selective Sync settings on any desktop machines to stop any annoying notifications popping up each time a song plays!**

## COMMON ISSUES **PLEASE CHECK THESE BEFORE RAISING AN ISSUE**

1. "Error: There was a problem with your request: Unknown slot type 'SEARCH' for slot 'search' " - You didn't hit the "ADD" button under Custom Slot Types.
2. I keep getting an error when I go to create function in the Lambda page: Signature expired: 20170612T135832Z is now earlier than 20170612T142721Z (20170612T143221Z - 5 min.) - See the note on step 13 of the AWS Lambda Setup on how to fix this
3. When I ask Alexa to open Youtube she says: "I got an error from the Dropbox API". You have probably copied over your Dropbox Token incorrectly - make sure you have no extra spaces
4. When I ask Alexa to open Youtube she says: "I got an error from the Youtube API". You have probably copied over your Youtube API key incorrectly - make sure you have no extra spaces
5. Sometimes I get no sound or some strange warbling sounds - The track is encoded in a way that isn't playable by Alexa - just skip this track.
6. I keep get annoying popups from Dropbox on my desktop saying files have changes each time I use the skill - Exclude the "youtube-skill" folder from your Selective Sync settings in the dropbox app.



## SETUP INSTRUCTIONS (TEXT)

## Get a Youtube API Key and Dropbox Token

1. Create a youtube api key using the instructions here:-
https://elfsight.com/blog/2016/12/how-to-get-youtube-api-key-tutorial/

Save it to a notepad file and do not share this with anyone else!!!

2. Create a dropbox access token using the instructions here:-
http://www.iperiusbackup.net/en/create-dropbox-app-get-authentication-token/

Again, save it to a notepad file and do not share this with anyone else!!!


**The rest of these instructions are modified from tartan_guru's Google Assistant skill (https://github.com/tartanguru/alexa-assistant)**

## Download code from github

1. Click on the green "Clone or download" button just under the yellow bar
2. Click download ZIP
3. Unzip the file (it will be called alexa-youtube-master.zip) to a known place on your hard-drive (suggest root of C: drive in Windows to avoid problems with long filenames)

## AWS Lambda Setup

1. Go to http://aws.amazon.com/. You will need to set-up an AWS account (the basic one will do fine) if you don't have one already. Make sure you use the same Amazon account that your Echo device is registered to. **Note - you will need a credit or debit card to set up an AWS account - there is no way around this. Please see the AWS Charges section above**

2.  Go to the drop down "Location" menu at the top right and ensure you select US-East (N. Virginia) if you are based in the US or EU(Ireland) if you are based in the UK or Germany. This is important as only these two regions support Alexa. NOTE: the choice of either US or EU is important as it will affect the results that you get. The EU node will provide answers in metric and will be much more UK focused, whilst the US node will be imperial and more US focused.

![alt text](screenshots/lambda_region.jpg)

1. Select Lambda from the AWS Services menu at the top left
2. Click on the "Create a Lambda Function" or "Get Started Now" button.
3. Select "Blank Function" - this will automatically take you to the "Configure triggers" page.

![alt text](screenshots/blueprint.jpeg)

4. Click the dotted box and select "Alexa Skills Kit" (NOTE - if you do not see Alexa Skill Kit as an option then you are in the wrong AWS region). 

![alt text](screenshots/triggers.jpeg)

5. Click Next 

![alt text](screenshots/trigger_ASK.jpeg)

5. Name the Lambda Function :-

    ```
    youtube
    ```
    
5. Set the decription as :-

    ```
    Youtube
    ```
    
6. Select the default runtime which is currently "node.js 6.10".
7. Select Code entry type as "Upload a .ZIP file". 

![alt text](screenshots/lambda_1.jpeg)

7. Click on the "Upload" button. Go to the folder where you unzipped the files you downloaded from Github, select index.zip and click open. Do not upload the alexa-assistant-master.zip you downloaded from Github - only the index.zip contained within it.
8. Enter the following into the Environment Variables Section (If you are pasting in the API Key and Toekn then make sure you have no extra spaces: -

|Key           | Value|
|--------------| -----|
|API_KEY|(Put the Google API key in here)|
|DROPBOX_TOKEN|(Put the Dropbox token in here)|

![alt text](screenshots/environment_variables.jpeg) 

9. Keep the Handler as "index.handler" (this refers to the main js file in the zip).
10. Under Role - select "Create a custom role". This will automatically open a new browser tab or window.

![alt text](screenshots/new_role.jpeg)

11. Switch to this new tab or window. 
11. Under IAM Role select "Create a new IAM Role"
11. Then press the blue "Allow" box at the bottom right hand corner. The tab/window will automatically close.
11. You should now be back on the Lambda Management page. The Role box will have automatically changed to "Choose an existing role" and Role we just created will be selected under the "Existing role" box.

![alt text](screenshots/existing_role.jpeg)

12. Under Advanced Settings set Memory (MB) to 384 and change the Timeout to 1 minute 0 seconds

![alt text](screenshots/advanced_settings.jpeg)

13. Click on the blue "Next" at the bottom of the page and review the settings then click "Create Function". This will upload the index.zip file to Lambda. This may take a number of minutes depending on your connection speed. **NOTE - If the creation process takes more than five minutes or produces an error similar to "Signature expired: 20170612T135832Z is now earlier than 20170612T142721Z (20170612T143221Z - 5 min.)" then this is due to having a slow internet upload speed.  You'll need to upload the zip file via S3 instead. Go here:- https://console.aws.amazon.com/s3/home. Create a bucket - call it whatever you want. You can then upload the index.zip to that S3 bucket. Once it's uploaded use the "Upload a file from S3" rather than the "Upload a zip " option in the lambda setup.Delete the zip file from S3 once you have finished with it to avoid S3 charges**

![alt text](screenshots/review_function.jpeg)

14. Copy the ARN from the top right to be used later in the Alexa Skill Setup (it's the text after ARN - it won't be in bold and will look a bit like this arn:aws:lambda:eu-west-1:XXXXXXX:function:youtube). Hint - Paste it into notepad or similar.

## Alexa Skill Setup

1. In a new browser tab/window go to the Alexa Console (https://developer.amazon.com/edw/home.html and select Alexa on the top menu)
1. If you have not registered as an Amazon Developer then you will need to do so. Fill in your details and ensure you answer "NO" for "Do you plan to monetize apps by charging for apps or selling in-app items" and "Do you plan to monetize apps by displaying ads from the Amazon Mobile Ad Network or Mobile Associates?"

![alt text](screenshots/payment.jpeg)

1. Once you are logged into your account go to to the Alexa tab at the top of the page.
2. Click on the yellow "Get Started" button under Alexa Skills Kit.

![alt text](screenshots/getting_started.jpeg)

3. Click the "Add a New Skill" yellow box towards the top right.

![alt text](screenshots/add_new_skill.jpeg)

4. You will now be on the "Skill Information" page.
5. Set "Custom Interaction Model" as the Skill type
6. Select the language as English (US), English (UK) - **Note German is not currently supported**
6. Set the "Name" to 

    ```
    Youtube Skill for Alexa
    ```
    
8. Set the "Invocation Name" to 

    ```
    youtube
    ```
8. Set the "Audio Player" setting to "Yes"
8. Leave the other settings in Global Fields set to "No'
9. Click "Save" and then click "Next".

![alt text](screenshots/skill_information.jpeg)

10. You will now be on the "Invocation Model" page.
11. Copy the text below into the "Intent Schema" box - Ignore the "Built-in intents for playback control box above"

    ```
    {
      "intents": [
        {
          "intent": "AMAZON.ResumeIntent"
        },
        {
          "intent": "AMAZON.PauseIntent"
        },
        {
          "intent": "AMAZON.StopIntent"
        },
        {
          "intent": "AMAZON.NextIntent"
        },
        {
          "intent": "AMAZON.CancelIntent"
        },
        {
          "intent": "AMAZON.LoopOffIntent"
        },
        {
          "intent": "AMAZON.LoopOnIntent"
        },
        {
          "intent": "AMAZON.PreviousIntent"
        },
        {
          "intent": "AMAZON.RepeatIntent"
        },
        {
          "intent": "AMAZON.ShuffleOffIntent"
        },
        {
          "intent": "AMAZON.ShuffleOnIntent"
        },
        {
          "intent": "AMAZON.StartOverIntent"
        },
        {
          "intent": "AMAZON.HelpIntent"
        },
        {
          "slots": [
            {
              "name": "search",
              "type": "SEARCH"
            }
          ],
          "intent": "SearchIntent"
        },
        {
          "slots": [
            {
              "name": "number",
              "type": "AMAZON.NUMBER"
            }
          ],
          "intent": "NumberIntent"
        },
        {
          "intent": "NowPlayingIntent"
        },
        {
          "intent": "AutoOn"
        },
        {
          "intent": "AutoOff"
        },
        {
          "intent": "DestructCode"
        },
        {
          "intent": "RaiseLimit"
        },
        {
          "intent": "ResetLimit"
        }
      ]
    }
    ```
![alt text](screenshots/intent_schema.jpeg)

12. Under Custom Slot Types:-
13. Type into the "Enter Type" field (NOTE - this is captialised) :-
    ```
    SEARCH
    ```
    
14. Copy the text below and paste into the "Enter Values" box and then click "Add" (NOTE you must click ADD)

    ```
    prince
    the fray
    the rolling stones
    toad the wet sproket
    KC and the sunshine band
    john travolta and olivia newton john
    DJ jazzy jeff and the fresh prince
    lola
    hello dolly
    love me tender
    fools gold
    roberta flack killing me softly with his song
    stevie wonder superstition
    boston
    full circle
    dubstar
    underworld
    orbital
    let me be your fantasy
    pop will eat itself
    ultra nate
    4 hours Peaceful and Relaxing Instrumental Music
    ```
![alt text](screenshots/slot_types.jpeg)
Credit to https://github.com/rgraciano/echo-sonos/blob/master/echo/custom_slots/NAMES.slot.txt for some of these

15. Copy the text below and paste them into the Sample Utterances box.

    ```
    SearchIntent play {search}
    SearchIntent find {search}
    SearchIntent play some {search}
    SearchIntent play me some {search}
    SearchIntent videos by {search}
    SearchIntent me videos by {search}
    SearchIntent music by {search}
    SearchIntent me music by {search}
    NumberIntent {number}
    NumberIntent play number {number}
    NumberIntent play track {number}
    NumberIntent play track number {number}
    NowPlayingIntent what's playing
    NowPlayingIntent what song is this
    NowPlayingIntent what is this
    NowPlayingIntent what song is playing
    NowPlayingIntent what's this song
    AutoOn turn autoplay on
    AutoOn autoplay on
    AutoOff turn autoplay off
    AutoOff autoplay off
    DestructCode zero zero zero destruct zero
    RaiseLimit increase the data limit
    RaiseLimit raise the data limit
    RaiseLimit raise the limit
    ResetLimit reset the data limit
    ResetLimit reset the limit
    ```
![alt text](screenshots/utterances.jpeg) 

16. Click "Save" and then "Next".
17. You will now be on the "Configuration" page.
18. Select "AWS Lambda ARN (Amazon Resource Name)" for the skill Endpoint Type.
19. Then pick the most appropriate geographical region (either US or EU as appropriate) and paste into the box (highlighted in red in the screenshot) the ARN you copied earlier from the AWS Lambda setup.
20. Select "No" for Account Linking and leave everything under permissions unchecked
14. Click "Save" and then "Next".
![alt text](screenshots/endpoint.jpeg) 
15. There is no need to go any further through the process i.e. submitting for certification. You can test the skill by typing a search into the Service Simulator filed e.g. "play some cat videos" NOTE- the actual audio from youtube won't play in the simulator





