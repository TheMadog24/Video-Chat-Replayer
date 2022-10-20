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

var chatOffsetAdjustment = 0;
var chatOffsetPlusMinus = "+";




var emotesThirdParty = {};
var emotesFirstParty = {};

function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	var PreviewVid = document.querySelector('#previewVid');
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
		PreviewVid.src = fileURL;
		


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
		updateCountersProgressBar();
		
		if(chatJson == null) return;

        $( "#message" ).removeClass("animate").fadeOut( 5000, "linear" );

		let currentTime = videoNode.currentTime;

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
                    currentTime < 
                      (chatJson.comments.at(chatPos).content_offset_seconds + chatOffsetAdjustment) ) {

                chatPos--;
            }
            
            // if currentTime > curPos :: must step forwards
            else if ( (chatPos + 1) < len && (chatPos + 1 ) >= 0 &&
                   currentTime > 
                    (chatJson.comments.at(chatPos + 1).content_offset_seconds + chatOffsetAdjustment) ) {

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
                
                $("#chat").scrollTop($("#chat")[0].scrollHeight);
            }
            curPos--; 
        }
        
        setTimeout( () => {
            $("#chat").scrollTop($("#chat")[0].scrollHeight);
        }, 20);
    }
  
  var inputNodeVideo = document.querySelector('#vidinput');
  var inputNodeChat = document.querySelector('#jsoninput');
  inputNodeVideo.addEventListener('change', playSelectedFile, false);
  inputNodeChat.addEventListener('change', loadChat, false);
  videoNode.addEventListener('timeupdate', updateChat, false);


$('.selector').change(function(){
			var optionSelected = $("option:selected", this);
			var valueSelected = this.value;
			maxChatMessages = valueSelected;
			updateChat();
		});
//	Custom Control Bar Starts


//Mute Button Function
var savedVol = 100
$('#volume').click(function(){
    if( $("#videoPlayer").prop('muted') ) {
          $("#videoPlayer").prop('muted', false); //unmute
          $(".Volume-animated-speaker").show();
		  $(".Volume-animated-speaker-half").hide();
          $(".Volume-speaker-muted").hide();
		  videoNode.volume = (savedVol / 100);
		  $('#bar').css('left', 'calc('+savedVol+'% - 9.5px)');
		  $('#fill').css('width', 'calc('+savedVol+'% - 9.5px)');
          //Set Volume Button icon
      // or toggle class, style it with a volume icon sprite, change background-position
    } else {
      $("#videoPlayer").prop('muted', true); //mute
          $(".Volume-animated-speaker").hide();
		  $(".Volume-animated-speaker-half").hide();
          $(".Volume-speaker-muted").show();
		  videoNode.volume = 0;
		  $('#bar').css('left', 'calc(0% - 9.5px)');
		  $('#fill').css('width', 'calc(0% - 9.5px)');
    }
});


//Volume Slider Starts
$('.slider-container').on('mousedown', function(e) {
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
		$(window).on('mousemove.slider-container', function(e) {
			var diffX = (e.clientX - sliderX) - downX;
			var newPercent = curPercent + (diffX * multiplier);

			moveSliderBar($bar, $fill, newPercent, barWidth);
/* 			videoNode.volume = (newPercent / 100); 
			savedVol = newPercent; */
		})
		.on('mouseup.slider-container', function(e) {
			$(window).off('mousemove.slider-container mouseup.slider-container');
      
		});
	}
});


