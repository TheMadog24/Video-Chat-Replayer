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
var chatThemeMode = "dark"; // valid values: light, dark
var twitchEmoticonsUrl = "https://static-cdn.jtvnw.net/emoticons/v{{version}}/" +
            "{{id}}/{{format}}/{{theme_mode}}/{{scale}}.0";
var maxChatMessages = 150;


var emotesThirdParty = {};
var emotesFirstParty = {};

function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	//var chatNode = document.querySelector('#chat');
	var chatJson;

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
        // let duration = chatJson.video.end;
        let percent = duration == 0 ? 0 : currentTime / duration * 100;

        // Update the counters and progress bar:
        $("#videoCounter").text( formatElapsedTime( currentTime ));
        $("#videoDuration").text( formatElapsedTime( duration ));

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
                
                $("#chat").scrollTop( 10000 );
            }
            curPos--; 
        }
        
        setTimeout( () => {
            $("#chat").scrollTop( 10000 );
        }, 20);
    }
  
  var inputNodeVideo = document.querySelector('#vidinput');
  var inputNodeChat = document.querySelector('#jsoninput');
  inputNodeVideo.addEventListener('change', playSelectedFile, false);
  inputNodeChat.addEventListener('change', loadChat, false);
  videoNode.addEventListener('timeupdate', updateChat, false);

//	Custom Control Bar

//Mute Button Function

$('#volume').click(function(){
    if( $("#videoPlayer").prop('muted') ) {
          $("#videoPlayer").prop('muted', false); //unmuted
          $(".Volume-animated-speaker").show();
		  $(".Volume-animated-speaker-half").hide();
          $(".Volume-speaker-muted").hide();
		  videoNode.volume = (1);
		  newPercent = 100; 
		  moveSliderBar($bar, $fill, newPercent, barWidth);
			videoNode.volume = (newPercent / 100);
          //Set Volume Button icon
      // or toggle class, style it with a volume icon sprite, change background-position
    } else {
      $("#videoPlayer").prop('muted', true); //muted
          $(".Volume-animated-speaker").hide();
		  $(".Volume-animated-speaker-half").hide();
          $(".Volume-speaker-muted").show();
		  videoNode.volume = (0);
		  newPercent = 0;
		  moveSliderBar($bar, $fill, newPercent, barWidth);
			videoNode.volume = (newPercent / 100);
    }
});


//Volume Slider
$('#slider').on('mousedown', function(e) {
	if(e.which == 1) {
		var $bar = $('#bar');
		var $fill = $('#fill');
		var barWidth = $bar.outerWidth();
		var sliderWidth = $(this).outerWidth();
		var sliderX = $(this).offset().left;
		var downX = e.clientX - sliderX; 
		var multiplier = 100 / sliderWidth;
		var curPercent = downX * multiplier;
		moveSliderBar($bar, $fill, curPercent, barWidth);
		$(window).on('mousemove.slider', function(e) {
			var diffX = (e.clientX - sliderX) - downX;
			var newPercent = curPercent + (diffX * multiplier);
			if(newPercent <= 0) {
				newPercent = 0;
			}
			if (newPercent <= 50){
				$(".Volume-animated-speaker-half").show();
				$(".Volume-animated-speaker").hide();
				$(".Volume-speaker-muted").hide();				
			}
			if (newPercent > 50){
				$(".Volume-animated-speaker-half").hide();
				$(".Volume-animated-speaker").show();
				$(".Volume-speaker-muted").hide();				
			}
			if (newPercent <= 0){
				$(".Volume-animated-speaker-half").hide();
				$(".Volume-animated-speaker").hide();
				$(".Volume-speaker-muted").show();
				$("#videoPlayer").prop('muted', true)
			}
			if (newPercent > 0 && newPercent < 50){
				$(".Volume-animated-speaker-half").show();
				$(".Volume-animated-speaker").hide();
				$(".Volume-speaker-muted").hide();
				$("#videoPlayer").prop('muted', false)
			}
			if(newPercent >= 100) {
				newPercent = 100;
			}
			moveSliderBar($bar, $fill, newPercent, barWidth);
			videoNode.volume = (newPercent / 100); 
		})
		.on('mouseup.slider', function(e) {
			$(window).off('mousemove.slider mouseup.slider');
		});
	}
});

//Moves slider bar.
function moveSliderBar($bar, $fill, percent, barWidth) {
	$bar.css('left', 'calc('+percent+'% - '+(barWidth / 2)+'px)');
	$fill.css('width', 'calc('+percent+'% - '+(barWidth / 2)+'px)');
}




//	Custom Control Bar End




  // Draggable selector
  $( function() {
    $( ".barSelector" ).draggable({
    	axis: "x",
        containment: ".progress-bar",
        helper: "clone",
        appendTo: ".progress-bar",
        drag: function( event, ui ) {
            var width = $(".progress-bar").innerWidth();
            var pOffset = $(".bar").offset().left;
            var uiOffset = ui.offset.left;

            setVideotime( width, pOffset, uiOffset );
            
        },
        start: function( event, ui ) {
            $(".bar .barSelector").hide();
        },
        stop: function( event, ui ) {
            $(".bar .barSelector").show();
        }
    });

    $(".progress-bar").on("click", function( event ) {
        var node = $(this);
        var pagePostionLeft = event.pageX;
        var nodePositionLeft = node.position().left;
        var nodeOffsetLeft = node.offset().left;
        
        var width = $(".progress-bar").innerWidth();
        var pOffset = $(".bar").offset().left;

        var uiOffset = pagePostionLeft - nodePositionLeft - 
                    nodeOffsetLeft + pOffset;

        setVideotime( width, pOffset, uiOffset );

    });

  });
	

    function setVideotime( width, pOffset, uiOffset ) {
                    
        // To properly calculate adjFactor, uiOffset 
        // has to be at it's max value, trim to about
        // 5 decimal positions and add 0.00001:
        // var adjFactor = width / (uiOffset - pOffset) + 0.00001;
        var adjFactor = 1.01193;

        if ( uiOffset < pOffset ) {
            uiOffset = pOffset;
        }

        var offset = (uiOffset - pOffset);
        var percent = offset / width * adjFactor;
        
        let duration = videoNode.duration;
        let currentTime = parseInt(Math.floor(duration * percent), 10);
        if ( currentTime > duration ) {
            currenttime = duration;
        }
        videoNode.currentTime = currentTime;
        
        updateCountersProgressBar();
    }

//	Custom Control Bar

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
    // chatBody.append( makeUserBadges( comment ) );
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

        var imageScaleClass = "chat-image-scale-" + emote.scale;
        var img = $("<img>").attr( "title", altName )
            .addClass( imageScaleClass )
            .attr( "src", emoteImagePrefix + emote.data );
        return img;
    }

    return $('<span debug="makeEmotiocon">').text( altName );
}

function makeUserBadges( comment ) {
    var userBadges = $("<span>").addClass("user-badges");
    if ( comment.message.user_badges ) {
        var url = twitchEmoticonsUrl
                    .replace("{{format}}","static")
                    .replace("{{theme_mode}}", chatThemeMode);
        // .replace("{{id}}", id)

        jQuery.each( comment.message.user_badges, function(index, badge) {
            var imgSrc = url.replace("{{id}}", badge._id)
                            .replace("{{version}}", badge.version)
                            .replace("{{scale}}", (badge.scale ? badge.scale : "1"));
            var badgeImg = $("<img>").attr("src", imgSrc);
        });
    }
    return userBadges;
}





//	Play & Pause Button








$(document).ready(function() {

    localFileVideoPlayer();
});
