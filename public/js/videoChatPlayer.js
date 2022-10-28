"use strict";

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
var twitchEmoticonsUrl =
  "https://static-cdn.jtvnw.net/emoticons/v{{version}}/" +
  "{{id}}/{{format}}/{{theme_mode}}/{{scale}}.0";
  
  //Chat Badges Links
  //Global
var twitchGlobalBadgeUrl =
  "https://badges.twitch.tv/v1/badges/global/display";
  //Channel
var twitchChannelBadgeUrl =
  "https://badges.twitch.tv/v1/badges/channels/{{streamerId}}/" +
  "display";
  
var maxChatMessages = 150;

var chatOffsetAdjustment = 0;

var emotesThirdParty = {};
var emotesFirstParty = {};


// Cheer RegEx: Need to repeat the same pattern with both look forward and look behind:
// var regExCheersFragments = "Cheer1\\b|Cheer10\\b|Cheer25\\b|Cheer100\\b|Cheer1000\\b|Cheer5000\\b|Cheer10000\\b|Cheer100000\\b";
var regExCheersFragments = "Cheer[0-9]{1,6}\\b";
var regExCheers =  new RegExp(
                        "((?=" + regExCheersFragments + ")|" + 
                        "(?<=" + regExCheersFragments + "))", "i");
						
//Regex for sub and resub
var regExSubResubFragments = ".{1,1000} subscribed (with Prime|at Tier \\d).";
var regExSubResub =  new RegExp(
                        "((?=" + regExSubResubFragments + ")|" + 
                        "(?<=" + regExSubResubFragments + "))", "i");
						
//Regex for subgift
var regExsubgiftFragments = ".{1,1000} gifted a Tier [0-9]{1,10}\\b sub to .{1,1000}";
var regExsubgift =  new RegExp(
                        "((?=" + regExsubgiftFragments + ")|" + 
                        "(?<=" + regExsubgiftFragments + "))", "i");
						
//Regex for submysterygift
var regExsubmysterygiftFragments = ".{1,1000} is gifting [0-9]{1,1000}\\b Tier [0-9]\\b Subs to .{1,1000}'s community!";
var regExsubmysterygift =  new RegExp(
                        "((?=" + regExsubmysterygiftFragments + ")|" + 
                        "(?<=" + regExsubmysterygiftFragments + "))", "i");




