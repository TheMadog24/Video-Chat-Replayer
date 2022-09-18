'use strict'

/*

The JSON data is loaded in to the field "chatJson".

There are three primary arryas that we must process:

    chatJson.comments - Array of chat messages
    chatJson.emotes.thirdParty - Array of emotes
    chatJson.emotes.firstParty - Array of emotes

Sample of one data element:


"comments": [{

}]

"thirdParty": [{
                "id": "54fa8f1401e468494b85b537",
                "imageScale": 2,
                "data": "iVBORw0K ... 5ErkJggg==",
                "name": ":tf:"
            }]

"firstParty": [{
                "id": "305941527",
                "imageScale": 1,
                "data": "iVBORw0K ... VORK5CYII="
            }]


*/
var enableStats = true;

var emotesThirdParty = {};
var emotesFirstParty = {};

function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	var chatNode = document.querySelector('#chat');
	var chatJson;

    var currentChatPos = -1;
    var maxChatMessages = 150;
    
    


	var displayMessage = function (message, isError) {
		var element = document.querySelector('#message');
			element.innerHTML = message;
			element.className = isError ? 'error' : 'info';
	}

	var playSelectedFile = function (event) {
		var file = this.files[0];
		var type = file.type;
		
		var canPlay = videoNode.canPlayType(type);
		if (canPlay === '') canPlay = 'no';
		var message = 'Successfully Loaded "' + type + '" '
		var isError = canPlay === 'no';
		displayMessage(message, isError);

		if (isError) {
			return;
		}

		var fileURL = URL.createObjectURL(file);
		videoNode.src = fileURL;

	}
	
	var loadChat = function(event) {
        var input = event.target;

        var reader = new FileReader();

        var timingLoadStart = window.performance.now();
        reader.onload = function(){
		  chatJson = JSON.parse(reader.result);
		  initChat(timingLoadStart);
        };
        
        reader.readAsText(input.files[0]);
    };
    
    /**
     * This function will setup the chat JSON data and the emote maps.
     * 
     * During the processing, this function will also collect some basic 
     * stats which can be used to evalutate the impact of size of this
     * data to help design better performing code without going overboard.
     * 
     * NOTE: Firefox is unable to provide nano second timings with the 
     *       performance.now() since it's a security issue to protect 
     *       against fingerprinting and timing attacks. Use chrome for 
     *       actual nano timings if needing to evaluate actual performance.
     * 
     * @param {*} timingLoadStart The micro milisecod timeing of when the JSON data
     *                            was starting to load in to memory.
     */
    function initChat( timingLoadStart ) {
        var timingLoadMs = window.performance.now() - timingLoadStart;

        // chatJson.comments - Array of chat messages
        var chatSize = chatJson.comments.length;
        var timingReadChatStart = window.performance.now();
        var maxTime = 0;
        // Timings: 32,089 recs takes about 3.2 ms
        jQuery.each( chatJson.comments, function(index, msg) {
            if ( maxTime < msg.content_offset_seconds ) {
                maxTime = msg.content_offset_seconds;
            }
        });
        var timingReadChatMs = window.performance.now() - timingReadChatStart;
        
        // chatJson.emotes.thirdParty - Array of emotes
        var thirdParySize = chatJson.emotes.thirdParty.length;
        var timingReadThirdPartyStart = window.performance.now();
        // Timeings: 101 recs less than 1 ms
        jQuery.each( chatJson.emotes.thirdParty, function(index, emote) {
            emotesThirdParty[emote.name] = emote;
            if ( emote.name === "testIgnore" ) {
            }
        });
        var timingReadThirdPartyMs = window.performance.now() - timingReadThirdPartyStart;
        
        // chatJson.emotes.firstParty - Array of emotes
        var firstParySize = chatJson.emotes.firstParty.length;
        var timingReadFirstPartyStart = window.performance.now();
        // Timeings: 622 recs less than 1 ms
        jQuery.each( chatJson.emotes.firstParty, function(index, emote) {
            emotesFirstParty[emote.id] = emote;
            if ( emote.id === 99199099199 ) {
            }
        });
        var timingReadFirstPartyMs = window.performance.now() - timingReadFirstPartyStart;

        if ( enableStats ) {
            
            console.log("## videoChatPlayer JSON stats: \n" +
                "##    JSON load time: " + timingLoadMs + " ms \n" +
                "##    messages: " + chatSize + " recs  " + 
                    "readTime: " + timingReadChatMs + " ms  " +
                    "maxVideoTime: " + maxTime + " secs\n" +
                "##    thirdParty: " + thirdParySize + " recs  " + 
                    "readTime: " + timingReadThirdPartyMs + " ms\n" +
                "##    firstParty: " + firstParySize + " recs  " + 
                    "readTime: " + timingReadFirstPartyMs + " ms\n"
                    );
        }    


    }

    var getChatId = function(commentIndex) {
        return "chatId" + commentIndex.toString();
    }

    var updateChat = function(event) {
		if(chatJson == null) return;

        $( "#message" ).removeClass("animate").fadeOut( 5000, "linear" );

		let currentTime = videoNode.currentTime;
 
        updateCountersProgressBar();

        var messagePos = messageSeek( currentTime, currentChatPos );
        
        removeObsoleteMessages( messagePos );

        addNewMessages( messagePos );

   }

    /**
     * This function will update the two video counters with the
     * current time and also the duration of the video. It will also
     * update the progress bar too.
     */
    function updateCountersProgressBar() {

        let currentTime = videoNode.currentTime;
        let duration = videoNode.duration;
        let percent = duration == 0 ? 0 : currentTime / duration * 100;

        // Update the counters and progress bar:
        $("#videoCounter").text( formatVideoCounter( currentTime ));
        $("#videoDuration").text( formatVideoCounter( duration ));

        $(".progress-bar .bar").css({"width": (percent + "%")});
    }

   /**
    * This function will take the current chatPosition within the 
    * chatJson.comments array and will seek either forward or backwards 
    * to find the correct location to start processing for the next
    * chat message that needs to be displayed.
    * 
    * @param {*} currentTime The video's current time position
    * @param {*} chatPos The last active position in the chatJson.comments array
    * @returns The correct position in the chatJson.commments array to start processing from
    */
   function messageSeek( currentTime, chatPos ) {

        var len = chatJson.comments.length;

        while ( len > 0 && chatPos < len ) {
            
            // If currentTime < curPos :: must step backwards
            if ( chatPos < len && chatPos > 0 &&
                    currentTime < chatJson.comments.at(chatPos).content_offset_seconds ) {

                chatPos--;
            }
            
            // if currentTime > curPos :: must step forwards
            else if ( (chatPos + 1) < len && (chatPos + 1 ) >= 0 &&
                   currentTime > chatJson.comments.at(chatPos + 1).content_offset_seconds ) {

                chatPos++;
            }

            // We got the current message record so exit:
            else {
                break;
            }
        }

        return chatPos;
    }

    /**
    * This function will remove from #chat any message that is farther away
    * than 100 positions from the current messagePos, or any message that 
    * has a position greater than the current position.
    * 
    * @param {*} messagePos 
    */
    function removeObsoleteMessages( messagePos ) {
        var messages = $("#chat > .chatline");
        messages.each( function(index) {
            var node = $( this );
            var position = Number.parseInt( node.attr( "data-pos" ));
            if ( position < (messagePos - maxChatMessages) || position > messagePos ) {
                node.remove();
            }
        });
    }

    /**
     * This function will add a new message, if it already is not in the #chat
     * display, at the bottom of the listing.
     * 
     * @param {*} messagePos 
     */
    function addNewMessages( messagePos ) {

        var curPos = messagePos;

        while ( curPos >= 0 && messagePos - curPos < maxChatMessages ) {

            if ( !$("#chat #" + getChatId(curPos)).length ) {
                var msg = chatJson.comments.at( curPos );
                
                // Add the next comment to the #chat pane:
                let chatLine = $("<div>")
                        .attr( "id", getChatId(curPos) )
                        .attr( "data-pos", curPos )
                        .addClass("chatline flex");
    
                let chatTime = renderChatTime( msg );
                let chatBody = renderChatBody( msg );
    
                chatLine.append( chatTime );
                chatLine.append( chatBody );
    
                if ( curPos == messagePos ) {
                    chatLine.appendTo( "#chat" );
                }
                else {
                    chatLine.insertBefore( "#" + getChatId(curPos+1) );
                }
                
                chatNode.scrollTop = chatNode.scrollHeight;
            }
            curPos--;
        }

    }
  
  var inputNodeVideo = document.querySelector('#vidinput');
  var inputNodeChat = document.querySelector('#jsoninput');
  inputNodeVideo.addEventListener('change', playSelectedFile, false);
  inputNodeChat.addEventListener('change', loadChat, false);
  videoNode.addEventListener('timeupdate', updateChat, false);

    $("#chat").on("click", ".chattime", function() {
        var timeSecond = $( this ).attr("data-time");
        if ( timeSecond ) {
            timeSecond = Number( timeSecond );
        }
        videoNode.currentTime = timeSecond;
    });

    $(".custom-controls #playpause").on("click", function() {
        var isPlay = $(this).hasClass("play");

        $(this).toggleClass("play pause");

        if ( isPlay ) {
            videoNode.play();
            $("#message").text("");
        }
        else {
            videoNode.pause();
        }

    });

    $(".custom-controls #stop").on("click", function() {

        $("#playpause").removeClass("play pause");
        $("#playpause").addClass("play");

        videoNode.pause();
        if ( videoNode.currentTime ) {
            videoNode.currentTime = 0;
        }
    });
}