//Moves slider bar.
function moveSliderBar($bar, $fill, percent, barWidth) {
	var VolumeFull = $(".Volume-animated-speaker");
	var VolumeHalf = $(".Volume-animated-speaker-half");
	var VolumeMuted = $(".Volume-speaker-muted");
	var Vid = $("#videoPlayer");

  if(percent <= 0) {
    percent = 0;
    VolumeHalf.hide();
    VolumeFull.hide();
    VolumeMuted.show();
    Vid.prop('muted', true)
  }
  else if (percent <= 50){
    VolumeHalf.show();
    VolumeFull.hide();
    VolumeMuted.hide();
    Vid.prop('muted', false)
  }
  else if (percent > 0 && percent < 50){
    VolumeHalf.show();
    VolumeFull.hide();
    VolumeMuted.hide();
    Vid.prop('muted', false)
  }
  else {
    VolumeHalf.hide();
    VolumeFull.show();
    VolumeMuted.hide();
    if(percent > 100) {
      percent = 100;
    }
  }

	$bar.css('left', 'calc('+percent+'% - '+(barWidth / 2)+'px)');
	$fill.css('width', 'calc('+percent+'% - '+(barWidth / 2)+'px)');
	videoNode.volume = (percent / 100); 
	savedVol = percent;
}
//Volume Slider Ends



// Custom Player Overlay Start
	//Click video to Pause/Play
	$("#videoPlayer").on("click", function() {
		var isPlay = $(".custom-controls #playpause").hasClass("play");

        $(".custom-controls #playpause").toggleClass("play pause");

        if ( isPlay ) {
            videoNode.play();
            $("#message").text("");
        }
        else {
            videoNode.pause();
        }
	});


	//Shows Overlay on Pause
	videoNode.onpause = function() {
		$("#video-PausePlay-container").fadeIn(100);
		$(".custom-controls").fadeIn(100);
		
	}; 
	//Hides Overlay on Play
	videoNode.onplay = function() {
		$("#video-PausePlay-container").fadeOut(100);
		$(".custom-controls").fadeOut(200);
		$("#videoPlayer").removeClass("show-cursor");
		// $("#videoPlayer").delay(2000).queue(function(next){
			// $(this).removeClass("show-cursor");
			// next();
		// });
	}; 
	//Clicking on the overlay Plays the video and Hides the Overlay
	$("#video-PausePlay-container").on("click", function() {
		$("#video-PausePlay-container").fadeIn(100);
		var isPlay = $(".custom-controls #playpause").hasClass("play");
		$(".custom-controls #playpause").toggleClass("play pause");
		videoNode.play();
	});
// Custom Player Overlay Ends


	//Checks if Mouse is over Controls
	var isMouseOverControlls = false;
	$(".custom-controls").on("mouseover", function (event) {
		if ($('.progress-bar-container').is(":hover") || $('.buttons-container').is(":hover")){
			isMouseOverControlls = true;
		}
	});
	$(".custom-controls").on("mouseleave", function (event) {
		isMouseOverControlls = false;
	});


	//Shows controls when mouse enters video-container, and shows cursor
	$(".video-container").on("mousemove", function (event) {
		var CustomControls = $(".custom-controls");
		CustomControls.clearQueue();
		CustomControls.stop();
		CustomControls.fadeIn(50);
		$("#videoPlayer").addClass("show-cursor").fadeIn(100);
	});
	//Hides controls after 1 second, when mouse leaves video-container
	$(".video-container").on("mouseleave", function (event) {
		if ($("#videoPlayer").prop('paused') === false) {
			$(".custom-controls").delay(1000).fadeOut(500);
		}		
	});

	var moveTimer;
	$(".video-container").on("mousemove",function(){
		clearTimeout(moveTimer);
		
		moveTimer = setTimeout(function(){
			var vid = $("#videoPlayer");
			if (vid.prop('paused') === false) {
				vid.removeClass("show-cursor");
				$(".custom-controls").fadeOut(500);
			}
			else {
			}
			
		},5000)
	});
	


