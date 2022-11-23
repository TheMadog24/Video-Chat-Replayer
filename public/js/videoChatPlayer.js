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
  "https://badges.twitch.tv/v1/badges/channels/{{streamerId}}/display";
  
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
var regExSubResubFragments = "\\b\\w+ subscribed (?:with Prime|at Tier \\d+)\\.";
var regExSubResub = new RegExp(
                        "((?=" + regExSubResubFragments + ")|" + 
                        "(?<=" + regExSubResubFragments + "))", "i");
console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
            "(?<=" + regExSubResubFragments + "))");
            
var regExSubResubTheyveFragments = "\\bThey've subscribed for \\d+ months(?:!|, currently on a \\d+ month streak!)";
var regExSubResubTheyve = new RegExp(
                      "((?=" + regExSubResubTheyveFragments + ")|" + 
                      "(?<=" + regExSubResubTheyveFragments + "))", "i");
console.log("### regExSubResubTheyveFragments (77): " + "((?=" + regExSubResubTheyveFragments + ")|" + 
            "(?<=" + regExSubResubTheyveFragments + "))");
						
//Regex for subgift
var regExSubGiftFragments = "\\b\\w+ gifted a Tier \\d+\\b sub to \\w+!";
var regExSubGift = new RegExp(
                        "((?=" + regExSubGiftFragments + ")|" + 
                        "(?<=" + regExSubGiftFragments + "))", "i");
						
//Regex for submysterygift
var regExSubMysteryGiftFragments = ".{1,1000} is gifting [0-9]{1,1000}\\b Tier [0-9]\\b Subs to .{1,1000}'s community!";
var regExSubMysteryGift = new RegExp(
                        "((?=" + regExSubMysteryGiftFragments + ")|" + 
                        "(?<=" + regExSubMysteryGiftFragments + "))", "i");


var globalBadgesJson;
var streamerBadgesJson;



//MediaInfo - Extract Video Data from MP4



function getVideoMetadata() {
	const fileinput = document.getElementById('vidinput')
	
	
	var videoDatajson;
	
	const onChangeFile = (mediainfo) => {
		const file = fileinput.files[0]
		if (file) {
			removeCurrentChapter();
			window.setTimeout(function () {
				$("#message").text("Looking for Chapters...").css({"background-color": "yellow", "color": "black"});
			}, 500);
			

		const getSize = () => file.size

		const readChunk = (chunkSize, offset) =>
			new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = (event) => {
					if (event.target.error) {
						reject(event.target.error)
					}
					resolve(new Uint8Array(event.target.result))
				}
				reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize))
			})

			mediainfo
				.analyzeData(getSize, readChunk)
				.then((result) => {
					console.log("Chapters Loaded!");
					
					var videoMetadata = result;
					saveResults(videoMetadata);
					extractChapters();
        
				})
			.catch((error) => {
				// output.value = `An error occured:\n${error.stack}`
				
			})
		}
	}
	

	MediaInfo({ format: 'JSON' }, (mediainfo) => {
	fileinput.addEventListener('change', () => onChangeFile(mediainfo))
	})

	function saveResults(videoMetadata) {
		videoDatajson = JSON.parse( videoMetadata );
	}
	
	
	function extractChapters() { 
		if (typeof videoDatajson.media.track[4] === `undefined`) {
			$("#chapters").hide();
			$("#message").text("No Chapters Found").css({"background-color": "red", "color": "white"}).delay(2000).fadeOut(5000);
			
		} else if (videoDatajson.media.track[4]) {
			$("#chapters").show();
			$("#message").text("Chapters Found!").css({"background-color": "green", "color": "white"}).delay(2000).fadeOut(5000);
			var chapters = videoDatajson.media.track[4].extra;
			console.log(chapters);
			jQuery.each(chapters, function (chapter, name){
  
				var newChapter = chapter.substr(1).slice(0, -4).replace(/\_/g, ":").replace(/\"/g, "");
				var newtime;
				if (chapter) {
					newtime = convertChapterTime(newChapter);
				}
    
				$('#output2').append( newtime +" - " +name + "\n");
				// setVideoChapters(newtime, name);
				setChapterMenu(newChapter, newtime, name);
			})
		}
	} 
	
	//converts time to seconds
	function convertChapterTime(newChapter) {
		// console.log("------Making New Time!------");
		// console.log("newChapter: "+newChapter);
		var hms = newChapter;
		var a = hms.split(':');
		var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
		// console.log("seconds: "+seconds);
		// console.log("++++++New Time Finished++++++");
  
	return seconds;
	}
	
	
	
	function setVideoChapters(newtime, name) {
		console.log("Setting Chapter!");
	
		var video = $("#videoPlayer");
		var vidTime = video[0].duration;
		console.log("Video Time: "+vidTime);
		var timeOnBarPercent = (newtime / vidTime) * 100;
		console.log("Bar Time: "+timeOnBarPercent);
		
		if (timeOnBarPercent === 0) {
			return;
		} else {
		
		let chapterMarker = $("<div>")
		.attr("id", "chapterMarker"+newtime)
		.addClass("chapterMarker")
		.css({ "left" :  "calc(" + timeOnBarPercent + "%" + " - 4px)" });
		
		
		$(".progress-bar").prepend(chapterMarker);
		}
	}
	
	//adds entries to the chapter menu.
	function setChapterMenu(newChapter, newtime, name) {
		  // let chatTime = $("<div>")
		// .addClass("chattime")
		// .attr("data-time", timeSeconds.toString())
		// .attr("title", "Jump to video")
		// .text(timeHtml);
		
		let chapterEntry = $("<div>")
		.addClass("chapter")
		.attr("data-time", newtime.toString())
		.attr("title", "Jump to video");
		
		$("#chapterSelector").append(chapterEntry);		
		
		let chapterName = $("<div>")
		.addClass("chapterName")
		.text(name);
		
		let chapterTime = $("<div>")
		.addClass("chapterTime")
		.text(newChapter);
		
		chapterEntry.append(chapterName);
		chapterEntry.append(chapterTime);
		
	}
	//removes existing Chapters on Load
	function removeCurrentChapter() {
		console.log("Removing!");
		const chapterMenu = document.getElementById("chapterSelector");
		chapterMenu.replaceChildren();
		
		document.querySelectorAll('.chapterMarker').forEach(function(a){
			a.remove()
		})
	}

}
	







