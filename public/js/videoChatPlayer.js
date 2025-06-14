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
// var twitchGlobalBadgeUrl =
  // "https://badges.twitch.tv/v1/badges/global/display";
  // // Channel
// var twitchChannelBadgeUrl =
  // "https://badges.twitch.tv/v1/badges/channels/{{streamerId}}/display";
  
var maxChatMessages = 150;

var chatOffsetAdjustment = 0;

var emotesThirdParty = {};
var emotesFirstParty = {};


// Cheer RegEx: Need to repeat the same pattern with both look forward and look behind:
// var regExCheersFragments = "Cheer1\\b|Cheer10\\b|Cheer25\\b|Cheer100\\b|Cheer1000\\b|Cheer5000\\b|Cheer10000\\b|Cheer100000\\b";
//Regex for Regular Cheers
var regExCheersFragments = "Cheer[0-9]{1,6}\\b";
var regExCheers =  new RegExp(
                        "((?=" + regExCheersFragments + ")|" + 
                        "(?<=" + regExCheersFragments + "))", "i");
//Regex for embedded bits Cheers
var regExBitsFragments;
var regExBits;
						
//Regex for embedded bits Cheers
// var regExBitsFragments = "Corgo[0-9]{1,6}\\b";
// var regExBits =  new RegExp(
                        // "((?=" + regExBitsFragments + ")|" + 
                        // "(?<=" + regExBitsFragments + "))", "i");
						// console.log("Before :"+regExBits);
						
//Regex for sub and resub
var regExSubResubFragments = "\\b\\w+ subscribed (?:with Prime|at Tier \\d+)\\.";
var regExSubResub = new RegExp(
                        "((?=" + regExSubResubFragments + ")|" + 
                        "(?<=" + regExSubResubFragments + "))", "i");
						// console.log(regExSubResub);
// console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
//             "(?<=" + regExSubResubFragments + "))");

//Regex for sub in advanced
var regExSubadvanceFragments = "\\w+ subscribed at Tier [0-9] for [0-9]+ months in advance.";
var regExSubadvance = new RegExp(
                        "((?=" + regExSubadvanceFragments + ")|" + 
                        "(?<=" + regExSubadvanceFragments + "))", "i");
// console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
//             "(?<=" + regExSubResubFragments + "))");

//Regex for "Paying Forward Gift" messages
var regExPayingForwardGiftFragments = "\\b\\w+ is paying forward the Gift they got from \\b\\w+ to ";
var regExPayingForwardGift = new RegExp(
                        "((?=" + regExPayingForwardGiftFragments + ")|" + 
                        "(?<=" + regExPayingForwardGiftFragments + "))", "i");
// console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
//             "(?<=" + regExSubResubFragments + "))");
            
var regExSubResubTheyveFragments = "\\bThey've subscribed for \\d+ months(?:!|, currently on a \\d+ month streak!)";
var regExSubResubTheyve = new RegExp(
                      "((?=" + regExSubResubTheyveFragments + ")|" + 
                      "(?<=" + regExSubResubTheyveFragments + "))", "i");
// console.log("### regExSubResubTheyveFragments (77): " + "((?=" + regExSubResubTheyveFragments + ")|" + 
//             "(?<=" + regExSubResubTheyveFragments + "))");
						
//Regex for subgift
var regExSubGiftFragments = "^.+ gifted a Tier \\d+\\b sub to \\w+.!";
var regExSubGift = new RegExp(
                        "((?=" + regExSubGiftFragments + ")|" + 
                        "(?<=" + regExSubGiftFragments + "))", "i");
						
//Regex for subgift in advance
var regExSubGiftAdvanceFragments = "^.+ gifted \\d+ months of Tier \\d+ to \\w+[.]";
var regExSubGiftAdvance = new RegExp(
                        "((?=" + regExSubGiftAdvanceFragments + ")|" + 
                        "(?<=" + regExSubGiftAdvanceFragments + "))", "i");
						
//Regex for submysterygift
var regExSubMysteryGiftFragments = "^.+ is gifting [0-9]+\\b Tier [0-9]+\\b Subs to .+'s community!";
var regExSubMysteryGift = new RegExp(
                        "((?=" + regExSubMysteryGiftFragments + ")|" + 
                        "(?<=" + regExSubMysteryGiftFragments + "))", "i");						
//Regex for continuing GiftSub
var regExContinueSubFragment = "^.+ is continuing the Gift Sub they got from ";
var regExContinueSub = new RegExp(
                        "((?=" + regExContinueSubFragment + ")|" + 
                        "(?<=" + regExContinueSubFragment + "))", "i");
//Regex for converted Sub
var regExConvertedSubFragment = "^.+ converted from a (Prime|Tier \\d) sub to a (Prime|Tier \\d) sub!";
var regExConvertedSub = new RegExp(
                        "((?=" + regExConvertedSubFragment + ")|" + 
                        "(?<=" + regExConvertedSubFragment + "))", "i");
//Regex for Raid
var regExRaidFragment = "^.+ raiders from .+ have joined! ";
var regExRaid = new RegExp(
                        "((?=" + regExRaidFragment + ")|" + 
                        "(?<=" + regExRaidFragment + "))", "i");

//Regex for Twitch Added GiftSub
var regExTwitchGiftSubFragment = "We added \\d+ Gift Subs to \\w+'s gift!";
var regExTwitchGiftSub = new RegExp(
                        "((?=" + regExTwitchGiftSubFragment + ")|" + 
                        "(?<=" + regExTwitchGiftSubFragment + "))", "i");

//Regex for Twitch Bonus GiftSub
var regExBonusSubFragment = "We added \\d+ Gift Subs AND \\d+ Bonus Gift Subs to \\w+'s gift!";
var regExBonusSub = new RegExp(
                        "((?=" + regExBonusSubFragment + ")|" + 
                        "(?<=" + regExBonusSubFragment + "))", "i");

//Regex for "community sent " messages
var regExCommunitySentFragments = "\\b\\w+ community sent \\d+! ";
var regExCommunitySent = new RegExp(
                        "((?=" + regExCommunitySentFragments + ")|" + 
                        "(?<=" + regExCommunitySentFragments + "))", "i");
// console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
//             "(?<=" + regExSubResubFragments + "))");
 
//Regex for "Milestone Achieved" messages
var regExMilestoneFragments = "Milestone \\d+ achieved! ";
var regExMilestone = new RegExp(
                        "((?=" + regExMilestoneFragments + ")|" + 
                        "(?<=" + regExMilestoneFragments + "))", "i");
// console.log("### regExSubResub (70): " + "((?=" + regExSubResubFragments + ")|" + 
//             "(?<=" + regExSubResubFragments + "))");
    

var globalBadgesJson;
var streamerBadgesJson;
var currentFile;
var lastStoredTime;
var localstoragevidID;
var accentColor = "#a970ff";
  getsavedaccentColor();
  
var pausescroll = "false";
var chatJson;
var chatEmotes;
var emotesBadges = {};
var bitsArray = {};
var bitsFilter;
var bitsFilterplain;
var iscontinuetimeOption = false;




//MediaInfo - Extract Video Data from MP4







function getVideoMetadata() {
	const fileinput = document.getElementById('vidinput')
	
	
	var videoDatajson;
	
	const onChangeFile = (mediainfo) => {
		// console.log("Starting");
		const file = fileinput.files[0]
		if (file) {
			// console.log("Looking For Chapters");
			removeCurrentChapter();
			window.setTimeout(function () {
				$("#message").text("Looking for Chapters...").css({"background-color": "yellow", "color": "black"});
			}, 500);
			
			
			const readChunk = async (chunkSize, offset) =>
			new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer())


			mediainfo
				.analyzeData(file.size, readChunk)
				.then((result) => {
					console.log("Chapters Loaded");
					
					
					var videoMetadata = result;
					// console.log(JSON.stringify(videoMetadata));
					saveResults(videoMetadata);
					extractChapters();
        
				})
			.catch((error) => {
				// output.value = `An error occured:\n${error.stack}`
				
			})
		}
	}
	
	MediaInfo.mediaInfoFactory({
		format: 'JSON'
	}, (mediainfo) => {
		fileinput.removeAttribute('disabled')
		fileinput.addEventListener('change', () => onChangeFile(mediainfo))
	})
	
	
	function saveResults(videoMetadata) {
		// console.log("Saving Chapters");
		// console.log(videoMetadata);
		videoDatajson = JSON.parse( videoMetadata );
		// console.log(videoDatajson);
	}
	
	
	function extractChapters() { 
	// console.log("Extracting Chapters");
	// console.log(videoDatajson.media.track[4]);
		if (typeof videoDatajson.media.track[4] === `undefined`) {
			$("#chapters").hide();
			$("#message").text("No Chapters Found").css({"background-color": "red", "color": "white"}).delay(2000).fadeOut(5000);
			
		} else if (videoDatajson.media.track[4]) {
			$("#message").text("Chapters Found!").css({"background-color": "green", "color": "white"}).delay(2000).fadeOut(5000);
			var chapters = videoDatajson.media.track[4].extra;
			// console.log("Chapters: ");
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
		$("#chapters").show();
		setActiveChapter();
		
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
		.attr('id',name+newtime.toString())
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
		
		let chapTextContainer = $("<div>")
		.addClass("chapTextContainer");
		
		let chapterImg = $("<img>")
		.addClass("chapterimage")
		.attr("src", "img/no_img.png");
		
		chapterEntry.append(chapterImg);
		chapterEntry.append(chapTextContainer);
		chapTextContainer.append(chapterName);
		chapTextContainer.append(chapterTime);
		
	}
	//removes existing Chapters on Load
	function removeCurrentChapter() {
		// console.log("Removing!");
		const chapterMenu = document.getElementById("chapterSelector");
		chapterMenu.replaceChildren();
		
		document.querySelectorAll('.chapterMarker').forEach(function(a){
			a.remove()
		})
	}
	
	function setActiveChapter() {
		var chapters = $(".chapter");
	
		jQuery.each(chapters, function (index, chapter) {
			// console.log($(this).attr('id'));
			let timeSecond = $(this).attr("data-time");
			var videoNode = document.querySelector("video");
			let currentTime = videoNode.currentTime;
			timeSecond = Number(timeSecond);
		
			// console.log(timeSecond);
			// console.log("currentTime = "+currentTime);
		
			if ( currentTime === timeSecond ) {
				// console.log($(this).attr('id'));
				$(".active").removeClass("active");
				$(this).addClass("active");
			}
			else if (currentTime >  timeSecond) {
				//now have all chapters that are before current video time.
				$(".active").removeClass("active");
				$(this).addClass("active");
			}
		})
	}
}

	function hexToRgb(hex){
		if(/^#([a-f0-9]{3}){1,2}$/.test(hex)){
			if(hex.length== 4){
				hex= '#'+[hex[1], hex[1], hex[2], hex[2], hex[3], hex[3]].join('');
			}
			var c= '0x'+hex.substring(1);
			return 'rgb('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+')';
		}
	}

	function getsavedaccentColor() {
		// console.log("Getting Color");
		var savedaccentColor = localStorage.getItem("colorpickercolor");
		if (!savedaccentColor) {
			// console.log("Color Was Null");
			accentColor = "#a970ff";
		} else {
			// console.log("savedaccentColor");
			accentColor = savedaccentColor;
		}
		// console.log("Local Storage : "+accentColor);
	}
	function setsavedaccentColor() {
		$(".colorpicker").css('background-color', hexToRgb(accentColor));
	}

	