let TIME_MINUTE = 60;
let TIME_HOUR = TIME_MINUTE * 60;

function renderChatTime( comment ) {
    let timeSeconds = comment.content_offset_seconds;

    let timeHtml = formatElapsedTime( timeSeconds );

    let chatTime = $("<div>").addClass("chattime")
            .attr("data-time", timeSeconds.toString() )
            .attr("title", "Jump to video")
            .text( timeHtml );
    return chatTime;
}

function formatElapsedTime( timeSeconds ) {

    var seconds = timeSeconds; 
    var hours = Math.floor( seconds / TIME_HOUR );
    seconds -= (hours * TIME_HOUR);
    var mins = Math.floor( seconds / TIME_MINUTE );
    seconds -= (mins * TIME_MINUTE);

    seconds = Math.floor( seconds );
    
    var formatted = (hours > 0 ? pad(hours, 2) + ":" : "" ) +
        pad( mins, 2 ) + ":" +
        pad( seconds, 2 );

    return formatted;
}

function formatVideoCounter( timeSeconds ) {

    if ( typeof timeSeconds === 'undefined' ) {
        timeSeconds = 0;
    }
    else if ( timeSeconds.isNaN ) {
        return "--:--:--.000";
    }

    var seconds = timeSeconds; 
    var hours = Math.floor( seconds / TIME_HOUR );
    seconds -= (hours * TIME_HOUR);
    var mins = Math.floor( seconds / TIME_MINUTE );
    seconds -= (mins * TIME_MINUTE);

    var ms = (seconds - Math.floor( seconds )) * 1000;

    seconds = Math.floor( seconds );
    ms = Math.floor( ms );

    var formatted = pad(hours, 2) + ":" +
        pad( mins, 2 ) + ":" +
        pad( seconds, 2 ) + "." +
        pad( ms, 3 );

    return formatted;
}
function pad( num, size ) {
    var str = "00000" + num.toString();
    return str.substring( str.length - size );
}