function localFileVideoPlayer() {
  var URL = window.URL || window.webkitURL;
  var videoNode = document.querySelector("video");
  var PreviewVid = document.querySelector("#previewVid");
  //var chatNode = document.querySelector('#chat');
  var chatJson;

  var currentChatPos = -1;

  var displayMessage = function (message, isError) {
	$("#message").show().css({"background-color": "green", "color": "white"});
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

    // console.log( videoNode );
  };

  var loadChat = function (event) {
    var input = event.target;

    var reader = new FileReader();

    var timingLoadStart = window.performance.now();
    reader.onload = function () {
      chatJson = JSON.parse(reader.result);
      initChat(timingLoadStart);
	  loadBadgesJson(chatJson);
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
          (chatJson.comments.at(chatPos).content_offset_seconds + +chatOffsetAdjustment)
      ) {
        chatPos--;
      }

      // if currentTime > curPos :: must step forwards
      else if (
        chatPos + 1 < len &&
        chatPos + 1 >= 0 &&
        currentTime >
          (chatJson.comments.at(chatPos + 1).content_offset_seconds + +chatOffsetAdjustment)
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

        // msg is the full JSON comment: It is not the formatted message:
        var msg = chatJson.comments.at(curPos);

        let chatTime = renderChatTime(msg);
        
        // chatBodies is an array, and it's already processed all of the specials.
        // Normally it would be just one HTML formatted message, but with 
        // message splitting, it can be more than one HTML message.
        let chatBodies = renderChatBody(msg);
        
        // if ( chatBodies.length >= 2 ) {
        //   console.log( "### chatBodies length: " + chatBodies.length + "  [" + curPos + "]" );
        // }
        jQuery.each( chatBodies, function ( index, chatBody ) {
          
          // Add the next comment to the #chat pane:
          let chatLine = $("<div>")
            .attr("id", getChatId(curPos))
            .attr("data-pos", curPos)
            .addClass("chatline flex");

          // Only add chatTime to the chatLine if it's not a "special" message, 
          // or if it has been marked with the class "no-time".
          // Note: the classes have been set when processing the messages.
          if ( 
              // !chatBody.hasClass("issubmessage") &&
              //  !chatBody.hasClass("isbiggiftsubmessage") &&
              //  !chatBody.hasClass("issubmessage") && 
               !chatBody.hasClass("no-time") ) {

            chatLine.append(chatTime);
          }

          chatLine.append(chatBody);
          

          if (curPos == messagePos) {
            chatLine.appendTo("#chat");
          } else {
            chatLine.insertBefore("#" + getChatId(curPos + 1));
          }
    
          $("#chat").scrollTop($("#chat")[0].scrollHeight);
        });
			
		// if ( regExSubResub.test( msg.message.body ) ) {
		// 	let chatLine = $("<div>")
		// 	.attr("id", getChatId(curPos))
		// 	.attr("data-pos", curPos)
		// 	.addClass("chatline flex")
		// 	.addClass("issub");
			
		// 	let chatSub = renderChatSub(msg);
			
		// 	chatLine.append(chatSub);
			
		// 	if (curPos == messagePos) {
		// 	  chatLine.appendTo("#chat");
		// 	} else {
		// 	  chatLine.insertBefore("#" + getChatId(curPos + 1));
		// 	}

		// 	$("#chat").scrollTop($("#chat")[0].scrollHeight);
		// } else if ( regExSubResub.test( msg.message.body ) ) {
		// 	let chatLine = $("<div>")
		// 	.attr("id", getChatId(curPos))
		// 	.attr("data-pos", curPos)
		// 	.addClass("chatline flex")
		// 	.addClass("issub");
			
		// 	let chatSub = renderChatSub(msg);
			
		// 	chatLine.append(chatSub);
			
		// 	if (curPos == messagePos) {
		// 	  chatLine.appendTo("#chat");
		// 	} else {
		// 	  chatLine.insertBefore("#" + getChatId(curPos + 1));
		// 	}

		// 	$("#chat").scrollTop($("#chat")[0].scrollHeight);
		// }
		// else if ( regExSubMysteryGift.test( msg.message.body ) ) {
		// 	let chatLine = $("<div>")
		// 	.attr("id", getChatId(curPos))
		// 	.attr("data-pos", curPos)
		// 	.addClass("chatline flex")
		// 	.addClass("submysterygift");
			
		// 	let mysterygift = renderChatsubmysterygift(msg);
			
		// 	chatLine.append(mysterygift);
			
		// 	if (curPos == messagePos) {
		// 	  chatLine.appendTo("#chat");
		// 	} else {
		// 	  chatLine.insertBefore("#" + getChatId(curPos + 1));
		// 	}

		// 	$("#chat").scrollTop($("#chat")[0].scrollHeight);
		// }
		// else if ( regExSubGift.test( msg.message.body ) ) {
		// 	let chatLine = $("<div>")
		// 	.attr("id", getChatId(curPos))
		// 	.attr("data-pos", curPos)
		// 	.addClass("chatline flex")
		// 	.addClass("issubgift");
			
		// 	let subgift = rendersubgift(msg);
			
		// 	chatLine.append(subgift);
			
		// 	if (curPos == messagePos) {
		// 	  chatLine.appendTo("#chat");
		// 	} else {
		// 	  chatLine.insertBefore("#" + getChatId(curPos + 1));
		// 	}

		// 	$("#chat").scrollTop($("#chat")[0].scrollHeight);
		// }
		// else {
		// 	chatLine.append(chatTime);
		// 	chatLine.append(chatBody);

		// 	if (curPos == messagePos) {
		// 	  chatLine.appendTo("#chat");
		// 	} else {
		// 	  chatLine.insertBefore("#" + getChatId(curPos + 1));
		// 	}

		// 	$("#chat").scrollTop($("#chat")[0].scrollHeight);
		// }
        
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
  });
  //	Custom Control Bar Starts



//Chapter Menu Function
$("#chapters").click(function (e) {
	e.stopPropagation();
	$("#chapterSelector").toggleClass("show hide");
});

$(document).click(function(e) {
	
    var container = $("#chapterSelector");

    // if the target of the click isn't the container nor a descendant of the container
    if (!container.is(e.target) && container.has(e.target).length === 0) 
    {
		e.stopPropagation();
		if (container.hasClass("show")) {
			container.removeClass("show").addClass("hide");
		}
    }
});


  $("#chapterSelector").on("click", ".chapter", function () {
    var timeSecond = $(this).attr("data-time");
    if (timeSecond) {
      timeSecond = Number(timeSecond);
    }
    videoNode.currentTime = timeSecond;
	$("#chapterSelector").toggleClass("show hide");
	
  });





  //Mute Button Function
  var savedVol = 100;
  $("#volume").click(function () {
    if ($("#videoPlayer").prop("muted")) {
      $("#videoPlayer").prop("muted", false); //unmute
      $(".volume-animated-speaker").show();
      $(".volume-animated-speaker-half").hide();
      $(".volume-speaker-muted").hide();
      videoNode.volume = savedVol / 100;
      $("#bar").css("left", "calc(" + savedVol + "% - 9.5px)");
      $("#fill").css("width", "calc(" + savedVol + "% - 9.5px)");
      //Set Volume Button icon
      // or toggle class, style it with a volume icon sprite, change background-position
    } else {
      $("#videoPlayer").prop("muted", true); //mute
      $(".volume-animated-speaker").hide();
      $(".volume-animated-speaker-half").hide();
      $(".volume-speaker-muted").show();
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
      var sliderWidth = $(this).width();
      var sliderX = ($(this).offset().left+10);
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
    var VolumeFull = $(".volume-animated-speaker");
    var VolumeHalf = $(".volume-animated-speaker-half");
    var VolumeMuted = $(".volume-speaker-muted");
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
    $(".custom-controls").delay(1000).fadeOut(200);
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
		  $(".custom-controls #playpause").toggleClass("play pause");
        vid.play();
      } else {
		  $(".custom-controls #playpause").toggleClass("play pause");
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
  $(document).on("mousemove", function (e) {
	  if (timeDrag) {
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
	  }
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
	  $("#chapterSelector").removeClass("show").addClass("hide");
	  $("#chapters").hide();
	  $("#message").hide();
  });

  //Video player not loaded until video is loaded
  $("#videoPlayer")[0].addEventListener("loadeddata", (e) => {
    if ($("#videoPlayer")[0].readyState === 4) {
      $("#videoPlayer").fadeIn(0);
      $(".custom-controls").fadeIn(200);
      $("#video-PausePlay-container").css("display", "flex").fadeIn(200);
      console.log("Video Loaded");
      updateCountersProgressBar();
	  previewBoxparams();
	  barSelectorparams();
	  $("#selectVideo").hide();
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
	$('body,html').addClass("cannotSelect");
	$("#previewBox").fadeIn(100);
    videoNode.pause();
    timeDrag = true;
    updatebar(e.pageX);

    setTimeout(function () {
      $("#video-PausePlay-container").hide();
    }, 1);
  });
  
  $(document).on("mousemove", function (e) {
    if (timeDrag) {
	  $(".progress-bar-container").hover();
	  $("#previewBox").show();
      updatebar(e.pageX);
    }
  });
  $(".progress-bar-container").on("mousemove", function (e) {
    if (timeDrag) {
      updatebar(e.pageX);
    }
  });
  
  $(document).on("mouseup", function (e) {
    var vid = $("#videoPlayer");
    if (timeDrag) {
      timeDrag = false;
	  $('body,html').removeClass("cannotSelect");
      updatebar(e.pageX);
		var PBox = $("#previewBox");
		PBox.clearQueue();
		PBox.fadeOut(10);
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
  $(".progress-bar-container").on("mouseup", function (e) {
    var vid = $("#videoPlayer");
    if (timeDrag) {
      timeDrag = false;
	  $('body,html').removeClass("cannotSelect");
      updatebar(e.pageX);
      // console.log(Rememberpause);
      if (Rememberpause == true) {
        // console.log("detected pause");
        $("#video-PausePlay-container").show();
      }
      if (Rememberpause == false) {
        var controls = $(".custom-controls");
        // console.log("DID NOT detect pause");
		var PBox = $("#previewBox");
        videoNode.play();
        controls.stop;
        controls.clearQueue();
        controls.show();
      }
    }
  });


  function updatebar(x) {
    var $bar = $(".bar");
    var position = x - $bar.offset().left;
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


 function loadBadgesJson(chatJson) {
	var streamerID = chatJson.streamer.id;
  $.getJSON(twitchGlobalBadgeUrl, function ( data) {
     globalBadgesJson = data;
	 console.log("Global Badges URL: " + twitchGlobalBadgeUrl);
   });
   
   var streamerBadgesURL = twitchChannelBadgeUrl.replace("{{streamerId}}", streamerID);
   $.getJSON(streamerBadgesURL, function (data) {
     streamerBadgesJson = data;
	 console.log("Channel Badges URL: " + streamerBadgesURL);
   });
}


let TIME_MINUTE = 60;
let TIME_HOUR = TIME_MINUTE * 60;

function renderChatTime(comment) {
  let timeSeconds = comment.content_offset_seconds + +chatOffsetAdjustment;

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

  var chatBodies = [];

  // if a special comment (system generated), then process that first, then allow 
  // the user's part of the message be processed on it's own.  
  // For this to work, the message fragments must be sliced and processed as two
  // different messages:
  if ( regExSubResub.test( comment.message.body )  ) {
    
    return renderChatSub( comment );
  }
  else if ( regExSubGift.test( comment.message.body )  ) {
    comment.message["alt_fragments"] = [];
    chatBodies.push( rendersubgift( comment ) );
    
    if ( comment.message.alt_fragments.length ) {
      // Clone the existing comment, then replace the fragments with the alt_fragments:
      var clonedComment = JSON.parse(JSON.stringify(comment));
      clonedComment.message.fragments = comment.message.alt_fragments;
      comment = clonedComment;
    }
    else {
      return chatBodies;
    }
  }
  else if ( regExSubMysteryGift.test( comment.message.body )  ) {
    comment.message["alt_fragments"] = [];
    chatBodies.push( renderChatsubmysterygift( comment ) );
    
    if ( comment.message.alt_fragments.length ) {
      // Clone the existing comment, then replace the fragments with the alt_fragments:
      var clonedComment = JSON.parse(JSON.stringify(comment));
      clonedComment.message.fragments = comment.message.alt_fragments;
      comment = clonedComment;
    }
    else {
      return chatBodies;
    }
  }

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
	if (typeof streamerBadgesJson === 'undefined' && typeof globalBadgesJson === 'undefined') {
		
	} 
	else {
		chatBody.append( makeUserBadges( comment ) );
	}
  
  chatBody.append(player);
  chatBody.append(messagePrefix);
  chatBody.append(message);

  chatBodies.push( chatBody );

  return chatBodies;
}


function renderChatSub(comment) {
  var chatBodies = [];
  comment.message["alt_fragments"] = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  let messageSubBold = message[0].outerHTML.replace("Subscribed", "<strong>Subscribed</strong>");

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  

  let chatBody = $("<div>").addClass("chatbody no-time issub issubmessage")
        .css('border-left-color', accentColor);
  
  // chatBody.append( makeUserBadges( comment ) );
  
	if ( message.find(".prime").length ) {
		let primeSub = $('<svg class="primeicon"><path class="primeSub" d="M18 5v8a2 2 0 0 1-2 2H4a2.002 2.002 0 0 1-2-2V5l4 3 4-4 4 4 4-3z"/></svg>');
		chatBody.append(primeSub);
	}
	if ( message.find(".tier").length ) {
		if (message.find(".tier").is(':contains("Tier 1")')){
			let tier1Sub = $('<svg class="staricon"><path class="tierOneSub" d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77zz"/></svg>');
			chatBody.append(tier1Sub);
		}
		if (message.find(".tier").is(':contains("Tier 2")')){
			let tier2Sub = $('<svg class="staricon animated-tier-star animated-tier-star--tier-2 " viewBox="0 0 20 20" width="20" height="20" overflow="visible"><defs><linearGradient x1="0%" x2="100%" y1="0%" y2="100%" id="swipe-gradient"><stop offset="0%" stop-color="#9147ff"></stop><stop offset="100%" stop-color="#d1b3ff"></stop></linearGradient><clipPath id="star-mask" class="animated-tier-star__star-mask"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></clipPath></defs><g class="animated-tier-star__star"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></g><g width="20" height="20" class="animated-tier-star__swipe-mask" clip-path="url(#star-mask)"><g class="animated-tier-star__swipe-group"><rect class="animated-tier-star__swipe animated-tier-star__swipe--1" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--2" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--3" fill="url(#swipe-gradient)"></rect></g></g></svg>');
			chatBody.append(tier2Sub);
		}	
		if (message.find(".tier").is(':contains("Tier 3")')) {
			let tier3Sub = $('<svg class="staricon animated-tier-star animated-tier-star--tier-3 " viewBox="0 0 20 20" width="20" height="20" overflow="visible"><defs><linearGradient x1="0%" x2="100%" y1="0%" y2="100%" id="swipe-gradient"><stop offset="0%" stop-color="#9147ff"></stop><stop offset="100%" stop-color="#d1b3ff"></stop></linearGradient><clipPath id="star-mask" class="animated-tier-star__star-mask"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></clipPath></defs><g class="animated-tier-star__star"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></g><g width="20" height="20" class="animated-tier-star__swipe-mask" clip-path="url(#star-mask)"><g class="animated-tier-star__swipe-group"><rect class="animated-tier-star__swipe animated-tier-star__swipe--1" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--2" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--3" fill="url(#swipe-gradient)"></rect></g></g></svg>');
			chatBody.append(tier3Sub);
		}
	}
	chatBody.append(player);
	chatBody.append(messageSubBold);
	chatBodies.push( chatBody );

  if ( comment.message.alt_fragments.length ) {
    // Clone the existing comment, then replace the fragments with the alt_fragments:
    var clonedComment = JSON.parse(JSON.stringify(comment));
    clonedComment.message.fragments = comment.message.alt_fragments;
	// console.log(clonedComment);
	
	let userComment = $("<span>").addClass("userComment");
    
    let msg2 = extractMessageFragments(clonedComment);

    let player2 = $("<span>")
      .addClass("commenter2")
      .css(styles)
      .text(clonedComment.commenter.display_name);
    // let messagePrefix = $("<span>").addClass("messagePrefix").text(":");

    // let chatBody2 = $("<div>").addClass("chatbody issubmessage")
            // .css('border-left-color', accentColor);
			
	chatBody.append(userComment);

    userComment.append( makeUserBadges( clonedComment ) );
    userComment.append(player2);
    userComment.append(messagePrefix);
    userComment.append(msg2);

    // chatBodies.push( chatBody2 );
  }

return chatBodies;
}

function renderChatsubmysterygift(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);
  let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  let chatBody = $("<div>").addClass("chatbody no-time submysterygift isbiggiftsubmessage")
        .css('border-left-color', accentColor);
  
  // chatBody.append( makeUserBadges( comment ) );
  if (message.is(':contains("is gifting")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
		let giftedsub = $('<img class="isbiggiftsubmessageimg" src="img/subs/gift.png"/>');
		chatBody.append(giftedsub);
	}
	chatBody.append(player);
	chatBody.append(messageNameRemoved);
	return chatBody;

}
function rendersubgift(comment) {
  // comment.message.body;
  let message = extractMessageFragments(comment);
  // let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");
  // let messageBold = message[0].outerHTML.replace("!", "</b>!").replace("sub to ", "sub to <b>");

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .css(styles)
    .text(comment.commenter.display_name);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  let subgiftcontainer = $("<div>").addClass("subgiftcontainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
  if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
		let subgift = $('<svg class="smallgifticon"><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
		chatBody.append(subgift);
	}
	// chatBody.append(player);
	
	chatBody.append(subgiftcontainer);
	subgiftcontainer.append(message);
	return chatBody;

}




function extractMessageFragments(comment) {
  let message = $("<span>").addClass("chatmessage");
  //.text( comment.message.body );

  // Expands message fragments to isolate and mark Cheers:
  //   Cheer is identified by: ( fragment.isCheer === true )
  var fragments = getExpandedMessageFragments( comment.message.fragments, comment );

  jQuery.each(fragments, function (index, fragment) {
    var altName = fragment.text.trim();
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
    else if ( fragment.isSubResub ) {
      message.append( buildFragmentSubResub( fragment ) );
    }
    else if ( fragment.isSubResubTheyve ) {
      message.append( buildFragmentSubResubTheyve( fragment ) );
      
    }

    else if (fragment.emoticon && fragment.emoticon.emoticon_id) {

      message.append(makeEmoticon(fragment.emoticon.emoticon_id, altName));
    } 
    
    else {
      message.append( $('<span debug="extractMessageFragments">').text(altName) );
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

function buildFragmentSubResub( fragment ) {
  var msg = fragment.text.trim();
  msg = msg.replace( "Prime", '<b class="prime">Prime</b>');
  if ( msg.indexOf("Tier") > -1 ) {
    msg = msg.replace("Tier 1", '<b class="tier tier1">Tier 1').replace(".", "</b>.");
    msg = msg.replace("Tier 2", '<b class="tier tier2">Tier 2').replace(".", "</b>.");
    msg = msg.replace("Tier 3", '<b class="tier tier3">Tier 3').replace(".", "</b>.");
  }
  var result = $("<span>")
      .addClass("subResub")
      .html( msg );

  //console.log("### buildFragmentSubResub (1444): msg=" + msg );
  return result;
}

function buildFragmentSubResubTheyve( fragment ) {
  var msg = fragment.text.trim();
  msg = msg.replace( "for ", "for <b>")
      .replace( " months", " months</b>");
  var result = $("<span>")
      .addClass("subResubTheyve")
      .html( msg );

  return result;
}

/**
 * This function will return the comment's message fragments.  What makes it
 * special, is that if a message fragment needs to be split, then this is 
 * where it will happen.  This will not change the actual contents to the 
 * comment's json object.  
 * 
 * This function will return an array of fragments, which will be JSON.
 * Some of the json text may be altered to fit the requirements, but no 
 * html should be generated in this function.
 * 
 * @param {*} fragments 
 * @param {*} comment 
 * @returns 
 */
function getExpandedMessageFragments( fragments, comment ) {
  var results = [];
  
  // A comment contains one or more fragments.  If at any time the fragments are
  // being processed and 'altFragmentProcessing' is set to true, then all fragments
  // that follows must be added to the 'alt_fragments' array so they will 
  // be generated in the next (secondary) message.
  var altFragmentProcessing = false;

  jQuery.each( fragments, function (index, fragment) {
    
    // If the fragment.text contains a cheer, then we need to process it
    // and split them up.
    if ( regExCheers.test( fragment.text ) || 
          regExSubResub.test( fragment.text ) ||
          regExSubGift.test( fragment.text ) ) {
           
      // if ( regExSubResub.test( fragment.text ) ) {
        
      //   console.log( "##### getExpandedMessageFragments (1422): regExSubResub.test(): " + 
      //                 regExSubResub.test( fragment.text ) + " userName: " + userName );
      // }
           
      var splits = processFragmentsSplitText( fragment.text );

      jQuery.each( splits, function (idx, splitText ) {
		
        if ( !splitText.trim().length ) {
          return;
        }
		
        var newFragment = {
          "text": splitText,
          "emoticon": fragment.emoticon
        };
        
        if ( regExCheers.test( splitText ) ) {
          // We have a cheer node:  Mark it as such...
          newFragment["isCheer"] = true;
          results.push( newFragment );
        }
        else if ( regExSubResub.test( splitText ) ) {
          var userName = comment.commenter.display_name;

          splitText = splitText.replace( userName, "" ).trim();
          splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
          // console.log("### regExSubResub.test (15105): text= " + splitText );
          
          newFragment["text"] = splitText;
          newFragment["isSubResub"] = true;

          altFragmentProcessing = true;
          results.push( newFragment );
        }
        else if ( regExSubResubTheyve.test( splitText ) ) {
          // console.log("### regExSubResubTheyve.test (1519): text= " + splitText );
          newFragment["isSubResubTheyve"] = true;

          altFragmentProcessing = true;
          results.push( newFragment );
        }
        else if ( regExSubGift.test( splitText ) ) {
          newFragment["isSubgift"] = true;

          altFragmentProcessing = true;
          results.push( newFragment );
        }
        else if ( regExSubMysteryGift.test( splitText ) ) {
          newFragment["isSubMysteryGift"] = true;

          altFragmentProcessing = true;
          results.push( newFragment );
        }

        else if ( altFragmentProcessing && comment ) {
          // if processing altFragments, and if comment is not null, then we need to store
          // these alt_fragments should not be returned from this function, but added to the
          // comment.message.alt_fragments array.  These altFragments will be used to 
          // construct a secondary message after the system-generate message has been 
          // processed and added.
          if ( !comment.message["alt_fragments"] ) {
            comment.message["alt_fragments"] = [];
          }
          comment.message["alt_fragments"].push( newFragment );
        }
        else {

          results.push( newFragment );
        }
      });

    }
    else if ( altFragmentProcessing && comment ) {
      // if processing altFragments, and if comment is not null, then we need to store
      // these alt_fragments should not be returned from this function, but added to the
      // comment.message.alt_fragments array.  These altFragments will be used to 
      // construct a secondary message after the system-generate message has been 
      // processed and added.
      if ( !comment.message["alt_fragments"] ) {
        comment.message["alt_fragments"] = [];
      }
      comment.message["alt_fragments"].push( fragment );
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
 * cheer, and subResub, and if it does, then split 
 * it up in to the multiple 
 * parts and return as an array of strings.
 * 
 * @param {*} sourceText 
 * @returns 
 */
function processFragmentsSplitText( sourceText ) {
  var splits = [];
  
  if ( regExCheers.test( sourceText ) ) {
    splits = sourceText.split(regExCheers).filter(Boolean);
  }
  else if ( regExSubResub.test( sourceText ) ) {
    var s = sourceText.split(regExSubResub).filter(Boolean);
    splits.push( s[0] );
    splits = splits.concat( s[1].trim().split(regExSubResubTheyve).filter(Boolean) );

  }
  else if ( regExSubGift.test( sourceText ) ) {
    splits = sourceText.split(regExSubGift).filter(Boolean);
  }
  else {
    // No Cheer, no subResub, so just add to splits:
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
	
	if (emoteheight == null && emotewidth == null){
		var imageScaleClass = "chat-image-scale-" + emote.imageScale;
		var img = $("<img>")
			.attr("title", altName)
			.addClass(imageScaleClass)
			.attr("src", emoteImagePrefix + emote.data);
		return img;
	}
	else {
		var imageScaleClass = "chat-image-scale-" + emote.imageScale;
		var img = $("<img>")
			.attr("title", altName)
			.addClass(imageScaleClass)
			.attr("src", emoteImagePrefix + emote.data)
			.css({"height": (emoteheight + "px") , "width": (emotewidth + "px")});
		return img;
		
	}
  }

  return $('<span debug="makeEmotiocon">').text(altName);
}

function makeUserBadges(comment) {
  
  if (comment.message.user_badges) {
	var userBadges = $("<span>").addClass("user-badges");
	  // console.log("Making Badges!");
    var url = twitchGlobalBadgeUrl
    // .replace("{{id}}", id)
    // var url = twitchEmoticonsUrl
      // .replace("{{format}}", "static")
      // .replace("{{theme_mode}}", chatThemeMode);
    // .replace("{{id}}", id)
	
	jQuery.each(comment.message.user_badges, function (index, badge) {
			
		var badgeID = badge["_id"];
		var badgeVersion = badge.version;
		
		// console.log("Badge ID: " + badgeID);
		// console.log("Badge Version: " + badgeVersion);
		var imgSrc;
		
		if (typeof streamerBadgesJson === 'undefined' ||typeof streamerBadgesJson.badge_sets[badge["_id"]] === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion] === 'undefined') {
			imgSrc = globalBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].image_url_1x;
		} else {
			imgSrc = streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].image_url_1x;
		}
		// console.log("imgSrc: " + imgSrc);
        
		var badgeTitle;
        
		if (typeof streamerBadgesJson === 'undefined' ||typeof streamerBadgesJson.badge_sets[badge["_id"]] === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion] === 'undefined') {
			badgeTitle = globalBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].title;
		} else {
			badgeTitle = streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].title;
		}
	
		// console.log("badgeTitle: " + badgeTitle);
	
		var badgeImg = $("<img>").attr("src", imgSrc).addClass("badge").attr("title", badgeTitle);
		userBadges.append(badgeImg);
	});
  }
  return userBadges;
}
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

$(document).ready(function () {
	// Install input filter
	$("#currencyTextBox").inputFilter(function(value) {
  return /^-?\d*[.]?\d{0,3}$/.test(value); }, "Must be a Number with 3 or less decimal places.");

  localFileVideoPlayer();
  getVideoMetadata();
});