function localFileVideoPlayer() {
  var URL = window.URL || window.webkitURL;
  var videoNode = document.querySelector("video");
  var PreviewVid = document.querySelector("#previewVid");
  //var chatNode = document.querySelector('#chat');
  

  var currentChatPos = -1;

  var displayMessage = function (message, isError) {
	$("#message").show().css({"background-color": "green", "color": "white"}).clearQueue();
    var element = document.querySelector("#message");
    element.innerHTML = message;
    element.className = isError ? "error" : "info";
  };

  var playSelectedFile = function (event) {
    var file = this.files[0];
	document.title = file.name.replace(/\.[^/.]+$/, "");
	currentFile = file;
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
	
	
	$("#chapters").hide();
	$("#videoPlayer").fadeOut(0);
	

    // console.log( videoNode );
  };

  var loadChat = function (event) {
    var input = event.target;

    var reader = new FileReader();

    var timingLoadStart = window.performance.now();
    reader.onload = function () {
      chatJson = JSON.parse(reader.result);
	  if (chatJson.video.title) {
		  // console.log("Set Video Title");
		  document.title = chatJson.video.title;
	  } else {
		  // console.log("Reset Video Title");
		  // document.title = "Video Chat Replayer";
		}
      initChat(timingLoadStart);
	  loadBadgesJson(chatJson);
	  loadVideoChapters(chatJson);
	  setLocalTime(chatJson);
	  
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
	if (typeof chatJson.emotes === "undefined") {
		chatEmotes = chatJson.embeddedData;
	} else {
		chatEmotes = chatJson.emotes;
	}
    var timingReadChatStart = window.performance.now();
    var maxTime = 0;
    // Timings: 32,089 recs takes about 3.2 ms
    jQuery.each(chatJson.comments, function (index, msg) {
      if (maxTime < msg.content_offset_seconds) {
        maxTime = msg.content_offset_seconds;
      }
    });
    var timingReadChatMs = window.performance.now() - timingReadChatStart;
	
	//loading array of twitchBits emotes
	if (chatEmotes.twitchBits) {
		jQuery.each(chatEmotes.twitchBits, function (index, bits) {
			bitsArray[bits.prefix] = bits;
		});
		// console.log("bitsArray: " + JSON.stringify(bitsArray));
		cheerfilter(bitsArray);
	} else {
		
	}
	
	

    // chatJson.emotes.thirdParty - Array of emotes
	if (typeof chatJson.emotes === "undefined") {
		var thirdParySize = chatJson.embeddedData.thirdParty.length;
	} else {
		var thirdParySize = chatJson.emotes.thirdParty.length;
	}
    var timingReadThirdPartyStart = window.performance.now();
    // Timeings: 101 recs less than 1 ms
    jQuery.each(chatEmotes.thirdParty, function (index, emote) {
      emotesThirdParty[emote.name] = emote;
      if (emote.name === "testIgnore") {
      }
    });
	jQuery.each(chatEmotes.twitchBadges, function (index, badge) {
      emotesBadges[badge.name] = badge;
    });
	// console.log("emotesBadges: " + JSON.stringify(emotesBadges));
	
    var timingReadThirdPartyMs =
      window.performance.now() - timingReadThirdPartyStart;

    // chatJson.emotes.firstParty - Array of emotes
    var firstParySize = chatEmotes.firstParty.length;
    var timingReadFirstPartyStart = window.performance.now();
    // Timeings: 622 recs less than 1 ms
    jQuery.each(chatEmotes.firstParty, function (index, emote) {
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
  
  
  function cheerfilter(bitsArray) {
	bitsFilter;
	var bitsFilterpart;
	var bitsFilterplainpart;
	bitsFilterpart;
	bitsFilterplain;
	// $("#chat").append(JSON.stringify(bitsArray));
	jQuery.each(bitsArray, function (index, prefix) {
		var prefix = this["prefix"];
		// var prefix = bitsArray[prefix];
		// console.log("Prefix: "+JSON.stringify(prefix));
		bitsFilterpart = bitsFilterpart + "[0-9]{1,6}" + "|" + prefix;
		
		bitsFilterplainpart = bitsFilterplainpart + "|" + prefix;
	});
	bitsFilter = bitsFilterpart.replace("undefined[0-9]{1,6}|", "").replace("Cheer[0-9]{1,6}|", "").replace(/(\r\n|\n|\r)/gm, "").trim();
	bitsFilterplain = bitsFilterplainpart.replace("undefined|", "").replace("Cheer|", "").replace(/(\r\n|\n|\r)/gm, "").trim();
	// console.log("bitsFilterpart: "+bitsFilterpart);
	// console.log("bitsFilterplain: "+bitsFilterplain);
	// console.log("bitsFilter: "+bitsFilter);
	
	// console.log("regExBits :"+regExBits);
	// console.log(regExBits);
	
	regExBitsFragments = "(" + bitsFilter + "[0-9]{1,6}" + ")\\b";
	regExBits =  new RegExp(regExBitsFragments, "i");
	
	// console.log("regExBitsFragments: "+regExBitsFragments);
	// console.log("regExBits: "+regExBits);
	
	
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
    let percent = duration == 0 ? 0 : (currentTime / duration) * 100;

    // Update the counters and progress bar:
    $("#videoCounter").text(formatElapsedTime(currentTime));
    $("#videoDuration").text(formatElapsedTime(duration));

    $(".progress-bar .bar").css({ width: percent + "%" });
	// console.log(currentFile);
	// console.log(currentTime);
	
	
	
	
	var chapters = $(".chapter");
	
	jQuery.each(chapters, function (index, chapter) {
		// console.log($(this).attr('id'));
		let timeSecond = $(this).attr("data-time");
		let currentTime = videoNode.currentTime;
		timeSecond = Number(timeSecond);
		
		// console.log(timeSecond);
		// console.log(currentTime);
		
	
		if ( currentTime === timeSecond ) {
			// console.log($(this).attr('id'));
			$(".active").removeClass("active");
			$(this).addClass("active");
		}
		else if (currentTime >  timeSecond) {
			//now have all chapters that are before current video time.
			$(".active").removeClass("active");
			$(this).addClass("active");
		}
	})
  }
  


function saveLocalVideoTime() {

    var videoUniqueID = currentFile.name + currentFile.size;
    localstoragevidID = localStorage.getItem(videoUniqueID);

    var savedtime = localstoragevidID;

    var currentTime = videoNode.currentTime;
    // console.log("savedtime: " + savedtime);
    // console.log("currentTime: " + currentTime);

    // console.log("Saving Video Time");

    if ($("#videoPlayer")[0].readyState === 4) {
        if (!iscontinuetimeOption) {
            if (currentTime == savedtime) {
                // console.log("Not Saving, Same Time already Exists");
                return;
            } else {
                // console.log("saving");
                var videoUniqueID = currentFile.name + currentFile.size;
                localStorage.setItem(videoUniqueID, currentTime);
            }
        }
    }
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
          (chatJson.comments.at(chatPos).content_offset_seconds - +chatJson.video.start + +chatOffsetAdjustment)
      ) {
        chatPos--;
      }

      // if currentTime > curPos :: must step forwards
      else if (
        chatPos + 1 < len &&
        chatPos + 1 >= 0 &&
        currentTime >
          (chatJson.comments.at(chatPos + 1).content_offset_seconds - +chatJson.video.start + +chatOffsetAdjustment)
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
        let chatBodies = renderChatBody(msg, curPos);
        
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
    
          // $("#chat").scrollTop($("#chat")[0].scrollHeight);
		  if (pausescroll === "false") {
				// console.log("is false ");
				// console.log(pausescroll);
				$("#chat").scrollTop($("#chat")[0].scrollHeight);
		  } else if (pausescroll === "true") {
				// console.log("is true ");
				// console.log(pausescroll);
		
		  } 	
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
	// if (pausescroll = "true") {
		// console.log("is true ");
		// console.log(pausescroll);
		
	// } else if (pausescroll = "false") {
		// console.log("is false ");
		// console.log(pausescroll);
		// setTimeout(() => {
		// $("#chat").scrollTop($("#chat")[0].scrollHeight);
		// }, 20);
	// }
    
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

// console.log("Color Picker : "+accentColor);
$('.colorpicker').spectrum({
	color: accentColor,
	type: "color",
	showPalette: true,
    showSelectionPalette: true,
    palette: [ ],
    localStorageKey: "spectrum.homepage",
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
		localStorage.setItem("colorpickercolor", accentColor);
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
	
	if ( $("#chapterSelector").hasClass("show") ) {
		// console.log("Scrolling to middle!");
		scrollCenterActive();
	}
	
	
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
  

  function scrollCenterActive() {
	  var active = $(".active");
	  var menu = $("#chapterSelector");
	  
	  menu.scrollTop(menu.scrollTop() + active.position().top - menu.height()/2 + active.height()/2);
	  
	  
  }
  



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
		$("#volumeChangeContainer").css('width', 'calc(100% - 26px)');
		previewBoxparams();
		barSelectorparams();
	}); 
	$("#chatCover").click(function (e) {
		$("#leftSidebar").show();
		$("#videoPlayer").css('width', 'calc(100% - 341px)');
		$(".custom-controls").css('width', 'calc(100% - 341px)');
		$("#video-PausePlay-container").css('width', 'calc(100% - 341px)');
		$("#volumeChangeContainer").css('width', 'calc(100% - 26px)');
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



//Detect Scroll Direction
	//Firefox
	$('#chat').bind('DOMMouseScroll', function(e){
		if(e.originalEvent.detail > 0) {
			//scroll down
			// console.log('Down');
		} else {
			//scroll up
			// console.log('Up');
			pausescroll = "true";
			$('#autoscroller').show();
		}

		//prevent page fom scrolling
		// return false;
	});
	//Chrome, IE, Opera, Safari
	$('#chat').bind('mousewheel', function(e){
		if(e.originalEvent.wheelDelta < 0) {
			//scroll down
			// console.log('Down');
		} else {
			//scroll up
			// console.log('Up');
			pausescroll = "true";
			$('#autoscroller').show();
		}

		
	});
 
 $('#autoscroller').on("click", function () {
	pausescroll = "false";
	// console.log("pausescroll set ");
	// console.log(pausescroll);
	$('#autoscroller').hide();
	$("#chat").scrollTop($("#chat")[0].scrollHeight);
 });
 
 jQuery(function($) {
    $('#chat').on('scroll', function() {
        if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
            if (pausescroll === "true") {
				pausescroll = "false";
				$('#autoscroller').hide();
				// console.log("is false ");
				// console.log(pausescroll);
				$("#chat").scrollTop($("#chat")[0].scrollHeight);
				// console.log("bottom");
			}
		}
    })
});

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
    } else if (key === "ArrowUp") {
		
		var VolSpeakerMuted = $(".volume-speaker-muted-large");
		var VolSpeakerLarge = $(".volume-speaker-large");
		var VolSpeakerHalfLarge = $(".volume-animated-speaker-half-large");
		var Voltext = $("#volPercent");
		
		Voltext.stop();
		Voltext.clearQueue();
		VolSpeakerMuted.stop().fadeOut(0);
		VolSpeakerMuted.clearQueue();
		VolSpeakerLarge.stop().fadeOut(0);
		VolSpeakerLarge.clearQueue();
		VolSpeakerHalfLarge.stop().fadeOut(0);
		VolSpeakerHalfLarge.clearQueue();
		
		if (savedVol >= 95) {
			videoNode.volume = 1;
			savedVol = 100;
		} else {
			savedVol = savedVol + 5;
			videoNode.volume = savedVol / 100;
		}
		
		
		$("#volPercent").text(savedVol+"%");
		Voltext.stop().fadeIn(0);
		Voltext.delay(800).fadeOut(200);
		VolSpeakerLarge.stop().fadeIn(0);
		VolSpeakerLarge.delay(200).fadeOut(200);
		
		
		var VolumeFull = $(".volume-animated-speaker");
		var VolumeHalf = $(".volume-animated-speaker-half");
		var VolumeMuted = $(".volume-speaker-muted");
		var Vid = $("#videoPlayer");
		
		var vidVolume = videoNode.volume * 100;
		
		if (vidVolume <= 0) {
		    vidVolume = 0;
		    VolumeHalf.hide();
		    VolumeFull.hide();
		    VolumeMuted.show();
		    Vid.prop("muted", true);
		} else if (vidVolume <= 50) {
		    VolumeHalf.show();
		    VolumeFull.hide();
		    VolumeMuted.hide();
		    Vid.prop("muted", false);
		} else if (vidVolume > 0 && vidVolume < 50) {
		    VolumeHalf.show();
		    VolumeFull.hide();
		    VolumeMuted.hide();
		    Vid.prop("muted", false);
		} else {
		    VolumeHalf.hide();
		    VolumeFull.show();
		    VolumeMuted.hide();
		}
		
		$("#bar").css("left", "calc(" + savedVol + "% - 9.5px)");
		$("#fill").css("width", "calc(" + savedVol + "% - 9.5px)");
		// console.log(videoNode.volume);
	} else if (key === "ArrowDown") {
		
		var VolSpeakerMuted = $(".volume-speaker-muted-large");
		var VolSpeakerLarge = $(".volume-speaker-large");
		var VolSpeakerHalfLarge = $(".volume-animated-speaker-half-large");
		var Voltext = $("#volPercent");
		
		Voltext.stop();
		Voltext.clearQueue();
		VolSpeakerMuted.stop().fadeOut(0);
		VolSpeakerMuted.clearQueue();
		VolSpeakerLarge.stop().fadeOut(0);
		VolSpeakerLarge.clearQueue();
		VolSpeakerHalfLarge.stop().fadeOut(0);
		VolSpeakerHalfLarge.clearQueue();
		
		var VolumeFull = $(".volume-animated-speaker");
		var VolumeHalf = $(".volume-animated-speaker-half");
		var VolumeMuted = $(".volume-speaker-muted");
		var Vid = $("#videoPlayer");
		
		if (savedVol === 0) {
			videoNode.volume = 0;
			savedVol = 0;
			console.log("Zero");
			
			
			
			VolSpeakerMuted.stop().fadeIn(0);
			VolSpeakerMuted.fadeOut(200);
		} else if (savedVol <= 5) {
			videoNode.volume = 0;
			savedVol = 0;
			console.log("Less Than 5");
			
			VolumeHalf.hide();
		    VolumeFull.hide();
		    VolumeMuted.show();
		    Vid.prop("muted", true);
			
			VolSpeakerMuted.stop().fadeIn(0);
			VolSpeakerMuted.fadeOut(200);
		} else {
			savedVol = savedVol -5;
			videoNode.volume = savedVol / 100;
		}
		
		$("#volPercent").text(savedVol+"%");
		Voltext.stop().fadeIn(0);
		Voltext.delay(800).fadeOut(200);
		
		VolSpeakerHalfLarge.stop().fadeIn(0);
		VolSpeakerHalfLarge.delay(200).fadeOut(200);
		
		var VolumeFull = $(".volume-animated-speaker");
		var VolumeHalf = $(".volume-animated-speaker-half");
		var VolumeMuted = $(".volume-speaker-muted");
		var Vid = $("#videoPlayer");
		
		var vidVolume = videoNode.volume * 100;
		
		if (vidVolume <= 0) {
		    vidVolume = 0;
		    VolumeHalf.hide();
		    VolumeFull.hide();
		    VolumeMuted.show();
		    Vid.prop("muted", true);
		} else if (vidVolume <= 50) {
		    VolumeHalf.show();
		    VolumeFull.hide();
		    VolumeMuted.hide();
		    Vid.prop("muted", false);
		} else if (vidVolume > 0 && vidVolume < 50) {
		    VolumeHalf.show();
		    VolumeFull.hide();
		    VolumeMuted.hide();
		    Vid.prop("muted", false);
		} else {
		    VolumeHalf.hide();
		    VolumeFull.show();
		    VolumeMuted.hide();
		}
		
		$("#bar").css("left", "calc(" + savedVol + "% - 9.5px)");
		$("#fill").css("width", "calc(" + savedVol + "% - 9.5px)");
		// console.log(videoNode.volume);
	} else if (key === "Space") {
      if (vid.paused || vid.ended) {
		  $(".custom-controls #playpause").toggleClass("play pause");
        vid.play();
      } else {
		  $(".custom-controls #playpause").toggleClass("play pause");
        vid.pause();
      }
    } else if (key === "KeyM") {
		var VolumeMuted = $(".volume-speaker-muted");
		var VolSpeakerLarge = $(".volume-speaker-large");
		
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
		
		VolSpeakerLarge.stop().fadeIn(0);
		VolSpeakerLarge.fadeOut(200);
		
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
		
		VolumeMuted.stop().fadeIn(0);
		VolumeMuted.fadeOut(200);
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

	let previewTimeout;
	let lastPreviewTime = -1; // Stores the last preview seek time

	function showPreview(TimeInSeconds) {
		// Only update if the hovered time changed by at least 0.5 seconds
		if (Math.abs(TimeInSeconds - lastPreviewTime) < 0.5) {
			return; // Skip unnecessary seeks
		}

		lastPreviewTime = TimeInSeconds; // Update the last preview time

		clearTimeout(previewTimeout); // Cancel previous seek

		previewTimeout = setTimeout(() => {
			$("#previewVid")[0].currentTime = TimeInSeconds;
		}, 100); // Short debounce (adjust if needed)
	}


  // function showPreview(TimeInSeconds) {
    // $("#previewVid")[0].currentTime = TimeInSeconds;
  // }








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
	$("#previewBox").clearQueue();
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
	  $('#autoscroller').hide();
	  $('#userBox').hide();
  });

  //Video player not loaded until video is loaded
  $("#videoPlayer")[0].addEventListener("loadeddata", (e) => {
    if ($("#videoPlayer")[0].readyState === 4) {
      $("#videoPlayer").fadeIn(0);
      $(".custom-controls").fadeIn(200);
      $("#video-PausePlay-container").css("display", "flex").fadeIn(200);
	  $("#volumeChangeContainer").fadeIn(0);
	  let chapterSelector = $("#chapterSelector");
	  if (chapterSelector.children().length) {
		  console.log("Has Children!");
		  $("#chapters").show();
	  } else if (!chapterSelector.children().length) {
		  console.log("Has NO Children");
	  }
      console.log("Video Loaded");
      updateCountersProgressBar();
	  previewBoxparams();
	  barSelectorparams();
	  $("#selectVideo").hide();
	  
	  console.log("Video Ready");
	  
	  var saveVideo = setInterval(saveLocalVideoTime, 5000);
	  
	  var videoUniqueID = currentFile.name + currentFile.size;
	  localstoragevidID = localStorage.getItem(videoUniqueID);
	  // console.log(localstoragevidID);
	  
	  if (localstoragevidID !== "null" && localstoragevidID > 200) {
		  // videoNode.currentTime = localstoragevidID;
		  
		  lastStoredTime = localstoragevidID;
		  $("#continuetimeOption").show();
		  iscontinuetimeOption = true;
		  
	  }
	  	  
    }
  });
  
  
  $("#continueConfirm").click(function (e) {
	  videoNode.currentTime = lastStoredTime
	  saveLocalVideoTime();
	  $("#continuetimeOption").hide();
	  iscontinuetimeOption = false;
  });
  $("#continueClose").click(function (e) {
	  $("#continuetimeOption").hide();
	  iscontinuetimeOption = false;
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
  
	//Get Size of Window
	var sizeOfCurrentWindow = getWindowsSize();
	function getWindowsSize() {
		var x1 = -5;
		var y1 = -5;
		var x2 = $(window).width() - 350;
		var y2 = $(window).height() - 218;
		return [x1, y1, x2, y2];
	}
	
  
	//Dragable User Info Box
	$('#userBox').draggable({
		cursor: 'move',
		containment: sizeOfCurrentWindow,
		scroll: false,
		handle: '#userBoxDragBox'
		// [5, 10, $(window).width() - 370, $(window).height() - 215]
	});
	
	$(window).on("resize", function () {
		var sizeOfCurrentWindow = getWindowsSize();
		$('#userBox').draggable("option", "containment", sizeOfCurrentWindow);
	});
	

	//retirves data on click
	$(document).on("click", ".commenter, .commenter2", function () {
		// console.log("Clicked!");
		
		var userBox = $('#userBox');
		const userBadgeBox = document.getElementById("userBadgeBox");
		userBadgeBox.replaceChildren();
		
		userBox.hide();
		var commentIndexNumber = $(this).attr("data-commentIndex");
		var prefix = chatJson.comments;
		
		// console.log(commentIndex);
		// console.log("chatJson.comments[0].message.user_color: " + chatJson.comments[0].message.user_color);
		// console.log("User's Name: " + chatJson.comments[commentIndexNumber].commenter.name);
		
		//show UserInfoBox
		userBox.fadeIn(100);
		
		var leftPos = $('#chat').offset().left - 360 + "px";
		var topPos = $(this).offset().top - 20 + "px";
		var topPos2 = $(this).offset().top - 15;
		var bottomLimit = $(window).height() - 229;
		// console.log("bottomLimit: "+bottomLimit);
		// console.log("topPos: "+topPos);
		
		if (topPos2 > bottomLimit) {
			topPos = bottomLimit;
			// console.log("Below!");
		}
		
		userBox.css({
			left: leftPos,
			top: topPos
		});
		
		
		// $.ajax({
			// url: "https://www.twitch.tv/" + prefix[commentIndexNumber].commenter.name,
			// type: 'Get',
			// success: function (data) {
				// $('#userBoxInfoContainer').css( "background-image", $(data).find('.tw-image-avatar').attr('src'));
			// }
		// });
		
		
		// console.log("Color: " + prefix[commentIndexNumber].message.user_color);
		$('.userNameinBox')
			.text(prefix[commentIndexNumber].commenter.display_name);
			
		
		$('.userLinkinBox')
			.text("twitch.tv/" + prefix[commentIndexNumber].commenter.name)
			.attr("href", "https://www.twitch.tv/" + prefix[commentIndexNumber].commenter.name)
			.attr("target", '="_blank"');
			
			
		if (prefix[commentIndexNumber].message.user_color !== null) {
			// console.log("Not null!");
			$('#userBoxInfoContainer').css('background-color', prefix[commentIndexNumber].message.user_color);
		} else {
			$('#userBoxInfoContainer').css('background-color', "#ffffff");	
		}
		
		$('#userBadgeBox').append(buildInfoBoxBadges(prefix, commentIndexNumber));
	});
	
	
	
	
	
	function buildInfoBoxBadges(prefix, commentIndexNumber) {

	    if (typeof prefix[commentIndexNumber].message.user_badges === 'null' || prefix[commentIndexNumber].message.user_badges === 'null' || !prefix[commentIndexNumber].message.user_badges) {
	        // console.log("user_badges for user " + prefix[commentIndexNumber].commenter.display_name + " :" + prefix[commentIndexNumber].message.user_badges);
	        return;
	    } else if (!prefix[commentIndexNumber].message.user_badges.length) {
	        return;
	    } else {
	        var userBadges = $("<span>").addClass("user-info-badges");
	        // console.log("Making Badges!");
	        // var url = twitchGlobalBadgeUrl
	            // .replace("{{id}}", id)
	            // var url = twitchEmoticonsUrl
	            // .replace("{{format}}", "static")
	            // .replace("{{theme_mode}}", chatThemeMode);
	            // .replace("{{id}}", id)
	            // var emotesBadges = chatJson.embeddedData.twitchBadges;
	            // console.log("emotesBadges: " + JSON.stringify(emotesBadges));


	            if (chatEmotes.twitchBadges) {

	                jQuery.each(prefix[commentIndexNumber].message.user_badges, function (index, badge) {

	                    var badgeID = badge["_id"];
						if (!badgeID) {
	                        return;
	                    }
	                    var badgeVersion = badge.version;
	                    var badgeImagePrefix = "data:image/png;base64,";

	                    // console.log("Badge ID: " + badgeID);
	                    // console.log("Badge Version: " + badgeVersion);

	                    var imgSrc;
	                    var badgeTitle;

	                    var badges = emotesBadges[badgeID];
	                    // console.log("badges: " + JSON.stringify(badges));


	                    if (badges.versions[badgeVersion].bytes) {
	                        // console.log("It Has Extra Data");


	                        imgSrc = badges.versions[badgeVersion].bytes;
	                        // console.log("imgSrc: " + imgSrc);

	                        var badgeVer = badge.version;

	                        badgeTitle = badges.versions[badgeVersion].title;

	                    } else {
	                        // console.log("It Is Alone");

	                        imgSrc = badges.versions[badgeVersion];
	                        // console.log("imgSrc: " + imgSrc);

	                        var badgeVer = badge.version;

	                        if (badgeVer === "1") {
	                            badgeTitle = badges.name
	                                // console.log("badgeTitle: " + badgeTitle);
	                        } else {
	                            badgeTitle = badges.name + " " + badgeVer;
	                            // console.log("badgeTitle: " + badgeTitle);
	                        }

	                    }

	                    var badgebox = $("<div>").addClass("badgebox");

	                    var badgeImg = $("<img>")
	                        .attr("src", badgeImagePrefix + imgSrc)
	                        .addClass("infobadge")
	                        .attr("title", badgeTitle);

	                    userBadges.append(badgebox);
	                    badgebox.append(badgeImg);

	                });

	            } else {

	                jQuery.each(prefix[commentIndexNumber].message.user_badges, function (index, badge) {

	                    var badgeID = badge["_id"];
	                    if (!badgeID) {
	                        return;
	                    }
	                    var badgeVersion = badge.version;

	                    // console.log("Badge ID: " + badgeID);
	                    // console.log("Badge Version: " + badgeVersion);
	                    var imgSrc;

	                    if (typeof streamerBadgesJson === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]] === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion] === 'undefined') {
	                        imgSrc = globalBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].image_url_1x;
	                    } else {
	                        imgSrc = streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].image_url_1x;
	                    }
	                    // console.log("imgSrc: " + imgSrc);

	                    var badgeTitle;

	                    if (typeof streamerBadgesJson === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]] === 'undefined' || typeof streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion] === 'undefined') {
	                        badgeTitle = globalBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].title;
	                    } else {
	                        badgeTitle = streamerBadgesJson.badge_sets[badge["_id"]].versions[badgeVersion].title;
	                    }

	                    // console.log("badgeTitle: " + badgeTitle);
						var badgebox = $("<div>").addClass("badgebox");

	                    var badgeImg = $("<img>").attr("src", imgSrc).addClass("infobadge").attr("title", badgeTitle);
	                    userBadges.append(badgebox);
	                    badgebox.append(badgeImg);
	                });
	            }
	    }
	    return userBadges;
	}
	

	
	//Closes UserInfoBox
	$('.userBoxClose').on("click", function () {
		$('#userBox').hide();
	});
	
  
  // jumpt so video time when clicked
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
  
  	//Getting and Displaying Local video time

  	// Ensure chatJson is loaded beforehand
  	function setLocalTime(chatJson) {
  	    if (chatJson.video.created_at) {
  	        // console.log("Video time loaded");
  	        // console.log(chatJson.video.created_at);

  	        const createdAt = new Date(chatJson.video.created_at);
  	        var localTimeDiv = $("#localTime")[0];
  	        var Vid = $("#videoPlayer")[0];

  	        function updateLocalTimeDisplay() {
  	            const currentVideoTime = Vid.currentTime;
  	            const currentDateTime = new Date(createdAt.getTime() + currentVideoTime * 1000);

  	            const weekday = currentDateTime.toLocaleDateString('en-US', {
  	                weekday: 'long'
  	            });
  	            const month = currentDateTime.toLocaleDateString('en-US', {
  	                month: 'short'
  	            });
  	            const day = currentDateTime.getDate();
  	            const year = currentDateTime.getFullYear();

  	            const hourOptions = {
  	                hour: 'numeric',
  	                minute: '2-digit',
  	                second: '2-digit',
  	                hour12: true,
  	            };
  	            const time = currentDateTime.toLocaleTimeString('en-US', hourOptions);

  	            // Helper to get ordinal suffix
  	            function getOrdinalSuffix(n) {
  	                if (n >= 11 && n <= 13)
  	                    return 'th';
  	                switch (n % 10) {
  	                case 1:
  	                    return 'st';
  	                case 2:
  	                    return 'nd';
  	                case 3:
  	                    return 'rd';
  	                default:
  	                    return 'th';
  	                }
  	            }

  	            const formattedDate = `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}, ${year} at ${time}`;
  	            localTimeDiv.textContent = `${formattedDate}`;
  	        }

  	        Vid.addEventListener('timeupdate', updateLocalTimeDisplay);
			updateLocalTimeDisplay(); // Show immediately when video and chatJson are ready

  	    }
  	}

}


 function loadBadgesJson(chatJson) {
	var streamerID = chatJson.streamer.id;
  // $.getJSON(twitchGlobalBadgeUrl, function ( data) {
     // globalBadgesJson = data;
	 // console.log("Global Badges URL: " + twitchGlobalBadgeUrl);
   // });
   
   // var streamerBadgesURL = twitchChannelBadgeUrl.replace("{{streamerId}}", streamerID);
   // $.getJSON(streamerBadgesURL, function (data) {
     // streamerBadgesJson = data;
	 // console.log("Channel Badges URL: " + streamerBadgesURL);
   // });
}

	//Video Chapters
	function loadVideoChapters(chatJson) {

	    var chapters = chatJson.video.chapters;
	    var timeOffsetStart = +chatJson.video.start * 1000;
	    var timeOffsetEnd = +chatJson.video.end * 1000;
	    // console.log("timeOffset: "+timeOffset);
	    // console.log(chapters);
		

	        if (chapters.length === 0) {
	            $("#message").text("No Chapters Found").css({"background-color": "red", "color": "white"}).delay(2000).fadeOut(5000);
				$("#chapters").hide();
				
	        } else if (chapters.length >= 1) {
				removeCurrentChapter();
	            $("#message").text("Chapters Found!").css({"background-color": "green", "color": "white"}).delay(2000).fadeOut(5000);
				
	            jQuery.each(chapters, function (index, chapter) {
					// console.log(chapter.gameDisplayName);
					
					var chapName = chapter.gameDisplayName;
					var ms = chapter.startMilliseconds - timeOffsetStart;
					// console.log("ms: "+ms);
					if (ms<0 || ms>+timeOffsetEnd){
						return;
					} else {
					    var chapTimeSeconds = convertToSeconds(ms);
					    var chapImg = chapter.gameBoxArtUrl;

					    var ChaptTime = convertChapterTime(ms);
					    // console.log(chapName + " - " + ChaptTime + " - " + chapTimeSeconds);

					    setChapterMenu(chapName, ChaptTime, chapTimeSeconds, chapImg);
					}
					
					
	            });
				
	        $("#chapters").show();
			setActiveChapter();
			
	        }
	    }

		//adds entries to the chapter menu.
	    function setChapterMenu(chapName, ChaptTime, chapTimeSeconds, chapImg) {
			if (ChaptTime<0){
				return;
			} else {
	        // let chatTime = $("<div>")
	        // .addClass("chattime")
	        // .attr("data-time", timeSeconds.toString())
	        // .attr("title", "Jump to video")
	        // .text(timeHtml);

	        let chapterEntry = $("<div>")
	            .attr('id', chapName + chapTimeSeconds.toString())
	            .addClass("chapter")
	            .attr("data-time", chapTimeSeconds.toString())
	            .attr("title", "Jump to video");

	        $("#chapterSelector").append(chapterEntry);

	        let chapterName = $("<div>")
	            .addClass("chapterName")
	            .text(chapName);

	        let chapterTime = $("<div>")
	            .addClass("chapterTime")
	            .text(ChaptTime);

	        let chapTextContainer = $("<div>")
	            .addClass("chapTextContainer");

	        let chapterImg = $("<img>")
	            .addClass("chapterimage")
				.attr("src", chapImg);

	        chapterEntry.append(chapterImg);
	        chapterEntry.append(chapTextContainer);
	        chapTextContainer.append(chapterName);
	        chapTextContainer.append(chapterTime);
	    }
		}
		
		
		

	    function convertChapterTime(ms) {
			var duration = ms;
	        var seconds = Math.floor((duration / 1000) % 60),
	        minutes = Math.floor((duration / (1000 * 60)) % 60),
	        hours = Math.floor((duration / (1000 * 60 * 60)));

	        hours = (hours < 10) ? "0" + hours : hours;
	        minutes = (minutes < 10) ? "0" + minutes : minutes;
	        seconds = (seconds < 10) ? "0" + seconds : seconds;

	        return hours + ":" + minutes + ":" + seconds;
	    }
		
		function convertToSeconds(ms) {
			var duration = ms;
	        var seconds = Math.floor(duration / 1000);

	        return seconds;
		}
		
		

		//removes existing Chapters on Load
		function removeCurrentChapter() {
		    // console.log("Removing!");
		    const chapterMenu = document.getElementById("chapterSelector");
		    chapterMenu.replaceChildren();

		    document.querySelectorAll('.chapterMarker').forEach(function (a) {
		        a.remove()
		    })
		}

		function setActiveChapter() {
		    var chapters = $(".chapter");

		    jQuery.each(chapters, function (index, chapter) {
		        // console.log($(this).attr('id'));
		        let timeSecond = $(this).attr("data-time");
		        var videoNode = document.querySelector("video");
		        let currentTime = videoNode.currentTime;
		        timeSecond = Number(timeSecond);

		        // console.log(timeSecond);
		        // console.log("currentTime = "+currentTime);

		        if (currentTime === timeSecond) {
		            // console.log($(this).attr('id'));
		            $(".active").removeClass("active");
		            $(this).addClass("active");
		        } else if (currentTime > timeSecond) {
		            //now have all chapters that are before current video time.
		            $(".active").removeClass("active");
		            $(this).addClass("active");
		        }
		    })
		}
		
		

