'use strict'


function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	var chatNode = document.querySelector('#chat');
	var chatJson;
    
    var currentChatPos = -1;
    
    
    function initChat() {

    }

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
        reader.onload = function(){
		  chatJson = JSON.parse(reader.result);
		  initChat();
		  
        };
        reader.readAsText(input.files[0]);
    };

    var getChatId = function(commentIndex) {
        return "chatId" + commentIndex.toString();
    }

    var updateChat = function(event) {
		if(chatJson == null) return;

		let currentTime = videoNode.currentTime;
        $("#videoCounter").text( formatVideoCounter( currentTime ));
        $("#videoDuration").text( formatVideoCounter( videoNode.duration ));

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