//Re-grab Paramiters on Window Resize Stars
$(window).on('resize', function(){
	//PreviewBox Follows Mouse Xaxis
	var innerDiv = $('#previewBox');
	var outerDiv = $('#videoPlayer');
	var outDim = outerDiv.offset();
	outDim.right = (outDim.left + outerDiv.width());
	$(document).on('mousemove', function(e) {
		var x = (e.clientX) - 90;
		var x_allowed = x >= outDim.left && x <= (outDim.right - innerDiv.width());
		if (x_allowed) {
		innerDiv.css({
		left: x + 'px'
	});
		} else {
		//fine tune tweaks
		if (x >= outDim.left) {
		innerDiv.css({
        left: outDim.right - innerDiv.width() + 'px',
		});
		}
		if (x <= (outDim.right - innerDiv.width())) {
		innerDiv.css({
		left: outDim.left + 'px',
		});
		}
		}
	});
});
$(window).on('resize', function(){
	//barSelector Follows Mouse Xaxis
	var innerClass = $('.timeSeekerBar');
	var outerClass = $('.progress-bar');
	var outClass = outerClass.offset();
	outClass.right = (outClass.left + outerClass.width());
	$(document).on('mousemove', function(e) {
	var xc = (e.clientX) - 0;
	var xc_allowed = xc >= outClass.left && xc <= (outClass.right - innerClass.width());
	if (xc_allowed) {
		innerClass.css({
		left: xc + 'px'
		});
	} else {
		//fine tune tweaks
		if (xc >= outClass.left) {
		innerClass.css({
			left: outClass.right - innerClass.width() + 'px',
		});
		}
		if (xc <= (outClass.right - innerClass.width())) {
		innerClass.css({
        left: outClass.left + 'px',
	});
		}
	}
	});
});
//Re-grab Paramiters on Window Resize Ends


//PreviewBox Follows Mouse Xaxis
var innerDiv = $('#previewBox');
var outerDiv = $('#videoPlayer');
var outDim = outerDiv.offset();
outDim.right = (outDim.left + outerDiv.width());
$(document).on('mousemove', function(e) {
  var x = (e.clientX) - 90;
  var x_allowed = x >= outDim.left && x <= (outDim.right - innerDiv.width());
  if (x_allowed) {
    innerDiv.css({
      left: x + 'px'
    });
  } else {
    //fine tune tweaks
    if (x >= outDim.left) {
      innerDiv.css({
        left: outDim.right - innerDiv.width() + 'px',
      });
    }
    if (x <= (outDim.right - innerDiv.width())) {
      innerDiv.css({
        left: outDim.left + 'px',
      });
    }
  }
});

//barSelector Follows Mouse Xaxis
var innerClass = $('.timeSeekerBar');
var outerClass = $('.progress-bar');
var outClass = outerClass.offset();
outClass.right = (outClass.left + outerClass.width());
$(document).on('mousemove', function(e) {
  var xc = (e.clientX) - 0;
  var xc_allowed = xc >= outClass.left && xc <= (outClass.right - innerClass.width());
  if (xc_allowed) {
    innerClass.css({
      left: xc + 'px'
    });
  } else {
    //fine tune tweaks
    if (xc >= outClass.left) {
      innerClass.css({
        left: outClass.right - innerClass.width() + 'px',
      });
    }
    if (xc <= (outClass.right - innerClass.width())) {
      innerClass.css({
        left: outClass.left + 'px',
      });
    }
  }
});



// Video Shortcut Keys

window.onkeydown = vidCtrl;

function vidCtrl(e) {
  const vid = document.querySelector('#videoPlayer');
  const key = e.code;

  if (key === 'ArrowLeft') {
    vid.currentTime -= 5;
    if (vid.currentTime < 0) {
      vid.pause();
      vid.currentTime = 0;
    }
  } else if (key === 'ArrowRight') {
    vid.currentTime += 5;
    if (vid.currentTime > vid.duration) {
      vid.pause();
      vid.currentTime = 0;
    }
  } else if (key === 'Space') {
    if (vid.paused || vid.ended) {
      vid.play();
    } else {
      vid.pause();
    }
  } else if (key === 'KeyM') {
	var VolumeFull = $(".Volume-animated-speaker");
	var VolumeHalf = $(".Volume-animated-speaker-half");
	var VolumeMuted = $(".Volume-speaker-muted");
	var Vid = $("#videoPlayer");
    if( Vid.prop('muted') ) {
          Vid.prop('muted', false); //unmute
          VolumeFull.show();
		  VolumeHalf.hide();
          VolumeMuted.hide();
		  videoNode.volume = (savedVol / 100);
		  $('#bar').css('left', 'calc('+savedVol+'% - 9.5px)');
		  $('#fill').css('width', 'calc('+savedVol+'% - 9.5px)');
          //Set Volume Button icon
      // or toggle class, style it with a volume icon sprite, change background-position
    } else {
      Vid.prop('muted', true); //mute
          VolumeFull.hide();
		  VolumeHalf.hide();
          VolumeMuted.show();
		  videoNode.volume = 0;
		  $('#bar').css('left', 'calc(0% - 9.5px)');
		  $('#fill').css('width', 'calc(0% - 9.5px)');
    } 
  }
}



