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

function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	var chatNode = document.querySelector('#chat');
	var chatJson;

    var emotesThirdParty = {};
    var emotesFirstParty = {};
    
    var currentChatPos = -1;
    
    


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
        if ( enableStats ) {
            // if enableStats is not enabled, then don't waste time getting a
            // read count since it won't be printed to the log.
            jQuery.each( chatJson.comments, function(index, msg) {
                if ( maxTime < msg.content_offset_seconds ) {
                    maxTime = msg.content_offset_seconds;
                }
            });
        }
        var timingReadChatMs = window.performance.now() - timingReadChatStart;
        
        // chatJson.emotes.thirdParty - Array of emotes
        var thirdParySize = chatJson.emotes.thirdParty.length;
        var timingReadThirdPartyStart = window.performance.now();
        jQuery.each( chatJson.emotes.thirdParty, function(index, emote) {
            emotesThirdParty[emote.name] = emote;
            if ( emote.name === "testIgnore" ) {
            }
        });
        var timingReadThirdPartyMs = window.performance.now() - timingReadThirdPartyStart;
        
        // chatJson.emotes.firstParty - Array of emotes
        var firstParySize = chatJson.emotes.firstParty.length;
        var timingReadFirstPartyStart = window.performance.now();
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

		let currentTime = videoNode.currentTime;
        let duration = videoNode.duration;
        let percent = duration == 0 ? 0 : currentTime / duration * 100;

        $("#videoCounter").text( formatVideoCounter( currentTime ));
        $("#videoDuration").text( formatVideoCounter( duration ));

        $(".progress-bar .bar").css({"width": (percent + "%")});

        var len = chatJson.comments.length;

        while ( len > 0 ) {
            
            var nextPos = currentChatPos + 1;
            var nextChat = nextPos < len ? chatJson.comments[nextPos] : null;
    
            // Check for delete:
            if ( currentChatPos >= 0 && 
                    currentChatPos < len &&
                    currentTime < chatJson.comments[currentChatPos].content_offset_seconds ) {

                // Delete currentChatpos since currentTime is less than this chat's time:
                var chatId = getChatId(currentChatPos);
                $("#" + chatId).remove();
                chatNode.scrollTop = chatNode.scrollHeight;
    
                currentChatPos--;
            }
            else if ( nextChat && currentTime >= nextChat.content_offset_seconds ) {
                
                // Add the next comment to the #chat pane:
                let chatLine = $("<div>")
                            .attr( "id", getChatId(nextPos) )
                            .addClass("chatline flex");
        
                let chatTime = renderChatTime( nextChat );
                let chatBody = renderChatBody( nextChat );
        
                chatLine.append( chatTime );
                chatLine.append( chatBody );
        
                chatLine.appendTo( "#chat" );
                chatNode.scrollTop = chatNode.scrollHeight;
    
                currentChatPos++;
            }
            else {
                break;
            }
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

    let colorHex = comment.message.user_color;
    let styles = {"color": colorHex};

    let player = $("<span>").addClass("commenter")
            .css( styles )
            .text( comment.commenter.display_name );
    let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
    let message = $("<span>").addClass( "chatmessage" ).text( comment.message.body );
    let chatBody = $("<div>").addClass("chatbody");
    chatBody.append( player );
    chatBody.append( messagePrefix );
    chatBody.append( message );

    return chatBody;
}





//	Custom progress bar





//	Play & Pause Button








$(document).ready(function() {

    localFileVideoPlayer();
});