let TIME_MINUTE = 60;
let TIME_HOUR = TIME_MINUTE * 60;

function renderChatTime(comment) {
  let timeSeconds = comment.content_offset_seconds - +chatJson.video.start + +chatOffsetAdjustment;

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






function renderChatBody(comment, index) {

  var chatBodies = [];

  // if a special comment (system generated), then process that first, then allow 
  // the user's part of the message be processed on it's own.  
  // For this to work, the message fragments must be sliced and processed as two
  // different messages:
  if ( regExSubResub.test( comment.message.body )  ) {
    
    return renderChatSub(comment, index);
  }
  else if ( regExPayingForwardGift.test( comment.message.body )  ) {
    
    return renderPayingForwardGift(comment, index);
  }
  else if ( regExCommunitySent.test( comment.message.body )  ) {
    
    return renderCommunitySent(comment, index);
  }
  else if ( regExMilestone.test( comment.message.body )  ) {
    
    return renderMilestone(comment, index);
  }
  else if ( regExSubadvance.test( comment.message.body )  ) {
    
    return renderChatAdvanceSub(comment, index);
  }
  else if ( regExSubGift.test( comment.message.body )  ) {

    return rendersubgift(comment, index);
  }
  else if ( regExRaid.test( comment.message.body )  ) {

    return renderRaid(comment, index);
  }
  else if ( regExConvertedSub.test( comment.message.body )  ) {

    return renderConvertedSub(comment, index);
  }
  else if ( regExSubGiftAdvance.test( comment.message.body )  ) {

    return renderChatSubGiftAdvance(comment, index);
  }
  else if ( regExContinueSub.test( comment.message.body )  ) {

    return rendersubgiftContinue(comment, index);
  }
  else if ( regExSubMysteryGift.test( comment.message.body )  ) {

    return renderChatSubMysteryGift(comment, index);
  }
  else if ( regExTwitchGiftSub.test( comment.message.body )  ) {

    return renderTwitchGiftSub(comment, index);
  }
  else if ( regExBonusSub.test( comment.message.body )  ) {

    return renderBonusSub(comment, index);
  }

  // comment.message.body;
  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");

  let chatBody = $("<div>").addClass("chatbody");
	 
	if (chatEmotes.twitchBadges){
		chatBody.append( makeUserBadges( comment ) );
		// console.log("Embedded Badges Test");
	} else if (typeof streamerBadgesJson === 'undefined' && typeof globalBadgesJson === 'undefined') {
		
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


function renderRaid(comment, index) {
  var chatBodies = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  // console.log(message);
  let messageNumber = message[0].textContent.replace(" raiders from  have joined!", "");
  
  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
	
  let raidMessage = $("<span>")
    .addClass("middlemessage")
    .text(" is raiding with a party of ");
	
  let raidEndNumber = $("<span>")
    .addClass("messageNumber")
    .text(messageNumber)
  

  let isPayingForwardContainer = $("<div>").addClass("isPayingForwardContainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  
	chatBody.append(isPayingForwardContainer);
	isPayingForwardContainer.append(player);
	isPayingForwardContainer.append(raidMessage);
	isPayingForwardContainer.append(raidEndNumber);

	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;

    // console.log(msg);
		
		let channelText = msg.match(" Gift Subs in the channel!");
	
		let msgGiftTotal = msg.match("They have given ");
	
		let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
		let giftedTotal = $("<span>")
      .addClass("giftmessagetotal")
      .text(msgGiftTotal);
	  
		let giftednumber = $("<span>")
      .addClass("giftednumber")
      .text(giftedtotalnumber);
	  
		let toChannel = $("<span>")
      .addClass("tochannel")
      .text(channelText);

		subgiftcontainer.append( giftedTotal );
		subgiftcontainer.append( giftednumber );
		subgiftcontainer.append( toChannel );
		
  }


return chatBodies;
}

function renderChatSub(comment, index) {
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
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
	
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
      .text(clonedComment.commenter.display_name)
	.attr("data-commentindex", index);
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

function renderPayingForwardGift(comment, index) {
  var chatBodies = [];
  comment.message["alt_fragments"] = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  let isPayingForwardContainer = $("<div>").addClass("isPayingForwardContainer");
    

  let chatBody = $("<div>").addClass("chatbody no-time isPayingForward");
  
  // chatBody.append( makeUserBadges( comment ) );
  
	chatBody.append(isPayingForwardContainer);
	isPayingForwardContainer.append(message);
	chatBodies.push( chatBody );


return chatBodies;
}

function renderCommunitySent(comment, index) {
  var chatBodies = [];
  comment.message["alt_fragments"] = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  let communitySentContainer = $("<div>").addClass("communitySentContainer");
    

  let chatBody = $("<div>").addClass("chatbody no-time communitySent");
  
  let communitySentimg = $('<img class="communitySentimg" src="img/gift_heart.png"/>');
  
  // chatBody.append( makeUserBadges( comment ) );
  
	chatBody.append(communitySentContainer);
	communitySentContainer.append(message);
	communitySentContainer.append(communitySentimg);
	chatBodies.push( chatBody );


return chatBodies;
}

function renderMilestone(comment, index) {
  var chatBodies = [];
  comment.message["alt_fragments"] = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  let communitySentContainer = $("<div>").addClass("communitySentContainer");
    

  let chatBody = $("<div>").addClass("chatbody no-time communitySent");
  
  let communitySentimg = $('<img class="communitySentimg" src="img/gift_heart.png"/>');
  
  // chatBody.append( makeUserBadges( comment ) );
  
	chatBody.append(communitySentContainer);
	communitySentContainer.append(message);
	// communitySentContainer.append(communitySentimg);
	chatBodies.push( chatBody );


return chatBodies;
}

function renderChatSubMysteryGift(comment, index) {
  var chatBodies = [];

  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  //let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  let chatBody = $("<div>").addClass("chatbody no-time submysterygift isbiggiftsubmessage")
        .css('border-left-color', accentColor);
  
  // chatBody.append( makeUserBadges( comment ) );
  // The following does not work: message.is is not a function. Also with it being a mysteryGift
  // then it will always start with "is gifting" and will never have "subscribed"... so not needed:
  // if (message.is(':contains("is gifting")') && 
  //   !message.is(':contains("subscribed with Prime")') && 
  //   !message.is(':contains("subscribed at Tier")')){
	let giftedsub = $('<img class="isbiggiftsubmessageimg" src="img/subs/gift.png"/>');
	chatBody.append(giftedsub);
	// }
	
	
	
	
	var msg = message.text();
	
	
	let isgiftingTEXT = msg.match("Is gifting ");
	
	let toCommunity = msg.match("\Tier [0-9]+ Subs to .+'s community! ");
	
	let giftednumber = msg.replace(isgiftingTEXT , "").replace(toCommunity , "");
  
	let giftingmessage = $("<span>")
      .addClass("giftingmessage")
      .text(isgiftingTEXT);
	  
	let giftingnumber = $("<span>")
      .addClass("giftingnumber")
      .text(giftednumber);
	  
	let tostreamercommunity = $("<span>")
      .addClass("tocommunity")
      .text(toCommunity);

	chatBody.append(player);
	
	let bigsubgiftcontainer = $("<div>").addClass("bigsubgiftcontainer");
	chatBody.append(bigsubgiftcontainer);

    bigsubgiftcontainer.append( giftingmessage );
    bigsubgiftcontainer.append( giftingnumber );
    bigsubgiftcontainer.append( tostreamercommunity );

	// chatBody.append(message);
	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;
    let channelText = msg.match(" in the channel!");
    
    let msgGiftTotal = msg.match("They've gifted a total of ");
    
    let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
    
    let giftedTotal = $("<span>")
        .addClass("giftmessagetotal")
        .text(msgGiftTotal);
      
    let giftednumber = $("<span>")
        .addClass("giftednumber")
        .text(giftedtotalnumber);
      
    let toChannel = $("<span>")
        .addClass("tochannel")
        .text(channelText);

    bigsubgiftcontainer.append( giftedTotal );
    bigsubgiftcontainer.append( giftednumber );
    bigsubgiftcontainer.append( toChannel );
  }

  return chatBodies;
}

function renderTwitchGiftSub(comment, index) {
  var chatBodies = [];

  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: '#0e0e10' };

  let player = $("<span>")
    .addClass("Bonuscommenter")
    .css(styles)
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  //let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  let chatBody = $("<div>").addClass("chatbody no-time submysterygift isbonusgiftsubmessage")
        .css('border-left-color', '#a970ff');


	let giftedsub = $('<img class="isbonusgiftsubmessageimg" src="img/bonus_sub.png"/>');
	chatBody.append(giftedsub);
  

	var msg = message.text();
	
	
	let isgiftingTEXT = msg.match("Is gifting ");
	
	let toCommunity = msg.match("\Tier [0-9]+ Subs to .+'s community! ");
	
	let giftednumber = msg.replace(isgiftingTEXT , "").replace(toCommunity , "");
  
	let giftingmessage = $("<span>")
      .addClass("isbonusgiftsubmessagetxt")
      .text(msg);
	  
	let giftingnumber = $("<span>")
      .addClass("giftingnumber")
      .text(giftednumber);
	  
	let tostreamercommunity = $("<span>")
      .addClass("tocommunity")
      .text(toCommunity);

	chatBody.append(player);
	
	let bonussubgiftcontainer = $("<div>").addClass("bonussubgiftcontainer");
	chatBody.append(bonussubgiftcontainer);

    bonussubgiftcontainer.append( giftingmessage );

	// chatBody.append(message);
	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;
    let channelText = msg.match(" in the channel!");
    
    let msgGiftTotal = msg.match("They've gifted a total of ");
    
    let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
    
    let giftedTotal = $("<span>")
        .addClass("giftmessagetotal")
        .text(msgGiftTotal);
      
    let giftednumber = $("<span>")
        .addClass("giftednumber")
        .text(giftedtotalnumber);
      
    let toChannel = $("<span>")
        .addClass("tochannel")
        .text(channelText);

    bigsubgiftcontainer.append( giftedTotal );
    bigsubgiftcontainer.append( giftednumber );
    bigsubgiftcontainer.append( toChannel );
  }

  return chatBodies;
}

function renderBonusSub(comment, index) {
  var chatBodies = [];

  let message = extractMessageFragments(comment);

  let colorHex = comment.message.user_color;
  let styles = { color: '#0e0e10' };

  let player = $("<span>")
    .addClass("Bonuscommenter")
    .css(styles)
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  //let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  let chatBody = $("<div>").addClass("chatbody no-time submysterygift isbonusgiftsubmessage")
        .css('border-left-color', '#a970ff');


	let giftedsub = $('<img class="isbonusgiftsubmessageimg" src="img/bonus_sub.png"/>');
	chatBody.append(giftedsub);
  

	var msg = message.text();
	
	
	let isgiftingTEXT = msg.match("Is gifting ");
	
	let toCommunity = msg.match("\Tier [0-9]+ Subs to .+'s community! ");
	
	let giftednumber = msg.replace(isgiftingTEXT , "").replace(toCommunity , "");
  
	let giftingmessage = $("<span>")
      .addClass("isbonusgiftsubmessagetxt")
      .text(msg);
	  
	let giftingnumber = $("<span>")
      .addClass("giftingnumber")
      .text(giftednumber);
	  
	let tostreamercommunity = $("<span>")
      .addClass("tocommunity")
      .text(toCommunity);

	chatBody.append(player);
	
	let bonussubgiftcontainer = $("<div>").addClass("bonussubgiftcontainer");
	chatBody.append(bonussubgiftcontainer);

    bonussubgiftcontainer.append( giftingmessage );

	// chatBody.append(message);
	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;
    let channelText = msg.match(" in the channel!");
    
    let msgGiftTotal = msg.match("They've gifted a total of ");
    
    let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
    
    let giftedTotal = $("<span>")
        .addClass("giftmessagetotal")
        .text(msgGiftTotal);
      
    let giftednumber = $("<span>")
        .addClass("giftednumber")
        .text(giftedtotalnumber);
      
    let toChannel = $("<span>")
        .addClass("tochannel")
        .text(channelText);

    bigsubgiftcontainer.append( giftedTotal );
    bigsubgiftcontainer.append( giftednumber );
    bigsubgiftcontainer.append( toChannel );
  }

  return chatBodies;
}