// Show current Video Time On Bar Hover

	var TimeInSeconds = null;
	$(".progress-bar-container").on('mousemove', function(e) {
		//gets progressbar offset from left, where cursor is
		var progress = $(".progress-bar");
		var progressOffset = progress.offset();    
		var relX = e.pageX - progressOffset.left;
		//get width of progressbar
		var progressWidth = progress[0].offsetWidth;
		//Error Correction
		if (relX > progressWidth) {
			relX = progressWidth;
		}
		if (relX < 0) {
			relX = 0;
		}
		//calculate percentage
		var percentage = (100 * (relX / progressWidth));
		GetHoverTime(percentage);
	});
	//Gets video time based on mouse position
	function GetHoverTime(percentage) {
		// console.log(percentage);
		var calculatedTime = new Date(null);
		var video = $("#videoPlayer");
		video[0].HoverTime = video[0].duration * percentage / 100;
		var TimeInSeconds = video[0].HoverTime;
		// console.log(video[0].HoverTime);
		calculatedTime.setSeconds(video[0].HoverTime);
		var newTime = calculatedTime.toISOString().substr(11, 8);
		//console.log(TimeInSeconds);
		$("#timePreview").text(formatHoverTime(TimeInSeconds));
		showPreview(TimeInSeconds);
	}

