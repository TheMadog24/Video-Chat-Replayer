'use strict'

function initChat() {

}

function localFileVideoPlayer() {
	var URL = window.URL || window.webkitURL;
	var videoNode = document.querySelector('video');
	var chatNode = document.querySelector('#chat');
	var chatJson;
	

	var displayMessage = function (message, isError) {
		var element = document.querySelector('#message')
			element.innerHTML = message
			element.className = isError ? 'error' : 'info'
	}

	var playSelectedFile = function (event) {
		var file = this.files[0]
		var type = file.type
		
		var canPlay = videoNode.canPlayType(type)
		if (canPlay === '') canPlay = 'no'
		var message = 'Can play type "' + type + '": ' + canPlay
		var isError = canPlay === 'no'
		displayMessage(message, isError);

		if (isError) {
			return;
		}

		var fileURL = URL.createObjectURL(file)
		videoNode.src = fileURL
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

   var updateChat = function(event) {
		if(chatJson == null) return;

		let currenTime = videoNode.currentTime;
		chatNode.innerHTML = currenTime+'<br>';
		chatJson.comments.forEach(function(obj) { 
			
			if(currenTime >= obj.content_offset_seconds) {
                let colorHex = obj.message.user_color;
                let styles = {"color": colorHex};

                let chatLine = $("<div>").addClass("chatline");

                let time = obj.content_offset_seconds;
                let chatTime = $("<div>").addClass("chattime").text( time );

                let player = $("<span>").addClass("commenter")
                        .css( styles )
                        .text( obj.commenter.display_name );
                let messagePrefix = $("<span>").addClass("messagePrefix").text(":");
                let message = $("<span>").addClass( "chatmessage" ).text( obj.message.body );
                let chatBody = $("<div>").addClass("chatbody");
                chatBody.append( player );
                chatBody.append( messagePrefix );
                chatBody.append( message );

                chatLine.append( chatTime );
                chatLine.append( chatBody );

                chatLine.appendTo( "#chat" );

                // let chatLine = document.createElement('div');
            //     chatLine.innerHTML = '&nbsp;&nbsp;&nbsp;' + '<b style="color:' + colorHex + ';">' + 
            //         obj.commenter.display_name +'</b>:'+ obj.message.body;
            //     chatNode.appendChild(chatLine);
            }
		});
		chatNode.scrollTop = chatNode.scrollHeight;
   }
  
  var inputNodeVideo = document.querySelector('#vidinput');
  var inputNodeChat = document.querySelector('#jsoninput');
  inputNodeVideo.addEventListener('change', playSelectedFile, false);
  inputNodeChat.addEventListener('change', loadChat, false);
  videoNode.addEventListener('timeupdate', updateChat, false);

}

$(document).ready(function() {

    localFileVideoPlayer();
});