function rendersubgift(comment, index) {
  var chatBodies = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  // let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");
  // let messageBold = message[0].outerHTML.replace("!", "</b>!").replace("sub to ", "sub to <b>");
  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  // let workingmessage = comment.message.body;
  let workingmessage = message[0].textContent;
  workingmessage = workingmessage.replace("gifted a Tier ", " gifted a Tier ");
  // console.log(workingmessage);
  
  // let theyvemessage = workingmessage.match("\They have given [0-9]{1,10} Gift Subs in the channel!");
  // let theyveremoved = workingmessage.replace(theyvemessage, "").trim();
  
  
  let middlemessageTEXT = workingmessage.match("\\ gifted a Tier [0-9] sub to \\b", "");
  let recievertext = workingmessage.replace(comment.commenter.display_name, "").replace(middlemessageTEXT, "").replace("!", "").trim();
  
  let reciever = $("<span>")
    .addClass("reciever")
    .text(recievertext);
  
  let exclamation  = $("<span>")
    .addClass("exclamation ")
    .text("! ");
	
	
  let middlemessage = $("<span>")
    .addClass("middlemessage")
    .text(middlemessageTEXT);
	
	// let restofmessage = $("<span>")
    // .addClass("restofmessage")
    // .text(theyvemessage);
	
	
  
  let subgiftcontainer = $("<div>").addClass("subgiftcontainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
  // if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
	let subgift = $('<svg class="smallgifticon"><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
	chatBody.append(subgift);
	// }
	// chatBody.append(player);
	
	chatBody.append(subgiftcontainer);
	subgiftcontainer.append(player);
	// subgiftcontainer.append(message);
	subgiftcontainer.append(middlemessage);
	subgiftcontainer.append(reciever);
	subgiftcontainer.append(exclamation);

	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;

    // console.log(msg);
		
		let channelText = msg.match(" Gift Subs in the channel!");
	
		let msgGiftTotal = msg.match("They have given ");
	
		let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
		let giftedTotal = $("<span>")
      .addClass("giftmessagetotal")
      .text(msgGiftTotal);
	  
		let giftednumber = $("<span>")
      .addClass("giftednumber")
      .text(giftedtotalnumber);
	  
		let toChannel = $("<span>")
      .addClass("tochannel")
      .text(channelText);

		subgiftcontainer.append( giftedTotal );
		subgiftcontainer.append( giftednumber );
		subgiftcontainer.append( toChannel );
		
  }

  return chatBodies;

	// if (theyvemessage) {
		
	// 	let theyvecontainer = $("<span>").addClass("theyvecontainer");
	// 	subgiftcontainer.append(theyvecontainer);
		
	// 	var msg = theyvemessage[0];
	// 	console.log(msg);
		
	// 	let channelText = msg.match(" Gift Subs in the channel!");
	
	// 	let msgGiftTotal = msg.match("They have given ");
	
	// 	let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
	// 	let giftedTotal = $("<span>")
	// 	.addClass("giftmessagetotal")
	// 	.text(msgGiftTotal);
	  
	// 	let giftednumber = $("<span>")
	// 	.addClass("giftednumber")
	// 	.text(giftedtotalnumber);
	  
	// 	let toChannel = $("<span>")
	// 	.addClass("tochannel")
	// 	.text(channelText);

	// 	theyvecontainer.append( giftedTotal );
	// 	theyvecontainer.append( giftednumber );
	// 	theyvecontainer.append( toChannel );
		
	// 	// theyvecontainer.append(restofmessage);		
	// }
	// return chatBody;

}

function renderConvertedSub(comment, index) {
	// console.log("ConvertedSub");
  var chatBodies = [];
  comment.message["alt_fragments"] = [];

  // comment.message.body;
  // console.log("Message: "+JSON.stringify(comment));
  let message = extractMessageFragments(comment);
  let messageSubBold = message[0].outerHTML.replace("converted", "<strong>Converted</strong>");

  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter")
    .css(styles)
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
	
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  // let workingmessage = comment.message.body;
  let workingmessage = message[0].textContent;
  // workingmessage - "Keeks7 converted from a Prime sub to a Tier 1 sub!"
  workingmessage = workingmessage.replace("converted from a ", " converted from a ");
  
  
  // workingmessage - "Keeks7  converted from a Prime sub to a Tier 1 sub!"
  let convertedFrom = workingmessage.match(" converted from a ", "");
  // convertedFrom - " converted from a "
  let toAMessage = workingmessage.match(" to a ", "");
  // convertedFrom - " to a "
  let subType1Message = workingmessage.replace(comment.commenter.display_name, "").replace(convertedFrom, "").replace("!", "").replace( new RegExp("\\ sub to a (Prime|Tier \\d) sub","gm"), "").trim();
  // subType1 - "Prime"
  let subType2Message = workingmessage.replace(comment.commenter.display_name, "").replace(convertedFrom, "").replace("!", "").replace( new RegExp("\\ (Prime|Tier \d) sub to a ","gm"), "").replace(" sub","").trim();
  // subType1 - "Tier 1"
  
  let subType1 = $("<span>")
    .addClass("reciever")
    .text(subType1Message);
  
  let subType2 = $("<span>")
    .addClass("reciever")
    .text(subType2Message);
  
  let endingSub = $("<span>")
    .addClass("middlemessage")
    .text(" sub");
  
  let exclamation  = $("<span>")
    .addClass("exclamation ")
    .text("! ");
	
	
  let middlemessage1 = $("<span>")
    .addClass("middlemessage")
    .text(convertedFrom);
	
  let middlemessage2 = $("<span>")
    .addClass("middlemessage")
    .text(toAMessage);
	
	// let restofmessage = $("<span>")
    // .addClass("restofmessage")
    // .text(theyvemessage);
  

  let chatBody = $("<div>").addClass("chatbody no-time issub issubmessage")
      .css('border-left-color', accentColor);

  if (subType2Message.includes("Tier 1")) {
      let tier1Sub = $('<svg class="staricon"><path class="tierOneSub" d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77zz"/></svg>');
      chatBody.append(tier1Sub);
  }
  if (subType2Message.includes("Tier 2")) {
      let tier2Sub = $('<svg class="staricon animated-tier-star animated-tier-star--tier-2 " viewBox="0 0 20 20" width="20" height="20" overflow="visible"><defs><linearGradient x1="0%" x2="100%" y1="0%" y2="100%" id="swipe-gradient"><stop offset="0%" stop-color="#9147ff"></stop><stop offset="100%" stop-color="#d1b3ff"></stop></linearGradient><clipPath id="star-mask" class="animated-tier-star__star-mask"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></clipPath></defs><g class="animated-tier-star__star"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></g><g width="20" height="20" class="animated-tier-star__swipe-mask" clip-path="url(#star-mask)"><g class="animated-tier-star__swipe-group"><rect class="animated-tier-star__swipe animated-tier-star__swipe--1" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--2" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--3" fill="url(#swipe-gradient)"></rect></g></g></svg>');
      chatBody.append(tier2Sub);
  }
  if (subType2Message.includes("Tier 3")) {
      let tier3Sub = $('<svg class="staricon animated-tier-star animated-tier-star--tier-3 " viewBox="0 0 20 20" width="20" height="20" overflow="visible"><defs><linearGradient x1="0%" x2="100%" y1="0%" y2="100%" id="swipe-gradient"><stop offset="0%" stop-color="#9147ff"></stop><stop offset="100%" stop-color="#d1b3ff"></stop></linearGradient><clipPath id="star-mask" class="animated-tier-star__star-mask"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></clipPath></defs><g class="animated-tier-star__star"><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></g><g width="20" height="20" class="animated-tier-star__swipe-mask" clip-path="url(#star-mask)"><g class="animated-tier-star__swipe-group"><rect class="animated-tier-star__swipe animated-tier-star__swipe--1" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--2" fill="url(#swipe-gradient)"></rect><rect class="animated-tier-star__swipe animated-tier-star__swipe--3" fill="url(#swipe-gradient)"></rect></g></g></svg>');
      chatBody.append(tier3Sub);
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
      .text(clonedComment.commenter.display_name)
	.attr("data-commentindex", index);
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

function renderChatAdvanceSub(comment, index) {
  var chatBodies = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  // let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");
  // let messageBold = message[0].outerHTML.replace("!", "</b>!").replace("sub to ", "sub to <b>");
  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  // let workingmessage = comment.message.body;
  let workingmessage = message[0].textContent;
  workingmessage = workingmessage.replace("gifted ", " gifted ");
  // console.log(workingmessage);
  
  // let theyvemessage = workingmessage.match("\They have given [0-9]{1,10} Gift Subs in the channel!");
  // let theyveremoved = workingmessage.replace(theyvemessage, "").trim();
  
  
  let middlemessageTEXT = workingmessage.match("\\ gifted \\d+ months of Tier \\d+ to \\w+", "");
  let recievertext = workingmessage.replace(comment.commenter.display_name, "").replace(middlemessageTEXT, "").replace("!", "").trim();
  
  let reciever = $("<span>")
    .addClass("reciever")
    .text(recievertext);
  
  let exclamation  = $("<span>")
    .addClass("exclamation ")
    .text("! ");
	
	
  let middlemessage = $("<span>")
    .addClass("middlemessage")
    .text(middlemessageTEXT);
	
	// let restofmessage = $("<span>")
    // .addClass("restofmessage")
    // .text(theyvemessage);
	
	
  
  let subgiftcontainer = $("<div>").addClass("subgiftcontainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
  // if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
	let subgift = $('<svg class="smallgifticon"><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
	chatBody.append(subgift);
	// }
	// chatBody.append(player);
	
	chatBody.append(subgiftcontainer);
	subgiftcontainer.append(player);
	// subgiftcontainer.append(message);
	subgiftcontainer.append(middlemessage);
	subgiftcontainer.append(reciever);
	subgiftcontainer.append(exclamation);

	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;

    // console.log(msg);
		
		let channelText = msg.match(" months in the channel!");
	
		let msgGiftTotal = msg.match("They've gifted ");
	
		let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
		let giftedTotal = $("<span>")
      .addClass("giftmessagetotal")
      .text(msgGiftTotal);
	  
		let giftednumber = $("<span>")
      .addClass("giftednumber")
      .text(giftedtotalnumber);
	  
		let toChannel = $("<span>")
      .addClass("tochannel")
      .text(channelText);

		subgiftcontainer.append( giftedTotal );
		subgiftcontainer.append( giftednumber );
		subgiftcontainer.append( toChannel );
		
  }

  return chatBodies;

	// if (theyvemessage) {
		
	// 	let theyvecontainer = $("<span>").addClass("theyvecontainer");
	// 	subgiftcontainer.append(theyvecontainer);
		
	// 	var msg = theyvemessage[0];
	// 	console.log(msg);
		
	// 	let channelText = msg.match(" Gift Subs in the channel!");
	
	// 	let msgGiftTotal = msg.match("They have given ");
	
	// 	let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
	// 	let giftedTotal = $("<span>")
	// 	.addClass("giftmessagetotal")
	// 	.text(msgGiftTotal);
	  
	// 	let giftednumber = $("<span>")
	// 	.addClass("giftednumber")
	// 	.text(giftedtotalnumber);
	  
	// 	let toChannel = $("<span>")
	// 	.addClass("tochannel")
	// 	.text(channelText);

	// 	theyvecontainer.append( giftedTotal );
	// 	theyvecontainer.append( giftednumber );
	// 	theyvecontainer.append( toChannel );
		
	// 	// theyvecontainer.append(restofmessage);		
	// }
	// return chatBody;

}

function renderChatSubGiftAdvance(comment, index) {
  var chatBodies = [];
  
  // console.log(comment);

  // comment.message.body;
  let message = extractMessageFragments(comment);
  // console.log(message);
  
  // let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");
  // let messageBold = message[0].outerHTML.replace("!", "</b>!").replace("sub to ", "sub to <b>");
  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  // let workingmessage = comment.message.body;
  let workingmessage = message[0].textContent;
  // console.log(workingmessage)
  workingmessage = workingmessage.replace("gifted ", " gifted ");
  // console.log(workingmessage);
  
  // let theyvemessage = workingmessage.match("\They have given [0-9]{1,10} Gift Subs in the channel!");
  // let theyveremoved = workingmessage.replace(theyvemessage, "").trim();
  
  
  let middlemessageTEXT = workingmessage.match("\\ gifted \\d+ months of Tier \\d+ to ", "");
  let recievertext = workingmessage.replace(comment.commenter.display_name, "").replace(middlemessageTEXT, "").replace(".", "").trim();
  // console.log(middlemessageTEXT);
  // console.log("reciever: "+recievertext);
  
  let reciever = $("<span>")
    .addClass("reciever")
    .text(recievertext);
  
  let exclamation  = $("<span>")
    .addClass("exclamation ")
    .text(". ");
	
	
  let middlemessage = $("<span>")
    .addClass("middlemessage")
    .text(middlemessageTEXT);
	
	// let restofmessage = $("<span>")
    // .addClass("restofmessage")
    // .text(theyvemessage);
	
	
  
  let subgiftcontainer = $("<div>").addClass("subgiftcontainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
  // if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
	let subgift = $('<svg class="smallgifticon"><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
	chatBody.append(subgift);
	// }
	// chatBody.append(player);
	
	chatBody.append(subgiftcontainer);
	subgiftcontainer.append(player);
	// subgiftcontainer.append(message);
	subgiftcontainer.append(middlemessage);
	subgiftcontainer.append(reciever);
	subgiftcontainer.append(exclamation);

	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;

    // console.log(msg);
		
		let channelText = msg.match(" in the channel!");
	
		let msgGiftTotal = msg.match("They've gifted ");
	
		let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
		let giftedTotal = $("<span>")
      .addClass("giftmessagetotal")
      .text(msgGiftTotal);
	  
		let giftednumber = $("<span>")
      .addClass("giftednumber")
      .text(giftedtotalnumber);
	  
		let toChannel = $("<span>")
      .addClass("tochannel")
      .text(channelText);

		subgiftcontainer.append( giftedTotal );
		subgiftcontainer.append( giftednumber );
		subgiftcontainer.append( toChannel );
		
  }

  return chatBodies;

	// if (theyvemessage) {
		
	// 	let theyvecontainer = $("<span>").addClass("theyvecontainer");
	// 	subgiftcontainer.append(theyvecontainer);
		
	// 	var msg = theyvemessage[0];
	// 	console.log(msg);
		
	// 	let channelText = msg.match(" Gift Subs in the channel!");
	
	// 	let msgGiftTotal = msg.match("They have given ");
	
	// 	let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
	// 	let giftedTotal = $("<span>")
	// 	.addClass("giftmessagetotal")
	// 	.text(msgGiftTotal);
	  
	// 	let giftednumber = $("<span>")
	// 	.addClass("giftednumber")
	// 	.text(giftedtotalnumber);
	  
	// 	let toChannel = $("<span>")
	// 	.addClass("tochannel")
	// 	.text(channelText);

	// 	theyvecontainer.append( giftedTotal );
	// 	theyvecontainer.append( giftednumber );
	// 	theyvecontainer.append( toChannel );
		
	// 	// theyvecontainer.append(restofmessage);		
	// }
	// return chatBody;

}

function rendersubgiftContinue(comment, index) {
  var chatBodies = [];

  // comment.message.body;
  let message = extractMessageFragments(comment);
  
  // let messageNameRemoved = message[0].outerHTML.replace(comment.commenter.display_name, "");
  // let messageBold = message[0].outerHTML.replace("!", "</b>!").replace("sub to ", "sub to <b>");
  let colorHex = comment.message.user_color;
  let styles = { color: colorHex };

  let player = $("<span>")
    .addClass("commenter2")
    .text(comment.commenter.display_name)
	.attr("data-commentindex", index);
  let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
  
  
  // let workingmessage = comment.message.body;
  let workingmessage = message[0].textContent;
  workingmessage = workingmessage.replace("gifted a Tier ", " gifted a Tier ");
  // console.log(workingmessage);
  
  // let theyvemessage = workingmessage.match("\They have given [0-9]{1,10} Gift Subs in the channel!");
  // let theyveremoved = workingmessage.replace(theyvemessage, "").trim();
  
  
  let middlemessageTEXT = workingmessage.match("\\ is continuing the Gift Sub they got from \\b", "");
  let recievertext = workingmessage.replace(comment.commenter.display_name, "").replace(middlemessageTEXT, "").replace("!", "").trim();
  
  let reciever = $("<span>")
    .addClass("reciever")
    .text(recievertext);
  
  let exclamation  = $("<span>")
    .addClass("exclamation ")
    .text("! ");
	
	
  let middlemessage = $("<span>")
    .addClass("middlemessage")
    .text(middlemessageTEXT);
	
	// let restofmessage = $("<span>")
    // .addClass("restofmessage")
    // .text(theyvemessage);
	
	
  
  let subgiftcontainer = $("<div>").addClass("subgiftcontainer")

  let chatBody = $("<div>").addClass("chatbody no-time issubgift issubmessage")
        .css('border-left-color', accentColor);
  // chatBody.append( makeUserBadges( comment ) );
  // if (message.is(':contains("gifted a Tier")') && !message.is(':contains("subscribed with Prime")') && !message.is(':contains("subscribed at Tier")')){
	let subgift = $('<svg class="smallgifticon"><path class="subgift" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z" fill-rule="evenodd"/></svg>');
	chatBody.append(subgift);
	// }
	// chatBody.append(player);
	
	chatBody.append(subgiftcontainer);
	subgiftcontainer.append(player);
	// subgiftcontainer.append(message);
	subgiftcontainer.append(middlemessage);
	subgiftcontainer.append(reciever);
	subgiftcontainer.append(exclamation);

	chatBodies.push( chatBody );

  // If a mysteryGift has a Total Gifts component, then process that:
  if ( comment.message.alt_fragments && comment.message.alt_fragments.length ) {
    let fragment = comment.message.alt_fragments[0];

    var msg = fragment.text;

    // console.log(msg);
		
		let channelText = msg.match(" Gift Subs in the channel!");
	
		let msgGiftTotal = msg.match("They have given ");
	
		let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
		let giftedTotal = $("<span>")
      .addClass("giftmessagetotal")
      .text(msgGiftTotal);
	  
		let giftednumber = $("<span>")
      .addClass("giftednumber")
      .text(giftedtotalnumber);
	  
		let toChannel = $("<span>")
      .addClass("tochannel")
      .text(channelText);

		subgiftcontainer.append( giftedTotal );
		subgiftcontainer.append( giftednumber );
		subgiftcontainer.append( toChannel );
		
  }

  return chatBodies;

	// if (theyvemessage) {
		
	// 	let theyvecontainer = $("<span>").addClass("theyvecontainer");
	// 	subgiftcontainer.append(theyvecontainer);
		
	// 	var msg = theyvemessage[0];
	// 	console.log(msg);
		
	// 	let channelText = msg.match(" Gift Subs in the channel!");
	
	// 	let msgGiftTotal = msg.match("They have given ");
	
	// 	let giftedtotalnumber = msg.replace(msgGiftTotal , "").replace(channelText , "");
  
	// 	let giftedTotal = $("<span>")
	// 	.addClass("giftmessagetotal")
	// 	.text(msgGiftTotal);
	  
	// 	let giftednumber = $("<span>")
	// 	.addClass("giftednumber")
	// 	.text(giftedtotalnumber);
	  
	// 	let toChannel = $("<span>")
	// 	.addClass("tochannel")
	// 	.text(channelText);

	// 	theyvecontainer.append( giftedTotal );
	// 	theyvecontainer.append( giftednumber );
	// 	theyvecontainer.append( toChannel );
		
	// 	// theyvecontainer.append(restofmessage);		
	// }
	// return chatBody;

}




function extractMessageFragments(comment) {

  let message = $("<span>").addClass("chatmessage");
  //.text( comment.message.body );
  // console.log(comment);

  // Expands message fragments to isolate and mark Cheers:
  //   Cheer is identified by: ( fragment.isCheer === true )
  var fragments = getExpandedMessageFragments( comment.message.fragments, comment );

  jQuery.each(fragments, function (index, fragment) {
	  
	// console.log("fragment: "+JSON.stringify(fragment));
    var altName = " " + fragment.text.trim();
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
    else if ( fragment.isBits ) {
      // Process fragment as a Cheer:
	  // console.log("fragment: "+JSON.stringify(fragment));
      message.append( buildFragmentBits( fragment ) );
      message.append( buildFragmentBitsNumber( fragment ) );
    }
    else if ( fragment.isSubResub ) {
      message.append( buildFragmentSubResub( fragment ) );
    }
    else if ( fragment.isConvertedSub ) {
      message.append( buildFragmentConvertedSub( fragment ) );
    }
    else if ( fragment.isSubadvance ) {
      message.append( buildFragmentSubAdvance( fragment ) );
    }
    else if ( fragment.isSubGiftAdvance ) {
      message.append( buildFragmentSubGiftAdvance( fragment ) );
    }
    else if ( fragment.isSubResubTheyve ) {
      message.append( buildFragmentSubResubTheyve( fragment ) );
      
    }

    else if ( fragment.isSubGift ) {
      message.append( altName );
    }
    else if ( fragment.isSubGiftTotalGifts ) {
      message.append( altName );
    }

    else if ( fragment.isSubMysteryGift ) {
      message.append( buildFragmentMysteryGift(fragment) );
    }
    else if ( fragment.isSubMysteryGiftTotalGifts ) {
      message.append( buildFragmentMysteryGiftTotalGifts(fragment) );
    }

    else if (fragment.emoticon && fragment.emoticon.emoticon_id) {

      message.append(makeEmoticon(fragment.emoticon.emoticon_id, altName));
    } 
    else if ( fragment.isSubgift ) {
		message.addClass("subgiftcontainer").removeClass("chatmessage");
		// console.log(fragment);
		message.append(buildFragmentSubGift( fragment ));
		// makeSubGiftMiddleMessage( fragment, comment, message );
		// makeSubGiftReciever( fragment, comment, message );
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
function buildFragmentBits( fragment ) {
  var cheer = fragment.text.trim();
  // console.log("cheer: "+ cheer);
  
  var bitsFilterMatch = "(" + bitsFilterplain + ")"
  // console.log("bitsFilterMatch: "+ bitsFilterMatch);
  
  var pattern = new RegExp(bitsFilterMatch, "ig");
  // console.log(pattern);
  
  var amount = cheer.replace(pattern, "");
  // console.log("amount: "+ amount);
  
  var type = cheer.match(pattern); 
  // console.log("Type: "+ type);
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
	
	var bitemote = null;
	$.each(bitsArray, function (key, value) {
	    if ( type && type.length > 0 && key.toLowerCase() === type[0].toLowerCase() ) {
	        bitemote = value;
	        return true;
	    }
	})
	
	// console.log("bitsArray: "+ JSON.stringify(bitsArray, null, 4));
	// var bitemote = bitsArray[type];
	// console.log("bitemote: "+JSON.stringify(bitemote));
	
	var version = newcheeramount;
	
	
	if (typeof bitemote.tierList[version] === 'undefined') {
		var version = 10000;
		var imgSrc = bitemote.tierList[version].data;
		// console.log("imgSrc: "+JSON.stringify(imgSrc));
		
	} else{
		var imgSrc = bitemote.tierList[version].data;
		// console.log("imgSrc: "+JSON.stringify(imgSrc));
	}
	
	
  
  var img = $("<img>")
      .attr("title", cheer )
      .addClass("cheer")
      .attr("data-cheeramount", amount)
      .attr("src", "data:image/png;base64," + imgSrc);

  return img;
}
function buildFragmentBitsNumber( fragment ) {
  var cheer = fragment.text.trim();
  // console.log("cheer: "+ cheer);
  
  var bitsFilterMatch = "(" + bitsFilterplain + ")"
  // console.log("bitsFilterMatch: "+ bitsFilterMatch);
  
  var pattern = new RegExp(bitsFilterMatch, "ig");
  
  var amount = cheer.replace(pattern, "");
  // console.log("amount: "+ amount);
  
  var type = cheer.match(pattern); 
  // console.log("Type: "+ type);
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

function buildFragmentConvertedSub( fragment ) {
  var msg = fragment.text.trim();
  msg = msg.replace( "Prime", '<b class="prime">Prime</b>');
  if ( msg.indexOf("Tier") > -1 ) {
    msg = msg.replace("Tier 1", '<b class="tier tier1">Tier 1</b>');
    msg = msg.replace("Tier 2", '<b class="tier tier2">Tier 2</b>');
    msg = msg.replace("Tier 3", '<b class="tier tier3">Tier 3</b>');
  }
  var result = $("<span>")
      .addClass("subResub")
      .html( msg );

  // console.log("### buildFragmentSubResub (1444): msg=" + msg );
  return result;
}

function buildFragmentSubAdvance( fragment ) {
  var msg = fragment.text.trim();
  
  if ( msg.indexOf("Tier") > -1 ) {
    msg = msg.replace("Tier 1", '<b class="tier tier1">Tier 1').replace(" for", "</b> for");
    msg = msg.replace("Tier 2", '<b class="tier tier2">Tier 2').replace(" for", "</b> for");
    msg = msg.replace("Tier 3", '<b class="tier tier3">Tier 3').replace(" for", "</b> for");
  }
  var result = $("<span>")
      .addClass("subResub")
      .html( msg );

  //console.log("### buildFragmentSubResub (1444): msg=" + msg );
  return result;
}

function buildFragmentSubGiftAdvance( fragment ) {
  var msg = fragment.text.trim();
  
  if ( msg.indexOf("Tier") > -1 ) {
    msg = msg.replace("Tier 1", '<b class="tier tier1">Tier 1').replace(" for", "</b> for");
    msg = msg.replace("Tier 2", '<b class="tier tier2">Tier 2').replace(" for", "</b> for");
    msg = msg.replace("Tier 3", '<b class="tier tier3">Tier 3').replace(" for", "</b> for");
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

function buildFragmentMysteryGift(fragment) {
  var msg = fragment.text.trim().replace("community!", "community! ");
  
  // let giftmessage = $("<span>")
      // .addClass("giftmessage")
      // .text( msg );
  
  return msg;
}
function buildFragmentMysteryGiftTotalGifts(fragment) {
  var msg = fragment.text.trim();
  
  let giftmessageTotalGifts = $("<span>")
      .addClass("giftmessagetotalgifts")
      .text( msg );
  
  return giftmessageTotalGifts;
}
function makeSubGiftMiddleMessage( fragment, comment, message ) {
  var msg = fragment.text.trim();
  var middleText = msg.match("\\b gifted a Tier [0-9] sub to \\b");
  
  var middleMessage = $("<span>")
      .addClass("middleMessage")
      .html( middleText );
	  

  message.append(middleMessage);
}
function makeSubGiftReciever( fragment, comment, message ) {
  var msg = fragment.text.trim();
  var msgNoName = msg.replace( comment.commenter.display_name, "");
  var msgReciever = msgNoName.replace("\\gifted a Tier [0-9] sub to \\", "");
  
	  
  var reciever = $("<span>")
      .addClass("reciever")
      .html( msgReciever );

  message.append(reciever);
}
function buildFragmentSubGift( fragment ) {
  var msg = fragment.text.trim();
  
	  
  var result = $("<span>")
      .addClass("SubGift")
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
	if (chatEmotes.twitchBits) {
	    if (regExBits.test(fragment.text) || regExCheers.test(fragment.text) ||
	        regExSubResub.test(fragment.text) ||
	        regExSubGift.test(fragment.text) ||
	        regExConvertedSub.test(fragment.text) ||
	        regExRaid.test(fragment.text) ||
	        regExSubGiftAdvance.test(fragment.text) ||
	        regExSubMysteryGift.test(fragment.text) ||
	        regExSubadvance.test(fragment.text)) {

	        // if ( regExSubResub.test( fragment.text ) ) {

	        //   console.log( "##### getExpandedMessageFragments (1422): regExSubResub.test(): " +
	        //                 regExSubResub.test( fragment.text ) + " userName: " + userName );
	        // }
	// console.log("fragment2: "+JSON.stringify(fragment));
	        var splits = processFragmentsSplitText(fragment.text);

	        var isSubGift = false;
	        var isMysteryGift = false;
	
	        jQuery.each(splits, function (idx, splitText) {

	            if (!splitText.trim().length) {
	                return;
	            }

	            var newFragment = {
	                "text": splitText,
	                "emoticon": fragment.emoticon
	            };

	            if (regExBits.test(splitText)) {
	                // We have an Embedded Bit node:  Mark it as such...
	                newFragment["isBits"] = true;
	                results.push(newFragment);
	            } else if (regExCheers.test(splitText)) {
	                // We have a cheer node:  Mark it as such...
	                newFragment["isCheer"] = true;
	                results.push(newFragment);
	            } else if (regExSubResub.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                // console.log("### regExSubResub.test (15105): text= " + splitText );

	                newFragment["text"] = splitText;
	                newFragment["isSubResub"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubadvance.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                // console.log("### regExSubResub.test (15105): text= " + splitText );

	                newFragment["text"] = splitText;
	                newFragment["isSubadvance"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubResubTheyve.test(splitText)) {
	                // console.log("### regExSubResubTheyve.test (1519): text= " + splitText );
	                newFragment["isSubResubTheyve"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubGift.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubGift"] = true;

	                isSubGift = true;
	                results.push(newFragment);
	            } else if (regExRaid.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
					
					// console.log("SplitText: "+splitText);
	                newFragment["text"] = splitText;

	                newFragment["isRaid"] = true;

	                results.push(newFragment);
	            } else if (regExConvertedSub.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
					
					// console.log("SplitText: "+splitText);
	                newFragment["text"] = splitText;

	                newFragment["isConvertedSub"] = true;

	                results.push(newFragment);
	            } else if (regExSubGiftAdvance.test(splitText)) {
					// console.log(splitText);
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                // console.log(splitText);
					splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubGiftAdvance"] = true;

	                isSubGift = true;
					// console.log(newFragment);
	                results.push(newFragment);
	            } else if (isSubGift) {
	                newFragment["isSubGiftTotalGifts"] = true;

	                altFragmentProcessing = true;
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else if (regExSubMysteryGift.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubMysteryGift"] = true;

	                isMysteryGift = true;
	                results.push(newFragment);
	            } else if (isMysteryGift) {
	                newFragment["isSubMysteryGiftTotalGifts"] = true;

	                altFragmentProcessing = true;
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else if (altFragmentProcessing && comment) {
	                // if processing altFragments, and if comment is not null, then we need to store
	                // these alt_fragments should not be returned from this function, but added to the
	                // comment.message.alt_fragments array.  These altFragments will be used to
	                // construct a secondary message after the system-generate message has been
	                // processed and added.
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else {

	                results.push(newFragment);
	            }
	        });

	    } else if (altFragmentProcessing && comment) {
	        // if processing altFragments, and if comment is not null, then we need to store
	        // these alt_fragments should not be returned from this function, but added to the
	        // comment.message.alt_fragments array.  These altFragments will be used to
	        // construct a secondary message after the system-generate message has been
	        // processed and added.
	        if (!comment.message["alt_fragments"]) {
	            comment.message["alt_fragments"] = [];
	        }
	        comment.message["alt_fragments"].push(fragment);
	    } else {
	        // No cheer, so just add the fragment:
	        results.push(fragment);
	    }
	} else {
	    if (regExCheers.test(fragment.text) ||
	        regExSubResub.test(fragment.text) ||
	        regExSubGift.test(fragment.text) ||
	        regExRaid.test(fragment.text) ||
	        regExConvertedSub.test(fragment.text) ||
	        regExSubGiftAdvance.test(fragment.text) ||
	        regExSubMysteryGift.test(fragment.text) ||
	        regExSubadvance.test(fragment.text)) {

	        // if ( regExSubResub.test( fragment.text ) ) {

	        //   console.log( "##### getExpandedMessageFragments (1422): regExSubResub.test(): " +
	        //                 regExSubResub.test( fragment.text ) + " userName: " + userName );
	        // }
	
	        var splits = processFragmentsSplitText(fragment.text);

	        var isSubGift = false;
	        var isMysteryGift = false;

	        jQuery.each(splits, function (idx, splitText) {

	            if (!splitText.trim().length) {
	                return;
	            }

	            var newFragment = {
	                "text": splitText,
	                "emoticon": fragment.emoticon
	            };

	            if (regExCheers.test(splitText)) {
	                // We have a cheer node:  Mark it as such...
	                newFragment["isCheer"] = true;
	                results.push(newFragment);
	            } else if (regExSubResub.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                // console.log("### regExSubResub.test (15105): text= " + splitText );

	                newFragment["text"] = splitText;
	                newFragment["isSubResub"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubadvance.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                // console.log("### regExSubResub.test (15105): text= " + splitText );

	                newFragment["text"] = splitText;
	                newFragment["isSubadvance"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubResubTheyve.test(splitText)) {
	                // console.log("### regExSubResubTheyve.test (1519): text= " + splitText );
	                newFragment["isSubResubTheyve"] = true;

	                altFragmentProcessing = true;
	                results.push(newFragment);
	            } else if (regExSubGift.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubGift"] = true;

	                isSubGift = true;
	                results.push(newFragment);
	            } else if (regExRaid.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;
					// console.log("splitText: "+splitText);

	                newFragment["isRaid"] = true;

	                isSubGift = true;
	                results.push(newFragment);
	            } else if (regExConvertedSub.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;
					// console.log("splitText: "+splitText);

	                newFragment["isConvertedSub"] = true;

	                isSubGift = true;
	                results.push(newFragment);
	            } else if (regExSubGiftAdvance.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0) + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubGiftAdvance"] = true;

	                isSubGift = true;
	                results.push(newFragment);
	            } else if (isSubGift) {
	                newFragment["isSubGiftTotalGifts"] = true;

	                altFragmentProcessing = true;
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else if (regExSubMysteryGift.test(splitText)) {
	                var userName = comment.commenter.display_name;

	                splitText = splitText.replace(userName, "").replace("An anonymous user", "").trim();
	                splitText = splitText.charAt(0).toUpperCase() + splitText.slice(1);
	                newFragment["text"] = splitText;

	                newFragment["isSubMysteryGift"] = true;

	                isMysteryGift = true;
	                results.push(newFragment);
	            } else if (isMysteryGift) {
	                newFragment["isSubMysteryGiftTotalGifts"] = true;

	                altFragmentProcessing = true;
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else if (altFragmentProcessing && comment) {
	                // if processing altFragments, and if comment is not null, then we need to store
	                // these alt_fragments should not be returned from this function, but added to the
	                // comment.message.alt_fragments array.  These altFragments will be used to
	                // construct a secondary message after the system-generate message has been
	                // processed and added.
	                if (!comment.message["alt_fragments"]) {
	                    comment.message["alt_fragments"] = [];
	                }
	                comment.message["alt_fragments"].push(newFragment);
	            } else {

	                results.push(newFragment);
	            }
	        });

	    } else if (altFragmentProcessing && comment) {
	        // if processing altFragments, and if comment is not null, then we need to store
	        // these alt_fragments should not be returned from this function, but added to the
	        // comment.message.alt_fragments array.  These altFragments will be used to
	        // construct a secondary message after the system-generate message has been
	        // processed and added.
	        if (!comment.message["alt_fragments"]) {
	            comment.message["alt_fragments"] = [];
	        }
	        comment.message["alt_fragments"].push(fragment);
	    } else {
	        // No cheer, so just add the fragment:
	        results.push(fragment);
	    }

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
  
  if (chatEmotes.twitchBits) {
      if (regExBits.test(sourceText)) {
		  // console.log("fragment: "+JSON.stringify(sourceText));
          splits = sourceText.split(regExBits).filter(Boolean);
		  // console.log("regExCheers: "+regExCheers);
		  // console.log("regExBits: "+regExBits);
		  // console.log("splits: "+JSON.stringify(sourceText.split(regExBits)));
      } else if (regExCheers.test(sourceText)) {
		  // console.log("fragment2: "+JSON.stringify(sourceText));
          splits = sourceText.split(regExCheers).filter(Boolean);
		  // console.log("splits2: "+JSON.stringify(splits));
      } else if (regExSubResub.test(sourceText)) {
          var s = sourceText.split(regExSubResub).filter(Boolean);
          splits.push(s[0]);
          splits = splits.concat(s[1].trim().split(regExSubResubTheyve).filter(Boolean));

      } else if (regExSubGift.test(sourceText)) {
          var s = sourceText.split(regExSubGift).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else if (regExSubGiftAdvance.test(sourceText)) {
		  // console.log(sourceText);
          var s = sourceText.split(regExSubGiftAdvance).filter(Boolean);
		  // console.log(s);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else if (regExSubMysteryGift.test(sourceText)) {
          var s = sourceText.split(regExSubMysteryGift).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else {
          // No Cheer, no subResub, so just add to splits:
          splits.push(sourceText);
      }
  } else {
      if (regExCheers.test(sourceText)) {
          splits = sourceText.split(regExCheers).filter(Boolean);
      } else if (regExSubResub.test(sourceText)) {
          var s = sourceText.split(regExSubResub).filter(Boolean);
          splits.push(s[0]);
          splits = splits.concat(s[1].trim().split(regExSubResubTheyve).filter(Boolean));

      } else if (regExSubGift.test(sourceText)) {
          var s = sourceText.split(regExSubGift).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else if (regExRaid.test(sourceText)) {
          var s = sourceText.split(regExRaid).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else if (regExConvertedSub.test(sourceText)) {
          var s = sourceText.split(regExConvertedSub).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else if (regExSubMysteryGift.test(sourceText)) {
          var s = sourceText.split(regExSubMysteryGift).filter(Boolean);
          splits.push(s[0].trim());
          if (s.length > 1) {
              splits = splits.concat(s[1].trim());
          }
      } else {
          // No Cheer, no subResub, so just add to splits:
          splits.push(sourceText);
      }
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
  
  if (typeof comment.message.user_badges === 'null' || comment.message.user_badges === 'null' || !comment.message.user_badges) {
	  // console.log("user_badges for user " + comment.commenter.display_name + " :" + comment.message.user_badges);
	  // console.log("returning");
	  return;
  } else if (!comment.message.user_badges.length) {
	  // console.log("user_badges for user " + comment.commenter.display_name + " :" + comment.message.user_badges);
	  // console.log("!returning");
	  return;
  } else {
		// console.log("user_badges for user " + comment.commenter.display_name + " :" + comment.message.user_badges);
		var userBadges = $("<span>").addClass("user-badges");
		// console.log("Making Badges!");
		// var url = twitchGlobalBadgeUrl
		// .replace("{{id}}", id)
		// var url = twitchEmoticonsUrl
		// .replace("{{format}}", "static")
		// .replace("{{theme_mode}}", chatThemeMode);
		// .replace("{{id}}", id)
		// var emotesBadges = chatJson.embeddedData.twitchBadges;
		// console.log("emotesBadges: " + JSON.stringify(emotesBadges));
	
	
	if (chatEmotes.twitchBadges){
		
		
		
		jQuery.each(comment.message.user_badges, function (index, badge) {
			
			

		    var badgeID = badge["_id"];
			// console.log(badge);
			if (!badgeID){
				return;
			}
		    var badgeVersion = badge.version;
		    var badgeImagePrefix = "data:image/png;base64,";

		    // console.log("Badge ID: " + badgeID);
		    // console.log("Badge Version: " + badgeVersion);

		    var imgSrc;
		    var badgeTitle;

		    var badges = emotesBadges[badgeID];
		    // console.log("badges: " + JSON.stringify(badges));


		    if (badges.versions[badgeVersion].bytes) {
		        // console.log("It Has Extra Data");
				
				

		        imgSrc = badges.versions[badgeVersion].bytes;
		        // console.log("imgSrc: " + imgSrc);

		        var badgeVer = badge.version;

		        badgeTitle = badges.versions[badgeVersion].title;
				
				

		    } else {
		        // console.log("It Is Alone");

		        imgSrc = badges.versions[badgeVersion];
		        // console.log("imgSrc: " + imgSrc);

		        var badgeVer = badge.version;

		        if (badgeVer === "1") {
		            badgeTitle = badges.name
		                // console.log("badgeTitle: " + badgeTitle);
		        } else {
		            badgeTitle = badges.name + " " + badgeVer;
		            // console.log("badgeTitle: " + badgeTitle);
		        }

		    }

		    var badgeImg = $("<img>")
		        .attr("src", badgeImagePrefix + imgSrc)
		        .addClass("badge-size")
		        .attr("title", badgeTitle);
		    userBadges.append(badgeImg);

		});
		
		
		
	} else {
	
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
  setsavedaccentColor();
});