function formatHoverTime(TimeInSeconds) {

    var seconds = TimeInSeconds; 
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

// Preview Start

	function showPreview(TimeInSeconds){
		$("#previewVid")[0].currentTime = TimeInSeconds;
	}

// function showPreview(TimeInSeconds) {
    // const canvas = document.createElement('canvas');

    // const context = canvas.getContext('2d');
    // if ( context ) {
    // videoNode.currentTime = TimeInSeconds;
    // setTimeout( function() {
        // context.drawImage(videoNode, 0, 0, 180, 100);
        // const url = canvas.toDataURL('image/jpeg');
        // var img = $('<url>').attr('src', url);
        // $('#thumb').html( img );
    // }, 200);
    // } 
// }


	
// Preview End

//PreviewBox Appears on Hover Only
	
	$(".progress-bar-container").on("mouseover", function(e) {
		$("#previewBox").fadeIn(100);
	});
	$(".progress-bar-container").on("mouseleave", function(e) {
		var PBox = $("#previewBox");
		PBox.clearQueue();
		PBox.fadeOut(10);
	});

//Disable on Page load
$( document ).ready(function() {
	$("#video-PausePlay-container").fadeOut(1);
	$(".custom-controls").fadeOut(1);
});


//Video player not loaded until video is loaded
	$("#videoPlayer")[0].addEventListener('loadeddata', (e) => {
		if ( $("#videoPlayer")[0].readyState === 4 ) {
			$("#videoPlayer").fadeIn(0);
			$(".custom-controls").fadeIn(200);
			$("#video-PausePlay-container").fadeIn(200);
			console.log("Video Loaded");
			updateCountersProgressBar();
		}
	});

	//Options menu Open/Close
	$("#clickOptions").click( function(e) {
		$("#optionsOverlay").show();
	});

	$("#optionsClose").click( function(e) {
		$("#optionsOverlay").hide();
	});
	$("#OptionsCover").click( function(e) {
		$("#optionsOverlay").hide();
	});




// Attmepting 2 at making the progressbar smooth


  // VIDEO PROGRESS BAR
  //when video timebar clicked
  var Rememberpause = true;
  var timeDrag = false; /* check for drag event */
  
  $(".progress-bar-container").on("mousedown", function(e) {
	var vid = $("#videoPlayer");
	var isVisible = $("#video-PausePlay-container").is(":visible");
	if (vid.prop('paused') === true) {
		// console.log("was paused");
		Rememberpause = true;
	}
	if (vid.prop('paused') === false) {
		// console.log("was not paused");
		Rememberpause = false;
	}	
	// $("#video-PausePlay-container").show();
	// console.log("shown");
	// console.log($("#video-PausePlay-container").is(":visible"));
	videoNode.pause();
	timeDrag = true;
    updatebar(e.pageX);
	
	setTimeout( function() {
		$("#video-PausePlay-container").hide();
	}, 1);
	// hideOverlay();
	// function hideOverlay() {
		// var vidPause = $("#video-PausePlay-container");
		// if ( isVisible ) {
			// console.log(( vidPause.is(":hidden") ) + "Before");
			// $("#video-PausePlay-container").hide();
			// console.log("hidden")
			// console.log(( vidPause.is(":hidden") ) + "After");
		// }
		// else {
			// console.log(( vidPause.is(":hidden") ) + "Before NO");
			// vidPause.hide();
			// console.log("hidden")
			// console.log(( vidPause.is(":hidden") ) + "After NO");
		// }
	// }
	
  });
  
  $(".progress-bar-container").on("mouseup", function(e) {
	var vid = $("#videoPlayer");
    if (timeDrag) {
      timeDrag = false;
      updatebar(e.pageX);
	  // console.log(Rememberpause);
	  if ( Rememberpause == true ) {
		  // console.log("detected pause");
		  $("#video-PausePlay-container").show();
	  }
	  if ( Rememberpause == false ) {
		  var controls = $(".custom-controls");
		  // console.log("DID NOT detect pause");
		  videoNode.play();
		  controls.stop;
		  controls.clearQueue();
		  controls.show();
	  } 
    }
  });
  $(".progress-bar-container").on("mousemove", function(e) {
    if (timeDrag) {
      updatebar(e.pageX);
    }
  });

function updatebar(x) {
	var $bar = $(".bar");
    var position = x - $(".bar").offset().left;
    var percentage = 100 * position / $(".progress-bar").width();
    if (percentage > 100) {
      percentage = 100;
    }
    if (percentage < 0) {
      percentage = 0;
    }
    $bar.css("width", percentage + "%");
    $("#videoPlayer")[0].currentTime = $("#videoPlayer")[0].duration * percentage / 100;
  }

// $(".progress-bar-container").on("mouseout", function(e) {
	// $(this).trigger("mouseup");
// });

//	Custom Control Bar End


//Reading video Metadata








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
    let timeSeconds = comment.content_offset_seconds + chatOffsetAdjustment;

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


// Restricts input for each element in the set of matched elements to the given inputFilter.
(function($) {
  $.fn.inputFilter = function(callback, errMsg) {
    return this.on("input keydown keyup mousedown mouseup select contextmenu drop focusout", function(e) {
      if (callback(this.value)) {
        // Accepted value
        if (["keydown","mousedown","focusout"].indexOf(e.type) >= 0){
          $(this).removeClass("input-error");
          this.setCustomValidity("");
        }
        this.oldValue = this.value;
        this.oldSelectionStart = this.selectionStart;
        this.oldSelectionEnd = this.selectionEnd;
      } else if (this.hasOwnProperty("oldValue")) {
        // Rejected value - restore the previous one
        $(this).addClass("input-error");
        this.setCustomValidity(errMsg);
        this.reportValidity();
        this.value = this.oldValue;
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
      } else {
        // Rejected value - nothing to restore
        this.value = "";
      }
    });
  };
}(jQuery));





   
   
$(document).ready(function() {

	
		$("#floatTextBox").inputFilter(function(value) {
		return /^-?\d*[.,]?\d*$/.test(value); }, "Numbers Only (decimal allowed)");

    localFileVideoPlayer();
		

	

});