function renderChatBody( comment ) {

    // comment.message.body;
    let message = extractMessageFragments( comment );
    
    let colorHex = comment.message.user_color;
    let styles = {"color": colorHex};
    
    let player = $("<span>").addClass("commenter")
            .css( styles )
            .text( comment.commenter.display_name );
    let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
    let chatBody = $("<div>").addClass("chatbody");
    chatBody.append( player );
    chatBody.append( messagePrefix );
    chatBody.append( message );
    
    return chatBody;
}

function extractMessageFragments( comment ) {
    
    let message = $("<span>").addClass( "chatmessage" ); 
            //.text( comment.message.body );

    jQuery.each( comment.message.fragments, function( index, fragment ) {
        
        var altName = fragment.text;
        if ( fragment.emoticon && fragment.emoticon.emoticon_id ) {
            message.append(
                makeEmoticon( fragment.emoticon.emoticon_id, altName ));
        }
        else {
            message.append(
                $('<span debug="extractMessageFragments">').text( altName ));
        }
        // else {
        //     message.append(
        //         $("<span> Error in extracting message fragments </span>")
        //             .addClass("error")
        //      );
        // }
    });

    return message;
}

function makeEmoticon( emoticonId, altName ) {
    var emote = emotesThirdParty[emoticonId];

    if ( !emote ) {
        emote = emotesFirstParty[emoticonId];
    }

    // Make the icon if we have an emote to work with:
    if ( emote && emote.data ) {
        var emoteImagePrefix = "data:image/png;base64,";

        var img = $("<img>").attr( "title", altName )
            .attr( "src", emoteImagePrefix + emote.data );
        return img;
    }

    return $('<span debug="makeEmotiocon">').text( altName );
}


//	Custom progress bar





//	Play & Pause Button








$(document).ready(function() {

    localFileVideoPlayer();
});