function localFileVideoPlayer() {
  var URL = window.URL || window.webkitURL;
  var videoNode = document.querySelector("video");
  var PreviewVid = document.querySelector("#previewVid");
  //var chatNode = document.querySelector('#chat');
  var chatJson;

  var currentChatPos = -1;

  var displayMessage = function (message, isError) {
    var element = document.querySelector("#message");
    element.innerHTML = message;
    element.className = isError ? "error" : "info";
  };

  var playSelectedFile = function (event) {
    var file = this.files[0];
    var type = file.type;

    var canPlay = videoNode.canPlayType(type);
    if (canPlay === "") canPlay = "no";
    var message = 'Successfully Loaded "' + type + '" ';
    var isError = canPlay === "no";
    displayMessage(message, isError);

    if (isError) {
      return;
    }

    var fileURL = URL.createObjectURL(file);
    videoNode.src = fileURL;
    PreviewVid.src = fileURL;
  };

  var loadChat = function (event) {
    var input = event.target;

    var reader = new FileReader();

    var timingLoadStart = window.performance.now();
    reader.onload = function () {
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
  function initChat(timingLoadStart) {
    var timingLoadMs = window.performance.now() - timingLoadStart;

    // chatJson.comments - Array of chat messages
    var chatSize = chatJson.comments.length;
    var timingReadChatStart = window.performance.now();
    var maxTime = 0;
    // Timings: 32,089 recs takes about 3.2 ms
    jQuery.each(chatJson.comments, function (index, msg) {
      if (maxTime < msg.content_offset_seconds) {
        maxTime = msg.content_offset_seconds;
      }
    });
    var timingReadChatMs = window.performance.now() - timingReadChatStart;

    // chatJson.emotes.thirdParty - Array of emotes
    var thirdParySize = chatJson.emotes.thirdParty.length;
    var timingReadThirdPartyStart = window.performance.now();
    // Timeings: 101 recs less than 1 ms
    jQuery.each(chatJson.emotes.thirdParty, function (index, emote) {
      emotesThirdParty[emote.name] = emote;
      if (emote.name === "testIgnore") {
      }
    });
    var timingReadThirdPartyMs =
      window.performance.now() - timingReadThirdPartyStart;

    // chatJson.emotes.firstParty - Array of emotes
    var firstParySize = chatJson.emotes.firstParty.length;
    var timingReadFirstPartyStart = window.performance.now();
    // Timeings: 622 recs less than 1 ms
    jQuery.each(chatJson.emotes.firstParty, function (index, emote) {
      emotesFirstParty[emote.id] = emote;
      if (emote.id === 99199099199) {
      }
    });
    var timingReadFirstPartyMs =
      window.performance.now() - timingReadFirstPartyStart;

    if (enableStats) {
      console.log(
        "## videoChatPlayer JSON stats: \n" +
          "##    JSON load time: " +
          timingLoadMs +
          " ms \n" +
          "##    messages: " +
          chatSize +
          " recs  " +
          "readTime: " +
          timingReadChatMs +
          " ms  " +
          "maxVideoTime: " +
          maxTime +
          " secs\n" +
          "##    thirdParty: " +
          thirdParySize +
          " recs  " +
          "readTime: " +
          timingReadThirdPartyMs +
          " ms\n" +
          "##    firstParty: " +
          firstParySize +
          " recs  " +
          "readTime: " +
          timingReadFirstPartyMs +
          " ms\n"
      );
    }
  }

  var getChatId = function (commentIndex) {
    return "chatId" + commentIndex.toString();
  };

  var updateChat = function (event) {
    updateCountersProgressBar();

    if (chatJson == null) return;

    $("#message").removeClass("animate").fadeOut(5000, "linear");

    let currentTime = videoNode.currentTime;

    var messagePos = messageSeek(currentTime, currentChatPos);

    removeObsoleteMessages(messagePos);

    addNewMessages(messagePos);
  };

  /**
   * This function will update the two video counters with the
   * current time and also the duration of the video. It will also
   * update the progress bar too.
   */
  function updateCountersProgressBar() {
    let currentTime = videoNode.currentTime;
    let duration = videoNode.duration;
    // let duration = chatJson.video.end;
    let percent = duration == 0 ? 0 : (currentTime / duration) * 100;

    // Update the counters and progress bar:
    $("#videoCounter").text(formatElapsedTime(currentTime));
    $("#videoDuration").text(formatElapsedTime(duration));

    $(".progress-bar .bar").css({ width: percent + "%" });
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
  function messageSeek(currentTime, chatPos) {
    var len = chatJson.comments.length;

    while (len > 0 && chatPos < len) {
      // If currentTime < curPos :: must step backwards
      if (
        chatPos < len &&
        chatPos > 0 &&
        currentTime <
          chatJson.comments.at(chatPos).content_offset_seconds
      ) {
        chatPos--;
      }

      // if currentTime > curPos :: must step forwards
      else if (
        chatPos + 1 < len &&
        chatPos + 1 >= 0 &&
        currentTime >
          chatJson.comments.at(chatPos + 1).content_offset_seconds
      ) {
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
  function removeObsoleteMessages(messagePos) {
    var messages = $("#chat > .chatline");
    messages.each(function (index) {
      var node = $(this);
      var position = Number.parseInt(node.attr("data-pos"));
      if (position < messagePos - maxChatMessages || position > messagePos) {
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
  function addNewMessages(messagePos) {
    var curPos = messagePos;

    while (curPos >= 0 && messagePos - curPos < maxChatMessages) {
      if (!$("#chat #" + getChatId(curPos)).length) {
        var msg = chatJson.comments.at(curPos);

        // Add the next comment to the #chat pane:
        let chatLine = $("<div>")
          .attr("id", getChatId(curPos))
          .attr("data-pos", curPos)
          .addClass("chatline flex");
		let chatTime = renderChatTime(msg);
		let chatBody = renderChatBody(msg);
		
			
		if ( regExSubResub.test( msg.message.body ) ) {
			let chatLine = $("<div>")
			.attr("id", getChatId(curPos))
			.attr("data-pos", curPos)
			.addClass("chatline flex")
			.addClass("issub");
			
			let chatSub = renderChatSub(msg);
			
			chatLine.append(chatSub);
			
			if (curPos == messagePos) {
			chatLine.appendTo("#chat");
			} else {
			chatLine.insertBefore("#" + getChatId(curPos + 1));
			}

			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		} else if ( regExSubResub.test( msg.message.body ) ) {
			let chatLine = $("<div>")
			.attr("id", getChatId(curPos))
			.attr("data-pos", curPos)
			.addClass("chatline flex")
			.addClass("issub");
			
			let chatSub = renderChatSub(msg);
			
			chatLine.append(chatSub);
			
			if (curPos == messagePos) {
			chatLine.appendTo("#chat");
			} else {
			chatLine.insertBefore("#" + getChatId(curPos + 1));
			}

			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		}
		else if ( regExsubmysterygift.test( msg.message.body ) ) {
			let chatLine = $("<div>")
			.attr("id", getChatId(curPos))
			.attr("data-pos", curPos)
			.addClass("chatline flex")
			.addClass("submysterygift");
			
			let mysterygift = renderChatsubmysterygift(msg);
			
			chatLine.append(mysterygift);
			
			if (curPos == messagePos) {
			chatLine.appendTo("#chat");
			} else {
			chatLine.insertBefore("#" + getChatId(curPos + 1));
			}

			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		}
		else if ( regExsubgift.test( msg.message.body ) ) {
			let chatLine = $("<div>")
			.attr("id", getChatId(curPos))
			.attr("data-pos", curPos)
			.addClass("chatline flex")
			.addClass("issubgift");
			
			let subgift = rendersubgift(msg);
			
			chatLine.append(subgift);
			
			if (curPos == messagePos) {
			chatLine.appendTo("#chat");
			} else {
			chatLine.insertBefore("#" + getChatId(curPos + 1));
			}

			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		}
		else {
			chatLine.append(chatTime);
			chatLine.append(chatBody);

			if (curPos == messagePos) {
			chatLine.appendTo("#chat");
			} else {
			chatLine.insertBefore("#" + getChatId(curPos + 1));
			}

			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		}
        
      }
      curPos--;
    }

    setTimeout(() => {
      $("#chat").scrollTop($("#chat")[0].scrollHeight);
    }, 20);
  }

  var inputNodeVideo = document.querySelector("#vidinput");
  var inputNodeChat = document.querySelector("#jsoninput");
  inputNodeVideo.addEventListener("change", playSelectedFile, false);
  inputNodeChat.addEventListener("change", loadChat, false);
  videoNode.addEventListener("timeupdate", updateChat, false);

  $(".selector").change(function () {
    var optionSelected = $("option:selected", this);
    var valueSelected = this.value;
    maxChatMessages = valueSelected;
    updateChat();
  });

//Color Picker

$('.colorpicker').spectrum({
	color: "#a970ff",
	type: "color",
	showPalette: false,
	showInput: true,
	showInitial: true,
	showAlpha: false,
	showButtons: false,
	allowEmpty: false,
	move: function(color) {
		$(".colorpicker").css('background-color', color.toHexString());
		$(".issubmessage").css('border-left-color', color.toHexString());
		$(".isbiggiftsubmessage").css('border-left-color', color.toHexString());
		accentColor = color.toHexString();
	},
});





  // Time offset
  $(".CurrentChatOffset").click(function () {
    var timeOffset = $(".OffsetTime").val();
    chatOffsetAdjustment = timeOffset;
    console.log(timeOffset);
  });
  //	Custom Control Bar Starts

  //Mute Button Function
  var savedVol = 100;
  $("#volume").click(function () {
    if ($("#videoPlayer").prop("muted")) {
      $("#videoPlayer").prop("muted", false); //unmute
      $(".Volume-animated-speaker").show();
      $(".Volume-animated-speaker-half").hide();
      $(".Volume-speaker-muted").hide();
      videoNode.volume = savedVol / 100;
      $("#bar").css("left", "calc(" + savedVol + "% - 9.5px)");
      $("#fill").css("width", "calc(" + savedVol + "% - 9.5px)");
      //Set Volume Button icon
      // or toggle class, style it with a volume icon sprite, change background-position
    } else {
      $("#videoPlayer").prop("muted", true); //mute
      $(".Volume-animated-speaker").hide();
      $(".Volume-animated-speaker-half").hide();
      $(".Volume-speaker-muted").show();
      videoNode.volume = 0;
      $("#bar").css("left", "calc(0% - 9.5px)");
      $("#fill").css("width", "calc(0% - 9.5px)");
    }
  });

  //Volume Slider Starts
  $(".slider-container").on("mousedown", function (e) {
    if (e.which == 1) {
      var $bar = $("#bar");
      var $fill = $("#fill");
      var barWidth = $bar.outerWidth();
      var sliderWidth = $(this).outerWidth();
      var sliderX = $(this).offset().left;
      var downX = e.clientX - sliderX;
      var multiplier = 100 / sliderWidth;
      var curPercent = downX * multiplier;
      moveSliderBar($bar, $fill, curPercent, barWidth);
      $(window)
        .on("mousemove.slider-container", function (e) {
          var diffX = e.clientX - sliderX - downX;
          var newPercent = curPercent + diffX * multiplier;

          moveSliderBar($bar, $fill, newPercent, barWidth);
          /* 			videoNode.volume = (newPercent / 100); 
			savedVol = newPercent; */
        })
        .on("mouseup.slider-container", function (e) {
          $(window).off("mousemove.slider-container mouseup.slider-container");
        });
    }
  });

  //Moves slider bar.
  function moveSliderBar($bar, $fill, percent, barWidth) {
    var VolumeFull = $(".Volume-animated-speaker");
    var VolumeHalf = $(".Volume-animated-speaker-half");
    var VolumeMuted = $(".Volume-speaker-muted");
    var Vid = $("#videoPlayer");

    if (percent <= 0) {
      percent = 0;
      VolumeHalf.hide();
      VolumeFull.hide();
      VolumeMuted.show();
      Vid.prop("muted", true);
    } else if (percent <= 50) {
      VolumeHalf.show();
      VolumeFull.hide();
      VolumeMuted.hide();
      Vid.prop("muted", false);
    } else if (percent > 0 && percent < 50) {
      VolumeHalf.show();
      VolumeFull.hide();
      VolumeMuted.hide();
      Vid.prop("muted", false);
    } else {
      VolumeHalf.hide();
      VolumeFull.show();
      VolumeMuted.hide();
      if (percent > 100) {
        percent = 100;
      }
    }

    $bar.css("left", "calc(" + percent + "% - " + barWidth / 2 + "px)");
    $fill.css("width", "calc(" + percent + "% - " + barWidth / 2 + "px)");
    videoNode.volume = percent / 100;
    savedVol = percent;
  }
  //Volume Slider Ends

  // Custom Player Overlay Start
  //Click video to Pause/Play
  $("#videoPlayer").on("click", function () {
    var isPlay = $(".custom-controls #playpause").hasClass("play");

    $(".custom-controls #playpause").toggleClass("play pause");

    if (isPlay) {
      videoNode.play();
      $("#message").text("");
    } else {
      videoNode.pause();
    }
  });

  //Shows Overlay on Pause
  videoNode.onpause = function () {
    $("#video-PausePlay-container").fadeIn(100);
    $(".custom-controls").fadeIn(100);
  };
  //Hides Overlay on Play
  videoNode.onplay = function () {
    $("#video-PausePlay-container").fadeOut(100);
    $(".custom-controls").fadeOut(200);
    $("#videoPlayer").removeClass("show-cursor");
    // $("#videoPlayer").delay(2000).queue(function(next){
    // $(this).removeClass("show-cursor");
    // next();
    // });
  };
  //Clicking on the overlay Plays the video and Hides the Overlay
  $("#video-PausePlay-container").on("click", function () {
    $("#video-PausePlay-container").fadeIn(100);
    var isPlay = $(".custom-controls #playpause").hasClass("play");
    $(".custom-controls #playpause").toggleClass("play pause");
    videoNode.play();
  });
  // Custom Player Overlay Ends

  //Checks if Mouse is over Controls
  var isMouseOverControlls = false;
  $(".custom-controls").on("mouseover", function (event) {
    if (
      $(".progress-bar-container").is(":hover") ||
      $(".buttons-container").is(":hover")
    ) {
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
    if ($("#videoPlayer").prop("paused") === false) {
      $(".custom-controls").delay(1000).fadeOut(500);
    }
  });

  var moveTimer;
  $(".video-container").on("mousemove", function () {
    clearTimeout(moveTimer);

    moveTimer = setTimeout(function () {
      var vid = $("#videoPlayer");
      if (vid.prop("paused") === false) {
        vid.removeClass("show-cursor");
        $(".custom-controls").fadeOut(500);
      } else {
      }
    }, 5000);
  });



//width:calc(100% - 341px);
	$("#collapseChat").click(function (e) {
		$("#leftSidebar").hide();
		$("#videoPlayer").css('width', 'calc(100% - 26px)');
		$(".custom-controls").css('width', 'calc(100% - 26px)');
		$("#video-PausePlay-container").css('width', 'calc(100% - 26px)');
		previewBoxparams();
		barSelectorparams();
	}); 
	$("#chatCover").click(function (e) {
		$("#leftSidebar").show();
		$("#videoPlayer").css('width', 'calc(100% - 341px)');
		$(".custom-controls").css('width', 'calc(100% - 341px)');
		$("#video-PausePlay-container").css('width', 'calc(100% - 341px)');
		previewBoxparams();
		barSelectorparams();
	}); 

  //Re-grab Paramiters on Window Resize Stars
  $(window).on("resize", function () {
	previewBoxparams();
  });
    
	
  function previewBoxparams() {
	//PreviewBox Follows Mouse Xaxis
    var innerDiv = $("#previewBox");
    var outerDiv = $("#videoPlayer");
    var outDim = outerDiv.offset();
    outDim.right = outDim.left + outerDiv.width();
    $(document).on("mousemove", function (e) {
      var x = e.clientX - 90;
      var x_allowed = x >= outDim.left && x <= outDim.right - innerDiv.width();
      if (x_allowed) {
        innerDiv.css({
          left: x + "px",
        });
      } else {
        //fine tune tweaks
        if (x >= outDim.left) {
          innerDiv.css({
            left: outDim.right - innerDiv.width() + "px",
          });
        }
        if (x <= outDim.right - innerDiv.width()) {
          innerDiv.css({
            left: outDim.left + "px",
          });
        }
      }
    });
  }
  $(window).on("resize", function () {
	barSelectorparams();
  });
    function barSelectorparams() {
    //barSelector Follows Mouse Xaxis
    var innerClass = $(".timeSeekerBar");
    var outerClass = $(".progress-bar");
    var outClass = outerClass.offset();
    outClass.right = outClass.left + outerClass.width();
    $(document).on("mousemove", function (e) {
      var xc = e.clientX - 0;
      var xc_allowed =
        xc >= outClass.left && xc <= outClass.right - innerClass.width();
      if (xc_allowed) {
        innerClass.css({
          left: xc + "px",
        });
      } else {
        //fine tune tweaks
        if (xc >= outClass.left) {
          innerClass.css({
            left: outClass.right - innerClass.width() + "px",
          });
        }
        if (xc <= outClass.right - innerClass.width()) {
          innerClass.css({
            left: outClass.left + "px",
          });
        }
      }
    });
  }
  //Re-grab Paramiters on Window Resize Ends



  // Video Shortcut Keys

  window.onkeydown = vidCtrl;

  function vidCtrl(e) {
    const vid = document.querySelector("#videoPlayer");
    const key = e.code;
	
  if ($("#videoPlayer").is(":visible")) {
    if (key === "ArrowLeft") {
      vid.currentTime -= 5;
      if (vid.currentTime < 0) {
        vid.pause();
        vid.currentTime = 0;
      }
    } else if (key === "ArrowRight") {
      vid.currentTime += 5;
      if (vid.currentTime > vid.duration) {
        vid.pause();
        vid.currentTime = 0;
      }
    } else if (key === "Space") {
      if (vid.paused || vid.ended) {
        vid.play();
      } else {
        vid.pause();
      }
    } else if (key === "KeyM") {
      var VolumeFull = $(".Volume-animated-speaker");
      var VolumeHalf = $(".Volume-animated-speaker-half");
      var VolumeMuted = $(".Volume-speaker-muted");
      var Vid = $("#videoPlayer");
      if (Vid.prop("muted")) {
        Vid.prop("muted", false); //unmute
        VolumeFull.show();
        VolumeHalf.hide();
        VolumeMuted.hide();
        videoNode.volume = savedVol / 100;
        $("#bar").css("left", "calc(" + savedVol + "% - 9.5px)");
        $("#fill").css("width", "calc(" + savedVol + "% - 9.5px)");
        //Set Volume Button icon
        // or toggle class, style it with a volume icon sprite, change background-position
      } else {
        Vid.prop("muted", true); //mute
        VolumeFull.hide();
        VolumeHalf.hide();
        VolumeMuted.show();
        videoNode.volume = 0;
        $("#bar").css("left", "calc(0% - 9.5px)");
        $("#fill").css("width", "calc(0% - 9.5px)");
      }
    }
  }
  }

  // Show current Video Time On Bar Hover

  var TimeInSeconds = null;
  $(".progress-bar-container").on("mousemove", function (e) {
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
    var percentage = 100 * (relX / progressWidth);
    GetHoverTime(percentage);
  });
  //Gets video time based on mouse position
  function GetHoverTime(percentage) {
    // console.log(percentage);
    var calculatedTime = new Date(null);
    var video = $("#videoPlayer");
    video[0].HoverTime = (video[0].duration * percentage) / 100;
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
    var hours = Math.floor(seconds / TIME_HOUR);
    seconds -= hours * TIME_HOUR;
    var mins = Math.floor(seconds / TIME_MINUTE);
    seconds -= mins * TIME_MINUTE;

    seconds = Math.floor(seconds);

    var formatted =
      (hours > 0 ? pad(hours, 2) + ":" : "") +
      pad(mins, 2) +
      ":" +
      pad(seconds, 2);

    return formatted;
  }

  // Preview Start

  function showPreview(TimeInSeconds) {
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

  $(".progress-bar-container").on("mouseover", function (e) {
    $("#previewBox").fadeIn(100);
  });
  $(".progress-bar-container").on("mouseleave", function (e) {
    var PBox = $("#previewBox");
    PBox.clearQueue();
    PBox.fadeOut(10);
  });

  //Disable on Page load
  $(document).ready(function () {
    $("#video-PausePlay-container").fadeOut(1);
    $(".custom-controls").fadeOut(1);
  });

  //Video player not loaded until video is loaded
  $("#videoPlayer")[0].addEventListener("loadeddata", (e) => {
    if ($("#videoPlayer")[0].readyState === 4) {
      $("#videoPlayer").fadeIn(0);
      $(".custom-controls").fadeIn(200);
      $("#video-PausePlay-container").fadeIn(200);
      console.log("Video Loaded");
      updateCountersProgressBar();
    }
  });

  //Options menu Open/Close
  $("#clickOptions").click(function (e) {
    $("#optionsOverlay").show();
  });

  $("#optionsClose").click(function (e) {
    $("#optionsOverlay").hide();
  });
  $("#OptionsCover").click(function (e) {
    $("#optionsOverlay").hide();
  });

  // Attmepting 2 at making the progressbar smooth

  // VIDEO PROGRESS BAR
  //when video timebar clicked
  var Rememberpause = true;
  var timeDrag = false; /* check for drag event */

  $(".progress-bar-container").on("mousedown", function (e) {
    var vid = $("#videoPlayer");
    var isVisible = $("#video-PausePlay-container").is(":visible");
    if (vid.prop("paused") === true) {
      // console.log("was paused");
      Rememberpause = true;
    }
    if (vid.prop("paused") === false) {
      // console.log("was not paused");
      Rememberpause = false;
    }
    // $("#video-PausePlay-container").show();
    // console.log("shown");
    // console.log($("#video-PausePlay-container").is(":visible"));
    videoNode.pause();
    timeDrag = true;
    updatebar(e.pageX);

    setTimeout(function () {
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

  $(".progress-bar-container").on("mouseup", function (e) {
    var vid = $("#videoPlayer");
    if (timeDrag) {
      timeDrag = false;
      updatebar(e.pageX);
      // console.log(Rememberpause);
      if (Rememberpause == true) {
        // console.log("detected pause");
        $("#video-PausePlay-container").show();
      }
      if (Rememberpause == false) {
        var controls = $(".custom-controls");
        // console.log("DID NOT detect pause");
        videoNode.play();
        controls.stop;
        controls.clearQueue();
        controls.show();
      }
    }
  });
  $(".progress-bar-container").on("mousemove", function (e) {
    if (timeDrag) {
      updatebar(e.pageX);
    }
  });

  function updatebar(x) {
    var $bar = $(".bar");
    var position = x - $(".bar").offset().left;
    var percentage = (100 * position) / $(".progress-bar").width();
    if (percentage > 100) {
      percentage = 100;
    }
    if (percentage < 0) {
      percentage = 0;
    }
    $bar.css("width", percentage + "%");
    $("#videoPlayer")[0].currentTime =
      ($("#videoPlayer")[0].duration * percentage) / 100;
  }

  // $(".progress-bar-container").on("mouseout", function(e) {
  // $(this).trigger("mouseup");
  // });

  //	Custom Control Bar End

  //Reading video Metadata

  $("#chat").on("click", ".chattime", function () {
    var timeSecond = $(this).attr("data-time");
    if (timeSecond) {
      timeSecond = Number(timeSecond);
    }
    videoNode.currentTime = timeSecond;
  });

  $(".custom-controls #playpause").on("click", function () {
    var isPlay = $(this).hasClass("play");

    $(this).toggleClass("play pause");

    if (isPlay) {
      videoNode.play();
      $("#message").text("");
    } else {
      videoNode.pause();
    }
  });

  $(".custom-controls #stop").on("click", function () {
    $("#playpause").removeClass("play pause");
    $("#playpause").addClass("play");

    videoNode.pause();
    if (videoNode.currentTime) {
      videoNode.currentTime = 0;
    }
  });
}

let TIME_MINUTE = 60;
let TIME_HOUR = TIME_MINUTE * 60;

function renderChatTime(comment) {
  let timeSeconds = comment.content_offset_seconds;

  let timeHtml = formatElapsedTime(timeSeconds);

  let chatTime = $("<div>")
    .addClass("chattime")
    .attr("data-time", timeSeconds.toString())
    .attr("title", "Jump to video")
    .text(timeHtml);
  return chatTime;
}

function formatElapsedTime(timeSeconds) {
  var seconds = timeSeconds;
  var hours = Math.floor(seconds / TIME_HOUR);
  seconds -= hours * TIME_HOUR;
  var mins = Math.floor(seconds / TIME_MINUTE);
  seconds -= mins * TIME_MINUTE;

  seconds = Math.floor(seconds);

  var formatted =
    (hours > 0 ? pad(hours, 2) + ":" : "") +
    pad(mins, 2) +
    ":" +
    pad(seconds, 2);

  return formatted;
}

function formatVideoCounter(timeSeconds) {
  if (typeof timeSeconds === "undefined") {
    timeSeconds = 0;
  } else if (timeSeconds.isNaN) {
    return "--:--:--.000";
  }

  var seconds = timeSeconds;
  var hours = Math.floor(seconds / TIME_HOUR);
  seconds -= hours * TIME_HOUR;
  var mins = Math.floor(seconds / TIME_MINUTE);
  seconds -= mins * TIME_MINUTE;

  var ms = (seconds - Math.floor(seconds)) * 1000;

  seconds = Math.floor(seconds);
  ms = Math.floor(ms);

  var formatted =
    pad(hours, 2) +
    ":" +
    pad(mins, 2) +
    ":" +
    pad(seconds, 2) +
    "." +
    pad(ms, 3);

  return formatted;
}
function pad(num, size) {
  var str = "00000" + num.toString();
  return str.substring(str.length - size);
}

var accentColor = "#a970ff";

function renderChatBody(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");

  let chatBody = $("<div>").addClass("chatbody");
  // chatBody.append( makeUserBadges( comment ) );
  chatBody.append(player);
  chatBody.append(messagePrefix);
  chatBody.append(message);

  return chatBody;
}
function renderChatSub(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  

  let chatBody = $("<div>").addClass("chatbody").addClass('issubmessage').css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
    if (message.is(':contains("subscribed with Prime")')){
		let primeSub = $('<svg><path class="primeSub" d="M18 5v8a2 2 0 0 1-2 2H4a2.002 2.002 0 0 1-2-2V5l4 3 4-4 4 4 4-3z"/></svg>');
		chatBody.append(primeSub);
	}
	if (message.is(':contains("subscribed at Tier")')){
		let tierOneSub = $('<svg><path class="tierOneSub" d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77zz"/></svg>');
		chatBody.append(tierOneSub);
	}
	chatBody.append(player);
	chatBody.append(message);
	return chatBody;

}
function renderChatsubmysterygift(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  let chatBody = $("<div>").addClass("chatbody").addClass('isbiggiftsubmessage').css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
    if (message.is(':contains("is gifting")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
		let giftedsub = $('<img class="isbiggiftsubmessageimg" src="img/subs/gift.png"/>');
		chatBody.append(giftedsub);
	}
	chatBody.append(player);
	chatBody.append(message);
	return chatBody;

}
function rendersubgift(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  

  let chatBody = $("<div>").addClass("chatbody").addClass('issubmessage').css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
    if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
		let subgift = $('<svg><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
		chatBody.append(subgift);
	}
	chatBody.append(player);
	chatBody.append(message);
	return chatBody;

}




function extractMessageFragments(comment) {
  let message = $("<span>").addClass("chatmessage");
  //.text( comment.message.body );

  // Expands message fragments to isolate and mark Cheers:
  //   Cheer is identified by: ( fragment.isCheer === true )
  var fragments = getExpandedMessageFragments( comment.message.fragments );

  jQuery.each(fragments, function (index, fragment) {
    var altName = fragment.text;
	//if the message has "bits_spent", it gets sent for processing
    // if (comment.message["bits_spent"]) {
      // console.log("bits sent");
	  // message.append(makeCheer(comment, altName));
    // }

    if ( fragment.isCheer ) {
      // Process fragment as a Cheer:
      message.append( buildFragmentCheer( fragment ) );
      message.append( buildFragmentCheerNumber( fragment ) );

    }
    else if (fragment.emoticon && fragment.emoticon.emoticon_id) {
      message.append(makeEmoticon(fragment.emoticon.emoticon_id, altName));
    } else {
      message.append($('<span debug="extractMessageFragments">').text(altName));
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

/**
 * This function, using the fragment, will construct a Cheer.
 * This fragment has already been identified as being a cheer 
 * and it's fragment.text contains the name of the cheer, in a
 * case insensitive formatting (format may be unpredictable).
 * 
 * The nature of the fragment is an object:
 * <pre>
 *  {
 *    text: <cheerId>,
 *    isCheer: true,
 *    emoticon: <clonedFromOriginalFragment>
 * }
 * </pre>
 * 
 * @param {} fragment 
 * @returns 
 */
function buildFragmentCheer( fragment ) {
  var cheer = fragment.text.trim();
  var amount = cheer.replace(/cheer/gi, "");
  var newcheeramount = 1;
  
  if ( amount > 0 && amount < 100) {
      newcheeramount = 1;
    } else if (amount < 1000) {
      newcheeramount = 100;
    } else if (amount < 5000) {
      newcheeramount = 1000;
    } else if (amount < 10000) {
      newcheeramount = 5000;
    } else if (amount < 100000) {
      newcheeramount = 10000;
    } else if (amount > 99999) {
      newcheeramount = 100000;
    };
  
  var img = $("<img>")
      .attr("title", cheer )
      .addClass("cheer")
      .attr("data-cheeramount", amount)
      .attr("src", "img/cheer/cheer" + newcheeramount + "_1.gif");

  return img;
}
function buildFragmentCheerNumber( fragment ) {
  var cheer = fragment.text.trim();
  var amount = cheer.replace(/cheer/gi, "");
  var newcheeramount = 1;
  
  if ( amount > 0 && amount < 100) {
      newcheeramount = 1;
    } else if (amount < 1000) {
      newcheeramount = 100;
    } else if (amount < 5000) {
      newcheeramount = 1000;
    } else if (amount < 10000) {
      newcheeramount = 5000;
    } else if (amount < 100000) {
      newcheeramount = 10000;
    } else if (amount > 99999) {
      newcheeramount = 100000;
    };

  var number = $("<span>")
      .addClass("cheer" + newcheeramount)
      .text(amount);

  return number;
}


function getExpandedMessageFragments( fragments ) {
  var results = [];

  jQuery.each( fragments, function (index, fragment) {
    
    // If the fragment.text contains a cheer, then we need to process it
    // and split them up.
    if ( regExCheers.test( fragment.text ) ) {
      var splits = processFragmentsSplitAltName( fragment.text );
      
      jQuery.each( splits, function (idx, splitText ) {

        var newFragment = {
          "text": splitText,
          "emoticon": fragment.emoticon
        };
        
        if ( regExCheers.test( splitText ) ) {
          // We have a cheer node:  Mark it as such...
          newFragment["isCheer"] = true;
        }

        results.push( newFragment );
      });

    }
    else {
      // No cheer, so just add the fragment:
      results.push( fragment );
    }
  });

  return results;
}


/**
 * Using the sourceText, identify if this string contains a 
 * cheer, and if it does, then split it up in to the multiple 
 * parts and return as an array of strings.
 * 
 * @param {*} sourceText 
 * @returns 
 */
function processFragmentsSplitAltName( sourceText ) {
  var splits = [];
  
  if ( regExCheers.test( sourceText ) ) {
    splits = sourceText.split(regExCheers).filter(Boolean) 
  }
  else {
    // No Cheer, so just add to splits:
    splits.push( sourceText );
  }

  return splits;
}

//makes Emotes ----------------------------------------
function makeEmoticon(emoticonId, altName) {
  var emote = emotesThirdParty[emoticonId];

  if (!emote) {
    emote = emotesFirstParty[emoticonId];
  }

  // Make the icon if we have an emote to work with:
  if (emote && emote.data) {
    var emoteImagePrefix = "data:image/png;base64,";
	
	let emoteheight = emote.height;
	let emotewidth = emote.width;
	
	if (emoteheight == null){
		emoteheight = 24;
	}
	if (emotewidth == null){
		emotewidth = 24;
	}

    var imageScaleClass = "chat-image-scale-" + emote.imageScale;
    var img = $("<img>")
      .attr("title", altName)
      .addClass(imageScaleClass)
      .attr("src", emoteImagePrefix + emote.data)
      .css({"height": (emoteheight + "px") , "width": (emotewidth + "px")});
    return img;
  }

  return $('<span debug="makeEmotiocon">').text(altName);
}

function makeUserBadges(comment) {
  var userBadges = $("<span>").addClass("user-badges");
  if (comment.message.user_badges) {
    var url = twitchEmoticonsUrl
      .replace("{{format}}", "static")
      .replace("{{theme_mode}}", chatThemeMode);
    // .replace("{{id}}", id)

    jQuery.each(comment.message.user_badges, function (index, badge) {
      var imgSrc = url
        .replace("{{id}}", badge._id)
        .replace("{{version}}", badge.version)
        .replace("{{scale}}", badge.scale ? badge.scale : "1");
      var badgeImg = $("<img>").attr("src", imgSrc);
    });
  }
  return userBadges;
}
// Restricts input for each element in the set of matched elements to the given inputFilter.
(function ($) {
  $.fn.inputFilter = function (callback, errMsg) {
    return this.on(
      "input keydown keyup mousedown mouseup select contextmenu drop focusout",
      function (e) {
        if (callback(this.value)) {
          // Accepted value
          if (["keydown", "mousedown", "focusout"].indexOf(e.type) >= 0) {
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
      }
    );
  };
})(jQuery);

$(document).ready(function () {
  $("#intTextBox").inputFilter(function (value) {
    return /^-?\d*$/.test(value);
  }, "Must be an Number");

  localFileVideoPlayer();
});
